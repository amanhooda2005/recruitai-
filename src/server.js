// src/server.js — RecruitAI Express backend
require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const path        = require('path');

const authRoutes       = require('./routes/auth');
const candidatesRoutes = require('./routes/candidates');
const jobsRoutes       = require('./routes/jobs');
const analyticsRoutes  = require('./routes/analytics');
const aiRoutes         = require('./routes/ai');
const emailsRoutes     = require('./routes/emails');
const interviewsRoutes = require('./routes/interviews');
const scorecardsRoutes = require('./routes/scorecards');
const notifRoutes      = require('./routes/notifications');
const talentPoolRoutes = require('./routes/talentPool');
const jobBoardRoutes   = require('./routes/jobBoard');
const adminRoutes      = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS — allow the frontend origins
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : '*';

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting — 200 requests per 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
}));

// ── Body Parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Serve uploaded resumes statically ────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Serve the RecruitAI frontend ──────────────────────────────────────────────
// Put your frontend folder next to this backend OR adjust the path below.
// When serving both from the same server, the frontend lives at /
const frontendPath = path.join(__dirname, '..');
const fs = require('fs');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  // SPA fallback — serve index.html for any non-API route
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/candidates',    candidatesRoutes);
app.use('/api/jobs',          jobsRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/emails',        emailsRoutes);
app.use('/api/interviews',    interviewsRoutes);
app.use('/api/scorecards',    scorecardsRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/talent-pool',   talentPoolRoutes);
app.use('/api/job-board',     jobBoardRoutes);
app.use('/api/admin',         adminRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', env: process.env.NODE_ENV });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Max size is 10 MB.' });
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 RecruitAI backend running at http://localhost:${PORT}`);
  console.log(`📦 API docs: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Env: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
