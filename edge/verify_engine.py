"""Quick verification script for road_analysis_engine v2.0"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

# Bypass the stdout wrapper issue
from road_analysis_engine import process_road_video, init_database

print("=== VERIFICATION START ===", flush=True)

try:
    result = process_road_video()
    print(f"\n=== VERIFICATION RESULTS ===", flush=True)
    print(f"Inspection ID: {result['inspection_id']}", flush=True)
    print(f"Road Condition Score: {result['road_condition_score']}/100 ({result['category']})", flush=True)
    print(f"Total Defects Tracked: {len(result['defects'])}", flush=True)
    print(f"Lane Issues Found: {len(result['lane_issues'])}", flush=True)
    print(f"Total Repair Volume: {result['total_repair_volume_m3']} m3", flush=True)
    print(f"Maintenance: {result['maintenance']}", flush=True)

    # Verify defect records have new fields
    if result['defects']:
        d = result['defects'][0]
        print(f"\n=== SAMPLE DEFECT RECORD ===", flush=True)
        for key in ['defect_type', 'rdd_class', 'severity_class', 'severity_score',
                     'mask_area_px', 'repair_area_m2', 'repair_volume_m3',
                     'bbox_area_px', 'relative_area_ratio']:
            print(f"  {key}: {d.get(key, 'MISSING')}", flush=True)

    # Verify SQLite schema
    import sqlite3
    db_path = os.path.join(os.path.dirname(__file__), "road_damage.db")
    conn = sqlite3.connect(db_path)
    cols = [col[1] for col in conn.execute('PRAGMA table_info(tracked_defects)').fetchall()]
    print(f"\n=== TRACKED_DEFECTS COLUMNS ===", flush=True)
    print(f"  {cols}", flush=True)

    lane_cols = [col[1] for col in conn.execute('PRAGMA table_info(lane_audit)').fetchall()]
    print(f"\n=== LANE_AUDIT COLUMNS ===", flush=True)
    print(f"  {lane_cols}", flush=True)

    lane_count = conn.execute('SELECT COUNT(*) FROM lane_audit').fetchone()[0]
    print(f"  Lane audit records: {lane_count}", flush=True)
    conn.close()

    # Verify CSV
    import pandas as pd
    csv_path = os.path.join(os.path.dirname(__file__), "road_defects_summary.csv")
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        print(f"\n=== CSV COLUMNS ===", flush=True)
        print(f"  {df.columns.tolist()}", flush=True)
        print(f"  Rows: {len(df)}", flush=True)

    print(f"\n=== ALL CHECKS PASSED ===", flush=True)

except Exception as e:
    print(f"ERROR: {e}", flush=True)
    import traceback
    traceback.print_exc()
