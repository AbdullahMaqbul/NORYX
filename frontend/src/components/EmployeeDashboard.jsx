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
        <span style={{ fontSize: '20px', fontWeight: 700, color, letterSpacing: '-0.02em' }}>{pct}%</span>
        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Compliance</span>
      </div>
    </div>
  );
}

export default function EmployeeDashboard({ departmentId, departmentName }) {
  const [stats, setStats]       = useState(null);
  const [controls, setControls] = useState([]);
  const [evidence, setEvidence] = useState([]);

  const load = useCallback(() => {
    if (!departmentId) return;
    fetch(`${API}/dashboard/stats/${departmentId}`).then(r => r.json()).then(setStats).catch(() => {});
    fetch(`${API}/departments/${departmentId}/controls`).then(r => r.json()).then(setControls).catch(() => {});
    fetch(`${API}/evidence/`).then(r => r.json()).then(all => {
      setEvidence(all.filter(e => e.department_id === departmentId));
    }).catch(() => {});
  }, [departmentId]);

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

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
    </div>
  );
}
