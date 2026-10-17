#!/usr/bin/env python3
"""
Wrapper script to make the existing recognize.py functionality
callable from Node.js API routes for processing snapshots.
Accepts base64-encoded pickle data for model instead of JSON.
"""

import sys
import json
import os
import contextlib
import joblib

# Add the camera-agent directory to path so we can import recognize.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'camera-agent')))

from insightface.app import FaceAnalysis
from recognize import recognize_faces

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: python recognize-wrapper.py <image_path> <model_path>"}))
        sys.exit(1)

    try:
        image_path = sys.argv[1]
        model_path = sys.argv[2]
        model_data = joblib.load(model_path)

        import cv2
        image = cv2.imread(image_path, cv2.IMREAD_COLOR)
        if image is None:
            print(json.dumps({"success": False, "error": "Failed to decode image"}))
            sys.exit(1)

        with contextlib.redirect_stdout(sys.stderr):
            scrfd_app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
            scrfd_app.prepare(ctx_id=0, det_size=(1280, 1280))
            results = recognize_faces(image, model_data, scrfd_app)
        records = []
        for result in results:
            if result["identity"] != "Unknown" and result["confidence"] > 0:
                records.append({
                    "student": result["identity"],
                    "course": model_data.get("course_id", "unknown"),
                    "confidence": result["confidence"],
                    "timestamp": None
                })

        print(json.dumps({
            "success": True,
            "data": {
                "records": records,
                "count": len(records)
            }
        }))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()