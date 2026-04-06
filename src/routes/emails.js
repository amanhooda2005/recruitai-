// src/routes/emails.js — Email system: templates + send log
// Uses nodemailer if SMTP configured, otherwise logs to DB (dev mode)
const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── Built-in templates ────────────────────────────────────────────────────────
const TEMPLATES = {
  interview_invite: {
    id: 'interview_invite',
    name: 'Interview Invitation',
    subject: 'Interview Invitation — {{role}} at {{company}}',
    body: `Dear {{candidateName}},

We were impressed by your application for the {{role}} position at {{company}} and would like to invite you for an interview.

📅 Date & Time: {{datetime}}
📍 Format: {{format}}
{{#if meetingLink}}🔗 Meeting Link: {{meetingLink}}{{/if}}

Please confirm your availability by replying to this email.

What to expect:
• Duration: approximately {{duration}}
• You'll be meeting with {{interviewers}}

If you have any questions, feel free to reach out.

Best regards,
{{senderName}}
{{company}} Talent Team`,
  },

  rejection: {
    id: 'rejection',
    name: 'Rejection (Respectful)',
    subject: 'Your Application for {{role}} at {{company}}',
    body: `Dear {{candidateName}},

Thank you for taking the time to apply for the {{role}} position at {{company}} and for your interest in joining our team.

After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs.

This was a competitive process, and we were genuinely impressed by your background. We encourage you to apply for future openings that may be a better fit.

We wish you all the best in your job search.

Warm regards,
{{senderName}}
{{company}} Talent Team`,
  },

  offer_letter: {
    id: 'offer_letter',
    name: 'Offer Letter',
    subject: '🎉 Job Offer — {{role}} at {{company}}',
    body: `Dear {{candidateName}},

We are delighted to extend an offer of employment for the position of {{role}} at {{company}}!

📋 Offer Details:
• Position: {{role}}
• Department: {{department}}
• Start Date: {{startDate}}
• Compensation: {{salary}}
• Employment Type: {{employmentType}}

This offer is contingent upon successful completion of background verification.

Please review the attached offer letter and confirm your acceptance by {{deadline}}.

We are thrilled about the possibility of you joining our team and look forward to your response.

Congratulations!

{{senderName}}
{{company}} Talent Team`,
  },

  shortlist_notification: {
    id: 'shortlist_notification',
    name: 'Shortlist Notification',
    subject: 'Update on Your Application — {{role}}',
    body: `Dear {{candidateName}},

Great news! After reviewing your application for the {{role}} position at {{company}}, we are pleased to inform you that you have been shortlisted for the next stage of our hiring process.

Our team will be in touch shortly to arrange the next steps.

Thank you for your patience and continued interest in joining {{company}}.

Best regards,
{{senderName}}
{{company}} Talent Team`,
  },

  followup: {
    id: 'followup',
    name: 'Post-Interview Follow-up',
    subject: 'Thank you for interviewing with {{company}}',
    body: `Dear {{candidateName}},

Thank you for taking the time to interview for the {{role}} position at {{company}}. It was a pleasure learning more about your experience and background.

We are currently in the final stages of our review process and expect to have a decision by {{decisionDate}}.

We appreciate your patience and will be in touch soon.

Best regards,
{{senderName}}
{{company}} Talent Team`,
  },
};

