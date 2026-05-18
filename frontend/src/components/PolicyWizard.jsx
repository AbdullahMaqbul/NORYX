import React, { useState, useMemo } from 'react';

const TODAY = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

function futureDate(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function renderText(text) {
  if (!text || !text.includes('**')) return text;
  const parts = text.split('**');
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} style={{ color: 'var(--text-primary)' }}>{part}</strong> : part
  );
}

const POLICY_TYPES = [
  { id: 'information-security', label: 'Information Security Policy', short: 'ISP', ref: 'ISP-001', description: 'Defines rules for protecting all information assets.', color: 'var(--accent)', border: 'var(--accent-border)', dim: 'var(--accent-dim)' },
  { id: 'access-control', label: 'Access Control Policy', short: 'ACP', ref: 'ACP-001', description: 'Governs who can access systems, data, and facilities.', color: 'var(--purple)', border: 'var(--purple-border)', dim: 'var(--purple-dim)' },
  { id: 'incident-response', label: 'Incident Response Policy', short: 'IRP', ref: 'IRP-001', description: 'Procedures for detecting, responding to, and recovering from incidents.', color: 'var(--red)', border: 'var(--red-border)', dim: 'var(--red-dim)' },
  { id: 'data-classification', label: 'Data Classification Policy', short: 'DCP', ref: 'DCP-001', description: 'Framework for categorizing data by sensitivity and required handling.', color: 'var(--yellow)', border: 'var(--yellow-border)', dim: 'var(--yellow-dim)' },
  { id: 'business-continuity', label: 'Business Continuity Policy', short: 'BCP', ref: 'BCP-001', description: 'Ensures critical operations continue during and after disruptions.', color: 'var(--green)', border: 'var(--green-border)', dim: 'var(--green-dim)' },
];

const FRAMEWORKS = [
  { id: 'nca-ecc', label: 'NCA ECC', fullLabel: 'NCA Essential Cybersecurity Controls', version: 'Version 1.0', region: 'Saudi Arabia', controls: ['ECC-1: Cybersecurity Governance', 'ECC-2: Cybersecurity Risk Management', 'ECC-3: Cybersecurity Resilience', 'ECC-4: Third-party & Cloud Cybersecurity', 'ECC-5: Industrial Control Systems Cybersecurity'] },
  { id: 'iso27001', label: 'ISO/IEC 27001', fullLabel: 'ISO/IEC 27001:2022', version: '2022 Edition', region: 'International', controls: ['Clause 5: Leadership & Commitment', 'Clause 6: Planning & Risk Treatment', 'Clause 7: Support & Resources', 'Clause 8: Operational Controls', 'Clause 9: Performance Evaluation', 'Clause 10: Continual Improvement'] },
  { id: 'nist-csf', label: 'NIST CSF 2.0', fullLabel: 'NIST Cybersecurity Framework', version: 'Version 2.0', region: 'US / International', controls: ['GV: Govern', 'ID: Identify', 'PR: Protect', 'DE: Detect', 'RS: Respond', 'RC: Recover'] },
  { id: 'sama-csf', label: 'SAMA CSF', fullLabel: 'SAMA Cybersecurity Framework', version: 'Version 1.0', region: 'Saudi Arabia', controls: ['Domain 1: Cybersecurity Leadership & Governance', 'Domain 2: Cybersecurity Risk Management', 'Domain 3: Cybersecurity Operations & Technology', 'Domain 4: Third-party Cybersecurity'] },
  { id: 'pci-dss', label: 'PCI DSS v4.0', fullLabel: 'PCI Data Security Standard', version: 'Version 4.0', region: 'International', controls: ['Req 1–2: Network Security Controls', 'Req 3–4: Protection of Account Data', 'Req 5–6: Vulnerability Management', 'Req 7–8: Access Control', 'Req 9: Physical Access Security', 'Req 10–12: Monitoring, Testing & Governance'] },
];

