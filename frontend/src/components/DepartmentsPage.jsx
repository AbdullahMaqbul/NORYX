import React, { useState } from 'react';

const API = 'http://localhost:8000';

const PRESETS = [
  'Network Security', 'Identity & Access', 'Endpoint Protection',
  'Data Security', 'Incident Response', 'Compliance & Governance',
  'IT Operations', 'Physical Security',
];

export default function DepartmentsPage({ departments, controls, onRefresh }) {
  const [name, setName]     = useState('');
  const [desc, setDesc]     = useState('');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await fetch(`${API}/departments/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: desc.trim() }),
    });
    setName(''); setDesc('');
    await onRefresh();
    setSaving(false);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this department and unassign its controls?')) return;
    await fetch(`${API}/departments/${id}`, { method: 'DELETE' });
    await onRefresh();
  };

  const deptControls = (id) => controls.filter(c => c.department_id === id);
  const assigned = controls.filter(c => c.department_id).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* KPI */}
      <div className="g3">
        {[
          { label: 'Departments',       value: departments.length,   color: 'var(--text-primary)', accent: 'kpi-card-accent' },
          { label: 'Total Controls',    value: controls.length,      color: 'var(--text-primary)', accent: 'kpi-card-accent' },
          { label: 'Assigned Controls', value: assigned,             color: 'var(--green)',        accent: 'kpi-card-green' },
        ].map(k => (
          <div className={`card card-sm kpi-card ${k.accent}`} key={k.label}>
            <div className="card-label">{k.label}</div>
            <div className="card-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="g2" style={{ alignItems: 'start' }}>

        {/* Create form */}
        <div className="card">
          <div className="sec-title" style={{ marginBottom: '16px' }}>Add Department</div>

          <form onSubmit={create}>
            <div className="form-group">
              <label>Department Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Network Security" required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="What is this department responsible for?" rows={3} />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={saving || !name.trim()}>
              {saving ? 'Creating…' : 'Create Department'}
            </button>
          </form>

          <div className="divider" />

          <div style={{ marginBottom: '8px' }}>
            <label>Quick add</label>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {PRESETS.filter(p => !departments.find(d => d.name === p)).map(p => (
              <button key={p} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '11.5px' }} onClick={() => setName(p)}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Department list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {departments.length === 0 ? (
            <div className="card">
              <div className="empty">
                <div className="empty-title">No departments yet</div>
                <div className="empty-sub">Use the form to create your first department</div>
              </div>
            </div>
          ) : (
            departments.map((d) => {
              const dc = deptControls(d.id);
              const isOpen = expanded === d.id;
              const pct  = dc.length > 0 ? Math.round((dc.length / controls.length) * 100) : 0;
              return (
                <div key={d.id} className="card card-sm">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</span>
                        <span className="tag">{dc.length} controls</span>
                      </div>
                      {d.description && (
                        <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>{d.description}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '11.5px' }} onClick={() => setExpanded(isOpen ? null : d.id)}>
                        {isOpen ? 'Hide' : 'Controls'}
                      </button>
                      <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '11.5px' }} onClick={() => remove(d.id)}>
                        Delete
                      </button>
                    </div>
                  </div>

                  {dc.length > 0 && !isOpen && (
                    <div style={{ marginTop: '10px' }}>
                      <div className="progress">
                        <div className="progress-fill" style={{ width: `${Math.min(100, dc.length * 5)}%`, background: 'var(--accent)' }} />
                      </div>
                    </div>
                  )}

                  {isOpen && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                      {dc.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>No controls assigned to this department yet.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {dc.map(c => (
                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                              <span style={{ color: 'var(--green)', fontWeight: 600 }}>✓</span>
                              <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: 500 }}>{c.name}</span>
                              <span className="tag">{c.category || 'General'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
