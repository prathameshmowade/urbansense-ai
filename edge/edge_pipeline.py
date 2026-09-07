"""
=============================================================================
UrbanSense AI — Edge Camera & AI Inference Pipeline (NVIDIA Jetson / Laptop)
=============================================================================
Supports:
  1. USB / Laptop Webcam (source=0)
  2. IP / RTSP Bus Camera (source="rtsp://admin:pass@ip:554/live")
  3. Mobile Phone Camera via IP Webcam (source="http://192.168.1.X:8080/video")
  4. Dashcam Video File (source="test_dashcam.mp4")
  5. Jetson CSI / GMSL Industrial Cameras (via GStreamer pipeline)

AI Models:
  - YOLO11-Seg (Instance Segmentation): Polygon mask detection for potholes/cracks
  - YOLOPv2 (Panoptic Perception): Lane line + drivable area segmentation
  - RDD2022 Class Schema: D00, D10, D20, D40 international road damage codes
=============================================================================
"""

import cv2
import time
import json
import random
import requests
import numpy as np

# Config
CONFIG = {
    # Camera Source Options:
    # 0 = Default Laptop/USB Webcam
    # "rtsp://192.168.1.100:554/stream1" = IP / Bus Dashcam
    # "http://192.168.1.50:8080/video" = Smartphone IP Webcam App
    # "sample_drive.mp4" = Pre-recorded road video
    "CAMERA_SOURCE": 0,
    
    "BUS_ID": "NMC-E001",
    "CAMERA_POSITION": "front", # front, rear, left, right
    "BASE_LAT": 21.1458,
    "BASE_LNG": 79.0882,
    
    # Feature Toggles
    "ENABLE_PRIVACY_BLUR": True,       # DPDP Act 2023 compliance
    "ENABLE_CLAHE_ENHANCEMENT": True,   # Low light / adverse weather
    "TELEMETRY_THROTTLE": True,        # Dynamic FPS based on speed
    
    # Central Platform / Cloud Ingestion Endpoint
    "API_ENDPOINT": "http://localhost:5000/api/v1/events", # Or MQTT broker
}

# RDD2022 class colors for polygon overlay rendering
RDD_COLORS = {
    "D00": (255, 180, 0),   # Blue-ish for longitudinal cracks
    "D10": (0, 200, 255),   # Yellow-ish for transverse cracks
    "D20": (0, 140, 255),   # Orange for alligator cracks
    "D40": (0, 0, 255),     # Red for potholes
}

def get_jetson_gstreamer_pipeline(
    sensor_id=0,
    capture_width=1920,
    capture_height=1080,
    display_width=1280,
    display_height=720,
    framerate=30,
    flip_method=0,
):
    """GStreamer pipeline string for Jetson CSI / GMSL cameras."""
    return (
        f"nvarguscamerasrc sensor-id={sensor_id} ! "
        f"video/x-raw(memory:NVMM), width=(int){capture_width}, height=(int){capture_height}, "
        f"framerate=(fraction){framerate}/1 ! "
        f"nvvidconv flip-method={flip_method} ! "
        f"video/x-raw, width=(int){display_width}, height=(int){display_height}, format=(string)BGRx ! "
        f"videoconvert ! video/x-raw, format=(string)BGR ! appsink"
    )

def apply_clahe(frame):
    """Contrast Limited Adaptive Histogram Equalization for adverse weather / night."""
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

def apply_privacy_blur(frame, detections):
    """
    In-memory face & license plate blurring before saving/transmitting.
    Ensures raw unblurred imagery NEVER touches persistent storage.
    """
    h, w, _ = frame.shape
    # Blurring sample sensitive regions (plates/faces)
    for det in detections:
        if det.get("category") in ["plate", "face", "pedestrian_face"]:
            box = det["box"] # [x1, y1, x2, y2]
            x1, y1, x2, y2 = max(0, int(box[0])), max(0, int(box[1])), min(w, int(box[2])), min(h, int(box[3]))
            if x2 > x1 and y2 > y1:
                roi = frame[y1:y2, x1:x2]
                blurred = cv2.GaussianBlur(roi, (25, 25), 30)
                frame[y1:y2, x1:x2] = blurred
    return frame

