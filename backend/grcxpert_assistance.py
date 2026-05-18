from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


MODEL_NAME = "gemma4:eb4"
OLLAMA_BASE_URL = "http://127.0.0.1:11434"
REQUEST_TIMEOUT_SECONDS = 85

SYSTEM_PROMPT = """You are GRCXPERT Assistance running on gemma4:eb4.

You provide educational guidance related to:

- GRC
- General cybersecurity concepts
- Information security
- NCA ECC
- ISO 27001
- SAMA CSF
- PDPL
- Compliance
- Governance
- Controls
- Policies
- Risk concepts
- Evidence examples
- Audit preparation
- Remediation
- How to comply with requirements

You MAY explain:

GRC concepts

Cybersecurity concepts

Information security concepts

How to comply

How to implement controls

Policies

Evidence examples

Remediation

Compliance practices

You MUST NOT access:

Platform files

User assessments

Evidence

Reports

Dashboard data

Private company information

Assessment results


If asked:

English:

I do not have access to private platform data.


Arabic:

لا أملك صلاحية الوصول إلى بيانات المنصة الخاصة.


Keep responses:

Clear

Practical

Compliance-oriented

Professional"""

PRIVATE_DATA_RESPONSE = {
    "en": (
        "I do not have access to platform files or private assessment information. "
        "I only provide framework guidance and compliance education."
    ),
    "ar": (
        "لا أملك صلاحية الوصول إلى ملفات المنصة أو بيانات التقييم الخاصة. "
        "يمكنني فقط شرح الأطر ومفاهيم الامتثال."
    ),
}

OUT_OF_SCOPE_RESPONSE = {
    "en": (
        "I can help with GRC, cybersecurity, information security, NCA ECC, ISO 27001, "
        "SAMA CSF, PDPL, compliance, governance, policies, policy violations, gaps, risk, "
        "controls, evidence examples, audit preparation, remediation, and how to implement "
        "cybersecurity requirements."
    ),
    "ar": (
        "يمكنني مساعدتك في GRC والأمن السيبراني وأمن المعلومات وNCA ECC وISO 27001 "
        "وSAMA CSF وPDPL والامتثال والحوكمة والسياسات والمخالفات والفجوات والمخاطر "
        "والضوابط والأدلة والاستعداد للتدقيق ومعالجة النواقص وكيفية تطبيق المتطلبات."
    ),
}

VIOLATION_AVOIDANCE_RESPONSE = {
    "en": (
        "Companies can avoid compliance and policy violations by building a repeatable governance process, "
        "not only by writing policies.\n\n"
        "1. Define clear policies and map them to frameworks such as NCA ECC, ISO 27001, PDPL, or internal requirements.\n\n"
        "2. Assign owners for each control, policy, and remediation action so accountability is clear.\n\n"
        "3. Train employees regularly and require policy acknowledgment.\n\n"
        "4. Monitor key activities such as access changes, privileged accounts, data handling, backups, logging, and vendor access.\n\n"
        "5. Perform periodic gap assessments and internal audits to detect missing controls before an external audit.\n\n"
        "6. Keep evidence current, including approvals, screenshots, logs, reports, risk registers, and training records.\n\n"
        "7. Track exceptions with approval, expiry dates, compensating controls, and owner review.\n\n"
        "8. Remediate findings quickly, retest the control, and document closure.\n\n"
        "A strong approach is: policy -> control owner -> implementation -> evidence -> review -> remediation -> reassessment."
    ),
    "ar": (
        "يمكن للشركات تجنب مخالفات الامتثال والسياسات من خلال بناء عملية حوكمة مستمرة، وليس فقط كتابة السياسات.\n\n"
        "1- تحديد سياسات واضحة وربطها بأطر مثل NCA ECC وISO 27001 وPDPL أو المتطلبات الداخلية.\n\n"
        "2- تعيين مالك لكل ضابط وسياسة وخطة معالجة حتى تكون المسؤولية واضحة.\n\n"
        "3- تدريب الموظفين بشكل دوري وتوثيق إقرارهم بفهم السياسات.\n\n"
        "4- مراقبة الأنشطة المهمة مثل تغييرات الصلاحيات، الحسابات عالية الامتياز، التعامل مع البيانات، النسخ الاحتياطي، السجلات، ووصول الموردين.\n\n"
        "5- تنفيذ تقييم فجوات وتدقيق داخلي بشكل دوري لاكتشاف النواقص قبل التدقيق الخارجي.\n\n"
        "6- تحديث الأدلة باستمرار مثل الموافقات، لقطات الشاشة، السجلات، التقارير، سجل المخاطر، وسجلات التدريب.\n\n"
        "7- إدارة الاستثناءات بموافقة رسمية، تاريخ انتهاء، ضوابط تعويضية، ومراجعة من المالك.\n\n"
        "8- معالجة الملاحظات بسرعة ثم اختبار الضابط وتوثيق الإغلاق.\n\n"
        "المنهج الأفضل هو: سياسة -> مالك ضابط -> تطبيق -> دليل -> مراجعة -> معالجة -> إعادة تقييم."
    ),
}

