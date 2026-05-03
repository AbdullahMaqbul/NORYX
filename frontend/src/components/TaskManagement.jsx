import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8000';

export default function TaskManagement({ departments, isAdmin, departmentId }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [deptId, setDeptId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');

  const fetchTasks = () => {
    const url = isAdmin ? `${API}/tasks/` : `${API}/departments/${departmentId}/tasks`;
    fetch(url).then(r => r.ok ? r.json() : []).then(data => Array.isArray(data) ? setTasks(data) : setTasks([])).catch(()=>{});
  };

  useEffect(() => { fetchTasks(); }, [isAdmin, departmentId]);

  const handleCreate = async () => {
    if(!title || (isAdmin && !deptId)) return;
    await fetch(`${API}/tasks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title, 
        department_id: isAdmin ? parseInt(deptId) : departmentId, 
        due_date: dueDate ? new Date(dueDate).toISOString() : null, 
        status: 'Pending',
        control_id: 1 // Default
      })
    });
    fetchTasks();
    setTitle(''); setDueDate('');
  };

  const handleStatus = async (id, newStatus) => {
    await fetch(`${API}/tasks/${id}?status=${newStatus}`, { method: 'PATCH' });
    fetchTasks();
  };

  // Group tasks by status for Kanban view
  const pending = tasks.filter(t => t.status === 'Pending' || t.status === 'Open');
  const inProgress = tasks.filter(t => t.status === 'In Progress');
  const completed = tasks.filter(t => t.status === 'Completed' || t.status === 'Done');

  const TaskCard = ({ t }) => {
    const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Completed';
    const deptName = departments?.find(d => d.id === t.department_id)?.name || 'Unknown Dept';
    
    return (
      <div className="card card-sm" style={{ marginBottom: '12px', background: 'var(--surface)', borderLeft: isOverdue ? '3px solid var(--red)' : '1px solid var(--border)', cursor: 'grab' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <span className="tag" style={{ fontSize: '10px' }}>TSK-{t.id}</span>
          {isOverdue && <span style={{ fontSize: '10px', color: 'var(--red)', fontWeight: 600 }}>OVERDUE</span>}
        </div>
        
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.4 }}>
          {t.title}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
          {isAdmin && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10M3 9h18"/></svg> {deptName}</div>}
          {t.due_date && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isOverdue ? 'var(--red)' : 'inherit' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> {new Date(t.due_date).toLocaleDateString()}</div>}
        </div>

        {t.status !== 'Completed' && (
          <div style={{ marginTop: '12px', display: 'flex', gap: '6px' }}>
            {t.status === 'Pending' && <button className="btn btn-secondary btn-full" style={{ fontSize: '10px', padding: '4px' }} onClick={() => handleStatus(t.id, 'In Progress')}>Start</button>}
            <button className="btn btn-ghost btn-full" style={{ fontSize: '10px', padding: '4px', color: 'var(--green)', borderColor: 'var(--green-border)' }} onClick={() => handleStatus(t.id, 'Completed')}>Mark Done</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: 'calc(100vh - 120px)' }}>
      
      {isAdmin && (
        <div className="card" style={{ padding: '20px' }}>
          <div className="sec-head" style={{ marginBottom: '16px' }}>
            <div className="sec-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 28, height: 28, background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              Create New Task
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
              <label>Task Description</label>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Upload firewall configuration evidence..." />
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Assign Department</label>
              <select value={deptId} onChange={e=>setDeptId(e.target.value)}>
                <option value="">Select Dept...</option>
                {departments?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Priority</label>
              <select value={priority} onChange={e=>setPriority(e.target.value)}>
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Due Date</label>
              <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={handleCreate} style={{ padding: '9px 16px', height: '37px' }}>Create Task</button>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        
        {/* Column 1: Pending */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-tertiary)' }} />
              To Do
            </div>
            <span className="tag">{pending.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {pending.map(t => <TaskCard key={t.id} t={t} />)}
            {pending.length === 0 && <div className="empty-sub" style={{ textAlign: 'center', marginTop: '20px' }}>No pending tasks</div>}
          </div>
        </div>

        {/* Column 2: In Progress */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
              In Progress
            </div>
            <span className="tag tag-accent">{inProgress.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {inProgress.map(t => <TaskCard key={t.id} t={t} />)}
            {inProgress.length === 0 && <div className="empty-sub" style={{ textAlign: 'center', marginTop: '20px' }}>None in progress</div>}
          </div>
        </div>

        {/* Column 3: Completed */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
              Completed
            </div>
            <span className="badge badge-pass">{completed.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {completed.map(t => <TaskCard key={t.id} t={t} />)}
            {completed.length === 0 && <div className="empty-sub" style={{ textAlign: 'center', marginTop: '20px' }}>No completed tasks</div>}
          </div>
        </div>

      </div>
    </div>
  );
}
