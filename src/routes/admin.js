// src/routes/admin.js — Admin: user management, roles, team invites
const express  = require('express');
const bcrypt   = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db       = require('../models/db');
const { authenticate, requireRole, ROLES, PERMISSIONS } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireRole('admin'));

const ROLE_META = {
  admin:       { label: 'Admin',       color: 'red',    desc: 'Full access to everything including user management' },
  hr_manager:  { label: 'HR Manager',  color: 'blue',   desc: 'Manage candidates, jobs, emails, interviews, AI' },
  interviewer: { label: 'Interviewer', color: 'purple', desc: 'View candidates, submit scorecards and interview feedback' },
  viewer:      { label: 'Viewer',      color: 'gray',   desc: 'Read-only access to candidates, jobs, and analytics' },
};

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/users', (req, res) => {
  const users = (db.data.users || []).map(u => ({
    id:         u.id,
    first_name: u.first_name,
    last_name:  u.last_name,
    email:      u.email,
    company:    u.company,
    role:       u.role || 'viewer',
    active:     u.active !== false,
    created_at: u.created_at,
    last_login: u.last_login || null,
  }));
  users.sort((a, b) => (ROLES[b.role] || 0) - (ROLES[a.role] || 0));
  res.json({ users, total: users.length, roles: ROLE_META });
});

// ── GET /api/admin/roles ──────────────────────────────────────────────────────
router.get('/roles', (req, res) => {
  // Build permission table per role
  const matrix = {};
  Object.keys(ROLE_META).forEach(role => {
    matrix[role] = {
      ...ROLE_META[role],
      permissions: Object.entries(PERMISSIONS)
        .filter(([, required]) => (ROLES[role] || 0) >= (ROLES[required] || 99))
        .map(([perm]) => perm),
    };
  });
  res.json({ roles: ROLE_META, matrix, permissions: Object.keys(PERMISSIONS) });
});

// ── POST /api/admin/users ─────────────────────────────────────────────────────
// Create / invite a new team member
router.post('/users', async (req, res) => {
  const { first_name, last_name, email, role = 'viewer', company } = req.body;
  if (!first_name || !email) return res.status(400).json({ error: 'first_name and email are required' });
  if (!ROLE_META[role])      return res.status(400).json({ error: `role must be one of: ${Object.keys(ROLE_META).join(', ')}` });

  const existing = (db.data.users || []).find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  // Generate a temporary password
  const tempPass = Math.random().toString(36).slice(2, 10) + 'A1!';
  const hashed   = await bcrypt.hash(tempPass, 12);
  const id       = uuid();
  const user     = {
    id, first_name, last_name: last_name || '', email,
    password:   hashed,
    company:    company || (db.data.users[0]?.company) || null,
    role,
    active:     true,
    temp_pass:  true,
    created_at: new Date().toISOString(),
    invited_by: req.user.id,
  };

  if (!db.data.users) db.data.users = [];
  db.data.users.push(user);
  db.write();

  console.log(`\n📧 [INVITE] New user: ${email} | Temp password: ${tempPass}\n`);

  res.status(201).json({
    message:  `User ${email} created. Share these credentials securely.`,
    user:     { id, first_name, last_name: user.last_name, email, role, active: true },
    tempPass, // Return temp pass so admin can share it; real apps would email this
  });
});

// ── PATCH /api/admin/users/:id/role ──────────────────────────────────────────
router.patch('/users/:id/role', (req, res) => {
  const { role } = req.body;
  if (!ROLE_META[role]) return res.status(400).json({ error: `Invalid role: ${Object.keys(ROLE_META).join(', ')}` });

  const idx = (db.data.users || []).findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  // Prevent self-demotion
  if (db.data.users[idx].id === req.user.id && role !== 'admin') {
    return res.status(400).json({ error: 'You cannot demote yourself' });
  }

  db.data.users[idx].role = role;
  db.write();

  res.json({
    message: `Role updated to ${role}`,
    user: { id: db.data.users[idx].id, role },
  });
});

// ── PATCH /api/admin/users/:id/active ────────────────────────────────────────
router.patch('/users/:id/active', (req, res) => {
  const { active } = req.body;
  const idx = (db.data.users || []).findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  if (db.data.users[idx].id === req.user.id) {
    return res.status(400).json({ error: 'You cannot deactivate yourself' });
  }
  db.data.users[idx].active = !!active;
  db.write();
  res.json({ message: active ? 'User activated' : 'User deactivated' });
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
router.delete('/users/:id', (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete yourself' });
  }
  const before = db.data.users?.length || 0;
  db.data.users = (db.data.users || []).filter(u => u.id !== req.params.id);
  db.write();
  if (db.data.users.length === before) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deleted' });
});

// ── GET /api/admin/activity ───────────────────────────────────────────────────
// Recent system-wide activity feed for admin overview
router.get('/activity', (req, res) => {
  const notifications = [...(db.data.notifications || [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 50);
  res.json({ activity: notifications });
});

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const users      = db.data.users || [];
  const roleBreakdown = {};
  users.forEach(u => { roleBreakdown[u.role || 'viewer'] = (roleBreakdown[u.role || 'viewer'] || 0) + 1; });

  res.json({
    totalUsers:    users.length,
    activeUsers:   users.filter(u => u.active !== false).length,
    roleBreakdown,
    totalCandidates: (db.data.candidates || []).length,
    totalJobs:       (db.data.jobs || []).length,
    totalInterviews: (db.data.interviews || []).length,
    totalEmails:     (db.data.emails || []).length,
  });
});

module.exports = router;
