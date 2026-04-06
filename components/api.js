// components/api.js — RecruitAI Frontend API Client
// Drop this file into the /components/ folder of the frontend.
// All pages use this instead of hardcoded data.

const API_BASE = window.location.origin + '/api';

/* ── Token helpers ─────────────────────────────────────────────────────────── */
function getToken()        { return localStorage.getItem('recruit_token'); }
function setToken(t)       { localStorage.setItem('recruit_token', t); }
function removeToken()     { localStorage.removeItem('recruit_token'); }
function getUser()         {
  try { return JSON.parse(localStorage.getItem('recruit_user') || 'null'); }
  catch { return null; }
}
function setUser(u)        { localStorage.setItem('recruit_user', JSON.stringify(u)); }
function removeUser()      { localStorage.removeItem('recruit_user'); }

/* ── RBAC client helpers ────────────────────────────────────────────────────── */
const ROLE_WEIGHTS = { admin: 4, hr_manager: 3, interviewer: 2, viewer: 1 };

const PERM_REQUIREMENTS = {
  'candidates:read':     'viewer',    'candidates:create':   'hr_manager',
  'candidates:update':   'hr_manager','candidates:delete':   'hr_manager',
  'candidates:status':   'hr_manager','jobs:read':           'viewer',
  'jobs:create':         'hr_manager','jobs:update':         'hr_manager',
  'jobs:delete':         'hr_manager','interviews:read':     'viewer',
  'interviews:create':   'hr_manager','interviews:update':   'hr_manager',
  'interviews:feedback': 'interviewer','interviews:delete':  'hr_manager',
  'scorecards:read':     'viewer',    'scorecards:create':   'interviewer',
  'scorecards:delete':   'hr_manager','emails:read':         'hr_manager',
  'emails:send':         'hr_manager','ai:use':              'hr_manager',
  'talent_pool:read':    'viewer',    'talent_pool:write':   'hr_manager',
  'analytics:read':      'viewer',    'notifications:read':  'viewer',
  'users:read':          'admin',     'users:create':        'admin',
  'users:update':        'admin',     'users:delete':        'admin',
};

/**
 * can('candidates:create') → true/false based on current user's role
 */
function can(permission) {
  const user     = getUser();
  const role     = user?.role || 'viewer';
  const required = PERM_REQUIREMENTS[permission];
  if (!required) return false;
  return (ROLE_WEIGHTS[role] || 0) >= (ROLE_WEIGHTS[required] || 99);
}

/**
 * hasRole('hr_manager') → true if current user is hr_manager OR higher
 */
function hasRole(minRole) {
  const role = getUser()?.role || 'viewer';
  return (ROLE_WEIGHTS[role] || 0) >= (ROLE_WEIGHTS[minRole] || 99);
}

/**
 * hideIfCannot('candidates:create', '#addBtn')
 * Hides or disables a DOM element if user lacks permission.
 */
function hideIfCannot(permission, selector, mode = 'hide') {
  if (can(permission)) return;
  document.querySelectorAll(selector).forEach(el => {
    if (mode === 'hide')     el.style.display = 'none';
    if (mode === 'disable')  { el.disabled = true; el.title = 'Insufficient permissions'; el.style.opacity = '.4'; el.style.cursor = 'not-allowed'; }
    if (mode === 'remove')   el.remove();
  });
}

/**
 * showRoleBadge(containerSelector)
 * Injects a role badge pill into the given container.
 */
function showRoleBadge(containerSelector) {
  const user = getUser();
  if (!user) return;
  const COLORS = { admin:'background:#fee2e2;color:#991b1b', hr_manager:'background:#dbeafe;color:#1e40af', interviewer:'background:#ede9fe;color:#6b21a8', viewer:'background:#f1f5f9;color:#64748b' };
  const LABELS = { admin:'Admin', hr_manager:'HR Manager', interviewer:'Interviewer', viewer:'Viewer' };
  const el = document.querySelector(containerSelector);
  if (!el) return;
  const badge = document.createElement('span');
  badge.style.cssText = `${COLORS[user.role]||COLORS.viewer};font-size:11px;font-weight:700;padding:2px 9px;border-radius:99px;margin-left:8px;`;
  badge.textContent = LABELS[user.role] || 'Viewer';
  el.appendChild(badge);
}

