import React, { useState, useEffect } from 'react';
import './index.css';
import AdminDashboard    from './components/AdminDashboard';
import ControlsPage      from './components/ControlsPage';
import DepartmentsPage   from './components/DepartmentsPage';
import EmployeePortal    from './components/EmployeePortal';
import EmployeeDashboard from './components/EmployeeDashboard';
import ThreatPanel       from './components/ThreatPanel';
import TaskManagement    from './components/TaskManagement';
import RiskManagement    from './components/RiskManagement';
import Reporting         from './components/Reporting';

/* ── Inline SVG icons (no dependencies) ── */
const Icons = {
  threat: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  logo: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" rx="1" fill="white" opacity="0.9"/>
      <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
      <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
      <rect x="9" y="9" width="5" height="5" rx="1" fill="white" opacity="0.3"/>
    </svg>
  ),
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  building: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M9 22V12h6v10M3 9h18"/>
    </svg>
  ),
  user: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  upload: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  admin: (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
  employee: (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
};

/* ── Admin navigation ── */
const ADMIN_NAV = [
  { id: 'admin',       label: 'Overview',          icon: Icons.dashboard, group: 'PLATFORM' },
  { id: 'controls',    label: 'Controls',          icon: Icons.shield,    group: 'PLATFORM' },
  { id: 'departments', label: 'Departments',       icon: Icons.building,  group: 'PLATFORM' },
  { id: 'threats',     label: 'Threat Intel',      icon: Icons.threat,    group: 'SECURITY' },
  { id: 'tasks',       label: 'Task Management',   icon: Icons.dashboard, group: 'OVERSIGHT' },
  { id: 'risks',       label: 'Risk Register',     icon: Icons.shield,    group: 'OVERSIGHT' },
  { id: 'reports',     label: 'Reporting',         icon: Icons.upload,    group: 'OVERSIGHT' },
];

/* ── Employee navigation ── */
const EMPLOYEE_NAV = [
  { id: 'emp-dashboard', label: 'Overview',        icon: Icons.dashboard, group: 'MY DEPARTMENT' },
  { id: 'emp-controls',  label: 'Assigned Controls',icon: Icons.shield,   group: 'MY DEPARTMENT' },
  { id: 'emp-upload',    label: 'Upload Evidence',  icon: Icons.upload,   group: 'WORKSPACE' },
  { id: 'emp-tasks',     label: 'My Tasks',         icon: Icons.dashboard, group: 'WORKSPACE' },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   ROLE SELECTION LANDING PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */
function RoleSelection({ departments, onSelectAdmin, onSelectEmployee }) {
  const [hoveredRole, setHoveredRole] = useState(null);
  const [selectedDept, setSelectedDept] = useState('');

  return (
    <div className="role-landing">
      <div className="role-landing-inner">
        {/* Header */}
        <div className="role-header">
          <div className="role-logo-box">
            <div className="role-logo-icon">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" fill="white" opacity="0.95"/>
                <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.65"/>
                <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.65"/>
                <rect x="9" y="9" width="5" height="5" rx="1" fill="white" opacity="0.3"/>
              </svg>
            </div>
          </div>
          <div className="role-header-eyebrow">NCA Compliance Platform</div>
          <div className="role-header-title">Noryx</div>
          <div className="role-header-sub">Automated evidence validation for governance, risk &amp; compliance</div>
        </div>

        <div className="role-select-label">Select your access level</div>

        {/* Role cards */}
        <div className="role-cards">
          {/* Admin card */}
          <div
            className={`role-card ${hoveredRole === 'admin' ? 'role-card-hover' : ''}`}
            onMouseEnter={() => setHoveredRole('admin')}
            onMouseLeave={() => setHoveredRole(null)}
            onClick={onSelectAdmin}
          >
            <div className="role-card-icon role-card-icon-admin">{Icons.admin}</div>
            <div className="role-card-title">Administrator</div>
            <div className="role-card-subtitle">Manage controls, departments &amp; compliance</div>
            <button className="btn btn-primary btn-full role-btn-admin">
              Enter as Admin
            </button>
          </div>

          {/* Employee card */}
          <div
            className={`role-card ${hoveredRole === 'employee' ? 'role-card-hover' : ''}`}
            onMouseEnter={() => setHoveredRole('employee')}
            onMouseLeave={() => setHoveredRole(null)}
          >
            <div className="role-card-icon role-card-icon-employee">{Icons.employee}</div>
            <div className="role-card-title">Employee</div>
            <div className="role-card-subtitle">Upload &amp; validate compliance evidence</div>
            <div>
              <label style={{ fontSize: '11px', marginBottom: '7px', display: 'block' }}>Select Your Department</label>
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                style={{ marginBottom: '10px' }}
                onClick={e => e.stopPropagation()}
              >
                <option value="">Choose department…</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button
                className="btn btn-primary btn-full role-btn-employee"
                disabled={!selectedDept}
                onClick={(e) => {
                  e.stopPropagation();
                  const dept = departments.find(d => String(d.id) === selectedDept);
                  if (dept) onSelectEmployee(dept);
                }}
              >
                Enter as Employee
              </button>
            </div>
          </div>
        </div>

        <div className="role-footer">
          <div className="model-pill" style={{ display: 'inline-flex' }}>
            <div className="model-dot" />
            <span className="model-label">AI Engine</span>
            <span className="model-val">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════════
   EMPLOYEE CONTROLS VIEW (read-only, scoped to department)
   ═══════════════════════════════════════════════════════════════════════════════ */
function EmployeeControlsView({ departmentId, departmentName }) {
  const [controls, setControls] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!departmentId) return;
    fetch(`http://localhost:8000/departments/${departmentId}/controls`)
      .then(r => r.json()).then(setControls).catch(() => {});
  }, [departmentId]);

  const filtered = controls.filter(c => {
    const q = search.toLowerCase();
    return !q || c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div className="g3">
        {[
          { label: 'Assigned Controls', value: controls.length, color: 'var(--text-primary)' },
          { label: 'Categories', value: [...new Set(controls.map(c => c.category || 'General'))].length, color: 'var(--accent)' },
          { label: 'Department', value: departmentName, color: 'var(--green)', small: true },
        ].map(k => (
          <div className="card card-sm" key={k.label}>
            <div className="card-label">{k.label}</div>
            <div className="card-value" style={{ color: k.color, fontSize: k.small ? '16px' : undefined }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card card-sm">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search controls by name or description…" />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Control ID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty">
                    <div className="empty-title">No controls found</div>
                    <div className="empty-sub">Try adjusting your search</div>
                  </div>
                </td>
              </tr>
            ) : filtered.map(c => (
              <tr key={c.id}>
                <td><span className="tag tag-accent">{c.name}</span></td>
                <td style={{ fontWeight: 500, fontSize: '12.5px' }}>{c.criteria?.slice(0, 60) || '—'}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '12px', maxWidth: '300px' }}>{c.description?.slice(0, 100) || '—'}</td>
                <td><span className="tag">{c.category || 'General'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [role,  setRole]  = useState(null);    // null | 'admin' | 'employee'
  const [dept,  setDept]  = useState(null);    // { id, name } for employee
  const [view,  setView]  = useState('');
  const [controls,    setControls]    = useState([]);
  const [departments, setDepartments] = useState([]);

  const fetchControls    = () => fetch('http://localhost:8000/controls/').then(r=>r.json()).then(setControls).catch(()=>{});
  const fetchDepartments = () => fetch('http://localhost:8000/departments/').then(r=>r.json()).then(setDepartments).catch(()=>{});

  useEffect(() => { fetchControls(); fetchDepartments(); }, []);

  const handleSelectAdmin = () => {
    setRole('admin');
    setView('admin');
    setDept(null);
  };

  const handleSelectEmployee = (department) => {
    setRole('employee');
    setDept(department);
    setView('emp-dashboard');
  };

  const handleLogout = () => {
    setRole(null);
    setDept(null);
    setView('');
  };

  /* ── Landing page ── */
  if (!role) {
    return (
      <RoleSelection
        departments={departments}
        onSelectAdmin={handleSelectAdmin}
        onSelectEmployee={handleSelectEmployee}
      />
    );
  }

  /* ── Determine navigation and pages ── */
  const isAdmin = role === 'admin';
  const nav     = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV;
  const groups  = [...new Set(nav.map(n => n.group))];

  const adminPages = {
    admin:       <AdminDashboard departments={departments} />,
    controls:    <ControlsPage  controls={controls} departments={departments} onRefresh={fetchControls} />,
    departments: <DepartmentsPage departments={departments} controls={controls} onRefresh={() => { fetchDepartments(); fetchControls(); }} />,
    threats:     <ThreatPanel />,
    tasks:       <TaskManagement departments={departments} isAdmin={true} />,
    risks:       <RiskManagement />,
    reports:     <Reporting />,
  };

  const employeePages = {
    'emp-dashboard': <EmployeeDashboard departmentId={dept?.id} departmentName={dept?.name} />,
    'emp-controls':  <EmployeeControlsView departmentId={dept?.id} departmentName={dept?.name} />,
    'emp-upload':    <EmployeePortal departments={[dept].filter(Boolean)} />,
    'emp-tasks':     <TaskManagement departmentId={dept?.id} isAdmin={false} />,
  };

  const pages   = isAdmin ? adminPages : employeePages;
  const current = nav.find(n => n.id === view);

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-wordmark">
            <div className="sidebar-icon-box">{Icons.logo}</div>
            <div>
              <div className="sidebar-name">Noryx</div>
              {!isAdmin && dept && (
                <div className="sidebar-sub" style={{ fontSize: '10px', color: 'var(--accent)', marginTop: '2px' }}>{dept.name}</div>
              )}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {groups.map(g => (
            <React.Fragment key={g}>
              <div className="nav-group-label">{g}</div>
              {nav.filter(n => n.group === g).map(n => (
                <button
                  key={n.id}
                  className={`nav-item ${n.id === 'threats' ? 'threat-nav' : ''} ${view === n.id ? 'active' : ''}`}
                  onClick={() => setView(n.id)}
                >
                  <span className="nav-icon-wrap">{n.icon}</span>
                  {n.label}
                </button>
              ))}
            </React.Fragment>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-ghost btn-full" onClick={handleLogout} style={{ gap: '8px', justifyContent: 'center' }}>
            <span className="nav-icon-wrap">{Icons.logout}</span>
            Switch Role
          </button>
          <div className="model-pill" style={{ marginTop: '8px' }}>
            <div className="model-dot" />
            <span className="model-label">{isAdmin ? 'Admin' : 'Employee'}</span>
            <span className="model-val" style={{ color: isAdmin ? 'var(--accent)' : 'var(--green)' }}>
              {isAdmin ? 'Full Access' : 'Dept Scope'}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        <div className="topbar">
          <span className="topbar-title">{current?.label}</span>
          <div className="topbar-divider" />
          <span className="topbar-meta">
            {isAdmin ? (
              <>
                <span className="topbar-badge">{controls.length} Controls</span>{' '}
                <span className="topbar-badge">{departments.length} Departments</span>
              </>
            ) : (
              <>
                <span className="topbar-badge">{dept?.name}</span>{' '}
                <span className="topbar-badge" style={{ color: 'var(--green)', borderColor: 'var(--green-border)' }}>Employee View</span>
              </>
            )}
          </span>
        </div>
        <div className="page-body animate-in" key={view}>
          {pages[view]}
        </div>
      </main>
    </div>
  );
}
