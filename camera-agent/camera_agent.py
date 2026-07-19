import os
import sys
import time
import datetime
import json
import base64
import io
import urllib.request
import urllib.error
import cv2
import numpy as np
import joblib
import torch
from insightface.app import FaceAnalysis
from recognize import recognize_faces

# Environment config
API_URL = os.environ.get('SAMS_API_URL', 'http://localhost:3000').rstrip('/')
TOKEN = os.environ.get('CAMERA_AGENT_TOKEN', 'camera_agent_secure_token_default')
POLL_SECONDS = max(2, int(os.environ.get('CAMERA_SETTINGS_POLL_SECONDS', '3')))
LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'camera_agent.log')
SNAPSHOTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'snapshots')
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

# Torch compatibility patch
_original_torch_load = torch.load
def torch_load_patch(*args, **kwargs):
    kwargs['weights_only'] = False
    return _original_torch_load(*args, **kwargs)
torch.load = torch_load_patch

# Global state
active_model_data = None
active_section_id = None
scrfd_app = None

def log(message):
    line = f'{datetime.datetime.now().isoformat(timespec="seconds")} {message}'
    print(line)
    try:
        with open(LOG_PATH, 'a', encoding='utf-8') as log_file:
            log_file.write(f'{line}\n')
    except OSError:
        pass

