@echo off
echo [1/3] Fetching Images...
python src/pipeline/fetch_images.py

echo [2/3] Running Inference...
python src/pipeline/inference.py

echo [3/3] Analyzing Results...
python src/pipeline/analyze.py

echo [DONE] Pipeline complete. Open src/dashboard/index.html to view results.
pause
