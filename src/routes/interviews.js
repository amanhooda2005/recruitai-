// src/routes/interviews.js — Interview scheduling system
const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const { addNotification } = require('./emails');

const router = express.Router();

// ── GET /api/interviews ───────────────────────────────────────────────────────
// Returns all interviews, optionally filtered by date range or candidate
router.get('/', authenticate, authorize('interviews:read'), (req, res) => {
  const { candidateId, jobId, status, from, to, view = 'list' } = req.query;
  let interviews = [...(db.data.interviews || [])];

  if (candidateId) interviews = interviews.filter(i => i.candidateId === candidateId);
  if (jobId)       interviews = interviews.filter(i => i.jobId === jobId);
  if (status)      interviews = interviews.filter(i => i.status === status);
  if (from)        interviews = interviews.filter(i => i.scheduledAt >= from);
  if (to)          interviews = interviews.filter(i => i.scheduledAt <= to);

  // Enrich with candidate + job names
  const enriched = interviews.map(iv => {
    const candidate = db.data.candidates.find(c => c.id === iv.candidateId);
    const job       = db.data.jobs.find(j => j.id === iv.jobId);
    return {
      ...iv,
      candidateName:  candidate?.name     || iv.candidateName || 'Unknown',
      candidateRole:  candidate?.role     || '',
      jobTitle:       job?.title          || iv.jobTitle || '',
    };
  });

  enriched.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  // Calendar view: group by date
  if (view === 'calendar') {
    const byDate = {};
    enriched.forEach(iv => {
      const date = iv.scheduledAt?.slice(0, 10);
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(iv);
    });
    return res.json({ calendar: byDate, total: enriched.length });
  }

  res.json({ interviews: enriched, total: enriched.length });
});

// ── GET /api/interviews/upcoming ─────────────────────────────────────────────
router.get('/upcoming', authenticate, authorize('interviews:read'), (req, res) => {
  const now = new Date().toISOString();
  const upcoming = (db.data.interviews || [])
    .filter(i => i.scheduledAt >= now && i.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, 10)
    .map(iv => {
      const candidate = db.data.candidates.find(c => c.id === iv.candidateId);
      const job       = db.data.jobs.find(j => j.id === iv.jobId);
      return { ...iv, candidateName: candidate?.name || 'Unknown', jobTitle: job?.title || '' };
    });
  res.json({ interviews: upcoming });
});

// ── GET /api/interviews/:id ───────────────────────────────────────────────────
router.get('/:id', authenticate, authorize('interviews:read'), (req, res) => {
  const iv = (db.data.interviews || []).find(i => i.id === req.params.id);
  if (!iv) return res.status(404).json({ error: 'Interview not found' });
  const candidate = db.data.candidates.find(c => c.id === iv.candidateId);
  const job       = db.data.jobs.find(j => j.id === iv.jobId);
  res.json({ interview: { ...iv, candidateName: candidate?.name, jobTitle: job?.title } });
});

// ── POST /api/interviews ──────────────────────────────────────────────────────
router.post('/', authenticate, authorize('interviews:create'), (req, res) => {
  const {
    candidateId, jobId, scheduledAt, duration = 60,
    format = 'Video Call', meetingLink, location,
    interviewers = [], notes, round = 1,
  } = req.body;

  if (!candidateId || !scheduledAt) {
    return res.status(400).json({ error: 'candidateId and scheduledAt are required' });
  }

  const candidate = db.data.candidates.find(c => c.id === candidateId);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  // Check for conflicts (same time slot ±30 min)
  const newTime = new Date(scheduledAt).getTime();
  const conflict = (db.data.interviews || []).find(iv => {
    if (iv.status === 'cancelled') return false;
    const diff = Math.abs(new Date(iv.scheduledAt).getTime() - newTime);
    return diff < 30 * 60 * 1000 && iv.candidateId === candidateId;
  });
  if (conflict) {
    return res.status(409).json({ error: 'Scheduling conflict: candidate already has an interview within 30 minutes of this time' });
  }

  const id = uuid();
  const interview = {
    id, candidateId,
    candidateName: candidate.name,
    jobId:         jobId || candidate.job_id || null,
    scheduledAt, duration, format,
    meetingLink:   meetingLink || null,
    location:      location || null,
    interviewers,
    notes:         notes || '',
    round,
    status:        'scheduled',
    feedback:      null,
    rating:        null,
    created_by:    req.user.id,
    created_at:    new Date().toISOString(),
  };

  if (!db.data.interviews) db.data.interviews = [];
  db.data.interviews.push(interview);
  db.write();

  addNotification(db, {
    type:    'interview_scheduled',
    title:   `Interview scheduled`,
    message: `${candidate.name} — ${new Date(scheduledAt).toLocaleString()}`,
    link:    `/pages/interviews.html`,
    userId:  req.user.id,
  });

  res.status(201).json({ message: 'Interview scheduled', interview });
});

// ── PUT /api/interviews/:id ───────────────────────────────────────────────────
router.put('/:id', authenticate, authorize('interviews:update'), (req, res) => {
  const idx = (db.data.interviews || []).findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Interview not found' });

  const allowed = ['scheduledAt','duration','format','meetingLink','location','interviewers','notes','status','round','feedback','rating'];
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  db.data.interviews[idx] = { ...db.data.interviews[idx], ...updates };
  db.write();

  res.json({ message: 'Interview updated', interview: db.data.interviews[idx] });
});

// ── PATCH /api/interviews/:id/feedback ───────────────────────────────────────
router.patch('/:id/feedback', authenticate, authorize('interviews:feedback'), (req, res) => {
  const { feedback, rating, recommendation, status } = req.body;
  const idx = (db.data.interviews || []).findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Interview not found' });

  db.data.interviews[idx] = {
    ...db.data.interviews[idx],
    feedback:       feedback || db.data.interviews[idx].feedback,
    rating:         rating   !== undefined ? rating : db.data.interviews[idx].rating,
    recommendation: recommendation || db.data.interviews[idx].recommendation,
    status:         status || 'completed',
    completedAt:    new Date().toISOString(),
  };
  db.write();

  res.json({ message: 'Feedback saved', interview: db.data.interviews[idx] });
});

// ── DELETE /api/interviews/:id ────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('interviews:delete'), (req, res) => {
  const before = db.data.interviews?.length || 0;
  db.data.interviews = (db.data.interviews || []).filter(i => i.id !== req.params.id);
  db.write();
  if (db.data.interviews.length === before) return res.status(404).json({ error: 'Interview not found' });
  res.json({ message: 'Interview cancelled' });
});

module.exports = router;
