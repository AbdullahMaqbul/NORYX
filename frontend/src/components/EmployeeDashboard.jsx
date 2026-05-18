import React, { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:8000';

function ProgressBar({ value, color = 'var(--green)' }) {
  return (
    <div className="progress">
      <div className="progress-fill" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

function RingGauge({ pct, size = 120 }) {
  const r = (size / 2) - 16, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--red)';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth="8"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '20px', fontWeight: 700, color, letterSpacing: 0 }}>{pct}%</span>
        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Compliance</span>
      </div>
    </div>
  );
}

const SEV = {
  Critical: { color: '#f05252', bg: 'rgba(240,82,82,0.09)',  border: 'rgba(240,82,82,0.25)' },
  High:     { color: '#f6b53e', bg: 'rgba(246,181,62,0.09)', border: 'rgba(246,181,62,0.25)' },
  Medium:   { color: '#2dd4bf', bg: 'rgba(45,212,191,0.09)', border: 'rgba(45,212,191,0.25)' },
  Low:      { color: '#22d46e', bg: 'rgba(34,212,110,0.09)', border: 'rgba(34,212,110,0.25)' },
};

function SevPill({ label }) {
  const c = SEV[label] || SEV.Low;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 9999,
      fontSize: 10.5, fontWeight: 700,
      color: c.color, background: c.bg, border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color, boxShadow: `0 0 5px ${c.color}` }} />
      {label}
    </span>
  );
}

