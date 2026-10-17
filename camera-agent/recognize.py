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

def _detect_faces_with_scale(image, scrfd_app, scale, score_floor, min_face_size):
    height, width = image.shape[:2]
    if scale > 1.0:
        detection_image = cv2.resize(
            image,
            (int(width * scale), int(height * scale)),
            interpolation=cv2.INTER_CUBIC,
        )
    else:
        detection_image = image

    candidates = []
    for face in scrfd_app.get(detection_image):
        det_score = float(getattr(face, "det_score", 0.0))
        if det_score < score_floor:
            continue

        bbox = np.asarray(face.bbox, dtype=np.float32).copy()
        landmarks = getattr(face, "kps", None)
        if scale > 1.0:
            bbox /= scale
            if landmarks is not None:
                landmarks = np.asarray(landmarks, dtype=np.float32).copy() / scale

        x1, y1, x2, y2 = bbox.astype(int)
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(width, x2), min(height, y2)
        if x2 - x1 < min_face_size or y2 - y1 < min_face_size:
            continue

        candidates.append({
            "bbox": (x1, y1, x2, y2),
            "kps": landmarks,
            "det_score": det_score,
            "source": "upscaled" if scale > 1.0 else "primary",
        })

    return candidates


def _detect_faces_multi_pass(image, scrfd_app):
    height, width = image.shape[:2]
    primary_scale = 2.2 if max(height, width) < 960 else 1.0
    candidates = _detect_faces_with_scale(image, scrfd_app, primary_scale, 0.45, 10)
    if candidates:
        return candidates

    far_scale = 3.0 if max(height, width) < 960 else 1.8
    return _detect_faces_with_scale(image, scrfd_app, far_scale, 0.30, 6)


def face_luminance(face):
    if face is None or face.size == 0:
        return 0.0
    ycrcb = cv2.cvtColor(face, cv2.COLOR_BGR2YCrCb)
    return float(np.mean(ycrcb[:, :, 0]))


