"""
Synthetic Training Data Generator for Evidence Validation Pipeline
=================================================================

Generates realistic OCR-like text samples for each evidence category,
labeled with:
  - category: what type of screenshot (firewall, antivirus, ad, etc.)
  - status:   pass / fail / need_review

These samples simulate what EasyOCR would extract from real screenshots.
"""

import csv
import random
import os

random.seed(42)
OUTPUT = os.path.join(os.path.dirname(__file__), 'training_data_evidence.csv')

# ── Helpers ──────────────────────────────────────────────────────────────────

def vary(text: str) -> str:
    """Add realistic OCR noise: random case, missing words, extra spaces."""
    words = text.split()
    result = []
    for w in words:
        if random.random() < 0.05:
            continue  # drop a word (5%)
        if random.random() < 0.08:
            w = w.upper()
        elif random.random() < 0.08:
            w = w.lower()
        if random.random() < 0.03:
            w = w + " "  # extra space
        result.append(w)
    return " ".join(result)


def generate_samples(templates: list[str], n_per_template: int = 30) -> list[str]:
    """Generate varied samples from templates."""
    samples = []
    for t in templates:
        for _ in range(n_per_template):
            samples.append(vary(t))
    return samples


# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY TEMPLATES — Realistic OCR output from each type of screenshot
# ══════════════════════════════════════════════════════════════════════════════

# ── FIREWALL ─────────────────────────────────────────────────────────────────

FIREWALL_PASS = [
    "Windows Defender Firewall Domain Profile Firewall state On Inbound connections Block Outbound connections Allow",
    "Windows Defender Firewall with Advanced Security Local Computer Policy Overview Domain Profile is Active Windows Firewall is on Inbound connections that do not match a rule are blocked",
    "Windows Firewall Customize Settings Domain network settings Turn on Windows Firewall Private network settings Turn on Windows Firewall Public network settings Turn on Windows Firewall",
    "Firewall Status On Network Profile Domain Active Connections Protected Inbound Blocked",
    "Security Center Firewall On Your firewall is currently active and protecting your computer",
    "Windows Defender Firewall Properties Domain Profile State On Private Profile State On Public Profile State On",
    "Firewall State Enabled Profile Domain Inbound Policy Block Default Outbound Allow Default Applied Rules 47",
    "Control Panel System and Security Windows Defender Firewall Firewall state On Incoming connections Block all connections Notification state On",
    "Network and Sharing Center Windows Firewall Active Domain networks Connected Firewall On",
    "Public profile settings Firewall state On Inbound connections Block Outbound connections Allow Private profile settings Firewall state On",
    "Windows Defender Firewall Turn on Windows Defender Firewall checked Block all incoming connections Use recommended settings applied successfully",
    "firewall status domain profile active state on inbound blocked outbound allowed rule count 53 last updated today",
    "advanced firewall settings domain profile enabled private profile enabled public profile enabled logging enabled",
    "netsh advfirewall show allprofiles State ON Domain Profile State ON Private Profile State ON Public Profile State ON",
]

FIREWALL_FAIL = [
    "Windows Defender Firewall Domain Profile Firewall state Off Inbound connections Allow all Outbound connections Allow",
    "Windows Defender Firewall with Advanced Security Domain Profile is not active Firewall is currently turned off Warning Your device is not protected",
    "Windows Firewall Customize Settings Domain network settings Turn off Windows Firewall Private network settings Turn off Windows Firewall",
    "Firewall Status Off Warning Your network is not protected No active firewall profiles detected",
    "Security Center Firewall Off Warning Your firewall is turned off Your computer is at risk",
    "Windows Defender Firewall Properties Domain Profile State Off Private Profile State Off Public Profile State Off",
    "Firewall State Disabled Profile Domain Inbound Policy Allow All No filtering No active rules",
    "Control Panel System and Security Windows Defender Firewall Firewall state Off Your device is at risk",
    "Windows Firewall is turned off For your security we recommend turning it on Click Turn on to enable protection",
    "All firewall profiles are currently disabled Domain Off Private Off Public Off Action Required",
    "netsh advfirewall show allprofiles State OFF Domain Profile State OFF Private Profile State OFF",
    "firewall disabled no protection active device vulnerable inbound open outbound open",
]

