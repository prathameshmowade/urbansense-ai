"""
=============================================================================
UrbanSense AI — AI-Based Road Condition Analysis & Lifecycle Engine (v2.0)
=============================================================================
Workflow:
  Road Video → YOLO11-Seg Instance Segmentation → ByteTrack Tracking
  → Polygon-Based Severity Estimation → Repair Volume (m³) Calculation
  → YOLOPv2 Lane & Divider Perception → Road Condition Score (0-100)
  → Historical Time-Series → Maintenance Planning

Model Architecture:
  1. YOLO11-Seg (Ultralytics) — Instance segmentation for exact polygon
     contours of potholes, cracks, and road damage. Replaces bounding-box-only
     detection with pixel-precise mask outputs.
  2. YOLOPv2 (Panoptic Driving Perception) — Simultaneous drivable area
     segmentation + lane line detection for missing divider / faded lane
     infrastructure auditing.
  3. RDD2022 Class Schema — International road damage classification:
     D00 (Longitudinal Crack), D10 (Transverse Crack),
     D20 (Alligator Crack), D40 (Pothole / Crater).
=============================================================================
"""

import os
import sys
import cv2
import time
import json
import math
import sqlite3
import datetime
import numpy as np
import pandas as pd

# Ensure UTF-8 printing on Windows terminals
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# =============================================================================
# RDD2022 INTERNATIONAL ROAD DAMAGE CLASS SCHEMA
# =============================================================================
RDD_CLASS_MAP = {
    "pothole": "D40",
    "crack": "D00",
    "longitudinal_crack": "D00",
    "transverse_crack": "D10",
    "alligator_crack": "D20",
    "damaged_road": "D40",
    "d00": "D00",
    "d10": "D10",
    "d20": "D20",
    "d40": "D40",
}

RDD_CLASS_LABELS = {
    "D00": "Longitudinal Crack (Wheel Track)",
    "D10": "Transverse Crack (Expansion Joint)",
    "D20": "Alligator Crack (Fatigue Network)",
    "D40": "Pothole / Crater",
}

# Default pixel-to-meter calibration factor
# Assumes dashcam mounted at ~1.2m height, ~70° tilt, 1280x720 resolution
# This maps pixels in the lower-center road region to approximate real-world meters
# For production: use proper camera homography / inverse perspective mapping
PIXELS_PER_METER_SQ = 2800.0  # ~2800 pixels = 1 m2 at mid-frame road region

# Average pothole depth estimates by severity (meters) for volume calculation
DEPTH_ESTIMATE_M = {
    "MINOR": 0.025,     # ~2.5 cm
    "MODERATE": 0.055,  # ~5.5 cm
    "SEVERE": 0.10,     # ~10 cm
}


# =============================================================================
# 1. DATABASE & STORAGE MANAGEMENT (SQLite & CSV)
# =============================================================================
DB_PATH = os.path.join(os.path.dirname(__file__), "road_damage.db")
CSV_PATH = os.path.join(os.path.dirname(__file__), "road_defects_summary.csv")


def init_database(db_path=DB_PATH):
    """Initializes SQLite tables for inspections, defects, lane audits, and maintenance."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Table for inspection sessions
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inspections (
            inspection_id TEXT PRIMARY KEY,
            video_source TEXT,
            timestamp DATETIME,
            total_defects INTEGER,
            road_condition_score REAL,
            condition_category TEXT,
            route_name TEXT
        )
    """)

    # Table for tracked road defects (ByteTrack persistence + Segmentation masks)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tracked_defects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            inspection_id TEXT,
            track_id INTEGER,
            defect_type TEXT,
            rdd_class TEXT,
            severity_class TEXT,
            severity_score REAL,
            bbox_area_px REAL,
            mask_area_px REAL,
            mask_polygon TEXT,
            relative_area_ratio REAL,
            depth_variance REAL,
            repair_area_m2 REAL,
            repair_volume_m3 REAL,
            gps_lat REAL,
            gps_lon REAL,
            first_frame INTEGER,
            last_frame INTEGER,
            timestamp DATETIME,
            FOREIGN KEY (inspection_id) REFERENCES inspections (inspection_id)
        )
    """)

    # Table for lane / divider infrastructure auditing (YOLOPv2)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS lane_audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            inspection_id TEXT,
            segment_start_frame INTEGER,
            segment_end_frame INTEGER,
            lane_detected BOOLEAN,
            drivable_area_ratio REAL,
            lane_confidence REAL,
            issue_type TEXT,
            gps_lat REAL,
            gps_lon REAL,
            timestamp DATETIME,
            FOREIGN KEY (inspection_id) REFERENCES inspections (inspection_id)
        )
    """)

    # Table for historical deterioration monitoring across multi-pass inspections
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS deterioration_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            road_segment_id TEXT,
            previous_score REAL,
            current_score REAL,
            decay_rate_per_month REAL,
            urgency_level TEXT,
            inspection_date DATETIME
        )
    """)

    # Table for automated maintenance work orders
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS maintenance_plan (
            order_id TEXT PRIMARY KEY,
            road_segment TEXT,
            priority TEXT,
            recommended_action TEXT,
            estimated_asphalt_kg REAL,
            total_repair_volume_m3 REAL,
            status TEXT,
            generated_at DATETIME
        )
    """)

    conn.commit()
    conn.close()


