import os
import sys
import cv2
import random
import datetime
import numpy as np
import joblib
import requests
import io
import torch
from deepface import DeepFace
from insightface.app import FaceAnalysis
from skimage import transform as trans

from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold, GroupShuffleSplit, KFold
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, make_scorer
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, AdaBoostClassifier, BaggingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
import xgboost as xgb

# ================= REPRODUCIBILITY =================
SEED = 42
random.seed(SEED)
np.random.seed(SEED)

# ================= TORCH LOAD PATCH =================
_original_torch_load = torch.load
def torch_load_patch(*args, **kwargs):
    kwargs['weights_only'] = False
    return _original_torch_load(*args, **kwargs)
torch.load = torch_load_patch

# ================= FACE ALIGNMENT WITH SCRFD LANDMARKS =================
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

def _capture_group_from_filename(img_file):
    base = os.path.splitext(str(img_file))[0]
    digits = ''.join(ch for ch in base if ch.isdigit())
    if len(digits) >= 12:
        return digits[:12]
    if len(digits) >= 8:
        return digits[:8]
    return base

def _l2_normalize_rows(x):
    x = np.asarray(x, dtype=np.float32)
    norms = np.linalg.norm(x, axis=1, keepdims=True) + 1e-12
    return x / norms

def load_embeddings_scrfd(dataset_path, scrfd_app, model_name="Facenet512", use_alignment=True):
    X, y = [], []
    capture_groups = []
    person_count = {}
    skipped_log = []

    folder_to_id = {}
    id_to_name = {}
    name_to_id = {}

    print(f"Scanning dataset path: {dataset_path}")
    if not os.path.exists(dataset_path):
        print(f"Dataset path does not exist: {dataset_path}")
        return X, y, capture_groups, folder_to_id, id_to_name, name_to_id

    for person in sorted(os.listdir(dataset_path)):
        folder = os.path.join(dataset_path, person)
        if not os.path.isdir(folder):
            continue

        student_id = str(person).strip()
        display_name = str(person).strip()
        folder_to_id[person] = student_id
        id_to_name[student_id] = display_name
        name_to_id[display_name] = student_id
        person_count[student_id] = {"display_name": display_name, "count": 0}

        for img_file in sorted(os.listdir(folder)):
            if not img_file.lower().endswith(('.jpg', '.png', '.jpeg')):
                continue
            img_path = os.path.join(folder, img_file)
            try:
                img = cv2.imread(img_path)
                if img is None:
                    skipped_log.append((img_path, "could_not_read"))
                    continue

                faces = scrfd_app.get(img)
                if not faces or len(faces) == 0:
                    try:
                        emb_fb = DeepFace.represent(img, model_name=model_name, enforce_detection=False)[0]["embedding"]
                        X.append(emb_fb)
                        y.append(student_id)
                        capture_groups.append(f"{student_id}::{_capture_group_from_filename(img_file)}")
                        person_count[student_id]["count"] += 1
                        continue
                    except Exception:
                        skipped_log.append((img_path, "scrfd_no_face_and_deepface_fallback_failed"))
                        continue

                best_face = max(faces, key=lambda x: x.det_score)
                if best_face.det_score < 0.25:
                    try:
                        emb_fb = DeepFace.represent(img, model_name=model_name, enforce_detection=False)[0]["embedding"]
                        X.append(emb_fb)
                        y.append(student_id)
                        capture_groups.append(f"{student_id}::{_capture_group_from_filename(img_file)}")
                        person_count[student_id]["count"] += 1
                        continue
                    except Exception:
                        pass

                bbox = best_face.bbox.astype(int)
                x1, y1, x2, y2 = bbox
                h, w = img.shape[:2]
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w, x2), min(h, y2)

                if (x2 - x1) < 20 or (y2 - y1) < 20:
                    try:
                        emb_fb = DeepFace.represent(img, model_name=model_name, enforce_detection=False)[0]["embedding"]
                        X.append(emb_fb)
                        y.append(student_id)
                        capture_groups.append(f"{student_id}::{_capture_group_from_filename(img_file)}")
                        person_count[student_id]["count"] += 1
                        continue
                    except Exception:
                        skipped_log.append((img_path, f"crop_too_small_{x2-x1}x{y2-y1}_and_fallback_failed"))
                        continue

                if use_alignment and hasattr(best_face, 'kps') and best_face.kps is not None:
                    try:
                        face_crop = align_face_scrfd(img, best_face.kps, image_size=112)
                    except Exception:
                        face_crop = img[y1:y2, x1:x2]
                else:
                    face_crop = img[y1:y2, x1:x2]

                try:
                    emb = DeepFace.represent(face_crop, model_name=model_name, enforce_detection=False)[0]["embedding"]
                    X.append(emb)
                    y.append(student_id)
                    capture_groups.append(f"{student_id}::{_capture_group_from_filename(img_file)}")
                    person_count[student_id]["count"] += 1
                except Exception:
                    try:
                        emb_fb = DeepFace.represent(img, model_name=model_name, enforce_detection=False)[0]["embedding"]
                        X.append(emb_fb)
                        y.append(student_id)
                        capture_groups.append(f"{student_id}::{_capture_group_from_filename(img_file)}")
                        person_count[student_id]["count"] += 1
                    except Exception:
                        skipped_log.append((img_path, "crop_embedding_and_full_image_fallback_both_failed"))
            except Exception:
                skipped_log.append((img_path, "unexpected_error"))

    print(f"\n{'='*80}")
    print("Embedding Loading Summary")
    print(f"{'='*80}")
    for student_id, details in person_count.items():
        display_name = details["display_name"]
        count = int(details["count"])
        print(f"  {student_id:20s} ({display_name:30s}): {count} embeddings")

    return X, y, capture_groups, folder_to_id, id_to_name, name_to_id

