import sys
sys.path.insert(0, '.')
from database import SessionLocal
from models import Control
import ai_engine

db = SessionLocal()
controls = db.query(Control).order_by(Control.id).all()

CATEGORY_SCREENSHOTS = {
    'firewall':         'Firewall rule base, Palo Alto / Cisco / pfSense console',
    'antivirus':        'Antivirus/EDR dashboard (Defender, CrowdStrike, Symantec)',
    'access':           'Active Directory, Azure AD, MFA settings, PAM console',
    'logging':          'Event Viewer, Splunk/SIEM dashboard, audit log export',
    'patch':            'Windows Update, WSUS, SCCM patch compliance report',
    'encryption':       'BitLocker status, encryption certificate, TLS config',
    'backup':           'Backup job report, RTO/RPO document, DR test results',
    'network':          'Network diagram, VLAN config, VPN status, segmentation',
    'incident_response':'Incident ticket, IR playbook, tabletop exercise record',
    'vulnerability':    'Nessus/Qualys/Tenable scan results, CVE remediation list',
    'training':         'KnowBe4/Proofpoint report, phishing simulation results',
    'third_party':      'Vendor risk register, DPA/contract, due diligence record',
}

print(f"\n{'Control':<10} {'Dept Category':<28} {'Expected Evidence Type':<22} {'Accepts Any Screenshot'}")
print('=' * 100)
for c in controls:
    full_context = f"{c.criteria or ''} {c.description or ''}".strip()
    detected = ai_engine._detect_expected_category(full_context)
    if detected:
        screenshot_hint = CATEGORY_SCREENSHOTS.get(detected, detected)
        accepts_any = 'No  — wrong type will FAIL'
    else:
        screenshot_hint = 'Any relevant security screenshot'
        accepts_any = 'Yes — keyword fallback'
    print(f"{c.name:<10} {(c.category or ''):<28} {(detected or 'any'):<22} {accepts_any}")

print(f"\n\nSupported evidence categories and what screenshot to use:")
print('=' * 80)
for cat, hint in CATEGORY_SCREENSHOTS.items():
    print(f"  {cat:<20}  {hint}")

db.close()