# =============================================================================
# 2. BYTETRACK-INSPIRED MULTI-OBJECT TRACKER
# =============================================================================
class DefectTracker:
    """
    Lightweight, high-speed multi-object tracker inspired by ByteTrack.
    Uses bounding-box IoU association and spatial velocity prediction to track
    potholes and cracks over consecutive frames, preventing double-counting.

    Now enhanced to carry segmentation mask polygons alongside bounding boxes.
    """
    def __init__(self, iou_threshold=0.35, max_disappeared=15):
        self.next_track_id = 1
        self.tracks = {}  # track_id -> dict(box, mask_polygon, mask_area_px, defect_type, rdd_class, conf, ...)
        self.iou_threshold = iou_threshold
        self.max_disappeared = max_disappeared
        self.completed_tracks = []

    @staticmethod
    def compute_iou(boxA, boxB):
        # box format: [x1, y1, x2, y2]
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        interArea = max(0, xB - xA) * max(0, yB - yA)
        boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
        boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
        denom = float(boxAArea + boxBArea - interArea)
        return interArea / denom if denom > 0 else 0.0

    def update(self, detections, frame_idx):
        """
        detections: list of dict(box, mask_polygon, mask_area_px, defect_type, rdd_class, conf)
        """
        matched_track_ids = set()
        matched_det_indices = set()

        # Associate existing active tracks with current detections
        for track_id, track in list(self.tracks.items()):
            best_iou = 0.0
            best_det_idx = -1

            for idx, det in enumerate(detections):
                if idx in matched_det_indices:
                    continue
                if det["defect_type"] != track["defect_type"]:
                    continue  # Keep class consistency

                iou = self.compute_iou(track["box"], det["box"])
                if iou > best_iou:
                    best_iou = iou
                    best_det_idx = idx

            if best_iou >= self.iou_threshold and best_det_idx >= 0:
                det = detections[best_det_idx]
                track["box"] = det["box"]
                track["mask_polygon"] = det.get("mask_polygon", [])
                track["mask_area_px"] = det.get("mask_area_px", 0)
                track["conf"] = max(track["conf"], det["conf"])
                track["disappeared"] = 0
                track["last_frame"] = frame_idx
                track["history"].append(det["box"])
                matched_track_ids.add(track_id)
                matched_det_indices.add(best_det_idx)
            else:
                track["disappeared"] += 1

        # Check for expired tracks
        for track_id in list(self.tracks.keys()):
            if self.tracks[track_id]["disappeared"] > self.max_disappeared:
                completed = self.tracks.pop(track_id)
                if len(completed["history"]) >= 2:  # Filter single-frame noise
                    self.completed_tracks.append(completed)

        # Register new tracks for unmatched detections
        for idx, det in enumerate(detections):
            if idx not in matched_det_indices:
                new_track = {
                    "track_id": self.next_track_id,
                    "defect_type": det["defect_type"],
                    "rdd_class": det.get("rdd_class", "D40"),
                    "conf": det["conf"],
                    "box": det["box"],
                    "mask_polygon": det.get("mask_polygon", []),
                    "mask_area_px": det.get("mask_area_px", 0),
                    "disappeared": 0,
                    "first_frame": frame_idx,
                    "last_frame": frame_idx,
                    "history": [det["box"]],
                }
                self.tracks[self.next_track_id] = new_track
                self.next_track_id += 1

        return self.tracks

    def finalize(self):
        """Flush any remaining active tracks into completed tracks list."""
        for track_id, track in self.tracks.items():
            if len(track["history"]) >= 2:
                self.completed_tracks.append(track)
        self.tracks.clear()
        return self.completed_tracks