/* ── Base fetch wrapper ────────────────────────────────────────────────────── */
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (options.body instanceof FormData) delete headers['Content-Type'];

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ── Auth ──────────────────────────────────────────────────────────────────── */
const Auth = {
  async login(email, password) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(data.token);
    setUser(data.user);
    return data;
  },

  async signup(payload) {
    const data = await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setToken(data.token);
    setUser(data.user);
    return data;
  },

  async me() {
    return apiFetch('/auth/me');
  },

  logout() {
    removeToken();
    removeUser();
    window.location.href = '../pages/auth.html';
  },

  isLoggedIn() {
    return !!getToken();
  },

  requireAuth() {
    if (!getToken()) {
      window.location.href = '../pages/auth.html';
      return false;
    }
    return true;
  }
};

/* ── Candidates ────────────────────────────────────────────────────────────── */
const Candidates = {
  list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/candidates${qs ? '?' + qs : ''}`);
  },
  get(id)    { return apiFetch(`/candidates/${id}`); },
  delete(id) { return apiFetch(`/candidates/${id}`, { method: 'DELETE' }); },

  create(formData) {
    return apiFetch('/candidates', { method: 'POST', body: formData });
  },

  update(id, formData) {
    return apiFetch(`/candidates/${id}`, { method: 'PUT', body: formData });
  },

  updateStatus(id, status) {
    return apiFetch(`/candidates/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  cycleStatus(id, currentStatus) {
    const order = ['Pending', 'Shortlisted', 'Selected', 'Rejected'];
    const next  = order[(order.indexOf(currentStatus) + 1) % order.length];
    return this.updateStatus(id, next);
  }
};

/* ── Jobs ──────────────────────────────────────────────────────────────────── */
const Jobs = {
  list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/jobs${qs ? '?' + qs : ''}`);
  },
  get(id)    { return apiFetch(`/jobs/${id}`); },
  delete(id) { return apiFetch(`/jobs/${id}`, { method: 'DELETE' }); },

  create(payload) {
    return apiFetch('/jobs', { method: 'POST', body: JSON.stringify(payload) });
  },

  update(id, payload) {
    return apiFetch(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  updateStatus(id, status) {
    return apiFetch(`/jobs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  getCandidates(jobId) {
    return apiFetch(`/jobs/${jobId}/candidates`);
  }
};

/* ── Analytics ─────────────────────────────────────────────────────────────── */
const Analytics = {
  dashboard() { return apiFetch('/analytics/dashboard'); },
  trends(months = 6) { return apiFetch(`/analytics/trends?months=${months}`); },
  summary() { return apiFetch('/analytics/summary'); }
};

/* ── AI Features ────────────────────────────────────────────────────────────── */
const AI = {
  parseResume(resumeText) {
    return apiFetch('/ai/parse-resume', { method: 'POST', body: JSON.stringify({ resumeText }) });
  },
  scoreFit(payload) {
    return apiFetch('/ai/score-fit', { method: 'POST', body: JSON.stringify(payload) });
  },
  interviewQuestions(payload) {
    return apiFetch('/ai/interview-questions', { method: 'POST', body: JSON.stringify(payload) });
  },
  candidateSummary(payload) {
    return apiFetch('/ai/candidate-summary', { method: 'POST', body: JSON.stringify(payload) });
  },
  fullReport(candidateId) {
    return apiFetch(`/ai/candidate/${candidateId}/full`);
  }
};

