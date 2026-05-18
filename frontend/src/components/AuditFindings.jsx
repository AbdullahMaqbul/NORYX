import React, { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:8000';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'Closed') return false;
  return new Date(dueDate) < new Date();
}

const SEVERITY_STYLE = {
  Critical:    { cls: 'badge-fail',   dot: 'var(--red)',    order: 1 },
  Major:       { cls: 'badge-fail',   dot: 'var(--red)',    order: 2 },
  Minor:       { cls: 'badge-review', dot: 'var(--yellow)', order: 3 },
  Observation: { cls: 'badge-pass',   dot: 'var(--green)',  order: 4 },
};

const STATUS_NEXT = { Open: 'In Progress', 'In Progress': 'Closed', Closed: null };
const STATUS_STYLE = {
  Open:         { cls: 'badge-fail',   label: 'Open'        },
  'In Progress':{ cls: 'badge-review', label: 'In Progress' },
  Closed:       { cls: 'badge-pass',   label: 'Closed'      },
};

const BLANK = { title: '', description: '', severity: 'Major', source: 'Internal', framework_ref: '', owner: '', department_id: '', due_date: '' };

export default function AuditFindings() {
  const [findings,    setFindings]    = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [acting,      setActing]      = useState(null);
  const [form,        setForm]        = useState(BLANK);
  const [filterSev,   setFilterSev]   = useState('All');
  const [filterStatus,setFilterStatus]= useState('All');
  const [remediating, setRemediating] = useState(null);
  const [remedNote,   setRemedNote]   = useState('');

  const fetchData = useCallback(() => {
    Promise.all([
      fetch(`${API}/audit-findings/`).then(r => r.json()).catch(() => []),
      fetch(`${API}/departments/`).then(r => r.json()).catch(() => []),
    ]).then(([f, d]) => {
      const sorted = Array.isArray(f) ? f.sort((a, b) => (SEVERITY_STYLE[a.severity]?.order || 9) - (SEVERITY_STYLE[b.severity]?.order || 9)) : [];
      setFindings(sorted);
      setDepartments(Array.isArray(d) ? d : []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createFinding = async () => {
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    await fetch(`${API}/audit-findings/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title, description: form.description,
        severity: form.severity, source: form.source,
        framework_ref: form.framework_ref || null,
        owner: form.owner || null,
        department_id: form.department_id ? Number(form.department_id) : null,
        due_date: form.due_date || null,
      }),
    }).catch(() => {});
    setSaving(false);
    setShowForm(false);
    setForm(BLANK);
    fetchData();
  };

  const advanceStatus = async (id, currentStatus) => {
    const next = STATUS_NEXT[currentStatus];
    if (!next) return;
    setActing(id);
    await fetch(`${API}/audit-findings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    }).catch(() => {});
    setActing(null);
    fetchData();
  };

  const saveRemediation = async (id) => {
    setActing(id + '_r');
    await fetch(`${API}/audit-findings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remediation_notes: remedNote }),
    }).catch(() => {});
    setActing(null);
    setRemediating(null);
    setRemedNote('');
    fetchData();
  };

  const deleteFinding = async (id) => {
    setActing(id + '_del');
    await fetch(`${API}/audit-findings/${id}`, { method: 'DELETE' }).catch(() => {});
    setActing(null);
    fetchData();
  };

  const sevCounts = { Critical: 0, Major: 0, Minor: 0, Observation: 0 };
  findings.forEach(f => { if (sevCounts[f.severity] !== undefined) sevCounts[f.severity]++; });
  const openCount = findings.filter(f => f.status !== 'Closed').length;
  const closedCount = findings.filter(f => f.status === 'Closed').length;
  const overdueCount = findings.filter(f => isOverdue(f.due_date, f.status)).length;

  const filtered = findings.filter(f => {
    const matchSev = filterSev === 'All' || f.severity === filterSev;
    const matchSt  = filterStatus === 'All' || f.status === filterStatus;
    return matchSev && matchSt;
  });

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading findings…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
        {[
          { label: 'Total Findings', value: findings.length, color: 'var(--text-primary)' },
          { label: 'Open',          value: openCount,        color: openCount > 0 ? 'var(--red)' : 'var(--text-secondary)' },
          { label: 'Overdue',       value: overdueCount,     color: overdueCount > 0 ? 'var(--red)' : 'var(--green)' },
          { label: 'Critical',      value: sevCounts.Critical, color: sevCounts.Critical > 0 ? 'var(--red)' : 'var(--text-secondary)' },
          { label: 'Major',         value: sevCounts.Major,    color: sevCounts.Major > 0 ? 'var(--yellow)' : 'var(--text-secondary)' },
          { label: 'Closed',        value: closedCount,       color: 'var(--green)' },
        ].map(k => (
          <div className="card card-sm" key={k.label} style={{ padding: '12px 14px' }}>
            <div className="card-label">{k.label}</div>
            <div className="card-value" style={{ color: k.color, fontSize: '20px' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters + action row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['All', 'Critical', 'Major', 'Minor', 'Observation'].map(s => (
            <button key={s} className={`btn ${filterSev === s ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: '11.5px', padding: '5px 11px' }} onClick={() => setFilterSev(s)}>{s}</button>
          ))}
          <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />
          {['All', 'Open', 'In Progress', 'Closed'].map(s => (
            <button key={s} className={`btn ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: '11.5px', padding: '5px 11px' }} onClick={() => setFilterStatus(s)}>{s}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)} style={{ gap: '7px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Log Finding
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ border: '1px solid var(--accent-border)', background: 'var(--accent-dim)' }}>
          <div className="sec-head" style={{ marginBottom: '14px' }}>
            <div className="sec-title">New Audit Finding</div>
            <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
              <label>Finding Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Privileged accounts lack MFA" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Severity *</label>
              <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                {['Critical', 'Major', 'Minor', 'Observation'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Source</label>
              <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                {['Internal', 'External', 'Regulatory'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Framework / Control Reference</label>
              <input value={form.framework_ref} onChange={e => setForm(f => ({ ...f, framework_ref: e.target.value }))} placeholder="e.g., NCA ECC-1-2-3, ISO 27001 A.9.4" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Department</label>
              <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                <option value="">Not department-specific</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Owner / Assignee</label>
              <input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="e.g., IT Security Lead" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Remediation Due Date</label>
              <input type="date" lang="en" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
              <label>Description / Detail *</label>
              <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the finding in detail including observed evidence, root cause, and impact…" />
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <button className="btn btn-primary" disabled={!form.title.trim() || !form.description.trim() || saving} onClick={createFinding}>
              {saving ? 'Saving…' : 'Log Finding'}
            </button>
          </div>
        </div>
      )}

      {/* Findings table */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-title">No findings match the current filters</div>
            <div className="empty-sub">Audit findings track gaps identified during internal or external assessments</div>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Finding</th>
                <th>Severity</th>
                <th>Source</th>
                <th>Framework Ref</th>
                <th>Owner</th>
                <th>Department</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const sev = SEVERITY_STYLE[f.severity] || { cls: '', dot: 'var(--text-tertiary)' };
                const st  = STATUS_STYLE[f.status]     || { cls: '', label: f.status };
                const overdue = isOverdue(f.due_date, f.status);
                const next = STATUS_NEXT[f.status];
                return (
                  <React.Fragment key={f.id}>
                    <tr>
                      <td style={{ maxWidth: '240px' }}>
                        <div style={{ fontWeight: 600, fontSize: '12.5px' }}>{f.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{f.description?.slice(0, 70)}{f.description?.length > 70 ? '…' : ''}</div>
                        {f.remediation_notes && (
                          <div style={{ fontSize: '10.5px', color: 'var(--accent)', marginTop: '3px' }}>✓ Remediation noted</div>
                        )}
                      </td>
                      <td><span className={`badge ${sev.cls}`}>{f.severity}</span></td>
                      <td style={{ fontSize: '12px' }}>{f.source}</td>
                      <td style={{ fontSize: '11.5px' }}>{f.framework_ref ? <span className="tag">{f.framework_ref}</span> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}</td>
                      <td style={{ fontSize: '12px' }}>{f.owner || '—'}</td>
                      <td style={{ fontSize: '12px' }}>{f.department_name || '—'}</td>
                      <td style={{ fontSize: '12px', color: overdue ? 'var(--red)' : 'var(--text-secondary)', fontWeight: overdue ? 700 : 400 }}>
                        {fmtDate(f.due_date)}{overdue && <span style={{ display: 'block', fontSize: '10px' }}>Overdue</span>}
                      </td>
                      <td><span className={`badge ${st.cls}`} style={{ fontSize: '10px' }}>{st.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {next && (
                            <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '3px 9px' }} disabled={acting === f.id} onClick={() => advanceStatus(f.id, f.status)}>
                              {acting === f.id ? '…' : next === 'In Progress' ? '→ In Progress' : '→ Close'}
                            </button>
                          )}
                          <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '3px 9px' }} onClick={() => { setRemediating(remediating === f.id ? null : f.id); setRemedNote(f.remediation_notes || ''); }}>
                            Notes
                          </button>
                          <button className="btn btn-danger" style={{ fontSize: '11px', padding: '3px 9px' }} disabled={acting === f.id + '_del'} onClick={() => deleteFinding(f.id)}>Del</button>
                        </div>
                      </td>
                    </tr>
                    {remediating === f.id && (
                      <tr>
                        <td colSpan={9} style={{ background: 'var(--surface-2)', padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '5px' }}>Remediation Notes</label>
                              <textarea rows={2} value={remedNote} onChange={e => setRemedNote(e.target.value)} placeholder="Describe remediation actions taken or planned…" style={{ width: '100%' }} />
                            </div>
                            <button className="btn btn-primary" style={{ fontSize: '11.5px' }} disabled={acting === f.id + '_r'} onClick={() => saveRemediation(f.id)}>
                              {acting === f.id + '_r' ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
