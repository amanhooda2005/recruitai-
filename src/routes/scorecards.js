// src/routes/scorecards.js — Team scorecards, votes, leaderboard
const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const SCORECARD_DIMENSIONS = [
  { id: 'technical',    label: 'Technical Skills',    weight: 30 },
  { id: 'communication',label: 'Communication',       weight: 20 },
  { id: 'culture',      label: 'Culture Fit',         weight: 20 },
  { id: 'experience',   label: 'Relevant Experience', weight: 20 },
  { id: 'motivation',   label: 'Motivation & Drive',  weight: 10 },
];

// ── GET /api/scorecards/dimensions ────────────────────────────────────────────
router.get('/dimensions', authenticate, authorize('scorecards:read'), (req, res) => {
  res.json({ dimensions: SCORECARD_DIMENSIONS });
});

// ── GET /api/scorecards/leaderboard ──────────────────────────────────────────
// Returns candidates ranked by composite scorecard score
router.get('/leaderboard', authenticate, authorize('scorecards:read'), (req, res) => {
  const { jobId, limit = 20 } = req.query;
  const scorecards = db.data.scorecards || [];

  // Group scorecards by candidate
  const byCandidate = {};
  scorecards.forEach(sc => {
    if (jobId && sc.jobId !== jobId) return;
    if (!byCandidate[sc.candidateId]) byCandidate[sc.candidateId] = [];
    byCandidate[sc.candidateId].push(sc);
  });

  const leaderboard = Object.entries(byCandidate).map(([candidateId, cards]) => {
    const candidate = db.data.candidates.find(c => c.id === candidateId);
    if (!candidate) return null;

    // Average each dimension across all reviewers
    const dimScores = {};
    SCORECARD_DIMENSIONS.forEach(d => {
      const vals = cards.map(c => c.scores?.[d.id]).filter(v => v != null);
      dimScores[d.id] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });

    // Weighted composite score
    const composite = SCORECARD_DIMENSIONS.reduce((sum, d) => {
      return sum + (dimScores[d.id] / 5) * d.weight;
    }, 0);

    // Hire/No-hire vote tally
    const votes = cards.reduce((acc, c) => {
      const v = c.recommendation?.toLowerCase();
      if (v === 'hire' || v === 'strong hire')  acc.hire++;
      else if (v === 'no hire')                 acc.noHire++;
      else                                      acc.maybe++;
      return acc;
    }, { hire: 0, noHire: 0, maybe: 0 });

    return {
      candidateId,
      name:        candidate.name,
      initials:    candidate.initials || candidate.name.slice(0, 2).toUpperCase(),
      role:        candidate.role,
      score:       candidate.score,
      status:      candidate.status,
      reviewCount: cards.length,
      composite:   Math.round(composite),
      dimScores,
      votes,
      lastReview:  cards.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]?.created_at,
    };
  }).filter(Boolean);

  leaderboard.sort((a, b) => b.composite - a.composite);

  res.json({
    leaderboard:  leaderboard.slice(0, parseInt(limit)),
    total:        leaderboard.length,
    dimensions:   SCORECARD_DIMENSIONS,
  });
});

// ── GET /api/scorecards/candidate/:id ─────────────────────────────────────────
router.get('/candidate/:id', authenticate, authorize('scorecards:read'), (req, res) => {
  const cards = (db.data.scorecards || []).filter(sc => sc.candidateId === req.params.id);

  const enriched = cards.map(sc => {
    const reviewer = db.data.users.find(u => u.id === sc.reviewerId);
    return {
      ...sc,
      reviewerName: reviewer ? `${reviewer.first_name} ${reviewer.last_name}` : 'Unknown',
    };
  });

  // Aggregate
  let aggregate = null;
  if (cards.length) {
    const dimScores = {};
    SCORECARD_DIMENSIONS.forEach(d => {
      const vals = cards.map(c => c.scores?.[d.id]).filter(v => v != null);
      dimScores[d.id] = vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0;
    });
    const composite = SCORECARD_DIMENSIONS.reduce((sum, d) => sum + (dimScores[d.id] / 5) * d.weight, 0);
    const votes = cards.reduce((acc, c) => {
      const v = c.recommendation?.toLowerCase();
      if (v === 'hire' || v === 'strong hire') acc.hire++;
      else if (v === 'no hire') acc.noHire++;
      else acc.maybe++;
      return acc;
    }, { hire: 0, noHire: 0, maybe: 0 });

    aggregate = { dimScores, composite: Math.round(composite), votes, reviewCount: cards.length };
  }

  res.json({ scorecards: enriched, aggregate });
});

// ── POST /api/scorecards ──────────────────────────────────────────────────────
// Body: { candidateId, jobId?, interviewId?, scores:{technical,communication,...}, recommendation, notes }
router.post('/', authenticate, authorize('scorecards:create'), (req, res) => {
  const { candidateId, jobId, interviewId, scores, recommendation, notes, strengths, weaknesses } = req.body;

  if (!candidateId || !scores) {
    return res.status(400).json({ error: 'candidateId and scores are required' });
  }

  const candidate = db.data.candidates.find(c => c.id === candidateId);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  // Check if this reviewer already submitted for this candidate
  const existing = (db.data.scorecards || []).find(
    sc => sc.candidateId === candidateId && sc.reviewerId === req.user.id && !interviewId
  );

  const scorecard = {
    id:             existing?.id || uuid(),
    candidateId,
    candidateName:  candidate.name,
    jobId:          jobId || candidate.job_id || null,
    interviewId:    interviewId || null,
    reviewerId:     req.user.id,
    scores:         {
      technical:     Math.min(5, Math.max(1, scores.technical     || 3)),
      communication: Math.min(5, Math.max(1, scores.communication || 3)),
      culture:       Math.min(5, Math.max(1, scores.culture       || 3)),
      experience:    Math.min(5, Math.max(1, scores.experience    || 3)),
      motivation:    Math.min(5, Math.max(1, scores.motivation    || 3)),
    },
    recommendation: recommendation || 'maybe',
    notes:          notes || '',
    strengths:      strengths || '',
    weaknesses:     weaknesses || '',
    created_at:     existing?.created_at || new Date().toISOString(),
    updated_at:     new Date().toISOString(),
  };

  if (!db.data.scorecards) db.data.scorecards = [];

  if (existing) {
    const idx = db.data.scorecards.findIndex(sc => sc.id === existing.id);
    db.data.scorecards[idx] = scorecard;
  } else {
    db.data.scorecards.push(scorecard);
  }
  db.write();

  res.status(201).json({ message: existing ? 'Scorecard updated' : 'Scorecard submitted', scorecard });
});

// ── DELETE /api/scorecards/:id ────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('scorecards:delete'), (req, res) => {
  const sc = (db.data.scorecards || []).find(s => s.id === req.params.id);
  if (!sc) return res.status(404).json({ error: 'Scorecard not found' });
  if (sc.reviewerId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

  db.data.scorecards = db.data.scorecards.filter(s => s.id !== req.params.id);
  db.write();
  res.json({ message: 'Scorecard deleted' });
});

module.exports = router;