FIREWALL_REVIEW = [
    "Windows Defender Firewall Domain Profile Firewall state On Private Profile Firewall state Off",
    "Firewall partially configured Domain On Public Off Some rules may not be applied correctly",
    "Windows Firewall Settings page loading Please wait Checking firewall status",
    "Firewall rules list view 47 inbound rules 31 outbound rules Status mixed Enabled and disabled rules present",
    "Firewall log entries Connection blocked from IP 192.168.1.100 to port 445 Multiple warnings",
]

# ── ANTIVIRUS ────────────────────────────────────────────────────────────────

ANTIVIRUS_PASS = [
    "Windows Security Virus & threat protection No current threats Real-time protection On Cloud-delivered protection On",
    "Windows Defender Antivirus Protection updates Virus definitions up to date Last update today Quick scan No threats found",
    "Virus & threat protection Current threats No current threats Protection history 0 threats found Real-time protection On",
    "Windows Security Device security Virus & threat protection No action needed Your device is protected Real-time protection is on",
    "Scan completed Full scan No threats were found on your device Total files scanned 245831 Time elapsed 2 hours",
    "Protection areas Virus & threat protection On Account protection On Firewall & network On App & browser control On",
    "Microsoft Defender Antivirus Real-time protection Enabled Behavior monitoring Enabled Cloud protection Enabled",
    "Antivirus Status Active Last scan completed No threats detected Definitions version 1.401.789 Updated today",
    "virus and threat protection settings real-time protection on cloud-delivered protection on automatic sample submission on tamper protection on",
    "Full scan results Scan completed successfully Total items scanned 342567 Threats found 0 Status Clean Time 01:45:23",
    "Quick scan completed 45231 files scanned 0 threats detected scan duration 00:03:45 real-time protection active",
    "Endpoint protection status Healthy Antivirus enabled Definitions current Last scan 2 hours ago No threats",
]

ANTIVIRUS_FAIL = [
    "Windows Security Alert Virus & threat protection Threats found 3 threats need action Real-time protection Off",
    "Windows Defender Antivirus Protection updates Virus definitions out of date Last update 30 days ago Warning action needed",
    "Virus & threat protection Current threats 5 threats found Action needed Trojan:Win32 detected Quarantine recommended",
    "Warning Windows Defender is turned off Your device is vulnerable Real-time protection Off No recent scans",
    "Antivirus Status Disabled Real-time protection Off Definitions outdated Last update 45 days ago Critical alert",
    "Scan completed Threats detected 3 items found High risk Trojan:Win32/Agent Medium risk PUP:Win32/Presenoker",
    "Windows Security Your device may be at risk Real-time protection is off Virus definitions are out of date",
    "antivirus disabled no protection threats detected 7 items malware found device at risk action required immediately",
    "Microsoft Defender Real-time protection Disabled Behavior monitoring Off Cloud protection Off Status Not protected",
    "Protection status Critical Antivirus Off Last scan Never Definitions Outdated Device vulnerable",
]

ANTIVIRUS_REVIEW = [
    "Windows Security Virus & threat protection Scan in progress 45% complete Scanning system files",
    "Quick scan results 1 item found Low threat PUP:Win32/InstallCore Recommended action Quarantine Review needed",
    "Antivirus definitions updating Please wait Download in progress Current version may be outdated",
    "Protection history Recent items quarantined Review recommended 2 items need your attention",
]

# ── ACTIVE DIRECTORY / USER MANAGEMENT ───────────────────────────────────────

AD_PASS = [
    "Active Directory Users and Computers Domain users Organizational Unit Accounts Enabled Account is active Password never expires unchecked",
    "Local Users and Groups Users Administrator Account is disabled Guest Account is disabled Standard user accounts configured",
    "Group Policy Management Security Settings Account Policies Password Policy Minimum password length 12 characters Maximum password age 90 days",
    "Account Lockout Policy Lockout threshold 5 invalid attempts Lockout duration 30 minutes Reset counter 30 minutes",
    "User Account Control Settings Always notify when apps try to make changes Recommended security level",
    "Computer Management Local Users and Groups 15 user accounts configured Role-based access implemented Admin accounts 2 Standard users 13",
    "Active Directory Administrative Center Password Settings Container Fine-Grained Password Policies applied Minimum length 14",
    "Security group membership Domain Admins 2 members Server Operators 3 members Backup Operators 2 members Principle of least privilege applied",
    "Active Directory user properties Account tab Account is active Logon hours configured Account expires set Password must change at next logon",
    "user account management active directory domain properly configured accounts enabled role-based access control implemented least privilege enforced",
    "Group Policy Object Security Settings Restricted Groups Domain Admins membership audited Service accounts configured",
    "Azure Active Directory Users All users Multi-factor authentication Enabled Conditional access policies 5 active",
]