const QUESTIONS = {
  'information-security': [
    { id: 'orgName', label: 'Organization Name', type: 'text', placeholder: 'e.g., Al Falak Electronic Equipment & Supplies Co.' },
    { id: 'orgSector', label: 'Industry Sector', type: 'select', options: ['Banking & Finance', 'Healthcare', 'Government', 'Telecommunications', 'Energy & Utilities', 'Retail & E-Commerce', 'Education', 'Other'] },
    { id: 'employeeCount', label: 'Number of Employees', type: 'select', options: ['1–50', '51–250', '251–1,000', '1,001–5,000', '5,000+'] },
    { id: 'sensitiveData', label: 'Does the organization handle personal data (PII)?', type: 'radio', options: ['Yes', 'No'] },
    { id: 'cloudUsage', label: 'IT environment(s) in use', type: 'multiselect', options: ['On-premises only', 'Public cloud (AWS / Azure / GCP)', 'Private cloud', 'Hybrid environment'] },
    { id: 'ownerName', label: 'Policy Owner / CISO Name', type: 'text', placeholder: 'e.g., Mohammed Al-Rashidi' },
    { id: 'reviewCycle', label: 'Policy Review Frequency', type: 'select', options: ['Every 6 months', 'Annually', 'Every 2 years', 'As needed'] },
  ],
  'access-control': [
    { id: 'orgName', label: 'Organization Name', type: 'text', placeholder: 'e.g., Al Falak Electronic Equipment & Supplies Co.' },
    { id: 'authMethod', label: 'Primary Authentication Method', type: 'select', options: ['Username & Password only', 'Multi-Factor Authentication (MFA)', 'Single Sign-On (SSO) with MFA', 'Certificate-based authentication', 'Biometric authentication'] },
    { id: 'mfaEnabled', label: 'MFA enforced for all privileged accounts?', type: 'radio', options: ['Yes', 'No', 'Planned'] },
    { id: 'pam', label: 'Privileged Access Management (PAM) deployed?', type: 'radio', options: ['Yes', 'No', 'Partially'] },
    { id: 'accessReview', label: 'User access review frequency', type: 'select', options: ['Monthly', 'Quarterly', 'Semi-annually', 'Annually'] },
    { id: 'guestAccess', label: 'Third-party / guest network access policy', type: 'select', options: ['Not permitted', 'Permitted with strict controls', 'Permitted with basic controls', 'Unrestricted'] },
    { id: 'ownerName', label: 'Policy Owner Name', type: 'text', placeholder: 'e.g., IT Security Manager' },
  ],
  'incident-response': [
    { id: 'orgName', label: 'Organization Name', type: 'text', placeholder: 'e.g., Al Falak Electronic Equipment & Supplies Co.' },
    { id: 'irtLead', label: 'Incident Response Team Lead', type: 'text', placeholder: 'e.g., Ahmad Khalid Al-Amri' },
    { id: 'irtEmail', label: 'Security Incident Reporting Email', type: 'text', placeholder: 'e.g., soc@company.com.sa' },
    { id: 'siem', label: 'Security Monitoring / SIEM Solution', type: 'select', options: ['None currently', 'Splunk', 'Microsoft Sentinel', 'IBM QRadar', 'Elastic SIEM', 'Custom / Other'] },
    { id: 'rto', label: 'Recovery Time Objective (RTO)', type: 'select', options: ['< 1 hour', '1–4 hours', '4–24 hours', '24–72 hours', '> 72 hours'] },
    { id: 'notifyRegulator', label: 'Regulatory breach notification requirement', type: 'select', options: ['NCA (Saudi Arabia)', 'SAMA (Financial sector)', 'PDPL / SDAIA', 'GDPR (EU)', 'Multiple / Other', 'Not applicable'] },
    { id: 'drillFreq', label: 'Incident response exercise frequency', type: 'select', options: ['Monthly', 'Quarterly', 'Annually', 'Not yet established'] },
  ],
  'data-classification': [
    { id: 'orgName', label: 'Organization Name', type: 'text', placeholder: 'e.g., Al Falak Electronic Equipment & Supplies Co.' },
    { id: 'classLevels', label: 'Classification levels to implement', type: 'multiselect', options: ['Public', 'Internal Use Only', 'Confidential', 'Highly Confidential', 'Restricted / Secret'] },
    { id: 'dataTypes', label: 'Types of sensitive data handled', type: 'multiselect', options: ['Personal Identifiable Information (PII)', 'Financial & payment data', 'Health / medical records', 'Intellectual property', 'Government / national security data'] },
    { id: 'dlp', label: 'DLP (Data Loss Prevention) controls deployed?', type: 'radio', options: ['Yes, fully deployed', 'Partially deployed', 'No'] },
    { id: 'encryption', label: 'Data encryption posture', type: 'select', options: ['Encrypted at rest AND in transit', 'In-transit encryption only', 'At-rest encryption only', 'No encryption currently'] },
    { id: 'retentionPeriod', label: 'Default data retention period', type: 'select', options: ['1 year', '3 years', '5 years', '7 years', '10 years', 'Defined per data type'] },
    { id: 'ownerName', label: 'Data Protection Officer / Owner', type: 'text', placeholder: 'e.g., Sara Al-Zahrani' },
  ],
  'business-continuity': [
    { id: 'orgName', label: 'Organization Name', type: 'text', placeholder: 'e.g., Al Falak Electronic Equipment & Supplies Co.' },
    { id: 'criticalSystems', label: 'Number of critical systems / services identified', type: 'select', options: ['1–5', '6–15', '16–50', '50+'] },
    { id: 'rto', label: 'Recovery Time Objective (RTO)', type: 'select', options: ['< 1 hour', '1–4 hours', '4–24 hours', '1–3 days', '> 3 days'] },
    { id: 'rpo', label: 'Recovery Point Objective (RPO)', type: 'select', options: ['Zero data loss (continuous replication)', '< 1 hour', '1–4 hours', '4–24 hours', '> 24 hours'] },
    { id: 'backupFreq', label: 'Backup frequency', type: 'select', options: ['Continuous / real-time', 'Hourly', 'Daily', 'Weekly', 'Monthly'] },
    { id: 'drSite', label: 'Disaster Recovery site availability', type: 'select', options: ['Hot standby (immediate failover)', 'Warm standby (minutes to failover)', 'Cold standby (hours to failover)', 'No DR site currently'] },
    { id: 'ownerName', label: 'BCP Owner / Responsible Manager', type: 'text', placeholder: 'e.g., Operations Security Director' },
  ],
};

