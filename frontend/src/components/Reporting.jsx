import React, { useState, useEffect, useMemo } from 'react';

const API = 'http://localhost:8000';

function fmtPct(n) {
  const v = Number(n || 0);
  return `${v.toFixed(v % 1 === 0 ? 0 : 1)}%`;
}

function riskScore(impact, likelihood) {
  const m = { High: 3, Medium: 2, Low: 1 };
  return (m[impact] || 1) * (m[likelihood] || 1);
}

function riskLevel(score) {
  if (score >= 7) return { label: 'Critical', css: 'badge-fail',   hex: '#f05252' };
  if (score >= 5) return { label: 'High',     css: 'badge-fail',   hex: '#f6b53e' };
  if (score >= 3) return { label: 'Medium',   css: 'badge-review', hex: '#2bb8a5' };
  return               { label: 'Low',      css: 'badge-pass',   hex: '#46d97d' };
}

function impactBadge(v) {
  return v === 'High' ? 'badge-fail' : v === 'Medium' ? 'badge-review' : 'badge-pass';
}

function buildReportHTML(stats, risks, taskSummary, reportDate) {
  const compliance   = stats?.overall_compliance ?? 0;
  const totalEv      = stats?.total_evidence ?? 0;
  const totalPass    = stats?.total_pass ?? 0;
  const totalFail    = stats?.total_fail ?? 0;
  const totalReview  = stats?.total_review ?? 0;
  const deptStats    = Array.isArray(stats?.department_stats)      ? stats.department_stats      : [];
  const topFailing   = Array.isArray(stats?.top_failing_controls)  ? stats.top_failing_controls  : [];
  const openRisks    = risks.filter(r => r.status === 'Open');
  const closedRisks  = risks.filter(r => r.status !== 'Open');
  const critRisks    = openRisks.filter(r => riskScore(r.impact, r.likelihood) >= 7);
  const highRisks    = openRisks.filter(r => { const s = riskScore(r.impact, r.likelihood); return s >= 5 && s < 7; });
  const overdueTasks = taskSummary.reduce((a, d) => a + (d.overdue || 0), 0);
  const totalTasks   = taskSummary.reduce((a, d) => a + (d.total   || 0), 0);
  const doneTasks    = taskSummary.reduce((a, d) => a + (d.completed || 0), 0);

  const TEAL  = '#2bb8a5';
  const GREEN = '#27a85a';
  const RED   = '#e0433a';
  const YEL   = '#c9921a';
  const GRAY  = '#6b7280';
  const compColor = compliance >= 75 ? GREEN : compliance >= 50 ? YEL : RED;

  const badge = (label, color, bg) =>
    `<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:8pt;font-weight:700;background:${bg};color:${color};border:1px solid ${color}33">${label}</span>`;

  const deptRows = deptStats.length
    ? deptStats.map(d => {
        const pct = Number(d.compliance_pct || 0);
        const col = pct >= 75 ? GREEN : pct >= 50 ? YEL : RED;
        return `<tr>
          <td style="font-weight:600">${d.department_name || '—'}</td>
          <td style="text-align:right;font-weight:800;color:${col}">${fmtPct(pct)}</td>
          <td style="text-align:right;color:${GREEN};font-weight:600">${d.pass ?? '—'}</td>
          <td style="text-align:right;color:${RED};font-weight:600">${d.fail ?? '—'}</td>
          <td style="text-align:right;color:${GRAY}">${d.total_controls ?? '—'}</td>
          <td style="min-width:100px">
            <div style="height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${Math.max(0,Math.min(100,pct))}%;background:${col};border-radius:4px"></div>
            </div>
          </td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:22px">No department data available</td></tr>`;

  const failRows = topFailing.length
    ? topFailing.slice(0, 12).map((c, i) => `<tr>
        <td style="color:${GRAY};font-size:9pt;text-align:center">${i + 1}</td>
        <td style="font-weight:600">${c.control_name || '—'}</td>
        <td style="color:${GRAY}">${c.category || 'General'}</td>
        <td style="text-align:center">${badge(c.fail_count + ' failures', RED, RED + '15')}</td>
      </tr>`).join('')
    : `<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:22px">No failing controls recorded</td></tr>`;

  const riskRows = openRisks.length
    ? openRisks.map(r => {
        const s = riskScore(r.impact, r.likelihood);
        const lv = riskLevel(s);
        const lvCol = lv.hex;
        const impCol = r.impact === 'High' ? RED : r.impact === 'Medium' ? YEL : GREEN;
        const lkCol  = r.likelihood === 'High' ? RED : r.likelihood === 'Medium' ? YEL : GREEN;
        return `<tr>
          <td style="font-weight:600">${r.title || '—'}</td>
          <td>${badge(r.impact || '—', impCol, impCol + '18')}</td>
          <td>${badge(r.likelihood || '—', lkCol, lkCol + '18')}</td>
          <td>${badge(lv.label, lvCol, lvCol + '18')}</td>
          <td style="color:#4b5563;font-size:8.5pt">${r.mitigation_strategy || '<em style="color:#9ca3af">Not recorded</em>'}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:22px">No open risks — risk register is clear</td></tr>`;

  const taskRows = taskSummary.length
    ? taskSummary.map(d => {
        const pct = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
        const col  = pct >= 75 ? GREEN : pct >= 50 ? YEL : RED;
        return `<tr>
          <td style="font-weight:600">${d.department_name || '—'}</td>
          <td style="text-align:center">${d.total ?? 0}</td>
          <td style="text-align:center;color:${GREEN};font-weight:700">${d.completed ?? 0}</td>
          <td style="text-align:center;color:#3b82f6;font-weight:600">${d.in_progress ?? 0}</td>
          <td style="text-align:center;color:${YEL};font-weight:600">${d.pending ?? 0}</td>
          <td style="text-align:center;color:${RED};font-weight:700">${d.overdue ?? 0}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="flex:1;height:7px;background:#e5e7eb;border-radius:4px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${col};border-radius:4px"></div>
              </div>
              <span style="font-size:8.5pt;font-weight:700;color:${col};min-width:28px">${pct}%</span>
            </div>
          </td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:22px">No task data available</td></tr>`;

  const kpi = (val, label, col) => `
    <div style="text-align:center;padding:14px 10px;border:1.5px solid #e5e7eb;border-radius:10px;background:#fff">
      <div style="font-size:22pt;font-weight:900;color:${col};line-height:1;margin-bottom:4px">${val}</div>
      <div style="font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:${GRAY}">${label}</div>
    </div>`;

  const sec = (num, title) => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:8px;border-bottom:2.5px solid ${TEAL}">
      <div style="width:26px;height:26px;border-radius:50%;background:${TEAL};color:#fff;display:flex;align-items:center;justify-content:center;font-size:9pt;font-weight:900;flex-shrink:0">${num}</div>
      <div style="font-size:13pt;font-weight:900;color:#111827;letter-spacing:-0.01em">${title}</div>
    </div>`;

  const findings = [
    compliance >= 75
      ? `Overall compliance stands at <strong>${fmtPct(compliance)}</strong>, exceeding the 75% benchmark. The organization maintains a <strong>Good</strong> compliance posture.`
      : compliance >= 50
      ? `Overall compliance is at <strong>${fmtPct(compliance)}</strong>. Focused remediation is required to reach the 75% organizational target.`
      : `<strong>Urgent action required</strong>: Overall compliance of ${fmtPct(compliance)} is below the minimum acceptable threshold. Immediate intervention is needed.`,
    openRisks.length > 0
      ? `The risk register contains <strong>${openRisks.length} open risk(s)</strong>, of which ${critRisks.length} are Critical and ${highRisks.length} are High severity. Immediate mitigation is recommended for critical items.`
      : `The risk register is clear — no open risks are currently recorded.`,
    deptStats.length > 0
      ? `<strong>${deptStats.filter(d => Number(d.compliance_pct || 0) >= 75).length} of ${deptStats.length} departments</strong> have achieved compliance above the 75% benchmark.`
      : null,
    topFailing.length > 0
      ? `The highest-failure control area is <strong>${topFailing[0]?.control_name}</strong> (${topFailing[0]?.fail_count} failures). Remediation here will have the greatest impact on overall compliance.`
      : null,
    overdueTasks > 0
      ? `<strong>${overdueTasks} task(s)</strong> are overdue across departments. Escalation and replanning is recommended to prevent compliance gaps.`
      : `All tracked tasks are within their deadlines — no overdue items.`,
  ].filter(Boolean).map(t => `<li style="padding:5px 0 5px 18px;position:relative;font-size:9.5pt;color:#374151;border-bottom:1px solid #f3f4f6"><span style="position:absolute;left:2px;color:${TEAL};font-weight:900">›</span>${t}</li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Noryx Compliance &amp; Risk Report</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; color: #1f2937; background: #fff; line-height: 1.55; }
  @page { size: A4; margin: 1.9cm 1.6cm 2.2cm; }
  @page :first { margin-top: 0; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

  /* Cover */
  .cover { min-height: 100vh; display: flex; flex-direction: column; page-break-after: always; }
  .cover-band { background: ${TEAL}; padding: 36px 44px 32px; color: #fff; }
  .cover-logo { font-size: 28pt; font-weight: 900; letter-spacing: -0.04em; }
  .cover-logo span { font-weight: 300; opacity: 0.65; font-size: 16pt; margin-left: 8px; letter-spacing: 0; }
  .cover-tagline { font-size: 8pt; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.75; margin-top: 4px; }
  .cover-body { flex: 1; padding: 36px 44px; }
  .cover-eyebrow { display: inline-flex; align-items: center; gap: 7px; padding: 5px 12px; background: ${TEAL}18; color: ${TEAL}; border-radius: 100px; font-size: 8.5pt; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 18px; border: 1px solid ${TEAL}33; }
  .cover-title { font-size: 30pt; font-weight: 900; color: #111827; letter-spacing: -0.03em; line-height: 1.05; margin-bottom: 10px; }
  .cover-sub { font-size: 11pt; color: ${GRAY}; margin-bottom: 32px; max-width: 460px; }
  .cover-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; max-width: 420px; margin-bottom: 32px; }
  .meta-k { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 2px; }
  .meta-v { font-size: 10pt; font-weight: 700; color: #111827; }
  .cover-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 480px; }
  .cover-foot { padding: 16px 44px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
  .cover-foot-note { font-size: 7.5pt; color: #9ca3af; }
  .cover-foot-class { font-size: 7.5pt; font-weight: 700; padding: 3px 10px; border-radius: 4px; background: #fef9c3; color: #854d0e; border: 1px solid #fde047; }

  /* Sections */
  section { margin-bottom: 26px; page-break-inside: avoid; }
  section.pb { page-break-before: always; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  thead tr { background: #f9fafb; }
  th { text-align: left; padding: 8px 10px; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${GRAY}; border-bottom: 2px solid #e5e7eb; }
  td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  tbody tr:last-child td { border-bottom: none; }
  .tw { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }

  .exec-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
  .ek { text-align: center; padding: 12px 10px; border: 1.5px solid #e5e7eb; border-radius: 9px; }
  .ek-val { font-size: 20pt; font-weight: 900; line-height: 1; margin-bottom: 3px; }
  .ek-lbl { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; color: ${GRAY}; }

  .findings { list-style: none; padding: 0; }
  .findings li { padding: 6px 0 6px 18px; position: relative; font-size: 9.5pt; color: #374151; border-bottom: 1px solid #f3f4f6; }
  .findings li::before { content: '›'; position: absolute; left: 2px; color: ${TEAL}; font-weight: 900; font-size: 11pt; line-height: 1; }

  .risk-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
  .rk { text-align: center; padding: 12px 10px; border-radius: 9px; border: 1.5px solid #e5e7eb; }
  .rk-val { font-size: 18pt; font-weight: 900; line-height: 1; margin-bottom: 3px; }
  .rk-lbl { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${GRAY}; }

  .rep-footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 7.5pt; color: #9ca3af; }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-band">
    <div class="cover-logo">NORYX<span>GRC Platform</span></div>
    <div class="cover-tagline">Governance · Risk · Compliance</div>
  </div>
  <div class="cover-body">
    <div class="cover-eyebrow">
      <span style="width:6px;height:6px;border-radius:50%;background:${TEAL};flex-shrink:0"></span>
      Official Compliance Report
    </div>
    <div class="cover-title">Compliance &amp;<br/>Risk Report</div>
    <div class="cover-sub">A comprehensive summary of compliance posture, risk exposure, control coverage, and operational task status across all departments.</div>
    <div class="cover-meta">
      <div><div class="meta-k">Report Date</div><div class="meta-v">${reportDate}</div></div>
      <div><div class="meta-k">Classification</div><div class="meta-v">Internal — Confidential</div></div>
      <div><div class="meta-k">Departments</div><div class="meta-v">${deptStats.length} covered</div></div>
      <div><div class="meta-k">Generated By</div><div class="meta-v">Noryx Platform v2.0</div></div>
    </div>
    <div class="cover-kpis">
      ${kpi(fmtPct(compliance), 'Compliance', compColor)}
      ${kpi(openRisks.length, 'Open Risks', openRisks.length > 0 ? RED : GREEN)}
      ${kpi(overdueTasks, 'Overdue Tasks', overdueTasks > 0 ? YEL : GREEN)}
      ${kpi(totalEv, 'Evidence Items', TEAL)}
    </div>
  </div>
  <div class="cover-foot">
    <div class="cover-foot-note">This document is confidential and intended solely for internal organizational use. Do not distribute externally.</div>
    <div class="cover-foot-class">INTERNAL USE ONLY</div>
  </div>
</div>

<!-- S1: EXECUTIVE SUMMARY -->
<section>
  ${sec(1, 'Executive Summary')}
  <div class="exec-kpis">
    <div class="ek"><div class="ek-val" style="color:${compColor}">${fmtPct(compliance)}</div><div class="ek-lbl">Overall Compliance</div></div>
    <div class="ek"><div class="ek-val" style="color:${GREEN}">${totalPass}</div><div class="ek-lbl">Evidence Passed</div></div>
    <div class="ek"><div class="ek-val" style="color:${RED}">${totalFail}</div><div class="ek-lbl">Evidence Failed</div></div>
    <div class="ek"><div class="ek-val" style="color:${YEL}">${totalReview}</div><div class="ek-lbl">Pending Review</div></div>
  </div>
  <div style="margin-bottom:14px">
    <div style="display:flex;justify-content:space-between;font-size:8pt;color:${GRAY};margin-bottom:5px">
      <span>Compliance Progress</span><span style="font-weight:800;color:${compColor}">${fmtPct(compliance)}</span>
    </div>
    <div style="height:11px;background:#e5e7eb;border-radius:6px;overflow:hidden">
      <div style="height:100%;width:${Math.max(0,Math.min(100,compliance))}%;background:${compColor};border-radius:6px"></div>
    </div>
  </div>
  <ul class="findings">${findings}</ul>
</section>

<!-- S2: DEPARTMENT COMPLIANCE -->
<section class="pb">
  ${sec(2, 'Department Compliance Breakdown')}
  <div class="tw">
    <table>
      <thead><tr><th>Department</th><th style="text-align:right">Compliance</th><th style="text-align:right">Passed</th><th style="text-align:right">Failed</th><th style="text-align:right">Controls</th><th style="min-width:110px">Progress</th></tr></thead>
      <tbody>${deptRows}</tbody>
    </table>
  </div>
</section>

<!-- S3: CRITICAL CONTROLS -->
<section>
  ${sec(3, 'Critical Control Failures')}
  <div class="tw">
    <table>
      <thead><tr><th style="width:28px">#</th><th>Control Name</th><th>Category</th><th style="text-align:center">Failures</th></tr></thead>
      <tbody>${failRows}</tbody>
    </table>
  </div>
</section>

<!-- S4: RISK REGISTER -->
<section class="pb">
  ${sec(4, 'Risk Register')}
  <div class="risk-kpis">
    <div class="rk" style="border-color:${RED}33;background:${RED}08"><div class="rk-val" style="color:${RED}">${openRisks.length}</div><div class="rk-lbl">Open Risks</div></div>
    <div class="rk" style="border-color:${GREEN}33;background:${GREEN}08"><div class="rk-val" style="color:${GREEN}">${closedRisks.length}</div><div class="rk-lbl">Closed Risks</div></div>
    <div class="rk" style="border-color:${RED}33;background:${RED}08"><div class="rk-val" style="color:${RED}">${critRisks.length}</div><div class="rk-lbl">Critical</div></div>
    <div class="rk" style="border-color:${YEL}33;background:${YEL}08"><div class="rk-val" style="color:${YEL}">${highRisks.length}</div><div class="rk-lbl">High</div></div>
  </div>
  <div class="tw">
    <table>
      <thead><tr><th>Risk Title</th><th>Impact</th><th>Likelihood</th><th>Level</th><th>Mitigation Strategy</th></tr></thead>
      <tbody>${riskRows}</tbody>
    </table>
  </div>
</section>

<!-- S5: TASK STATUS -->
<section>
  ${sec(5, 'Task Status by Department')}
  <div class="tw">
    <table>
      <thead><tr><th>Department</th><th style="text-align:center">Total</th><th style="text-align:center">Completed</th><th style="text-align:center">In Progress</th><th style="text-align:center">Pending</th><th style="text-align:center">Overdue</th><th style="min-width:110px">Completion</th></tr></thead>
      <tbody>${taskRows}</tbody>
    </table>
  </div>
</section>

<div class="rep-footer">
  <span>Noryx Compliance &amp; Risk Report &nbsp;|&nbsp; Generated ${reportDate} &nbsp;|&nbsp; Platform v2.0</span>
  <span>CONFIDENTIAL — Internal Use Only</span>
</div>

</body>
</html>`;
}

export default function Reporting() {
  const [stats,       setStats]       = useState(null);
  const [risks,       setRisks]       = useState([]);
  const [taskSummary, setTaskSummary] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);
  const [lastGen,     setLastGen]     = useState(null);

  const reportDate = useMemo(() =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), []);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/dashboard/stats`).then(r => r.json()).catch(() => null),
      fetch(`${API}/risks/`).then(r => r.json()).catch(() => []),
      fetch(`${API}/tasks/summary`).then(r => r.json()).catch(() => []),
    ]).then(([s, r, t]) => {
      setStats(s);
      setRisks(Array.isArray(r) ? r : []);
      setTaskSummary(Array.isArray(t) ? t : []);
    }).finally(() => setLoading(false));
  }, []);

  const compliance   = stats?.overall_compliance ?? 0;
  const totalEv      = stats?.total_evidence ?? 0;
  const totalPass    = stats?.total_pass ?? 0;
  const totalFail    = stats?.total_fail ?? 0;
  const deptStats    = useMemo(() => Array.isArray(stats?.department_stats)     ? stats.department_stats     : [], [stats]);
  const topFailing   = useMemo(() => Array.isArray(stats?.top_failing_controls) ? stats.top_failing_controls : [], [stats]);
  const openRisks    = useMemo(() => risks.filter(r => r.status === 'Open'),  [risks]);
  const overdueTasks = useMemo(() => taskSummary.reduce((a, d) => a + (d.overdue || 0), 0), [taskSummary]);
  const compColor    = compliance >= 75 ? 'var(--green)' : compliance >= 50 ? 'var(--yellow)' : 'var(--red)';

  const generatePDF = () => {
    setGenerating(true);
    const html = buildReportHTML(stats, risks, taskSummary, reportDate);
    const w = window.open('', '_blank');
    if (!w) { alert('Please allow pop-ups to export the report.'); setGenerating(false); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      setGenerating(false);
      setLastGen(new Date().toLocaleTimeString());
    }, 800);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div className="g4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card card-sm" style={{ height: '74px', opacity: 0.45 }} />
          ))}
        </div>
        <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', padding: '40px 0' }}>
          Loading report data…
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* KPI row */}
      <div className="g4">
        {[
          { label: 'Overall Compliance', value: fmtPct(compliance), color: compColor },
          { label: 'Evidence Passed',    value: totalPass,          color: 'var(--green)' },
          { label: 'Evidence Failed',    value: totalFail,          color: totalFail > 0 ? 'var(--red)' : 'var(--green)' },
          { label: 'Open Risks',         value: openRisks.length,   color: openRisks.length > 0 ? 'var(--red)' : 'var(--green)' },
        ].map(k => (
          <div className="card card-sm" key={k.label}>
            <div className="card-label">{k.label}</div>
            <div className="card-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Compliance bar */}
      <div className="card card-sm" style={{ gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>Overall Compliance Progress</span>
          <span style={{ fontWeight: 800, color: compColor, fontSize: '15px' }}>{fmtPct(compliance)}</span>
        </div>
        <div className="progress" style={{ height: '10px' }}>
          <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, compliance))}%`, background: compColor, transition: 'width 1s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: '18px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
          <span style={{ color: 'var(--green)' }}>{totalPass} passed</span>
          <span style={{ color: 'var(--red)' }}>{totalFail} failed</span>
          <span>{totalEv} total evidence</span>
          <span>{deptStats.length} departments</span>
        </div>
      </div>

      {/* Department + Generate panel */}
      <div className="g2-wide">
        {/* Department compliance */}
        <div className="card">
          <div className="sec-head">
            <div className="sec-title">Department Compliance</div>
            <span className="tag">{deptStats.length} departments</span>
          </div>
          {deptStats.length === 0 ? (
            <div className="empty"><div className="empty-title">No department data</div><div className="empty-sub">Submit evidence to see department metrics</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[...deptStats].sort((a, b) => b.compliance_pct - a.compliance_pct).map(d => {
                const pct = Number(d.compliance_pct || 0);
                const col = pct >= 75 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';
                return (
                  <div key={d.department_id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600 }}>{d.department_name}</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: col }}>{fmtPct(pct)}</span>
                    </div>
                    <div className="progress" style={{ height: '7px', marginBottom: '4px' }}>
                      <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: col }} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
                      <span style={{ color: 'var(--green)' }}>{d.pass ?? 0} passed</span>
                      <span style={{ color: 'var(--red)' }}>{d.fail ?? 0} failed</span>
                      <span>{d.total_controls ?? 0} controls</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Top failing controls */}
          <div className="card" style={{ flex: 1 }}>
            <div className="sec-head">
              <div className="sec-title">Top Failing Controls</div>
              {topFailing.length > 0 && <span className="badge badge-fail">{topFailing.length}</span>}
            </div>
            {topFailing.length === 0 ? (
              <div className="empty" style={{ padding: '16px 0' }}>
                <div className="empty-title" style={{ fontSize: '12px' }}>No failures recorded</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {topFailing.slice(0, 7).map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', minWidth: '16px' }}>{i + 1}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '11.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>{c.control_name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{c.category || 'General'}</div>
                      </div>
                    </div>
                    <span className="badge badge-fail" style={{ flexShrink: 0, fontSize: '10px' }}>{c.fail_count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generate report card */}
          <div className="card">
            <div className="sec-head">
              <div className="sec-title">Export Report</div>
              <span className="tag tag-accent">PDF</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.55 }}>
              Generate a professional multi-section PDF report with cover page, executive summary, department analytics, risk register, and task status.
            </p>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', gap: '8px', padding: '11px' }}
              onClick={generatePDF}
              disabled={generating}
            >
              {generating ? (
                <>
                  <svg className="spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Compiling Report…
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download Professional Report
                </>
              )}
            </button>
            {lastGen && (
              <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '8px' }}>
                Last exported at {lastGen}
              </div>
            )}
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {['Cover page with KPI summary', 'Executive findings narrative', 'Department compliance table', 'Critical control failures', 'Full risk register', 'Task status by department'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--green)', fontSize: '10px', fontWeight: 700 }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Risk register preview */}
      {openRisks.length > 0 && (
        <div className="card">
          <div className="sec-head">
            <div className="sec-title">Open Risk Register</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { label: `${openRisks.filter(r => riskScore(r.impact, r.likelihood) >= 7).length} Critical`, cls: 'badge-fail' },
                { label: `${openRisks.filter(r => { const s = riskScore(r.impact, r.likelihood); return s >= 5 && s < 7; }).length} High`, cls: 'badge-review' },
              ].map(b => <span key={b.label} className={`badge ${b.cls}`} style={{ fontSize: '10px' }}>{b.label}</span>)}
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Risk</th>
                  <th>Impact</th>
                  <th>Likelihood</th>
                  <th>Level</th>
                  <th>Mitigation Strategy</th>
                </tr>
              </thead>
              <tbody>
                {openRisks.slice(0, 10).map(r => {
                  const lv = riskLevel(riskScore(r.impact, r.likelihood));
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600, fontSize: '12px' }}>{r.title}</td>
                      <td><span className={`badge ${impactBadge(r.impact)}`}>{r.impact}</span></td>
                      <td><span className={`badge ${impactBadge(r.likelihood)}`}>{r.likelihood}</span></td>
                      <td>
                        <span className="badge" style={{ background: lv.hex + '20', color: lv.hex, border: `1px solid ${lv.hex}40`, fontSize: '10px' }}>
                          {lv.label}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '11.5px', maxWidth: '300px' }}>
                        {r.mitigation_strategy || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Not recorded</span>}
                      </td>
                    </tr>
                  );
                })}
                {openRisks.length > 10 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11.5px' }}>
                      +{openRisks.length - 10} more risks included in the exported report
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task summary */}
      {taskSummary.length > 0 && (
        <div className="card">
          <div className="sec-head">
            <div className="sec-title">Task Status by Department</div>
            {overdueTasks > 0 && <span className="badge badge-fail">{overdueTasks} overdue</span>}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Department</th>
                  <th style={{ textAlign: 'center' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Done</th>
                  <th style={{ textAlign: 'center' }}>Pending</th>
                  <th style={{ textAlign: 'center' }}>Overdue</th>
                  <th style={{ minWidth: '120px' }}>Completion</th>
                </tr>
              </thead>
              <tbody>
                {taskSummary.map((d, i) => {
                  const pct = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
                  const col = pct >= 75 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';
                  return (
                    <tr key={d.department_id ?? i}>
                      <td style={{ fontWeight: 600 }}>{d.department_name}</td>
                      <td style={{ textAlign: 'center' }}>{d.total ?? 0}</td>
                      <td style={{ textAlign: 'center', color: 'var(--green)', fontWeight: 700 }}>{d.completed ?? 0}</td>
                      <td style={{ textAlign: 'center', color: 'var(--yellow)', fontWeight: 600 }}>{d.pending ?? 0}</td>
                      <td style={{ textAlign: 'center', color: (d.overdue ?? 0) > 0 ? 'var(--red)' : 'var(--text-secondary)', fontWeight: 700 }}>{d.overdue ?? 0}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="progress" style={{ flex: 1 }}>
                            <div className="progress-fill" style={{ width: `${pct}%`, background: col }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: col, minWidth: '32px' }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
