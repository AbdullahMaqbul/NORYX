import React, { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:8000';

const SEV = {
  Critical: { color: '#f05252', bg: 'rgba(240,82,82,0.09)',  border: 'rgba(240,82,82,0.25)', rank: 4 },
  High:     { color: '#f6b53e', bg: 'rgba(246,181,62,0.09)', border: 'rgba(246,181,62,0.25)', rank: 3 },
  Medium:   { color: '#4f7af8', bg: 'rgba(79,122,248,0.09)', border: 'rgba(79,122,248,0.25)', rank: 2 },
  Low:      { color: '#22d46e', bg: 'rgba(34,212,110,0.09)', border: 'rgba(34,212,110,0.25)', rank: 1 },
};

/* ── tiny reusable pieces ─────────────────────────────────────────────────── */

function Pill({ children, color, bg, border }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 9999,
      fontSize: 10.5, fontWeight: 700,
      color, background: bg, border: `1px solid ${border}`,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function SevBadge({ label }) {
  const c = SEV[label] || SEV.Low;
  return (
    <Pill color={c.color} bg={c.bg} border={c.border}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color, boxShadow: `0 0 5px ${c.color}`, display: 'inline-block' }} />
      {label}
    </Pill>
  );
}

function ScoreBar({ pct, color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {label && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', width: 72, flexShrink: 0 }}>{label}</span>}
      <div style={{ flex: 1, height: 4, borderRadius: 9999, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, pct * 100)}%`, borderRadius: 9999, background: color, transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      <span style={{ fontSize: 10, color, fontWeight: 700, width: 34, textAlign: 'right' }}>{(pct * 100).toFixed(0)}%</span>
    </div>
  );
}

/* ── main threat row ─────────────────────────────────────────────────────── */

function ThreatRow({ threat, rank, maxScore }) {
  const [open, setOpen] = useState(false);
  const c = SEV[threat.severity_label] || SEV.Low;
  const pct = maxScore > 0 ? threat.combined_score / maxScore : 0;

  const apts = threat.apt_groups || [];
  const cves = threat.cve_examples || [];
  const ncaDomains = threat.nca_domains || [];

  return (
    <div
      style={{
        borderRadius: 'var(--radius)',
        border: `1px solid ${open ? c.border : 'var(--border)'}`,
        background: open ? c.bg : 'linear-gradient(160deg,#131725,#111420)',
        transition: 'all 0.18s',
        overflow: 'hidden',
      }}
    >
      {/* ── collapsed header ── */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        {/* rank badge */}
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: c.bg, border: `1px solid ${c.border}`,
          fontSize: 11, fontWeight: 800, color: c.color,
        }}>{rank}</div>

        {/* identity */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: c.color, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              {threat.sub_id || threat.technique_id}
            </span>
            <SevBadge label={threat.severity_label} />
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500 }}>{threat.tactic}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {threat.name}
          </div>
          {/* relevance bar */}
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 3, borderRadius: 9999, background: 'var(--surface-3)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct * 100}%`, borderRadius: 9999, background: c.color, transition: 'width 0.9s' }} />
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', flexShrink: 0 }}>
              score {(threat.combined_score * 100).toFixed(0)}
            </span>
          </div>
        </div>

        {/* CVSS block */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: c.color, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {threat.severity_score.toFixed(1)}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>
            CVSS
          </div>
        </div>

        {/* chevron */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* ── expanded detail ── */}
      {open && (
        <div style={{ borderTop: `1px solid ${c.border}`, padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* context tags */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Pill color="var(--red)" bg="var(--red-dim)" border="var(--red-border)">
              ⚠ {threat.triggered_by}
            </Pill>
            <Pill color="var(--text-secondary)" bg="var(--surface-3)" border="var(--border-light)">
              {threat.department}
            </Pill>
            {threat.fail_count && (
              <Pill color="var(--yellow)" bg="var(--yellow-dim)" border="var(--yellow-border)">
                {threat.fail_count} failure{threat.fail_count !== 1 ? 's' : ''}
              </Pill>
            )}
          </div>

          {/* description */}
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
            {threat.description}
          </p>

          {/* 3-col detail grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>

            {/* APT Groups */}
            {apts.length > 0 && (
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 7 }}>Known APT Groups</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {apts.slice(0, 5).map(g => (
                    <span key={g} style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>• {g}</span>
                  ))}
                  {apts.length > 5 && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>+{apts.length - 5} more</span>}
                </div>
              </div>
            )}

            {/* CVE Examples */}
            {cves.length > 0 && (
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 7 }}>CVE Examples</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {cves.slice(0, 4).map(c => (
                    <span key={c} style={{ fontSize: 10.5, color: 'var(--accent-bright)', fontFamily: 'monospace', fontWeight: 600 }}>
                      {c.split(' ')[0]}
                    </span>
                  ))}
                  {cves.length > 4 && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>+{cves.length - 4} more</span>}
                </div>
              </div>
            )}

            {/* NCA Domains */}
            {ncaDomains.length > 0 && (
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 7 }}>NCA ECC Domains</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {ncaDomains.map(d => (
                    <span key={d} style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent-bright)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', padding: '1px 6px', borderRadius: 4 }}>{d}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI score breakdown */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>
              AI Score Breakdown (BERT + Multi-Factor)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <ScoreBar pct={threat.semantic_sim ?? threat.combined_score} color="var(--purple)"  label="Semantic sim" />
              <ScoreBar pct={threat.severity_score / 10}                  color={c.color}         label="CVSS severity" />
              <ScoreBar pct={threat.prevalence ?? 0.5}                    color="var(--yellow)"   label="Prevalence" />
              <ScoreBar pct={threat.category_bonus ?? 0}                  color="var(--green)"    label="Cat. match" />
            </div>
          </div>

          {/* mitigation */}
          <div style={{ display: 'flex', gap: 10, padding: '11px 13px', background: 'rgba(34,212,110,0.06)', border: '1px solid rgba(34,212,110,0.16)', borderRadius: 'var(--radius-sm)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>Recommended Mitigation</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{threat.mitigation}</div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

/* ── severity summary card ─────────────────────────────────────────────────── */

function SevCard({ label, count, active, onClick }) {
  const c = SEV[label];
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? c.bg : 'linear-gradient(160deg,#131725,#111420)',
        border: `1px solid ${active ? c.border : 'var(--border)'}`,
        borderTop: `2px solid ${c.color}`,
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-tertiary)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: c.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 5 }}>{active ? 'click to clear' : 'click to filter'}</div>
    </div>
  );
}

/* ── main panel ──────────────────────────────────────────────────────────── */

export default function ThreatPanel() {
  const [data,    setData]    = useState(null);
  const [filter,  setFilter]  = useState('All');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch(`${API}/dashboard/threats`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12, color: 'var(--text-tertiary)' }}>
      <span className="spin" style={{ fontSize: 22, color: 'var(--accent)' }}>↻</span>
      <span style={{ fontSize: 13 }}>Analyzing threats with BERT…</span>
    </div>
  );

  if (!data) return null;

  const { threats, severity_counts, total_failed_controls, most_at_risk_department } = data;

  const visible  = filter === 'All' ? threats : threats.filter(t => t.severity_label === filter);
  const maxScore = threats.length > 0 ? Math.max(...threats.map(t => t.combined_score)) : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 4 }}>
            Cyber Threat Intelligence
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
            BERT semantic matching against {threats.length} MITRE ATT&amp;CK techniques &nbsp;·&nbsp;
            {total_failed_controls} non-compliant control{total_failed_controls !== 1 ? 's' : ''} &nbsp;·&nbsp;
            ranked by severity × relevance × real-world prevalence
          </div>
        </div>

        {/* model badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-bright)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
          </svg>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent-bright)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>AI Model</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>BERT v2 · 768-dim</div>
          </div>
        </div>
      </div>

      {/* ── risk alert ── */}
      {most_at_risk_department && threats.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(240,82,82,0.07)', border: '1px solid rgba(240,82,82,0.22)', borderRadius: 'var(--radius)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(240,82,82,0.12)', border: '1px solid rgba(240,82,82,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f05252" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>Highest Risk Department</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginTop: 1 }}>
              {most_at_risk_department} &nbsp;<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)' }}>has the most non-compliant controls and faces the greatest threat exposure</span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f05252', letterSpacing: '-0.03em' }}>{total_failed_controls}</div>
            <div style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>failed controls</div>
          </div>
        </div>
      )}

      {/* ── severity cards ── */}
      <div className="g4">
        {['Critical', 'High', 'Medium', 'Low'].map(label => (
          <SevCard
            key={label}
            label={label}
            count={severity_counts[label] ?? 0}
            active={filter === label}
            onClick={() => setFilter(f => f === label ? 'All' : label)}
          />
        ))}
      </div>

      {/* ── no threats ── */}
      {threats.length === 0 && (
        <div className="card">
          <div className="empty" style={{ padding: '56px 20px' }}>
            <div style={{ color: 'var(--green)', marginBottom: 14 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
            </div>
            <div className="empty-title" style={{ color: 'var(--green)' }}>No active threats detected</div>
            <div className="empty-sub">All controls are compliant — no threat analysis required</div>
          </div>
        </div>
      )}

      {/* ── threat list ── */}
      {threats.length > 0 && (
        <div>
          {/* filter pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, marginRight: 4 }}>Filter:</span>
            {['All', 'Critical', 'High', 'Medium', 'Low'].map(f => {
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
                  {f}
                  {f !== 'All' && (severity_counts[f] ?? 0) > 0 &&
                    <span style={{ marginLeft: 5, opacity: 0.7 }}>({severity_counts[f]})</span>
                  }
                </button>
              );
            })}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-tertiary)' }}>
              {visible.length} threat{visible.length !== 1 ? 's' : ''} · click any row for details
            </span>
          </div>

          {visible.length === 0 ? (
            <div className="card">
              <div className="empty" style={{ padding: '28px' }}>
                <div className="empty-title">No {filter} severity threats</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visible.map((t, i) => (
                <ThreatRow key={`${t.technique_id}-${i}`} threat={t} rank={i + 1} maxScore={maxScore} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