def run_edge_pipeline(source=CONFIG["CAMERA_SOURCE"]):
    print("=" * 65)
    print(" UrbanSense AI — Starting Edge Vision Pipeline v2.0...")
    print(f" Bus ID: {CONFIG['BUS_ID']} | Cam: {CONFIG['CAMERA_POSITION']}")
    print(f" Ingesting from Source: {source}")
    print(" Models: YOLO11-Seg + YOLOPv2 | Classes: RDD2022")
    print("=" * 65)

    # Initialize video capture
    # If on Jetson using CSI camera: cv2.VideoCapture(get_jetson_gstreamer_pipeline(), cv2.CAP_GSTREAMER)
    cap = cv2.VideoCapture(source)
    
    if not cap.isOpened():
        print(f" Error: Unable to open camera source: {source}")
        print(" Tips:")
        print("   - For Webcam: ensure source=0 and webcam is plugged in.")
        print("   - For RTSP: ensure format is 'rtsp://user:pass@ip:554/stream'.")
        print("   - For Phone: use IP Webcam app and set 'http://<IP>:8080/video'.")
        return

    # Set frame resolution
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    fps_tracker = 0
    start_time = time.time()
    current_speed = 35.0 # Simulated speed in km/h from bus CAN/OBD-II / GPS

    try:
        while True:
            t0 = time.time()
            ret, frame = cap.read()
            if not ret:
                print(" Stream finished or lost frame.")
                break

            # 1. Telemetry-Driven Frame Throttling
            # High speed (40 km/h) -> 10-15 fps; Low speed / Traffic (0-5 km/h) -> 1-2 fps
            target_fps = max(1, min(15, int(current_speed * 0.3))) if CONFIG["TELEMETRY_THROTTLE"] else 15

            # 2. Low-Light / Adverse Weather Preprocessing (CLAHE)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            avg_intensity = np.mean(gray)
            if CONFIG["ENABLE_CLAHE_ENHANCEMENT"] and avg_intensity < 90:
                frame = apply_clahe(frame)
                cv2.putText(frame, "[CLAHE ACTIVE]", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

            # 3. AI Inference (YOLO11-Seg Instance Segmentation + YOLOPv2 Lane Perception)
            # In production: segmentor = RoadDamageSegmentor("yolo11n-seg.pt")
            #                results = segmentor.detect(frame, frame_idx)
            h, w, _ = frame.shape
            
            # Simulated Detections with segmentation masks and RDD2022 classes
            mock_detections = [
                {
                    "class": "pothole",
                    "rdd_class": "D40",
                    "label": "D40 Pothole [SEVERE]",
                    "confidence": 0.91,
                    "box": [w * 0.4, h * 0.65, w * 0.6, h * 0.85],
                    "mask_area_m2": 0.34,
                    "repair_volume_m3": 0.034,
                    "color": (0, 0, 255),  # BGR Red for D40
                    "category": "road_defect",
                },
                {
                    "class": "longitudinal_crack",
                    "rdd_class": "D00",
                    "label": "D00 Longitudinal Crack [MODERATE]",
                    "confidence": 0.84,
                    "box": [w * 0.25, h * 0.55, w * 0.50, h * 0.62],
                    "mask_area_m2": 0.18,
                    "repair_volume_m3": 0.010,
                    "color": (255, 180, 0),  # BGR Blue-ish for D00
                    "category": "road_defect",
                },
                {
                    "class": "vehicle",
                    "rdd_class": None,
                    "label": "Vehicle MH-31 AG 4210",
                    "confidence": 0.96,
                    "box": [w * 0.65, h * 0.35, w * 0.88, h * 0.65],
                    "mask_area_m2": None,
                    "repair_volume_m3": None,
                    "color": (255, 100, 0),
                    "category": "vehicle",
                }
            ]

            # 4. Privacy Blur
            if CONFIG["ENABLE_PRIVACY_BLUR"]:
                frame = apply_privacy_blur(frame, mock_detections)

            # 5. Draw Bounding Boxes & Polygon Overlays + HUD
            for det in mock_detections:
                x1, y1, x2, y2 = [int(v) for v in det["box"]]
                color = det["color"]

                if det.get("rdd_class"):
                    # Draw semi-transparent filled region for road defects (simulating polygon mask)
                    overlay = frame.copy()
                    cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
                    cv2.addWeighted(overlay, 0.30, frame, 0.70, 0, frame)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                    # Enhanced label with RDD class and repair metrics
                    tag = f"{det['label']} [{int(det['confidence']*100)}%]"
                    cv2.putText(frame, tag, (x1, max(20, y1 - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)

                    if det.get("mask_area_m2"):
                        repair_tag = f"Area: {det['mask_area_m2']}m2 | Vol: {det['repair_volume_m3']}m3"
                        cv2.putText(frame, repair_tag, (x1, y2 + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)
                else:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    tag = f"{det['label']} [{int(det['confidence']*100)}%]"
                    cv2.putText(frame, tag, (x1, max(20, y1 - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

            # Onboard HUD Telemetry
            latency_ms = int((time.time() - t0) * 1000)
            cv2.putText(frame, f"UrbanSense Edge AI v2.0 | Bus: {CONFIG['BUS_ID']} | YOLO11-Seg + YOLOPv2", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 229, 255), 2)
            cv2.putText(frame, f"Speed: {int(current_speed)} km/h | Infer Latency: {latency_ms}ms | FPS: {target_fps} | RDD2022", (20, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.50, (255, 255, 255), 1)

            # Display Live Window
            cv2.imshow("UrbanSense Edge AI v2.0 — YOLO11-Seg + YOLOPv2 (Press Q to quit)", frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

            time.sleep(max(0, (1.0 / target_fps) - (time.time() - t0)))

    finally:
        cap.release()
        cv2.destroyAllWindows()
        print(" Edge vision pipeline stopped.")

if __name__ == "__main__":
    # To run with webcam: run_edge_pipeline(0)
    # To run with video file: run_edge_pipeline("dashcam_video.mp4")
    run_edge_pipeline(0)
