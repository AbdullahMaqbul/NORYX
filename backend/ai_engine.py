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
    # Firewall
    "firewall":              "firewall",
    "fire wall":             "firewall",
    "domain profile":        "firewall",
    "private profile":       "firewall",
    "public profile":        "firewall",
    "defaultinboundaction":  "firewall",
    "logdroppedpackets":     "firewall",
    "logsuccessfulconnections": "firewall",
    "firewall state":        "firewall",
    "pfirewall.log":         "firewall",
    "file and printer sharing": "firewall",
    "icmpv4":                "firewall",
    "remote assistance":     "firewall",
    "network discovery":     "firewall",
    # Antivirus / Endpoint / Defender
    "antivirus":             "antivirus",
    "anti-virus":            "antivirus",
    "malware":               "antivirus",
    "virus":                 "antivirus",
    "real-time protection":  "antivirus",
    "endpoint":              "antivirus",
    "windefend":             "antivirus",
    "microsoft defender":    "antivirus",
    "tamper protection":     "antivirus",
    "behavior monitoring":   "antivirus",
    "cloud-delivered protection": "antivirus",
    "automatic sample submission": "antivirus",
    "asr":                   "antivirus",
    "attack surface reduction": "antivirus",
    "exclusionpath":         "antivirus",
    "exclusionprocess":      "antivirus",
    "amproductversion":      "antivirus",
    "edr":                   "antivirus",
    "sensor":                "antivirus",
    "security intelligence": "antivirus",
    "antivirussignature":    "antivirus",
    "mapsreporting":         "antivirus",
    "disablebehaviormonitoring": "antivirus",
    "enablenetworkprotection": "antivirus",
    "pua protection":        "antivirus",
    "controlled folder access": "antivirus",
    "smartscreen":           "antivirus",
    "extensioninstallblocklist": "antivirus",
    "download restrictions": "antivirus",
    "safe browsing":         "antivirus",
    # Access Control
    "active directory":      "access",
    "user account":          "access",
    "access control":        "access",
    "identity":              "access",
    "authentication":        "access",
    "mfa":                   "access",
    "multi-factor":          "access",
    "password":              "access",
    "rbac":                  "access",
    "role-based":            "access",
    "privileged":            "access",
    "pam":                   "access",
    "minimum password length": "access",
    "password complexity":   "access",
    "account lockout":       "access",
    "enablelua":             "access",
    "user account control":  "access",
    "admin approval mode":   "access",
    "consentpromptbehavioradmin": "access",
    "guest":                 "access",
    "administrator":         "access",
    "blank password":        "access",
    "local account":         "access",
    "runasppl":              "access",
    "lsa protection":        "access",
    "passwordmanagerenabled": "access",
    # Logging & SIEM
    "event viewer":          "logging",
    "event log":             "logging",
    "audit":                 "logging",
    "siem":                  "logging",
    "logging":               "logging",
    "log management":        "logging",
    "auditpol":              "logging",
    "script block logging":  "logging",
    "enablescriptblocklogging": "logging",
    "module logging":        "logging",
    "enablemodulelogging":   "logging",
    "transcription":         "logging",
    "enabletranscripting":   "logging",
    "process creation":      "logging",
    "4688":                  "logging",
    "maximum log size":      "logging",
    "196608":                "logging",
    "retention method":      "logging",
    "logon":                 "logging",
    "account management":    "logging",
    "privilege use":         "logging",
    "object access":         "logging",
    # Patch Management
    "update":                "patch",
    "patch":                 "patch",
    "hotfix":                "patch",
    "windows update":        "patch",
    "wuauserv":              "patch",
    "cumulative update":     "patch",
    "delivery optimization": "patch",
    "pending reboot":        "patch",
    "auoptions":             "patch",
    "antivirussignatureversion": "patch",
    # Encryption / BitLocker / Platform
    "bitlocker":             "encryption",
    "encrypt":               "encryption",
    "drive encryption":      "encryption",
    "aes-256":               "encryption",
    "xts-aes":               "encryption",
    "manage-bde":            "encryption",
    "recovery password":     "encryption",
    "numerical password":    "encryption",
    "percentage encrypted":  "encryption",
    "auto unlock":           "encryption",
    "removable data drives": "encryption",
    "tpm":                   "encryption",
    "tpmowned":              "encryption",
    "tpmready":              "encryption",
    "tpmpresent":            "encryption",
    "secure boot":           "encryption",
    "confirm-securebootuefi": "encryption",
    "uefi":                  "encryption",
    "bios mode":             "encryption",
    "core isolation":        "encryption",
    "memory integrity":      "encryption",
    # Backup & BCP
    "backup":                "backup",
    "recovery":              "backup",
    "restore":               "backup",
    "disaster":              "backup",
    "business continuity":   "backup",
    "rto":                   "backup",
    "rpo":                   "backup",
    "file history":          "backup",
    "restore point":         "backup",
    "system protection":     "backup",
    "onedrive":              "backup",
    "known folder backup":   "backup",
    # Network / Remote Access
    "network":               "network",
    "vpn":                   "network",
    "segmentation":          "network",
    "vlan":                  "network",
    "dmz":                   "network",
    "remote desktop":        "network",
    "fdenytsconnections":    "network",
    "rdp":                   "network",
    "network level authentication": "network",
    "userauthentication":    "network",
    "winrm":                 "network",
    "psremoting":            "network",
    "trustedhosts":          "network",
    "remoteregistry":        "network",
    "smb1protocol":          "network",
    "allowinsecureguestauth": "network",
    "usbstor":               "network",
    "autorun":               "network",
    "autoplay":              "network",
    "nodrivetypeautorun":    "network",
    "bluetooth":             "network",
    "device pairing":        "network",
    "print spooler":         "network",
    "applocker":             "network",
    "wdac":                  "network",
    "windows script host":   "network",
    # Incident Response
    "incident response":     "incident_response",
    "incident":              "incident_response",
    "tabletop":              "incident_response",
    "playbook":              "incident_response",
    "irp":                   "incident_response",
    "mttd":                  "incident_response",
    "mttr":                  "incident_response",
    "escalation":            "incident_response",
    "post-incident":         "incident_response",
    # Vulnerability Management
    "vulnerability":         "vulnerability",
    "penetration test":      "vulnerability",
    "pentest":               "vulnerability",
    "nessus":                "vulnerability",
    "qualys":                "vulnerability",
    "tenable":               "vulnerability",
    "rapid7":                "vulnerability",
    "cve":                   "vulnerability",
    "cvss":                  "vulnerability",
    "scan":                  "vulnerability",
    # Awareness & Training
    "awareness":             "training",
    "training":              "training",
    "phishing simulation":   "training",
    "knowbe4":               "training",
    "proofpoint":            "training",
    "click rate":            "training",
    "security awareness":    "training",
    # Third-Party Risk
    "vendor":                "third_party",
    "third-party":           "third_party",
    "third party":           "third_party",
    "supplier":              "third_party",
    "dpa":                   "third_party",
    "due diligence":         "third_party",
    "assessment register":   "third_party",
    "right to audit":        "third_party",
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
        # Category mismatch — halve confidence and downgrade optimistic verdicts
        combined_conf *= 0.5
        if predicted_status == "pass":
            predicted_status = "need_review"
        # After the mismatch penalty, if confidence collapses below 0.35 the
        # screenshot is clearly wrong-category or irrelevant — hard-fail it
        # rather than routing it to manager review (which is for ambiguous cases).
        if combined_conf < 0.35:
            return "fail", extracted_text, "High"

    if combined_conf >= 0.80:
        confidence_label = "High"
    elif combined_conf >= 0.50:
        confidence_label = "Medium"
    else:
        confidence_label = "Low"
        if predicted_status == "pass":
            predicted_status = "need_review"
        # Low confidence on a clear mismatch that survived above threshold:
        # still escalate need_review → fail so junk evidence never passes review.
        if predicted_status == "need_review" and not category_matches:
            predicted_status = "fail"

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