function StatusBadge({ tone, children }) {
  const palette = {
    active:    { color: '#f05252', bg: 'rgba(240,82,82,0.10)', border: 'rgba(240,82,82,0.28)' },
    monitor:   { color: '#f6b53e', bg: 'rgba(246,181,62,0.10)', border: 'rgba(246,181,62,0.28)' },
    mitigated: { color: '#22d46e', bg: 'rgba(34,212,110,0.10)', border: 'rgba(34,212,110,0.28)' },
  }[tone] || { color: 'var(--text-tertiary)', bg: 'var(--surface-3)', border: 'var(--border-light)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 9999,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
      color: palette.color, background: palette.bg, border: `1px solid ${palette.border}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: palette.color }} />
      {children}
    </span>
  );
}

function ThreatRow({ threat }) {
  const [open, setOpen] = useState(false);
  const c = SEV[threat.severity_label] || SEV.Low;
  const ncaDomain = (threat.nca_domains && threat.nca_domains[0]) || threat.tactic || 'Unmapped';
  const risk = (threat.combined_score * 100).toFixed(0);

  return (
    <div style={{
      borderRadius: 'var(--radius-sm)',
      border: `1px solid ${open ? c.border : 'var(--border)'}`,
      background: open ? c.bg : 'var(--surface-2)',
      transition: 'all 0.18s',
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', cursor: 'pointer' }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 6, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: c.bg, border: `1px solid ${c.border}`,
          fontSize: 14, fontWeight: 800, color: c.color,
        }}>{Number(threat.severity_score).toFixed(1)}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: c.color, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              {threat.sub_id || threat.technique_id}
            </span>
            <SevPill label={threat.severity_label} />
            <StatusBadge tone="active">Active</StatusBadge>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {threat.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{threat.triggered_by}</span>
            <span> · {ncaDomain}</span>
            {threat.fail_count ? <span> · {threat.fail_count} failure{threat.fail_count !== 1 ? 's' : ''}</span> : null}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: c.color, lineHeight: 1 }}>{risk}</div>
          <div style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>
            Risk
          </div>
        </div>

        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${c.border}`, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {threat.description && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
              {threat.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(34,212,110,0.06)', border: '1px solid rgba(34,212,110,0.16)', borderRadius: 'var(--radius-sm)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>Recommended Action</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{threat.mitigation}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ThreatIntelligenceSection({ departmentId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const load = useCallback(() => {
    if (!departmentId) return;
    fetch(`${API}/dashboard/threats?department_id=${departmentId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [departmentId]);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  if (loading) {
    return (
      <div className="card">
        <div className="sec-head">
          <div className="sec-title">Threat Intelligence</div>
        </div>
        <div className="empty" style={{ padding: '24px' }}>
          <div className="empty-sub">Analyzing threat intelligence…</div>
        </div>
      </div>
    );
  }

  const threats = data?.threats || [];
  const sevCounts = data?.severity_counts || { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const filters = ['All', 'Critical', 'High', 'Medium', 'Low'];
  const visible = filter === 'All' ? threats : threats.filter(t => t.severity_label === filter);

  return (
    <div className="card">
      <div className="sec-head">
        <div className="sec-title">Threat Intelligence</div>
        <span className="tag">{threats.length} active</span>
      </div>

      {threats.length === 0 ? (
        <div className="empty" style={{ padding: '32px 16px' }}>
          <div style={{ color: 'var(--green)', marginBottom: 10 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
          </div>
          <div className="empty-title" style={{ color: 'var(--green)' }}>No active threats</div>
          <div className="empty-sub">Your assigned controls are compliant — no threats triggered</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, marginRight: 4 }}>Filter:</span>
            {filters.map(f => {
              const active = filter === f;
              const c = f !== 'All' ? SEV[f] : null;
              return (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '3px 11px', borderRadius: 9999, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  border: active ? `1px solid ${c ? c.border : 'var(--accent-border)'}` : '1px solid var(--border)',
                  background: active ? (c ? c.bg : 'var(--accent-dim)') : 'transparent',
                  color: active ? (c ? c.color : 'var(--accent-bright)') : 'var(--text-tertiary)',
                  transition: 'all 0.13s',
                }}>
                  {f}{f !== 'All' && (sevCounts[f] ?? 0) > 0 && <span style={{ marginLeft: 5, opacity: 0.7 }}>({sevCounts[f]})</span>}
                </button>
              );
            })}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-tertiary)' }}>
              click any row for mitigation
            </span>
          </div>

          {visible.length === 0 ? (
            <div className="empty" style={{ padding: '24px' }}>
              <div className="empty-title">No {filter} severity threats</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visible.map((t, i) => (
                <ThreatRow key={`${t.technique_id}-${i}`} threat={t} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function EmployeeDashboard({ departmentId, departmentName }) {
  const [stats, setStats]       = useState(null);
  const [controls, setControls] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [sentBack, setSentBack] = useState([]);

  const load = useCallback(() => {
    if (!departmentId) return;
    fetch(`${API}/dashboard/stats/${departmentId}`).then(r => r.json()).then(setStats).catch(() => {});
    fetch(`${API}/departments/${departmentId}/controls`).then(r => r.json()).then(setControls).catch(() => {});
    fetch(`${API}/evidence/`).then(r => r.json()).then(all => {
      setEvidence(all.filter(e => e.department_id === departmentId));
    }).catch(() => {});
    fetch(`${API}/departments/${departmentId}/sent-back`).then(r => r.json()).then(setSentBack).catch(() => {});
  }, [departmentId]);

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Drop this evidence submission? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API}/evidence/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      load();
    } catch (err) {
      alert(`Could not delete: ${err.message || err}`);
    }
  };

  if (!stats) return (
    <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
      Loading dashboard…
    </div>
  );

  const pct = stats.overall_compliance || 0;
  const complianceColor = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--red)';
  const kpis = [
    { label: 'Compliance',     value: `${pct}%`,                color: complianceColor,       accent: pct >= 70 ? 'kpi-card-green' : pct >= 40 ? 'kpi-card-yellow' : 'kpi-card-red' },
    { label: 'Total Evidence', value: stats.total_evidence || 0, color: 'var(--text-primary)', accent: 'kpi-card-accent' },
    { label: 'Passed',         value: stats.total_pass || 0,     color: 'var(--green)',        accent: 'kpi-card-green' },
    { label: 'Failed',         value: stats.total_fail || 0,     color: 'var(--red)',          accent: 'kpi-card-red'   },
  ];

  const assignedControls = controls.length;
  const submittedControlIds = new Set(evidence.map(e => e.control_id));
  const pendingControls = controls.filter(c => !submittedControlIds.has(c.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* Department header */}
      <div className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 22V12h6v10M3 9h18"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{departmentName}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Department Compliance Dashboard</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <span className="tag">{assignedControls} Controls</span>
          <span className="tag">{stats.total_evidence || 0} Submissions</span>
        </div>
      </div>

      {/* Manager feedback inbox */}
      {sentBack.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--yellow-border)', background: 'var(--yellow-dim)' }}>
          <div className="sec-head">
            <div className="sec-title" style={{ color: 'var(--yellow)' }}>
              {sentBack.length} submission{sentBack.length === 1 ? '' : 's'} sent back by manager
            </div>
            <span className="tag" style={{ background: 'var(--yellow-dim)', color: 'var(--yellow)', borderColor: 'var(--yellow-border)' }}>
              Action required
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sentBack.map(ev => {
              const ctrl = controls.find(c => c.id === ev.control_id);
              return (
                <div key={ev.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '12px 14px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                      {ctrl?.name || `Control #${ev.control_id}`}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {ev.employee_name}
                      {ev.reviewed_by ? ` · reviewed by ${ev.reviewed_by}` : ''}
                      {ev.reviewed_at ? ` · ${new Date(ev.reviewed_at).toLocaleString()}` : ''}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.55,
                    background: 'var(--surface-2)', borderLeft: '3px solid var(--yellow)',
                    padding: '8px 12px', borderRadius: '4px',
                  }}>
                    {ev.manager_comment || 'No comment provided.'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                    Resubmit corrected evidence via <strong>Upload Evidence</strong>.
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="g4">
        {kpis.map(k => (
          <div className={`card card-sm kpi-card ${k.accent}`} key={k.label}>
            <div className="card-label">{k.label}</div>
            <div className="card-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Main row: Ring + Breakdown | Pending Controls */}
      <div className="g2">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <RingGauge pct={pct} />
          <div style={{ flex: 1 }}>
            <div className="sec-title" style={{ marginBottom: '14px' }}>Breakdown</div>
            {[
              { label: 'Passed',      n: stats.total_pass || 0,    color: 'var(--green)' },
              { label: 'Failed',      n: stats.total_fail || 0,    color: 'var(--red)' },
              { label: 'Need Review', n: stats.total_review || 0,  color: 'var(--yellow)' },
            ].map(r => (
              <div key={r.label} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: r.color }}>{r.n}</span>
                </div>
                <ProgressBar value={stats.total_evidence ? (r.n / stats.total_evidence) * 100 : 0} color={r.color} />
              </div>
            ))}
          </div>
        </div>

        {/* Pending controls */}
        <div className="card">
          <div className="sec-head">
            <div className="sec-title">Pending Controls</div>
            <span className="tag" style={pendingControls.length > 0 ? { background: 'var(--yellow-dim)', color: 'var(--yellow)', borderColor: 'var(--yellow-border)' } : {}}>
              {pendingControls.length} remaining
            </span>
          </div>
          {pendingControls.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '240px', overflowY: 'auto' }}>
              {pendingControls.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: 500 }}>{c.name}</span>
                  <span className="tag">{c.category || 'General'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="empty-title" style={{ color: 'var(--green)' }}>All controls have evidence!</div>
              <div className="empty-sub">Great compliance posture</div>
            </div>
          )}
        </div>
      </div>

      {/* Top failing + Recent evidence */}
      <div className="g2">
        <div className="card">
          <div className="sec-head">
            <div className="sec-title">Top Failing Controls</div>
          </div>
          {stats.top_failing_controls?.length ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0 0 8px', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Control</th>
                  <th style={{ textAlign: 'right', padding: '0 0 8px', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Failures</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_failing_controls.map((c, i) => (
                  <tr key={i}>
                    <td style={{ padding: '7px 0', color: 'var(--text-primary)', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>{c.control}</td>
                    <td style={{ textAlign: 'right', padding: '7px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                      <span className="badge badge-fail">{c.fails}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">
              <div className="empty-title" style={{ color: 'var(--green)' }}>No failures recorded</div>
              <div className="empty-sub">Keep up the good work</div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="sec-head">
            <div className="sec-title">Recent Submissions</div>
            <span className="tag">{evidence.length} total</span>
          </div>
          {evidence.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
              {evidence.slice(0, 10).map((e, i) => {
                const s = e.status?.toLowerCase();
                const color = s === 'pass' ? 'var(--green)' : s === 'fail' ? 'var(--red)' : 'var(--yellow)';
                const label = s === 'pass' ? 'Pass' : s === 'fail' ? 'Fail' : 'Review';
                const ctrl = controls.find(c => c.id === e.control_id);
                return (
                  <div key={e.id || i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ctrl?.name || `Control #${e.control_id}`}</div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{e.employee_name} · {e.upload_time ? new Date(e.upload_time).toLocaleDateString() : ''}</div>
                    </div>
                    <span style={{ fontWeight: 700, color, fontSize: '11px' }}>{label}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(e.id)}
                      title="Drop submission"
                      aria-label="Drop submission"
                      style={{
                        background: 'transparent', border: '1px solid var(--border-light)',
                        color: 'var(--text-tertiary)', borderRadius: 'var(--radius-sm)',
                        padding: '4px 6px', cursor: 'pointer', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                      onMouseEnter={(ev) => { ev.currentTarget.style.color = 'var(--red)'; ev.currentTarget.style.borderColor = 'var(--red-border)'; }}
                      onMouseLeave={(ev) => { ev.currentTarget.style.color = 'var(--text-tertiary)'; ev.currentTarget.style.borderColor = 'var(--border-light)'; }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">
              <div className="empty-title">No evidence submitted yet</div>
              <div className="empty-sub">Upload evidence via the Evidence Portal</div>
            </div>
          )}
        </div>
      </div>

      {/* Department-scoped threat intelligence */}
      <ThreatIntelligenceSection departmentId={departmentId} />
    </div>
  );
}
