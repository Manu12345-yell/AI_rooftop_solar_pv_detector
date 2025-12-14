# Model Card: Solar PV Detector v1

## Model Details
- **Architecture**: YOLOv8 (Ultralytics)
- **Task**: Object Detection & Instance Segmentation
- **Input Resolution**: 640x640 / 1280x1280
- **Classes**: `solar_panel` (0)

## Intended Use
- **Primary Use Case**: Detecting rooftop solar panels in high-resolution satellite imagery (Google Maps Static API, Zoom Level 20).
- **Region**: Optimized for suburban/urban rooftops (e.g., India, USA).
- **Limitations**: May struggle with:
  - Highly oblique angles (Street view).
  - Heavy occlusion (Trees/Shadows).
  - Low-resolution imagery (Zoom < 18).

## Training Data
- **Source**: Custom dataset curated via Roboflow.
- **Size**: ~2,500 Images (train), 300 (val), 200 (test).
- **Augmentation**: Flip, Rotation (+/- 15deg), Brightness (+/- 20%), Mosaic.

## Performance (Validation)
- **mAP@50**: 0.92
- **mAP@50-95**: 0.78
- **Precision**: 0.94
- **Recall**: 0.89

## Pipeline Integration
This model is designed to report bounding boxes and segmentation masks. The area of the mask is used downstream to estimate the installed capacity (in kW) or area (in sq. meters).

## How to Train
1. Export dataset from Roboflow in YOLOv8 format.
2. Run:
   ```python
   model = YOLO("yolov8n-seg.pt")
   model.train(data="dataset.yaml", epochs=100, imgsz=640)
   ```
