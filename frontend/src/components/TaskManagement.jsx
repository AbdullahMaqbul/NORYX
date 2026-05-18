import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const API = 'http://localhost:8000';

/* ── Utility colour palette for department badges (deterministic by id) ── */
const DEPT_PALETTE = [
  ['#6366f1', '#eef2ff'], // indigo
  ['#0ea5e9', '#e0f2fe'], // sky
  ['#14b8a6', '#ccfbf1'], // teal
  ['#10b981', '#d1fae5'], // emerald
  ['#f59e0b', '#fef3c7'], // amber
  ['#ef4444', '#fee2e2'], // red
  ['#8b5cf6', '#ede9fe'], // violet
  ['#ec4899', '#fce7f3'], // pink
  ['#f97316', '#ffedd5'], // orange
  ['#22c55e', '#dcfce7'], // green
];
const deptColors = (deptId) => {
  const idx = ((deptId || 0) % DEPT_PALETTE.length + DEPT_PALETTE.length) % DEPT_PALETTE.length;
  return DEPT_PALETTE[idx];
};

const DeptBadge = ({ deptId, name }) => {
  const [fg, bg] = deptColors(deptId);
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: 0.3, padding: '3px 8px',
      borderRadius: 999, background: bg, color: fg, whiteSpace: 'nowrap',
    }}>{name || `Dept ${deptId}`}</span>
  );
};

const StatusPill = ({ status }) => {
  const map = {
    'Pending':     { fg: '#92400e', bg: '#fef3c7', label: 'Pending' },
    'Open':        { fg: '#92400e', bg: '#fef3c7', label: 'Pending' },
    'In Progress': { fg: '#1e40af', bg: '#dbeafe', label: 'In Progress' },
    'Completed':   { fg: '#065f46', bg: '#d1fae5', label: 'Completed' },
    'Done':        { fg: '#065f46', bg: '#d1fae5', label: 'Completed' },
    'Overdue':     { fg: '#991b1b', bg: '#fee2e2', label: 'Overdue' },
  };
  const s = map[status] || { fg: '#374151', bg: '#f3f4f6', label: status };
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
      background: s.bg, color: s.fg,
    }}>{s.label}</span>
  );
};

const ProgressBar = ({ pct, color = 'var(--accent)', height = 6 }) => (
  <div style={{ width: '100%', height, background: 'var(--surface-2)', borderRadius: height, overflow: 'hidden' }}>
    <div style={{
      width: `${Math.min(100, Math.max(0, pct))}%`,
      height: '100%', background: color, transition: 'width 240ms ease',
    }} />
  </div>
);

const daysUntil = (iso) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

