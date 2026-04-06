// src/routes/candidates.js — CRUD + resume upload + AI scoring
const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { v4: uuid } = require('uuid');
const db       = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const { scoreResume, getInitials } = require('../utils/aiScorer');
const { addNotification } = require('./emails');

const router = express.Router();

// ── Multer (resume uploads) ───────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/resumes');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_UPLOAD_SIZE) || 10485760 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed'));
  }
});

// ── Helper ────────────────────────────────────────────────────────────────────
function parseCandidate(row) {
  if (!row) return null;
  return { ...row, skills: JSON.parse(row.skills || '[]') };
}

// ── GET /api/candidates ───────────────────────────────────────────────────────
router.get('/', authenticate, authorize('candidates:read'), (req, res) => {
  const { search, status, role, job_id, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where  = 'WHERE 1=1';
  const params = [];

  if (search) {
    where += ' AND (name LIKE ? OR role LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status)  { where += ' AND status = ?';  params.push(status); }
  if (role)    { where += ' AND role LIKE ?';  params.push(`%${role}%`); }
  if (job_id)  { where += ' AND job_id = ?';   params.push(job_id); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM candidates ${where}`).get(...params).cnt;
  const rows  = db.prepare(`SELECT * FROM candidates ${where} ORDER BY score DESC, created_at DESC LIMIT ? OFFSET ?`)
                  .all(...params, parseInt(limit), offset);

  return res.json({
    candidates: rows.map(parseCandidate),
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit))
  });
});

// ── GET /api/candidates/:id ───────────────────────────────────────────────────
router.get('/:id', authenticate, authorize('candidates:read'), (req, res) => {
  const row = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Candidate not found' });
  return res.json({ candidate: parseCandidate(row) });
});

// ── POST /api/candidates ──────────────────────────────────────────────────────
router.post('/', authenticate, authorize('candidates:create'), upload.single('resume'), async (req, res) => {
  try {
    const { name, role, exp, skills, email, phone, job_id, notes, status } = req.body;

    if (!name) return res.status(400).json({ error: 'Candidate name is required' });

    const id       = uuid();
    const initials = getInitials(name);
    const skillArr = typeof skills === 'string' ? JSON.parse(skills) : (skills || []);

    // AI scoring based on resume text + skills
    let resumeText = '';
    let resumePath = null;
    if (req.file) {
      resumePath = req.file.filename;
      resumeText = await extractText(req.file.path, req.file.mimetype);
    }

    const score = scoreResume({ name, role, skills: skillArr, exp, resumeText, job_id });

    db.prepare(`
      INSERT INTO candidates
        (id, name, initials, role, exp, skills, score, status, email, phone, resume_path, resume_text, job_id, notes, applied)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))
    `).run(
      id, name, initials, role || null, exp || null,
      JSON.stringify(skillArr), score,
      status || 'Pending',
      email || null, phone || null,
      resumePath, resumeText,
      job_id || null, notes || null
    );

    // Increment job applicant count if linked
    if (job_id) {
      db.prepare('UPDATE jobs SET applicants = applicants + 1 WHERE id = ?').run(job_id);
    }

    const created = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);

    addNotification(db, {
      type:    'new_application',
      title:   'New candidate added',
      message: `${name} added for ${role || 'a role'}`,
      link:    `/pages/candidate-profile.html?id=${id}`,
      userId:  req.user.id,
    });

    return res.status(201).json({ message: 'Candidate added', candidate: parseCandidate(created) });
  } catch (err) {
    console.error('Add candidate error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ── PUT /api/candidates/:id ───────────────────────────────────────────────────
router.put('/:id', authenticate, authorize('candidates:update'), upload.single('resume'), async (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Candidate not found' });

    const { name, role, exp, skills, email, phone, job_id, notes, status } = req.body;

    const updates = [];
    const params  = [];

    if (name)   { updates.push('name = ?');   params.push(name);   }
    if (role)   { updates.push('role = ?');   params.push(role);   }
    if (exp)    { updates.push('exp = ?');    params.push(exp);    }
    if (email)  { updates.push('email = ?');  params.push(email);  }
    if (phone)  { updates.push('phone = ?');  params.push(phone);  }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (job_id !== undefined) { updates.push('job_id = ?'); params.push(job_id || null); }

    if (skills) {
      const skillArr = typeof skills === 'string' ? JSON.parse(skills) : skills;
      updates.push('skills = ?');
      params.push(JSON.stringify(skillArr));
    }

    if (req.file) {
      // Remove old file
      if (existing.resume_path) {
        const oldPath = path.join(__dirname, '../../uploads/resumes', existing.resume_path);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      const resumeText = await extractText(req.file.path, req.file.mimetype);
      updates.push('resume_path = ?', 'resume_text = ?');
      params.push(req.file.filename, resumeText);
    }

    if (updates.length) {
      params.push(req.params.id);
      db.prepare(`UPDATE candidates SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
    return res.json({ message: 'Candidate updated', candidate: parseCandidate(updated) });
  } catch (err) {
    console.error('Update candidate error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/candidates/:id/status ─────────────────────────────────────────
router.patch('/:id/status', authenticate, authorize('candidates:status'), (req, res) => {
  const { status } = req.body;
  const valid = ['Pending', 'Shortlisted', 'Selected', 'Rejected'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
  }
  const row = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Candidate not found' });

  db.prepare('UPDATE candidates SET status = ? WHERE id = ?').run(status, req.params.id);

  // Fire notification
  addNotification(db, {
    type:    'status_change',
    title:   `Candidate ${status.toLowerCase()}`,
    message: `${row.name} marked as ${status}`,
    link:    `/pages/candidate-profile.html?id=${req.params.id}`,
    userId:  req.user.id,
  });

  return res.json({ message: 'Status updated', status });
});

// ── DELETE /api/candidates/:id ────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('candidates:delete'), (req, res) => {
  const row = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Candidate not found' });

  // Remove resume file
  if (row.resume_path) {
    const filePath = path.join(__dirname, '../../uploads/resumes', row.resume_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM candidates WHERE id = ?').run(req.params.id);

  // Decrement job counter
  if (row.job_id) {
    db.prepare('UPDATE jobs SET applicants = MAX(0, applicants - 1) WHERE id = ?').run(row.job_id);
  }

  return res.json({ message: 'Candidate deleted' });
});

// ── GET /api/candidates/:id/resume ───────────────────────────────────────────
router.get('/:id/resume', authenticate, authorize('candidates:read'), (req, res) => {
  const row = db.prepare('SELECT resume_path FROM candidates WHERE id = ?').get(req.params.id);
  if (!row || !row.resume_path) return res.status(404).json({ error: 'Resume not found' });

  const filePath = path.join(__dirname, '../../uploads/resumes', row.resume_path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Resume file not found on disk' });

  return res.download(filePath);
});

// ── Helpers ───────────────────────────────────────────────────────────────────
async function extractText(filePath, mimetype) {
  try {
    if (mimetype === 'application/pdf' || filePath.endsWith('.pdf')) {
      const pdfParse = require('pdf-parse');
      const buffer   = fs.readFileSync(filePath);
      const data     = await pdfParse(buffer);
      return data.text.slice(0, 5000);
    }
    // For txt files
    if (filePath.endsWith('.txt')) {
      return fs.readFileSync(filePath, 'utf8').slice(0, 5000);
    }
    return '';
  } catch {
    return '';
  }
}

module.exports = router;
