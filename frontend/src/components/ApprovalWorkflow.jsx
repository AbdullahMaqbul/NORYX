import React, { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:8000';

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  if (s === 'pass')        return <span className="badge badge-pass">Pass</span>;
  if (s === 'fail')        return <span className="badge badge-fail">Fail</span>;
  if (s === 'need_review') return <span className="badge badge-review">Needs Review</span>;
  return <span className="badge badge-neutral">{status || '—'}</span>;
}

function Modal({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '22px', width: 'min(560px, 100%)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{subtitle}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

function EvidencePreview({ evidenceId }) {
  const [errored, setErrored] = useState(false);
  if (!evidenceId || errored) {
    return (
      <div style={{
        background: 'var(--surface-2)', border: '1px dashed var(--border-light)',
        borderRadius: 'var(--radius-sm)', padding: '24px', textAlign: 'center',
        color: 'var(--text-tertiary)', fontSize: '12px',
      }}>
        Preview unavailable
      </div>
    );
  }
  return (
    <img
      src={`${API}/evidence/${evidenceId}/file`}
      alt="Evidence"
      onError={() => setErrored(true)}
      style={{
        maxWidth: '100%', maxHeight: '320px', borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)', display: 'block', margin: '0 auto',
      }}
    />
  );
}

export default function ApprovalWorkflow() {
  const [queue,    setQueue]    = useState([]);
  const [controls, setControls] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selected, setSelected] = useState(null);                 // evidence row being acted on
  const [mode,     setMode]     = useState(null);                 // 'approve' | 'reject'
  const [text,     setText]     = useState('');
  const [overrideTo, setOverrideTo] = useState('pass');           // pass | fail
  const [reviewer, setReviewer] = useState('Manager');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');                    // all | fail | need_review

  const load = useCallback(() => {
    fetch(`${API}/evidence/pending-review`).then(r => r.json()).then(setQueue).catch(() => {});
    fetch(`${API}/controls/`).then(r => r.json()).then(setControls).catch(() => {});
    fetch(`${API}/departments/`).then(r => r.json()).then(setDepartments).catch(() => {});
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const ctrlMap = Object.fromEntries(controls.map(c => [c.id, c]));
  const deptMap = Object.fromEntries(departments.map(d => [d.id, d]));

  const visible = queue.filter(e => {
    if (filter === 'all') return true;
    return (e.status || '').toLowerCase() === filter;
  });

  const counts = {
    all:  queue.length,
    fail: queue.filter(e => (e.status || '').toLowerCase() === 'fail').length,
    need_review: queue.filter(e => (e.status || '').toLowerCase() === 'need_review').length,
  };

  const openApprove = (ev) => { setSelected(ev); setMode('approve'); setText(''); setOverrideTo(ev.status?.toLowerCase() === 'fail' ? 'pass' : 'pass'); };
  const openReject  = (ev) => { setSelected(ev); setMode('reject');  setText(''); };
  const close = () => { setSelected(null); setMode(null); setText(''); setSubmitting(false); };

  const submit = async () => {
    if (!selected || !text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const url = mode === 'approve'
        ? `${API}/evidence/${selected.id}/manager-approve`
        : `${API}/evidence/${selected.id}/manager-reject`;

      const body = mode === 'approve'
        ? { justification: text.trim(), reviewer, final_status: overrideTo }
        : { comment:        text.trim(), reviewer };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      close();
      load();
    } catch (err) {
      alert(`Action failed: ${err.message || err}`);
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* Intro */}
      <div className="portal-intro">
        <div>
          <div className="eyebrow">Manager Review Queue</div>
          <div className="portal-title">Approve, override, or send back evidence</div>
          <div className="portal-subtitle">
            Submissions marked as <strong>Needs Review</strong> or <strong>Fail</strong> are queued here for manual judgement.
          </div>
        </div>
        <div className="portal-context">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Reviewer</label>
            <input value={reviewer} onChange={e => setReviewer(e.target.value)} placeholder="Manager name" style={{ minWidth: '220px' }} />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="g3">
        <div className="card card-sm kpi-card kpi-card-yellow">
          <div className="card-label">In Queue</div>
          <div className="card-value" style={{ color: 'var(--yellow)' }}>{counts.all}</div>
        </div>
        <div className="card card-sm kpi-card kpi-card-red">
          <div className="card-label">Fail</div>
          <div className="card-value" style={{ color: 'var(--red)' }}>{counts.fail}</div>
        </div>
        <div className="card card-sm kpi-card">
          <div className="card-label">Needs Review</div>
          <div className="card-value" style={{ color: 'var(--yellow)' }}>{counts.need_review}</div>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[
          { id: 'all',         label: `All (${counts.all})` },
          { id: 'fail',        label: `Fail (${counts.fail})` },
          { id: 'need_review', label: `Needs Review (${counts.need_review})` },
        ].map(p => (
          <button
            key={p.id}
            type="button"
            className={`btn ${filter === p.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => setFilter(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Queue */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Evidence</th>
              <th>Control</th>
              <th>Department</th>
              <th>Employee</th>
              <th>Verdict</th>
              <th>Confidence</th>
              <th>Submitted</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty">
                  <div className="empty-title" style={{ color: 'var(--green)' }}>Inbox zero</div>
                  <div className="empty-sub">No submissions are waiting for manager action.</div>
                </div>
              </td></tr>
            ) : visible.map(ev => {
              const ctrl = ctrlMap[ev.control_id];
              const dept = deptMap[ev.department_id];
              return (
                <tr key={ev.id}>
                  <td><span className="tag tag-accent">EV-{ev.id}</span></td>
                  <td style={{ fontWeight: 500 }}>{ctrl?.name || `Control #${ev.control_id}`}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{dept?.name || '—'}</td>
                  <td>{ev.employee_name}</td>
                  <td><StatusBadge status={ev.status} /></td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{ev.ai_confidence || '—'}</td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                    {ev.upload_time ? new Date(ev.upload_time).toLocaleString() : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '11px' }} onClick={() => openReject(ev)}>
                        Send Back
                      </button>
                      <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '11px' }} onClick={() => openApprove(ev)}>
                        Approve
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selected && mode && (
        <Modal
          title={mode === 'approve' ? 'Manager override approval' : 'Send back to employee'}
          subtitle={`EV-${selected.id} · ${ctrlMap[selected.control_id]?.name || `Control #${selected.control_id}`} · ${selected.employee_name}`}
          onClose={close}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <EvidencePreview evidenceId={selected.id} />

            <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <div><span style={{ color: 'var(--text-tertiary)' }}>Verdict:</span> <StatusBadge status={selected.status} /></div>
              <div><span style={{ color: 'var(--text-tertiary)' }}>Confidence:</span> {selected.ai_confidence || '—'}</div>
            </div>

            {mode === 'approve' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Final status after override</label>
                <select value={overrideTo} onChange={e => setOverrideTo(e.target.value)}>
                  <option value="pass">Mark as Pass (compliant)</option>
                  <option value="fail">Confirm as Fail (non-compliant)</option>
                </select>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{mode === 'approve' ? 'Justification (required)' : 'Comments to employee (required)'}</label>
              <textarea
                rows={4}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={mode === 'approve'
                  ? 'Explain why you are overriding the verdict (audit trail)...'
                  : 'Explain what is missing or wrong so the employee can resubmit…'}
                style={{
                  width: '100%', padding: '10px 12px', fontSize: '13px',
                  background: 'var(--surface-2)', color: 'var(--text-primary)',
                  border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)',
                  resize: 'vertical', fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button className="btn btn-ghost" onClick={close} disabled={submitting}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={submit}
                disabled={!text.trim() || submitting}
              >
                {submitting ? 'Submitting…' : mode === 'approve' ? 'Approve with justification' : 'Send back'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