AD_FAIL = [
    "Active Directory Users and Computers Default domain policy Password minimum length 0 Password complexity disabled Account lockout threshold 0",
    "Local Users and Groups Administrator Account Enabled Guest Account Enabled No password policy configured",
    "Group Policy Management Password Policy Minimum password length 4 characters Maximum password age unlimited Complexity requirements disabled",
    "Account Lockout Policy Lockout threshold 0 never locked out No failed attempt tracking configured",
    "Multiple administrator accounts found 8 admin accounts No role separation Default passwords may be in use",
    "User accounts Guest Enabled Administrator Enabled TestUser No password TemporaryAdmin Password never expires",
    "active directory weak configuration no password complexity no account lockout guest account enabled default policies unchanged",
    "Security Settings Account Policy Password must meet complexity Off Minimum length 0 Store reversible encryption On",
    "user management audit findings excessive admin accounts no group policy enforced password policy inadequate service accounts with no expiry",
]

AD_REVIEW = [
    "Active Directory Users and Computers loading Organizational Units being enumerated Please wait",
    "Group Policy Results User configuration partially applied Some policies not linked Review recommended",
    "User accounts audit in progress 45 accounts enumerated Some inactive accounts found Review needed",
    "Active Directory health check Mixed results Replication OK DNS warnings found FSMO roles need verification",
]

# ── EVENT VIEWER / LOGGING ───────────────────────────────────────────────────

LOGGING_PASS = [
    "Event Viewer Windows Logs Security 15234 events Audit Policy Success and Failure logging enabled Source Microsoft Windows Security Auditing",
    "Security Log Events Logon Audit Success Event ID 4624 Account Logon Successful Audit tracking active",
    "Audit Policy Configuration Account Logon Events Success and Failure Account Management Success and Failure Object Access Success",
    "Windows Event Viewer Security Log Enabled Maximum log size 128 MB Retention Overwrite events as needed Archive enabled",
    "Event ID 4625 Failed logon attempt Count 3 Source Security Event ID 4624 Successful logon Count 1247 Audit comprehensive",
    "Security Information and Event Management Log collection Active Sources 12 servers Events per day 45000 Retention 90 days",
    "SIEM Dashboard Connected Sources 15 Active Alerts 3 Log Collection Rate 98.5% Storage Healthy Correlation Rules 47 Active",
    "Audit logging configured Security events captured Account logon tracked Object access monitored Policy changes recorded",
    "Event log settings Security log Maximum size 1048576 KB Retention method Archive the log when full Logging Status Active",
    "Centralized logging enabled All domain controllers forwarding events to SIEM Syslog configured Log integrity monitoring active",
    "audit policy advanced configuration all categories enabled success and failure both tracked event forwarding configured siem integration complete",
]

LOGGING_FAIL = [
    "Event Viewer Windows Logs Security 0 events Audit Policy Not configured No logging enabled",
    "Security Log Empty No audit events recorded Audit Policy Disabled Logging turned off",
    "Audit Policy Configuration All categories No Auditing No events being tracked Security monitoring disabled",
    "Windows Event Viewer Security Log Size 0 KB No events Maximum log size 512 KB Insufficient Overwrite immediately",
    "No SIEM configured Log collection Not active No centralized monitoring Event forwarding disabled",
    "Security events not being captured Audit policy not set Default configuration No modification tracking",
    "audit logging disabled no security events captured event log empty monitoring inactive requires configuration",
    "Event log settings Security log Maximum size 1024 KB Log full No retention policy Events being discarded",
]

LOGGING_REVIEW = [
    "Event Viewer Security Log 234 events Some audit categories not enabled Partial coverage",
    "SIEM Dashboard 2 of 12 sources disconnected Log gap detected Last 4 hours Check connectivity",
    "Audit Policy Some categories configured Logon Success only Object Access not enabled Partial compliance",
]

# ── WINDOWS UPDATE / PATCH MANAGEMENT ────────────────────────────────────────

