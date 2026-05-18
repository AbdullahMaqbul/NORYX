"""
seed_data.py — Run once to:
  1. Create standard NCA departments
  2. Create 3 employees (Manager / Analyst / Engineer) per department
  3. Auto-classify every existing Control to the right department
     based on keyword matching on name + description + criteria
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, engine
import models

models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ── 1. Department definitions ─────────────────────────────────────────────────

DEPARTMENTS = [
    {
        "name": "Network Security",
        "description": "Manages firewalls, DMZ, VPN, network segmentation and traffic controls",
        "keywords": ["firewall","network","dmz","vpn","router","switch","port","traffic","segment","inbound","outbound","packet","proxy","waf","ids","ips","intrusion","perimeter","subnet","vlan","nat","dns","dhcp","bandwidth"],
        "employees": [
            {"name": "Khalid Al-Rashid",  "role": "Security Manager"},
            {"name": "Noura Al-Zahrani",  "role": "Network Analyst"},
            {"name": "Omar Al-Ghamdi",    "role": "Network Engineer"},
        ],
    },
    {
        "name": "Identity & Access",
        "description": "Handles authentication, MFA, privilege access management and user accounts",
        "keywords": ["mfa","password","authentication","access","privilege","account","identity","iam","user","login","credential","role","permission","active directory","ldap","sso","oauth","pam","least privilege","admin","group policy"],
        "employees": [
            {"name": "Fatima Al-Otaibi",  "role": "IAM Manager"},
            {"name": "Abdullah Al-Harbi", "role": "Access Analyst"},
            {"name": "Sara Al-Dosari",    "role": "Identity Engineer"},
        ],
    },
    {
        "name": "Endpoint Protection",
        "description": "Manages antivirus, malware protection, device patching and EDR",
        "keywords": ["antivirus","malware","endpoint","device","patch","update","edr","definition","scan","quarantine","heuristic","real-time","protection","windows update","hotfix","vulnerability","cve","remediat","agent","client"],
        "employees": [
            {"name": "Majed Al-Shehri",   "role": "Endpoint Manager"},
            {"name": "Reem Al-Mutairi",   "role": "Security Analyst"},
            {"name": "Turki Al-Aqeel",    "role": "Systems Engineer"},
        ],
    },
    {
        "name": "Data Security",
        "description": "Responsible for encryption, data classification, DLP and backup",
        "keywords": ["encrypt","data","backup","database","classif","dlp","bitlocker","tls","ssl","storage","transit","rest","key","certificate","sensitive","confidential","retention","archive","restore","offsite","recovery","rpo","rto"],
        "employees": [
            {"name": "Hessa Al-Saud",     "role": "Data Protection Manager"},
            {"name": "Faisal Al-Malki",   "role": "Data Security Analyst"},
            {"name": "Lamia Al-Qahtani",  "role": "Database Engineer"},
        ],
    },
    {
        "name": "Incident Response",
        "description": "Handles security incident detection, response, forensics and SIEM",
        "keywords": ["incident","response","alert","log","siem","monitor","detect","forensic","investigation","threat","attack","breach","event","correlation","triage","ioc","playbook","escalat","notification","contain","eradicate"],
        "employees": [
            {"name": "Bandar Al-Zahrani",  "role": "IR Manager"},
            {"name": "Mona Al-Ghamdi",     "role": "SOC Analyst"},
            {"name": "Saad Al-Otaibi",     "role": "Threat Hunter"},
        ],
    },
    {
        "name": "Compliance & Governance",
        "description": "Manages audit, policy, risk assessment and regulatory compliance",
        "keywords": ["audit","compliance","policy","procedure","governance","risk","assessment","regulation","standard","framework","nca","ecc","nis","gdpr","iso","nist","review","exception","waiver","report","evidence","control"],
        "employees": [
            {"name": "Aisha Al-Harbi",    "role": "GRC Manager"},
            {"name": "Yazeed Al-Dosari",  "role": "Compliance Analyst"},
            {"name": "Dalal Al-Shehri",   "role": "Risk Analyst"},
        ],
    },
    {
        "name": "IT Operations",
        "description": "Manages servers, infrastructure, configuration and change management",
        "keywords": ["server","infrastructure","configuration","change","asset","inventory","system","operating","os","datacenter","cloud","virtuali","vm","container","docker","kubernetes","ci/cd","devops","deployment","patch management","capacity"],
        "employees": [
            {"name": "Nasser Al-Mutairi", "role": "IT Manager"},
            {"name": "Hind Al-Rashid",    "role": "Systems Administrator"},
            {"name": "Waleed Al-Malik",   "role": "IT Engineer"},
        ],
    },
    {
        "name": "Physical Security",
        "description": "Controls physical access, CCTV, facilities and hardware security",
        "keywords": ["physical","facility","cctv","camera","badge","door","access card","lock","guard","visitor","hardware","office","building","server room","data center","clean desk","shredding","disposal","media","usb","removable"],
        "employees": [
            {"name": "Mohammed Al-Aqeel", "role": "Physical Security Manager"},
            {"name": "Nora Al-Malki",     "role": "Security Officer"},
            {"name": "Khalil Al-Qahtani", "role": "Facilities Analyst"},
        ],
    },
]


# ── 2. Create departments & employees ─────────────────────────────────────────

dept_map = {}   # name -> Department object

for d in DEPARTMENTS:
    existing = db.query(models.Department).filter(models.Department.name == d["name"]).first()
    if existing:
        dept = existing
        print(f"  [exists] {dept.name}")
    else:
        dept = models.Department(name=d["name"], description=d["description"])
        db.add(dept)
        db.commit()
        db.refresh(dept)
        print(f"  [created dept] {dept.name}")

    dept_map[d["name"]] = dept

    # Create employees if not already there
    existing_emps = db.query(models.Employee).filter(models.Employee.department_id == dept.id).all()
    existing_names = {e.name for e in existing_emps}

    for emp in d["employees"]:
        if emp["name"] not in existing_names:
            db_emp = models.Employee(name=emp["name"], role=emp["role"], department_id=dept.id)
            db.add(db_emp)
            print(f"    [created employee] {emp['name']} ({emp['role']})")

db.commit()

# ── 3. Auto-classify controls ──────────────────────────────────────────────────

controls = db.query(models.Control).all()
print(f"\nAuto-classifying {len(controls)} controls...")

def score_dept(ctrl, dept_def):
    """Return a keyword match score for a control against a department."""
    text = f"{ctrl.name} {ctrl.description or ''} {ctrl.criteria or ''}".lower()
    return sum(1 for kw in dept_def["keywords"] if kw in text)

assigned = 0
for ctrl in controls:
    if ctrl.department_id:
        print(f"  [skip] {ctrl.name[:50]} — already assigned")
        continue

    scores = {d["name"]: score_dept(ctrl, d) for d in DEPARTMENTS}
    best   = max(scores, key=scores.get)
    top    = scores[best]

    if top == 0:
        # Fallback: assign to Compliance & Governance
        best = "Compliance & Governance"

    dept = dept_map[best]
    ctrl.department_id = dept.id

    # Also update category to match department name
    ctrl.category = best
    assigned += 1
    print(f"  [{top} hits -> {best[:22]:<22}] {ctrl.name[:50]}")

db.commit()

print(f"\n✅ Done!")
print(f"   Departments : {len(dept_map)}")
print(f"   Employees   : {db.query(models.Employee).count()}")
print(f"   Controls assigned this run: {assigned}")
print(f"   Total controls : {len(controls)}")

db.close()
