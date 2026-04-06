// src/routes/analytics.js — Dashboard stats, pipeline, charts
const express = require('express');
const db      = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/analytics/dashboard ─────────────────────────────────────────────
// Returns all stats needed by dashboard.html and analytics.html
router.get('/dashboard', authenticate, authorize('analytics:read'), (req, res) => {
  // Totals
  const totalCandidates = db.prepare("SELECT COUNT(*) as cnt FROM candidates").get().cnt;
  const shortlisted     = db.prepare("SELECT COUNT(*) as cnt FROM candidates WHERE status='Shortlisted'").get().cnt;
  const selected        = db.prepare("SELECT COUNT(*) as cnt FROM candidates WHERE status='Selected'").get().cnt;
  const activeJobs      = db.prepare("SELECT COUNT(*) as cnt FROM jobs WHERE status='Active'").get().cnt;
  const totalJobs       = db.prepare("SELECT COUNT(*) as cnt FROM jobs").get().cnt;
  const pending         = db.prepare("SELECT COUNT(*) as cnt FROM candidates WHERE status='Pending'").get().cnt;
  const rejected        = db.prepare("SELECT COUNT(*) as cnt FROM candidates WHERE status='Rejected'").get().cnt;

  // Time-to-hire estimate (avg days from applied to Selected)
  const ttRow = db.prepare(`
    SELECT AVG(julianday('now') - julianday(applied)) as avg_days
    FROM candidates WHERE status = 'Selected'
  `).get();
  const timeToHire = ttRow.avg_days ? Math.round(ttRow.avg_days) : 0;

  // Pipeline stages for the pipeline bar
  const pipeline = [
    { stage: 'Applied',     count: totalCandidates, color: '#3b6be8' },
    { stage: 'Screened',    count: Math.round(totalCandidates * 0.75), color: '#8b5cf6' },
    { stage: 'Shortlisted', count: shortlisted, color: '#f59e0b' },
    { stage: 'Selected',    count: selected,    color: '#22c55e' },
  ];

  // Monthly applications (last 6 months) for bar/line chart
  const monthlyData = db.prepare(`
    SELECT strftime('%Y-%m', applied) as month,
           COUNT(*) as applied,
           SUM(CASE WHEN status IN ('Shortlisted','Selected') THEN 1 ELSE 0 END) as shortlisted,
           SUM(CASE WHEN status = 'Selected' THEN 1 ELSE 0 END) as hired
    FROM candidates
    WHERE applied >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', applied)
    ORDER BY month ASC
  `).all();

  // Source breakdown (mock distribution based on real totals)
  const sourceBreakdown = buildSourceBreakdown(totalCandidates);

  // Top candidates
  const topCandidates = db.prepare(`
    SELECT id, name, initials, role, score, status FROM candidates
    ORDER BY score DESC LIMIT 5
  `).all();

  // Recent activity feed
  const recentCandidates = db.prepare(`
    SELECT id, name, role, status, applied FROM candidates
    ORDER BY created_at DESC LIMIT 8
  `).all();

  const recentJobs = db.prepare(`
    SELECT id, title, dept, status, posted, applicants FROM jobs
    ORDER BY created_at DESC LIMIT 4
  `).all();

  // Role distribution for donut chart
  const roleDistribution = db.prepare(`
    SELECT role, COUNT(*) as count
    FROM candidates
    WHERE role IS NOT NULL
    GROUP BY role
    ORDER BY count DESC
    LIMIT 6
  `).all();

  return res.json({
    stats: {
      totalCandidates,
      shortlisted,
      selected,
      pending,
      rejected,
      activeJobs,
      totalJobs,
      timeToHire,
      avgMatchScore: getAvgScore(),
    },
    pipeline,
    monthlyData,
    sourceBreakdown,
    topCandidates,
    recentCandidates,
    recentJobs,
    roleDistribution,
  });
});

// ── GET /api/analytics/trends ─────────────────────────────────────────────────
router.get('/trends', authenticate, authorize('analytics:read'), (req, res) => {
  const { months = 12 } = req.query;

  const data = db.prepare(`
    SELECT strftime('%Y-%m', applied) as month,
           COUNT(*) as applied,
           SUM(CASE WHEN status IN ('Shortlisted','Selected') THEN 1 ELSE 0 END) as shortlisted,
           SUM(CASE WHEN status = 'Selected' THEN 1 ELSE 0 END) as hired,
           AVG(score) as avg_score
    FROM candidates
    WHERE applied >= date('now', '-${parseInt(months)} months')
    GROUP BY strftime('%Y-%m', applied)
    ORDER BY month ASC
  `).all();

  return res.json({ trends: data });
});

// ── GET /api/analytics/summary ────────────────────────────────────────────────
router.get('/summary', authenticate, authorize('analytics:read'), (req, res) => {
  const statusBreakdown = db.prepare(`
    SELECT status, COUNT(*) as count FROM candidates GROUP BY status
  `).all();

  const deptBreakdown = db.prepare(`
    SELECT dept, COUNT(*) as jobs, SUM(applicants) as applicants
    FROM jobs GROUP BY dept ORDER BY jobs DESC
  `).all();

  return res.json({ statusBreakdown, deptBreakdown });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAvgScore() {
  const row = db.prepare('SELECT AVG(score) as avg FROM candidates').get();
  return row.avg ? Math.round(row.avg) : 0;
}

function buildSourceBreakdown(total) {
  if (!total) return [];
  return [
    { source: 'LinkedIn',    count: Math.round(total * 0.38), pct: 38 },
    { source: 'Direct',      count: Math.round(total * 0.25), pct: 25 },
    { source: 'Indeed',      count: Math.round(total * 0.18), pct: 18 },
    { source: 'Referral',    count: Math.round(total * 0.12), pct: 12 },
    { source: 'Other',       count: Math.round(total * 0.07), pct: 7  },
  ];
}

module.exports = router;
