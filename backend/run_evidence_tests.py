"""
Strict multi-evidence testing for Noryx AI validation model.
Tests: correct evidence (x2), wrong-category evidence, irrelevant evidence.
"""
import requests
import json
import os

API = "http://localhost:8000"
IMG_DIR = "uploads/test_images"

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

# ── Test cases ────────────────────────────────────────────────────────────────
# (control_id, dept_id, employee, image_file, expected_status, description)
TEST_CASES = [
    # ── ACC-001: Access Control (dept 1 = IT Security) ──────────────────────
    (1, 1, "Test User", "acc_correct_1.png",      "pass",        "ACC-001 | Correct evidence #1: Active Directory / MFA"),
    (1, 1, "Test User", "acc_correct_2.png",      "pass",        "ACC-001 | Correct evidence #2: IAM Console / RBAC"),
    (1, 1, "Test User", "acc_wrong_category.png", "fail",        "ACC-001 | Wrong category: Firewall screenshot (should FAIL)"),
    (1, 1, "Test User", "irrelevant.png",         "fail",        "ACC-001 | Irrelevant: Sales report (should FAIL)"),

    # ── LOG-001: Logging & Monitoring (dept 1 = IT Security) ────────────────
    (15, 1, "Test User", "log_correct_1.png",  "pass",           "LOG-001 | Correct evidence #1: Event Viewer / Security Log"),
    (15, 1, "Test User", "log_correct_2.png",  "pass",           "LOG-001 | Correct evidence #2: SIEM Dashboard"),
    (15, 1, "Test User", "irrelevant.png",     "fail",           "LOG-001 | Irrelevant: Sales report (should FAIL)"),

    # ── VUL-001: Vulnerability Management (dept 1 = IT Security) ────────────
    (6, 1, "Test User", "vul_correct_1.png",   "pass",           "VUL-001 | Correct evidence #1: Nessus scan results"),
    (6, 1, "Test User", "vul_correct_2.png",   "pass",           "VUL-001 | Correct evidence #2: Qualys dashboard"),
    (6, 1, "Test User", "irrelevant.png",      "fail",           "VUL-001 | Irrelevant: Sales report (should FAIL)"),
]

def status_icon(status, expected):
    s = (status or "").lower()
    e = (expected or "").lower()
    if s == e:
        return f"{GREEN}PASS{RESET}"
    if s in ("need_review",) and e in ("pass", "need_review"):
        return f"{YELLOW}WARN{RESET}"
    return f"{RED}FAIL{RESET}"

def run_tests():
    print(f"\n{BOLD}{CYAN}{'='*70}")
    print("  Noryx AI Evidence Validation — Strict Multi-Evidence Test Suite")
    print(f"{'='*70}{RESET}\n")

    results = []
    for ctrl_id, dept_id, emp, img_file, expected, desc in TEST_CASES:
        img_path = os.path.join(IMG_DIR, img_file)
        if not os.path.exists(img_path):
            print(f"  {RED}MISSING{RESET}  {desc}")
            results.append(("missing", expected, desc))
            continue

        with open(img_path, "rb") as f:
            resp = requests.post(
                f"{API}/evidence/upload/",
                data={
                    "control_id":    ctrl_id,
                    "department_id": dept_id,
                    "employee_name": emp,
                },
                files={"file": (img_file, f, "image/png")},
                timeout=60,
            )

        if resp.status_code != 200:
            print(f"  {RED}HTTP {resp.status_code}{RESET}  {desc}")
            results.append(("http_error", expected, desc))
            continue

        data       = resp.json()
        status     = data.get("status", "?")
        confidence = data.get("confidence", "?")
        icon       = status_icon(status, expected)
        label      = f"{CYAN}{status:<12}{RESET}" if status != expected else f"{GREEN}{status:<12}{RESET}"
        if status.lower() not in ("pass", "fail", "need_review") or (status.lower() != expected and not (status.lower() == "need_review" and expected == "pass")):
            label = f"{RED}{status:<12}{RESET}"

        print(f"  [{icon}]  {label}  conf={confidence:<8}  {desc}")
        results.append((status, expected, desc))

    # ── Summary ───────────────────────────────────────────────────────────────
    total   = len(results)
    correct = sum(1 for s, e, _ in results if s.lower() == e.lower() or (s.lower() == "need_review" and e == "pass"))
    wrong   = total - correct

    print(f"\n{BOLD}{'='*70}")
    print(f"  Results: {GREEN}{correct}/{total} correct{RESET}  |  {RED}{wrong} unexpected{RESET}")
    print(f"{'='*70}{RESET}\n")

    if wrong > 0:
        print(f"{YELLOW}Unexpected results (model may need re-training or keyword tuning):{RESET}")
        for s, e, d in results:
            if s.lower() != e.lower() and not (s.lower() == "need_review" and e == "pass"):
                print(f"  Got '{s}' expected '{e}' — {d}")
        print()

if __name__ == "__main__":
    run_tests()
