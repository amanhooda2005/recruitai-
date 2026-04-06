// src/middleware/auth.js — JWT authentication + Role-Based Access Control
const jwt = require('jsonwebtoken');

// ── Role hierarchy ────────────────────────────────────────────────────────────
// admin > hr_manager > interviewer > viewer
// Each role inherits all permissions of roles below it.

const ROLES = {
  admin:       4,
  hr_manager:  3,
  interviewer: 2,
  viewer:      1,
};

// ── Permission matrix ─────────────────────────────────────────────────────────
// Maps action keys → minimum role required
const PERMISSIONS = {
  // Candidates
  'candidates:read':          'viewer',
  'candidates:create':        'hr_manager',
  'candidates:update':        'hr_manager',
  'candidates:delete':        'hr_manager',
  'candidates:status':        'hr_manager',

  // Jobs
  'jobs:read':                'viewer',
  'jobs:create':              'hr_manager',
  'jobs:update':              'hr_manager',
  'jobs:delete':              'hr_manager',

  // Interviews
  'interviews:read':          'viewer',
  'interviews:create':        'hr_manager',
  'interviews:update':        'hr_manager',
  'interviews:delete':        'hr_manager',
  'interviews:feedback':      'interviewer',   // interviewers can submit feedback

  // Scorecards
  'scorecards:read':          'viewer',
  'scorecards:create':        'interviewer',   // interviewers can submit scorecards
  'scorecards:delete':        'hr_manager',

  // Emails
  'emails:read':              'hr_manager',
  'emails:send':              'hr_manager',

  // Analytics
  'analytics:read':           'viewer',

  // AI
  'ai:use':                   'hr_manager',

  // Talent pool
  'talent_pool:read':         'viewer',
  'talent_pool:write':        'hr_manager',

  // Notifications
  'notifications:read':       'viewer',
  'notifications:write':      'viewer',

  // Users / Admin
  'users:read':               'admin',
  'users:create':             'admin',
  'users:update':             'admin',
  'users:delete':             'admin',
  'users:change_role':        'admin',
};

// ── Core authenticate middleware ──────────────────────────────────────────────
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }
}

// ── Role check helper ─────────────────────────────────────────────────────────
function hasRole(userRole, requiredRole) {
  return (ROLES[userRole] || 0) >= (ROLES[requiredRole] || 99);
}

// ── authorize(permission) middleware factory ──────────────────────────────────
// Usage: router.post('/', authenticate, authorize('candidates:create'), handler)
function authorize(permission) {
  return (req, res, next) => {
    const userRole    = req.user?.role || 'viewer';
    const required    = PERMISSIONS[permission];

    if (!required) {
      // Unknown permission — fail closed
      return res.status(403).json({ error: `Unknown permission: ${permission}` });
    }

    if (!hasRole(userRole, required)) {
      return res.status(403).json({
        error:    'Forbidden: insufficient permissions',
        required: required,
        yours:    userRole,
      });
    }

    next();
  };
}

// ── requireRole(role) — minimum role gate ─────────────────────────────────────
// Usage: router.get('/', authenticate, requireRole('admin'), handler)
function requireRole(role) {
  return (req, res, next) => {
    const userRole = req.user?.role || 'viewer';
    if (!hasRole(userRole, role)) {
      return res.status(403).json({
        error:    `Forbidden: requires ${role} or higher`,
        required: role,
        yours:    userRole,
      });
    }
    next();
  };
}

// ── isOwnerOrRole — own resource OR minimum role ──────────────────────────────
// Usage: allows a user to modify their own record, or an admin to modify anyone's
function isOwnerOrRole(role, getOwnerId) {
  return (req, res, next) => {
    const userRole = req.user?.role || 'viewer';
    if (hasRole(userRole, role)) return next();
    const ownerId = typeof getOwnerId === 'function' ? getOwnerId(req) : req.params.id;
    if (req.user?.id === ownerId) return next();
    return res.status(403).json({ error: 'Forbidden: not your resource' });
  };
}

module.exports = { authenticate, authorize, requireRole, isOwnerOrRole, hasRole, ROLES, PERMISSIONS };