PATCH_PASS = [
    "Windows Update You're up to date Last checked today All updates installed successfully",
    "Update History Successfully installed Feature update Windows 11 version 24H2 Quality updates all current",
    "Windows Update Settings Automatic updates enabled Active hours configured Receive updates for other Microsoft products On",
    "Windows Server Update Services WSUS Approved updates 347 Installed 347 Failed 0 Pending 0 Compliance 100%",
    "Installed Updates KB5034763 Security Update KB5034441 Cumulative Update All installed successfully",
    "System Information OS Name Windows 11 Pro Version 24H2 Build 26100.2 All patches applied",
    "Patch Management Dashboard Devices compliant 98% Critical updates All installed Last scan 2 hours ago Next scan scheduled",
    "windows update settings up to date all critical patches installed last checked today automatic updates enabled no pending updates",
    "Update compliance report All devices patched Critical 100% Important 100% Optional 95% Last deployment successful",
    "SCCM Software Update Compliance Overall 99.2% Critical updates deployed Important updates deployed Last sync today",
    "patch management summary total patches applicable 45 installed 45 missing 0 compliance rate 100 percent last scan today",
]

PATCH_FAIL = [
    "Windows Update Updates available 15 important updates pending Critical security updates not installed Last checked 60 days ago",
    "Update History Failed to install KB5034763 Error 0x80070002 Multiple updates pending restart required",
    "Windows Update Settings Automatic updates disabled Paused for 35 days Updates overdue",
    "System outdated Windows 10 version 1909 End of support Critical security patches missing",
    "Patch Management Dashboard Devices non-compliant 45% Critical updates missing 12 Overdue patches 28",
    "windows update out of date 23 pending updates critical patches missing automatic updates paused since last month",
    "Update status Failed Last successful update 90 days ago Error installing updates Multiple failures",
    "WSUS Compliance Report Failed updates 15 Pending approval 8 Not applicable 0 Compliance 67% Action required",
]

PATCH_REVIEW = [
    "Windows Update Downloading updates 3 of 7 Progress 45% Some updates require restart",
    "Update History 12 successful 3 pending restart Restart required to complete installation",
    "Windows Update Checking for updates Please wait Last checked 7 days ago",
]

# ── ENCRYPTION / BITLOCKER ───────────────────────────────────────────────────

ENCRYPTION_PASS = [
    "BitLocker Drive Encryption Operating system drive C: BitLocker on Encryption method XTS-AES 256",
    "BitLocker Drive Encryption C: Fully encrypted Protection On Key protector TPM Numerical password",
    "Manage BitLocker Turn off BitLocker Encrypted C: Protection is on Status Fully encrypted",
    "BitLocker Recovery Key saved to Azure AD Device encrypted AES-256 TPM Version 2.0 Status On",
    "Disk Encryption Status All drives encrypted C: BitLocker On D: BitLocker On Removable drives Policy enforced",
    "Control Panel BitLocker Drive Encryption C: Windows BitLocker is on AES 256 bit encryption Encrypted",
    "manage-bde status C: Encryption Method XTS-AES 256 Protection Status Protection On Lock Status Unlocked",
    "device encryption enabled all drives encrypted aes-256 tpm protected recovery key backed up compliance met",
    "Full disk encryption active BitLocker enabled on all volumes Operating system drive protected Data drives protected",
]

ENCRYPTION_FAIL = [
    "BitLocker Drive Encryption Operating system drive C: BitLocker off Turn on BitLocker",
    "Manage BitLocker C: BitLocker is not enabled Click Turn on BitLocker to encrypt your drive",
    "Drive not encrypted C: No protection Data at risk Enable BitLocker recommended Full access without authentication",
    "BitLocker Status Off No encryption TPM not enabled Drives unprotected Turn on encryption immediately",
    "Device encryption not available This device doesn't meet the requirements for encryption",
    "disk encryption disabled bitlocker off drives not protected no tpm configured data at risk",
    "manage-bde status C: Protection Status Protection Off Encryption Method None Lock Status Unlocked",
]

ENCRYPTION_REVIEW = [
    "BitLocker Drive Encryption C: Encryption in progress 67% complete Do not shut down",
    "BitLocker suspended temporarily for system update Resume after restart required",
    "BitLocker C: Decrypting 23% Please wait Decryption in progress",
]

# ── BACKUP ───────────────────────────────────────────────────────────────────

