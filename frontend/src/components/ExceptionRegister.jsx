import React, { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:8000';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isExpiringSoon(expiry) {
  if (!expiry) return false;
  const days = Math.ceil((new Date(expiry) - new Date()) / 86400000);
  return days >= 0 && days <= 30;
}

function statusStyle(status) {
  return {
    Pending:  { cls: 'badge-review', color: 'var(--yellow)' },
    Approved: { cls: 'badge-pass',   color: 'var(--green)'  },
    Rejected: { cls: 'badge-fail',   color: 'var(--red)'    },
    Expired:  { cls: 'badge-fail',   color: 'var(--red)'    },
  }[status] || { cls: '', color: 'var(--text-secondary)' };
}

const BLANK_FORM = { title: '', control_id: '', reason: '', compensating_control: '', risk_owner: '', approver: '', expiry_date: '' };

export default function ExceptionRegister() {
  const [exceptions, setExceptions] = useState([]);
  const [controls,   setControls]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [acting,     setActing]     = useState(null);
  const [form,       setForm]       = useState(BLANK_FORM);
  const [filterStatus, setFilterStatus] = useState('All');

  const fetchData = useCallback(() => {
    Promise.all([
      fetch(`${API}/exceptions/`).then(r => r.json()).catch(() => []),
      fetch(`${API}/controls/`).then(r => r.json()).catch(() => []),
    ]).then(([e, c]) => {
      setExceptions(Array.isArray(e) ? e : []);
      setControls(Array.isArray(c) ? c : []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createException = async () => {
    if (!form.title.trim() || !form.reason.trim() || !form.risk_owner.trim()) return;
    setSaving(true);
    await fetch(`${API}/exceptions/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        reason: form.reason,
        risk_owner: form.risk_owner,
        control_id: form.control_id ? Number(form.control_id) : null,
        compensating_control: form.compensating_control || null,
        approver: form.approver || null,
        expiry_date: form.expiry_date || null,
      }),
    }).catch(() => {});
    setSaving(false);
    setShowForm(false);
    setForm(BLANK_FORM);
    fetchData();
  };

  const setStatus = async (id, status) => {
    setActing(id);
    await fetch(`${API}/exceptions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {});
    setActing(null);
    fetchData();
  };

  const deleteException = async (id) => {
    setActing(id + '_del');
    await fetch(`${API}/exceptions/${id}`, { method: 'DELETE' }).catch(() => {});
    setActing(null);
    fetchData();
  };

  const STATUS_OPTIONS = ['All', 'Pending', 'Approved', 'Rejected', 'Expired'];
  const filtered = filterStatus === 'All' ? exceptions : exceptions.filter(e => e.status === filterStatus);

  const counts = { Pending: 0, Approved: 0, Rejected: 0, Expired: 0 };
  exceptions.forEach(e => { if (counts[e.status] !== undefined) counts[e.status]++; });

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading exceptions…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* KPI row */}
      <div className="g4">
        {[
          { label: 'Total Exceptions', value: exceptions.length,    color: 'var(--text-primary)' },
          { label: 'Pending Approval', value: counts.Pending,       color: counts.Pending  > 0 ? 'var(--yellow)' : 'var(--text-secondary)' },
          { label: 'Approved',         value: counts.Approved,      color: 'var(--green)'  },
          { label: 'Expired / Rejected', value: counts.Expired + counts.Rejected, color: (counts.Expired + counts.Rejected) > 0 ? 'var(--red)' : 'var(--text-secondary)' },
        ].map(k => (
          <div className="card card-sm" key={k.label}>
            <div className="card-label">{k.label}</div>
            <div className="card-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              className={`btn ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '11.5px', padding: '5px 12px' }}
              onClick={() => setFilterStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)} style={{ gap: '7px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Log Exception
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{ border: '1px solid var(--accent-border)', background: 'var(--accent-dim)' }}>
          <div className="sec-head" style={{ marginBottom: '14px' }}>
            <div className="sec-title">New Control Exception</div>
            <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
              <label>Exception Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Legacy system cannot meet patch SLA" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Related Control (optional)</label>
              <select value={form.control_id} onChange={e => setForm(f => ({ ...f, control_id: e.target.value }))}>
                <option value="">Not control-specific</option>
                {controls.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Risk Owner *</label>
              <input value={form.risk_owner} onChange={e => setForm(f => ({ ...f, risk_owner: e.target.value }))} placeholder="e.g., Head of IT Operations" />
            </div>
            <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
              <label>Reason / Justification *</label>
              <textarea rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Explain why this exception is being requested…" />
            </div>
            <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
              <label>Compensating Control</label>
              <input value={form.compensating_control} onChange={e => setForm(f => ({ ...f, compensating_control: e.target.value }))} placeholder="e.g., Enhanced monitoring, manual review process…" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Approver</label>
              <input value={form.approver} onChange={e => setForm(f => ({ ...f, approver: e.target.value }))} placeholder="e.g., CISO, Risk Committee" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Expiry Date</label>
              <input type="date" lang="en" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <button className="btn btn-primary" disabled={!form.title.trim() || !form.reason.trim() || !form.risk_owner.trim() || saving} onClick={createException}>
              {saving ? 'Saving…' : 'Submit Exception'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-title">{filterStatus === 'All' ? 'No exceptions logged' : `No ${filterStatus.toLowerCase()} exceptions`}</div>
            <div className="empty-sub">Control exceptions track formal risk acceptances where a control requirement cannot be fully met</div>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Exception</th>
                <th>Related Control</th>
                <th>Risk Owner</th>
                <th>Compensating Control</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ex => {
                const st = statusStyle(ex.status);
                const expiring = isExpiringSoon(ex.expiry_date);
                return (
                  <tr key={ex.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '12.5px' }}>{ex.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', maxWidth: '260px' }}>{ex.reason?.slice(0, 80)}{ex.reason?.length > 80 ? '…' : ''}</div>
                    </td>
                    <td style={{ fontSize: '12px' }}>{ex.control_name ? <span className="tag tag-accent">{ex.control_name}</span> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}</td>
                    <td style={{ fontSize: '12px', fontWeight: 500 }}>{ex.risk_owner || '—'}</td>
                    <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)', maxWidth: '200px' }}>{ex.compensating_control || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>None recorded</span>}</td>
                    <td style={{ fontSize: '12px' }}>
                      <span style={{ color: expiring ? 'var(--yellow)' : 'var(--text-secondary)' }}>
                        {fmtDate(ex.expiry_date)}
                        {expiring && <span style={{ display: 'block', fontSize: '10px', color: 'var(--yellow)' }}>Expiring soon</span>}
                      </span>
                    </td>
                    <td><span className={`badge ${st.cls}`}>{ex.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {ex.status === 'Pending' && (
                          <>
                            <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '3px 9px', color: 'var(--green)' }} disabled={acting === ex.id} onClick={() => setStatus(ex.id, 'Approved')}>Approve</button>
                            <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '3px 9px', color: 'var(--red)'   }} disabled={acting === ex.id} onClick={() => setStatus(ex.id, 'Rejected')}>Reject</button>
                          </>
                        )}
                        <button className="btn btn-danger" style={{ fontSize: '11px', padding: '3px 9px' }} disabled={acting === ex.id + '_del'} onClick={() => deleteException(ex.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
