import React, { useState } from 'react';

const API = 'http://localhost:8000';

export default function Reporting() {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    // Open in new tab, but wait a second for UI effect
    setTimeout(() => {
      window.open(`${API}/reports/generate`, '_blank');
      setGenerating(false);
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Hero Section */}
      <div className="card glass" style={{ position: 'relative', overflow: 'hidden', padding: '48px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59,111,245,0.1) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }} />
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: '100px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '16px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2s infinite' }} />
            Noryx ECC v2.0
          </div>
          <h1 className="font-outfit" style={{ fontSize: '36px', fontWeight: 700, color: '#fff', marginBottom: '12px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Compliance & Risk Report
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.6 }}>
            Generate the official executive report containing the latest evidence metrics, control validations, AI confidence scores, and the complete risk register.
          </p>
          
          <button 
            className="btn btn-primary" 
            onClick={handleGenerate} 
            disabled={generating}
            style={{ padding: '14px 32px', fontSize: '15px', fontWeight: 600, boxShadow: '0 8px 24px rgba(59,111,245,0.3)' }}
          >
            {generating ? (
              <>
                <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Compiling Report...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Download PDF Report
              </>
            )}
          </button>
        </div>
      </div>

      <div className="g2">
        {/* Expected Content Preview */}
        <div className="card">
          <div className="sec-head">
            <div className="sec-title">Included in Report</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { title: 'Executive Summary', desc: 'Overall compliance health, passing rates, and total evidence analyzed.' },
              { title: 'Department Analytics', desc: 'Per-department breakdown of compliance percentage and submitted controls.' },
              { title: 'Critical Failures', desc: 'Detailed list of controls failing AI validation with extracted text reasoning.' },
              { title: 'Risk Register', desc: 'All logged risks, severity matrix mapping, and mitigation statuses.' }
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>
                  {i+1}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export Options (Mock for now) */}
        <div className="card">
          <div className="sec-head">
            <div className="sec-title">Alternative Formats</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '1px solid var(--accent-border)', background: 'var(--accent-dim)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 36, height: 36, background: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>PDF</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Noryx Official PDF</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Best for executives and auditors</div>
                </div>
              </div>
              <span className="badge badge-pass">Active</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '1px dashed var(--border-light)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', opacity: 0.7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 36, height: 36, background: 'var(--green)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>CSV</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Raw Data Export</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Evidence logs and AI scores</div>
                </div>
              </div>
              <span className="badge badge-neutral">Coming Soon</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
