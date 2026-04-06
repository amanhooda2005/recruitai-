// src/routes/jobs.js — Full CRUD for job postings
const express = require('express');
const { v4: uuid } = require('uuid');
const db      = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function parseJob(row) {
  if (!row) return null;
  return { ...row, skills: JSON.parse(row.skills || '[]') };
}

// ── GET /api/jobs ─────────────────────────────────────────────────────────────
router.get('/', authenticate, authorize('jobs:read'), (req, res) => {
  const { search, status, dept, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = 'WHERE 1=1';
  const params = [];

  if (search) { where += ' AND (title LIKE ? OR dept LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (status) { where += ' AND status = ?'; params.push(status); }
  if (dept)   { where += ' AND dept = ?';   params.push(dept); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM jobs ${where}`).get(...params).cnt;
  const rows  = db.prepare(`SELECT * FROM jobs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
                  .all(...params, parseInt(limit), offset);

  return res.json({
    jobs: rows.map(parseJob),
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit))
  });
});

// ── GET /api/jobs/:id ─────────────────────────────────────────────────────────
router.get('/:id', authenticate, authorize('jobs:read'), (req, res) => {
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Job not found' });
  return res.json({ job: parseJob(row) });
});

// ── POST /api/jobs ────────────────────────────────────────────────────────────
router.post('/', authenticate, authorize('jobs:create'), (req, res) => {
  const { title, dept, location, type, exp, salary, description, skills, status } = req.body;

  if (!title) return res.status(400).json({ error: 'Job title is required' });

  const id       = uuid();
  const skillArr = Array.isArray(skills) ? skills : (typeof skills === 'string' ? JSON.parse(skills) : []);

  db.prepare(`
    INSERT INTO jobs (id, title, dept, location, type, exp, salary, description, skills, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, title,
    dept       || 'General',
    location   || 'Remote',
    type       || 'Full-time',
    exp        || 'Mid-level',
    salary     || 'Competitive',
    description || null,
    JSON.stringify(skillArr),
    status     || 'Active',
    req.user.id
  );

  const created = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  return res.status(201).json({ message: 'Job created', job: parseJob(created) });
});

// ── PUT /api/jobs/:id ─────────────────────────────────────────────────────────
router.put('/:id', authenticate, authorize('jobs:update'), (req, res) => {
  const existing = db.prepare('SELECT id FROM jobs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Job not found' });

  const { title, dept, location, type, exp, salary, description, skills, status } = req.body;

  const updates = [];
  const params  = [];

  if (title)       { updates.push('title = ?');       params.push(title); }
  if (dept)        { updates.push('dept = ?');         params.push(dept); }
  if (location)    { updates.push('location = ?');     params.push(location); }
  if (type)        { updates.push('type = ?');         params.push(type); }
  if (exp)         { updates.push('exp = ?');          params.push(exp); }
  if (salary)      { updates.push('salary = ?');       params.push(salary); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (status)      { updates.push('status = ?');       params.push(status); }
  if (skills) {
    const arr = Array.isArray(skills) ? skills : JSON.parse(skills);
    updates.push('skills = ?');
    params.push(JSON.stringify(arr));
  }

  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

  params.push(req.params.id);
  db.prepare(`UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  return res.json({ message: 'Job updated', job: parseJob(updated) });
});

// ── PATCH /api/jobs/:id/status ────────────────────────────────────────────────
router.patch('/:id/status', authenticate, authorize('jobs:update'), (req, res) => {
  const { status } = req.body;
  const valid = ['Active', 'Closed', 'Draft'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
  }
  const row = db.prepare('SELECT id FROM jobs WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Job not found' });

  db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run(status, req.params.id);
  return res.json({ message: 'Job status updated', status });
});

// ── DELETE /api/jobs/:id ──────────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('jobs:delete'), (req, res) => {
  const row = db.prepare('SELECT id FROM jobs WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Job not found' });

  db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Job deleted' });
});

// ── GET /api/jobs/:id/candidates ──────────────────────────────────────────────
router.get('/:id/candidates', authenticate, authorize('jobs:read'), (req, res) => {
  const job = db.prepare('SELECT id FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const rows = db.prepare('SELECT * FROM candidates WHERE job_id = ? ORDER BY score DESC').all(req.params.id);
  return res.json({
    candidates: rows.map(r => ({ ...r, skills: JSON.parse(r.skills || '[]') }))
  });
});

module.exports = router;
