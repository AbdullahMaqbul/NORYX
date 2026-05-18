from __future__ import annotations

import datetime
import re
import shutil
import subprocess
import zipfile
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from sqlalchemy import func
from sqlalchemy.orm import Session

import framework_library_db


ENGINE_NAME = "heuristic_v1"
GRCEXPERT_ENGINE_KEY = "grcexpert"
ASSESSMENT_EXCLUDED_FRAMEWORKS = {"scf"}

TOKEN_RE = re.compile(r"[a-zA-Z][a-zA-Z0-9_-]{2,}")
SENTENCE_RE = re.compile(r"(?<=[.!?])\s+|\n+")

STOPWORDS = {
    "able", "about", "above", "across", "after", "again", "against", "all", "also",
    "and", "any", "are", "based", "been", "before", "being", "between", "both",
    "can", "cannot", "control", "controls", "could", "cyber", "cybersecurity",
    "defined", "document", "documented", "each", "ensure", "entity", "from",
    "have", "has", "hereinafter", "including", "into", "its", "may", "member",
    "must", "necessary", "not", "objective", "organization", "organizational",
    "other", "over", "principle", "process", "requirements", "reviewed", "shall",
    "should", "such", "that", "the", "their", "there", "these", "this", "those",
    "through", "under", "upon", "used", "using", "where", "which", "while", "with",
    "within", "without", "security", "information",
}

NEGATIVE_PATTERNS = (
    "does not",
    "do not",
    "has not",
    "have not",
    "not yet",
    "not fully",
    "not completed",
    "not performed",
    "does not define",
    "no formal",
    "no complete",
    "missing",
)

TOPIC_ALIASES = {
    "strategy": {"strategy", "roadmap", "initiative", "approved", "executive"},
    "governance": {"governance", "committee", "board", "ciso", "executive", "roles", "responsibilities"},
    "policy": {"policy", "policies", "procedure", "standard", "approved", "review"},
    "risk": {"risk", "appetite", "tolerance", "exception", "register", "acceptance"},
    "asset": {"asset", "inventory", "owner", "criticality", "lifecycle", "classification"},
    "access": {"access", "identity", "user", "users", "mfa", "password", "privileged", "approval"},
    "password": {"password", "passwords", "characters", "reuse", "history", "compromise"},
    "cryptography": {"encryption", "cryptographic", "crypto", "tls", "aes", "key", "vault", "hsm"},
    "backup": {"backup", "backups", "restore", "recovery", "rto", "rpo", "repository"},
    "recovery": {"backup", "restore", "recovery", "rto", "rpo", "continuity"},
    "incident": {"incident", "response", "escalation", "severity", "forensic", "reported"},
    "vulnerability": {"vulnerability", "vulnerabilities", "scan", "patch", "remediate", "penetration"},
    "third": {"third-party", "vendor", "vendors", "supplier", "contract", "outsourcing"},
    "supplier": {"third-party", "vendor", "vendors", "supplier", "contract", "outsourcing"},
    "cloud": {"cloud", "saas", "workload", "configuration", "approved"},
    "awareness": {"awareness", "training", "onboarding", "phishing", "employees"},
    "training": {"awareness", "training", "onboarding", "phishing", "employees"},
    "logging": {"log", "logs", "logging", "monitoring", "alerts", "retention", "siem"},
    "monitoring": {"log", "logs", "logging", "monitoring", "alerts", "retention", "siem"},
    "physical": {"physical", "badge", "visitor", "escort", "cctv", "room"},
    "data": {"data", "classification", "sensitive", "customer", "finance", "privacy"},
}


def get_assessable_frameworks(db: Session) -> list[dict]:
    rows = (
        db.query(
            framework_library_db.FrameworkControl.framework_key,
            framework_library_db.FrameworkControl.framework_name,
            framework_library_db.FrameworkControl.version,
            func.count(framework_library_db.FrameworkControl.id),
        )
        .filter(~framework_library_db.FrameworkControl.framework_key.in_(ASSESSMENT_EXCLUDED_FRAMEWORKS))
        .group_by(
            framework_library_db.FrameworkControl.framework_key,
            framework_library_db.FrameworkControl.framework_name,
            framework_library_db.FrameworkControl.version,
        )
        .order_by(framework_library_db.FrameworkControl.framework_name)
        .all()
    )
    return [
        {
            "framework_key": key,
            "framework_name": name,
            "version": version,
            "controls": count,
        }
        for key, name, version, count in rows
    ]