/* ── Toast notification helper ─────────────────────────────────────────────── */
function showToast(message, type = 'success') {
  const existing = document.getElementById('_api_toast');
  if (existing) existing.remove();

  const colors = {
    success: 'var(--green-700)',
    error:   'var(--red-600)',
    info:    'var(--blue-600)',
    warning: 'var(--amber-700)'
  };

  const toast = document.createElement('div');
  toast.id = '_api_toast';
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:white; border:1px solid var(--slate-200);
    border-left:4px solid ${colors[type] || colors.success};
    border-radius:var(--radius-md); padding:12px 18px;
    box-shadow:var(--shadow-lg); font-size:13.5px;
    font-weight:500; color:var(--slate-800);
    display:flex; align-items:center; gap:10px;
    min-width:240px; max-width:360px;
    animation: slideInToast .25s ease;
  `;

  if (!document.getElementById('_toast_styles')) {
    const style = document.createElement('style');
    style.id = '_toast_styles';
    style.textContent = `
      @keyframes slideInToast {
        from { transform: translateX(100%); opacity: 0; }
        to   { transform: translateX(0);   opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);
}

/* ── Emails ─────────────────────────────────────────────────────────────────── */
const Emails = {
  templates()         { return apiFetch('/emails/templates'); },
  list(params={})     { return apiFetch('/emails?' + new URLSearchParams(params)); },
  send(payload)       { return apiFetch('/emails/send',  { method:'POST', body:JSON.stringify(payload) }); },
  delete(id)          { return apiFetch('/emails/'+id,   { method:'DELETE' }); },
};

/* ── Interviews ─────────────────────────────────────────────────────────────── */
const Interviews = {
  list(params={})     { return apiFetch('/interviews?' + new URLSearchParams(params)); },
  upcoming()          { return apiFetch('/interviews/upcoming'); },
  get(id)             { return apiFetch('/interviews/'+id); },
  create(payload)     { return apiFetch('/interviews',   { method:'POST',  body:JSON.stringify(payload) }); },
  update(id,payload)  { return apiFetch('/interviews/'+id,{ method:'PUT',  body:JSON.stringify(payload) }); },
  feedback(id,payload){ return apiFetch('/interviews/'+id+'/feedback',{ method:'PATCH',body:JSON.stringify(payload) }); },
  delete(id)          { return apiFetch('/interviews/'+id,{ method:'DELETE' }); },
};

/* ── Scorecards ─────────────────────────────────────────────────────────────── */
const Scorecards = {
  leaderboard(params={}){ return apiFetch('/scorecards/leaderboard?'+new URLSearchParams(params)); },
  forCandidate(id)      { return apiFetch('/scorecards/candidate/'+id); },
  submit(payload)       { return apiFetch('/scorecards',{ method:'POST', body:JSON.stringify(payload) }); },
  delete(id)            { return apiFetch('/scorecards/'+id,{ method:'DELETE' }); },
};

/* ── Notifications ──────────────────────────────────────────────────────────── */
const Notifications = {
  list(params={})    { return apiFetch('/notifications?'+new URLSearchParams(params)); },
  markRead(id)       { return apiFetch('/notifications/'+id+'/read', { method:'PATCH' }); },
  markAllRead()      { return apiFetch('/notifications/read-all',    { method:'PATCH' }); },
  delete(id)         { return apiFetch('/notifications/'+id, { method:'DELETE' }); },
};

/* ── Talent Pool ────────────────────────────────────────────────────────────── */
const TalentPool = {
  list(params={})    { return apiFetch('/talent-pool?'+new URLSearchParams(params)); },
  get(id)            { return apiFetch('/talent-pool/'+id); },
  add(payload)       { return apiFetch('/talent-pool',{ method:'POST', body:JSON.stringify(payload) }); },
  update(id,payload) { return apiFetch('/talent-pool/'+id, { method:'PUT', body:JSON.stringify(payload) }); },
  remove(id)         { return apiFetch('/talent-pool/'+id, { method:'DELETE' }); },
  tags()             { return apiFetch('/talent-pool/tags/all'); },
};

/* ── Job Board ──────────────────────────────────────────────────────────────── */
const JobBoard = {
  list(params={})    { return apiFetch('/job-board?'+new URLSearchParams(params)); },  // no auth needed but works with
  applications(params={}){ return apiFetch('/job-board/applications/all?'+new URLSearchParams(params)); },
};
