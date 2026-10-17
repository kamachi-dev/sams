#!/usr/bin/env python3
"""
Wrapper script to make the existing recognize.py functionality 
callable from Node.js API routes for processing snapshots.
"""

import sys
import json
import base64
import os
import cv2
import numpy as np
import joblib
from insightface.app import FaceAnalysis

# Add the camera-agent directory to path so we can import recognize.py
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'camera-agent'))

from recognize import recognize_faces, align_face_scrfd, check_luminance, check_frontal_pose, ensemble_vote

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"success": false, "error": "Usage: python recognize-wrapper.py <image_base64> <model_data_json>"}))
        sys.exit(1)
    
    try:
        # Decode base64 image
        image_base64 = sys.argv[1]
        model_data_json = sys.argv[2]
        
        # Convert base64 to image
        image_data = base64.b64decode(image_base64)
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            print(json.dumps({"success": false, "error": "Failed to decode image"}))
            sys.exit(1)
        
        # Load model data
        model_data = json.loads(model_data_json)
        
        # Initialize SCRFD face detector (same as in camera agent)
        scrfd_app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
        scrfd_app.prepare(ctx_id=0, det_size=(640, 640))  # Using smaller size for performance
        
        # Recognize faces
        results = recognize_faces(image, model_data, scrfd_app)
        
        # Format results for JSON response
        records = []
        for result in results:
            if result["identity"] != "Unknown" and result["confidence"] > 0:
                records.append({
                    "student": result["identity"],
                    "course": model_data.get("course_id", "unknown"),
                    "confidence": result["confidence"],
                    "timestamp": None  # Will be set by caller
                })
        
        response = {
            "success": True,
            "data": {
                "records": records,
                "count": len(records)
            }
        }
        
        print(json.dumps(response))
        
    except Exception as e:
        print(json.dumps({"success": false, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()