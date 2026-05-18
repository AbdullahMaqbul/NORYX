import React, { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:8000';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function reviewStatus(nextReviewDate) {
  if (!nextReviewDate) return { label: 'Not Scheduled', color: 'var(--text-tertiary)', cls: '' };
  const days = Math.ceil((new Date(nextReviewDate) - new Date()) / 86400000);
  if (days < 0)  return { label: `Overdue ${Math.abs(days)}d`, color: 'var(--red)',    cls: 'badge-fail'   };
  if (days <= 30) return { label: `Due in ${days}d`,            color: 'var(--yellow)', cls: 'badge-review' };
  return { label: `In ${days}d`, color: 'var(--green)', cls: 'badge-pass' };
}

const RISK_STYLE = {
  High:   { cls: 'badge-fail',   color: 'var(--red)'    },
  Medium: { cls: 'badge-review', color: 'var(--yellow)' },
  Low:    { cls: 'badge-pass',   color: 'var(--green)'  },
};

const BLANK = {
  name: '', service_type: '', criticality: 'Medium', handles_pii: false,
  risk_rating: 'Medium', contact_name: '', contact_email: '',
  last_assessment_date: '', next_review_date: '', notes: '',
};

export default function VendorRisk() {
  const [vendors,   setVendors]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [acting,    setActing]    = useState(null);
  const [form,      setForm]      = useState(BLANK);
  const [search,    setSearch]    = useState('');
  const [filterRisk,setFilterRisk]= useState('All');

  const fetchData = useCallback(() => {
    fetch(`${API}/vendors/`).then(r => r.json()).then(d => setVendors(Array.isArray(d) ? d : [])).catch(() => setVendors([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setForm(BLANK); setEditId(null); setShowForm(true); };
  const openEdit = (v) => {
    setForm({
      name: v.name, service_type: v.service_type, criticality: v.criticality,
      handles_pii: v.handles_pii || false, risk_rating: v.risk_rating,
      contact_name: v.contact_name || '', contact_email: v.contact_email || '',
      last_assessment_date: v.last_assessment_date ? v.last_assessment_date.slice(0, 10) : '',
      next_review_date: v.next_review_date ? v.next_review_date.slice(0, 10) : '',
      notes: v.notes || '',
    });
    setEditId(v.id);
    setShowForm(true);
  };

  const saveVendor = async () => {
    if (!form.name.trim() || !form.service_type.trim()) return;
    setSaving(true);
    const body = {
      name: form.name, service_type: form.service_type, criticality: form.criticality,
      handles_pii: !!form.handles_pii, risk_rating: form.risk_rating,
      contact_name: form.contact_name || null, contact_email: form.contact_email || null,
      last_assessment_date: form.last_assessment_date || null,
      next_review_date: form.next_review_date || null,
      notes: form.notes || null,
    };
    if (editId) {
      await fetch(`${API}/vendors/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
    } else {
      await fetch(`${API}/vendors/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
    }
    setSaving(false);
    setShowForm(false);
    setEditId(null);
    fetchData();
  };

  const deleteVendor = async (id) => {
    setActing(id);
    await fetch(`${API}/vendors/${id}`, { method: 'DELETE' }).catch(() => {});
    setActing(null);
    fetchData();
  };

  const highRisk   = vendors.filter(v => v.risk_rating === 'High').length;
  const dueSoon    = vendors.filter(v => reviewStatus(v.next_review_date).cls === 'badge-review' || reviewStatus(v.next_review_date).cls === 'badge-fail').length;
  const piiVendors = vendors.filter(v => v.handles_pii).length;

  const filtered = vendors.filter(v => {
    const q = search.toLowerCase();
    const matchQ = !q || v.name?.toLowerCase().includes(q) || v.service_type?.toLowerCase().includes(q) || v.contact_name?.toLowerCase().includes(q);
    const matchR = filterRisk === 'All' || v.risk_rating === filterRisk;
    return matchQ && matchR;
  });

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading vendors…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* KPI row */}
      <div className="g4">
        {[
          { label: 'Total Vendors',   value: vendors.length, color: 'var(--text-primary)' },
          { label: 'High Risk',       value: highRisk,       color: highRisk > 0 ? 'var(--red)' : 'var(--green)' },
          { label: 'Handle PII',      value: piiVendors,     color: piiVendors > 0 ? 'var(--yellow)' : 'var(--text-secondary)' },
          { label: 'Review Due Soon', value: dueSoon,        color: dueSoon > 0 ? 'var(--yellow)' : 'var(--green)' },
        ].map(k => (
          <div className="card card-sm" key={k.label}>
            <div className="card-label">{k.label}</div>
            <div className="card-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search vendors…"
          style={{ flex: 1, minWidth: '200px', maxWidth: '320px' }}
        />
        <div style={{ display: 'flex', gap: '5px' }}>
          {['All', 'High', 'Medium', 'Low'].map(r => (
            <button key={r} className={`btn ${filterRisk === r ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: '11.5px', padding: '5px 12px' }} onClick={() => setFilterRisk(r)}>{r}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={openAdd} style={{ gap: '7px', marginLeft: 'auto' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Vendor
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{ border: '1px solid var(--accent-border)', background: 'var(--accent-dim)' }}>
          <div className="sec-head" style={{ marginBottom: '14px' }}>
            <div className="sec-title">{editId ? 'Edit Vendor' : 'New Vendor'}</div>
            <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Vendor / Organization Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Accenture Middle East" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Service Type *</label>
              <input value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))} placeholder="e.g., Cloud Hosting, Managed SOC, IT Support" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Criticality to Business</label>
              <select value={form.criticality} onChange={e => setForm(f => ({ ...f, criticality: e.target.value }))}>
                {['High', 'Medium', 'Low'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Risk Rating</label>
              <select value={form.risk_rating} onChange={e => setForm(f => ({ ...f, risk_rating: e.target.value }))}>
                {['High', 'Medium', 'Low'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Contact Name</label>
              <input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Vendor relationship manager" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Contact Email</label>
              <input value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="vendor@company.com" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Last Assessment Date</label>
              <input type="date" lang="en" value={form.last_assessment_date} onChange={e => setForm(f => ({ ...f, last_assessment_date: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Next Review Date</label>
              <input type="date" lang="en" value={form.next_review_date} onChange={e => setForm(f => ({ ...f, next_review_date: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
              <label>Notes / Scope</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Describe the data or systems this vendor accesses, contractual security requirements, etc." />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label className={`framework-check engine-check ${form.handles_pii ? 'active' : ''}`} style={{ width: 'auto' }}>
                <input type="checkbox" checked={!!form.handles_pii} onChange={e => setForm(f => ({ ...f, handles_pii: e.target.checked }))} />
                <span>This vendor handles personal / sensitive data (PII)</span>
              </label>
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <button className="btn btn-primary" disabled={!form.name.trim() || !form.service_type.trim() || saving} onClick={saveVendor}>
              {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Vendor'}
            </button>
          </div>
        </div>
      )}

      {/* Vendors table */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-title">{vendors.length === 0 ? 'No vendors registered' : 'No vendors match your search'}</div>
            <div className="empty-sub">Track third-party vendors, their risk ratings, PII handling, and assessment schedules to satisfy NCA ECC-4 and similar third-party requirements</div>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Service</th>
                <th>Criticality</th>
                <th>PII</th>
                <th>Risk</th>
                <th>Last Assessed</th>
                <th>Next Review</th>
                <th>Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => {
                const rs = RISK_STYLE[v.risk_rating] || { cls: '', color: 'var(--text-secondary)' };
                const rv = reviewStatus(v.next_review_date);
                return (
                  <tr key={v.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '12.5px' }}>{v.name}</div>
                      {v.notes && <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', maxWidth: '200px', marginTop: '2px' }}>{v.notes.slice(0, 55)}{v.notes.length > 55 ? '…' : ''}</div>}
                    </td>
                    <td style={{ fontSize: '12px' }}><span className="tag">{v.service_type}</span></td>
                    <td><span className={`badge ${rs.cls}`} style={{ fontSize: '10px' }}>{v.criticality}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      {v.handles_pii
                        ? <span style={{ color: 'var(--yellow)', fontWeight: 700, fontSize: '12px' }}>Yes</span>
                        : <span style={{ color: 'var(--text-tertiary)', fontSize: '12px'  }}>No</span>}
                    </td>
                    <td><span className={`badge ${rs.cls}`} style={{ fontSize: '10px' }}>{v.risk_rating}</span></td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{fmtDate(v.last_assessment_date)}</td>
                    <td>
                      {rv.cls
                        ? <span className={`badge ${rv.cls}`} style={{ fontSize: '10px' }}>{rv.label}</span>
                        : <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{fmtDate(v.next_review_date)}</span>}
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {v.contact_name
                        ? <div><div style={{ fontWeight: 500 }}>{v.contact_name}</div><div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>{v.contact_email}</div></div>
                        : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => openEdit(v)}>Edit</button>
                        <button className="btn btn-danger" style={{ fontSize: '11px', padding: '4px 10px' }} disabled={acting === v.id} onClick={() => deleteVendor(v.id)}>
                          {acting === v.id ? '…' : 'Del'}
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

      {/* NCA ECC callout */}
      <div className="card card-sm" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
        <div style={{ fontSize: '11.5px', color: 'var(--accent)', fontWeight: 600, marginBottom: '4px' }}>NCA ECC-4 — Third-party & Cloud Cybersecurity</div>
        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          Ensure all critical vendors have a completed security assessment, PII handling is documented, and review cycles are active. High-risk vendors should be assessed at least annually.
        </div>
      </div>
    </div>
  );
}
