/* components/shared.js — Shared UI components & helpers */

/* ── SVG Icon Library ─────────────────────────────────────── */
const Icons = {
  logo: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
  dashboard: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  candidates: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  jobs: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
  analytics: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  settings: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  bell: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  chevronDown: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>`,
  arrowUp: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m18 15-6-6-6 6"/></svg>`,
  arrowDown: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>`,
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  menu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  x: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
  user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  mail: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,4 12,13 2,4"/></svg>`,
  lock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  filter: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  download: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  eye: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  briefcase: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`,
  map: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  trending: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  star: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  logout: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
};

/* ── Sidebar HTML builder ─────────────────────────────────── */
function buildSidebar(activePage) {
  const user = (() => { try { return JSON.parse(localStorage.getItem('recruit_user') || 'null'); } catch { return null; } })();
  const role = user?.role || 'viewer';

  // Role hierarchy weights
  const ROLE_W = { admin:4, hr_manager:3, interviewer:2, viewer:1 };
  const can = (minRole) => (ROLE_W[role]||1) >= (ROLE_W[minRole]||99);

  const navItems = [
    { label: 'Dashboard',        href: 'dashboard.html',        icon: 'dashboard',   section: 'OVERVIEW',  minRole: 'viewer' },
    { label: 'Candidates',       href: 'candidates.html',       icon: 'candidates',  section: null,        minRole: 'viewer' },
    { label: 'Job Postings',     href: 'jobs.html',             icon: 'jobs',        section: null,        minRole: 'viewer' },
    { label: 'Interviews',       href: 'interviews.html',       icon: 'clock',       section: null,        minRole: 'viewer' },
    { label: 'Analytics',        href: 'analytics.html',        icon: 'analytics',   section: null,        minRole: 'viewer' },
    { label: 'Email Center',     href: 'emails.html',           icon: 'mail',        section: 'TOOLS',     minRole: 'hr_manager' },
    { label: 'Leaderboard',      href: 'leaderboard.html',      icon: 'star',        section: null,        minRole: 'viewer' },
    { label: 'Talent Pool',      href: 'talent-pool.html',      icon: 'briefcase',   section: null,        minRole: 'viewer' },
    { label: 'Job Board',        href: 'job-board.html',        icon: 'trending',    section: null,        minRole: 'viewer' },
    { label: 'Admin Panel',      href: 'admin.html',            icon: 'settings',    section: 'SYSTEM',    minRole: 'admin' },
    { label: 'Settings',         href: '#',                     icon: 'settings',    section: can('admin') ? null : 'SYSTEM', minRole: 'viewer' },
  ];

  let lastSection = null;
  let navHTML = '';
  navItems.forEach(item => {
    if (!can(item.minRole || 'viewer')) return; // hide items the user can't access
    if (item.section && item.section !== lastSection) {
      navHTML += `<div class="sidebar-section-label">${item.section}</div>`;
      lastSection = item.section;
    }
    const activeClass = activePage === item.href ? ' active' : '';
    navHTML += `<a href="${item.href}" class="${activeClass}">${Icons[item.icon]} ${item.label}</a>`;
  });

  const ROLE_COLORS = { admin:'#fee2e2;color:#991b1b', hr_manager:'#dbeafe;color:#1e40af', interviewer:'#ede9fe;color:#6b21a8', viewer:'#f1f5f9;color:#64748b' };
  const ROLE_LABELS = { admin:'Admin', hr_manager:'HR Manager', interviewer:'Interviewer', viewer:'Viewer' };
  const rolePill = `<span style="background:${ROLE_COLORS[role]||ROLE_COLORS.viewer};font-size:10px;font-weight:700;padding:1px 7px;border-radius:99px;margin-top:2px;display:inline-block;">${ROLE_LABELS[role]||'Viewer'}</span>`;

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <a href="dashboard.html">
          <div class="logo-icon">${Icons.logo}</div>
          <span class="logo-text">RecruitAI</span>
        </a>
      </div>
      <nav class="sidebar-nav">${navHTML}</nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="avatar">${user ? (user.first_name[0]+(user.last_name?.[0]||'')).toUpperCase() : 'U'}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${user ? `${user.first_name} ${user.last_name||''}` : 'User'}</div>
            <div class="sidebar-user-role">${rolePill}</div>
          </div>
          <a href="../index.html" title="Logout" style="color:var(--slate-400);margin-left:4px;">${Icons.logout}</a>
        </div>
      </div>
    </aside>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
  `;
}

/* ── Topbar HTML builder ──────────────────────────────────── */
function buildTopbar(title, showSearch = true) {
  return `
    <div class="topbar">
      <div style="display:flex;align-items:center;gap:12px;">
        <button class="hamburger" id="hamburgerBtn" aria-label="Toggle menu">${Icons.menu}</button>
        <span class="topbar-title">${title}</span>
      </div>
      ${showSearch ? `
      <div class="topbar-search">
        ${Icons.search}
        <input type="text" placeholder="Search anything…" aria-label="Global search">
      </div>` : '<div></div>'}
      <div class="topbar-actions">
        <button class="icon-btn" title="Notifications" onclick="openNotifications()" style="position:relative;">
          ${Icons.bell}
          <span class="badge-dot" id="notifDot" style="display:none;"></span>
          <span id="notifCount" style="position:absolute;top:-4px;right:-4px;background:var(--red-500);color:white;font-size:10px;font-weight:700;border-radius:99px;min-width:16px;height:16px;display:none;align-items:center;justify-content:center;padding:0 3px;"></span>
        </button>
        <div class="avatar" style="cursor:pointer;" title="Profile" id="topbarAvatar">SA</div>
      </div>
    </div>
    <!-- Notifications dropdown -->
    <div id="notifDropdown" style="display:none;position:fixed;top:56px;right:16px;width:360px;background:white;border-radius:var(--radius-xl);border:1px solid var(--slate-200);box-shadow:var(--shadow-xl);z-index:500;overflow:hidden;">
      <div style="padding:14px 16px;border-bottom:1px solid var(--slate-100);display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:14px;font-weight:700;color:var(--slate-800);">Notifications</span>
        <button onclick="markAllRead()" style="font-size:12px;color:var(--blue-600);border:none;background:none;cursor:pointer;font-weight:500;">Mark all read</button>
      </div>
      <div id="notifList" style="max-height:320px;overflow-y:auto;"></div>
    </div>
  `;
}

