import React, { useState, useEffect, useRef } from 'react';

const API = 'http://localhost:8000';

function getRoleClass(role) {
  if (!role) return 'role-analyst';
  const r = role.toLowerCase();
  if (r.includes('manager') || r.includes('officer')) return 'role-manager';
  if (r.includes('engineer') || r.includes('administrator') || r.includes('hunter')) return 'role-engineer';
  return 'role-analyst';
}

function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }}>
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  );
}

function statusMeta(s) {
  const key = (s || '').toLowerCase();
  if (key === 'pass')        return { cls: 'badge-pass',   label: 'Compliant',      color: 'var(--green)' };
  if (key === 'fail')        return { cls: 'badge-fail',   label: 'Non-Compliant',  color: 'var(--red)'   };
  if (key === 'need_review') return { cls: 'badge-review', label: 'Needs Review',   color: 'var(--yellow)' };
  return { cls: '', label: s, color: 'var(--text-secondary)' };
}

function MultiResultPanel({ results, controlName }) {
  if (!results || results.length === 0) return null;

  const passed  = results.filter(r => r.status?.toLowerCase() === 'pass').length;
  const failed  = results.filter(r => r.status?.toLowerCase() === 'fail').length;
  const review  = results.filter(r => r.status?.toLowerCase() === 'need_review').length;
  const allPass = passed === results.length;
  const anyFail = failed > 0;

  const summaryColor = allPass ? 'var(--green)' : anyFail ? 'var(--red)' : 'var(--yellow)';
  const summaryLabel = allPass ? 'All Evidence Passed' : anyFail ? `${failed} Evidence Failed` : 'Review Required';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
      {/* Summary header */}
      <div style={{
        padding: '10px 14px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${summaryColor}33`,
        background: `${summaryColor}11`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '13px', color: summaryColor }}>{summaryLabel}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {results.length} evidence submitted for {controlName || 'this control'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {passed > 0  && <span className="badge badge-pass"   style={{ fontSize: '10px' }}>{passed} Pass</span>}
          {failed > 0  && <span className="badge badge-fail"   style={{ fontSize: '10px' }}>{failed} Fail</span>}
          {review > 0  && <span className="badge badge-review" style={{ fontSize: '10px' }}>{review} Review</span>}
        </div>
      </div>

      {/* Per-file rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {results.map((r, i) => {
          const m = statusMeta(r.status);
          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-light)',
              fontSize: '12px',
            }}>
              <span style={{ flex: 1, color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.fileName || `Evidence ${i + 1}`}
              </span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>
                Confidence: <strong style={{ color: 'var(--text-primary)' }}>{r.confidence}</strong>
              </span>
              <span className={`badge ${m.cls}`} style={{ fontSize: '10px', minWidth: '90px', textAlign: 'center' }}>
                {m.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EmployeePortal({ departments }) {
  const [selectedDept,    setSelectedDept]    = useState('');
  const [employees,       setEmployees]       = useState([]);
  const [selectedEmp,     setSelectedEmp]     = useState(null);
  const [deptControls,    setDeptControls]    = useState([]);
  const [selectedControl, setSelectedControl] = useState('');
  const [files,           setFiles]           = useState([]);
  const [dragOver,        setDragOver]        = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [progress,        setProgress]        = useState(null);   // { current, total }
  const [results,         setResults]         = useState([]);
  const [history,         setHistory]         = useState([]);
  const fileRef = useRef();
  const lockedToDepartment = departments.length === 1;

  useEffect(() => {
    if (!selectedDept) { setEmployees([]); setSelectedEmp(null); setDeptControls([]); setSelectedControl(''); return; }
    fetch(`${API}/departments/${selectedDept}/employees`).then(r => r.json()).then(d => { setEmployees(d); setSelectedEmp(null); }).catch(() => {});
    fetch(`${API}/departments/${selectedDept}/controls`).then(r => r.json()).then(d => { setDeptControls(d); setSelectedControl(''); }).catch(() => {});
  }, [selectedDept]);

  useEffect(() => {
    if (lockedToDepartment && !selectedDept) {
      setSelectedDept(String(departments[0].id));
    }
  }, [departments, lockedToDepartment, selectedDept]);

  const pickFiles = (fileList) => {
    const imgs = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (imgs.length === 0) return;
    setFiles(imgs);
    setResults([]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!selectedControl || loading) return;
    const imgs = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (imgs.length === 0) return;
    setFiles(imgs);
    setResults([]);
  };

  const submitAll = async () => {
    if (!selectedControl || !selectedEmp || files.length === 0 || loading) return;
    setLoading(true);
    setResults([]);

    const allResults = [];
    for (let i = 0; i < files.length; i++) {
      setProgress({ current: i + 1, total: files.length });
      const f = files[i];
      const fd = new FormData();
      fd.append('control_id',    selectedControl);
      fd.append('department_id', selectedDept);
      fd.append('employee_name', selectedEmp.name);
      fd.append('file',          f);
      try {
        const res  = await fetch(`${API}/evidence/upload/`, { method: 'POST', body: fd });
        const data = await res.json();
        allResults.push({ ...data, fileName: f.name });
      } catch {
        allResults.push({ status: 'fail', confidence: 'N/A', fileName: f.name });
      }
      setResults([...allResults]);
    }

    const ctrl = deptControls.find(c => String(c.id) === selectedControl);
    setHistory(prev => [
      ...allResults.map(r => ({
        ...r,
        control:  ctrl?.name || selectedControl,
        employee: selectedEmp.name,
        role:     selectedEmp.role,
        ts:       new Date().toLocaleTimeString(),
      })),
      ...prev,
    ].slice(0, 20));

    setFiles([]);
    if (fileRef.current) fileRef.current.value = '';
    setLoading(false);
    setProgress(null);
  };

  const dept     = departments.find(d => String(d.id) === selectedDept);
  const canUpload = Boolean(selectedControl && selectedEmp && !loading);
  const ctrl      = deptControls.find(c => String(c.id) === selectedControl);

  return (
    <div className="portal-stack">

      {/* Department */}
      <div className="portal-intro">
        <div>
          <div className="eyebrow">Evidence Workspace</div>
          <div className="portal-title">Submit control evidence</div>
          <div className="portal-subtitle">Select a control, choose your team member, and upload one or more screenshots for strict AI validation.</div>
        </div>
        <div className="portal-context">
          {lockedToDepartment ? (
            <div className="context-chip">
              <span>Department</span>
              <strong>{departments[0]?.name || 'Not configured'}</strong>
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Department</label>
              <select value={selectedDept} onChange={e => { setSelectedDept(e.target.value); setSelectedEmp(null); setResults([]); }} style={{ minWidth: '260px' }}>
                <option value="">Choose department…</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Employee picker */}
      {selectedDept && (
        <div>
          <div className="sec-head">
            <div>
              <div className="step-kicker">Team member</div>
              <div className="sec-title">Identify yourself</div>
            </div>
            {dept && <span className="tag tag-accent">{dept.name}</span>}
          </div>
          <div className="g3">
            {employees.map(emp => {
              const isSelected = selectedEmp?.id === emp.id;
              return (
                <div
                  key={emp.id}
                  className={`emp-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => { setSelectedEmp(emp); setResults([]); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedEmp(emp); setResults([]); }
                  }}
                >
                  <div className="emp-avatar"><PersonIcon /></div>
                  <div className="emp-name">{emp.name}</div>
                  <span className={`role-badge ${getRoleClass(emp.role)}`}>{emp.role}</span>
                  {isSelected && <div className="emp-selected-tag">Selected</div>}
                </div>
              );
            })}
            {employees.length === 0 && (
              <div className="card card-sm"><div className="empty"><div className="empty-sub">No employees in this department</div></div></div>
            )}
          </div>
        </div>
      )}

      {/* Upload panel */}
      {selectedEmp && (
        <div className="evidence-layout">

          {/* Left: form */}
          <div className="card">
            {/* Who */}
            <div className="person-strip">
              <div className="emp-avatar" style={{ width: '32px', height: '32px', marginBottom: 0 }}><PersonIcon /></div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{selectedEmp.name}</div>
                <span className={`role-badge ${getRoleClass(selectedEmp.role)}`}>{selectedEmp.role}</span>
              </div>
            </div>

            <div>
              <div className="form-group">
                <label>Control</label>
                <select value={selectedControl} onChange={e => { setSelectedControl(e.target.value); setResults([]); setFiles([]); }}>
                  <option value="">Choose a control…</option>
                  {deptControls.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Control hint */}
              {ctrl?.description && (
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: '14px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {ctrl.description}
                </div>
              )}

              {/* Drop zone */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ marginBottom: 0 }}>Screenshot evidence</label>
                  <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>Multiple files supported</span>
                </div>
                <div
                  className={`drop-zone ${dragOver ? 'dz-active' : ''} ${loading ? 'dz-loading' : ''} ${!selectedControl ? 'dz-disabled' : ''}`}
                  onClick={() => canUpload && fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); if (canUpload) setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { if (canUpload) handleDrop(e); else e.preventDefault(); }}
                  style={loading ? { pointerEvents: 'auto', cursor: 'default' } : {}}
                  aria-disabled={!selectedControl}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => { if (e.target.files?.length) pickFiles(e.target.files); }}
                  />

                  {loading ? (
                    <>
                      <div className="dz-icon"><span className="spin" style={{ display: 'inline-block', fontSize: '22px', color: 'var(--accent)' }}>↻</span></div>
                      <div className="dz-label" style={{ color: 'var(--accent)' }}>
                        Validating evidence {progress?.current}/{progress?.total}…
                      </div>
                      <div className="dz-sub">Please wait while each screenshot is analysed</div>
                    </>
                  ) : files.length > 0 ? (
                    <>
                      <div className="dz-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <div className="dz-label" style={{ color: 'var(--text-primary)' }}>
                        {files.length} file{files.length > 1 ? 's' : ''} selected
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%', maxWidth: '320px', margin: '6px auto 0' }}>
                        {files.map((f, i) => (
                          <div key={i} style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--surface-2)', borderRadius: 'var(--radius-xs)', padding: '3px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.name}
                          </div>
                        ))}
                      </div>
                      <div className="dz-sub" style={{ marginTop: '6px' }}>Click to change selection</div>
                    </>
                  ) : (
                    <>
                      <div className="dz-icon"><UploadIcon /></div>
                      <div className="dz-label">
                        {selectedControl
                          ? <>Drop files here or <span>click to browse</span></>
                          : 'Select a control to enable upload'}
                      </div>
                      <div className="dz-sub">
                        {selectedControl
                          ? 'PNG/JPG screenshots — select as many as needed for strict evidence'
                          : 'The selected control keeps each submission properly mapped'}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Submit button */}
              {files.length > 0 && !loading && (
                <button
                  className="btn btn-primary btn-full"
                  style={{ marginTop: '4px' }}
                  onClick={submitAll}
                  disabled={!canUpload}
                >
                  Submit {files.length} Evidence File{files.length > 1 ? 's' : ''}
                </button>
              )}
            </div>

            {/* Multi-result panel */}
            <MultiResultPanel results={results} controlName={ctrl?.name} />
          </div>

          {/* Right panel */}
          <div className="side-stack">

            {/* Controls checklist */}
            <div className="card">
              <div className="sec-head">
                <div className="sec-title">{dept?.name} Controls</div>
                <span className="tag">{deptControls.length}</span>
              </div>
              <div className="control-list">
                {deptControls.map(c => {
                  const active = String(c.id) === selectedControl;
                  return (
                    <div
                      key={c.id}
                      onClick={() => { setSelectedControl(String(c.id)); setResults([]); setFiles([]); }}
                      className={`control-item ${active ? 'active' : ''}`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedControl(String(c.id));
                          setResults([]);
                          setFiles([]);
                        }
                      }}
                    >
                      <span>{c.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="card">
                <div className="sec-title" style={{ marginBottom: '12px' }}>Recent Submissions</div>
                <div className="submission-list">
                  {history.map((r, i) => {
                    const m = statusMeta(r.status);
                    return (
                      <div key={i} className="submission-item">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.control}</div>
                          <div style={{ color: 'var(--text-tertiary)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.employee} · {r.fileName || ''} · {r.ts}
                          </div>
                        </div>
                        <span style={{ fontWeight: 700, color: m.color, fontSize: '11px', flexShrink: 0 }}>{m.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Idle state */}
      {!selectedDept && (
        <div className="card">
          <div className="empty" style={{ padding: '56px 20px' }}>
            <div className="empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="empty-title">Select Your Department</div>
            <div className="empty-sub">Choose a department above to see your team and the controls you are responsible for.</div>
            {departments.length === 0 && (
              <div style={{ marginTop: '12px', padding: '8px 14px', background: 'var(--yellow-dim)', border: '1px solid var(--yellow-border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--yellow)' }}>
                No departments configured. Contact your administrator.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
