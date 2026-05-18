from __future__ import annotations

from bisect import bisect_right
from pathlib import Path
import datetime
import json
import re
import shutil
import sqlite3
import subprocess

import openpyxl


PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = PROJECT_ROOT / "data" / "frameworks" / "raw"
DB_PATH = PROJECT_ROOT / "data" / "frameworks" / "framework_library.db"


SOURCE_FILES = {
    "nca_ecc": {
        "framework_name": "NCA ECC",
        "version": "2:2024",
        "owner": "National Cybersecurity Authority",
        "raw_format": "pdf",
        "path": RAW_DIR / "nca_ecc-2-2024.pdf",
    },
    "sama_csf": {
        "framework_name": "SAMA CSF",
        "version": "1.0",
        "owner": "Saudi Central Bank",
        "raw_format": "pdf",
        "path": RAW_DIR / "sama_csf-1-0.pdf",
    },
    "nist_csf": {
        "framework_name": "NIST CSF",
        "version": "2.0",
        "owner": "NIST",
        "raw_format": "pdf",
        "path": RAW_DIR / "nist_csf-2-0.pdf",
    },
    "scf": {
        "framework_name": "Secure Controls Framework",
        "version": "2026.1",
        "owner": "Secure Controls Framework",
        "raw_format": "xlsx",
        "path": RAW_DIR / "scf-2026-1.xlsx",
    },
    "iso27001": {
        "framework_name": "ISO/IEC 27001",
        "version": "2022",
        "owner": "ISO/IEC",
        "raw_format": "pdf",
        "path": RAW_DIR / "iso27001-2022.pdf",
    },
    "iso27002": {
        "framework_name": "ISO/IEC 27002",
        "version": "2022",
        "owner": "ISO/IEC",
        "raw_format": "pdf",
        "path": RAW_DIR / "iso27002-2022.pdf",
    },
    "pdpl": {
        "framework_name": "Saudi PDPL",
        "version": "2023",
        "owner": "Saudi Data & AI Authority",
        "raw_format": "pdf",
        "path": RAW_DIR / "pdpl-2023.pdf",
    },
}


NCA_DOMAINS = {
    "1": "Cybersecurity Governance",
    "2": "Cybersecurity Defense",
    "3": "Cybersecurity Resilience",
    "4": "Third-Party and Cloud Computing Cybersecurity",
    "5": "Industrial Control Systems Cybersecurity",
}

SAMA_DOMAINS = {
    "3.1": "Cyber Security Leadership and Governance",
    "3.2": "Cyber Security Risk Management and Compliance",
    "3.3": "Cyber Security Operations and Technology",
    "3.4": "Third Party Cyber Security",
}

NIST_FUNCTIONS = {
    "GV": "Govern",
    "ID": "Identify",
    "PR": "Protect",
    "DE": "Detect",
    "RS": "Respond",
    "RC": "Recover",
}

ISO_DOMAINS = {
    "5": "Organizational controls",
    "6": "People controls",
    "7": "Physical controls",
    "8": "Technological controls",
}


def make_control(
    *,
    framework_key: str,
    framework_name: str,
    version: str,
    control_id: str,
    title: str = "",
    domain: str = "",
    category: str = "",
    control_text: str = "",
    source_file: str = "",
    page: int | None = None,
    extra_json: str = "",
) -> dict:
    return {
        "framework_key": framework_key,
        "framework_name": framework_name,
        "version": version,
        "control_id": control_id,
        "title": title,
        "domain": domain,
        "category": category,
        "control_text": control_text,
        "source_file": source_file,
        "page": page,
        "extra_json": extra_json,
    }


def make_mapping(
    *,
    source_framework: str,
    source_control_id: str,
    source_control_title: str,
    target_framework: str,
    target_control_id: str,
    scf_control_id: str,
    scf_control_title: str,
    relationship_type: str = "mapped",
    match_score: float | None = None,
    notes: str = "",
) -> dict:
    return {
        "source_framework": source_framework,
        "source_control_id": source_control_id,
        "source_control_title": source_control_title,
        "target_framework": target_framework,
        "target_control_id": target_control_id,
        "scf_control_id": scf_control_id,
        "scf_control_title": scf_control_title,
        "relationship_type": relationship_type,
        "match_score": match_score,
        "notes": notes,
    }


