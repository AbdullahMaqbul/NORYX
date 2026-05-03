"""
Smart Evidence Validation Engine (v2)
=====================================

Multi-stage pipeline:

  Screenshot → OCR (EasyOCR) → Model A (category) → Match control? → Model B (compliance) → Result

Stage 1: Extract text from image using OCR
Stage 2: Classify what type of evidence the text represents (Model A)
Stage 3: Check if the detected category matches the expected control type
Stage 4: Determine compliance status (Model B)
"""

import os
import cv2
import joblib
import easyocr

# ─── OCR Reader ──────────────────────────────────────────────────────────────
reader = easyocr.Reader(['en'], gpu=False)

# ─── Model paths ─────────────────────────────────────────────────────────────
_DIR          = os.path.dirname(__file__)
_CAT_PATH     = os.path.join(_DIR, 'category_model.pkl')       # Model A
_COMP_PATH    = os.path.join(_DIR, 'compliance_model_v2.pkl')   # Model B
_LEGACY_PATH  = os.path.join(_DIR, 'compliance_model.pkl')      # Old single model (fallback)

_cat_model  = None
_comp_model = None


def _load_models():
    """Lazy-load both models."""
    global _cat_model, _comp_model

    if _cat_model is None and os.path.exists(_CAT_PATH):
        _cat_model = joblib.load(_CAT_PATH)

    if _comp_model is None:
        if os.path.exists(_COMP_PATH):
            _comp_model = joblib.load(_COMP_PATH)
        elif os.path.exists(_LEGACY_PATH):
            _comp_model = joblib.load(_LEGACY_PATH)

    return _cat_model, _comp_model


# ─── Control-to-category mapping ─────────────────────────────────────────────

# Maps control keywords (from criteria+description) → expected evidence category
CONTROL_CATEGORY_MAP = {
    "firewall":     "firewall",
    "fire wall":    "firewall",
    "antivirus":    "antivirus",
    "anti-virus":   "antivirus",
    "malware":      "antivirus",
    "virus":        "antivirus",
    "real-time protection": "antivirus",
    "endpoint":     "antivirus",
    "active directory":   "access",
    "user account": "access",
    "access control":     "access",
    "identity":     "access",
    "authentication":"access",
    "mfa":          "access",
    "multi-factor": "access",
    "password":     "access",
    "event viewer": "logging",
    "event log":    "logging",
    "audit":        "logging",
    "siem":         "logging",
    "logging":      "logging",
    "log management":"logging",
    "update":       "patch",
    "patch":        "patch",
    "hotfix":       "patch",
    "windows update":"patch",
    "bitlocker":    "encryption",
    "encrypt":      "encryption",
    "drive encryption": "encryption",
    "backup":       "backup",
    "recovery":     "backup",
    "restore":      "backup",
    "disaster":     "backup",
    "network":      "network",
    "vpn":          "network",
    "segmentation": "network",
    "vlan":         "network",
    "dmz":          "network",
}


def _detect_expected_category(criteria_text: str) -> str | None:
    """Determine what category of evidence is expected for this control."""
    text_lower = criteria_text.lower()
    scores = {}

    for keyword, category in CONTROL_CATEGORY_MAP.items():
        if keyword in text_lower:
            scores[category] = scores.get(category, 0) + 1

    if not scores:
        return None

    return max(scores, key=scores.get)


# ─── OCR ─────────────────────────────────────────────────────────────────────

def extract_text_from_image(image_path: str) -> str:
    """Extracts text from the given image using EasyOCR."""
    try:
        img = cv2.imread(image_path)
        if img is None:
            return "Error: Could not read image."
        results = reader.readtext(image_path)
        extracted = [text for (bbox, text, prob) in results if prob > 0.3]
        return " ".join(extracted)
    except Exception as e:
        return f"Error extracting text: {str(e)}"


# ─── Main validation ─────────────────────────────────────────────────────────

def validate_evidence(image_path: str, criteria: str) -> tuple[str, str, str]:
    """
    Smart multi-stage evidence validation.

    Returns:
        (status, extracted_text, confidence)
        status:     'pass' | 'fail' | 'need_review'
        confidence: 'High' | 'Medium' | 'Low'
    """
    # ── Stage 1: OCR ─────────────────────────────────────────────────────────
    extracted_text = extract_text_from_image(image_path)

    if extracted_text.startswith("Error"):
        return "fail", extracted_text, "High"

    # ── Load models ──────────────────────────────────────────────────────────
    cat_model, comp_model = _load_models()

    if cat_model is None or comp_model is None:
        # Fallback if models aren't trained yet
        return _fallback_validation(extracted_text, criteria)

    # ── Stage 2: Classify evidence category (Model A) ────────────────────────
    predicted_category = cat_model.predict([extracted_text])[0]
    cat_proba          = cat_model.predict_proba([extracted_text])[0]
    cat_confidence     = max(cat_proba)

    # ── Stage 3: Check if category matches the control ───────────────────────
    expected_category = _detect_expected_category(criteria)

    category_matches = True
    if expected_category:
        if predicted_category == "irrelevant":
            # Screenshot is clearly not security-related
            return (
                "fail",
                extracted_text,
                "High",
            )

        if predicted_category != expected_category:
            # Screenshot is a valid security screenshot, but wrong type
            # e.g., Active Directory screenshot for a firewall control
            if cat_confidence >= 0.7:
                return (
                    "fail",
                    extracted_text,
                    "High",
                )
            else:
                category_matches = False  # low confidence, let compliance model decide

    # ── Stage 4: Classify compliance status (Model B) ────────────────────────
    # Prefix the detected category so Model B uses category-aware features
    model_input     = f"[{predicted_category}] {extracted_text}"
    predicted_status = comp_model.predict([model_input])[0]
    status_proba     = comp_model.predict_proba([model_input])[0]
    status_conf      = max(status_proba)

    # ── Confidence calculation ───────────────────────────────────────────────
    # Combine category confidence and compliance confidence
    combined_conf = (cat_confidence * 0.4) + (status_conf * 0.6)

    if not category_matches:
        # Category mismatch but low confidence — push to review
        combined_conf *= 0.5
        if predicted_status == "pass":
            predicted_status = "need_review"

    if combined_conf >= 0.80:
        confidence_label = "High"
    elif combined_conf >= 0.50:
        confidence_label = "Medium"
    else:
        confidence_label = "Low"
        if predicted_status == "pass":
            predicted_status = "need_review"

    return predicted_status, extracted_text, confidence_label


def _fallback_validation(text: str, criteria: str) -> tuple[str, str, str]:
    """Simple keyword fallback when models aren't available."""
    keywords = [k.strip().lower() for k in criteria.split(",")] if criteria else []
    text_lower = text.lower()
    matches = sum(1 for kw in keywords if kw and kw in text_lower)

    if keywords:
        ratio = matches / len(keywords)
        if ratio >= 0.8:
            return "pass", text, "High"
        elif ratio > 0:
            return "need_review", text, "Medium"

    return "fail", text, "High"