function buildPolicyDocument(policyType, framework, answers) {
  if (!policyType || !framework) return null;

  const org = answers.orgName || '[Organization Name]';
  const owner = answers.ownerName || '[Policy Owner]';
  const cycleMonths = { 'Every 6 months': 6, 'Annually': 12, 'Every 2 years': 24, 'As needed': 12 }[answers.reviewCycle] || 12;
  const reviewDate = futureDate(cycleMonths);
  const cloudList = Array.isArray(answers.cloudUsage) && answers.cloudUsage.length
    ? answers.cloudUsage.join(', ')
    : 'on-premises and cloud environments';
  const classLevelList = Array.isArray(answers.classLevels) && answers.classLevels.length
    ? answers.classLevels
    : ['Public', 'Internal Use Only', 'Confidential', 'Highly Confidential'];
  const dataTypeList = Array.isArray(answers.dataTypes) && answers.dataTypes.length
    ? answers.dataTypes
    : ['Personal data', 'Financial data'];

  const meta = {
    ref: policyType.ref,
    version: '1.0',
    effectiveDate: TODAY,
    reviewDate,
    owner,
    classification: 'Internal',
    framework: framework.fullLabel,
    frameworkVersion: framework.version,
  };

  let sections = [];

  if (policyType.id === 'information-security') {
    sections = [
      { num: '1', title: 'Introduction & Purpose', paragraphs: [
        `This Information Security Policy establishes the principles, rules, and guidelines for protecting the information assets of ${org}. It defines the approach to managing information security across the organization, ensuring confidentiality, integrity, and availability of all information systems and data.`,
        `This Policy has been developed in alignment with the ${framework.fullLabel} (${framework.version}) and applies to all organizational operations${answers.orgSector ? ` within the ${answers.orgSector} sector` : ''}.`,
      ]},
      { num: '2', title: 'Scope', paragraphs: [
        `This Policy applies to all employees, contractors, third-party vendors, and any other parties accessing ${org}'s information systems, networks, or data assets — regardless of location or device.${answers.employeeCount ? ` The organization currently employs ${answers.employeeCount} individuals.` : ''}`,
        `Coverage extends to all IT environments in use: ${cloudList}.`,
      ]},
      { num: '3', title: 'Roles & Responsibilities', bullets: [
        `**Executive Management** — Approve this Policy, provide strategic oversight, and allocate adequate security resources.`,
        `**${owner} (CISO / Policy Owner)** — Maintain, enforce, and report on Policy compliance to executive leadership.`,
        `**Department Managers** — Ensure compliance within their teams and escalate incidents appropriately.`,
        `**IT / Security Team** — Implement technical controls and continuously monitor adherence.`,
        `**All Employees** — Adhere to this Policy and report suspected security incidents immediately.`,
      ]},
      { num: '4', title: `Alignment with ${framework.label}`, paragraphs: [`This Policy addresses the following ${framework.label} control domains:`], bullets: framework.controls },
      { num: '5', title: 'Security Principles', bullets: [
        '**Confidentiality** — Information is accessible only to those who are authorized.',
        '**Integrity** — Information and processing methods remain accurate and protected from unauthorized modification.',
        '**Availability** — Information and systems are accessible to authorized users when required.',
        answers.sensitiveData === 'Yes' ? '**Privacy** — Personal data is handled in accordance with applicable data protection regulations (PDPL and others as relevant).' : null,
      ].filter(Boolean)},
      { num: '6', title: 'Policy Requirements', bullets: [
        `All information assets must be registered in ${org}'s asset inventory and classified by sensitivity.`,
        `Access to information systems must follow the principle of least privilege.`,
        `Information security risks must be formally assessed and treated within 30 days of identification.`,
        `All employees must complete information security awareness training at least annually.`,
        answers.cloudUsage && !answers.cloudUsage.includes?.('On-premises only') ? `Cloud services must undergo a formal security assessment before adoption.` : null,
        `Security incidents must be reported through official channels within required regulatory timeframes.`,
      ].filter(Boolean)},
      { num: '7', title: 'Compliance & Enforcement', paragraphs: [
        `Violations of this Policy may result in disciplinary action up to and including termination. Criminal violations will be referred to the appropriate authorities. Compliance is assessed through periodic internal audits aligned with ${framework.label} requirements.`,
      ]},
      { num: '8', title: 'Review & Maintenance', paragraphs: [
        `This Policy shall be reviewed ${answers.reviewCycle || 'annually'} or following significant organizational, technological, or regulatory changes. Next scheduled review: **${reviewDate}**.`,
      ]},
      { num: '9', title: 'Document Control', table: [['Version', 'Date', 'Author', 'Description'], ['1.0', TODAY, owner, 'Initial release']] },
    ];
  } else if (policyType.id === 'access-control') {
    sections = [
      { num: '1', title: 'Introduction & Purpose', paragraphs: [
        `This Access Control Policy establishes the requirements for managing access to ${org}'s information systems, applications, data, and facilities. It ensures access is granted based on legitimate business need and withdrawn promptly when no longer required.`,
        `Aligned with ${framework.fullLabel} (${framework.version}).`,
      ]},
      { num: '2', title: 'Scope', paragraphs: [
        `Applies to all user accounts, service accounts, privileged accounts, and API credentials across all ${org} systems and networks. Covers all employees, contractors, third-party vendors, and automated systems.`,
      ]},
      { num: '3', title: 'Access Control Principles', bullets: [
        '**Least Privilege** — Users receive only the access required to perform their specific role.',
        '**Need-to-Know** — Sensitive information is restricted to those with a legitimate business need.',
        '**Separation of Duties** — Critical processes are divided to prevent unchecked single-party control.',
        '**Default Deny** — Access is denied unless explicitly authorized through the approved request process.',
      ]},
      { num: '4', title: 'Authentication Requirements', paragraphs: [`${org} mandates the following authentication controls:`], bullets: [
        `**Primary method**: ${answers.authMethod || 'Multi-Factor Authentication (MFA)'}.`,
        answers.mfaEnabled === 'Yes' ? '**MFA** is enforced for all privileged and administrative accounts.' :
        answers.mfaEnabled === 'Planned' ? '**MFA** deployment for privileged accounts is planned and must be completed within 90 days.' :
        '**MFA** must be implemented for privileged accounts immediately.',
        `**PAM solution**: ${answers.pam === 'Yes' ? 'Deployed and mandatory for all privileged access sessions.' : answers.pam === 'Partially' ? 'Partially deployed; full deployment required within 6 months.' : 'Not yet deployed; procurement required within 12 months.'}`,
      ]},
      { num: '5', title: 'User Access Lifecycle', bullets: [
        'All access must be formally requested, approved by the system/data owner, and documented.',
        `Access rights must be reviewed **${answers.accessReview || 'quarterly'}** and revoked immediately when no longer required.`,
        'Accounts must be disabled within **24 hours** of employee departure or significant role change.',
        `**Third-party access**: ${answers.guestAccess || 'Permitted with strict controls'} — must be time-limited, documented, and continuously monitored.`,
        'Shared or generic accounts are prohibited unless formally approved with compensating controls.',
        'Default vendor passwords must be changed before deployment in production environments.',
      ]},
      { num: '6', title: `${framework.label} Control Coverage`, paragraphs: ['The following framework domains are addressed by this Policy:'], bullets: framework.controls },
      { num: '7', title: 'Audit & Monitoring', paragraphs: [
        'All access to critical systems must be logged and retained for a minimum of 12 months. Logs must be reviewed regularly to detect anomalous activity. Privileged session recordings are required for all administrative access to production systems.',
      ]},
      { num: '8', title: 'Review & Maintenance', paragraphs: [`This Policy shall be reviewed ${answers.reviewCycle || 'annually'}. Next scheduled review: **${reviewDate}**.`] },
      { num: '9', title: 'Document Control', table: [['Version', 'Date', 'Author', 'Description'], ['1.0', TODAY, owner, 'Initial release']] },
    ];
  } else if (policyType.id === 'incident-response') {
    const lead = answers.irtLead || '[IRT Lead]';
    const email = answers.irtEmail || 'security@organization.com';
    sections = [
      { num: '1', title: 'Introduction & Purpose', paragraphs: [
        `This Incident Response Policy establishes ${org}'s framework for identifying, managing, and recovering from cybersecurity incidents. It ensures coordinated, effective, and timely responses that minimize business impact and fulfill regulatory notification obligations.`,
        `Aligned with ${framework.fullLabel} (${framework.version}).`,
      ]},
      { num: '2', title: 'Scope', paragraphs: [
        `Covers all cybersecurity incidents affecting ${org}'s systems, data, personnel, or reputational assets — whether originating internally or externally.`,
      ]},
      { num: '3', title: 'Incident Classification', bullets: [
        '**Critical (P1)** — Ransomware, confirmed data breach, full system compromise, critical infrastructure failure.',
        '**High (P2)** — Active malware infection, unauthorized privileged access, significant data exposure.',
        '**Medium (P3)** — Phishing attempts, policy violations, minor unauthorized access.',
        '**Low (P4)** — Suspicious emails, failed login attempts below threshold, informational alerts.',
      ]},
      { num: '4', title: 'Incident Response Team', paragraphs: [`All incidents must be reported immediately to **${lead}** at **${email}**.`], bullets: [
        `**IRT Lead**: ${lead}`,
        `**Reporting channel**: ${email}`,
        `**Security monitoring**: ${answers.siem || 'To be determined'}`,
        `**Recovery Time Objective (RTO)**: ${answers.rto || '4–24 hours'}`,
        `**Exercise frequency**: ${answers.drillFreq || 'Annually'}`,
      ]},
      { num: '5', title: 'Response Lifecycle', bullets: [
        `**1. Preparation** — Maintain IRT readiness, tools, playbooks, and communication channels. Conduct exercises ${answers.drillFreq || 'annually'}.`,
        '**2. Identification** — Detect, validate, and classify the incident; initiate IRT activation.',
        '**3. Containment** — Isolate affected systems to prevent lateral movement and further damage.',
        '**4. Eradication** — Remove root cause (malware, compromised credentials, exploited vulnerabilities).',
        `**5. Recovery** — Restore systems and validate integrity. Target RTO: ${answers.rto || '4–24 hours'}.`,
        '**6. Lessons Learned** — Complete post-incident review and report within 5 business days of resolution.',
      ]},
      { num: '6', title: 'Regulatory Notification', paragraphs: [
        `${org} is subject to breach notification requirements under: **${answers.notifyRegulator || 'applicable regulations'}**. Notifications must be submitted within required timeframes upon confirmed incident identification.`,
      ]},
      { num: '7', title: `${framework.label} Alignment`, bullets: framework.controls },
      { num: '8', title: 'Document Control', table: [['Version', 'Date', 'Author', 'Description'], ['1.0', TODAY, lead, 'Initial release']] },
    ];
  } else if (policyType.id === 'data-classification') {
    const levelDescriptions = {
      'Public': 'Approved for unrestricted public disclosure. No special access controls required.',
      'Internal Use Only': 'Intended for internal staff. Must not be shared externally without authorization.',
      'Confidential': 'Sensitive data requiring access controls, encryption, and audit logging.',
      'Highly Confidential': 'Highly sensitive. Strict access controls, mandatory encryption, and enhanced monitoring.',
      'Restricted / Secret': 'Most sensitive classification. Access restricted to named, individually approved individuals.',
    };
    sections = [
      { num: '1', title: 'Introduction & Purpose', paragraphs: [
        `This Data Classification Policy establishes a framework for categorizing ${org}'s data assets based on sensitivity, regulatory requirements, and the potential business impact of unauthorized disclosure, modification, or loss.`,
        `Aligned with ${framework.fullLabel} (${framework.version}).`,
      ]},
      { num: '2', title: 'Scope', paragraphs: [
        `Applies to all data created, received, stored, processed, or transmitted by ${org}, including data held by authorized third parties on the organization's behalf.`,
        `Data types in scope include: ${dataTypeList.join('; ')}.`,
      ]},
      { num: '3', title: 'Classification Levels', bullets: classLevelList.map(l => `**${l}** — ${levelDescriptions[l] || 'Requires appropriate access controls and handling procedures.'}`) },
      { num: '4', title: 'Data Handling Requirements', bullets: [
        `**Encryption**: ${answers.encryption || 'All Confidential and above data must be encrypted at rest and in transit using approved cryptographic standards.'}`,
        `**DLP Controls**: ${answers.dlp === 'Yes, fully deployed' ? 'Fully deployed across all data channels.' : answers.dlp === 'Partially deployed' ? 'Partially deployed; full deployment required within 6 months.' : 'Must be implemented for Confidential and above classifications.'}`,
        `**Retention**: Default retention period is **${answers.retentionPeriod || '5 years'}** unless superseded by legal, regulatory, or contractual requirements.`,
        'Data must be securely destroyed at end-of-life using approved sanitization methods (NIST SP 800-88 or equivalent).',
        'All data must be labeled with its classification level throughout its lifecycle.',
      ]},
      { num: '5', title: `${framework.label} Control Alignment`, bullets: framework.controls },
      { num: '6', title: 'Roles & Responsibilities', bullets: [
        `**${owner} (DPO / Policy Owner)** — Maintain this Policy, oversee classification compliance, and manage data protection activities.`,
        '**Data Owners** — Classify data within their domain and authorize access requests.',
        '**Data Custodians** — Implement technical and administrative controls for data in their care.',
        '**All Employees** — Label and handle data in accordance with its assigned classification.',
      ]},
      { num: '7', title: 'Document Control', table: [['Version', 'Date', 'Author', 'Description'], ['1.0', TODAY, owner, 'Initial release']] },
    ];
  } else if (policyType.id === 'business-continuity') {
    sections = [
      { num: '1', title: 'Introduction & Purpose', paragraphs: [
        `This Business Continuity Policy establishes ${org}'s commitment to maintaining critical business operations and recovering key services in the event of a disruption, disaster, or crisis. It seeks to protect people, assets, and organizational reputation while ensuring operational resilience.`,
        `Aligned with ${framework.fullLabel} (${framework.version}).`,
      ]},
      { num: '2', title: 'Scope', paragraphs: [
        `Covers all critical business processes, information systems, and supporting infrastructure of ${org}.${answers.criticalSystems ? ` The organization has identified **${answers.criticalSystems}** critical systems and services subject to this Policy.` : ''}`,
      ]},
      { num: '3', title: 'Recovery Objectives', bullets: [
        `**Recovery Time Objective (RTO)**: ${answers.rto || '4–24 hours'} — Maximum acceptable downtime for critical systems.`,
        `**Recovery Point Objective (RPO)**: ${answers.rpo || '4–24 hours'} — Maximum acceptable data loss measured in time.`,
        `**Backup frequency**: ${answers.backupFreq || 'Daily'}.`,
        `**DR site capability**: ${answers.drSite || 'Warm standby (minutes to failover)'}.`,
      ]},
      { num: '4', title: 'Business Impact Analysis', paragraphs: [
        answers.biaCompleted === 'Yes'
          ? `A Business Impact Analysis (BIA) has been completed and is maintained as a supporting document. The BIA identifies critical processes, recovery priorities, and financial / operational impacts of disruptions.`
          : `A Business Impact Analysis (BIA) is ${answers.biaCompleted === 'In progress' ? 'currently in progress and' : 'required and'} must be finalized to fully operationalize this Policy.`,
      ]},
      { num: '5', title: 'Continuity Strategy', bullets: [
        `Backups performed **${answers.backupFreq || 'daily'}** and stored in a geographically separate location.`,
        'All backups must be tested for restorability at least **quarterly**.',
        `DR site (${answers.drSite || 'warm standby'}) must be validated through full failover exercise **annually**.`,
        'Crisis communication procedures must be documented, maintained, and exercised.',
        'Third-party service dependencies must be assessed; continuity requirements included in vendor contracts.',
      ]},
      { num: '6', title: `${framework.label} Alignment`, bullets: framework.controls },
      { num: '7', title: 'Testing & Maintenance', paragraphs: [
        `BCP and DR plans must be tested at least annually through tabletop exercises and, where applicable, live failover tests. Results must be documented and fed back into plan improvement cycles.`,
        `**BCP Owner**: ${owner}`,
      ]},
      { num: '8', title: 'Document Control', table: [['Version', 'Date', 'Author', 'Description'], ['1.0', TODAY, owner, 'Initial release']] },
    ];
  }

  return { meta, sections, policyType, framework };
}

