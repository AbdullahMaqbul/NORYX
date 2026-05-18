import React, { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:8000';

function cellColor(pct) {
  if (pct === null || pct === undefined) return { bg: 'var(--surface-3)', text: 'var(--text-tertiary)', label: '—' };
  if (pct >= 80) return { bg: 'rgba(70,217,125,0.18)',  text: 'var(--green)',  label: `${pct}%` };
  if (pct >= 60) return { bg: 'rgba(70,217,125,0.08)',  text: 'var(--green)',  label: `${pct}%` };
  if (pct >= 40) return { bg: 'rgba(246,181,62,0.18)',  text: 'var(--yellow)', label: `${pct}%` };
  if (pct > 0)   return { bg: 'rgba(240,82,82,0.18)',   text: 'var(--red)',    label: `${pct}%` };
  return               { bg: 'rgba(240,82,82,0.10)',   text: 'var(--red)',    label: '0%' };
}

export default function ComplianceHeatmap() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`${API}/dashboard/heatmap`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Building heatmap…</div>;
  }

  if (!data || !data.departments?.length || !data.categories?.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div className="card">
          <div className="empty">
            <div className="empty-title">No heatmap data available</div>
            <div className="empty-sub">Heatmap data populates as departments submit evidence for controls across different categories. Assign controls with categories to departments and submit evidence to see the compliance matrix.</div>
          </div>
        </div>
      </div>
    );
  }

  const { departments, categories, matrix } = data;

  // Summary stats
  const allVals = matrix.flat().filter(v => v !== null && v !== undefined);
  const avgCompliance = allVals.length ? Math.round(allVals.reduce((a, b) => a + b, 0) / allVals.length) : 0;
  const hotspots = [];
  matrix.forEach((row, di) => {
    row.forEach((val, ci) => {
      if (val !== null && val < 40) {
        hotspots.push({ dept: departments[di].name, cat: categories[ci], val });
      }
    });
  });
  hotspots.sort((a, b) => a.val - b.val);

  const deptAvgs = departments.map((d, di) => {
    const row = matrix[di].filter(v => v !== null);
    return row.length ? Math.round(row.reduce((a, b) => a + b, 0) / row.length) : null;
  });

  const catAvgs = categories.map((_, ci) => {
    const col = matrix.map(row => row[ci]).filter(v => v !== null);
    return col.length ? Math.round(col.reduce((a, b) => a + b, 0) / col.length) : null;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* KPI row */}
      <div className="g3">
        <div className="card card-sm">
          <div className="card-label">Average Compliance</div>
          <div className="card-value" style={{ color: avgCompliance >= 75 ? 'var(--green)' : avgCompliance >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
            {avgCompliance}%
          </div>
        </div>
        <div className="card card-sm">
          <div className="card-label">Critical Hotspots (&lt;40%)</div>
          <div className="card-value" style={{ color: hotspots.length > 0 ? 'var(--red)' : 'var(--green)' }}>
            {hotspots.length}
          </div>
        </div>
        <div className="card card-sm">
          <div className="card-label">Areas with Full Coverage</div>
          <div className="card-value" style={{ color: 'var(--accent)' }}>
            {matrix.flat().filter(v => v !== null && v >= 80).length}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="card" style={{ overflow: 'auto' }}>
        <div className="sec-head" style={{ marginBottom: '16px' }}>
          <div className="sec-title">Compliance Heatmap — Department × Control Category</div>
          <button className="btn btn-ghost" style={{ fontSize: '11.5px', padding: '4px 10px' }} onClick={fetchData}>Refresh</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: '3px', minWidth: '600px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: '140px' }}>
                  Department
                </th>
                {categories.map(cat => (
                  <th key={cat} style={{
                    padding: '6px 8px', fontSize: '9.5px', color: 'var(--text-tertiary)',
                    fontWeight: 700, textAlign: 'center', maxWidth: '90px',
                    wordBreak: 'break-word', lineHeight: 1.3, minWidth: '80px',
                  }}>
                    {cat}
                  </th>
                ))}
                <th style={{ padding: '6px 8px', fontSize: '9.5px', color: 'var(--text-tertiary)', fontWeight: 700, textAlign: 'center', minWidth: '70px' }}>
                  Avg
                </th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept, di) => (
                <tr key={dept.id}>
                  <td style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    {dept.name}
                  </td>
                  {matrix[di].map((pct, ci) => {
                    const c = cellColor(pct);
                    return (
                      <td
                        key={ci}
                        onMouseEnter={() => setTooltip({ dept: dept.name, cat: categories[ci], pct })}
                        onMouseLeave={() => setTooltip(null)}
                        style={{
                          textAlign: 'center',
                          padding: '8px 6px',
                          background: c.bg,
                          color: c.text,
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '5px',
                          cursor: 'default',
                          minWidth: '70px',
                          transition: 'transform 0.1s',
                        }}
                      >
                        {c.label}
                      </td>
                    );
                  })}
                  <td style={{
                    textAlign: 'center', padding: '8px 6px', fontSize: '11px', fontWeight: 800, borderRadius: '5px',
                    color: deptAvgs[di] === null ? 'var(--text-tertiary)' : deptAvgs[di] >= 75 ? 'var(--green)' : deptAvgs[di] >= 50 ? 'var(--yellow)' : 'var(--red)',
                    background: 'var(--surface-2)',
                  }}>
                    {deptAvgs[di] !== null ? `${deptAvgs[di]}%` : '—'}
                  </td>
                </tr>
              ))}
              {/* Category averages row */}
              <tr>
                <td style={{ padding: '4px 10px', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Category Avg
                </td>
                {catAvgs.map((avg, ci) => {
                  const col = avg === null ? 'var(--text-tertiary)' : avg >= 75 ? 'var(--green)' : avg >= 50 ? 'var(--yellow)' : 'var(--red)';
                  return (
                    <td key={ci} style={{ textAlign: 'center', padding: '6px', fontSize: '11px', fontWeight: 800, color: col, background: 'var(--surface-2)', borderRadius: '5px' }}>
                      {avg !== null ? `${avg}%` : '—'}
                    </td>
                  );
                })}
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 999,
            background: 'var(--surface-3)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: '12px',
            boxShadow: 'var(--shadow)', pointerEvents: 'none',
          }}>
            <div style={{ fontWeight: 700 }}>{tooltip.dept}</div>
            <div style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}>{tooltip.cat}</div>
            <div style={{ fontWeight: 800, fontSize: '15px', color: cellColor(tooltip.pct).text }}>
              {tooltip.pct !== null ? `${tooltip.pct}%` : 'No data'}
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', fontWeight: 600 }}>LEGEND</span>
          {[
            { label: '≥ 80% Excellent', bg: 'rgba(70,217,125,0.18)', text: 'var(--green)' },
            { label: '60–79% Good',     bg: 'rgba(70,217,125,0.08)', text: 'var(--green)' },
            { label: '40–59% Moderate', bg: 'rgba(246,181,62,0.18)', text: 'var(--yellow)' },
            { label: '< 40% Critical',  bg: 'rgba(240,82,82,0.18)',  text: 'var(--red)'    },
            { label: 'No Data',         bg: 'var(--surface-3)',       text: 'var(--text-tertiary)' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
              <div style={{ width: '28px', height: '16px', background: l.bg, borderRadius: '4px', border: '1px solid var(--border)' }} />
              <span style={{ color: l.text, fontWeight: 500 }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hotspots */}
      {hotspots.length > 0 && (
        <div className="card">
          <div className="sec-head">
            <div className="sec-title">Critical Hotspots — Immediate Attention Required</div>
            <span className="badge badge-fail">{hotspots.length} areas</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', marginTop: '4px' }}>
            {hotspots.slice(0, 12).map((h, i) => (
              <div key={i} style={{ padding: '10px 12px', background: 'var(--red-dim)', border: '1px solid var(--red-border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>{h.dept}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{h.cat}</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--red)' }}>{h.val}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