def get_assessment_engines() -> list[dict]:
    try:
        import GRCEXPERT_assessment

        grc_model = GRCEXPERT_assessment.MODEL_NAME
    except Exception:
        grc_model = "gemma4:eb4"
    return [
        {
            "key": ENGINE_NAME,
            "label": "Fast Heuristic",
            "description": "Deterministic local scoring",
            "default": True,
        },
        {
            "key": GRCEXPERT_ENGINE_KEY,
            "label": "Use GRC Expert AI",
            "description": "Local Ollama bilingual analysis",
            "model": grc_model,
            "default": False,
        },
    ]


def normalize_engine(engine: str | None) -> str:
    value = (engine or ENGINE_NAME).strip().lower()
    if value in {"grcexpert", "grc_expert", "grc-expert", "ollama", "ollama_gemma", "gemma4:eb4"}:
        return GRCEXPERT_ENGINE_KEY
    return ENGINE_NAME


def resolve_framework_keys(db: Session, selected: Iterable[str] | None) -> list[str]:
    available = [item["framework_key"] for item in get_assessable_frameworks(db)]
    requested = [str(item).strip() for item in (selected or []) if str(item).strip()]
    if not requested or any(item.lower() == "all" for item in requested):
        return available

    available_lc = {key.lower(): key for key in available}
    resolved = []
    for item in requested:
        key = available_lc.get(item.lower())
        if key and key not in resolved:
            resolved.append(key)
    return resolved


def assess_policy_document(
    db: Session,
    document,
    selected_frameworks: Iterable[str] | None = None,
    engine: str | None = None,
) -> dict:
    selected_engine = normalize_engine(engine)
    if selected_engine == GRCEXPERT_ENGINE_KEY:
        try:
            import GRCEXPERT_assessment

            return GRCEXPERT_assessment.assess_policy_document(db, document, selected_frameworks)
        except RuntimeError as exc:
            fallback = assess_policy_document(db, document, selected_frameworks, engine=ENGINE_NAME)
            fallback["requested_engine"] = GRCEXPERT_ENGINE_KEY
            fallback["engine"] = f"GRCEXPERT unavailable -> {ENGINE_NAME}"
            fallback["fallback_reason"] = str(exc)
            fallback["note"] = "GRCEXPERT was requested but Ollama was not available, so deterministic scoring was used."
            return fallback

    framework_keys = resolve_framework_keys(db, selected_frameworks)
    if not framework_keys:
        raise ValueError("No assessable frameworks were selected")

    path = framework_library_db.PROJECT_ROOT / document.stored_path
    text = extract_policy_text(path)
    if not text.strip():
        raise ValueError("Could not extract text from this policy document")

    sentences = split_sentences(text)
    frameworks = []
    for framework_key in framework_keys:
        controls = (
            db.query(framework_library_db.FrameworkControl)
            .filter(framework_library_db.FrameworkControl.framework_key == framework_key)
            .order_by(framework_library_db.FrameworkControl.control_id)
            .all()
        )
        details = [score_control(control, sentences) for control in controls]
        frameworks.append(summarize_framework(controls, details))

    total_controls = sum(item["total_controls"] for item in frameworks)
    total_points = sum(item["points"] for item in frameworks)
    overall_percentage = round((total_points / total_controls * 100) if total_controls else 0, 2)

    return {
        "engine": ENGINE_NAME,
        "engine_key": ENGINE_NAME,
        "requested_engine": ENGINE_NAME,
        "generated_at": datetime.datetime.utcnow().isoformat(),
        "document": {
            "id": document.id,
            "company_name": document.company_name,
            "document_type": document.document_type,
            "original_filename": document.original_filename,
        },
        "selected_frameworks": framework_keys,
        "overall_percentage": overall_percentage,
        "total_controls": total_controls,
        "frameworks": frameworks,
        "note": "This is a deterministic policy-text scoring engine. It is ready to be replaced by a custom framework AI later.",
    }


def extract_policy_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore")
    if suffix == ".pdf":
        return extract_pdf_text(path)
    if suffix == ".docx":
        return extract_docx_text(path)
    return ""


def extract_pdf_text(path: Path) -> str:
    pdftotext = shutil.which("pdftotext")
    if not pdftotext:
        return ""
    result = subprocess.run(
        [pdftotext, "-layout", str(path), "-"],
        capture_output=True,
        text=True,
        timeout=45,
        check=False,
    )
    return result.stdout if result.returncode == 0 else ""


