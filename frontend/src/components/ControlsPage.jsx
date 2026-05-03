import React, { useState } from 'react';

const API = 'http://localhost:8000';

export default function ControlsPage({ controls, departments, onRefresh }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [assigning, setAssigning] = useState({});

  const filtered = controls.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
    const matchF = !filter || String(c.department_id) === filter;
    return matchQ && matchF;
  });

  const assign = async (ctrlId, deptId) => {
    setAssigning(a => ({ ...a, [ctrlId]: true }));
    await fetch(`${API}/controls/${ctrlId}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department_id: deptId ? parseInt(deptId) : null }),
    });
    await onRefresh();
    setAssigning(a => ({ ...a, [ctrlId]: false }));
  };

  const assigned = controls.filter(c => c.department_id).length;
  const unassigned = controls.length - assigned;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* KPI */}
      <div className="g3">
        {[
          { label: 'Total Controls', value: controls.length, color: 'var(--text-primary)', accent: 'kpi-card-accent' },
          { label: 'Assigned', value: assigned, color: 'var(--green)', accent: 'kpi-card-green' },
          { label: 'Unassigned', value: unassigned, color: unassigned ? 'var(--yellow)' : 'var(--text-primary)', accent: unassigned ? 'kpi-card-yellow' : 'kpi-card-accent' },
        ].map(k => (
          <div className={`card card-sm kpi-card ${k.accent}`} key={k.label}>
            <div className="card-label">{k.label}</div>
            <div className="card-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card card-sm">
        <div className="form-row" style={{ alignItems: 'flex-end', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search controls by name or description…"
            />
          </div>
          <div style={{ width: '200px' }}>
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">All departments</option>
              <option value="0">Unassigned</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Control ID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Department</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty">
                    <div className="empty-title">No controls match</div>
                    <div className="empty-sub">Try adjusting your search or filters</div>
                  </div>
                </td>
              </tr>
            ) : filtered.map(c => {
              const dept = departments.find(d => d.id === c.department_id);
              return (
                <tr key={c.id}>
                  <td>
                    <span className="tag tag-accent">{c.name}</span>
                  </td>
                  <td style={{ fontWeight: 500, fontSize: '12.5px' }}>
                    {c.criteria?.slice(0, 60) || '—'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '12px', maxWidth: '280px' }}>
                    {c.description?.slice(0, 80) || '—'}
                  </td>
                  <td>
                    {dept
                      ? <span className="badge badge-pass">Assigned</span>
                      : <span className="badge badge-neutral">Unassigned</span>
                    }
                  </td>
                  <td>
                    <select
                      value={c.department_id || ''}
                      onChange={e => assign(c.id, e.target.value)}
                      disabled={assigning[c.id]}
                      style={{ width: '160px', fontSize: '12px', padding: '5px 8px' }}
                    >
                      <option value="">— None —</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