# =============================================================================
# 3. POLYGON-BASED SEVERITY ESTIMATION & REPAIR VOLUME CALCULATION
# =============================================================================
def estimate_defect_severity(frame, box, defect_type, mask_polygon=None, mask_area_px=None):
    """
    Enhanced Severity Estimation with Instance Segmentation Support.

    Uses polygon mask area (from YOLO11-Seg) instead of bounding box area
    for accurate damage surface measurement. Falls back to bbox area when
    mask data is unavailable.

    Evaluates:
      1. Exact Mask Surface Area (polygon contour area as % of frame).
      2. Aspect Ratio (wide vs longitudinal cracks vs crater potholes).
      3. Laplacian/Sobel Gradient Variance within the ROI for depth inference.
      4. Pixel-to-Meter calibration for real-world repair area (m2).
      5. Repair Volume estimation (m3) = area x estimated depth.

    Returns:
      severity_class: 'MINOR' | 'MODERATE' | 'SEVERE'
      severity_score: float 0.0 to 1.0
      depth_metric: float
      mask_area_px: float (exact polygon pixel area)
      area_ratio: float (mask area / frame area)
      repair_area_m2: float (real-world surface area estimate)
      repair_volume_m3: float (asphalt volume needed)
    """
    h_frame, w_frame = frame.shape[:2]
    x1, y1, x2, y2 = [int(v) for v in box]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w_frame, x2), min(h_frame, y2)

    width = max(1, x2 - x1)
    height = max(1, y2 - y1)
    bbox_area = width * height
    frame_area = w_frame * h_frame

    # Use exact polygon mask area if available, otherwise fall back to bbox area
    if mask_area_px is not None and mask_area_px > 0:
        effective_area = mask_area_px
    elif mask_polygon is not None and len(mask_polygon) >= 3:
        # Compute polygon area from contour points
        poly_np = np.array(mask_polygon, dtype=np.float32)
        effective_area = float(cv2.contourArea(poly_np))
        mask_area_px = effective_area
    else:
        # Fallback: estimate mask area as ~65% of bbox (typical fill ratio for road defects)
        effective_area = bbox_area * 0.65
        mask_area_px = effective_area

    area_ratio = effective_area / float(frame_area)

    # Gradient texture analysis for surface depth inference
    roi = frame[y1:y2, x1:x2]
    if roi.size > 0:
        gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

        # If mask polygon is available, apply it to focus texture analysis
        if mask_polygon is not None and len(mask_polygon) >= 3:
            mask_img = np.zeros(gray_roi.shape, dtype=np.uint8)
            # Translate polygon to ROI coordinates
            poly_roi = np.array(mask_polygon, dtype=np.int32) - np.array([x1, y1])
            poly_roi = np.clip(poly_roi, 0, [width - 1, height - 1])
            cv2.fillPoly(mask_img, [poly_roi], 255)
            masked_gray = cv2.bitwise_and(gray_roi, gray_roi, mask=mask_img)
            laplacian_var = cv2.Laplacian(masked_gray, cv2.CV_64F).var()
        else:
            laplacian_var = cv2.Laplacian(gray_roi, cv2.CV_64F).var()

        depth_metric = min(100.0, float(laplacian_var) / 15.0)
    else:
        depth_metric = 20.0

    # Defect Weight Matrix
    class_weights = {
        "pothole": 1.35,
        "damaged_road": 1.20,
        "crack": 0.85,
        "longitudinal_crack": 0.85,
        "transverse_crack": 0.90,
        "alligator_crack": 1.15,
    }
    weight = class_weights.get(defect_type.lower(), 1.0)

    # Composite Severity Index (0.0 to 1.0)
    composite = (area_ratio * 25.0) * 0.55 + (depth_metric / 100.0) * 0.45
    scaled_severity = min(1.0, composite * weight)

    if scaled_severity >= 0.65 or area_ratio > 0.06:
        severity_class = "SEVERE"
    elif scaled_severity >= 0.35 or area_ratio > 0.02:
        severity_class = "MODERATE"
    else:
        severity_class = "MINOR"

    # Real-world repair area estimation (m2)
    repair_area_m2 = round(effective_area / PIXELS_PER_METER_SQ, 3)

    # Repair volume estimation (m3) = surface area x estimated depth
    est_depth_m = DEPTH_ESTIMATE_M.get(severity_class, 0.05)
    repair_volume_m3 = round(repair_area_m2 * est_depth_m, 4)

    return (
        severity_class,
        round(scaled_severity, 3),
        round(depth_metric, 2),
        round(mask_area_px, 1),
        round(area_ratio, 5),
        repair_area_m2,
        repair_volume_m3,
    )


def calculate_road_condition_score(tracked_defects, road_length_km=1.0):
    """
    Calculates the Road Condition Score (RCS) on a standard 0-100 scale:
      100 - Sum(Deduct Points based on Defect Quantity, Type, and Severity)
    Standard:
      85 - 100: Excellent / Good (Normal Wear)
      70 - 84:  Fair (Preventative Sealing)
      50 - 69:  Poor (Patching & Overlay)
      0  - 49:  Critical (Emergency Resurfacing Required)
    """
    total_deduct = 0.0
    deduct_table = {
        "MINOR": 3.0,
        "MODERATE": 8.5,
        "SEVERE": 18.0
    }

    # RDD class deduction multipliers
    rdd_deduct_multipliers = {
        "D40": 1.30,  # Potholes — highest structural risk
        "D20": 1.20,  # Alligator cracks — fatigue failure
        "D10": 1.05,  # Transverse cracks — expansion stress
        "D00": 0.90,  # Longitudinal cracks — surface-level
    }

    for defect in tracked_defects:
        base_deduct = deduct_table.get(defect.get("severity_class", "MINOR"), 4.0)

        # Weight by RDD class (more granular than generic defect_type)
        rdd_class = defect.get("rdd_class", "D40")
        rdd_mult = rdd_deduct_multipliers.get(rdd_class, 1.0)
        base_deduct *= rdd_mult

        total_deduct += base_deduct

    # Normalize deduct points over the inspected segment length
    normalized_deduct = total_deduct / max(0.5, road_length_km)
    rcs = max(0.0, min(100.0, 100.0 - normalized_deduct))

    if rcs >= 85:
        category = "Good / Excellent"
    elif rcs >= 70:
        category = "Fair (Routine Monitoring)"
    elif rcs >= 50:
        category = "Poor (Patching Needed)"
    else:
        category = "Critical (Immediate Resurfacing)"

    return round(rcs, 1), category


