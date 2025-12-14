SolarVision AI: Rooftop PV Detection System
EcoInnovators Ideathon 2026 Submission

Overview
SolarVision AI is an end-to-end computer vision pipeline designed to automatically detect rooftop solar panels from satellite imagery, estimate their area, and generate actionable reports. This system features a robust Python-based backend and a modern, glassmorphism-styled dashboard for visualization.

Features
Automated Image Fetching: Retrieves high-res satellite imagery via Google Maps Static API.
Deep Learning Inference: Uses YOLOv8 for precise PV detection and segmentation.
Area Estimation: Calculates geometric area (sq. meters/feet) with latitude-adjusted resolution.
Smart QC System: Automatically flags low-confidence or undersized detections.
Interactive Dashboard: A premium Dark Mode UI to view results, overlay masks, and generate reports.
Project Structure
solar_panel/
├── input/
│   └── data.csv          # Input coordinates (ID, Lat, Lon)
├── output/
│   ├── images/           # Fetched satellite images
│   ├── predictions/      # Individual JSON inference results
│   └── summary_report.json # Final aggregated data for dashboard
├── src/
│   ├── dashboard/        # Frontend Web App
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js
│   └── pipeline/         # Python Backend
│       ├── fetch_images.py
│       ├── inference.py
│       └── analyze.py
├── models/               # Place your .pt models here
├── requirements.txt      # Python dependencies
└── README.md
Setup & Installation
Install Dependencies

pip install -r requirements.txt
Configure API Key

Open src/pipeline/fetch_images.py.
Replace YOUR_GOOGLE_MAPS_API_KEY with your actual key.
Prepare Model

Place your trained YOLOv8 model (.pt file) in models/.
Update src/pipeline/inference.py to point to it.
Note: The system runs in MOCK MODE if no model is found.
Usage Guide
Step 1: Fetch Imagery
Download satellite images for the coordinates in input/data.csv.

python src/pipeline/fetch_images.py
Step 2: Run Inference
Detect solar panels on the downloaded images.

python src/pipeline/inference.py
Step 3: Analyze & QC
Calculate areas and generate the final report.

python src/pipeline/analyze.py
Step 4: View Dashboard
Open the dashboard file in your browser: src/dashboard/index.html

Technical Details
Area Calculation: Uses zoom-level 20 resolution (~0.11m/px at equator), adjusted for latitude using standard Mercator projection formulas.
Buffer Logic: Checks against a 1200 sq. ft threshold to classify installations as "Large Site".