def init_sqlite(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        DROP TABLE IF EXISTS framework_mapping_reviews;

        CREATE TABLE IF NOT EXISTS framework_sources (
            id INTEGER PRIMARY KEY,
            framework_key VARCHAR,
            framework_name VARCHAR,
            version VARCHAR DEFAULT '',
            owner VARCHAR DEFAULT '',
            raw_format VARCHAR DEFAULT '',
            source_filename VARCHAR DEFAULT '',
            stored_path VARCHAR DEFAULT '',
            original_path VARCHAR DEFAULT '',
            imported_at DATETIME,
            control_count INTEGER DEFAULT 0,
            mapping_count INTEGER DEFAULT 0,
            notes TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS framework_controls (
            id INTEGER PRIMARY KEY,
            framework_key VARCHAR,
            framework_name VARCHAR,
            version VARCHAR DEFAULT '',
            control_id VARCHAR,
            title VARCHAR DEFAULT '',
            domain VARCHAR DEFAULT '',
            category VARCHAR DEFAULT '',
            control_text TEXT DEFAULT '',
            source_file VARCHAR DEFAULT '',
            page INTEGER,
            extra_json TEXT DEFAULT '',
            imported_at DATETIME
        );

        CREATE TABLE IF NOT EXISTS framework_mappings (
            id INTEGER PRIMARY KEY,
            source_framework VARCHAR,
            source_control_id VARCHAR,
            source_control_title VARCHAR DEFAULT '',
            target_framework VARCHAR,
            target_control_id VARCHAR,
            scf_control_id VARCHAR,
            scf_control_title VARCHAR DEFAULT '',
            relationship_type VARCHAR DEFAULT 'mapped',
            match_score FLOAT,
            notes TEXT DEFAULT '',
            imported_at DATETIME
        );

        CREATE INDEX IF NOT EXISTS ix_framework_controls_framework_key
            ON framework_controls(framework_key);
        CREATE INDEX IF NOT EXISTS ix_framework_controls_framework_name
            ON framework_controls(framework_name);
        CREATE INDEX IF NOT EXISTS ix_framework_controls_control_id
            ON framework_controls(control_id);
        CREATE INDEX IF NOT EXISTS ix_framework_controls_domain
            ON framework_controls(domain);
        CREATE INDEX IF NOT EXISTS ix_framework_mappings_source_framework
            ON framework_mappings(source_framework);
        CREATE INDEX IF NOT EXISTS ix_framework_mappings_source_control_id
            ON framework_mappings(source_control_id);
        CREATE INDEX IF NOT EXISTS ix_framework_mappings_target_framework
            ON framework_mappings(target_framework);
        CREATE INDEX IF NOT EXISTS ix_framework_mappings_target_control_id
            ON framework_mappings(target_control_id);
        CREATE INDEX IF NOT EXISTS ix_framework_mappings_scf_control_id
            ON framework_mappings(scf_control_id);
        CREATE INDEX IF NOT EXISTS ix_framework_sources_framework_key
            ON framework_sources(framework_key);
        CREATE INDEX IF NOT EXISTS ix_framework_sources_framework_name
            ON framework_sources(framework_name);
        """
    )


def clean_text(value: object) -> str:
    if value is None:
        return ""
    text = str(value)
    text = text.replace("\u00a0", " ").replace("\ufeff", " ").replace("", "-").replace("∙", "-")
    text = re.sub(r"\[\[PAGE\s+\d+\]\]", " ", text)
    text = re.sub(r"Table A\.1\s+\(continued\)", " ", text, flags=re.I)
    text = re.sub(r"SNV\s*/\s*licensed.*?ISO/IEC\s+2700[12]:2022", " ", text, flags=re.I)
    text = re.sub(r"ISO/IEC\s+2700[12]:2022\(E\)", " ", text, flags=re.I)
    text = re.sub(r"©\s*ISO/IEC\s+2022\s+[-–]?\s*All rights reserved", " ", text, flags=re.I)
    text = re.sub(r"([A-Za-z])-\s+([a-z])", r"\1\2", text)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"Version 1\.0\s+Page\s+\d+\s+of\s+56", " ", text)
    text = re.sub(r"Document classification:\s*Public", " ", text, flags=re.I)
    text = re.sub(r"TLP:\s*White", " ", text, flags=re.I)
    text = re.sub(r"Essential Cybersecurity Controls", " ", text, flags=re.I)
    text = re.sub(r"NIST CSWP 29\s+The NIST Cybersecurity Framework \(CSF\) 2\.0", " ", text)
    text = re.sub(r"February 26, 2024\s+\d+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def strip_title_continuation(body: str, title: str) -> str:
    body = body.strip()
    words = [word for word in re.split(r"\s+", title.strip()) if word]
    for count in range(min(6, len(words)), 0, -1):
        tail = " ".join(words[-count:])
        if body.lower().startswith(tail.lower()):
            return body[len(tail):].strip()
    return body


def normalize_header(value: object) -> str:
    return clean_text(value).lower()


def copy_sources() -> dict[str, Path]:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    stored: dict[str, Path] = {}
    for key, meta in SOURCE_FILES.items():
        src = meta["path"]
        if not src.exists():
            raise FileNotFoundError(f"Missing source file: {src}")
        suffix = src.suffix.lower()
        filename = f"{key}-{meta['version'].replace(':', '-').replace('.', '-')}{suffix}"
        dst = RAW_DIR / filename
        shutil.copy2(src, dst)
        stored[key] = dst
    return stored


def read_pdf_pages(path: Path) -> list[tuple[int, str]]:
    pdftotext = shutil.which("pdftotext")
    if not pdftotext:
        raise RuntimeError("pdftotext is required to import PDF framework sources")
    result = subprocess.run(
        [pdftotext, "-layout", str(path), "-"],
        capture_output=True,
        text=True,
        timeout=90,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Could not extract text from {path.name}: {result.stderr}")
    return [(idx, text) for idx, text in enumerate(result.stdout.split("\f"), start=1)]


def combine_pages(pages: list[tuple[int, str]]) -> tuple[str, list[tuple[int, int]]]:
    chunks: list[str] = []
    markers: list[tuple[int, int]] = []
    pos = 0
    for page_num, text in pages:
        marker = f"\n[[PAGE {page_num}]]\n"
        chunks.append(marker)
        pos += len(marker)
        markers.append((pos, page_num))
        chunks.append(text)
        pos += len(text)
    return "".join(chunks), markers


def page_for_position(markers: list[tuple[int, int]], pos: int) -> int | None:
    if not markers:
        return None
    starts = [m[0] for m in markers]
    idx = max(0, bisect_right(starts, pos) - 1)
    return markers[idx][1]


def split_cell_values(value: object) -> list[str]:
    text = clean_text(value)
    if not text:
        return []
    parts = re.split(r"[\n;,]+|\s{2,}", str(value))
    cleaned = []
    for part in parts:
        item = clean_text(part)
        if item and item.upper() not in {"N/A", "NA", "NOT APPLICABLE"}:
            cleaned.append(item)
    return list(dict.fromkeys(cleaned))


def extract_nca_controls(path: Path) -> list[dict]:
    pages = read_pdf_pages(path)
    text, markers = combine_pages(pages[14:38])

    heading_pattern = re.compile(
        r"(?<![\d-])(\d+-\d+)\s+([A-Z][A-Za-z0-9 /&(),'\-]+?)\s+Objective"
    )
    headings = []
    for match in heading_pattern.finditer(text):
        headings.append((match.start(), match.group(1), clean_text(match.group(2))))

    control_pattern = re.compile(r"(?<![\d-])(\d+-\d+-\d+)(?!-\d)(?![\d-])\s+")
    matches = list(control_pattern.finditer(text))
    controls: list[dict] = []

    for idx, match in enumerate(matches):
        control_id = match.group(1)
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        raw = text[start:end]
        raw = re.split(
            r"\s+\d+-\d+\s+[A-Z][A-Za-z0-9 /&(),'\-]+?\s+Objective\s+",
            raw,
            maxsplit=1,
        )[0]
        control_text = clean_text(raw)
        if len(control_text) < 20:
            continue

        parent_id = "-".join(control_id.split("-")[:2])
        title = ""
        for _, heading_id, heading_title in reversed(headings):
            if heading_id == parent_id and _ < match.start():
                title = heading_title
                break

        domain = NCA_DOMAINS.get(control_id.split("-")[0], "NCA ECC")
        controls.append(
            make_control(
                framework_key="nca_ecc",
                framework_name="NCA ECC",
                version="2:2024",
                control_id=control_id,
                title=title or parent_id,
                domain=domain,
                category=parent_id,
                control_text=control_text,
                source_file=path.name,
                page=page_for_position(markers, match.start()),
            )
        )
    return dedupe_controls(controls)


def extract_sama_controls(path: Path) -> list[dict]:
    pages = read_pdf_pages(path)
    text, markers = combine_pages(pages[12:40])
    pattern = re.compile(
        r"(?<![\d.])(3\.[1-4]\.\d{1,2})\s+([A-Z][A-Za-z0-9 ()/,&'\-]+?)\s+Principle"
    )
    matches = list(pattern.finditer(text))
    controls: list[dict] = []

    for idx, match in enumerate(matches):
        control_id = match.group(1)
        title = clean_text(match.group(2))
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        body = clean_text("Principle " + text[start:end])
        if len(body) < 30:
            continue
        domain_id = ".".join(control_id.split(".")[:2])
        controls.append(
            make_control(
                framework_key="sama_csf",
                framework_name="SAMA CSF",
                version="1.0",
                control_id=control_id,
                title=title,
                domain=SAMA_DOMAINS.get(domain_id, "SAMA CSF"),
                category=domain_id,
                control_text=body,
                source_file=path.name,
                page=page_for_position(markers, match.start()),
            )
        )
    return dedupe_controls(controls)


def extract_nist_controls(path: Path) -> list[dict]:
    pages = read_pdf_pages(path)
    text, markers = combine_pages(pages)

    categories = {}
    cat_pattern = re.compile(r"•\s+([^()\n]+?)\s+\(([A-Z]{2}\.[A-Z]{2})\):")
    for match in cat_pattern.finditer(text):
        categories[match.group(2)] = clean_text(match.group(1))

    pattern = re.compile(r"\b([A-Z]{2}\.[A-Z]{2}-\d{2}):\s+")
    matches = list(pattern.finditer(text))
    controls: list[dict] = []

    for idx, match in enumerate(matches):
        control_id = match.group(1)
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        body = clean_text(text[start:end])
        body = re.split(r"\s+•\s+[A-Z][^:]{2,}\([A-Z]{2}\.[A-Z]{2}\):", body, maxsplit=1)[0]
        if len(body) < 20:
            continue
        function_id = control_id.split(".")[0]
        category_id = control_id.rsplit("-", 1)[0]
        controls.append(
            make_control(
                framework_key="nist_csf",
                framework_name="NIST CSF",
                version="2.0",
                control_id=control_id,
                title=categories.get(category_id, category_id),
                domain=NIST_FUNCTIONS.get(function_id, function_id),
                category=category_id,
                control_text=body,
                source_file=path.name,
                page=page_for_position(markers, match.start()),
            )
        )
    return dedupe_controls(controls)


def text_between(value: str, start_label: str, end_label: str | None = None) -> str:
    start = re.search(rf"\b{re.escape(start_label)}\b", value, flags=re.I)
    if not start:
        return ""
    body_start = start.end()
    if end_label:
        end = re.search(rf"\b{re.escape(end_label)}\b", value[body_start:], flags=re.I)
        if end:
            return clean_text(value[body_start : body_start + end.start()])
    return clean_text(value[body_start:])


def extract_iso27002_controls(path: Path) -> list[dict]:
    pages = read_pdf_pages(path)
    text, markers = combine_pages(pages)
    start = text.find("\n5.1 Policies for information security")
    if start == -1:
        raise RuntimeError("Could not find ISO/IEC 27002 control section")
    annex = re.search(r"\n\s*Annex A\s*\n", text[start:])
    end = start + annex.start() if annex else text.find("Bibliography", start)
    body = text[start:end]

    heading_pattern = re.compile(r"(?m)^\s*([5-8]\.\d{1,2})\s+([A-Z][^\n]+?)\s*$")
    matches = list(heading_pattern.finditer(body))
    controls: list[dict] = []

    for idx, match in enumerate(matches):
        control_id = match.group(1)
        title = clean_text(match.group(2))
        section_start = match.end()
        section_end = matches[idx + 1].start() if idx + 1 < len(matches) else len(body)
        section = clean_text(body[section_start:section_end])
        control_statement = text_between(section, "Control", "Purpose")
        purpose = text_between(section, "Purpose", "Guidance")
        guidance = text_between(section, "Guidance", "Other information") or text_between(section, "Guidance")
        if not control_statement and len(section) > 30:
            control_statement = section
        control_text = clean_text(f"{control_statement} Purpose: {purpose}".strip())
        if len(control_text) < 20:
            continue
        domain_id = control_id.split(".")[0]
        controls.append(
            make_control(
                framework_key="iso27002",
                framework_name="ISO/IEC 27002",
                version="2022",
                control_id=control_id,
                title=title,
                domain=ISO_DOMAINS.get(domain_id, "ISO/IEC 27002"),
                category=domain_id,
                control_text=control_text,
                source_file=path.name,
                page=page_for_position(markers, start + match.start()),
                extra_json=json.dumps({"guidance_excerpt": clean_text(guidance)[:1200]}, ensure_ascii=False),
            )
        )
    return dedupe_controls(controls)


def extract_iso27001_controls(path: Path, reference_controls: list[dict]) -> list[dict]:
    pages = read_pdf_pages(path)
    text, markers = combine_pages(pages)
    start = text.find("Table A.1")
    if start == -1:
        raise RuntimeError("Could not find ISO/IEC 27001 Annex A table")
    end = text.find("Bibliography", start)
    annex_text = clean_text(text[start : end if end != -1 else len(text)])
    reference_by_id = {control["control_id"]: control for control in reference_controls}
    ordered_ids = [control["control_id"] for control in reference_controls]

    positions: list[tuple[int, str]] = []
    cursor = 0
    for control_id in ordered_ids:
        match = re.search(rf"(?<![\d.]){re.escape(control_id)}\s+", annex_text[cursor:])
        if not match:
            continue
        absolute = cursor + match.start()
        positions.append((absolute, control_id))
        cursor = absolute + len(control_id)

    controls: list[dict] = []
    raw_cursor = start
    for idx, (position, control_id) in enumerate(positions):
        section_end = positions[idx + 1][0] if idx + 1 < len(positions) else len(annex_text)
        section = clean_text(annex_text[position:section_end])
        reference = reference_by_id[control_id]
        title = reference["title"]
        body = re.sub(rf"^{re.escape(control_id)}\s+", "", section).strip()
        if " Control " in f" {body} ":
            body = body.split(" Control ", 1)[1]
        else:
            body = re.sub(rf"^{re.escape(title)}\s+", "", body, flags=re.I)
        body = strip_title_continuation(body, title)
        body = re.sub(r"^[a-z]{2,14}\s+(?=[A-Z])", "", body).strip()
        body = clean_text(body)
        if len(body) < 20:
            body = reference["control_text"]

        raw_position = text.find(control_id, raw_cursor)
        if raw_position != -1:
            raw_cursor = raw_position + len(control_id)

        domain_id = control_id.split(".")[0]
        controls.append(
            make_control(
                framework_key="iso27001",
                framework_name="ISO/IEC 27001",
                version="2022",
                control_id=control_id,
                title=title,
                domain=ISO_DOMAINS.get(domain_id, "ISO/IEC 27001 Annex A"),
                category=domain_id,
                control_text=body,
                source_file=path.name,
                page=page_for_position(markers, raw_position) if raw_position != -1 else None,
            )
        )
    return dedupe_controls(controls)


def pdpl_domain(article_number: int) -> str:
    if article_number == 1:
        return "Definitions"
    if article_number <= 3:
        return "Scope and General Provisions"
    if article_number == 4:
        return "Data Subject Rights"
    if article_number <= 7:
        return "Legal Basis and Consent"
    if article_number <= 13:
        return "Controller and Processor Obligations"
    if article_number <= 18:
        return "Data Quality, Disclosure, and Retention"
    if article_number <= 24:
        return "Special Processing Obligations"
    if article_number <= 30:
        return "Transfer, Notification, and Compliance"
    return "Enforcement and Penalties"


def extract_pdpl_articles(path: Path) -> list[dict]:
    pages = read_pdf_pages(path)
    text, markers = combine_pages(pages)
    pattern = re.compile(r"(?:^|\n)\s*Article\s+(\d+)\s*(?=\n)")
    matches = list(pattern.finditer(text))
    controls: list[dict] = []

    for idx, match in enumerate(matches):
        article_number = int(match.group(1))
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        article_text = clean_text(text[start:end])
        if len(article_text) < 20:
            continue
        control_id = f"Article {article_number}"
        controls.append(
            make_control(
                framework_key="pdpl",
                framework_name="Saudi PDPL",
                version="2023",
                control_id=control_id,
                title=control_id,
                domain=pdpl_domain(article_number),
                category=str(article_number),
                control_text=article_text,
                source_file=path.name,
                page=page_for_position(markers, match.start()),
            )
        )
    return dedupe_controls(controls)


def find_header(headers: list[str], *needles: str) -> int | None:
    for idx, header in enumerate(headers):
        if all(needle.lower() in header for needle in needles):
            return idx
    return None


def extract_scf(path: Path) -> tuple[list[dict], list[dict]]:
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sheet = workbook["SCF 2026.1"]
    rows = sheet.iter_rows(values_only=True)
    headers_raw = [cell for cell in next(rows)]
    headers = [normalize_header(cell) for cell in headers_raw]

    mapping_columns = [
        ("NIST CSF 2.0", find_header(headers, "nist", "csf", "2.0")),
        ("ISO 27001 2022", find_header(headers, "iso", "27001", "2022")),
        ("NCA ECC 2018", find_header(headers, "saudi arabia", "ecc")),
        ("SAMA CSF 1.0", find_header(headers, "sama csf")),
        ("CIS CSC 8.1", find_header(headers, "cis", "csc", "8.1")),
        ("PCI DSS 4.0.1", find_header(headers, "pci dss", "4.0.1")),
        ("SOC 2 / AICPA TSC", find_header(headers, "aicpa", "tsc")),
    ]

    controls: list[dict] = []
    mappings: list[dict] = []

    for row in rows:
        domain = clean_text(row[0] if len(row) > 0 else "")
        title = clean_text(row[1] if len(row) > 1 else "")
        scf_id = clean_text(row[2] if len(row) > 2 else "")
        description = clean_text(row[3] if len(row) > 3 else "")
        question = clean_text(row[11] if len(row) > 11 else "")
        if not scf_id or not description:
            continue

        controls.append(
            make_control(
                framework_key="scf",
                framework_name="Secure Controls Framework",
                version="2026.1",
                control_id=scf_id,
                title=title,
                domain=domain,
                category=scf_id.split("-")[0],
                control_text=description,
                source_file=path.name,
                page=None,
                extra_json=json.dumps({"question": question}, ensure_ascii=False),
            )
        )
        for target_framework, col_idx in mapping_columns:
            if col_idx is None or col_idx >= len(row):
                continue
            for target_control in split_cell_values(row[col_idx]):
                mappings.append(
                    make_mapping(
                        source_framework="SCF",
                        source_control_id=scf_id,
                        source_control_title=title,
                        target_framework=target_framework,
                        target_control_id=target_control,
                        scf_control_id=scf_id,
                        scf_control_title=title,
                        relationship_type="scf_crosswalk",
                        match_score=None,
                        notes="Imported from SCF 2026.1 authoritative source columns.",
                    )
                )
    return dedupe_controls(controls), dedupe_mappings(mappings)


def dedupe_controls(controls: list[dict]) -> list[dict]:
    seen = set()
    unique = []
    for control in controls:
        key = (control["framework_key"], control["control_id"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(control)
    return unique


def dedupe_mappings(mappings: list[dict]) -> list[dict]:
    seen = set()
    unique = []
    for mapping in mappings:
        key = (
            mapping["source_framework"],
            mapping["source_control_id"],
            mapping["target_framework"],
            mapping["target_control_id"],
        )
        if key in seen:
            continue
        seen.add(key)
        unique.append(mapping)
    return unique


def replace_library(
    stored_paths: dict[str, Path],
    controls_by_key: dict[str, list[dict]],
    scf_mappings: list[dict],
) -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    try:
        init_sqlite(conn)
        conn.execute("DELETE FROM framework_mappings")
        conn.execute("DELETE FROM framework_controls")
        conn.execute("DELETE FROM framework_sources")
        now = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d %H:%M:%S.%f")

        control_rows = []
        for controls in controls_by_key.values():
            for control in controls:
                control_rows.append(
                    (
                        control["framework_key"],
                        control["framework_name"],
                        control["version"],
                        control["control_id"],
                        control["title"],
                        control["domain"],
                        control["category"],
                        control["control_text"],
                        control["source_file"],
                        control["page"],
                        control["extra_json"],
                        now,
                    )
                )
        conn.executemany(
            """
            INSERT INTO framework_controls (
                framework_key, framework_name, version, control_id, title, domain,
                category, control_text, source_file, page, extra_json, imported_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            control_rows,
        )

        mapping_rows = [
            (
                mapping["source_framework"],
                mapping["source_control_id"],
                mapping["source_control_title"],
                mapping["target_framework"],
                mapping["target_control_id"],
                mapping["scf_control_id"],
                mapping["scf_control_title"],
                mapping["relationship_type"],
                mapping["match_score"],
                mapping["notes"],
                now,
            )
            for mapping in scf_mappings
        ]
        conn.executemany(
            """
            INSERT INTO framework_mappings (
                source_framework, source_control_id, source_control_title,
                target_framework, target_control_id, scf_control_id,
                scf_control_title, relationship_type, match_score, notes, imported_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            mapping_rows,
        )

        source_rows = []
        for key, meta in SOURCE_FILES.items():
            source_rows.append(
                (
                    key,
                    meta["framework_name"],
                    meta["version"],
                    meta["owner"],
                    meta["raw_format"],
                    meta["path"].name,
                    str(stored_paths[key].relative_to(PROJECT_ROOT)),
                    str(meta["path"]),
                    now,
                    len(controls_by_key.get(key, [])),
                    len(scf_mappings) if key == "scf" else 0,
                    "Imported into the isolated framework library database.",
                )
            )
        conn.executemany(
            """
            INSERT INTO framework_sources (
                framework_key, framework_name, version, owner, raw_format,
                source_filename, stored_path, original_path, imported_at,
                control_count, mapping_count, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            source_rows,
        )
        conn.commit()
    finally:
        conn.close()


def main() -> None:
    stored_paths = copy_sources()
    iso27002_controls = extract_iso27002_controls(stored_paths["iso27002"])
    controls_by_key = {
        "nca_ecc": extract_nca_controls(stored_paths["nca_ecc"]),
        "sama_csf": extract_sama_controls(stored_paths["sama_csf"]),
        "nist_csf": extract_nist_controls(stored_paths["nist_csf"]),
        "iso27001": extract_iso27001_controls(stored_paths["iso27001"], iso27002_controls),
        "iso27002": iso27002_controls,
        "pdpl": extract_pdpl_articles(stored_paths["pdpl"]),
    }
    scf_controls, scf_mappings = extract_scf(stored_paths["scf"])
    controls_by_key["scf"] = scf_controls
    replace_library(stored_paths, controls_by_key, scf_mappings)

    print("Framework library import complete.")
    for key, controls in controls_by_key.items():
        print(f"- {SOURCE_FILES[key]['framework_name']}: {len(controls)} controls")
    print(f"- SCF mappings: {len(scf_mappings)} mappings")


if __name__ == "__main__":
    main()