def load_settings():
    request = urllib.request.Request(
        f'{API_URL}/api/camera/settings',
        headers={'X-Camera-Agent-Token': TOKEN},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        payload = json.load(response)
    if not payload.get('success'):
        raise RuntimeError(payload.get('error', 'Settings request failed'))
    return payload['data']

def load_active_model(settings):
    log(f"Fetching models from SAMS backend...")
    request = urllib.request.Request(
        f'{API_URL}/api/camera/models',
        headers={'X-Camera-Agent-Token': TOKEN},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        payload = json.load(response)
    if not payload.get('success'):
        raise RuntimeError(payload.get('error', 'Models fetch failed'))
        
    models = payload['data']
    active_model = None
    
    # Try matching by course name and section name
    for model in models:
        if model.get('course_name') == settings['courseName'] and model.get('section_name') == settings['section']:
            active_model = model
            break
            
    if not active_model:
        raise ValueError(f"No trained model found for Course: {settings['courseName']}, Section: {settings['section']}")
        
    model_base64 = active_model['model_base64']
    if not model_base64:
        raise ValueError("Model base64 data is empty on the server")
        
    log(f"Downloading and loading model ID: {active_model['model_id']}...")
    model_bytes = base64.b64decode(model_base64)
    model_data = joblib.load(io.BytesIO(model_bytes))
    
    section_id = active_model['course_id']
    return model_data, section_id

def load_command():
    request = urllib.request.Request(
        f'{API_URL}/api/camera/commands',
        headers={'X-Camera-Agent-Token': TOKEN},
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.load(response)
        if not payload.get('success'):
            raise RuntimeError(payload.get('error', 'Camera command request failed'))
        return payload['data']
    except urllib.error.URLError as e:
        log(f"Connection error to SAMS backend: {e}")
        return None
    except Exception as e:
        log(f"Error loading command: {e}")
        return None

def complete_command(command_id, succeeded, error=''):
    body = json.dumps({'id': command_id, 'succeeded': succeeded, 'error': error}).encode('utf-8')
    request = urllib.request.Request(
        f'{API_URL}/api/camera/commands',
        data=body,
        method='POST',
        headers={'X-Camera-Agent-Token': TOKEN, 'Content-Type': 'application/json'},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        if response.status != 200:
            raise RuntimeError(f'Camera command completion failed with HTTP {response.status}')

def take_snapshot_and_recognize():
    global active_model_data, active_section_id, scrfd_app
    
    if active_model_data is None or active_section_id is None:
        raise ValueError("No active class model loaded. Cannot take snapshot.")
        
    log("Opening camera...")
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Webcam could not be opened")
        
    # Read a few frames to let auto-exposure adjust
    log("Warming up camera sensor...")
    frame = None
    for _ in range(10):
        ret, frame = cap.read()
        time.sleep(0.1)
        
    cap.release()
    log("Camera released.")
    
    if frame is None:
        raise RuntimeError("Failed to capture image frame from camera")
        
    # Save snapshot image locally for records
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    snapshot_filename = os.path.join(SNAPSHOTS_DIR, f"snapshot_{active_section_id}_{timestamp}.jpg")
    cv2.imwrite(snapshot_filename, frame)
    log(f"Snapshot saved to: {snapshot_filename}")

    # Upload snapshot image to server
    try:
        with open(snapshot_filename, 'rb') as img_file:
            img_base64 = base64.b64encode(img_file.read()).decode('utf-8')
        upload_body = json.dumps({
            "section_id": active_section_id,
            "timestamp": timestamp,
            "image_base64": img_base64
        }).encode('utf-8')
        upload_request = urllib.request.Request(
            f'{API_URL}/api/camera/snapshot-image',
            data=upload_body,
            method='POST',
            headers={'X-Camera-Agent-Token': TOKEN, 'Content-Type': 'application/json'},
        )
        with urllib.request.urlopen(upload_request, timeout=30) as upload_response:
            upload_result = json.load(upload_response)
            if upload_result.get('success'):
                log(f"Snapshot image uploaded to server successfully.")
            else:
                log(f"Snapshot image upload failed: {upload_result.get('error')}")
    except Exception as e:
        log(f"Error uploading snapshot image: {e}")
    
    log("Running face recognition on snapshot...")
    results = recognize_faces(frame, active_model_data, scrfd_app)
    
    log(f"Face recognition finished. Found {len(results)} face(s).")
    
    # Filter valid detections
    detections = []
    for res in results:
        identity = res['identity']
        confidence = res['confidence']
        log(f"  Detected: {res['ensemble_identity']} (pose-frontal: {res['is_frontal']}, luminance-ok: {res['is_bright']}, dist: {res['min_distance']:.3f}, vote-conf: {res['ensemble_confidence']:.1f}%) -> Final: {identity}")
        if identity != "Unknown" and confidence > 0:
            detections.append({
                "student": identity,
                "course": active_section_id,
                "confidence": confidence / 100.0, # convert to float [0, 1]
                "timestamp": datetime.datetime.now().isoformat()
            })
            
    # Send detections to backend
    if len(detections) > 0:
        log(f"Sending {len(detections)} recognized student(s) to SAMS...")
        body = json.dumps({"records": detections}).encode('utf-8')
        request = urllib.request.Request(
            f'{API_URL}/api/camera/attendance',
            data=body,
            method='POST',
            headers={'X-Camera-Agent-Token': TOKEN, 'Content-Type': 'application/json'},
        )
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                res_data = json.load(response)
                if res_data.get('success'):
                    log("Attendance detections recorded successfully.")
                else:
                    log(f"Failed to record detections: {res_data.get('error')}")
        except Exception as e:
            log(f"Error sending attendance to backend: {e}")
    else:
        log("No recognized students met the verification threshold. Skipping backend POST.")
        
    return len(detections)

def execute_command(command):
    global active_model_data, active_section_id, scrfd_app
    
    action = command['action']
    command_id = command['id']
    log(f"Executing command: {action} (ID: {command_id})")
    
    try:
        if action == 'start':
            # Load settings
            settings = load_settings()
            log(f"Loaded Settings: Room: {settings['room']}, Course: {settings['courseName']}, Section: {settings['section']}")
            
            # Load active model from DB
            active_model_data, active_section_id = load_active_model(settings)
            log(f"Active model loaded successfully. Section ID: {active_section_id}")
            
            complete_command(command_id, succeeded=True)
            log(f"Command 'start' completed successfully.")
            
        elif action == 'snapshot':
            if active_model_data is None:
                # Fallback to load settings and model if not loaded
                settings = load_settings()
                active_model_data, active_section_id = load_active_model(settings)
                
            num_found = take_snapshot_and_recognize()
            complete_command(command_id, succeeded=True)
            log(f"Command 'snapshot' completed successfully. Found {num_found} student(s).")
            
        elif action == 'stop':
            active_model_data = None
            active_section_id = None
            complete_command(command_id, succeeded=True)
            log(f"Command 'stop' completed successfully. Model released.")
            
        else:
            log(f"Unknown action: {action}")
            complete_command(command_id, succeeded=False, error=f"Unknown action '{action}'")
            
    except Exception as e:
        log(f"Error executing command {action}: {e}")
        try:
            complete_command(command_id, succeeded=False, error=str(e))
        except Exception as ce:
            log(f"Failed to complete command status: {ce}")

def main():
    global scrfd_app
    log("==============================================")
    log("SAMS Headless Camera Agent Starting...")
    log(f"Backend API: {API_URL}")
    log("==============================================")
    
    # Initialize SCRFD model
    log("Loading SCRFD face analysis model...")
    scrfd_app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
    scrfd_app.prepare(ctx_id=0, det_size=(1024, 1024))
    log("SCRFD model loaded successfully.")
    
    log("Starting command polling loop...")
    while True:
        command = load_command()
        if command:
            execute_command(command)
        time.sleep(POLL_SECONDS)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("Camera Agent stopped by user.")
    except Exception as e:
        log(f"Camera Agent crashed: {e}")
