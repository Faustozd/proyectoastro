import requests
import sys
import time
import json
import os

# Clave API de VirusTotal
API_KEY = "455089bfe59162814efa65387026aa00df14660426d0283da1db6949a7f3df51"
API_URL = "https://www.virustotal.com/api/v3/files"

def scan_file(file_path):
    if not os.path.isfile(file_path):
        print(json.dumps({"error": f"Archivo no encontrado: {file_path}"}))
        return

    headers = {
        "x-apikey": API_KEY
    }

    try:
        with open(file_path, "rb") as file:
            files = {"file": (file_path, file)}
            response = requests.post(API_URL, headers=headers, files=files)

        if response.status_code == 200:
            analysis_id = response.json()["data"]["id"]

            # Consultar el resultado del análisis
            analysis_url = f"{API_URL}/{analysis_id}"
            while True:
                result_response = requests.get(analysis_url, headers=headers)
                result = result_response.json()

                status = result["data"]["attributes"]["status"]
                if status == "completed":
                    stats = result["data"]["attributes"]["stats"]
                    print(json.dumps(stats))
                    break
                else:
                    time.sleep(15)
        else:
            print(json.dumps({"error": response.text}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Uso: python virus_total_scan.py <ruta_del_archivo>"}))
    else:
        scan_file(sys.argv[1])
