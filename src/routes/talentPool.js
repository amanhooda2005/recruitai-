// src/routes/talentPool.js — Talent pool: save candidates for future roles
const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/talent-pool ──────────────────────────────────────────────────────
router.get('/', authenticate, authorize('talent_pool:read'), (req, res) => {
  const { search, tags, source } = req.query;

  let pool = [...(db.data.talent_pool || [])];

  // Enrich with live candidate data
  pool = pool.map(entry => {
    const candidate = db.data.candidates.find(c => c.id === entry.candidateId);
    return { ...entry, candidate: candidate || null };
  }).filter(e => e.candidate); // remove stale entries

  if (search) {
    const q = search.toLowerCase();
    pool = pool.filter(e =>
      e.candidate.name.toLowerCase().includes(q) ||
      e.candidate.role?.toLowerCase().includes(q) ||
      (e.candidate.skills || []).some(s => s.toLowerCase().includes(q)) ||
      (e.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  if (tags) {
    const tagList = tags.split(',').map(t => t.trim().toLowerCase());
    pool = pool.filter(e => tagList.every(tag => (e.tags || []).map(t => t.toLowerCase()).includes(tag)));
  }

  if (source) pool = pool.filter(e => e.source === source);

  pool.sort((a, b) => new Date(b.added_at) - new Date(a.added_at));

  // Tag summary
  const allTags = {};
  pool.forEach(e => (e.tags || []).forEach(t => { allTags[t] = (allTags[t] || 0) + 1; }));

  res.json({ pool, total: pool.length, tagSummary: allTags });
});

// ── GET /api/talent-pool/:id ──────────────────────────────────────────────────
router.get('/:id', authenticate, authorize('talent_pool:read'), (req, res) => {
  const entry = (db.data.talent_pool || []).find(e => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found in talent pool' });
  const candidate = db.data.candidates.find(c => c.id === entry.candidateId);
  res.json({ entry: { ...entry, candidate } });
});

// ── POST /api/talent-pool ─────────────────────────────────────────────────────
router.post('/', authenticate, authorize('talent_pool:write'), (req, res) => {
  const { candidateId, tags = [], notes, source, targetRoles = [], availableFrom } = req.body;
  if (!candidateId) return res.status(400).json({ error: 'candidateId is required' });

  const candidate = db.data.candidates.find(c => c.id === candidateId);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  // Check if already in pool
  const existing = (db.data.talent_pool || []).find(e => e.candidateId === candidateId);
  if (existing) return res.status(409).json({ error: 'Candidate already in talent pool', entry: existing });

  const entry = {
    id:           uuid(),
    candidateId,
    tags:         tags.map(t => t.trim()).filter(Boolean),
    notes:        notes || '',
    source:       source || 'manual',
    targetRoles,
    availableFrom: availableFrom || null,
    addedBy:      req.user.id,
    added_at:     new Date().toISOString(),
    lastContacted: null,
    priority:     'normal',
  };

  if (!db.data.talent_pool) db.data.talent_pool = [];
  db.data.talent_pool.push(entry);
  db.write();

  res.status(201).json({ message: `${candidate.name} added to talent pool`, entry: { ...entry, candidate } });
});

// ── PUT /api/talent-pool/:id ──────────────────────────────────────────────────
router.put('/:id', authenticate, authorize('talent_pool:write'), (req, res) => {
  const idx = (db.data.talent_pool || []).findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const allowed = ['tags', 'notes', 'source', 'targetRoles', 'availableFrom', 'priority', 'lastContacted'];
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  db.data.talent_pool[idx] = { ...db.data.talent_pool[idx], ...updates };
  db.write();

  const candidate = db.data.candidates.find(c => c.id === db.data.talent_pool[idx].candidateId);
  res.json({ message: 'Updated', entry: { ...db.data.talent_pool[idx], candidate } });
});

// ── DELETE /api/talent-pool/:id ───────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('talent_pool:write'), (req, res) => {
  const before = db.data.talent_pool?.length || 0;
  db.data.talent_pool = (db.data.talent_pool || []).filter(e => e.id !== req.params.id);
  db.write();
  if (db.data.talent_pool.length === before) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Removed from talent pool' });
});

// ── GET /api/talent-pool/tags/all ─────────────────────────────────────────────
router.get('/tags/all', authenticate, authorize('talent_pool:read'), (req, res) => {
  const tags = {};
  (db.data.talent_pool || []).forEach(e =>
    (e.tags || []).forEach(t => { tags[t] = (tags[t] || 0) + 1; })
  );
  const sorted = Object.entries(tags).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
  res.json({ tags: sorted });
});

module.exports = router;
