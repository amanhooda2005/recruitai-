// src/routes/jobBoard.js — Public job board: list jobs + accept applications
// Public endpoints (no auth required for GET + apply)
// Auth required for managing applications

const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { v4: uuid }    = require('uuid');
const db               = require('../models/db');
const { authenticate } = require('../middleware/auth');
const { addNotification } = require('./emails');
const { getInitials, scoreResume } = require('../utils/aiScorer');

const router = express.Router();

// Multer for public resume uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/applications');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuid()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for public
  fileFilter: (req, file, cb) => {
    const ok = ['.pdf', '.doc', '.docx', '.txt'];
    cb(null, ok.includes(path.extname(file.originalname).toLowerCase()));
  },
});

// ── GET /api/job-board  (PUBLIC) ──────────────────────────────────────────────
// Returns active jobs for the public board
router.get('/', (req, res) => {
  const { search, dept, type, location } = req.query;

  let jobs = (db.data.jobs || []).filter(j => j.status === 'Active');

  if (search) {
    const q = search.toLowerCase();
    jobs = jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.dept?.toLowerCase().includes(q) ||
      j.description?.toLowerCase().includes(q) ||
      (JSON.parse(j.skills || '[]')).some(s => s.toLowerCase().includes(q))
    );
  }
  if (dept)     jobs = jobs.filter(j => j.dept === dept);
  if (type)     jobs = jobs.filter(j => j.type === type);
  if (location) jobs = jobs.filter(j => j.location?.toLowerCase().includes(location.toLowerCase()));

  // Don't expose internal fields
  const safe = jobs.map(j => ({
    id:          j.id,
    title:       j.title,
    dept:        j.dept,
    location:    j.location,
    type:        j.type,
    exp:         j.exp,
    salary:      j.salary,
    description: j.description,
    skills:      JSON.parse(j.skills || '[]'),
    posted:      j.posted,
    applicants:  j.applicants || 0,
  }));

  safe.sort((a, b) => new Date(b.posted) - new Date(a.posted));

  // Unique filter values
  const depts     = [...new Set((db.data.jobs || []).filter(j => j.status === 'Active').map(j => j.dept).filter(Boolean))];
  const types     = [...new Set((db.data.jobs || []).filter(j => j.status === 'Active').map(j => j.type).filter(Boolean))];
  const locations = [...new Set((db.data.jobs || []).filter(j => j.status === 'Active').map(j => j.location).filter(Boolean))];

  res.json({ jobs: safe, total: safe.length, filters: { depts, types, locations } });
});

// ── GET /api/job-board/:id  (PUBLIC) ─────────────────────────────────────────
router.get('/:id', (req, res) => {
  const job = (db.data.jobs || []).find(j => j.id === req.params.id && j.status === 'Active');
  if (!job) return res.status(404).json({ error: 'Job not found or no longer active' });

  res.json({
    job: {
      id: job.id, title: job.title, dept: job.dept,
      location: job.location, type: job.type, exp: job.exp,
      salary: job.salary, description: job.description,
      skills: JSON.parse(job.skills || '[]'),
      posted: job.posted,
    }
  });
});

// ── POST /api/job-board/:id/apply  (PUBLIC) ───────────────────────────────────
router.post('/:id/apply', upload.single('resume'), async (req, res) => {
  const job = (db.data.jobs || []).find(j => j.id === req.params.id && j.status === 'Active');
  if (!job) return res.status(404).json({ error: 'Job not found or no longer active' });

  const { name, email, phone, coverLetter, linkedIn, portfolio } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

  // Prevent duplicate applications
  const duplicate = (db.data.applications || []).find(
    a => a.jobId === job.id && a.email.toLowerCase() === email.toLowerCase()
  );
  if (duplicate) return res.status(409).json({ error: 'You have already applied for this position' });

  // Extract resume text if uploaded
  let resumeText = '';
  let resumePath = null;
  if (req.file) {
    resumePath = req.file.filename;
    try {
      if (req.file.originalname.endsWith('.txt')) {
        resumeText = fs.readFileSync(req.file.path, 'utf8').slice(0, 4000);
      } else if (req.file.originalname.endsWith('.pdf')) {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(fs.readFileSync(req.file.path));
        resumeText = data.text.slice(0, 4000);
      }
    } catch { /* silent */ }
  }

  const jobSkills = JSON.parse(job.skills || '[]');
  const appId     = uuid();
  const candidateId = uuid();
  const now       = new Date().toISOString().slice(0, 10);

  // Auto-score
  const score = scoreResume({ name, role: job.title, skills: jobSkills, resumeText });

  // Create candidate record
  const candidate = {
    id:          candidateId,
    name,
    initials:    getInitials(name),
    role:        job.title,
    exp:         '',
    skills:      JSON.stringify(jobSkills),
    score,
    status:      'Pending',
    email,
    phone:       phone || null,
    resume_path: resumePath,
    resume_text: resumeText,
    job_id:      job.id,
    notes:       [
      coverLetter ? `Cover Letter:\n${coverLetter}` : '',
      linkedIn    ? `LinkedIn: ${linkedIn}` : '',
      portfolio   ? `Portfolio: ${portfolio}` : '',
    ].filter(Boolean).join('\n\n'),
    applied:     now,
    source:      'job_board',
    created_at:  new Date().toISOString(),
  };

  if (!db.data.candidates) db.data.candidates = [];
  db.data.candidates.push(candidate);

  // Increment job applicants
  const jobIdx = db.data.jobs.findIndex(j => j.id === job.id);
  if (jobIdx !== -1) db.data.jobs[jobIdx].applicants = (db.data.jobs[jobIdx].applicants || 0) + 1;

  // Store application record
  const application = {
    id:          appId,
    candidateId, jobId: job.id,
    jobTitle:    job.title,
    name, email,
    phone:       phone || null,
    resumePath,  coverLetter: coverLetter || null,
    linkedIn:    linkedIn || null,
    portfolio:   portfolio || null,
    score,
    status:      'received',
    appliedAt:   new Date().toISOString(),
  };

  if (!db.data.applications) db.data.applications = [];
  db.data.applications.push(application);
  db.write();

  // Notify recruiters
  addNotification(db, {
    type:    'new_application',
    title:   `New application received`,
    message: `${name} applied for ${job.title}`,
    link:    `/pages/candidate-profile.html?id=${candidateId}`,
  });

  res.status(201).json({
    message: 'Application submitted successfully! We will be in touch soon.',
    applicationId: appId,
    score,
  });
});

// ── GET /api/job-board/applications/all  (AUTH) ───────────────────────────────
router.get('/applications/all', authenticate, (req, res) => {
  const { jobId, status, page = 1, limit = 20 } = req.query;
  let apps = [...(db.data.applications || [])];

  if (jobId)  apps = apps.filter(a => a.jobId === jobId);
  if (status) apps = apps.filter(a => a.status === status);

  apps.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
  const total  = apps.length;
  const sliced = apps.slice((page - 1) * limit, page * limit);

  res.json({ applications: sliced, total });
});

module.exports = router;
