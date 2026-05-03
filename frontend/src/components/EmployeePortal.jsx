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

function ResultBanner({ result }) {
  if (!result) return null;
  const s = result.status?.toLowerCase();
  const map = {
    pass:        { cls: 'pass',        label: 'Compliant',      sub: 'Evidence accepted by AI validation' },
    fail:        { cls: 'fail',        label: 'Non-Compliant',  sub: 'Evidence does not meet control requirements' },
    need_review: { cls: 'need_review', label: 'Needs Review',   sub: 'Manual review recommended' },
  };
  const info = map[s] || { cls: '', label: s, sub: '' };
  return (
    <div className={`result-banner ${info.cls}`}>
      <div className="result-icon-box">
        {s === 'pass'   && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)"  strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
        {s === 'fail'   && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)"    strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
        {s === 'need_review' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
      </div>
      <div>
        <div className="result-verdict">{info.label}</div>
        <div className="result-sub">{info.sub}</div>
        <div className="result-sub" style={{ marginTop: '4px' }}>Confidence: <strong style={{ color: 'var(--text-primary)' }}>{result.confidence}</strong></div>
        {result.extracted_text && (
          <div className="result-ocr">OCR extract: {result.extracted_text.slice(0, 150)}{result.extracted_text.length > 150 ? '…' : ''}</div>
        )}
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
  const [file,            setFile]            = useState(null);
  const [dragOver,        setDragOver]        = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [result,          setResult]          = useState(null);
  const [history,         setHistory]         = useState([]);
  const fileRef = useRef();

  useEffect(() => {
    if (!selectedDept) { setEmployees([]); setSelectedEmp(null); setDeptControls([]); setSelectedControl(''); return; }
    fetch(`${API}/departments/${selectedDept}/employees`).then(r=>r.json()).then(d => { setEmployees(d); setSelectedEmp(null); }).catch(()=>{});
    fetch(`${API}/departments/${selectedDept}/controls`).then(r=>r.json()).then(d => { setDeptControls(d); setSelectedControl(''); }).catch(()=>{});
  }, [selectedDept]);

  const handleFile = (f) => {
    if (f) {
      setFile(f);
      setResult(null);
      // Auto-submit when file is selected and prerequisites are met
      if (selectedControl && selectedEmp) {
        autoSubmit(f);
      }
    }
  };
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  };

  const autoSubmit = async (uploadedFile) => {
    if (!selectedControl || !uploadedFile || !selectedEmp) return;
    setLoading(true); setResult(null);
    const fd = new FormData();
    fd.append('control_id',    selectedControl);
    fd.append('department_id', selectedDept);
    fd.append('employee_name', selectedEmp.name);
    fd.append('file', uploadedFile);
    try {
      const res  = await fetch(`${API}/evidence/upload/`, { method: 'POST', body: fd });
      const data = await res.json();
      setResult(data);
      const ctrl = deptControls.find(c => String(c.id) === selectedControl);
      setHistory(prev => [{ ...data, control: ctrl?.name || selectedControl, file: uploadedFile.name, employee: selectedEmp.name, role: selectedEmp.role, ts: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      setResult({ status: 'fail', confidence: 'N/A' });
    } finally {
      setLoading(false);
    }
  };

  const dept = departments.find(d => String(d.id) === selectedDept);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* Step 1 — Department */}
      <div className="card card-sm">
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>Employee Evidence Portal</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Select your department, then identify yourself to begin uploading compliance evidence.</div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Step 1 — Select Your Department</label>
          <select value={selectedDept} onChange={e => { setSelectedDept(e.target.value); setSelectedEmp(null); setResult(null); }} style={{ maxWidth: '360px' }}>
            <option value="">Choose department…</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {/* Step 2 — Employee picker */}
      {selectedDept && (
        <div>
          <div className="sec-head">
            <div className="sec-title">Step 2 — Identify Yourself</div>
            {dept && <span className="tag tag-accent">{dept.name}</span>}
          </div>
          <div className="g3">
            {employees.map(emp => {
              const isSelected = selectedEmp?.id === emp.id;
              return (
                <div
                  key={emp.id}
                  className={`emp-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => { setSelectedEmp(emp); setResult(null); }}
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

      {/* Step 3 — Upload */}
      {selectedEmp && (
        <div className="g2" style={{ alignItems: 'start' }}>

          {/* Form panel */}
          <div className="card">
            {/* Who */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '14px', marginBottom: '14px', borderBottom: '1px solid var(--border)' }}>
              <div className="emp-avatar" style={{ width: '32px', height: '32px', marginBottom: 0 }}><PersonIcon /></div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{selectedEmp.name}</div>
                <span className={`role-badge ${getRoleClass(selectedEmp.role)}`}>{selectedEmp.role}</span>
              </div>
            </div>

            <div>
              <div className="form-group">
                <label>Step 3 — Select Control</label>
                <select value={selectedControl} onChange={e => { setSelectedControl(e.target.value); setResult(null); }}>
                  <option value="">Choose a control…</option>
                  {deptControls.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Control hint */}
              {selectedControl && (() => {
                const ctrl = deptControls.find(c => String(c.id) === selectedControl);
                return ctrl?.description ? (
                  <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: '14px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {ctrl.description}
                  </div>
                ) : null;
              })()}

              <div className="form-group">
                <label>Step 4 — Upload Screenshot Evidence</label>
                <div
                  className={`drop-zone ${dragOver ? 'dz-active' : ''} ${loading ? 'dz-loading' : ''}`}
                  onClick={() => !loading && fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); if (!loading) setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { if (!loading) handleDrop(e); else e.preventDefault(); }}
                  style={loading ? { pointerEvents: 'auto', cursor: 'default' } : {}}
                >
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
                  {loading ? (
                    <>
                      <div className="dz-icon"><span className="spin" style={{ display: 'inline-block', fontSize: '22px', color: 'var(--accent)' }}>↻</span></div>
                      <div className="dz-label" style={{ color: 'var(--accent)' }}>Validating with AI…</div>
                      <div className="dz-sub">Please wait while we analyze your evidence</div>
                    </>
                  ) : (
                    <>
                      <div className="dz-icon"><UploadIcon /></div>
                      <div className="dz-label">Drop file here or <span>click to browse</span></div>
                      <div className="dz-sub">PNG, JPG supported · auto-validated on upload</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <ResultBanner result={result} />
          </div>

          {/* Right panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Controls checklist */}
            <div className="card">
              <div className="sec-head">
                <div className="sec-title">{dept?.name} Controls</div>
                <span className="tag">{deptControls.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '300px', overflowY: 'auto' }}>
                {deptControls.map(c => {
                  const active = String(c.id) === selectedControl;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedControl(String(c.id))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer', fontSize: '12.5px', transition: 'all 0.12s',
                        background: active ? 'var(--accent-dim)'  : 'transparent',
                        color:      active ? 'var(--accent)'      : 'var(--text-secondary)',
                        fontWeight: active ? 600 : 400,
                        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {history.map((r, i) => {
                    const s = r.status?.toLowerCase();
                    const color = s === 'pass' ? 'var(--green)' : s === 'fail' ? 'var(--red)' : 'var(--yellow)';
                    const label = s === 'pass' ? 'Compliant' : s === 'fail' ? 'Non-Compliant' : 'Review';
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.control}</div>
                          <div style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{r.employee} · {r.ts}</div>
                        </div>
                        <span style={{ fontWeight: 700, color, fontSize: '11px' }}>{label}</span>
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
