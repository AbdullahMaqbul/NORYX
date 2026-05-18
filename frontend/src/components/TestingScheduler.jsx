import React, { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:8000';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function testingStatus(nextDueAt, lastTestedAt) {
  if (!lastTestedAt && !nextDueAt) return { label: 'Never Tested', color: 'var(--red)', cls: 'badge-fail', priority: 4 };
  if (!nextDueAt) return { label: 'No Schedule', color: 'var(--text-tertiary)', cls: '', priority: 3 };
  const now = new Date();
  const due = new Date(nextDueAt);
  const days = Math.ceil((due - now) / 86400000);
  if (days < 0)  return { label: `Overdue ${Math.abs(days)}d`, color: 'var(--red)',    cls: 'badge-fail',   priority: 4 };
  if (days <= 14) return { label: `Due in ${days}d`,            color: 'var(--yellow)', cls: 'badge-review', priority: 3 };
  if (days <= 30) return { label: `Due in ${days}d`,            color: 'var(--yellow)', cls: 'badge-review', priority: 2 };
  return { label: `Due in ${days}d`, color: 'var(--green)', cls: 'badge-pass', priority: 1 };
}

const FREQ_OPTIONS = ['monthly', 'quarterly', 'biannually', 'annually'];

export default function TestingScheduler() {
  const [schedules,  setSchedules]  = useState([]);
  const [controls,   setControls]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [marking,    setMarking]    = useState(null);
  const [deleting,   setDeleting]   = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [form, setForm] = useState({ control_id: '', frequency: 'quarterly', owner: '', notes: '' });

  const scheduledIds = new Set(schedules.map(s => s.control_id));

  const fetchData = useCallback(() => {
    Promise.all([
      fetch(`${API}/testing-schedules/`).then(r => r.json()).catch(() => []),
      fetch(`${API}/controls/`).then(r => r.json()).catch(() => []),
    ]).then(([s, c]) => {
      setSchedules(Array.isArray(s) ? s.sort((a, b) => {
        return (testingStatus(a.next_due_at, a.last_tested_at).priority) -
               (testingStatus(b.next_due_at, b.last_tested_at).priority);
      }).reverse() : []);
      setControls(Array.isArray(c) ? c : []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createSchedule = async () => {
    if (!form.control_id) return;
    setSaving(true);
    await fetch(`${API}/testing-schedules/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        control_id: Number(form.control_id),
        frequency: form.frequency,
        owner: form.owner || null,
        notes: form.notes || null,
      }),
    }).catch(() => {});
    setSaving(false);
    setShowForm(false);
    setForm({ control_id: '', frequency: 'quarterly', owner: '', notes: '' });
    fetchData();
  };

  const markTested = async (id) => {
    setMarking(id);
    await fetch(`${API}/testing-schedules/${id}/mark-tested`, { method: 'POST' }).catch(() => {});
    setMarking(null);
    fetchData();
  };

  const deleteSchedule = async (id) => {
    setDeleting(id);
    await fetch(`${API}/testing-schedules/${id}`, { method: 'DELETE' }).catch(() => {});
    setDeleting(null);
    fetchData();
  };

  const overdue   = schedules.filter(s => testingStatus(s.next_due_at, s.last_tested_at).priority === 4);
  const dueSoon   = schedules.filter(s => [2,3].includes(testingStatus(s.next_due_at, s.last_tested_at).priority));
  const onTrack   = schedules.filter(s => testingStatus(s.next_due_at, s.last_tested_at).priority === 1);
  const available = controls.filter(c => !scheduledIds.has(c.id));

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading schedules…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* KPI row */}
      <div className="g4">
        {[
          { label: 'Total Scheduled',  value: schedules.length,  color: 'var(--text-primary)' },
          { label: 'Overdue / Never',  value: overdue.length,    color: overdue.length  > 0 ? 'var(--red)'    : 'var(--green)' },
          { label: 'Due Within 30d',   value: dueSoon.length,    color: dueSoon.length  > 0 ? 'var(--yellow)' : 'var(--green)' },
          { label: 'On Track',         value: onTrack.length,    color: 'var(--green)' },
        ].map(k => (
          <div className="card card-sm" key={k.label}>
            <div className="card-label">{k.label}</div>
            <div className="card-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700 }}>Control Testing Scheduler</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            Track when each control was last tested and when it is next due
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)} style={{ gap: '7px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Schedule
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card" style={{ border: '1px solid var(--accent-border)', background: 'var(--accent-dim)' }}>
          <div className="sec-head" style={{ marginBottom: '14px' }}>
            <div className="sec-title">New Testing Schedule</div>
            <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Control *</label>
              <select value={form.control_id} onChange={e => setForm(f => ({ ...f, control_id: e.target.value }))}>
                <option value="">Select control…</option>
                {available.map(c => <option key={c.id} value={c.id}>{c.name} {c.category ? `(${c.category})` : ''}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Testing Frequency *</label>
              <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                {FREQ_OPTIONS.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Owner / Responsible</label>
              <input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="e.g., IT Security Team" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" />
            </div>
          </div>
          <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" disabled={!form.control_id || saving} onClick={createSchedule}>
              {saving ? 'Saving…' : 'Create Schedule'}
            </button>
          </div>
        </div>
      )}

      {/* Schedule table */}
      {schedules.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-title">No schedules yet</div>
            <div className="empty-sub">Add a testing schedule to track control testing cadences</div>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Control</th>
                <th>Category</th>
                <th>Frequency</th>
                <th>Last Tested</th>
                <th>Next Due</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(s => {
                const st = testingStatus(s.next_due_at, s.last_tested_at);
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, fontSize: '12.5px' }}>{s.control_name || `Control #${s.control_id}`}</td>
                    <td><span className="tag">{s.control_category || 'General'}</span></td>
                    <td style={{ textTransform: 'capitalize', fontSize: '12px' }}>{s.frequency}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{fmtDate(s.last_tested_at)}</td>
                    <td style={{ fontSize: '12px', fontWeight: s.next_due_at ? 600 : 400, color: st.color }}>{fmtDate(s.next_due_at)}</td>
                    <td><span className={`badge ${st.cls}`} style={{ fontSize: '10px' }}>{st.label}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{s.owner || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                          disabled={marking === s.id}
                          onClick={() => markTested(s.id)}
                        >
                          {marking === s.id ? '…' : '✓ Mark Tested'}
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          disabled={deleting === s.id}
                          onClick={() => deleteSchedule(s.id)}
                        >
                          {deleting === s.id ? '…' : 'Remove'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Unscheduled controls callout */}
      {available.length > 0 && (
        <div className="card card-sm" style={{ background: 'var(--yellow-dim)', border: '1px solid var(--yellow-border)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--yellow)', marginBottom: '4px' }}>
            {available.length} control{available.length > 1 ? 's' : ''} not yet scheduled
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            {available.slice(0, 5).map(c => c.name).join(', ')}{available.length > 5 ? ` and ${available.length - 5} more…` : ''}
          </div>
        </div>
      )}
    </div>
  );
}