def main():
    if len(sys.argv) < 2:
        print("Usage: python train.py <section_id>")
        sys.exit(1)
        
    section_id = sys.argv[1]
    print(f"Starting model training for section ID: {section_id}")
    
    # Paths configuration
    agent_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(agent_dir, "dataset")
    models_dir = os.path.join(agent_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    
    # Initialize SCRFD
    print("[Initializing SCRFD detector...]")
    scrfd_app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
    scrfd_app.prepare(ctx_id=0, det_size=(1024, 1024))
    
    # Load dataset embeddings
    X_scrfd, y_scrfd, capture_groups, folder_to_id_map, id_to_name_map, name_to_id_map = load_embeddings_scrfd(
        dataset_path, scrfd_app, model_name="Facenet512", use_alignment=True
    )
    
    if len(X_scrfd) == 0:
        print("Error: No face embeddings could be extracted from dataset folder.")
        sys.exit(1)
        
    # Fit label encoder
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y_scrfd)
    
    class_counts = np.bincount(y_encoded)
    min_class_samples = int(class_counts.min())
    
    if min_class_samples < 2:
        print(f"Error: At least one identity has fewer than 2 usable embeddings. Add more images to 'dataset/' folders before training.")
        sys.exit(1)
        
    # Split Strategy
    unique_group_count = len(np.unique(capture_groups)) if len(capture_groups) == len(X_scrfd) else 0
    if min_class_samples >= 3 and unique_group_count >= 2:
        evaluation_mode = "group_holdout_test"
        splitter = GroupShuffleSplit(n_splits=1, test_size=0.3, random_state=SEED)
        try:
            train_idx, test_idx = next(splitter.split(X_scrfd, y_encoded, groups=capture_groups))
            X_train, X_test = np.asarray(X_scrfd)[train_idx], np.asarray(X_scrfd)[test_idx]
            y_train, y_test = y_encoded[train_idx], y_encoded[test_idx]
            
            classes_in_train = set(np.unique(y_train))
            classes_in_test = set(np.unique(y_test))
            lost_classes = classes_in_test - classes_in_train
            if lost_classes:
                raise ValueError("Lost classes in split")
            cv_splits = min(3, int(np.bincount(y_train).min()))
        except Exception:
            evaluation_mode = "holdout_test"
            X_train, X_test, y_train, y_test = train_test_split(
                np.asarray(X_scrfd), y_encoded, test_size=0.3, stratify=y_encoded, random_state=SEED
            )
            cv_splits = min(3, int(np.bincount(y_train).min()))
    else:
        evaluation_mode = "cross_validation_only"
        X_train, y_train = np.asarray(X_scrfd), y_encoded
        X_test, y_test = None, None
        cv_splits = min(3, min_class_samples)
        
    try:
        cv_strategy = StratifiedKFold(n_splits=cv_splits, shuffle=True, random_state=SEED)
    except Exception:
        cv_strategy = KFold(n_splits=cv_splits, shuffle=True, random_state=SEED)
        
    print(f"Evaluation Mode: {evaluation_mode}")
    print(f"Training set: {len(X_train)} samples")
    if X_test is not None:
        print(f"Test set: {len(X_test)} samples")
        
    scorer = make_scorer(f1_score, average="macro")
    
    # Custom pickle-safe XGBoost fitting wrapper
    class XGBClassifierFixed(xgb.XGBClassifier):
        def fit(self, X, y, **kwargs):
            y = np.asarray(y)
            fold_encoder = LabelEncoder()
            y_fold = fold_encoder.fit_transform(y)
            self.fold_label_encoder_ = fold_encoder
            self.set_params(num_class=int(len(fold_encoder.classes_)), use_label_encoder=False)
            return super().fit(X, y_fold, **kwargs)

    classifiers = {
        "RandomForest": (RandomForestClassifier(n_estimators=100, random_state=SEED),
                          {'n_estimators': [100, 200], 'max_depth': [3, 5, 7], 'min_samples_split': [2, 5]}),
        "XGBoost": (XGBClassifierFixed(
            n_estimators=100,
            random_state=SEED,
            objective="multi:softprob",
            eval_metric="mlogloss",
            use_label_encoder=False
        ), {'n_estimators': [100, 200], 'max_depth': [3, 5], 'learning_rate': [0.05, 0.1]}),
        "GradientBoosting": (GradientBoostingClassifier(n_estimators=100, random_state=SEED),
                              {'n_estimators': [100], 'learning_rate': [0.1], 'max_depth': [3]}),
        "DecisionTree": (DecisionTreeClassifier(random_state=SEED),
                          {'max_depth': [3, 5], 'criterion': ['entropy']}),
        "SVM": (Pipeline([("scaler", StandardScaler()), ("svc", SVC(probability=True, random_state=SEED))]),
               {'svc__C': [0.1, 1], 'svc__kernel': ['linear', 'rbf']}),
        "KNN": (Pipeline([("scaler", StandardScaler()), ("knn", KNeighborsClassifier())]),
                 {'knn__n_neighbors': [3, 5, 7], 'knn__weights': ['uniform', 'distance']}),
        "LogisticRegression": (Pipeline([("scaler", StandardScaler()), ("lr", LogisticRegression(max_iter=1000, random_state=SEED))]),
                                {'lr__C': [0.01, 0.05, 0.1, 0.5]}),
        "BaggedLogisticRegression": (BaggingClassifier(LogisticRegression(max_iter=1000, random_state=SEED), random_state=SEED),
                                      {'n_estimators': [3, 5, 7]})
    }

    print("\n[Grid Search Training...]")
    results = {}
    best_models = {}

    for name, (model, params) in classifiers.items():
        try:
            gs = GridSearchCV(
                model,
                params,
                scoring=scorer,
                cv=cv_strategy,
                n_jobs=-1,
                verbose=0,
                error_score=np.nan
            )
            gs.fit(X_train, y_train)
            score = float(gs.best_score_)
            if not np.isfinite(score):
                continue
            results[name] = score
            best_models[name] = {"model": gs.best_estimator_, "cv_f1": score}
            print(f"  {name:25s} Best CV F1: {score:.4f}")
        except Exception as e:
            print(f"  {name} failed: {e}")

    if not best_models:
        print("Error: No classifier completed training successfully.")
        sys.exit(1)

    sorted_models = sorted(best_models.items(), key=lambda item: item[1]["cv_f1"], reverse=True)
    top_models = dict(sorted_models[:min(7, len(sorted_models))])

    # Convert XGBoost classifiers back for pickle safety
    n_fixed = 0
    for name in list(top_models.keys()):
        estimator = top_models[name]["model"]
        if hasattr(estimator, 'fold_label_encoder_'):
            estimator.__class__ = xgb.XGBClassifier
            n_fixed += 1
    if n_fixed > 0:
        print(f"[PICKLE_FIX] Converted {n_fixed} XGBClassifierFixed -> XGBClassifier for pickle safety")

    # Define prediction helper for threshold calibration
    def _local_ensemble_vote_predict(embedding, per_model_floor):
        votes = []
        for model_name, model_data in top_models.items():
            estimator = model_data["model"]
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
            return "Unknown", 0.0, [], 0

        filtered_votes = [vote for vote in votes if vote[2] >= float(per_model_floor)]
        total_votes = len(filtered_votes)
        if total_votes <= 0:
            return "Unknown", 0.0, filtered_votes, 0

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
            return "Unknown", 0.0, filtered_votes, total_votes

        if total_votes >= 4:
            required = max(1, total_votes - 1)
            if winner_bucket["count"] < required:
                return "Unknown", 0.0, filtered_votes, total_votes
        else:
            if winner_bucket["count"] < total_votes:
                return "Unknown", 0.0, filtered_votes, total_votes

        confidences = winner_bucket["confidences"]
        mean_conf = float(np.mean(confidences)) if confidences else 0.0
        best_conf = float(np.max(confidences)) if confidences else 0.0
        confidence = float((best_conf * 0.8) + (mean_conf * 0.2))
        return winner, confidence, filtered_votes, total_votes

    # Calibration
    print("\n[Calibrating thresholds...]")
    calibrated_distance_threshold = 0.24
    calibrated_confidence_floor = 92.0
    calibrated_ensemble_per_model_floor = 92.0
    calibrated_ensemble_vote_floor = 92.0

    target_precision = 0.96
    target_recall_mid = 0.85
    target_recall_band_low = 0.80
    target_recall_band_high = 0.90

    if X_test is not None and len(X_test) > 0:
        calib_X = np.asarray(X_test, dtype=np.float32)
        calib_y = np.asarray(y_test)
    else:
        calib_X = np.asarray(X_train, dtype=np.float32)
        calib_y = np.asarray(y_train)

    if len(calib_X) >= 4 and len(np.unique(calib_y)) >= 2:
        try:
            X_calib, _, y_calib, _ = train_test_split(calib_X, calib_y, test_size=0.25, stratify=calib_y, random_state=SEED)
        except Exception:
            X_calib, y_calib = calib_X, calib_y
    else:
        X_calib, y_calib = calib_X, calib_y

    y_calib_labels = label_encoder.inverse_transform(np.asarray(y_calib, dtype=int))

    # Grid search for ensemble per-model confidence floor
    per_model_candidates = np.linspace(60.0, 95.0, 36)
    best_ensemble = {"score": -1e9, "floor": 92.0, "precision": 0.0, "recall": 0.0, "accepted_confidences": []}

    for per_model_floor in per_model_candidates:
        y_pred_labels = []
        accepted_confidences = []
        for embedding in X_calib:
            pred_label, pred_conf, _, _ = _local_ensemble_vote_predict(embedding, per_model_floor)
            y_pred_labels.append(pred_label)
            if pred_label != "Unknown":
                accepted_confidences.append(float(pred_conf))

        y_true_arr = np.asarray(y_calib_labels)
        y_pred_arr = np.asarray([str(item) for item in y_pred_labels])
        accepted_mask = y_pred_arr != "Unknown"
        correct_mask = y_pred_arr == y_true_arr

        accepted = int(np.sum(accepted_mask))
        correct = int(np.sum(correct_mask))
        total = int(len(y_true_arr))

        precision = float(correct / accepted) if accepted > 0 else 0.0
        recall = float(correct / total) if total > 0 else 0.0
        f1 = float((2.0 * precision * recall) / (precision + recall)) if (precision + recall) > 0 else 0.0

        within_recall_band = target_recall_band_low <= recall <= target_recall_band_high
        meets_precision_floor = precision >= target_precision

        score = (0.50 * f1) + (0.30 * precision) + (0.20 * recall)
        score -= abs(recall - target_recall_mid) * 0.20
        if within_recall_band:
            score += 0.25
        if meets_precision_floor:
            score += 0.20

        if score > best_ensemble["score"]:
            best_ensemble = {
                "score": score,
                "floor": float(per_model_floor),
                "precision": precision,
                "recall": recall,
                "accepted_confidences": accepted_confidences,
            }

    calibrated_ensemble_per_model_floor = float(best_ensemble["floor"])
    calibrated_ensemble_vote_floor = float(max(90.0, min(95.0, calibrated_ensemble_per_model_floor)))

    if best_ensemble["accepted_confidences"]:
        calibrated_confidence_floor = float(np.clip(np.percentile(best_ensemble["accepted_confidences"], 10), 90.0, 95.0))
    else:
        calibrated_confidence_floor = 92.0

    # L2 Cosine Distance threshold calibration
    X_norm = _l2_normalize_rows(X_calib)
    y_labels = np.asarray(y_calib)
    unique_labels = np.unique(y_labels)

    genuine_dists = []
    impostor_dists = []

    for label in unique_labels:
        same_idx = np.where(y_labels == label)[0]
        diff_idx = np.where(y_labels != label)[0]

        if len(same_idx) >= 2:
            for i in range(len(same_idx)):
                for j in range(i + 1, len(same_idx)):
                    genuine_dists.append(1.0 - float(np.dot(X_norm[same_idx[i]], X_norm[same_idx[j]])))

        if len(same_idx) >= 1 and len(diff_idx) >= 1:
            same_sample = same_idx[:min(len(same_idx), 8)]
            diff_sample = diff_idx[:min(len(diff_idx), 24)]
            for i in same_sample:
                for j in diff_sample:
                    impostor_dists.append(1.0 - float(np.dot(X_norm[i], X_norm[j])))

    if genuine_dists and impostor_dists:
        y_true_pairs = np.array([1] * len(genuine_dists) + [0] * len(impostor_dists), dtype=np.int32)
        all_dists = np.array(genuine_dists + impostor_dists, dtype=np.float32)

        candidate_thresholds = np.linspace(0.10, 0.45, 351)
        best_dist_score = -1e9
        best_threshold = calibrated_distance_threshold

        for t in candidate_thresholds:
            y_pred_pairs = (all_dists <= t).astype(np.int32)
            tp = int(np.sum((y_pred_pairs == 1) & (y_true_pairs == 1)))
            fp = int(np.sum((y_pred_pairs == 1) & (y_true_pairs == 0)))
            fn = int(np.sum((y_pred_pairs == 0) & (y_true_pairs == 1)))
            precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
            recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
            f1 = float((2.0 * precision * recall) / (precision + recall)) if (precision + recall) > 0 else 0.0

            within_recall_band = target_recall_band_low <= recall <= target_recall_band_high
            meets_precision_floor = precision >= target_precision

            score = (0.55 * f1) + (0.25 * precision) + (0.20 * recall)
            score -= abs(recall - target_recall_mid) * 0.15
            if within_recall_band:
                score += 0.25
            if meets_precision_floor:
                score += 0.20

            if score > best_dist_score:
                best_dist_score = score
                best_threshold = float(t)

        calibrated_distance_threshold = best_threshold

    print(f"Calibration results:")
    print(f"  Ensemble per-model floor: {calibrated_ensemble_per_model_floor:.1f}%")
    print(f"  Ensemble vote floor: {calibrated_ensemble_vote_floor:.1f}%")
    print(f"  Pairwise distance threshold: {calibrated_distance_threshold:.3f}")
    print(f"  Precision floor: {calibrated_confidence_floor:.1f}%")

    # Serialize trained models and metadata
    model_data = {
        "top_models": top_models,
        "label_encoder": label_encoder,
        "reference_embeddings": X_scrfd,
        "reference_labels": y_scrfd,
        "label_mode": "student_id",
        "embedding_model": "Facenet512",
        "training_pipeline": "permissive_deepface_fallback_v2",
        "id_to_name": id_to_name_map,
        "name_to_id": name_to_id_map,
        "folder_to_id": folder_to_id_map,
        "distance_threshold": float(calibrated_distance_threshold),
        "min_logging_confidence": float(calibrated_confidence_floor),
        "ensemble_agreement_threshold": 1.0,
        "ensemble_min_confidence": float(calibrated_ensemble_vote_floor),
        "ensemble_per_model_min_confidence": float(calibrated_ensemble_per_model_floor),
        "use_strict_voting": True,
        "require_frontal_pose": True,
        "max_eye_y_diff_ratio": 0.085,
        "max_nose_x_offset_ratio": 0.12,
        "max_nose_y_offset_ratio": 0.20,
        "detector": "SCRFD",
        "trained_at": datetime.datetime.now().isoformat()
    }

    timestamp = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    model_filename = os.path.join(models_dir, f"model_section_{section_id}_{timestamp}.joblib")
    joblib.dump(model_data, model_filename)
    print(f"Model saved locally to: {model_filename}")

    # Upload to SAMS API endpoint
    api_url = os.environ.get("NEXT_PUBLIC_API_URL") or "http://localhost:3000"
    upload_url = f"{api_url}/api/model_send"
    print(f"Uploading model to SAMS at: {upload_url}")
    
    try:
        model_bytes = io.BytesIO()
        joblib.dump(model_data, model_bytes)
        model_bytes.seek(0)
        
        files = {
            'model': ('scrfd_model.joblib', model_bytes, 'application/octet-stream')
        }
        data = {
            'course_id': str(section_id)
        }
        
        response = requests.post(upload_url, files=files, data=data, timeout=60)
        print(f"Upload Response HTTP Status: {response.status_code}")
        if response.status_code == 200:
            res_data = response.json()
            if res_data.get('success'):
                print("Model uploaded successfully!")
            else:
                print(f"Upload failed: {res_data.get('error')}")
        else:
            print(f"Upload HTTP error: {response.text[:200]}")
    except Exception as e:
        print(f"Error uploading model to server: {e}")

if __name__ == "__main__":
    main()