ALLOWED_PATTERNS = [
    r"\bgrc\b",
    r"\bgovernance risk compliance\b",
    r"\binformation security\b",
    r"\binformation secuirty\b",
    r"\binfosec\b",
    r"\bisms\b",
    r"\bcia triad\b",
    r"\bnca\b",
    r"\becc\b",
    r"\biso\b",
    r"\bsama\b",
    r"\bcsf\b",
    r"\b27001\b",
    r"\bpdpl\b",
    r"\bcompliance\b",
    r"\bcompliant\b",
    r"\bgovernance\b",
    r"\bpolicy\b",
    r"\bpolicies\b",
    r"\bviolation\b",
    r"\bviolations\b",
    r"\bgap\b",
    r"\bgaps\b",
    r"\bfinding\b",
    r"\bfindings\b",
    r"\bnonconformity\b",
    r"\bnon-conformity\b",
    r"\bnonconformities\b",
    r"\bnon-conformities\b",
    r"\bdeficiency\b",
    r"\bdeficiencies\b",
    r"\bexception\b",
    r"\bexceptions\b",
    r"\brisk\b",
    r"\bthreat\b",
    r"\bthreats\b",
    r"\battack\b",
    r"\battacks\b",
    r"\bmalware\b",
    r"\bphishing\b",
    r"\bransomware\b",
    r"\bcontrol\b",
    r"\bcontrols\b",
    r"\bevidence\b",
    r"\baudit\b",
    r"\bremediation\b",
    r"\bremediate\b",
    r"\bcybersecurity\b",
    r"\bcyber security\b",
    r"\bcyberseciety\b",
    r"\bcybersecuirty\b",
    r"\bsecurity\b",
    r"\bsecuirty\b",
    r"\bframework\b",
    r"\brequirement\b",
    r"\bimplement\b",
    r"\baccess\b",
    r"\bidentity\b",
    r"\biam\b",
    r"\bauthentication\b",
    r"\bauthorization\b",
    r"\bmfa\b",
    r"\bpassword\b",
    r"\bfirewall\b",
    r"\bnetwork security\b",
    r"\bendpoint\b",
    r"\bcloud security\b",
    r"\bdata protection\b",
    r"\bprivacy\b",
    r"\bsoc\b",
    r"\bsiem\b",
    r"\bawareness\b",
    r"\bincident\b",
    r"\bencryption\b",
    r"\bvulnerability\b",
    r"\bbackup\b",
    r"\btraining\b",
    r"امتثال",
    r"حوكمة المخاطر والامتثال",
    r"أمن المعلومات",
    r"امن المعلومات",
    r"سرية",
    r"سلامة",
    r"توافر",
    r"متوافق",
    r"السيبراني",
    r"الأمن",
    r"امن",
    r"ضابط",
    r"ضوابط",
    r"سياس",
    r"مخالف",
    r"فجوة",
    r"فجوات",
    r"ثغرة",
    r"ثغرات",
    r"نقص",
    r"نواقص",
    r"ملاحظة",
    r"ملاحظات",
    r"مخاطر",
    r"المخاطر",
    r"تهديد",
    r"تهديدات",
    r"هجوم",
    r"هجمات",
    r"اختراق",
    r"تصيد",
    r"برمجيات خبيثة",
    r"فدية",
    r"حوكمة",
    r"الحوكمة",
    r"أدلة",
    r"دليل",
    r"تدقيق",
    r"معالجة",
    r"تطبيق",
    r"متطلبات",
    r"حماية البيانات",
    r"خصوصية",
    r"صلاحيات",
    r"مصادقة",
    r"هوية",
    r"كلمة المرور",
    r"جدار حماية",
    r"ايزو",
    r"آيزو",
]

PRIVATE_DATA_PATTERNS = [
    r"\bmy uploaded\b",
    r"\bour uploaded\b",
    r"\buploaded evidence\b",
    r"\bplatform files?\b",
    r"\bplatform data\b",
    r"\bprivate assessment\b",
    r"\bassessment result",
    r"\bcompliance score\b",
    r"\bdashboard data\b",
    r"\buser files?\b",
    r"\bemployee tasks?\b",
    r"\bprivate company data\b",
    r"\bcompany files?\b",
    r"\bdatabase\b",
    r"\bshow me my\b",
    r"\bread my\b",
    r"\bopen my\b",
    r"\bملفات المنصة\b",
    r"\bبيانات المنصة\b",
    r"\bتقييمي\b",
    r"\bنتائج التقييم\b",
    r"\bدرجة الامتثال\b",
    r"\bلوحة المعلومات\b",
    r"\bمهام الموظفين\b",
    r"\bقاعدة البيانات\b",
    r"\bملفاتي\b",
    r"\bالأدلة المرفوعة\b",
]