def extract_docx_text(path: Path) -> str:
    try:
        with zipfile.ZipFile(path) as package:
            xml = package.read("word/document.xml")
    except (KeyError, zipfile.BadZipFile, OSError):
        return ""

    try:
        root = ElementTree.fromstring(xml)
    except ElementTree.ParseError:
        return ""
    chunks = []
    for node in root.iter():
        if node.tag.endswith("}t") and node.text:
            chunks.append(node.text)
        elif node.tag.endswith("}p"):
            chunks.append("\n")
    return " ".join(chunks)


def split_sentences(text: str) -> list[str]:
    normalized = re.sub(r"\s+", " ", text.replace("\x0c", " ")).strip()
    parts = [part.strip() for part in SENTENCE_RE.split(normalized) if part.strip()]
    if not parts:
        return [normalized] if normalized else []
    return [part for part in parts if len(part) > 20]


def tokens(text: str) -> set[str]:
    output = set()
    for token in TOKEN_RE.findall((text or "").lower()):
        token = token.strip("_-")
        if len(token) < 3 or token in STOPWORDS or token.isdigit():
            continue
        output.add(token)
    return output


def control_aliases(text: str) -> set[str]:
    lower = (text or "").lower()
    aliases = set()
    for topic, words in TOPIC_ALIASES.items():
        if topic in lower:
            aliases.update(words)
    return aliases


def score_control(control, sentences: list[str]) -> dict:
    focus_text = " ".join(filter(None, [control.title, control.domain, control.category]))
    full_text = " ".join(filter(None, [focus_text, control.control_text]))
    control_tokens = tokens(full_text)
    focus_tokens = tokens(focus_text)
    alias_tokens = control_aliases(full_text)

    best_sentence = ""
    best_value = 0.0
    best_hits = set()

    for sentence in sentences:
        sentence_tokens = tokens(sentence)
        if not sentence_tokens:
            continue
        hits = control_tokens & sentence_tokens
        focus_hits = focus_tokens & sentence_tokens
        alias_hits = alias_tokens & sentence_tokens
        phrase_bonus = 0.0
        title = (control.title or "").lower()
        if title and title in sentence.lower():
            phrase_bonus += 2.0
        value = len(hits) + (len(focus_hits) * 1.15) + (len(alias_hits) * 0.85) + phrase_bonus
        if value > best_value:
            best_value = value
            best_sentence = sentence
            best_hits = hits | focus_hits | alias_hits

    denominator = max(5.0, min(15.0, len(control_tokens) * 0.35 + len(focus_tokens) * 0.8 + 2.0))
    coverage = min(1.0, best_value / denominator) if best_value else 0.0
    negative = has_negative_language(best_sentence)

    if coverage >= 0.64 and not negative:
        status = "compliant"
        points = 1.0
    elif coverage >= 0.34:
        status = "partial"
        points = 0.5
    else:
        status = "not_compliant"
        points = 0.0

    if negative and coverage < 0.52:
        status = "not_compliant"
        points = 0.0

    evidence = best_sentence if coverage >= 0.25 else ""
    return {
        "control_id": control.control_id,
        "title": control.title or control.domain or "Untitled control",
        "domain": control.domain or "",
        "status": status,
        "points": points,
        "confidence": round(coverage * 100, 1),
        "evidence": clip(evidence, 420),
        "gap": build_gap(control, status, negative),
        "matched_terms": sorted(best_hits)[:10],
    }


def summarize_framework(controls: list, details: list[dict]) -> dict:
    total = len(details)
    compliant = sum(1 for item in details if item["status"] == "compliant")
    partial = sum(1 for item in details if item["status"] == "partial")
    not_compliant = sum(1 for item in details if item["status"] == "not_compliant")
    points = sum(item["points"] for item in details)
    percentage = round((points / total * 100) if total else 0, 2)
    first = controls[0] if controls else None
    return {
        "framework_key": first.framework_key if first else "",
        "framework_name": first.framework_name if first else "",
        "version": first.version if first else "",
        "total_controls": total,
        "compliant": compliant,
        "partial": partial,
        "not_compliant": not_compliant,
        "points": points,
        "percentage": percentage,
        "details": details,
    }


def has_negative_language(sentence: str) -> bool:
    lower = (sentence or "").lower()
    return any(pattern in lower for pattern in NEGATIVE_PATTERNS)


def build_gap(control, status: str, negative: bool) -> str:
    if status == "compliant":
        return ""
    title = control.title or control.control_id or "this control"
    if negative:
        return f"Policy text indicates an unresolved gap for {title}."
    if status == "partial":
        return f"Add clearer policy language, ownership, frequency, and measurable requirements for {title}."
    return f"No strong policy evidence was found for {title}."


def clip(value: str, limit: int) -> str:
    value = re.sub(r"\s+", " ", value or "").strip()
    if len(value) <= limit:
        return value
    return value[: limit - 3].rstrip() + "..."


