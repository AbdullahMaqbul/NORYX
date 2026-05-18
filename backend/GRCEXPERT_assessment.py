from __future__ import annotations

import datetime
import json
import os
import re
import urllib.error
import urllib.request
from typing import Iterable

from sqlalchemy.orm import Session

import framework_library_db
import policy_assessment


ENGINE_KEY = "grcexpert"
MODEL_NAME = "gemma4:eb4"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
REQUEST_TIMEOUT = float(os.getenv("GRCEXPERT_TIMEOUT_SECONDS", "45"))
MAX_SNIPPETS = int(os.getenv("GRCEXPERT_SNIPPETS", "5"))
MAX_AI_CONTROLS = int(os.getenv("GRCEXPERT_MAX_AI_CONTROLS", "12"))


def assess_policy_document(db: Session, document, selected_frameworks: Iterable[str] | None = None) -> dict:
    available, reason = ollama_model_available()
    if not available:
        raise RuntimeError(reason)

    framework_keys = policy_assessment.resolve_framework_keys(db, selected_frameworks)
    if not framework_keys:
        raise ValueError("No assessable frameworks were selected")

    path = framework_library_db.PROJECT_ROOT / document.stored_path
    text = policy_assessment.extract_policy_text(path)
    if not text.strip():
        raise ValueError("Could not extract text from this policy document")

    sentences = policy_assessment.split_sentences(text)
    frameworks = []
    fallback_count = 0
    ai_count = 0

    for framework_key in framework_keys:
        controls = (
            db.query(framework_library_db.FrameworkControl)
            .filter(framework_library_db.FrameworkControl.framework_key == framework_key)
            .order_by(framework_library_db.FrameworkControl.control_id)
            .all()
        )
        details = []
        for control in controls:
            baseline = policy_assessment.score_control(control, sentences)
            should_use_ai = MAX_AI_CONTROLS <= 0 or ai_count < MAX_AI_CONTROLS
            if not should_use_ai:
                details.append(with_fallback_note(baseline, "GRCEXPERT_MAX_AI_CONTROLS limit reached."))
                fallback_count += 1
                continue

            snippets = rank_policy_snippets(control, sentences, baseline)
            try:
                details.append(assess_control_with_ollama(control, snippets, baseline))
                ai_count += 1
            except RuntimeError as exc:
                details.append(with_fallback_note(baseline, str(exc)))
                fallback_count += 1
        frameworks.append(policy_assessment.summarize_framework(controls, details))

    total_controls = sum(item["total_controls"] for item in frameworks)
    total_points = sum(item["points"] for item in frameworks)
    overall_percentage = round((total_points / total_controls * 100) if total_controls else 0, 2)
    engine_name = f"GRCEXPERT ({MODEL_NAME})"
    if fallback_count:
        engine_name = f"{engine_name} + heuristic fallback"

    return {
        "engine": engine_name,
        "engine_key": ENGINE_KEY,
        "requested_engine": ENGINE_KEY,
        "model": MODEL_NAME,
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
        "ai_controls": ai_count,
        "fallback_controls": fallback_count,
        "fallback_reason": f"{fallback_count} controls used heuristic fallback." if fallback_count else "",
        "note": "GRCEXPERT uses the local Ollama model for bilingual Arabic and English GRC analysis. Evidence is limited to extracted policy snippets.",
    }


def ollama_model_available() -> tuple[bool, str]:
    try:
        data = ollama_get("/api/tags")
    except RuntimeError as exc:
        return False, f"Ollama is not reachable at {OLLAMA_BASE_URL}: {exc}"

    names = {item.get("name", "") for item in data.get("models", [])}
    if MODEL_NAME not in names:
        return False, f"Ollama model '{MODEL_NAME}' is not available. Available models: {', '.join(sorted(names)) or 'none'}."
    return True, ""


def rank_policy_snippets(control, sentences: list[str], baseline: dict) -> list[str]:
    control_text = " ".join(filter(None, [control.framework_name, control.control_id, control.title, control.domain, control.control_text]))
    control_tokens = policy_assessment.tokens(control_text)
    alias_tokens = policy_assessment.control_aliases(control_text)
    ranked = []

    for sentence in sentences:
        sentence_tokens = policy_assessment.tokens(sentence)
        if not sentence_tokens:
            continue
        hits = control_tokens & sentence_tokens
        aliases = alias_tokens & sentence_tokens
        score = len(hits) + (len(aliases) * 1.4)
        if control.title and control.title.lower() in sentence.lower():
            score += 3
        if score > 0:
            ranked.append((score, sentence))

    ranked.sort(key=lambda item: item[0], reverse=True)
    snippets = []
    if baseline.get("evidence"):
        snippets.append(baseline["evidence"])
    for _, sentence in ranked:
        clipped = policy_assessment.clip(sentence, 650)
        if clipped and clipped not in snippets:
            snippets.append(clipped)
        if len(snippets) >= MAX_SNIPPETS:
            break
    return snippets


