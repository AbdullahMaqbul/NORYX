import React, { useState, useEffect } from 'react';
import './index.css';
import roleLandingLogo from './assets/platlogoNoryx.png';
import platformLogo from './assets/platlogoNoryx1.png';
import AdminDashboard    from './components/AdminDashboard';
import ControlsPage      from './components/ControlsPage';
import DepartmentsPage   from './components/DepartmentsPage';
import EmployeePortal    from './components/EmployeePortal';
import EmployeeDashboard from './components/EmployeeDashboard';
import ThreatPanel       from './components/ThreatPanel';
import TaskManagement    from './components/TaskManagement';
import RiskManagement    from './components/RiskManagement';
import ApprovalWorkflow  from './components/ApprovalWorkflow';
import Reporting         from './components/Reporting';
import ControlLibraryPage from './components/ControlLibraryPage';
import PolicyUploadPage  from './components/PolicyUploadPage';
import PolicyWizard      from './components/PolicyWizard';
import TestingScheduler  from './components/TestingScheduler';
import ExceptionRegister from './components/ExceptionRegister';
import AuditFindings     from './components/AuditFindings';
import ComplianceHeatmap from './components/ComplianceHeatmap';
import VendorRisk        from './components/VendorRisk';
import GRCXPERTAssistance from './components/GRCXPERTAssistance';
import {
  logoutFirebaseUser,
  observeAuthState,
  sendVerificationEmail,
  signInWithEmail,
  signUpWithEmail,
} from './firebaseAuth';

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
  database: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="8" ry="3"/>
      <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/>
      <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/>
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
  layout: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="3"/>
      <line x1="9" y1="4" x2="9" y2="20"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  wizard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="2"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  shieldAlert: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  clipboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="2"/>
      <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/>
    </svg>
  ),
  grid: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  vendor: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
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

const ADMIN_NAV = [
  { id: 'admin',       label: 'Overview',          icon: Icons.dashboard, group: 'PLATFORM' },
  { id: 'controls',    label: 'Controls',          icon: Icons.shield,    group: 'PLATFORM' },
  { id: 'library',     label: 'Frameworks Library', icon: Icons.database,  group: 'PLATFORM' },
  { id: 'policy-upload', label: 'Policy Assessment', icon: Icons.upload,    group: 'PLATFORM' },
  { id: 'policy-wizard', label: 'Policy Wizard',    icon: Icons.wizard,    group: 'PLATFORM' },
  { id: 'departments', label: 'Departments',       icon: Icons.building,  group: 'PLATFORM' },
  { id: 'threats',     label: 'Threat Intel',      icon: Icons.threat,      group: 'SECURITY'   },
  { id: 'vendor-risk', label: 'Vendor Risk',       icon: Icons.vendor,      group: 'SECURITY'   },
  { id: 'approvals',   label: 'Approvals',         icon: Icons.shield,      group: 'OVERSIGHT'  },
  { id: 'tasks',       label: 'Task Management',   icon: Icons.dashboard, group: 'OVERSIGHT' },
  { id: 'risks',       label: 'Risk Register',     icon: Icons.shield,    group: 'OVERSIGHT' },
  { id: 'reports',          label: 'Reporting',         icon: Icons.upload,      group: 'OVERSIGHT'  },
  { id: 'testing-scheduler', label: 'Control Testing',  icon: Icons.calendar,    group: 'ASSURANCE'  },
  { id: 'exceptions',        label: 'Exception Register',icon: Icons.shieldAlert, group: 'ASSURANCE'  },
  { id: 'audit-findings',    label: 'Audit Findings',   icon: Icons.clipboard,   group: 'ASSURANCE'  },
  { id: 'heatmap',           label: 'Compliance Heatmap',icon: Icons.grid,       group: 'ASSURANCE'  },
];

const EMPLOYEE_NAV = [
  { id: 'emp-dashboard', label: 'Overview',        icon: Icons.dashboard, group: 'MY DEPARTMENT' },
  { id: 'emp-controls',  label: 'Assigned Controls',icon: Icons.shield,   group: 'MY DEPARTMENT' },
  { id: 'emp-upload',    label: 'Upload Evidence',  icon: Icons.upload,   group: 'WORKSPACE' },
  { id: 'emp-tasks',     label: 'My Tasks',         icon: Icons.dashboard, group: 'WORKSPACE' },
];

