from PIL import Image, ImageDraw, ImageFont
import os

OUT = "uploads/test_images"
os.makedirs(OUT, exist_ok=True)

def make_image(filename, lines, bg=(15, 20, 35), fg=(220, 230, 245), header_fg=(100, 200, 255)):
    W, H = 900, 620
    img = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, W, 50], fill=(25, 35, 60))
    try:
        font_header = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 16)
        font_body   = ImageFont.truetype("C:/Windows/Fonts/consola.ttf",  14)
    except Exception:
        font_header = ImageFont.load_default()
        font_body   = ImageFont.load_default()
    draw.text((20, 16), lines[0], font=font_header, fill=header_fg)
    y = 70
    for line in lines[1:]:
        color = (120, 220, 120) if line.startswith("[OK]") else \
                (220, 80, 80)   if line.startswith("[FAIL]") else \
                (200, 180, 60)  if line.startswith("  Warning") else fg
        draw.text((20, y), line, font=font_body, fill=color)
        y += 22
    path = os.path.join(OUT, filename)
    img.save(path)
    print(f"Created: {path}")

# ── ACC-001 (Access Control) ─────────────────────────────────────────────────

make_image("acc_correct_1.png", [
    "Active Directory Users and Computers",
    "Domain: CORP.LOCAL  |  DC: DC01.corp.local",
    "",
    "User Account Management",
    "[OK] MFA enforced: all privileged accounts",
    "[OK] Password policy: min 12 chars, complexity enabled",
    "[OK] Inactive accounts disabled after 30 days",
    "[OK] Role-based access control (RBAC) applied",
    "[OK] Privileged Access Management (PAM) active",
    "",
    "User: jsmith@corp.local  |  Last login: 2026-05-10",
    "Authentication: Multi-Factor Authentication enabled",
    "Account status: ACTIVE  |  Permissions: Standard User",
    "",
    "Group Policy: Password complexity requirement ENABLED",
    "Account lockout: 5 failed attempts -> 30 min lockout",
])

make_image("acc_correct_2.png", [
    "Identity & Access Management Console",
    "Organisation: Noryx Corp  |  Policy Version: 3.2",
    "",
    "Access Review Results - Q1 2026",
    "[OK] Least privilege principle applied to all accounts",
    "[OK] Service accounts: 12 reviewed, 0 excess permissions",
    "[OK] Admin accounts: require MFA + PAM checkout",
    "[OK] SSO integration: Active Directory federated",
    "[OK] Quarterly access certification completed",
    "",
    "RBAC Matrix validated: Finance (8), IT (24), HR (5) users",
    "Identity governance: Joiner-Mover-Leaver process active",
    "Authorization: OAuth 2.0 + LDAP  |  Credential vault: OK",
    "",
    "[OK] Last review: 2026-04-28  |  Next due: 2026-07-28",
])

make_image("acc_wrong_category.png", [
    "Firewall Management Console - Palo Alto PA-3000",
    "Device: FW-PERIMETER-01  |  Zone: DMZ -> TRUST",
    "",
    "Firewall Rule Base",
    "[OK] Rule 1: BLOCK inbound 0.0.0.0/0 -> DMZ port 23 (Telnet)",
    "[OK] Rule 2: ALLOW outbound TRUST -> Internet port 443 (HTTPS)",
    "[OK] Rule 3: BLOCK inbound all -> server-zone port 3389 (RDP)",
    "  Warning: Rule 15 - overly permissive (review required)",
    "",
    "Network segmentation: VLAN 10 (servers) isolated",
    "IPS signatures updated: 2026-05-11",
    "Traffic policy: deny-by-default baseline enforced",
    "",
    "Last config backup: 2026-05-10  |  Uptime: 99.97%",
])

# ── LOG-001 (Logging & Monitoring) ───────────────────────────────────────────

