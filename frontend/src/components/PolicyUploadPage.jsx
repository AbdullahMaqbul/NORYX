import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const API = 'http://localhost:8000';

function fmtBytes(bytes) {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(value) {
  return value ? new Date(value).toLocaleString() : '-';
}

function fmtPct(value) {
  const n = Number(value || 0);
  return `${n.toFixed(n % 1 === 0 ? 0 : 1)}%`;
}

function scoreClass(value) {
  if (value >= 75) return 'hm-high';
  if (value >= 45) return 'hm-medium';
  return 'hm-low';
}

function statusLabel(status) {
  return {
    compliant: 'Compliant',
    partial: 'Partially Compliant',
    not_compliant: 'Non-Compliant',
  }[status] || status;
}

function statusBadge(status) {
  if (status === 'compliant') return 'badge badge-pass';
  if (status === 'partial') return 'badge badge-review';
  return 'badge badge-fail';
}

function engineLabel(assessment, useGrcExpert) {
  const engine = assessment?.requested_engine || assessment?.engine_key;
  if (engine === 'grcexpert' || useGrcExpert) return 'GRC Expert';
  return 'Standard';
}

function statusRec(status) {
  if (status === 'compliant') return 'Maintain current controls and review periodically to sustain compliance.';
  if (status === 'partial') return 'Expand policy coverage and strengthen language to fully address this requirement.';
  return 'Develop and implement the required controls to achieve compliance with this requirement.';
}

function getControlLabel(frameworksList) {
  if (!frameworksList?.length) return 'Controls';
  if (frameworksList.length > 1) return 'Controls / Requirements';
  const name = (frameworksList[0]?.framework_name || '').toLowerCase();
  if (name.includes('pdpl') || name.includes('personal data protection')) return 'Articles';
  if (name.includes('pci') || name.includes('dss')) return 'Requirements';
  return 'Controls';
}

// ── SVG Donut Chart ──────────────────────────────────────────
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutArcPath(cx, cy, outerR, innerR, startAngle, endAngle) {
  const p1 = polarToCartesian(cx, cy, outerR, startAngle);
  const p2 = polarToCartesian(cx, cy, outerR, endAngle);
  const p3 = polarToCartesian(cx, cy, innerR, endAngle);
  const p4 = polarToCartesian(cx, cy, innerR, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function DonutChart({ compliant = 0, partial = 0, nonCompliant = 0, size = 160 }) {
  const total = compliant + partial + nonCompliant;

  if (total === 0) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
        No data
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.44;
  const innerR = size * 0.28;
  const pct = Math.round((compliant / total) * 100);

  const segments = [
    { value: compliant, color: 'var(--green)', key: 'c' },
    { value: partial, color: 'var(--yellow)', key: 'p' },
    { value: nonCompliant, color: 'var(--red)', key: 'n' },
  ];

  let angle = 0;
  const arcs = segments.map(seg => {
    const span = (seg.value / total) * 360;
    const start = angle;
    const end = angle + span;
    angle = end;
    return { ...seg, span, start, end };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-label={`${pct}% compliant`}>
      <circle cx={cx} cy={cy} r={outerR} style={{ fill: 'var(--surface-3)' }} />
      <circle cx={cx} cy={cy} r={innerR} style={{ fill: 'var(--surface)' }} />
      {arcs.map(arc => {
        if (!arc.value) return null;
        if (arc.span >= 359.9) {
          return (
            <g key={arc.key}>
              <circle cx={cx} cy={cy} r={outerR} style={{ fill: arc.color, opacity: 0.88 }} />
              <circle cx={cx} cy={cy} r={innerR} style={{ fill: 'var(--surface)' }} />
            </g>
          );
        }
        return (
          <path
            key={arc.key}
            d={donutArcPath(cx, cy, outerR, innerR, arc.start, arc.end)}
            style={{ fill: arc.color, opacity: 0.88 }}
          />
        );
      })}
      <text
        x={cx} y={cy - 4}
        textAnchor="middle"
        style={{ fill: 'var(--text-primary)', fontSize: `${(size * 0.118).toFixed(1)}px`, fontWeight: 800, fontFamily: 'Inter, sans-serif' }}
      >
        {pct}%
      </text>
      <text
        x={cx} y={cy + size * 0.1}
        textAnchor="middle"
        style={{ fill: 'var(--text-tertiary)', fontSize: `${(size * 0.068).toFixed(1)}px`, fontFamily: 'Inter, sans-serif' }}
      >
        Compliant
      </text>
    </svg>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function PolicyUploadPage() {
  const [companyName, setCompanyName] = useState('Entity X');
  const [documentType, setDocumentType] = useState('Policy Pack');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [documents, setDocuments] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [selectedFrameworks, setSelectedFrameworks] = useState(['all']);
  const [useGrcExpert, setUseGrcExpert] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [assessing, setAssessing] = useState(false);
  const [assessmentMessage, setAssessmentMessage] = useState('');
  const fileRef = useRef(null);

  const loadDocuments = useCallback(() => {
    fetch(`${API}/policy-documents`)
      .then(r => r.json())
      .then(data => setDocuments(Array.isArray(data) ? data : []))
      .catch(() => setDocuments([]));
  }, []);

  const loadFrameworks = useCallback(() => {
    fetch(`${API}/policy-documents/assessment-frameworks`)
      .then(r => r.json())
      .then(data => setFrameworks(Array.isArray(data?.items) ? data.items : []))
      .catch(() => setFrameworks([]));
  }, []);

  useEffect(() => {
    loadDocuments();
    loadFrameworks();
  }, [loadDocuments, loadFrameworks]);

  useEffect(() => {
    if (!selectedDocumentId && documents[0]) {
      setSelectedDocumentId(String(documents[0].id));
    }
  }, [documents, selectedDocumentId]);

  const selectedDocument = useMemo(
    () => documents.find(doc => String(doc.id) === String(selectedDocumentId)),
    [documents, selectedDocumentId]
  );

  const allSelected = selectedFrameworks.includes('all');
  const frameworkPayload = allSelected ? ['all'] : selectedFrameworks;
  const assessmentEngine = useGrcExpert ? 'grcexpert' : 'heuristic_v1';
  const canAssess = Boolean(selectedDocumentId) && frameworkPayload.length > 0 && !assessing;

  const detailRows = useMemo(() => {
    if (!assessment?.frameworks) return [];
    return assessment.frameworks.flatMap(framework =>
      framework.details.map(item => ({
        ...item,
        framework_name: framework.framework_name,
      }))
    );
  }, [assessment]);

  const summaryStats = useMemo(() => {
    if (!assessment?.frameworks) return null;
    let compliant = 0, partial = 0, nonCompliant = 0;
    assessment.frameworks.forEach(fw => {
      compliant += fw.compliant || 0;
      partial += fw.partial || 0;
      nonCompliant += fw.not_compliant || 0;
    });
    const total = compliant + partial + nonCompliant;
    const findings = partial + nonCompliant;
    const overallPct = total > 0 ? (compliant / total) * 100 : 0;
    return { total, compliant, partial, nonCompliant, findings, overallPct };
  }, [assessment]);

  const controlLabel = useMemo(
    () => getControlLabel(assessment?.frameworks),
    [assessment]
  );

  const reportUrl = assessment
    ? `${API}/policy-documents/${assessment.document.id}/assessment-report?frameworks=${encodeURIComponent(assessment.selected_frameworks.join(','))}&engine=${encodeURIComponent(assessment.requested_engine || assessmentEngine)}`
    : '';

  const handleFile = selected => {
    if (!selected) return;
    setFile(selected);
    setMessage('');
  };

  const upload = async () => {
    if (!file || !companyName.trim()) return;
    setLoading(true);
    setMessage('');
    const form = new FormData();
    form.append('company_name', companyName.trim());
    form.append('document_type', documentType);
    form.append('notes', notes);
    form.append('uploaded_by', 'Admin');
    form.append('file', file);
    try {
      const res = await fetch(`${API}/policy-documents/upload`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Upload failed');
      setMessage(`Uploaded ${data.original_filename}`);
      setSelectedDocumentId(String(data.id));
      setFile(null);
      setNotes('');
      if (fileRef.current) fileRef.current.value = '';
      loadDocuments();
    } catch (err) {
      setMessage(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const removeDocument = async id => {
    await fetch(`${API}/policy-documents/${id}`, { method: 'DELETE' }).catch(() => {});
    if (String(selectedDocumentId) === String(id)) {
      setSelectedDocumentId('');
      setAssessment(null);
    }
    loadDocuments();
  };

  const toggleAllFrameworks = () => {
    setSelectedFrameworks(['all']);
  };

  const toggleFramework = key => {
    setSelectedFrameworks(current => {
      const withoutAll = current.filter(item => item !== 'all');
      if (withoutAll.includes(key)) {
        const next = withoutAll.filter(item => item !== key);
        return next.length ? next : ['all'];
      }
      return [...withoutAll, key];
    });
  };

  const assess = async (documentId = selectedDocumentId) => {
    if (!documentId) return;
    setSelectedDocumentId(String(documentId));
    setAssessing(true);
    setAssessmentMessage('');
    try {
      const res = await fetch(`${API}/policy-documents/${documentId}/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameworks: frameworkPayload, engine: assessmentEngine }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Assessment failed');
      setAssessment(data);
      setAssessmentMessage(data.fallback_reason
        ? `Assessment completed with fallback: ${data.fallback_reason}`
        : `Assessment completed for ${data.document.original_filename}`);
    } catch (err) {
      setAssessment(null);
      setAssessmentMessage(err.message || 'Assessment failed');
    } finally {
      setAssessing(false);
    }
  };

  const canUpload = file && companyName.trim() && !loading;

  return (
    <div className="policy-upload-page">

      {/* ── Top KPI Row ── */}
      <div className="g3">
        <div className="card card-sm kpi-card kpi-card-accent">
          <div className="card-label">Uploaded Policies</div>
          <div className="card-value" style={{ color: 'var(--accent)' }}>{documents.length}</div>
        </div>
        <div className="card card-sm kpi-card kpi-card-green">
          <div className="card-label">Assessment Frameworks</div>
          <div className="card-value" style={{ color: 'var(--green)' }}>{frameworks.length || '-'}</div>
        </div>
        <div className="card card-sm kpi-card kpi-card-yellow">
          <div className="card-label">Latest Score</div>
          <div className="card-value" style={{ color: 'var(--yellow)', fontSize: '24px' }}>
            {assessment ? fmtPct(assessment.overall_percentage) : '-'}
          </div>
        </div>
      </div>

      {/* ── Assessment Summary (shown after assessment completes) ── */}
      {summaryStats && (
        <div className="assessment-summary-section animate-in">

          <div className="sec-head" style={{ marginBottom: 0 }}>
            <div className="sec-title">Assessment Summary</div>
            <span className="tag tag-accent">{assessment.document?.company_name}</span>
          </div>

          {/* 6 KPI Summary Cards */}
          <div className="summary-kpi-grid">
            <div className="card card-sm kpi-card kpi-card-accent">
              <div className="card-label">Total {controlLabel}</div>
              <div className="card-value" style={{ color: 'var(--accent)', fontSize: '24px' }}>
                {summaryStats.total}
              </div>
              <div className="card-footer">{assessment.frameworks?.length} framework(s) assessed</div>
            </div>

            <div className="card card-sm kpi-card kpi-card-green">
              <div className="card-label">Compliant</div>
              <div className="card-value" style={{ color: 'var(--green)', fontSize: '24px' }}>
                {summaryStats.compliant}
              </div>
              <div className="card-footer">
                {summaryStats.total > 0 ? Math.round(summaryStats.compliant / summaryStats.total * 100) : 0}% of total
              </div>
            </div>

            <div className="card card-sm kpi-card kpi-card-yellow">
              <div className="card-label">Partially Compliant</div>
              <div className="card-value" style={{ color: 'var(--yellow)', fontSize: '24px' }}>
                {summaryStats.partial}
              </div>
              <div className="card-footer">
                {summaryStats.total > 0 ? Math.round(summaryStats.partial / summaryStats.total * 100) : 0}% of total
              </div>
            </div>

            <div className="card card-sm kpi-card kpi-card-red">
              <div className="card-label">Non-Compliant</div>
              <div className="card-value" style={{ color: 'var(--red)', fontSize: '24px' }}>
                {summaryStats.nonCompliant}
              </div>
              <div className="card-footer">
                {summaryStats.total > 0 ? Math.round(summaryStats.nonCompliant / summaryStats.total * 100) : 0}% of total
              </div>
            </div>

            <div className="card card-sm kpi-card" style={{ borderTopColor: 'var(--purple)' }}>
              <div className="card-label">Findings / Gaps</div>
              <div className="card-value" style={{ color: 'var(--purple)', fontSize: '24px' }}>
                {summaryStats.findings}
              </div>
              <div className="card-footer">Requiring attention</div>
            </div>

            <div className="card card-sm kpi-card" style={{
              borderTopColor: summaryStats.overallPct >= 75
                ? 'var(--green)'
                : summaryStats.overallPct >= 45 ? 'var(--yellow)' : 'var(--red)',
            }}>
              <div className="card-label">Overall Compliance</div>
              <div className="card-value" style={{
                fontSize: '24px',
                color: summaryStats.overallPct >= 75
                  ? 'var(--green)'
                  : summaryStats.overallPct >= 45 ? 'var(--yellow)' : 'var(--red)',
              }}>
                {fmtPct(summaryStats.overallPct)}
              </div>
              <div className="card-footer">Compliant / Total {controlLabel.toLowerCase()}</div>
            </div>
          </div>

          {/* Pie Chart + Framework Results */}
          <div className="assessment-vis-row">

            {/* Donut Chart Card */}
            <div className="card assessment-pie-card">
              <div className="sec-head">
                <div className="sec-title">Compliance Distribution</div>
              </div>
              <div className="pie-chart-card">
                <DonutChart
                  compliant={summaryStats.compliant}
                  partial={summaryStats.partial}
                  nonCompliant={summaryStats.nonCompliant}
                  size={160}
                />
                <div className="pie-legend">
                  {[
                    { label: 'Compliant', count: summaryStats.compliant, color: 'var(--green)' },
                    { label: 'Partially Compliant', count: summaryStats.partial, color: 'var(--yellow)' },
                    { label: 'Non-Compliant', count: summaryStats.nonCompliant, color: 'var(--red)' },
                  ].map(item => (
                    <div className="pie-legend-item" key={item.label}>
                      <span className="pie-legend-dot" style={{ background: item.color }} />
                      <span className="pie-legend-label">{item.label}</span>
                      <span className="pie-legend-count">{item.count}</span>
                      <span className="pie-legend-pct">
                        {summaryStats.total > 0 ? Math.round(item.count / summaryStats.total * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Framework Score Grid */}
            <div>
              <div className="sec-head" style={{ marginBottom: '10px' }}>
                <div className="sec-title">Framework Results</div>
                {reportUrl && (
                  <a
                    className="btn btn-secondary"
                    href={reportUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '12px', padding: '5px 12px' }}
                  >
                    Download Report
                  </a>
                )}
              </div>
              <div className="assessment-score-grid">
                {assessment.frameworks.map(framework => (
                  <div
                    key={framework.framework_key || framework.framework_name}
                    className={`hm-cell ${scoreClass(framework.percentage)}`}
                  >
                    <span className="hm-pct">{fmtPct(framework.percentage)}</span>
                    <span className="hm-name">{framework.framework_name}</span>
                    <div className="assessment-counts">
                      <span>{framework.compliant} compliant</span>
                      <span>{framework.partial} partially compliant</span>
                      <span>{framework.not_compliant} non-compliant</span>
                    </div>
                    <div className="progress">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.max(0, Math.min(100, framework.percentage))}%`,
                          background: framework.percentage >= 75
                            ? 'var(--green)'
                            : framework.percentage >= 45 ? 'var(--yellow)' : 'var(--red)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Upload + Assessment Config ── */}
      <div className="g2-wide">
        <div className="card">
          <div className="sec-head">
            <div className="sec-title">Upload Company Policy</div>
            <span className="tag tag-accent">Admin</span>
          </div>

          <div className="form-group">
            <label>Company / Entity Name</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Entity X" />
          </div>

          <div className="form-group">
            <label>Document Type</label>
            <select value={documentType} onChange={e => setDocumentType(e.target.value)}>
              <option>Policy Pack</option>
              <option>Information Security Policy</option>
              <option>Access Control Policy</option>
              <option>Incident Response Policy</option>
              <option>Vendor Security Policy</option>
              <option>Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional internal notes..."
            />
          </div>

          <div
            className={`drop-zone ${dragOver ? 'dz-active' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            role="button"
            tabIndex={0}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files?.[0])}
            />
            <div className="dz-icon">+</div>
            <div className="dz-label">Drop policy file here or <span>click to browse</span></div>
            {file && <div className="dz-file">{file.name} - {fmtBytes(file.size)}</div>}
          </div>

          <div className="policy-actions-row">
            <button className="btn btn-primary" disabled={!canUpload} onClick={upload}>
              {loading ? 'Uploading...' : 'Upload Policy'}
            </button>
            {message && (
              <span className={`policy-message ${message.startsWith('Uploaded') ? 'ok' : 'bad'}`}>
                {message}
              </span>
            )}
          </div>
        </div>

        <div className="card">
          <div className="sec-head">
            <div className="sec-title">Framework Assessment</div>
            <span className="tag">{engineLabel(assessment, useGrcExpert)}</span>
          </div>

          <div className="form-group">
            <label>Policy Document</label>
            <select value={selectedDocumentId} onChange={e => setSelectedDocumentId(e.target.value)}>
              <option value="">Select uploaded policy</option>
              {documents.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.company_name} - {doc.original_filename}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Framework Scope</label>
            <div className="framework-picker">
              <label className={`framework-check ${allSelected ? 'active' : ''}`}>
                <input type="checkbox" checked={allSelected} onChange={toggleAllFrameworks} />
                <span>All frameworks</span>
              </label>
              {frameworks.map(framework => (
                <label
                  key={framework.framework_key}
                  className={`framework-check ${!allSelected && selectedFrameworks.includes(framework.framework_key) ? 'active' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={!allSelected && selectedFrameworks.includes(framework.framework_key)}
                    onChange={() => toggleFramework(framework.framework_key)}
                  />
                  <span>{framework.framework_name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Assessment Engine</label>
            <label className={`framework-check engine-check ${useGrcExpert ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={useGrcExpert}
                onChange={e => setUseGrcExpert(e.target.checked)}
              />
              <span>GRC Expert</span>
            </label>
          </div>

          <div className="policy-actions-row">
            <button className="btn btn-primary" disabled={!canAssess} onClick={() => assess()}>
              {assessing ? 'Assessing...' : 'Assess Policy'}
            </button>
            {assessment && (
              <a className="btn btn-secondary" href={reportUrl} target="_blank" rel="noreferrer">
                Download Report
              </a>
            )}
          </div>

          {selectedDocument && (
            <div className="assessment-target">
              <span>{selectedDocument.company_name}</span>
              <strong>{selectedDocument.original_filename}</strong>
            </div>
          )}
          {assessmentMessage && (
            <div className={`assessment-message ${assessment ? 'ok' : 'bad'}`}>
              {assessmentMessage}
            </div>
          )}
        </div>
      </div>

      {/* ── Control-Level Results Table ── */}
      {assessment && detailRows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Framework</th>
                <th>Control / Article</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Evidence / Finding</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map((row, index) => (
                <tr key={`${row.framework_name}-${row.control_id}-${index}`}>
                  <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{row.framework_name}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{row.control_id}</div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginTop: '2px', maxWidth: '200px' }}>
                      {row.title}
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className={statusBadge(row.status)}>{statusLabel(row.status)}</span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtPct(row.confidence)}</td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: '320px' }}>
                    {(row.evidence_en || row.evidence) ? (
                      <div>{row.evidence_en || row.evidence}</div>
                    ) : null}
                    {row.evidence_ar && (
                      <div className="arabic-line" dir="rtl">{row.evidence_ar}</div>
                    )}
                    {(row.gap_en || row.gap) && (
                      <div className="gap-line">{row.gap_en || row.gap}</div>
                    )}
                    {row.gap_ar && (
                      <div className="arabic-line gap-line" dir="rtl">{row.gap_ar}</div>
                    )}
                    {!row.evidence_en && !row.evidence && !row.gap_en && !row.gap && (
                      <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '11px' }}>
                        No matching evidence found
                      </span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: '240px', fontSize: '12px' }}>
                    {row.rationale_en || row.rationale || statusRec(row.status)}
                    {row.rationale_ar && (
                      <div className="arabic-line" dir="rtl" style={{ marginTop: '4px' }}>{row.rationale_ar}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Uploaded Documents Table ── */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Document</th>
              <th>Type</th>
              <th>Size</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty">
                    <div className="empty-title">No policy files uploaded</div>
                  </div>
                </td>
              </tr>
            ) : documents.map(doc => (
              <tr key={doc.id}>
                <td style={{ fontWeight: 700 }}>{doc.company_name}</td>
                <td>
                  <div style={{ fontWeight: 650 }}>{doc.original_filename}</div>
                  {doc.notes && (
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginTop: '2px' }}>
                      {doc.notes}
                    </div>
                  )}
                </td>
                <td><span className="tag">{doc.document_type}</span></td>
                <td>{fmtBytes(doc.file_size)}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{fmtDate(doc.uploaded_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <a
                      className="btn btn-secondary"
                      href={`${API}/policy-documents/${doc.id}/file`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                    <button className="btn btn-secondary" onClick={() => assess(doc.id)}>
                      Assess
                    </button>
                    <button className="btn btn-danger" onClick={() => removeDocument(doc.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