/* ── Sidebar toggle logic ─────────────────────────────────── */
function initSidebarToggle() {
  const btn = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!btn) return;

  btn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });

  // Close notif dropdown on outside click
  document.addEventListener('click', (e) => {
    const dd = document.getElementById('notifDropdown');
    if (dd && dd.style.display !== 'none' && !dd.contains(e.target) && !e.target.closest('.icon-btn')) {
      dd.style.display = 'none';
    }
  });

  // Load notifications + personalise topbar
  _loadTopbarNotifications();
}

/* ── Notifications ────────────────────────────────────────── */
const NOTIF_ICONS = {
  new_application:    '📥',
  interview_scheduled:'📅',
  email_sent:         '✉️',
  status_change:      '🔄',
  ai_report:          '🤖',
  info:               '🔔',
};

async function _loadTopbarNotifications() {
  const token = localStorage.getItem('recruit_token');
  if (!token) return;
  try {
    const res  = await fetch('/api/notifications?limit=15', { headers:{ Authorization:'Bearer '+token } });
    const data = await res.json();
    const count = data.unreadCount || 0;
    const countEl = document.getElementById('notifCount');
    const dotEl   = document.getElementById('notifDot');
    if (countEl) {
      countEl.textContent = count > 9 ? '9+' : count;
      countEl.style.display = count > 0 ? 'flex' : 'none';
    }
    if (dotEl) dotEl.style.display = count > 0 ? 'block' : 'none';

    // Personalise avatar
    try {
      const u = JSON.parse(localStorage.getItem('recruit_user') || 'null');
      const av = document.getElementById('topbarAvatar');
      if (u && av) av.textContent = (u.first_name[0] + (u.last_name?.[0]||'')).toUpperCase();
    } catch {}

    // Render list
    const list = document.getElementById('notifList');
    if (!list) return;
    if (!data.notifications?.length) {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--slate-400);font-size:13px;">No notifications yet</div>';
      return;
    }
    list.innerHTML = data.notifications.map(n => `
      <div onclick="_markRead('${n.id}',this,${JSON.stringify(n.link)})"
           style="padding:12px 16px;border-bottom:1px solid var(--slate-100);cursor:pointer;display:flex;gap:10px;align-items:flex-start;background:${n.read?'white':'var(--blue-50)'};">
        <span style="font-size:18px;flex-shrink:0;">${NOTIF_ICONS[n.type]||'🔔'}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:${n.read?'500':'700'};color:var(--slate-800);">${n.title}</div>
          <div style="font-size:12px;color:var(--slate-500);margin-top:1px;">${n.message||''}</div>
          <div style="font-size:11px;color:var(--slate-400);margin-top:3px;">${_fmtAgo(n.created_at)}</div>
        </div>
        ${!n.read ? '<div style="width:7px;height:7px;border-radius:50%;background:var(--blue-500);flex-shrink:0;margin-top:4px;"></div>' : ''}
      </div>`).join('');
  } catch {}
}

function _fmtAgo(d) {
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400)return Math.floor(diff/3600) + 'h ago';
  return Math.floor(diff/86400) + 'd ago';
}

function openNotifications() {
  const dd = document.getElementById('notifDropdown');
  if (!dd) return;
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  if (dd.style.display === 'block') _loadTopbarNotifications();
}

async function _markRead(id, el, link) {
  const token = localStorage.getItem('recruit_token');
  if (!token) return;
  try {
    await fetch('/api/notifications/'+id+'/read', { method:'PATCH', headers:{ Authorization:'Bearer '+token } });
    el.style.background = 'white';
    const dot = el.querySelector('[style*="border-radius:50%"]');
    if (dot) dot.remove();
    _loadTopbarNotifications();
    if (link) { document.getElementById('notifDropdown').style.display='none'; window.location.href = link; }
  } catch {}
}

async function markAllRead() {
  const token = localStorage.getItem('recruit_token');
  if (!token) return;
  await fetch('/api/notifications/read-all', { method:'PATCH', headers:{ Authorization:'Bearer '+token } });
  _loadTopbarNotifications();
}

/* ── Format helpers ───────────────────────────────────────── */
function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtRelative(dateStr) {
  const d = new Date(dateStr), now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

/* ── Status tag builder ───────────────────────────────────── */
function statusTag(status) {
  const map = {
    'Selected':  'tag--green',
    'Shortlisted': 'tag--blue',
    'Pending':   'tag--amber',
    'Rejected':  'tag--red',
    'Active':    'tag--green',
    'Closed':    'tag--slate',
    'Draft':     'tag--amber',
  };
  return `<span class="tag ${map[status] || 'tag--slate'}">${status}</span>`;
}
