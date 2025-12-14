import os
import pandas as pd
import requests
import time
from pathlib import Path

# Configuration
API_KEY = "YOUR_GOOGLE_MAPS_API_KEY"  # User needs to set this
ZOOM_LEVEL = 20
IMAGE_SIZE = "600x600"
MAP_TYPE = "satellite"
OUTPUT_DIR = Path("output/images")

def fetch_image(lat, lon, sample_id, api_key):
    """
    Fetches a static map image from Google Maps API.
    """
    base_url = "https://maps.googleapis.com/maps/api/staticmap"
    params = {
        "center": f"{lat},{lon}",
        "zoom": ZOOM_LEVEL,
        "size": IMAGE_SIZE,
        "maptype": MAP_TYPE,
        "key": api_key
    }
    
    try:
        if api_key == "YOUR_GOOGLE_MAPS_API_KEY":
            print(f"[WARN] No API Key provided for {sample_id}. Skipping download (Mock Mode).")
            # In a real run, we would return False, but for demo we can generate a placeholder or just skip
            return False

        response = requests.get(base_url, params=params, stream=True)
        if response.status_code == 200:
            output_path = OUTPUT_DIR / f"{sample_id}.jpg"
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            return True
        else:
            print(f"[ERR] Failed to fetch {sample_id}: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"[EXC] Exception for {sample_id}: {e}")
        return False

def main():
    # Ensure output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Load Input Data
    input_file = Path("input/data.csv")
    if not input_file.exists():
        print("[INFO] Input file not found. Creating a sample data.csv...")
        # Create a dummy CSV if not exists
        df = pd.DataFrame({
            'sample_id': ['SMPL-001', 'SMPL-002', 'SMPL-003'],
            'latitude': [28.5355, 28.5360, 28.5370],
            'longitude': [77.3910, 77.3920, 77.3930]
        })
        df.to_csv(input_file, index=False)
    else:
        df = pd.read_csv(input_file)

    print(f"[INFO] Starting image fetch for {len(df)} samples...")
    
    success_count = 0
    for _, row in df.iterrows():
        sid = row['sample_id']
        lat = row['latitude']
        lon = row['longitude']
        
        print(f"[PROC] Processing {sid} at {lat}, {lon}")
        if fetch_image(lat, lon, sid, API_KEY):
            success_count += 1
        time.sleep(0.1) # Respect rate limits
        
    print(f"[DONE] Finished. Successfully fetched {success_count}/{len(df)} images.")

if __name__ == "__main__":
    main()