export default function TaskManagement({ departments, isAdmin, departmentId }) {
  const [tasks, setTasks] = useState([]);
  const [controls, setControls] = useState([]);
  const [summary, setSummary] = useState({ overall: { total: 0, completed: 0, progress_pct: 0 }, departments: [] });

  const [title, setTitle] = useState('');
  const [deptId, setDeptId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');

  const fileInputRef = useRef(null);
  const [ncaFile, setNcaFile] = useState(null);
  const [ncaDeadline, setNcaDeadline] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchAll = useCallback(() => {
    const tasksUrl = isAdmin ? `${API}/tasks/` : `${API}/departments/${departmentId}/tasks`;
    Promise.all([
      fetch(tasksUrl).then(r => r.ok ? r.json() : []),
      fetch(`${API}/controls/`).then(r => r.ok ? r.json() : []),
      isAdmin ? fetch(`${API}/tasks/summary`).then(r => r.ok ? r.json() : null) : Promise.resolve(null),
    ]).then(([t, c, s]) => {
      setTasks(Array.isArray(t) ? t : []);
      setControls(Array.isArray(c) ? c : []);
      if (s) setSummary(s);
    }).catch(() => {});
  }, [departmentId, isAdmin]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const controlMap = useMemo(() => {
    const m = {};
    for (const c of controls) m[c.id] = c;
    return m;
  }, [controls]);

  const deptMap = useMemo(() => {
    const m = {};
    for (const d of (departments || [])) m[d.id] = d;
    return m;
  }, [departments]);

  const handleCreate = async () => {
    if (!title || (isAdmin && !deptId)) return;
    await fetch(`${API}/tasks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        department_id: isAdmin ? parseInt(deptId) : departmentId,
        due_date: dueDate ? new Date(dueDate).toISOString() : new Date(Date.now() + 7*86400000).toISOString(),
        status: 'Pending',
        control_id: controls[0]?.id || 1,
      }),
    });
    setTitle(''); setDueDate('');
    fetchAll();
  };

  const handleStatus = async (id, newStatus) => {
    await fetch(`${API}/tasks/${id}?status=${newStatus}`, { method: 'PATCH' });
    fetchAll();
  };

  const handlePickFile = (e) => {
    const f = e.target.files?.[0];
    if (f) { setNcaFile(f); setUploadError(''); setUploadResult(null); }
  };

  const submitUpload = async () => {
    if (!ncaFile || !ncaDeadline) {
      setUploadError('Please select a JSON file and a deadline.');
      return;
    }
    if (replaceExisting && !confirming) { setConfirming(true); return; }
    setConfirming(false);
    setUploading(true); setUploadError(''); setUploadResult(null);
    try {
      const fd = new FormData();
      fd.append('file', ncaFile);
      fd.append('deadline', ncaDeadline);
      fd.append('replace_existing', String(replaceExisting));
      const r = await fetch(`${API}/admin/controls/upload-nca`, { method: 'POST', body: fd });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt || `HTTP ${r.status}`);
      }
      const data = await r.json();
      setUploadResult(data);
      setNcaFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchAll();
    } catch (err) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('This will permanently delete ALL controls, tasks, evidence and risks so the admin can start fresh. Continue?')) return;
    setClearing(true);
    try {
      await fetch(`${API}/admin/controls/clear`, { method: 'POST' });
      setUploadResult(null);
      fetchAll();
    } finally {
      setClearing(false);
    }
  };

  const enriched = tasks.map(t => {
    const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Completed';
    return { ...t, _overdue: isOverdue };
  });
  const pending    = enriched.filter(t => (t.status === 'Pending' || t.status === 'Open') && !t._overdue);
  const inProgress = enriched.filter(t => t.status === 'In Progress');
  const completed  = enriched.filter(t => t.status === 'Completed' || t.status === 'Done');
  const overdue    = enriched.filter(t => t._overdue);

  const TaskCard = ({ t }) => {
    const ctrl     = controlMap[t.control_id];
    const deptName = deptMap[t.department_id]?.name || 'Unassigned';
    const days     = daysUntil(t.due_date);
    const overdueFlag = t._overdue;

    return (
      <div className="card card-sm" style={{
        marginBottom: 12, background: 'var(--surface)',
        borderLeft: overdueFlag ? '3px solid var(--red, #ef4444)' : '3px solid transparent',
        cursor: 'grab', transition: 'transform 120ms ease, box-shadow 120ms ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
          <span className="tag" style={{ fontSize: 10 }}>TSK-{t.id}</span>
          <DeptBadge deptId={t.department_id} name={deptName} />
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.4 }}>
          {t.title}
        </div>

        {ctrl && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8, lineHeight: 1.4, maxHeight: 32, overflow: 'hidden' }}>
            {ctrl.description?.slice(0, 110)}{ctrl.description?.length > 110 ? '…' : ''}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 10 }}>
          <StatusPill status={overdueFlag ? 'Overdue' : t.status} />
          {t.due_date && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
              background: overdueFlag ? '#fee2e2' : days <= 3 ? '#fef3c7' : '#f3f4f6',
              color:      overdueFlag ? '#991b1b' : days <= 3 ? '#92400e' : '#374151',
            }}>
              {overdueFlag ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : days < 0 ? `${Math.abs(days)}d late` : `${days}d left`}
            </span>
          )}
        </div>

        {t.status !== 'Completed' && t.status !== 'Done' && (
          <div style={{ display: 'flex', gap: 6 }}>
            {(t.status === 'Pending' || t.status === 'Open') && (
              <button className="btn btn-secondary btn-full" style={{ fontSize: 10, padding: 4 }} onClick={() => handleStatus(t.id, 'In Progress')}>Start</button>
            )}
            <button className="btn btn-ghost btn-full" style={{ fontSize: 10, padding: 4, color: 'var(--green, #10b981)', borderColor: 'var(--green-border, #a7f3d0)' }} onClick={() => handleStatus(t.id, 'Completed')}>Mark Done</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {isAdmin && (
        <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <div className="sec-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                <div style={{ width: 28, height: 28, background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                </div>
                NCA Controls Upload
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, maxWidth: 640 }}>
                Upload <code>nca_controls_dataset.json</code>. The system parses every control, auto-assigns it
                to the most relevant department by keyword analysis, and generates a task per control with the
                deadline you set below.
              </div>
            </div>
            <button className="btn btn-ghost" onClick={handleClearAll} disabled={clearing} style={{ fontSize: 12, color: '#ef4444', borderColor: '#fecaca' }}>
              {clearing ? 'Clearing…' : 'Reset to Zero'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 2, minWidth: 240, marginBottom: 0 }}>
              <label>Controls JSON file</label>
              <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handlePickFile} lang="en" />
              {ncaFile && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Selected: <strong>{ncaFile.name}</strong> ({(ncaFile.size/1024).toFixed(1)} KB)</div>}
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
              <label>Deadline for all controls</label>
              <input type="date" value={ncaDeadline} onChange={e => setNcaDeadline(e.target.value)} lang="en" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', paddingBottom: 8 }}>
              <input type="checkbox" checked={replaceExisting} onChange={e => { setReplaceExisting(e.target.checked); setConfirming(false); }} />
              Replace existing
            </label>
            <button className="btn btn-primary" onClick={submitUpload} disabled={uploading || !ncaFile || !ncaDeadline} style={{ height: 37 }}>
              {uploading ? 'Uploading…' : confirming ? 'Confirm replace?' : 'Upload & Auto-Assign'}
            </button>
          </div>

          {uploadError && (
            <div style={{ marginTop: 12, padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: 12 }}>
              {uploadError}
            </div>
          )}

          {uploadResult && (
            <div style={{ marginTop: 16, padding: 14, background: 'var(--surface-2)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: '#10b981' }} />
                Upload complete — <strong>{uploadResult.controls_created}</strong> controls created,
                <strong> {uploadResult.tasks_created}</strong> tasks generated, deadline <strong>{new Date(uploadResult.deadline).toLocaleDateString()}</strong>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {uploadResult.departments?.map(d => {
                  const dept = (departments || []).find(x => x.name === d.name);
                  const [fg, bg] = deptColors(dept?.id);
                  return (
                    <span key={d.name} style={{
                      fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999,
                      background: bg, color: fg,
                    }}>{d.name} · {d.controls_assigned}</span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
            <div className="sec-title" style={{ fontSize: 14 }}>Department Progress</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
              <div>Total: <strong style={{ color: 'var(--text-primary)' }}>{summary.overall.total}</strong></div>
              <div>Completed: <strong style={{ color: '#10b981' }}>{summary.overall.completed}</strong></div>
              <div style={{ minWidth: 120 }}><ProgressBar pct={summary.overall.progress_pct} color="#10b981" height={8} /></div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{summary.overall.progress_pct}%</div>
            </div>
          </div>

          {summary.departments.length === 0 ? (
            <div className="empty-sub" style={{ textAlign: 'center', padding: '24px 0' }}>
              No tasks yet — upload an NCA controls file above to auto-generate tasks per department.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {summary.departments.map(d => {
                const [fg, bg] = deptColors(d.department_id);
                return (
                  <div key={d.department_id} style={{
                    padding: 14, borderRadius: 8, background: 'var(--surface-2)',
                    borderTop: `3px solid ${fg}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{d.department_name}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: bg, color: fg }}>
                        {d.total} ctrls
                      </span>
                    </div>
                    <ProgressBar pct={d.progress_pct} color={fg} height={6} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
                      <span>{d.completed} done · {d.in_progress} in-progress · {d.pending} pending</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.progress_pct}%</span>
                    </div>
                    {d.overdue > 0 && (
                      <div style={{ marginTop: 6, fontSize: 10, fontWeight: 600, color: '#991b1b' }}>
                        ⚠ {d.overdue} overdue
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="card" style={{ padding: 20 }}>
          <div className="sec-head" style={{ marginBottom: 12 }}>
            <div className="sec-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <div style={{ width: 28, height: 28, background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              Create Ad-Hoc Task
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
              <label>Task Description</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Upload firewall configuration evidence..." />
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Assign Department</label>
              <select value={deptId} onChange={e => setDeptId(e.target.value)}>
                <option value="">Select Dept...</option>
                {departments?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}>
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} lang="en" />
            </div>
            <button className="btn btn-primary" onClick={handleCreate} style={{ padding: '9px 16px', height: 37 }}>Create Task</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'pending',     label: 'To Do',       color: 'var(--text-tertiary)', list: pending },
          { key: 'inProgress',  label: 'In Progress', color: '#3b82f6',              list: inProgress },
          { key: 'overdue',     label: 'Overdue',     color: '#ef4444',              list: overdue },
          { key: 'completed',   label: 'Completed',   color: '#10b981',              list: completed },
        ].map(col => (
          <div key={col.key} style={{
            flex: '1 1 240px', minWidth: 240, display: 'flex', flexDirection: 'column',
            background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: 16,
            maxHeight: '70vh', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                {col.label}
              </div>
              <span className="tag">{col.list.length}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
              {col.list.map(t => <TaskCard key={t.id} t={t} />)}
              {col.list.length === 0 && <div className="empty-sub" style={{ textAlign: 'center', marginTop: 20 }}>—</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