def assess_control_with_ollama(control, snippets: list[str], baseline: dict) -> dict:
    response = ollama_chat(build_prompt(control, snippets, baseline))
    parsed = parse_json_object(response)

    status = normalize_status(parsed.get("status")) or baseline["status"]
    confidence = clamp_float(parsed.get("confidence"), baseline["confidence"])
    points = {"compliant": 1.0, "partial": 0.5, "not_compliant": 0.0}[status]

    evidence_en = policy_assessment.clip(str(parsed.get("evidence_en") or parsed.get("evidence") or baseline.get("evidence") or ""), 700)
    evidence_ar = policy_assessment.clip(str(parsed.get("evidence_ar") or ""), 700)
    gap_en = policy_assessment.clip(str(parsed.get("gap_en") or parsed.get("gap") or baseline.get("gap") or ""), 700)
    gap_ar = policy_assessment.clip(str(parsed.get("gap_ar") or ""), 700)
    rationale_en = policy_assessment.clip(str(parsed.get("rationale_en") or parsed.get("rationale") or ""), 500)
    rationale_ar = policy_assessment.clip(str(parsed.get("rationale_ar") or ""), 500)

    if status == "compliant":
        gap_en = ""
        gap_ar = ""

    return {
        **baseline,
        "status": status,
        "points": points,
        "confidence": confidence,
        "evidence": evidence_en,
        "gap": gap_en,
        "evidence_en": evidence_en,
        "evidence_ar": evidence_ar,
        "gap_en": gap_en,
        "gap_ar": gap_ar,
        "rationale_en": rationale_en,
        "rationale_ar": rationale_ar,
        "assessment_engine": ENGINE_KEY,
        "model": MODEL_NAME,
    }


def build_prompt(control, snippets: list[str], baseline: dict) -> str:
    snippets_text = "\n".join(f"{idx + 1}. {snippet}" for idx, snippet in enumerate(snippets)) or "No strong policy snippets were retrieved."
    control_text = policy_assessment.clip(control.control_text or "", 1600)
    return f"""
You are GRCEXPERT, a bilingual Arabic/English GRC assessor.
Assess ONLY whether the policy snippets cover the framework control. Do not invent evidence.
Return JSON only. No markdown.

Allowed status values:
- compliant: the snippets clearly satisfy the control
- partial: the snippets cover part of the control but a requirement is missing or unclear
- not_compliant: no sufficient evidence exists in the snippets

Required JSON keys:
status, confidence, evidence_en, evidence_ar, gap_en, gap_ar, rationale_en, rationale_ar

Framework: {control.framework_name}
Control ID: {control.control_id}
Control Title: {control.title}
Control Domain: {control.domain}
Control Text: {control_text}

Initial deterministic assessment:
status={baseline.get("status")}
confidence={baseline.get("confidence")}
evidence={baseline.get("evidence")}
gap={baseline.get("gap")}

Policy snippets:
{snippets_text}
""".strip()


def with_fallback_note(baseline: dict, reason: str) -> dict:
    return {
        **baseline,
        "assessment_engine": "heuristic_fallback",
        "evidence_en": baseline.get("evidence", ""),
        "evidence_ar": "",
        "gap_en": baseline.get("gap", ""),
        "gap_ar": "",
        "rationale_en": f"GRCEXPERT fallback used: {reason}",
        "rationale_ar": f"تم استخدام التحليل السريع كبديل لأن GRCEXPERT لم يكتمل: {reason}",
        "model": MODEL_NAME,
    }


def ollama_get(path: str) -> dict:
    request = urllib.request.Request(f"{OLLAMA_BASE_URL}{path}", method="GET")
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError(str(exc)) from exc


def ollama_chat(prompt: str) -> str:
    payload = {
        "model": MODEL_NAME,
        "stream": False,
        "think": False,
        "messages": [
            {
                "role": "system",
                "content": "You are GRCEXPERT. Return strict JSON only, with bilingual Arabic and English fields.",
            },
            {"role": "user", "content": prompt},
        ],
        "options": {
            "temperature": 0,
            "num_predict": 900,
        },
    }
    request = urllib.request.Request(
        f"{OLLAMA_BASE_URL}/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Ollama chat failed: {exc}") from exc
    content = data.get("message", {}).get("content") or data.get("response")
    if not content:
        raise RuntimeError("Ollama returned an empty response")
    return content


def parse_json_object(value: str) -> dict:
    try:
        parsed = json.loads(value)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", value, flags=re.S)
    if not match:
        raise RuntimeError("Ollama response did not include a JSON object")
    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Ollama response JSON could not be parsed: {exc}") from exc
    if not isinstance(parsed, dict):
        raise RuntimeError("Ollama response JSON was not an object")
    return parsed


def normalize_status(value: object) -> str | None:
    status = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    if status in {"compliant", "partial", "not_compliant"}:
        return status
    if status in {"non_compliant", "not_met", "missing"}:
        return "not_compliant"
    return None


def clamp_float(value: object, fallback: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        number = float(fallback)
    return round(max(0.0, min(100.0, number)), 1)