BACKUP_PASS = [
    "Backup and Restore Windows 7 Last backup 4/7/2026 2:00 AM Size 45.2 GB Status Backup completed successfully",
    "Windows Server Backup Local Backup Last backup Successful Time 3:00 AM today Location D: Status completed",
    "Backup Schedule Daily at 2:00 AM Full backup weekly Incremental daily Retention 30 days Last status Success",
    "File History Your files are being backed up Files backed up Last copy today Run now Backup drive D: connected",
    "Veeam Backup & Replication Last backup job Success Duration 1h 23m Next scheduled Tonight RPO met RTO verified",
    "Azure Backup Recovery Services Vault Protected items 5 servers Last backup Completed Backup health Healthy",
    "backup completed successfully last backup date today full backup size 120 GB incremental 5 GB retention 90 days recovery point verified",
    "System image backup completed Full system backup saved to external drive Recovery partition verified Boot media tested",
    "Backup verification All critical data backed up Database dump completed Application data archived offsite copy synced",
]

BACKUP_FAIL = [
    "Backup and Restore No backups have been configured No Windows backup has ever been completed",
    "Windows Server Backup Last backup Failed Error VSS writer timeout No recent successful backup",
    "Backup Schedule Not configured No automatic backups Data at risk Last backup Never",
    "File History File History is turned off Your files are not being backed up Turn on to start backing up",
    "Backup failed Error code 0x8078002A Insufficient disk space Last successful backup 45 days ago",
    "No backup configured no protection no recovery points available data at risk critical systems unprotected",
    "Azure Backup Recovery Services Vault Warning Last backup failed Backup health Critical 3 alerts Action needed",
]

BACKUP_REVIEW = [
    "Backup in progress 78% complete Estimated time remaining 25 minutes Do not shut down",
    "Windows Server Backup running Full backup 3 of 5 volumes completed Backup destination nearly full Warning",
    "Last backup 14 days ago Schedule configured but backup overdue Check backup target connectivity",
]

# ── NETWORK SECURITY ─────────────────────────────────────────────────────────

NETWORK_PASS = [
    "Network and Sharing Center Active connections Domain network Private network Network profile configured",
    "VPN Connection Connected Duration 2:45:30 Protocol IKEv2 Encryption AES-256 Authentication certificate",
    "Network Security Group Inbound rules Deny all Allow RDP from management subnet Allow HTTPS from anywhere",
    "802.1X Authentication Network Access Control Authenticated Port status Authorized VLAN assignment correct",
    "Network segmentation configured DMZ isolated Management VLAN separated Production network segmented Guest network isolated",
    "Cisco AnyConnect VPN Connected to corporate network Secure connection established Certificate valid Tunnel active",
    "WiFi Security WPA3-Enterprise 802.1X authentication Certificate-based Network access control active",
    "network security configured vlan segmentation implemented access control lists applied monitoring active ids enabled",
    "DNS Security DNSSEC enabled DNS filtering active Malicious domain blocking on Known threats blocked 234",
    "Network Access Control 802.1X enabled NAC healthy agent reporting Quarantine VLAN configured Guest isolation active",
]

NETWORK_FAIL = [
    "Network connections Open network No security No password required All traffic unencrypted",
    "VPN Not connected No secure tunnel Remote access unsecured Direct internet connection",
    "Network Security Group All ports open No access control No filtering Default allow all",
    "No network segmentation Flat network All devices same subnet No isolation No access control",
    "WiFi Security None Open network No encryption No authentication Anyone can connect",
    "network security misconfigured no segmentation default passwords open ports no monitoring no ids",
    "DNS Security DNSSEC not enabled No DNS filtering Malicious domains not blocked No threat protection",
]

NETWORK_REVIEW = [
    "Network assessment in progress Scanning 245 hosts Port scan 67% complete Vulnerability assessment pending",
    "VPN Certificate expiring in 15 days Renewal needed Connection currently active Tunnel operational",
    "Network configuration review Some ports flagged 3 services need review Legacy protocol detected",
]

# ── IRRELEVANT (for negative training) ───────────────────────────────────────