def face_blur_measure(face):
    if face is None or face.size == 0:
        return 0.0
    gray = cv2.cvtColor(face, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def apply_unsharp_mask(face, amount=0.75, radius=1.0):
    amount = float(np.clip(amount, 0.0, 2.5))
    radius = float(np.clip(radius, 0.1, 3.0))
    blurred = cv2.GaussianBlur(face, (0, 0), sigmaX=radius)
    return cv2.addWeighted(face, 1.0 + amount, blurred, -amount, 0)


def enhance_face_for_recognition(face, strength=0.65, upscale_factor=1.0, too_dark_luminance=38.0):
    if face is None or face.size == 0:
        return None

    height, width = face.shape[:2]
    min_dim = max(min(height, width), 1)
    target_upscale = min(max(float(upscale_factor), 112.0 / min_dim if min_dim < 112 else 1.0), 3.2)
    if target_upscale > 1.05:
        interpolation = cv2.INTER_LANCZOS4 if target_upscale >= 1.8 else cv2.INTER_CUBIC
        face = cv2.resize(face, None, fx=target_upscale, fy=target_upscale, interpolation=interpolation)

    strength = float(np.clip(strength, 0.0, 1.0))
    if face_luminance(face) < float(too_dark_luminance):
        return None

    ycrcb = cv2.cvtColor(face, cv2.COLOR_BGR2YCrCb)
    y, cr, cb = cv2.split(ycrcb)
    mean_y = float(np.mean(y))
    if mean_y < 120:
        gain = 1.0 + ((120.0 - mean_y) / 120.0) * (0.75 * strength)
        y = np.clip(y.astype(np.float32) * gain, 0, 255).astype(np.uint8)
    if mean_y < 105:
        y = cv2.convertScaleAbs(y, alpha=1.0 + (0.22 * strength), beta=int(round(10 * strength)))

    gamma = 1.0 - (0.22 * strength)
    table = np.array([((i / 255.0) ** gamma) * 255 for i in range(256)], dtype=np.uint8)
    y = cv2.LUT(y, table)
    clahe = cv2.createCLAHE(clipLimit=1.0 + (1.4 * strength), tileGridSize=(8, 8))
    y_clahe = clahe.apply(y)
    y = cv2.addWeighted(y, 1.0 - (0.45 * strength), y_clahe, 0.45 * strength, 0)
    enhanced = cv2.cvtColor(cv2.merge([y, cr, cb]), cv2.COLOR_YCrCb2BGR)

    blur_score = face_blur_measure(enhanced)
    sharpen_amount = 0.45 + (0.55 * strength) + (0.35 if blur_score < 70.0 else 0.0)
    return apply_unsharp_mask(enhanced, amount=sharpen_amount, radius=1.25 if blur_score < 70.0 else 1.0)


def check_luminance(crop_img):
    return face_luminance(crop_img) >= 40.0

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
    """Detect, align, embed, and match faces using the supplied model gallery."""
    candidates = _detect_faces_multi_pass(image, scrfd_app)
    if not candidates:
        return []

    top_models = model_data.get("top_models") or model_data.get("ensemble_models", {})
    label_encoder = model_data.get("label_encoder")
    embedding_model = str(model_data.get("embedding_model") or "Facenet512")
    distance_threshold = float(model_data.get("distance_threshold", model_data.get("calibrated_distance_threshold", 0.35)))
    ensemble_min_confidence = float(model_data.get("ensemble_min_confidence", 92.0))
    ensemble_per_model_min_confidence = float(model_data.get("ensemble_per_model_min_confidence", 90.0))
    min_logging_confidence = float(model_data.get("min_logging_confidence", ensemble_min_confidence))
    low_light_threshold = float(model_data.get("low_light_luminance_threshold", 110.0))
    too_dark_threshold = float(model_data.get("too_dark_luminance_threshold", 38.0))

    ref_embeddings = np.asarray(model_data.get("reference_embeddings", []), dtype=np.float32)
    ref_labels = np.asarray(model_data.get("reference_labels", []))
    if ref_embeddings.size and ref_embeddings.ndim == 1:
        ref_embeddings = np.expand_dims(ref_embeddings, axis=0)
    if ref_embeddings.size and len(ref_labels) == len(ref_embeddings):
        ref_embeddings_norm = ref_embeddings / (np.linalg.norm(ref_embeddings, axis=1, keepdims=True) + 1e-12)
    else:
        ref_embeddings_norm = np.empty((0, 0), dtype=np.float32)

    results = []
    for candidate in candidates:
        x1, y1, x2, y2 = candidate["bbox"]
        kps = candidate.get("kps")
        face_w, face_h = x2 - x1, y2 - y1
        face_crop = image[y1:y2, x1:x2]
        if face_crop.size == 0:
            continue

        is_frontal = True
        if kps is not None:
            try:
                is_frontal = check_frontal_pose(kps, (x1, y1, x2, y2))
                face_for_embedding = align_face_scrfd(image, kps, image_size=112)
            except Exception:
                face_for_embedding = face_crop
        else:
            face_for_embedding = face_crop

        luminance = face_luminance(face_for_embedding)
        if luminance < too_dark_threshold:
            results.append({
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                "det_score": candidate["det_score"],
                "is_frontal": is_frontal,
                "is_bright": False,
                "min_distance": 1.0,
                "ensemble_identity": "Unknown",
                "ensemble_confidence": 0.0,
                "identity": "Unknown",
                "confidence": 0.0,
                "face_crop": face_crop,
            })
            continue

        try:
            embedding = np.asarray(
                DeepFace.represent(face_for_embedding, model_name=embedding_model, enforce_detection=False)[0]["embedding"],
                dtype=np.float32,
            )
            face_size = min(face_w, face_h)
            if face_size < 96 or luminance < low_light_threshold:
                try:
                    enhanced = enhance_face_for_recognition(
                        face_for_embedding.copy(),
                        strength=0.85 if luminance < 85.0 or face_size < 45 else 0.65,
                        upscale_factor=2.2 if face_size < 45 else 1.6,
                        too_dark_luminance=too_dark_threshold,
                    )
                    if enhanced is not None:
                        enhanced_embedding = np.asarray(
                            DeepFace.represent(enhanced, model_name=embedding_model, enforce_detection=False)[0]["embedding"],
                            dtype=np.float32,
                        )
                        if enhanced_embedding.shape == embedding.shape:
                            embedding = (embedding * 0.55) + (enhanced_embedding * 0.45)
                except Exception:
                    pass
        except Exception:
            continue

        classifier_label, classifier_confidence, votes = ensemble_vote(
            embedding, top_models, label_encoder, ensemble_per_model_min_confidence
        )

        gallery_label = None
        gallery_confidence = 0.0
        min_distance = 1.0
        if ref_embeddings_norm.size:
            embedding_norm = embedding / (np.linalg.norm(embedding) + 1e-12)
            if embedding_norm.shape[0] == ref_embeddings_norm.shape[1]:
                distances = 1.0 - np.dot(ref_embeddings_norm, embedding_norm)
                best_index = int(np.argmin(distances))
                gallery_label = str(ref_labels[best_index])
                min_distance = float(distances[best_index])
                gallery_confidence = max(0.0, 1.0 - min_distance) * 100.0

        gallery_accepted = gallery_label is not None and min_distance <= distance_threshold
        final_identity = "Unknown"
        final_confidence = 0.0
        if classifier_label != "Unknown":
            if gallery_label == classifier_label:
                final_identity = classifier_label
                final_confidence = max(classifier_confidence, gallery_confidence)
            elif gallery_accepted:
                final_identity = gallery_label
                final_confidence = gallery_confidence
            else:
                final_identity = classifier_label
                final_confidence = classifier_confidence * 0.5
        elif gallery_accepted:
            final_identity = gallery_label
            final_confidence = gallery_confidence

        if final_identity != "Unknown" and final_confidence < min_logging_confidence:
            final_identity = "Unknown"
            final_confidence = 0.0

        results.append({
            "bbox": [int(x1), int(y1), int(x2), int(y2)],
            "det_score": float(candidate["det_score"]),
            "is_frontal": is_frontal,
            "is_bright": luminance >= 40.0,
            "min_distance": min_distance,
            "ensemble_identity": classifier_label,
            "ensemble_confidence": float(classifier_confidence),
            "identity": final_identity,
            "confidence": float(final_confidence),
            "face_crop": face_crop,
        })

    return results
