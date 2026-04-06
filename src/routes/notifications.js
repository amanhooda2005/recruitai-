// src/routes/notifications.js — Notifications center
const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/notifications ────────────────────────────────────────────────────
router.get('/', authenticate, (req, res) => {
  const { unreadOnly = false, limit = 30 } = req.query;
  let notes = [...(db.data.notifications || [])];

  // Show global + user-specific
  notes = notes.filter(n => !n.userId || n.userId === req.user.id);
  if (unreadOnly === 'true') notes = notes.filter(n => !n.read);

  notes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  notes = notes.slice(0, parseInt(limit));

  const unreadCount = (db.data.notifications || [])
    .filter(n => (!n.userId || n.userId === req.user.id) && !n.read).length;

  res.json({ notifications: notes, unreadCount, total: notes.length });
});

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
router.patch('/:id/read', authenticate, (req, res) => {
  const n = (db.data.notifications || []).find(n => n.id === req.params.id);
  if (!n) return res.status(404).json({ error: 'Notification not found' });
  n.read = true;
  db.write();
  res.json({ message: 'Marked as read' });
});

// ── PATCH /api/notifications/read-all ────────────────────────────────────────
router.patch('/read-all', authenticate, (req, res) => {
  (db.data.notifications || []).forEach(n => {
    if (!n.userId || n.userId === req.user.id) n.read = true;
  });
  db.write();
  res.json({ message: 'All notifications marked as read' });
});

// ── DELETE /api/notifications/:id ─────────────────────────────────────────────
router.delete('/:id', authenticate, (req, res) => {
  db.data.notifications = (db.data.notifications || []).filter(n => n.id !== req.params.id);
  db.write();
  res.json({ message: 'Notification deleted' });
});

// ── POST /api/notifications (internal helper exposed for testing) ─────────────
router.post('/', authenticate, (req, res) => {
  const { type, title, message, link } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const note = {
    id:         uuid(),
    type:       type || 'info',
    title, message: message || '', link: link || null,
    userId:     req.user.id,
    read:       false,
    created_at: new Date().toISOString(),
  };

  if (!db.data.notifications) db.data.notifications = [];
  db.data.notifications.unshift(note);
  db.write();

  res.status(201).json({ notification: note });
});

module.exports = router;