function getInitialTheme() {
  const stored = window.localStorage.getItem('noryx-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

const SESSION_KEY = 'noryx-session';
const USER_PROFILE_KEY = 'noryx-auth-profiles';
const ROLE_TAGLINE = 'All-in-one platform for Automation, Security, and Compliance';

function loadSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || (parsed.role !== 'admin' && parsed.role !== 'employee')) return null;
    return parsed;
  } catch { return null; }
}

function saveSession(sess) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}

function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}

function loadUserProfiles() {
  try {
    const raw = window.localStorage.getItem(USER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveUserProfile(uid, profile) {
  try {
    const profiles = loadUserProfiles();
    profiles[uid] = { ...(profiles[uid] || {}), ...profile };
    window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profiles));
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}

function loadUserProfile(uid) {
  return loadUserProfiles()[uid] || null;
}

function getAuthDisplayName(user, profile, fallback) {
  const profileName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
  if (profileName) return profileName;
  if (user?.displayName) return user.displayName;
  if (profile?.email) return profile.email;
  if (user?.email) return user.email;
  return fallback;
}

function authErrorMessage(error) {
  const code = error?.code || '';
  if (code === 'auth/email-already-in-use') return 'This email is already registered. Please sign in instead.';
  if (code === 'auth/unauthorized-continue-uri') {
    return 'Verify your account. Please check your email for the verification message, then sign in.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password.';
  }
  if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
  if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
  if (code === 'auth/network-request-failed') return 'Firebase Auth could not be reached. Check your connection.';
  return error?.message || 'Authentication failed. Please try again.';
}

function ThemeToggle({ theme, onToggle }) {
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      className={`theme-toggle ${isLight ? 'is-light' : 'is-dark'}`}
      onClick={onToggle}
      aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
      title={`Switch to ${isLight ? 'dark' : 'light'} mode`}
    >
      <span className="theme-toggle-thumb" aria-hidden="true" />
      <span className="theme-toggle-option theme-toggle-option-light">Light</span>
      <span className="theme-toggle-option theme-toggle-option-dark">Dark</span>
    </button>
  );
}

function RoleSelection({ departments, onSelectAdmin, onSelectEmployee, theme, onThemeToggle }) {
  const [hoveredRole, setHoveredRole] = useState(null);
  const [adminAuthMode, setAdminAuthMode] = useState('signin');
  const [employeeAuthMode, setEmployeeAuthMode] = useState('signin');
  const [selectedDept, setSelectedDept] = useState('');
  const [typedTagline, setTypedTagline] = useState('');
  const [authError, setAuthError] = useState('');
  const [authInfo, setAuthInfo] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const showAuthFailure = (error) => {
    const message = authErrorMessage(error);
    if (error?.code === 'auth/unauthorized-continue-uri') {
      setAuthInfo(message);
      return;
    }
    setAuthError(message);
  };

  useEffect(() => {
    let index = 0;

    const timer = window.setInterval(() => {
      index += 1;
      setTypedTagline(ROLE_TAGLINE.slice(0, index));

      if (index >= ROLE_TAGLINE.length) {
        window.clearInterval(timer);
      }
    }, 34);

    return () => window.clearInterval(timer);
  }, []);

  const submitAdminAuth = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthInfo('');
    setAuthBusy(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('adminEmail') || '').trim();
    const password = String(form.get('adminPassword') || '');
    const firstName = String(form.get('adminFirstName') || '').trim();
    const lastName = String(form.get('adminLastName') || '').trim();

    try {
      const user = adminAuthMode === 'signup'
        ? await signUpWithEmail({ email, password, firstName, lastName })
        : await signInWithEmail({ email, password });

      if (adminAuthMode === 'signup') {
        saveUserProfile(user.uid, { role: 'admin', dept: null, email, firstName, lastName });
        await logoutFirebaseUser();
        setAdminAuthMode('signin');
        setAuthInfo('Verify your account. We sent a verification email. After verifying, sign in.');
        return;
      }

      if (!user.emailVerified) {
        try {
          await sendVerificationEmail(user);
        } finally {
          await logoutFirebaseUser();
        }
        setAuthInfo('Verify your account first. We sent a new verification email. After verifying, sign in.');
        return;
      }

      onSelectAdmin(user, { firstName, lastName, email });
    } catch (error) {
      showAuthFailure(error);
    } finally {
      setAuthBusy(false);
    }
  };

  const submitEmployeeAuth = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthInfo('');
    setAuthBusy(true);
    const form = new FormData(event.currentTarget);
    const dept = departments.find(d => String(d.id) === selectedDept);
    const email = String(form.get('employeeEmail') || '').trim();
    const password = String(form.get('employeePassword') || '');
    const firstName = String(form.get('employeeFirstName') || '').trim();
    const lastName = String(form.get('employeeLastName') || '').trim();

    if (!dept) {
      setAuthError('Please choose a department.');
      setAuthBusy(false);
      return;
    }

    try {
      const user = employeeAuthMode === 'signup'
        ? await signUpWithEmail({ email, password, firstName, lastName })
        : await signInWithEmail({ email, password });

      if (employeeAuthMode === 'signup') {
        saveUserProfile(user.uid, { role: 'employee', dept, email, firstName, lastName });
        await logoutFirebaseUser();
        setEmployeeAuthMode('signin');
        setAuthInfo('Verify your account. We sent a verification email. After verifying, sign in.');
        return;
      }

      if (!user.emailVerified) {
        try {
          await sendVerificationEmail(user);
        } finally {
          await logoutFirebaseUser();
        }
        setAuthInfo('Verify your account first. We sent a new verification email. After verifying, sign in.');
        return;
      }

      onSelectEmployee(dept, user, { firstName, lastName, email });
    } catch (error) {
      showAuthFailure(error);
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <div className="role-landing">
      <div className="role-theme-toggle">
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
      </div>
      <div className="role-landing-inner">
        <div className="role-header">
          <div className="role-logo-box">
            <img className="role-logo-image" src={roleLandingLogo} alt="NORYX" />
          </div>
          <div className="role-logo-wordmark">NORYX</div>
          <div className="role-header-sub role-typewriter" aria-label={ROLE_TAGLINE}>
            <span aria-hidden="true">{typedTagline}</span>
            <span className="role-type-cursor" aria-hidden="true">|</span>
          </div>
        </div>

        <div className="role-select-label">Select your access level</div>
        {authInfo && <div className="role-auth-info" role="status">{authInfo}</div>}
        {authError && <div className="role-auth-error" role="alert">{authError}</div>}

        <div className="role-cards">
          <div
            className={`role-card role-auth-card ${hoveredRole === 'admin' ? 'role-card-hover' : ''}`}
            onMouseEnter={() => setHoveredRole('admin')}
            onMouseLeave={() => setHoveredRole(null)}
          >
            <div className="role-card-icon role-card-icon-admin">{Icons.admin}</div>
            <div className="role-card-title">Administrator</div>
            <div className="role-auth-tabs" aria-label="Administrator authentication">
              <button
                type="button"
                className={`role-auth-tab ${adminAuthMode === 'signup' ? 'active' : ''}`}
                onClick={() => {
                  setAdminAuthMode('signup');
                  setAuthError('');
                  setAuthInfo('');
                }}
              >
                Sign Up
              </button>
              <button
                type="button"
                className={`role-auth-tab ${adminAuthMode === 'signin' ? 'active' : ''}`}
                onClick={() => {
                  setAdminAuthMode('signin');
                  setAuthError('');
                  setAuthInfo('');
                }}
              >
                Sign In
              </button>
            </div>
            {adminAuthMode && (
              <form className="role-auth-form" onSubmit={submitAdminAuth}>
                {adminAuthMode === 'signup' && (
                  <div className="role-auth-grid">
                    <label className="role-auth-field">
                      First Name
                      <input name="adminFirstName" autoComplete="given-name" required />
                    </label>
                    <label className="role-auth-field">
                      Last Name
                      <input name="adminLastName" autoComplete="family-name" required />
                    </label>
                  </div>
                )}
                <label className="role-auth-field">
                  Email
                  <input name="adminEmail" type="email" autoComplete="email" required />
                </label>
                <label className="role-auth-field">
                  Password
                  <input name="adminPassword" type="password" autoComplete={adminAuthMode === 'signup' ? 'new-password' : 'current-password'} required />
                </label>
                <button className="btn btn-primary btn-full role-btn-admin" type="submit" disabled={authBusy}>
                  {authBusy ? 'Please wait...' : adminAuthMode === 'signup' ? 'Create Admin Account' : 'Sign In as Admin'}
                </button>
              </form>
            )}
          </div>

          <div
            className={`role-card role-auth-card ${hoveredRole === 'employee' ? 'role-card-hover' : ''}`}
            onMouseEnter={() => setHoveredRole('employee')}
            onMouseLeave={() => setHoveredRole(null)}
          >
            <div className="role-card-icon role-card-icon-employee">{Icons.employee}</div>
            <div className="role-card-title">Employee</div>
            <div className="role-auth-tabs" aria-label="Employee authentication">
              <button
                type="button"
                className={`role-auth-tab ${employeeAuthMode === 'signup' ? 'active' : ''}`}
                onClick={() => {
                  setEmployeeAuthMode('signup');
                  setAuthError('');
                  setAuthInfo('');
                }}
              >
                Sign Up
              </button>
              <button
                type="button"
                className={`role-auth-tab ${employeeAuthMode === 'signin' ? 'active' : ''}`}
                onClick={() => {
                  setEmployeeAuthMode('signin');
                  setAuthError('');
                  setAuthInfo('');
                }}
              >
                Sign In
              </button>
            </div>
            {employeeAuthMode && (
              <form className="role-auth-form" onSubmit={submitEmployeeAuth}>
                {employeeAuthMode === 'signup' && (
                  <div className="role-auth-grid">
                    <label className="role-auth-field">
                      First Name
                      <input name="employeeFirstName" autoComplete="given-name" required />
                    </label>
                    <label className="role-auth-field">
                      Last Name
                      <input name="employeeLastName" autoComplete="family-name" required />
                    </label>
                  </div>
                )}
                <label className="role-auth-field">
                  Department
                  <select
                    name="employeeDepartment"
                    value={selectedDept}
                    onChange={e => setSelectedDept(e.target.value)}
                    required
                  >
                    <option value="">Choose department…</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </label>
                <label className="role-auth-field">
                  Email
                  <input name="employeeEmail" type="email" autoComplete="email" required />
                </label>
                <label className="role-auth-field">
                  Password
                  <input name="employeePassword" type="password" autoComplete={employeeAuthMode === 'signup' ? 'new-password' : 'current-password'} required />
                </label>
                <button
                  className="btn btn-primary btn-full role-btn-employee"
                  type="submit"
                  disabled={!selectedDept || authBusy}
                >
                  {authBusy ? 'Please wait...' : employeeAuthMode === 'signup' ? 'Create Employee Account' : 'Sign In as Employee'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


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


export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [role,  setRole]  = useState(null);
  const [dept,  setDept]  = useState(null);
  const [view,  setView]  = useState('');
  const [controls,    setControls]    = useState([]);
  const [departments, setDepartments] = useState([]);
  const [theme, setTheme] = useState(getInitialTheme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const fetchControls    = () => fetch('http://localhost:8000/controls/').then(r=>r.json()).then(setControls).catch(()=>{});
  const fetchDepartments = () => fetch('http://localhost:8000/departments/').then(r=>r.json()).then(setDepartments).catch(()=>{});

  useEffect(() => { fetchControls(); fetchDepartments(); }, []);
  useEffect(() => {
    const unsubscribe = observeAuthState(user => {
      setAuthReady(true);

      if (!user) {
        setAuthUser(null);
        setRole(null);
        setDept(null);
        setView('');
        clearSession();
        return;
      }

      if (!user.emailVerified) {
        setAuthUser(null);
        setRole(null);
        setDept(null);
        setView('');
        clearSession();
        logoutFirebaseUser().catch(() => {});
        return;
      }

      setAuthUser(user);
      const profile = loadUserProfile(user.uid);
      const savedSession = loadSession();
      const nextSession = savedSession?.uid === user.uid
        ? savedSession
        : profile
          ? {
              uid: user.uid,
              role: profile.role,
              dept: profile.dept || null,
              view: profile.role === 'admin' ? 'admin' : 'emp-dashboard',
            }
          : null;

      if (nextSession?.role) {
        setRole(nextSession.role);
        setDept(nextSession.dept || null);
        setView(nextSession.view || (nextSession.role === 'admin' ? 'admin' : 'emp-dashboard'));
      } else {
        setRole(null);
        setDept(null);
        setView('');
        clearSession();
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('noryx-theme', theme);
  }, [theme]);

  // Persist session on every change (so a refresh keeps the user where they were)
  useEffect(() => {
    if (authUser && role) saveSession({ uid: authUser.uid, role, dept, view });
    else      clearSession();
  }, [authUser, role, dept, view]);

  const toggleTheme = () => setTheme(current => current === 'light' ? 'dark' : 'light');

  const handleSelectAdmin = (user, details = {}) => {
    if (user) {
      const profile = {
        role: 'admin',
        dept: null,
        email: details.email || user.email || '',
      };
      if (details.firstName) profile.firstName = details.firstName;
      if (details.lastName) profile.lastName = details.lastName;
      saveUserProfile(user.uid, profile);
    }
    setRole('admin');
    setView('admin');
    setDept(null);
  };

  const handleSelectEmployee = (department, user, details = {}) => {
    if (user) {
      const profile = {
        role: 'employee',
        dept: department,
        email: details.email || user.email || '',
      };
      if (details.firstName) profile.firstName = details.firstName;
      if (details.lastName) profile.lastName = details.lastName;
      saveUserProfile(user.uid, profile);
    }
    setRole('employee');
    setDept(department);
    setView('emp-dashboard');
  };

  const handleLogout = async () => {
    setRole(null);
    setDept(null);
    setView('');
    clearSession();
    try {
      await logoutFirebaseUser();
    } catch {
      // The local session has already been cleared.
    }
  };

  if (!authReady) {
    return (
      <div className="role-landing">
        <div className="role-theme-toggle">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </div>
    );
  }

  if (!authUser || !role) {
    return (
      <RoleSelection
        departments={departments}
        onSelectAdmin={handleSelectAdmin}
        onSelectEmployee={handleSelectEmployee}
        theme={theme}
        onThemeToggle={toggleTheme}
      />
    );
  }

  const isAdmin = role === 'admin';
  const nav     = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV;
  const groups  = [...new Set(nav.map(n => n.group))];

  // If the persisted view doesn't belong to the current role's nav, snap back to the default page
  if (!nav.some(n => n.id === view)) {
    const fallback = isAdmin ? 'admin' : 'emp-dashboard';
    if (view !== fallback) setView(fallback);
  }

  const adminPages = {
    admin:       <AdminDashboard departments={departments} />,
    controls:    <ControlsPage  controls={controls} departments={departments} onRefresh={fetchControls} />,
    library:     <ControlLibraryPage />,
    'policy-upload': <PolicyUploadPage />,
    'policy-wizard': <PolicyWizard />,
    departments: <DepartmentsPage departments={departments} controls={controls} onRefresh={() => { fetchDepartments(); fetchControls(); }} />,
    threats:     <ThreatPanel />,
    approvals:   <ApprovalWorkflow />,
    tasks:       <TaskManagement departments={departments} isAdmin={true} />,
    risks:       <RiskManagement />,
    reports:     <Reporting />,
    'vendor-risk':        <VendorRisk />,
    'testing-scheduler':  <TestingScheduler />,
    'exceptions':         <ExceptionRegister />,
    'audit-findings':     <AuditFindings />,
    'heatmap':            <ComplianceHeatmap />,
  };

  const employeePages = {
    'emp-dashboard': <EmployeeDashboard departmentId={dept?.id} departmentName={dept?.name} />,
    'emp-controls':  <EmployeeControlsView departmentId={dept?.id} departmentName={dept?.name} />,
    'emp-upload':    <EmployeePortal departments={[dept].filter(Boolean)} />,
    'emp-tasks':     <TaskManagement departmentId={dept?.id} isAdmin={false} />,
  };

  const pages   = isAdmin ? adminPages : employeePages;
  const current = nav.find(n => n.id === view);
  const currentProfile = loadUserProfile(authUser.uid);
  const signedInName = getAuthDisplayName(authUser, currentProfile, isAdmin ? 'Administrator' : 'Employee');

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-wordmark">
            <img className="sidebar-logo-image" src={platformLogo} alt="NORYX" />
            <div>
              <div className="sidebar-name">NORYX</div>
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
            Log Out
          </button>
          <div className="model-pill" style={{ marginTop: '8px' }}>
            <div className="model-dot" />
            <span className="model-label">{signedInName}</span>
            {!isAdmin && (
              <span className="model-val" style={{ color: 'var(--green)' }}>
                Dept Scope
              </span>
            )}
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <button
            type="button"
            className={`topbar-icon-btn ${sidebarCollapsed ? 'active' : ''}`}
            onClick={() => setSidebarCollapsed(current => !current)}
            aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            {Icons.layout}
          </button>
          <span className="topbar-title">{current?.label}</span>
          <div className="topbar-divider" />
          {isAdmin ? (
            <span className="topbar-spacer" />
          ) : (
            <span className="topbar-meta">
              <span className="topbar-badge">{dept?.name}</span>{' '}
              <span className="topbar-badge" style={{ color: 'var(--green)', borderColor: 'var(--green-border)' }}>Employee View</span>
            </span>
          )}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <div className="page-body animate-in" key={view}>
          {pages[view]}
        </div>
      </main>
      <GRCXPERTAssistance />
    </div>
  );
}
