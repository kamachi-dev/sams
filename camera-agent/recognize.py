import os
import cv2
import numpy as np
import joblib
from deepface import DeepFace
from insightface.app import FaceAnalysis
from skimage import transform as trans

def align_face_scrfd(img, landmarks, image_size=112):
    src = np.array(
        [[30.2946, 51.6963], [65.5318, 51.5014], [48.0252, 71.7366], [33.5493, 92.3655], [62.7299, 92.2041]],
        dtype=np.float32
    )
    if image_size != 112:
        src = src * (image_size / 112.0)
    dst = landmarks.astype(np.float32)
    tform = trans.SimilarityTransform()
    tform.estimate(dst, src)
    M = tform.params[0:2, :]
    aligned = cv2.warpAffine(img, M, (image_size, image_size), borderValue=0.0)
    return aligned

def check_luminance(crop_img):
    if crop_img is None or crop_img.size == 0:
        return False
    gray = cv2.cvtColor(crop_img, cv2.COLOR_BGR2GRAY)
    avg_brightness = np.mean(gray)
    return avg_brightness >= 40.0

def check_frontal_pose(landmarks, bbox):
    x1, y1, x2, y2 = bbox
    w = x2 - x1
    h = y2 - y1
    if w <= 0 or h <= 0:
        return False
    
    le, re, nose, lm, rm = landmarks
    
    # 1. Eye height difference (tilt)
    eye_y_diff = abs(le[1] - re[1])
    if (eye_y_diff / h) > 0.085:
        return False
        
    # 2. Nose horizontal offset (turn)
    nose_x_offset = abs(nose[0] - (le[0] + re[0])/2)
    if (nose_x_offset / w) > 0.12:
        return False
        
    # 3. Nose vertical offset (nod)
    nose_y_offset = abs(nose[1] - (le[1] + re[1])/2)
    if (nose_y_offset / h) > 0.20:
        return False
        
    return True

def ensemble_vote(embedding, top_models, label_encoder, per_model_floor):
    votes = []
    for model_name, model_data in top_models.items():
        # Handle dict or estimator format
        estimator = model_data.get("model") if isinstance(model_data, dict) else model_data
        try:
            pred_idx = int(estimator.predict([embedding])[0])
            pred_name = str(label_encoder.inverse_transform([pred_idx])[0])
        except Exception:
            continue
        try:
            if hasattr(estimator, "predict_proba"):
                probs = estimator.predict_proba([embedding])[0]
                model_confidence = float(np.max(probs) * 100.0)
            else:
                model_confidence = 0.0
        except Exception:
            model_confidence = 0.0
        votes.append((model_name, pred_name, model_confidence))

    if not votes:
        return "Unknown", 0.0, []

    filtered_votes = [vote for vote in votes if vote[2] >= float(per_model_floor)]
    total_votes = len(filtered_votes)
    if total_votes <= 0:
        return "Unknown", 0.0, filtered_votes

    buckets = {}
    for model_name, pred_name, model_confidence in filtered_votes:
        bucket = buckets.setdefault(pred_name, {"count": 0, "confidences": []})
        bucket["count"] += 1
        bucket["confidences"].append(model_confidence)

    winner = None
    winner_bucket = None
    for label, bucket in buckets.items():
        if winner_bucket is None:
            winner = label
            winner_bucket = bucket
            continue
        if bucket["count"] > winner_bucket["count"]:
            winner = label
            winner_bucket = bucket
        elif bucket["count"] == winner_bucket["count"]:
            if float(np.mean(bucket["confidences"])) > float(np.mean(winner_bucket["confidences"])):
                winner = label
                winner_bucket = bucket

    if winner_bucket is None:
        return "Unknown", 0.0, filtered_votes

    # Verification criteria from original notebook:
    if total_votes >= 4:
        required = max(1, total_votes - 1)
        if winner_bucket["count"] < required:
            return "Unknown", 0.0, filtered_votes
    else:
        if winner_bucket["count"] < total_votes:
            return "Unknown", 0.0, filtered_votes

    confidences = winner_bucket["confidences"]
    mean_conf = float(np.mean(confidences)) if confidences else 0.0
    best_conf = float(np.max(confidences)) if confidences else 0.0
    confidence = float((best_conf * 0.8) + (mean_conf * 0.2))
    return winner, confidence, filtered_votes

def recognize_faces(image, model_data, scrfd_app):
    """
    Processes an image, detects faces using SCRFD, aligns them, extracts Facenet512 embeddings,
    and runs ensemble model predictions with cosine distance verification.
    """
    faces = scrfd_app.get(image)
    if not faces:
        return []
        
    top_models = model_data.get("top_models", {})
    label_encoder = model_data.get("label_encoder")
    distance_threshold = model_data.get("distance_threshold", 0.24)
    ensemble_min_confidence = model_data.get("ensemble_min_confidence", 92.0)
    ensemble_per_model_min_confidence = model_data.get("ensemble_per_model_min_confidence", 92.0)
    ref_embeddings = np.asarray(model_data.get("reference_embeddings", []))
    ref_labels = np.asarray(model_data.get("reference_labels", []))
    
    ref_embeddings_norm = []
    if len(ref_embeddings) > 0:
        ref_norms = np.linalg.norm(ref_embeddings, axis=1, keepdims=True) + 1e-12
        ref_embeddings_norm = ref_embeddings / ref_norms
        
    results = []
    for face in faces:
        bbox = face.bbox.astype(int)
        x1, y1, x2, y2 = bbox
        
        if face.det_score < 0.25:
            continue
            
        h, w = image.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        if (x2 - x1) < 20 or (y2 - y1) < 20:
            continue
            
        is_frontal = True
        if hasattr(face, 'kps') and face.kps is not None:
            is_frontal = check_frontal_pose(face.kps, bbox)
            
        if hasattr(face, 'kps') and face.kps is not None:
            try:
                face_crop = align_face_scrfd(image, face.kps, image_size=112)
            except Exception:
                face_crop = image[y1:y2, x1:x2]
        else:
            face_crop = image[y1:y2, x1:x2]
            
        is_bright = check_luminance(face_crop)
        
        try:
            emb = DeepFace.represent(face_crop, model_name="Facenet512", enforce_detection=False)[0]["embedding"]
        except Exception:
            continue
            
        pred_name, confidence, votes = ensemble_vote(
            emb, top_models, label_encoder, ensemble_per_model_min_confidence
        )
        
        passed_distance_check = False
        min_distance = 1.0
        
        if pred_name != "Unknown" and len(ref_embeddings_norm) > 0:
            emb_norm = np.asarray(emb) / (np.linalg.norm(emb) + 1e-12)
            matching_indices = np.where(ref_labels == pred_name)[0]
            if len(matching_indices) > 0:
                dists = 1.0 - np.dot(ref_embeddings_norm[matching_indices], emb_norm)
                min_distance = float(np.min(dists))
                if min_distance <= distance_threshold:
                    passed_distance_check = True
                    
        final_identity = "Unknown"
        final_confidence = 0.0
        
        if pred_name != "Unknown" and passed_distance_check and confidence >= ensemble_min_confidence:
            final_identity = pred_name
            final_confidence = confidence
            
        results.append({
            "bbox": [int(x1), int(y1), int(x2), int(y2)],
            "det_score": float(face.det_score),
            "is_frontal": is_frontal,
            "is_bright": is_bright,
            "min_distance": min_distance,
            "ensemble_identity": pred_name,
            "ensemble_confidence": confidence,
            "identity": final_identity,
            "confidence": final_confidence,
            "face_crop": face_crop
        })
        
    return results