def report_font_name() -> str:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if not path.exists():
            continue
        try:
            pdfmetrics.registerFont(TTFont("NoryxUnicode", str(path)))
            return "NoryxUnicode"
        except Exception:
            continue
    return "Helvetica"


def detail_evidence_text(item: dict) -> str:
    evidence_en = item.get("evidence_en") or item.get("evidence") or ""
    evidence_ar = item.get("evidence_ar") or ""
    gap_en = item.get("gap_en") or item.get("gap") or ""
    gap_ar = item.get("gap_ar") or ""
    rationale_en = item.get("rationale_en") or ""
    rationale_ar = item.get("rationale_ar") or ""

    chunks = []
    if evidence_en:
        chunks.append(f"Evidence: {evidence_en}")
    if evidence_ar:
        chunks.append(f"الدليل: {evidence_ar}")
    if gap_en:
        chunks.append(f"Gap: {gap_en}")
    if gap_ar:
        chunks.append(f"الفجوة: {gap_ar}")
    if rationale_en:
        chunks.append(f"Reason: {rationale_en}")
    if rationale_ar:
        chunks.append(f"السبب: {rationale_ar}")
    return " | ".join(chunks)


def build_assessment_pdf(assessment: dict, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    font_name = report_font_name()
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=landscape(letter),
        rightMargin=28,
        leftMargin=28,
        topMargin=28,
        bottomMargin=28,
    )
    styles = getSampleStyleSheet()
    for style in styles.byName.values():
        style.fontName = font_name
    styles.add(ParagraphStyle(name="SmallCell", parent=styles["BodyText"], fontName=font_name, fontSize=7.2, leading=9))
    styles.add(ParagraphStyle(name="TinyMuted", parent=styles["BodyText"], fontName=font_name, fontSize=7, leading=9, textColor=colors.HexColor("#596562")))

    story = [
        Paragraph("Noryx Policy Framework Assessment", styles["Title"]),
        Spacer(1, 8),
        Paragraph(
            f"Company: {escape(assessment['document']['company_name'])} | "
            f"Document: {escape(assessment['document']['original_filename'])} | "
            f"Generated: {escape(assessment['generated_at'])} | Engine: {escape(assessment['engine'])}",
            styles["TinyMuted"],
        ),
        Spacer(1, 12),
        Paragraph(f"Overall Score: {assessment['overall_percentage']}%", styles["Heading2"]),
        Spacer(1, 8),
    ]

    summary_rows = [["Framework", "Controls", "Compliant", "Partial", "Not Met", "Score"]]
    for framework in assessment["frameworks"]:
        summary_rows.append(
            [
                framework["framework_name"],
                str(framework["total_controls"]),
                str(framework["compliant"]),
                str(framework["partial"]),
                str(framework["not_compliant"]),
                f"{framework['percentage']}%",
            ]
        )
    summary_table = Table(summary_rows, repeatRows=1, colWidths=[230, 70, 70, 70, 70, 70])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#128c7e")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#c9d6d3")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#eef5f3")]),
                ("ALIGN", (1, 1), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(summary_table)
    story.append(Spacer(1, 16))

    for framework in assessment["frameworks"]:
        story.append(Paragraph(f"{escape(framework['framework_name'])} Details", styles["Heading2"]))
        rows = [["Control", "Title", "Status", "Confidence", "Evidence / Gap"]]
        for item in framework["details"]:
            evidence_gap = detail_evidence_text(item) or item.get("evidence") or item.get("gap") or ""
            rows.append(
                [
                    Paragraph(escape(item["control_id"]), styles["SmallCell"]),
                    Paragraph(escape(clip(item["title"], 80)), styles["SmallCell"]),
                    Paragraph(status_label(item["status"]), styles["SmallCell"]),
                    Paragraph(f"{item['confidence']}%", styles["SmallCell"]),
                    Paragraph(escape(clip(evidence_gap, 260)), styles["SmallCell"]),
                ]
            )
        details_table = Table(rows, repeatRows=1, colWidths=[58, 130, 64, 58, 430])
        details_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e3eeeb")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#172321")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d6e2df")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("FONTSIZE", (0, 0), (-1, -1), 7.2),
                ]
            )
        )
        story.append(details_table)
        story.append(Spacer(1, 14))

    story.append(Paragraph(escape(assessment["note"]), styles["TinyMuted"]))
    doc.build(story)
    return output_path


def status_label(status: str) -> str:
    return {
        "compliant": "Compliant",
        "partial": "Partial",
        "not_compliant": "Not Met",
    }.get(status, status)