# =============================================================================
# 4. YOLO11-SEG INSTANCE SEGMENTATION DETECTOR (Polygon Masks)
# =============================================================================
class RoadDamageSegmentor:
    """
    Ultralytics YOLO11-Seg instance segmentation wrapper for road defect analysis.

    Why YOLO11-Seg over YOLO11 (Detection-only)?
      - Outputs exact polygon contours (masks) instead of rectangular bounding boxes.
      - Allows precise measurement of defect surface area (no healthy-asphalt bias).
      - Enables real-world repair area (m2) and asphalt volume (m3) estimation.
      - ~2.9M params (Nano-Seg) — only ~0.3M more than detection-only, negligible
        latency increase (~15-18ms on edge CPUs, <3ms on Jetson GPU).
      - Same C3k2 + C2PSA architecture with added mask prediction head.

    RDD2022 Class Support:
      - D00: Longitudinal Crack (wheel track)
      - D10: Transverse Crack (perpendicular expansion)
      - D20: Alligator Crack (fatigue network)
      - D40: Pothole / Crater
    """
    def __init__(self, model_path="yolo11n-seg.pt"):
        self.model = None
        self.model_name = "YOLO11-Seg (Instance Segmentation)"
        self.has_ultralytics = False
        try:
            from ultralytics import YOLO
            self.model = YOLO(model_path)
            self.has_ultralytics = True
            print(f" Loaded Ultralytics YOLO11-Seg model: {model_path}")
        except Exception as e:
            # Automatic heuristic computer vision fallback for offline edge environments
            self.has_ultralytics = False
            print(f" YOLO11-Seg unavailable ({e}). Using synthetic segmentation fallback.")

    def detect(self, frame, frame_idx=0):
        """
        Runs instance segmentation on a frame.

        Returns:
          list of dict:
            - box: [x1, y1, x2, y2] bounding box
            - mask_polygon: list of [x, y] polygon contour points
            - mask_area_px: float, exact pixel area of the mask
            - defect_type: str (e.g. 'pothole', 'crack')
            - rdd_class: str (e.g. 'D40', 'D00')
            - conf: float, detection confidence
        """
        h, w = frame.shape[:2]
        detections = []

        if self.has_ultralytics and self.model:
            results = self.model.predict(frame, conf=0.35, verbose=False)[0]

            for i, box in enumerate(results.boxes):
                cls_id = int(box.cls[0])
                cls_name = results.names[cls_id].lower()

                # Map to RDD2022 class
                rdd_class = RDD_CLASS_MAP.get(cls_name)
                if rdd_class is None:
                    continue  # Skip non-road-damage classes

                # Get defect type from class name
                defect_type = cls_name if cls_name in RDD_CLASS_MAP else "damaged_road"

                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()

                # Extract segmentation mask polygon if available
                mask_polygon = []
                mask_area_px = 0.0
                if results.masks is not None and i < len(results.masks.xy):
                    poly = results.masks.xy[i]
                    if len(poly) >= 3:
                        mask_polygon = poly.tolist()
                        mask_area_px = float(cv2.contourArea(poly.astype(np.int32)))

                # Fallback: if no mask, estimate from bbox
                if mask_area_px == 0:
                    bbox_w = float(x2 - x1)
                    bbox_h = float(y2 - y1)
                    mask_area_px = bbox_w * bbox_h * 0.65  # typical fill ratio

                detections.append({
                    "box": [float(x1), float(y1), float(x2), float(y2)],
                    "mask_polygon": mask_polygon,
                    "mask_area_px": mask_area_px,
                    "defect_type": defect_type,
                    "rdd_class": rdd_class,
                    "conf": float(box.conf[0]),
                })
            return detections

        # =====================================================================
        # Synthetic/Heuristic Segmentation Fallback (Edge demo mode)
        # Generates realistic polygon masks and RDD2022 classes for demo
        # =====================================================================
        period = 40
        phase = frame_idx % period

        if phase < 18:
            # Defect 1: D40 Pothole moving towards vehicle
            prog = phase / 18.0
            cx = w * (0.41 - 0.05 * prog)
            cy = h * (0.54 + 0.35 * prog)
            rx = w * (0.06 + 0.05 * prog)
            ry = h * (0.04 + 0.04 * prog)

            # Generate elliptical polygon mask (potholes are roughly elliptical)
            angles = np.linspace(0, 2 * np.pi, 24, endpoint=False)
            jitter = np.random.normal(1.0, 0.08, len(angles))
            poly = [
                [float(cx + rx * np.cos(a) * j), float(cy + ry * np.sin(a) * j)]
                for a, j in zip(angles, jitter)
            ]
            poly_np = np.array(poly, dtype=np.int32)
            mask_area = float(cv2.contourArea(poly_np))

            # Bounding box from polygon
            xs = [p[0] for p in poly]
            ys = [p[1] for p in poly]
            bx1, by1, bx2, by2 = min(xs), min(ys), max(xs), max(ys)

            detections.append({
                "box": [bx1, by1, bx2, by2],
                "mask_polygon": poly,
                "mask_area_px": mask_area,
                "defect_type": "pothole",
                "rdd_class": "D40",
                "conf": 0.88 + 0.08 * (1 - prog),
            })

        if 20 <= phase <= 34:
            # Defect 2: D00 Longitudinal Crack (elongated, irregular polygon)
            prog = (phase - 20) / 14.0
            cx = w * (0.62 + 0.02 * prog)
            cy = h * (0.48 + 0.40 * prog)
            crack_len = w * (0.09 + 0.04 * prog)
            crack_w = h * (0.012 + 0.008 * prog)

            # Generate elongated irregular polygon (crack shape)
            n_pts = 16
            spine_x = np.linspace(cx - crack_len / 2, cx + crack_len / 2, n_pts // 2)
            jitter_y_top = np.random.normal(0, crack_w * 0.3, n_pts // 2)
            jitter_y_bot = np.random.normal(0, crack_w * 0.3, n_pts // 2)

            top_edge = [[float(sx), float(cy - crack_w / 2 + jy)] for sx, jy in zip(spine_x, jitter_y_top)]
            bot_edge = [[float(sx), float(cy + crack_w / 2 + jy)] for sx, jy in zip(spine_x[::-1], jitter_y_bot)]
            poly = top_edge + bot_edge
            poly_np = np.array(poly, dtype=np.int32)
            mask_area = float(cv2.contourArea(poly_np))

            xs = [p[0] for p in poly]
            ys = [p[1] for p in poly]
            bx1, by1, bx2, by2 = min(xs), min(ys), max(xs), max(ys)

            detections.append({
                "box": [bx1, by1, bx2, by2],
                "mask_polygon": poly,
                "mask_area_px": mask_area,
                "defect_type": "longitudinal_crack",
                "rdd_class": "D00",
                "conf": 0.82,
            })

        return detections


# =============================================================================
# 5. YOLOPv2 LANE & DIVIDER PERCEPTION (Panoptic Driving Perception)
# =============================================================================
class LaneDividerPerceptor:
    """
    YOLOPv2-based panoptic driving perception for lane and divider auditing.

    Performs three simultaneous tasks in a single forward pass:
      1. Object detection (traffic/obstacles)
      2. Drivable area segmentation
      3. Lane line detection

    Missing Divider Detection Algorithm:
      IF drivable_area is detected AND road_width >= threshold
      AND lane_confidence < 0.20 for N consecutive frames (configurable segment)
      -> Flag issue_type = "MISSING_DIVIDER" or "FADED_LANE"

    In demo/offline mode: generates synthetic lane perception results that
    periodically flag missing dividers for dashboard demonstration.
    """
    def __init__(self, model_path=None, check_every_n_frames=8, segment_length=16):
        self.model = None
        self.model_name = "YOLOPv2 (Panoptic Driving Perception)"
        self.has_yolop = False
        self.check_every_n_frames = check_every_n_frames
        self.segment_length = segment_length

        # Accumulator for segment-level analysis
        self.segment_buffer = []
        self.completed_segments = []

        if model_path and os.path.exists(model_path):
            try:
                import onnxruntime as ort
                self.session = ort.InferenceSession(model_path)
                self.has_yolop = True
                print(f" Loaded YOLOPv2 ONNX model: {model_path}")
            except Exception as e:
                self.has_yolop = False
                print(f" YOLOPv2 unavailable ({e}). Using synthetic lane fallback.")
        else:
            print(" YOLOPv2: No model path provided. Running in synthetic demo mode.")

    def should_process(self, frame_idx):
        """Returns True every N frames (dual-rate pipelining for edge efficiency)."""
        return frame_idx % self.check_every_n_frames == 0

    def perceive(self, frame, frame_idx):
        """
        Runs lane/divider perception on a single frame.

        Returns:
          dict:
            - lane_detected: bool
            - drivable_area_ratio: float (0.0-1.0, fraction of frame that is drivable)
            - lane_confidence: float (0.0-1.0)
            - frame_idx: int
        """
        h, w = frame.shape[:2]

        if self.has_yolop and self.session:
            # Real YOLOPv2 ONNX inference
            # Preprocess: resize to 640x640, normalize, NCHW
            input_img = cv2.resize(frame, (640, 640))
            input_img = input_img.astype(np.float32) / 255.0
            input_img = np.transpose(input_img, (2, 0, 1))[np.newaxis, ...]

            input_name = self.session.get_inputs()[0].name
            outputs = self.session.run(None, {input_name: input_img})

            # outputs[1] = drivable area seg, outputs[2] = lane line seg (typical YOLOPv2 layout)
            if len(outputs) >= 3:
                drivable_mask = outputs[1]
                lane_mask = outputs[2]

                # Process drivable area
                if isinstance(drivable_mask, np.ndarray):
                    drivable_binary = (drivable_mask.squeeze() > 0.5).astype(np.uint8)
                    drivable_area_ratio = float(np.sum(drivable_binary)) / drivable_binary.size
                else:
                    drivable_area_ratio = 0.5

                # Process lane lines
                if isinstance(lane_mask, np.ndarray):
                    lane_binary = (lane_mask.squeeze() > 0.5).astype(np.uint8)
                    lane_pixel_count = float(np.sum(lane_binary))
                    lane_confidence = min(1.0, lane_pixel_count / (640.0 * 10))  # Normalized
                else:
                    lane_confidence = 0.5

                lane_detected = lane_confidence > 0.20
            else:
                drivable_area_ratio = 0.5
                lane_confidence = 0.5
                lane_detected = True

            result = {
                "lane_detected": lane_detected,
                "drivable_area_ratio": round(drivable_area_ratio, 3),
                "lane_confidence": round(lane_confidence, 3),
                "frame_idx": frame_idx,
            }
            self.segment_buffer.append(result)
            return result

        # =================================================================
        # Synthetic Lane Perception Fallback (Demo Mode)
        # Simulates periodic lane detection failures for demo purposes
        # =================================================================
        cycle = frame_idx % 120  # 120-frame cycle

        if 40 <= cycle <= 70:
            # Simulate a faded lane / missing divider segment
            lane_confidence = round(0.05 + np.random.uniform(0, 0.12), 3)
            lane_detected = False
            drivable_area_ratio = round(0.55 + np.random.uniform(0, 0.15), 3)
        elif 85 <= cycle <= 100:
            # Simulate a partially faded lane
            lane_confidence = round(0.15 + np.random.uniform(0, 0.10), 3)
            lane_detected = lane_confidence > 0.20
            drivable_area_ratio = round(0.50 + np.random.uniform(0, 0.20), 3)
        else:
            # Normal healthy lanes
            lane_confidence = round(0.65 + np.random.uniform(0, 0.30), 3)
            lane_detected = True
            drivable_area_ratio = round(0.45 + np.random.uniform(0, 0.15), 3)

        result = {
            "lane_detected": lane_detected,
            "drivable_area_ratio": drivable_area_ratio,
            "lane_confidence": lane_confidence,
            "frame_idx": frame_idx,
        }
        self.segment_buffer.append(result)
        return result

    def evaluate_segment(self, force=False):
        """
        Evaluates the accumulated segment buffer to detect lane/divider issues.

        Returns:
          dict or None:
            - issue_type: 'FADED_LANE' | 'MISSING_DIVIDER' | 'NO_MARKING' | None
            - segment_start_frame: int
            - segment_end_frame: int
            - avg_lane_confidence: float
            - avg_drivable_ratio: float
        """
        if not self.segment_buffer:
            return None
        if not force and len(self.segment_buffer) < self.segment_length:
            return None

        count = len(self.segment_buffer) if force else min(self.segment_length, len(self.segment_buffer))
        segment = self.segment_buffer[:count]
        self.segment_buffer = self.segment_buffer[count:]

        avg_lane_conf = np.mean([s["lane_confidence"] for s in segment])
        avg_drivable = np.mean([s["drivable_area_ratio"] for s in segment])
        lanes_detected = sum(1 for s in segment if s["lane_detected"])
        detection_rate = lanes_detected / len(segment)

        issue_type = None
        if avg_lane_conf < 0.10 and avg_drivable > 0.40:
            issue_type = "MISSING_DIVIDER"
        elif avg_lane_conf < 0.20 and avg_drivable > 0.40:
            issue_type = "FADED_LANE"
        elif detection_rate < 0.25:
            issue_type = "NO_MARKING"

        result = {
            "issue_type": issue_type,
            "segment_start_frame": segment[0]["frame_idx"],
            "segment_end_frame": segment[-1]["frame_idx"],
            "avg_lane_confidence": round(avg_lane_conf, 3),
            "avg_drivable_ratio": round(avg_drivable, 3),
            "lane_detected": issue_type is None,
        }
        self.completed_segments.append(result)
        return result

    def finalize(self):
        """Process any remaining buffered frames."""
        results = []
        if len(self.segment_buffer) >= 4:  # Minimum viable segment
            res = self.evaluate_segment(force=True)
            if res:
                results.append(res)
        self.segment_buffer.clear()
        return results


# =============================================================================
# 6. END-TO-END PIPELINE RUNNER
# =============================================================================
def process_road_video(
    video_path="demo",
    max_frames=120,
    route_name="Nagpur Wardha Road Corridor",
    base_lat=21.1458,
    base_lng=79.0882
):
    """
    Executes the full upgraded pipeline:
      Road Video -> YOLO11-Seg Instance Segmentation -> ByteTrack Tracking
      -> Polygon Severity Estimation -> Repair Volume (m3) -> YOLOPv2 Lane Audit
      -> Road Condition Score -> Historical Analysis -> Maintenance Planning
    """
    init_database()
    print("=" * 70)
    print("UrbanSense AI — Road Condition Monitoring Engine v2.0")
    print(f"Source: {video_path} | Route: {route_name}")
    print("Models: YOLO11-Seg (Instance Segmentation) + YOLOPv2 (Lane Perception)")
    print("Classes: RDD2022 (D00, D10, D20, D40)")
    print("=" * 70)

    is_live_cap = False
    cap = None
    if video_path != "demo":
        try:
            cap = cv2.VideoCapture(video_path)
            is_live_cap = cap.isOpened()
        except Exception:
            is_live_cap = False

    # Initialize AI models
    segmentor = RoadDamageSegmentor()
    lane_perceptor = LaneDividerPerceptor(check_every_n_frames=8, segment_length=16)
    tracker = DefectTracker(iou_threshold=0.35, max_disappeared=10)

    inspection_id = f"INSP-{int(time.time())}"
    frame_count = 0
    all_tracked_records = []
    all_lane_records = []
    total_repair_volume = 0.0

    try:
        while frame_count < max_frames:
            if is_live_cap:
                ret, frame = cap.read()
                if not ret:
                    break
            else:
                # Generate synthetic asphalt road frame with lane lines
                frame = np.full((720, 1280, 3), (50, 50, 50), dtype=np.uint8)
                # Perspective road geometry
                cv2.line(frame, (200, 720), (550, 360), (200, 200, 200), 4)
                cv2.line(frame, (1080, 720), (730, 360), (200, 200, 200), 4)
                cv2.line(frame, (640, 720), (640, 480), (255, 255, 255), 3)

            # ============================================================
            # Step 1: YOLO11-Seg Instance Segmentation (every frame)
            # ============================================================
            detections = segmentor.detect(frame, frame_count)

            # ============================================================
            # Step 2: ByteTrack Multi-Object Tracking
            # ============================================================
            active_tracks = tracker.update(detections, frame_count)

            # ============================================================
            # Step 3: YOLOPv2 Lane Perception (every Nth frame)
            # ============================================================
            if lane_perceptor.should_process(frame_count):
                lane_result = lane_perceptor.perceive(frame, frame_count)

                # Evaluate accumulated segment
                segment_result = lane_perceptor.evaluate_segment()
                if segment_result and segment_result["issue_type"]:
                    lat_off = (segment_result["segment_start_frame"] * 0.00015)
                    lng_off = (segment_result["segment_start_frame"] * 0.00010)
                    lane_record = {
                        "inspection_id": inspection_id,
                        "segment_start_frame": segment_result["segment_start_frame"],
                        "segment_end_frame": segment_result["segment_end_frame"],
                        "lane_detected": segment_result["lane_detected"],
                        "drivable_area_ratio": segment_result["avg_drivable_ratio"],
                        "lane_confidence": segment_result["avg_lane_confidence"],
                        "issue_type": segment_result["issue_type"],
                        "gps_lat": round(base_lat + lat_off, 6),
                        "gps_lon": round(base_lng + lng_off, 6),
                        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    }
                    all_lane_records.append(lane_record)

            # ============================================================
            # Step 4: Draw HUD with polygon overlays and lane status
            # ============================================================
            for track_id, track in active_tracks.items():
                box = track["box"]
                mask_polygon = track.get("mask_polygon", [])
                mask_area_px = track.get("mask_area_px", 0)
                x1, y1, x2, y2 = [int(v) for v in box]

                # Severity estimation with polygon mask
                sev_class, sev_score, depth_m, m_area, ratio, repair_m2, repair_m3 = estimate_defect_severity(
                    frame, box, track["defect_type"],
                    mask_polygon=mask_polygon, mask_area_px=mask_area_px
                )

                # Color by severity
                color = (0, 140, 255) if sev_class == "SEVERE" else (0, 215, 255) if sev_class == "MODERATE" else (0, 255, 120)

                # Draw filled polygon mask overlay (semi-transparent)
                if mask_polygon and len(mask_polygon) >= 3:
                    overlay = frame.copy()
                    poly_pts = np.array(mask_polygon, dtype=np.int32)
                    cv2.fillPoly(overlay, [poly_pts], color)
                    cv2.addWeighted(overlay, 0.35, frame, 0.65, 0, frame)
                    cv2.polylines(frame, [poly_pts], True, color, 2)
                else:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                # HUD label with RDD class and repair volume
                rdd = track.get("rdd_class", "D40")
                rdd_label = RDD_CLASS_LABELS.get(rdd, rdd)
                tag = f"ID:{track_id} {rdd} [{sev_class}] {repair_m2}m2"
                cv2.putText(frame, tag, (x1, max(25, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.50, color, 2)

            frame_count += 1

    finally:
        if is_live_cap:
            cap.release()

    # ================================================================
    # Step 5: Finalize tracking and lane audit
    # ================================================================
    completed_tracks = tracker.finalize()

    # Finalize remaining lane segments
    remaining_lane = lane_perceptor.finalize()
    for seg in remaining_lane:
        if seg["issue_type"]:
            lat_off = seg["segment_start_frame"] * 0.00015
            lng_off = seg["segment_start_frame"] * 0.00010
            all_lane_records.append({
                "inspection_id": inspection_id,
                "segment_start_frame": seg["segment_start_frame"],
                "segment_end_frame": seg["segment_end_frame"],
                "lane_detected": seg["lane_detected"],
                "drivable_area_ratio": seg["avg_drivable_ratio"],
                "lane_confidence": seg["avg_lane_confidence"],
                "issue_type": seg["issue_type"],
                "gps_lat": round(base_lat + lat_off, 6),
                "gps_lon": round(base_lng + lng_off, 6),
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            })

    # Prepare defect records with segmentation data and GPS geotagging
    for track in completed_tracks:
        box = track["box"]
        mask_polygon = track.get("mask_polygon", [])
        mask_area_px = track.get("mask_area_px", 0)
        dummy = np.full((720, 1280, 3), (60, 60, 60), dtype=np.uint8)

        sev_class, sev_score, depth_m, m_area, ratio, repair_m2, repair_m3 = estimate_defect_severity(
            dummy, box, track["defect_type"],
            mask_polygon=mask_polygon, mask_area_px=mask_area_px
        )

        total_repair_volume += repair_m3

        # GPS offset based on frame sequence
        lat_offset = (track["first_frame"] * 0.00015)
        lng_offset = (track["first_frame"] * 0.00010)

        record = {
            "inspection_id": inspection_id,
            "track_id": track["track_id"],
            "defect_type": track["defect_type"],
            "rdd_class": track.get("rdd_class", RDD_CLASS_MAP.get(track["defect_type"], "D40")),
            "severity_class": sev_class,
            "severity_score": sev_score,
            "bbox_area_px": round((box[2] - box[0]) * (box[3] - box[1]), 1),
            "mask_area_px": round(m_area, 1),
            "mask_polygon": json.dumps(mask_polygon) if mask_polygon else "[]",
            "relative_area_ratio": round(ratio, 5),
            "depth_variance": depth_m,
            "repair_area_m2": repair_m2,
            "repair_volume_m3": repair_m3,
            "gps_lat": round(base_lat + lat_offset, 6),
            "gps_lon": round(base_lng + lng_offset, 6),
            "first_frame": track["first_frame"],
            "last_frame": track["last_frame"],
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        all_tracked_records.append(record)

    # Calculate 0-100 Condition Score
    rcs, condition_category = calculate_road_condition_score(all_tracked_records, road_length_km=1.5)

    # ================================================================
    # Step 6: Persist to SQLite & CSV
    # ================================================================
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT OR REPLACE INTO inspections VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        inspection_id, str(video_path), datetime.datetime.now(),
        len(all_tracked_records), rcs, condition_category, route_name
    ))

    for rec in all_tracked_records:
        cursor.execute("""
            INSERT INTO tracked_defects (
                inspection_id, track_id, defect_type, rdd_class,
                severity_class, severity_score, bbox_area_px,
                mask_area_px, mask_polygon, relative_area_ratio,
                depth_variance, repair_area_m2, repair_volume_m3,
                gps_lat, gps_lon, first_frame, last_frame, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            rec["inspection_id"], rec["track_id"], rec["defect_type"], rec["rdd_class"],
            rec["severity_class"], rec["severity_score"], rec["bbox_area_px"],
            rec["mask_area_px"], rec["mask_polygon"], rec["relative_area_ratio"],
            rec["depth_variance"], rec["repair_area_m2"], rec["repair_volume_m3"],
            rec["gps_lat"], rec["gps_lon"], rec["first_frame"], rec["last_frame"],
            rec["timestamp"]
        ))

    # Persist lane audit records
    for lane_rec in all_lane_records:
        cursor.execute("""
            INSERT INTO lane_audit (
                inspection_id, segment_start_frame, segment_end_frame,
                lane_detected, drivable_area_ratio, lane_confidence,
                issue_type, gps_lat, gps_lon, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            lane_rec["inspection_id"], lane_rec["segment_start_frame"],
            lane_rec["segment_end_frame"], lane_rec["lane_detected"],
            lane_rec["drivable_area_ratio"], lane_rec["lane_confidence"],
            lane_rec["issue_type"], lane_rec["gps_lat"], lane_rec["gps_lon"],
            lane_rec["timestamp"]
        ))

    # ================================================================
    # Step 7: Automated Maintenance Planning (with repair volume)
    # ================================================================
    action = "Overlay & Resurfacing" if rcs < 50 else "High-Strength Cold Patching" if rcs < 70 else "Routine Crack Sealing"
    priority = "HIGH / P1" if rcs < 50 else "MEDIUM / P2" if rcs < 70 else "LOW / P3"
    est_asphalt = round(total_repair_volume * 2400.0, 1)  # Asphalt density ~2400 kg/m3

    order_id = f"WO-{int(time.time())}"
    cursor.execute("""
        INSERT OR REPLACE INTO maintenance_plan VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        order_id, route_name, priority, action, est_asphalt,
        round(total_repair_volume, 4), "DISPATCH_READY", datetime.datetime.now()
    ))

    conn.commit()
    conn.close()

    # Export CSV summary
    if all_tracked_records:
        df = pd.DataFrame(all_tracked_records)
        df.to_csv(CSV_PATH, index=False)
        print(f" Exported {len(all_tracked_records)} tracked defects to {CSV_PATH}")

    print("=" * 70)
    print(f" Inspection Complete: {inspection_id}")
    print(f" Road Condition Score: {rcs} / 100 ({condition_category})")
    print(f" Total Distinct Defects Tracked: {len(all_tracked_records)}")
    # RDD class breakdown
    rdd_counts = {}
    for r in all_tracked_records:
        rdd = r.get("rdd_class", "D40")
        rdd_counts[rdd] = rdd_counts.get(rdd, 0) + 1
    for rdd_code, count in sorted(rdd_counts.items()):
        print(f"   {rdd_code} ({RDD_CLASS_LABELS.get(rdd_code, '?')}): {count}")
    print(f" Total Repair Volume: {round(total_repair_volume, 4)} m3 ({est_asphalt} kg asphalt)")
    print(f" Lane/Divider Issues Found: {len(all_lane_records)}")
    for lr in all_lane_records:
        print(f"   [{lr['issue_type']}] Frames {lr['segment_start_frame']}-{lr['segment_end_frame']} (Conf: {lr['lane_confidence']})")
    print(f" Maintenance Plan: {action} (Priority: {priority})")
    print("=" * 70)

    return {
        "inspection_id": inspection_id,
        "road_condition_score": rcs,
        "category": condition_category,
        "defects": all_tracked_records,
        "lane_issues": all_lane_records,
        "total_repair_volume_m3": round(total_repair_volume, 4),
        "maintenance": {
            "order_id": order_id,
            "priority": priority,
            "action": action,
            "estimated_asphalt_kg": est_asphalt,
            "total_repair_volume_m3": round(total_repair_volume, 4),
        }
    }


if __name__ == "__main__":
    process_road_video()
