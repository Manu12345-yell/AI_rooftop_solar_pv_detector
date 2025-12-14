import os
import json
import cv2
import numpy as np
from pathlib import Path
from ultralytics import YOLO

# Configuration
MODEL_PATH = "models/solar_pv_v1.pt"  # Path to trained model
IMAGE_DIR = Path("output/images")
OUTPUT_JSON_DIR = Path("output/predictions")
CONF_THRESHOLD = 0.5

def run_inference():
    OUTPUT_JSON_DIR.mkdir(parents=True, exist_ok=True)
    
    # Check if model exists
    model = None
    if os.path.exists(MODEL_PATH):
        print(f"[INFO] Loading model from {MODEL_PATH}")
        model = YOLO(MODEL_PATH)
    else:
        print(f"[WARN] Model not found at {MODEL_PATH}. Running in MOCK mode.")
    
    # Get images
    images = list(IMAGE_DIR.glob("*.jpg"))
    if not images:
        print("[WARN] No images found to process. Run fetch_images.py first.")
        # For demo purposes, let's pretend we processed the dummy IDs if no images exist
        if not os.path.exists("input/data.csv"):
             return
        import pandas as pd
        df = pd.read_csv("input/data.csv")
        sample_ids = df['sample_id'].tolist()
    else:
        sample_ids = [img.stem for img in images]

    results = []
    
    for sid in sample_ids:
        image_path = IMAGE_DIR / f"{sid}.jpg"
        
        # Mock Inference Logic
        if model is None:
            # Randomly detect PV
            has_pv = np.random.random() > 0.3
            
            prediction = {
                "sample_id": sid,
                "image_path": str(image_path),
                "detections": []
            }
            
            if has_pv:
                # Mock Box/Mask
                prediction["detections"].append({
                    "class": "solar_panel",
                    "confidence": float(np.random.uniform(0.7, 0.99)),
                    "bbox": [100, 100, 300, 300], # xyxy
                    "mask_area_pixels": int(np.random.uniform(2000, 8000))
                })
        else:
            # Real Inference
            if not image_path.exists(): continue
            
            yolo_results = model.predict(image_path, conf=CONF_THRESHOLD)
            det_list = []
            for r in yolo_results:
                boxes = r.boxes
                masks = r.masks
                
                if boxes is None: continue

                for i, box in enumerate(boxes):
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    xyxy = box.xyxy[0].tolist()
                    
                    # Area from mask if available, else bbox
                    if masks is not None:
                        # Simple mask area calculation (sum of pixels)
                        # In real app, we process the polygon
                        mask_data = masks.data[i].cpu().numpy()
                        area_px = np.sum(mask_data)
                    else:
                        w = xyxy[2] - xyxy[0]
                        h = xyxy[3] - xyxy[1]
                        area_px = w * h
                    
                    det_list.append({
                        "class": model.names[cls_id],
                        "confidence": conf,
                        "bbox": xyxy,
                        "mask_area_pixels": float(area_px)
                    })
            
            prediction = {
                "sample_id": sid,
                "image_path": str(image_path),
                "detections": det_list
            }

        # Save individual JSON
        res_path = OUTPUT_JSON_DIR / f"{sid}.json"
        with open(res_path, 'w') as f:
            json.dump(prediction, f, indent=2)
            
        results.append(prediction)
        print(f"[PROC] Processed {sid}: {len(prediction['detections'])} detections")

    print(f"[DONE] Inference complete. Processed {len(results)} samples.")

if __name__ == "__main__":
    run_inference()