make_image("log_correct_1.png", [
    "Windows Event Viewer - Security Log",
    "Computer: SERVER01  |  Log: Security  |  Events: 15,842",
    "",
    "Audit Log - Authentication Events",
    "[OK] Event 4624: Successful logon - user: admin@corp.local",
    "[OK] Event 4625: Failed logon attempt - flagged and alerted",
    "[OK] Event 4720: User account created - change control logged",
    "[OK] Event 4648: Logon with explicit credentials - monitored",
    "",
    "SIEM Integration: Splunk Enterprise 9.1",
    "Log retention: 365 days  |  Archival: Cold storage 7 years",
    "Audit logging enabled: Success and Failure events",
    "",
    "[OK] Log integrity: hash-verified, tamper-evident",
    "Last review: 2026-05-11  |  Alerts triggered today: 3",
])

make_image("log_correct_2.png", [
    "SIEM Dashboard - Splunk Enterprise",
    "Index: main  |  Sourcetype: WinEventLog:Security",
    "",
    "Real-time Monitoring Summary",
    "[OK] Log ingestion rate: 2,340 events per second",
    "[OK] Correlation rules active: 187 of 187",
    "[OK] Alert queue: 4 pending (Low severity)",
    "[OK] Audit trail: complete, no gaps detected",
    "",
    "Event log monitoring coverage: 100% of critical assets",
    "Log management policy: enforced across all endpoints",
    "Centralized logging: syslog forwarded to SIEM",
    "",
    "Threat detection: IOC matching enabled",
    "[OK] Last log backup: 2026-05-11 06:00 UTC",
])

# ── VUL-001 (Vulnerability Management) ──────────────────────────────────────

make_image("vul_correct_1.png", [
    "Tenable Nessus Professional - Scan Results",
    "Scan: Weekly Internal Scan  |  Date: 2026-05-10",
    "",
    "Vulnerability Summary",
    "[FAIL] Critical CVEs: 2  (CVE-2024-1234, CVE-2025-5678)",
    "  Warning: High CVEs: 7  (patch within 30 days)",
    "[OK] Medium CVEs: 14  (scheduled remediation)",
    "[OK] Low CVEs: 38  (accepted risk / compensating control)",
    "",
    "Remediation tracking: all critical items owner-assigned",
    "CVSS scoring: enabled  |  Scan coverage: 98.3%",
    "Penetration test: last conducted 2025-12-01",
    "",
    "CVE-2024-1234: Apache Log4j - patch available",
    "Rapid7 integration: active  |  CVSS base score: 9.8",
])

make_image("vul_correct_2.png", [
    "Qualys Vulnerability Management - Dashboard",
    "Asset group: All Corporate Assets  |  Scanned: 412/412",
    "",
    "Vulnerability Remediation Status",
    "[OK] P1 Critical: 0 open  (SLA: 24 hours - MET)",
    "[OK] P2 High: 3 open  (SLA: 7 days - ON TRACK)",
    "  Warning: P3 Medium: 21 open  (SLA: 30 days)",
    "[OK] P4 Low: 85 open  (accepted / risk register)",
    "",
    "Patch management integration: WSUS + SCCM active",
    "CVE database last updated: 2026-05-11",
    "Scan frequency: daily for critical, weekly for all",
    "",
    "[OK] Vulnerability scan report signed off: CISO",
    "Next penetration test scheduled: 2026-06-15",
])

# ── Irrelevant image (should be rejected for any control) ───────────────────

make_image("irrelevant.png", [
    "Monthly Sales Report - Q1 2026",
    "Region: EMEA  |  Prepared by: Finance Team",
    "",
    "Revenue Summary",
    "Total revenue: USD 4,230,000",
    "Target: USD 4,000,000  |  Variance: +5.75%",
    "Top product: Enterprise License (42% of revenue)",
    "",
    "Customer acquisition: 87 new accounts",
    "Churn rate: 2.1%  |  NPS score: 68",
    "",
    "Next quarter forecast: USD 4,500,000",
    "Budget approved: Board meeting 2026-04-15",
])

print("\nDone. All test images ready in:", OUT)