VIOLATION_AVOIDANCE_PATTERNS = [
    r"\bavoid\b[\s\S]*\bviolations?\b",
    r"\bprevent\b[\s\S]*\bviolations?\b",
    r"\breduce\b[\s\S]*\bviolations?\b",
    r"\bviolations?\b[\s\S]*\bavoid\b",
    r"\bviolations?\b[\s\S]*\bprevent\b",
    r"\bviolations?\b[\s\S]*\breduce\b",
    r"تجنب[\s\S]*مخالف",
    r"تفادي[\s\S]*مخالف",
    r"منع[\s\S]*مخالف",
    r"تقليل[\s\S]*مخالف",
    r"مخالف[\s\S]*تجنب",
    r"مخالف[\s\S]*تفادي",
    r"مخالف[\s\S]*منع",
]

router = APIRouter(prefix="/grcxpert-assistance", tags=["GRCXPERT Assistance"])


class AssistanceRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1600)
    language: Literal["en", "ar"] = "en"


class AssistanceResponse(BaseModel):
    answer: str
    model: str
    source: Literal["ollama", "guardrail"]


@router.post("/chat", response_model=AssistanceResponse)
def chat_with_grcxpert_assistance(payload: AssistanceRequest) -> AssistanceResponse:
    message = payload.message.strip()
    language = payload.language if payload.language in {"en", "ar"} else _infer_language(message)

    if _is_private_data_request(message):
        return AssistanceResponse(
            answer=PRIVATE_DATA_RESPONSE[language],
            model=MODEL_NAME,
            source="guardrail",
        )

    if not _is_allowed_topic(message):
        return AssistanceResponse(
            answer=OUT_OF_SCOPE_RESPONSE[language],
            model=MODEL_NAME,
            source="guardrail",
        )

    predefined_answer = _get_predefined_custom_answer(message, language)
    if predefined_answer:
        return AssistanceResponse(answer=predefined_answer, model=MODEL_NAME, source="guardrail")

    try:
        answer = _ollama_chat(message, language)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return AssistanceResponse(answer=answer, model=MODEL_NAME, source="ollama")


def _ollama_chat(message: str, language: str) -> str:
    language_label = "Arabic" if language == "ar" else "English"
    topic_guidance = _topic_guidance(message)
    payload = {
        "model": MODEL_NAME,
        "stream": False,
        "think": False,
        "keep_alive": "10m",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Answer in {language_label}. "
                    "Keep the response medium length, usually 90 to 140 words. "
                    "Use short sections or numbered steps only when helpful. "
                    "Include a little practical detail and stay compliance-oriented. "
                    f"{topic_guidance}"
                    "Finish with a complete final sentence. "
                    "Do not ask for or reference platform data. "
                    "Question:\n"
                    f"{message}"
                ),
            },
        ],
        "options": {
            "temperature": 0.2,
            "num_predict": 320,
        },
    }
    request = urllib.request.Request(
        f"{OLLAMA_BASE_URL}/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"GRCXPERT Assistance could not reach local Ollama: {exc}") from exc

    answer = (data.get("message", {}) or {}).get("content") or data.get("response")
    if not answer:
        raise RuntimeError("GRCXPERT Assistance received an empty response from Ollama.")
    return str(answer).strip()


def _is_allowed_topic(message: str) -> bool:
    normalized = message.lower()
    return any(re.search(pattern, normalized, flags=re.IGNORECASE) for pattern in ALLOWED_PATTERNS)


def _is_private_data_request(message: str) -> bool:
    normalized = message.lower()
    return any(re.search(pattern, normalized, flags=re.IGNORECASE) for pattern in PRIVATE_DATA_PATTERNS)


def _get_predefined_custom_answer(message: str, language: str) -> str:
    normalized = message.lower()
    if any(re.search(pattern, normalized, flags=re.IGNORECASE) for pattern in VIOLATION_AVOIDANCE_PATTERNS):
        return VIOLATION_AVOIDANCE_RESPONSE[language]
    return ""


def _topic_guidance(message: str) -> str:
    normalized = message.lower()
    guidance = []
    if re.search(r"\b(nca|ecc)\b", normalized, flags=re.IGNORECASE):
        guidance.append(
            "When discussing NCA ECC, describe it as Saudi Arabia's National Cybersecurity Authority Essential Cybersecurity Controls."
        )
    if re.search(r"\bsama\b|\bcsf\b", normalized, flags=re.IGNORECASE):
        guidance.append(
            "When discussing SAMA CSF, describe it as the Saudi Central Bank Cyber Security Framework for financial-sector cybersecurity governance and controls."
        )
    if guidance:
        return " ".join(guidance) + " "
    return ""


def _infer_language(message: str) -> Literal["en", "ar"]:
    return "ar" if re.search(r"[\u0600-\u06ff]", message) else "en"