function buildPrintHTML(doc) {
  if (!doc) return '';
  const { meta, sections, policyType, framework } = doc;
  const accentColor = '#2bb8a5';

  const sectionsHTML = sections.map(s => {
    let content = '';
    if (s.paragraphs) content += s.paragraphs.map(p => `<p>${p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`).join('');
    if (s.bullets) content += `<ul>${s.bullets.map(b => `<li>${b.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`).join('')}</ul>`;
    if (s.table) {
      const [head, ...rows] = s.table;
      content += `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    return `<div class="section"><h2><span class="num">${s.num}.</span> ${s.title}</h2>${content}</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${policyType.label} — ${doc.meta.ref}</title>
<style>
  body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #1a1a1a; margin: 0; padding: 0; }
  @page { margin: 2.5cm 2cm; }
  .page-header { border-bottom: 3px solid ${accentColor}; padding-bottom: 14px; margin-bottom: 20px; }
  .org-name { font-size: 11pt; font-weight: 700; color: #444; margin-bottom: 4px; }
  .policy-title { font-size: 20pt; font-weight: 800; color: ${accentColor}; margin-bottom: 12px; }
  .meta-table { width: 100%; border-collapse: collapse; font-size: 9pt; color: #555; margin-top: 8px; }
  .meta-table td { padding: 2px 0; }
  .meta-table td:first-child { font-weight: 700; width: 160px; color: #333; }
  .section { margin-bottom: 18px; page-break-inside: avoid; }
  h2 { font-size: 11pt; font-weight: 700; color: #1a1a1a; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em; }
  .num { color: ${accentColor}; margin-right: 6px; }
  p { font-size: 10pt; color: #333; line-height: 1.7; margin-bottom: 6px; }
  ul { padding-left: 16px; margin: 0 0 6px 0; }
  li { font-size: 10pt; color: #333; line-height: 1.65; margin-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 6px; }
  th { background: #f4f4f4; text-align: left; padding: 5px 8px; font-weight: 700; border: 1px solid #ddd; }
  td { padding: 5px 8px; border: 1px solid #ddd; color: #333; }
  .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 8px; font-size: 8pt; color: #999; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="page-header">
  <div class="org-name">${doc.sections[0]?.paragraphs?.[0]?.match(/of\s+(.+?)[.\s]/) ? doc.sections[0].paragraphs[0].match(/of\s+(.+?)[.,]/)?.[1] || meta.owner : meta.owner}</div>
  <div class="policy-title">${policyType.label}</div>
  <table class="meta-table">
    <tr><td>Policy Reference</td><td>${meta.ref}</td><td>Version</td><td>${meta.version}</td></tr>
    <tr><td>Effective Date</td><td>${meta.effectiveDate}</td><td>Review Date</td><td>${meta.reviewDate}</td></tr>
    <tr><td>Policy Owner</td><td>${meta.owner}</td><td>Classification</td><td>${meta.classification}</td></tr>
    <tr><td>Framework</td><td colspan="3">${meta.framework} (${meta.frameworkVersion})</td></tr>
  </table>
</div>
${sectionsHTML}
<div class="footer">
  <span>${policyType.label} | ${meta.ref} | v${meta.version}</span>
  <span>Generated by Noryx Policy Wizard | ${TODAY}</span>
</div>
</body>
</html>`;
}

function StepIndicator({ step }) {
  const steps = ['Policy Type & Framework', 'Organization Details', 'Review & Export'];
  return (
    <div className="wz-steps">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <React.Fragment key={n}>
            <div className={`wz-step ${active ? 'wz-step-active' : ''} ${done ? 'wz-step-done' : ''}`}>
              <div className="wz-dot">{done ? '✓' : n}</div>
              <span className="wz-step-label">{label}</span>
            </div>
            {i < steps.length - 1 && <div className={`wz-step-line ${done ? 'wz-step-line-done' : ''}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function QuestionField({ q, value, onChange }) {
  if (q.type === 'text') {
    return (
      <input
        value={value || ''}
        onChange={e => onChange(q.id, e.target.value)}
        placeholder={q.placeholder}
      />
    );
  }
  if (q.type === 'select') {
    return (
      <select value={value || ''} onChange={e => onChange(q.id, e.target.value)}>
        <option value="">Select…</option>
        {q.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (q.type === 'radio') {
    return (
      <div className="wz-radio-group">
        {q.options.map(o => (
          <button
            key={o}
            type="button"
            className={`wz-radio-pill ${value === o ? 'wz-radio-pill-active' : ''}`}
            onClick={() => onChange(q.id, o)}
          >
            {o}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === 'multiselect') {
    const arr = Array.isArray(value) ? value : [];
    return (
      <div className="wz-multiselect">
        {q.options.map(o => {
          const checked = arr.includes(o);
          return (
            <label
              key={o}
              className={`wz-check-label ${checked ? 'wz-check-active' : ''}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  const next = checked ? arr.filter(x => x !== o) : [...arr, o];
                  onChange(q.id, next);
                }}
              />
              {o}
            </label>
          );
        })}
      </div>
    );
  }
  return null;
}

function PolicyPreviewDoc({ doc }) {
  if (!doc) {
    return (
      <div className="wz-preview-empty">
        <div style={{ fontSize: '28px', opacity: 0.3 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <div className="wz-preview-empty-title">Policy preview</div>
        <div className="wz-preview-empty-sub">Select a policy type and framework to see your generated document here in real time.</div>
      </div>
    );
  }

  const { meta, sections, policyType } = doc;

  return (
    <div className="wz-preview-doc">
      <div className="wz-preview-header" style={{ borderColor: policyType.color }}>
        <div className="wz-preview-org">{meta.owner !== '[Policy Owner]' ? '' : ''}{sections[0]?.paragraphs?.[0]?.split(' of ')?.[1]?.split('.')?.[0] || '[Organization Name]'}</div>
        <div className="wz-preview-title" style={{ color: policyType.color }}>{policyType.label}</div>
        <table className="wz-preview-meta">
          <tbody>
            <tr><td>Policy Ref</td><td>{meta.ref}</td><td>Version</td><td>{meta.version}</td></tr>
            <tr><td>Effective</td><td>{meta.effectiveDate}</td><td>Review</td><td>{meta.reviewDate}</td></tr>
            <tr><td>Owner</td><td>{meta.owner}</td><td>Class.</td><td>{meta.classification}</td></tr>
            <tr><td>Framework</td><td colSpan="3">{meta.framework} ({meta.frameworkVersion})</td></tr>
          </tbody>
        </table>
      </div>

      {sections.map(s => (
        <div key={s.num} className="wz-preview-section">
          <div className="wz-preview-section-title">
            <span className="wz-preview-num">{s.num}.</span> {s.title}
          </div>
          {s.paragraphs?.map((p, i) => (
            <p key={i} className="wz-preview-para">{renderText(p)}</p>
          ))}
          {s.bullets?.map((b, i) => (
            <div key={i} className="wz-preview-bullet">{renderText(b)}</div>
          ))}
          {s.table && (
            <table className="wz-preview-table">
              <thead>
                <tr>{s.table[0].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {s.table.slice(1).map((row, ri) => (
                  <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      <div className="wz-preview-footer">
        {policyType.label} &nbsp;|&nbsp; {meta.ref} &nbsp;|&nbsp; v{meta.version} &nbsp;|&nbsp; Generated by Noryx Policy Wizard
      </div>
    </div>
  );
}

export default function PolicyWizard() {
  const [step, setStep] = useState(1);
  const [selectedPolicyId, setSelectedPolicyId] = useState(null);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [exported, setExported] = useState(false);

  const selectedPolicy = POLICY_TYPES.find(p => p.id === selectedPolicyId) || null;
  const selectedFramework = FRAMEWORKS.find(f => f.id === selectedFrameworkId) || null;
  const questions = selectedPolicyId ? (QUESTIONS[selectedPolicyId] || []) : [];

  const doc = useMemo(
    () => buildPolicyDocument(selectedPolicy, selectedFramework, answers),
    [selectedPolicy, selectedFramework, answers]
  );

  const setAnswer = (id, val) => setAnswers(prev => ({ ...prev, [id]: val }));

  const canProceedStep1 = selectedPolicyId && selectedFrameworkId;
  const answeredCount = questions.filter(q => {
    const v = answers[q.id];
    return v && (Array.isArray(v) ? v.length > 0 : v !== '');
  }).length;
  const canProceedStep2 = answeredCount >= Math.ceil(questions.length * 0.5);

  const exportPDF = () => {
    if (!doc) return;
    const html = buildPrintHTML(doc);
    const w = window.open('', '_blank');
    if (!w) { alert('Please allow pop-ups to export as PDF.'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 600);
    setExported(true);
  };

  const reset = () => {
    setStep(1);
    setSelectedPolicyId(null);
    setSelectedFrameworkId(null);
    setAnswers({});
    setExported(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* KPI strip */}
      <div className="g3">
        <div className="card card-sm">
          <div className="card-label">Policy Type</div>
          <div className="card-value" style={{ color: selectedPolicy?.color || 'var(--text-secondary)', fontSize: '14px', fontWeight: 700 }}>
            {selectedPolicy?.short || '—'}
          </div>
        </div>
        <div className="card card-sm">
          <div className="card-label">Framework</div>
          <div className="card-value" style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 700 }}>
            {selectedFramework?.label || '—'}
          </div>
        </div>
        <div className="card card-sm">
          <div className="card-label">Questions Answered</div>
          <div className="card-value" style={{ color: 'var(--green)', fontSize: '14px', fontWeight: 700 }}>
            {selectedPolicyId ? `${answeredCount} / ${questions.length}` : '—'}
          </div>
        </div>
      </div>

      {/* Main wizard layout */}
      <div className="wz-shell">
        {/* Left: wizard panel */}
        <div className="wz-panel">
          <div className="wz-panel-head">
            <StepIndicator step={step} />
          </div>

          <div className="wz-panel-body">
            {/* Step 1: Policy type + Framework */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <div className="wz-section-label">Select Policy Type</div>
                  <div className="wz-type-grid">
                    {POLICY_TYPES.map(pt => (
                      <button
                        key={pt.id}
                        type="button"
                        className={`wz-type-card ${selectedPolicyId === pt.id ? 'wz-type-card-active' : ''}`}
                        style={selectedPolicyId === pt.id ? { borderColor: pt.border, background: pt.dim } : {}}
                        onClick={() => setSelectedPolicyId(pt.id)}
                      >
                        <div className="wz-type-short" style={{ color: pt.color }}>{pt.short}</div>
                        <div className="wz-type-name">{pt.label}</div>
                        <div className="wz-type-desc">{pt.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="wz-section-label">Select Compliance Framework</div>
                  <div className="wz-fw-grid">
                    {FRAMEWORKS.map(fw => (
                      <button
                        key={fw.id}
                        type="button"
                        className={`wz-fw-chip ${selectedFrameworkId === fw.id ? 'wz-fw-chip-active' : ''}`}
                        onClick={() => setSelectedFrameworkId(fw.id)}
                      >
                        <span className="wz-fw-name">{fw.label}</span>
                        <span className="wz-fw-ver">{fw.version}</span>
                        <span className="wz-fw-region">{fw.region}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Org questions */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ padding: '8px 10px', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-sm)', fontSize: '11.5px', color: 'var(--accent)' }}>
                  Generating a <strong>{selectedPolicy?.label}</strong> aligned with <strong>{selectedFramework?.label}</strong>. Answer the questions below to customize the document.
                </div>
                {questions.map(q => (
                  <div className="form-group" key={q.id} style={{ marginBottom: 0 }}>
                    <label>{q.label}</label>
                    <QuestionField q={q} value={answers[q.id]} onChange={setAnswer} />
                  </div>
                ))}
                {!canProceedStep2 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    Answer at least {Math.ceil(questions.length * 0.5)} questions to continue.
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review & export */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '12px', background: 'var(--green-dim)', border: '1px solid var(--green-border)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--green)', marginBottom: '4px' }}>Policy document ready</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Your {selectedPolicy?.label} has been generated. Review the preview on the right, then export as PDF.
                  </div>
                </div>

                <div className="card card-sm" style={{ gap: '8px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Document Summary</div>
                  {[
                    ['Policy', selectedPolicy?.label],
                    ['Reference', selectedPolicy?.ref],
                    ['Framework', `${selectedFramework?.label} (${selectedFramework?.version})`],
                    ['Owner', answers.ownerName || '[Policy Owner]'],
                    ['Effective', TODAY],
                    ['Questions answered', `${answeredCount} / ${questions.length}`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>{k}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right', maxWidth: '55%' }}>{v}</span>
                    </div>
                  ))}
                </div>

                <button className="btn btn-primary" onClick={exportPDF} style={{ width: '100%', justifyContent: 'center', gap: '8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export as PDF
                </button>

                {exported && (
                  <div style={{ fontSize: '11.5px', color: 'var(--green)', textAlign: 'center' }}>
                    Print dialog opened — save as PDF from your browser.
                  </div>
                )}

                <button className="btn btn-ghost" onClick={reset} style={{ width: '100%', justifyContent: 'center' }}>
                  Start Over
                </button>
              </div>
            )}
          </div>

          <div className="wz-panel-footer">
            <button
              className="btn btn-ghost"
              disabled={step === 1}
              onClick={() => setStep(s => s - 1)}
            >
              Back
            </button>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Step {step} of 3</span>
            {step < 3 ? (
              <button
                className="btn btn-primary"
                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                onClick={() => setStep(s => s + 1)}
              >
                Continue
              </button>
            ) : (
              <button className="btn btn-primary" onClick={exportPDF}>
                Export PDF
              </button>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div className="wz-preview-panel">
          <div className="wz-preview-head">
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Live Preview</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {doc && (
                <span className="tag tag-accent" style={{ fontSize: '10px' }}>
                  {doc.sections.length} sections
                </span>
              )}
              {doc && (
                <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={exportPDF}>
                  Export PDF
                </button>
              )}
            </div>
          </div>
          <div className="wz-preview-body">
            <PolicyPreviewDoc doc={doc} />
          </div>
        </div>
      </div>
    </div>
  );
}
