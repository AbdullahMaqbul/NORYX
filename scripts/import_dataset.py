import json
import requests

dataset_path = "nca_controls_dataset.json"
api_url = "http://localhost:8000/controls/"

try:
    with open(dataset_path, "r", encoding="utf-8") as f:
        controls = json.load(f)
        
    print(f"Loaded {len(controls)} controls from dataset.")
    
    success = 0
    for control in controls:
        payload = {
            "name": control["name"],
            "description": control["description"][:500], # ensure it fits if there's length limits, though SQLite Text is fine
            "criteria": control["criteria"]
        }
        res = requests.post(api_url, json=payload)
        if res.status_code == 200:
            success += 1
        else:
            print(f"Failed to add {control['name']}: {res.text}")
            
    print(f"Finished! Successfully imported {success}/{len(controls)} controls into the database.")
except Exception as e:
    print(f"Error importing dataset: {e}")
