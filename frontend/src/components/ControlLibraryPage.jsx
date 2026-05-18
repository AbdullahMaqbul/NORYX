import React, { useCallback, useEffect, useMemo, useState } from 'react';

const API = 'http://localhost:8000';

const TARGET_FILTERS = [
  'NIST CSF 2.0',
  'SAMA CSF 1.0',
  'NCA ECC 2018',
  'ISO 27001 2022',
  'CIS CSC 8.1',
  'PCI DSS 4.0.1',
  'SOC 2 / AICPA TSC',
];

function fmt(n) {
  return Number(n || 0).toLocaleString();
}

function shortText(text, max = 150) {
  if (!text) return '-';
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function StatCard({ label, value, tone = 'accent' }) {
  const color = tone === 'green' ? 'var(--green)' : tone === 'yellow' ? 'var(--yellow)' : 'var(--accent)';
  return (
    <div className={`card card-sm kpi-card ${tone === 'green' ? 'kpi-card-green' : tone === 'yellow' ? 'kpi-card-yellow' : 'kpi-card-accent'}`}>
      <div className="card-label">{label}</div>
      <div className="card-value" style={{ color }}>{value}</div>
    </div>
  );
}

export default function ControlLibraryPage() {
  const [summary, setSummary] = useState(null);
  const [sources, setSources] = useState([]);
  const [controls, setControls] = useState({ items: [], total: 0 });
  const [mappings, setMappings] = useState({ items: [], total: 0 });
  const [framework, setFramework] = useState('');
  const [search, setSearch] = useState('');
  const [mappingSearch, setMappingSearch] = useState('');
  const [targetFramework, setTargetFramework] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/framework-library/summary`).then(r => r.json()),
      fetch(`${API}/framework-library/sources`).then(r => r.json()),
    ])
      .then(([summaryData, sourceData]) => {
        setSummary(summaryData);
        setSources(Array.isArray(sourceData) ? sourceData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  useEffect(() => {
    const params = new URLSearchParams({ limit: '120' });
    if (framework) params.set('framework', framework);
    if (search.trim()) params.set('q', search.trim());
    const timer = setTimeout(() => {
      fetch(`${API}/framework-library/controls?${params.toString()}`)
        .then(r => r.json())
        .then(data => setControls(data?.items ? data : { items: [], total: 0 }))
        .catch(() => setControls({ items: [], total: 0 }));
    }, 180);
    return () => clearTimeout(timer);
  }, [framework, search]);

  useEffect(() => {
    const params = new URLSearchParams({ limit: '120' });
    if (targetFramework) params.set('target_framework', targetFramework);
    if (mappingSearch.trim()) params.set('q', mappingSearch.trim());
    const timer = setTimeout(() => {
      fetch(`${API}/framework-library/mappings?${params.toString()}`)
        .then(r => r.json())
        .then(data => setMappings(data?.items ? data : { items: [], total: 0 }))
        .catch(() => setMappings({ items: [], total: 0 }));
    }, 180);
    return () => clearTimeout(timer);
  }, [targetFramework, mappingSearch]);

  const frameworkOptions = useMemo(() => summary?.framework_counts || [], [summary]);
  const maxFrameworkCount = Math.max(...frameworkOptions.map(f => f.controls || 0), 1);

  if (loading && !summary) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
        Loading control library...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div className="g4">
        <StatCard label="Sources" value={fmt(summary?.source_count)} />
        <StatCard label="Controls" value={fmt(summary?.total_controls)} tone="green" />
        <StatCard label="SCF Mappings" value={fmt(summary?.total_mappings)} tone="yellow" />
        <div className="card card-sm kpi-card kpi-card-accent">
          <div className="card-label">Library DB</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.35, wordBreak: 'break-word' }}>
            {summary?.database || 'data/frameworks/framework_library.db'}
          </div>
        </div>
      </div>

      <div className="g2-wide">
        <div className="card">
          <div className="sec-head">
            <div className="sec-title">Source Register</div>
            <button className="btn btn-secondary" onClick={loadSummary}>Refresh</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Framework</th>
                  <th>Version</th>
                  <th>Format</th>
                  <th>Controls</th>
                </tr>
              </thead>
              <tbody>
                {sources.length === 0 ? (
                  <tr><td colSpan={4}><div className="empty"><div className="empty-title">No library data found</div></div></td></tr>
                ) : sources.map(src => (
                  <tr key={src.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '12.5px' }}>{src.framework_name}</div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginTop: '2px' }}>{src.owner}</div>
                    </td>
                    <td><span className="tag tag-accent">{src.version}</span></td>
                    <td><span className="tag">{src.raw_format?.toUpperCase()}</span></td>
                    <td style={{ fontWeight: 700 }}>{fmt(src.control_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="sec-head">
            <div className="sec-title">Framework Coverage</div>
            <span className="tag">{fmt(summary?.total_controls)} total</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {frameworkOptions.map(item => {
              const pct = Math.max(4, Math.round((item.controls / maxFrameworkCount) * 100));
              return (
                <div key={item.framework_key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '5px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 650 }}>{item.framework_name}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{fmt(item.controls)}</span>
                  </div>
                  <div className="progress">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card card-sm">
        <div className="form-row">
          <select value={framework} onChange={e => setFramework(e.target.value)} style={{ maxWidth: '260px' }}>
            <option value="">All frameworks</option>
            {frameworkOptions.map(item => (
              <option key={item.framework_key} value={item.framework_key}>
                {item.framework_name} {item.version}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search controls, domains, or text..."
          />
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Framework</th>
              <th>Control</th>
              <th>Domain</th>
              <th>Title</th>
              <th>Text</th>
              <th>Page</th>
            </tr>
          </thead>
          <tbody>
            {controls.items.length === 0 ? (
              <tr><td colSpan={6}><div className="empty"><div className="empty-title">No controls found</div></div></td></tr>
            ) : controls.items.map(control => (
              <tr key={`${control.framework_key}-${control.id}`}>
                <td><span className="tag">{control.framework_name}</span></td>
                <td><span className="tag tag-accent">{control.control_id}</span></td>
                <td style={{ color: 'var(--text-secondary)', minWidth: '160px' }}>{control.domain || '-'}</td>
                <td style={{ fontWeight: 650, minWidth: '180px' }}>{control.title || '-'}</td>
                <td style={{ color: 'var(--text-secondary)', maxWidth: '420px' }}>{shortText(control.control_text, 190)}</td>
                <td>{control.page || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '-8px', color: 'var(--text-tertiary)', fontSize: '11px' }}>
        Showing {fmt(controls.items.length)} of {fmt(controls.total)} controls
      </div>

      <div className="card card-sm">
        <div className="form-row">
          <select value={targetFramework} onChange={e => setTargetFramework(e.target.value)} style={{ maxWidth: '260px' }}>
            <option value="">All SCF mappings</option>
            {TARGET_FILTERS.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <input
            value={mappingSearch}
            onChange={e => setMappingSearch(e.target.value)}
            placeholder="Search mapped IDs or SCF controls..."
          />
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>SCF Control</th>
              <th>SCF Title</th>
              <th>Target Framework</th>
              <th>Target Control</th>
              <th>Relationship</th>
            </tr>
          </thead>
          <tbody>
            {mappings.items.length === 0 ? (
              <tr><td colSpan={5}><div className="empty"><div className="empty-title">No mappings found</div></div></td></tr>
            ) : mappings.items.map(mapping => (
              <tr key={mapping.id}>
                <td><span className="tag tag-accent">{mapping.scf_control_id}</span></td>
                <td style={{ fontWeight: 650, minWidth: '220px' }}>{mapping.scf_control_title || '-'}</td>
                <td><span className="tag">{mapping.target_framework}</span></td>
                <td style={{ color: 'var(--text-secondary)' }}>{mapping.target_control_id}</td>
                <td><span className="badge badge-neutral">{mapping.relationship_type}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '-8px', color: 'var(--text-tertiary)', fontSize: '11px' }}>
        Showing {fmt(mappings.items.length)} of {fmt(mappings.total)} mappings
      </div>
    </div>
  );
}