IRRELEVANT = [
    "Google Chrome New Tab Most Visited Gmail YouTube Maps News Shopping",
    "Microsoft Word Document1 Home Insert Design Layout References Review View",
    "PowerPoint Presentation Slide 1 of 15 Click to add title Click to add subtitle",
    "Excel Spreadsheet Sheet1 Cell A1 B2 C3 SUM AVERAGE VLOOKUP Formula Bar",
    "Desktop Icons Recycle Bin This PC My Documents Downloads Music Pictures Videos",
    "Calculator Standard Scientific Programmer Date calculation Memory Clear History",
    "Notepad Untitled File Edit Format View Help Word wrap font size",
    "Instagram Feed Stories Reels Explore Profile Message Notification Like Comment Share",
    "YouTube Home Trending Subscriptions Library History Watch Later Playlist",
    "Amazon Shopping Cart Your Account Return Orders Deals Gift Cards Buy Again",
    "Facebook News Feed Messenger Groups Watch Marketplace Notifications Menu",
    "Twitter X Timeline Following For You Trending Notifications Messages Profile",
    "Spotify Home Search Your Library Playlist Liked Songs Recently Played",
    "Netflix Home TV Shows Movies New Popular My List Continue Watching",
    "Steam Library Store Community Profile Games Workshop All Games Installed",
    "Zoom Meeting Join Schedule Settings Audio Video Chat Participants Share Screen",
    "Slack Workspace Channels Direct Messages Apps Files Threads Huddles",
    "weather forecast temperature 72 degrees sunny clear skies wind 5 mph humidity 45 percent",
    "recipe cooking instructions ingredients flour sugar eggs butter preheat oven 350 degrees",
    "flight booking departure arrival gate terminal boarding pass seat assignment economy class",
    "online banking account balance transfer payment credit card statement due date minimum payment",
    "WhatsApp Chat Groups Status Calls New message Read receipt Last seen Online Offline",
    "Calendar March 2026 Monday Tuesday Wednesday Thursday Friday Meetings Appointments Events Todo",
    "Photo Gallery Camera Roll Albums Favorites Screenshots Selfies Shared Library iCloud",
]


# ══════════════════════════════════════════════════════════════════════════════
# DATASET CONSTRUCTION
# ══════════════════════════════════════════════════════════════════════════════

def build_dataset():
    """Build the full labeled dataset."""
    rows = []

    # ── Per-category generation ──────────────────────────────────────────────
    categories = {
        "firewall":   (FIREWALL_PASS, FIREWALL_FAIL, FIREWALL_REVIEW),
        "antivirus":  (ANTIVIRUS_PASS, ANTIVIRUS_FAIL, ANTIVIRUS_REVIEW),
        "access":     (AD_PASS, AD_FAIL, AD_REVIEW),
        "logging":    (LOGGING_PASS, LOGGING_FAIL, LOGGING_REVIEW),
        "patch":      (PATCH_PASS, PATCH_FAIL, PATCH_REVIEW),
        "encryption": (ENCRYPTION_PASS, ENCRYPTION_FAIL, ENCRYPTION_REVIEW),
        "backup":     (BACKUP_PASS, BACKUP_FAIL, BACKUP_REVIEW),
        "network":    (NETWORK_PASS, NETWORK_FAIL, NETWORK_REVIEW),
    }

    for category, (pass_t, fail_t, review_t) in categories.items():
        for s in generate_samples(pass_t, n_per_template=1500):
            rows.append({"text": s, "category": category, "status": "pass"})
        for s in generate_samples(fail_t, n_per_template=1500):
            rows.append({"text": s, "category": category, "status": "fail"})
        for s in generate_samples(review_t, n_per_template=1200):
            rows.append({"text": s, "category": category, "status": "need_review"})

    # ── Irrelevant samples ───────────────────────────────────────────────────
    for s in generate_samples(IRRELEVANT, n_per_template=1200):
        rows.append({"text": s, "category": "irrelevant", "status": "fail"})

    random.shuffle(rows)
    return rows


def main():
    rows = build_dataset()

    with open(OUTPUT, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["text", "category", "status"])
        writer.writeheader()
        writer.writerows(rows)

    # Stats
    from collections import Counter
    cat_counter    = Counter(r["category"] for r in rows)
    status_counter = Counter(r["status"]   for r in rows)

    print(f"\n{'='*60}")
    print(f"  Synthetic Training Data Generated")
    print(f"{'='*60}")
    print(f"  Total samples:  {len(rows)}")
    print(f"  Output:         {OUTPUT}")
    print(f"\n  By Category:")
    for c, n in sorted(cat_counter.items()):
        print(f"    {c:15s}  {n:5d} samples")
    print(f"\n  By Status:")
    for s, n in sorted(status_counter.items()):
        print(f"    {s:15s}  {n:5d} samples")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