// ── Helper: fill template variables ──────────────────────────────────────────
function fillTemplate(template, vars = {}) {
  let text = template;
  Object.entries(vars).forEach(([key, val]) => {
    text = text.replace(new RegExp(`{{${key}}}`, 'g'), val || '');
  });
  // Remove unfilled {{#if ...}}...{{/if}} blocks
  text = text.replace(/{{#if \w+}}[\s\S]*?{{\/if}}/g, '');
  return text;
}

// ── Helper: send via nodemailer or log ────────────────────────────────────────
async function dispatchEmail({ to, subject, body, from }) {
  // If SMTP is configured, use nodemailer
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter({
        host:   process.env.SMTP_HOST,
        port:   parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from:    from || process.env.SMTP_FROM || process.env.SMTP_USER,
        to, subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
      });
      return { sent: true, method: 'smtp' };
    } catch (err) {
      console.error('SMTP error:', err.message);
      return { sent: false, method: 'smtp', error: err.message };
    }
  }
  // Dev mode — just log
  console.log(`\n📧 [DEV EMAIL]\nTo: ${to}\nSubject: ${subject}\n---\n${body.slice(0,200)}...\n`);
  return { sent: true, method: 'dev_log' };
}

// ── GET /api/emails/templates ─────────────────────────────────────────────────
router.get('/templates', authenticate, authorize('emails:read'), (req, res) => {
  res.json({ templates: Object.values(TEMPLATES) });
});

// ── GET /api/emails/templates/:id ─────────────────────────────────────────────
router.get('/templates/:id', authenticate, authorize('emails:read'), (req, res) => {
  const t = TEMPLATES[req.params.id];
  if (!t) return res.status(404).json({ error: 'Template not found' });
  res.json({ template: t });
});

// ── POST /api/emails/send ─────────────────────────────────────────────────────
// Body: { candidateId, templateId, variables, customSubject?, customBody?, scheduledAt? }
router.post('/send', authenticate, authorize('emails:send'), async (req, res) => {
  const { candidateId, templateId, variables = {}, customSubject, customBody, scheduledAt } = req.body;

  if (!candidateId) return res.status(400).json({ error: 'candidateId is required' });

  // Get candidate
  const candidate = db.data.candidates.find(c => c.id === candidateId);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  if (!candidate.email) return res.status(400).json({ error: 'Candidate has no email address' });

  const template = templateId ? TEMPLATES[templateId] : null;
  const user = db.data.users.find(u => u.id === req.user.id);
  const company = user?.company || 'Our Company';

  const mergedVars = {
    candidateName: candidate.name,
    role:          candidate.role || 'the position',
    company,
    senderName:    user ? `${user.first_name} ${user.last_name}` : 'The Hiring Team',
    ...variables,
  };

  const subject = customSubject || (template ? fillTemplate(template.subject, mergedVars) : 'Update from ' + company);
  const body    = customBody    || (template ? fillTemplate(template.body, mergedVars)    : '');

  if (!body) return res.status(400).json({ error: 'Email body is required' });

  const emailId = uuid();
  const now     = new Date().toISOString();

  const emailRecord = {
    id:          emailId,
    candidateId,
    candidateName: candidate.name,
    to:          candidate.email,
    subject,
    body,
    templateId:  templateId || null,
    status:      scheduledAt ? 'scheduled' : 'sent',
    scheduledAt: scheduledAt || null,
    sentAt:      scheduledAt ? null : now,
    sentBy:      req.user.id,
    method:      'pending',
    created_at:  now,
  };

  // Send (unless scheduled)
  if (!scheduledAt) {
    const result = await dispatchEmail({
      to: candidate.email, subject, body,
      from: user?.email,
    });
    emailRecord.method = result.method;
    emailRecord.error  = result.error || null;
    emailRecord.status = result.sent ? 'sent' : 'failed';
  }

  if (!db.data.emails) db.data.emails = [];
  db.data.emails.push(emailRecord);
  db.write();

  // Add notification
  addNotification(db, {
    type:    'email_sent',
    title:   `Email sent to ${candidate.name}`,
    message: `"${subject}" — ${emailRecord.status}`,
    link:    `/pages/candidate-profile.html?id=${candidateId}`,
    userId:  req.user.id,
  });

  res.status(201).json({ message: 'Email processed', email: emailRecord });
});

// ── GET /api/emails ───────────────────────────────────────────────────────────
router.get('/', authenticate, authorize('emails:read'), (req, res) => {
  const { candidateId, page = 1, limit = 20 } = req.query;
  let emails = [...(db.data.emails || [])];
  if (candidateId) emails = emails.filter(e => e.candidateId === candidateId);
  emails.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const total   = emails.length;
  const start   = (page - 1) * limit;
  const sliced  = emails.slice(start, start + parseInt(limit));
  res.json({ emails: sliced, total });
});

// ── DELETE /api/emails/:id ────────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('emails:send'), (req, res) => {
  const before = db.data.emails?.length || 0;
  db.data.emails = (db.data.emails || []).filter(e => e.id !== req.params.id);
  db.write();
  if (db.data.emails.length === before) return res.status(404).json({ error: 'Email not found' });
  res.json({ message: 'Email deleted' });
});

// ── Shared helper for notifications ──────────────────────────────────────────
function addNotification(db, { type, title, message, link, userId }) {
  if (!db.data.notifications) db.data.notifications = [];
  db.data.notifications.unshift({
    id:         uuid(),
    type, title, message, link,
    userId:     userId || null,
    read:       false,
    created_at: new Date().toISOString(),
  });
  // Keep last 100
  if (db.data.notifications.length > 100) db.data.notifications = db.data.notifications.slice(0, 100);
  db.write();
}

module.exports = router;
module.exports.addNotification = addNotification;
