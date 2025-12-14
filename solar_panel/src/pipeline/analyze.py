import json
import math
import pandas as pd
from pathlib import Path

# Config
INPUT_PREDS_DIR = Path("output/predictions")
OUTPUT_REPORT_ASSETS = Path("output/assets") # For dashboard data
SUMMARY_FILE = Path("output/summary_report.json")
ZOOM_LEVEL = 20

# Constants
SQ_M_TO_SQ_FT = 10.7639

def fast_meters_per_pixel(lat, zoom):
    """
    Returns meters/pixel resolution at a given latitude and zoom level.
    """
    # Earth circumference = 40,075,016.686 meters
    # at equator, 256 pixels per tile
    initial_resolution = 156543.03392
    return initial_resolution * math.cos(lat * math.pi / 180) / (2**zoom)

def analyze_predictions():
    if not INPUT_PREDS_DIR.exists():
        print("[ERR] No predictions found.")
        return

    # Load Source Data for Lat/Lon reference
    input_file = Path("input/data.csv")
    if input_file.exists():
        source_df = pd.read_csv(input_file).set_index('sample_id')
    else:
        source_df = None

    summary_data = []

    pred_files = list(INPUT_PREDS_DIR.glob("*.json"))
    print(f"[INFO] Analyzing {len(pred_files)} predictions...")
    
    for pfile in pred_files:
        with open(pfile, 'r') as f:
            data = json.load(f)
            
        sid = data['sample_id']
        
        # Get Lat for area calc
        lat = 0
        if source_df is not None and sid in source_df.index:
            lat = source_df.loc[sid, 'latitude']
        else:
            # Fallback if unknown
            lat = 28.0 
            
        m_per_px = fast_meters_per_pixel(lat, ZOOM_LEVEL)
        sq_m_per_px_sq = m_per_px ** 2
        
        total_pv_pixels = 0
        max_conf = 0
        
        detections = data.get('detections', [])
        for det in detections:
            if det['class'] == 'solar_panel':
                total_pv_pixels += det['mask_area_pixels']
                if det['confidence'] > max_conf:
                    max_conf = det['confidence']
        
        # Area Calcs
        pv_area_sqm = total_pv_pixels * sq_m_per_px_sq
        pv_area_sqft = pv_area_sqm * SQ_M_TO_SQ_FT
        
        # QC Logic
        status = "NO_DETECT"
        qc_reason = "No panels found"
        
        if len(detections) > 0:
            if max_conf < 0.6:
                status = "LOW_CONFIDENCE"
                qc_reason = f"Max confidence {max_conf:.2f} < 0.6"
            elif pv_area_sqft < 50: 
                # Arbitrary small threshold
                status = "SIZE_REJECT"
                qc_reason = f"Area {pv_area_sqft:.1f} sqft too small"
            else:
                status = "QC_PASS"
                qc_reason = "Valid detection"

        # Buffer Check (Mock Implementation of "1200 sq ft buffer")
        # In a real GIS workflow, we would check if the polygon is within 
        # a buffer distance of the center point. 
        # Here we just flag if the total area is substantial.
        large_installation = pv_area_sqft > 1200
        
        record = {
            "id": sid,
            "status": status,
            "qc_reason": qc_reason,
            "pv_area_sqm": round(pv_area_sqm, 2),
            "pv_area_sqft": round(pv_area_sqft, 2),
            "confidence": round(max_conf, 2),
            "is_large_site": large_installation,
            "detections_count": len(detections),
            "image_path": data['image_path']
        }
        summary_data.append(record)
        print(f"[k] {sid}: {status} ({pv_area_sqft:.1f} sqft)")

    # Save Summary
    with open(SUMMARY_FILE, 'w') as f:
        json.dump(summary_data, f, indent=2)
        
    print(f"[DONE] Analysis complete. Summary saved to {SUMMARY_FILE}")

if __name__ == "__main__":
    analyze_predictions()
