// src/routes/ai.js — AI-powered features via Claude API
// Endpoints:
//   POST /api/ai/parse-resume        — extract structured data from raw resume text
//   POST /api/ai/score-fit           — score candidate vs job description
//   POST /api/ai/interview-questions — generate role-specific interview questions
//   POST /api/ai/candidate-summary   — write an executive summary for a candidate
//   GET  /api/ai/candidate/:id/full  — run all AI on a saved candidate

const express  = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const db = require('../models/db');

const router = express.Router();

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const API_URL      = 'https://api.anthropic.com/v1/messages';

// ── Core Claude caller ────────────────────────────────────────────────────────
async function callClaude(systemPrompt, userPrompt, maxTokens = 1024) {
  const res = await fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      CLAUDE_MODEL,
      max_tokens: maxTokens,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude API error ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// ── Safe JSON parse helper ────────────────────────────────────────────────────
function safeJSON(text, fallback = {}) {
  try {
    const clean = text.replace(/```json\n?|```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return fallback;
  }
}

// ── POST /api/ai/parse-resume ─────────────────────────────────────────────────
// Body: { resumeText: string }
// Returns structured candidate data extracted by AI
router.post('/parse-resume', authenticate, authorize('ai:use'), async (req, res) => {
  const { resumeText } = req.body;
  if (!resumeText || resumeText.trim().length < 30) {
    return res.status(400).json({ error: 'resumeText is required (min 30 chars)' });
  }

  try {
    const system = `You are an expert HR data extractor. Extract structured information from resumes.
Always respond with valid JSON only — no markdown, no preamble, no explanation.`;

    const prompt = `Extract the following fields from this resume text and return as JSON:
{
  "name": "full name",
  "email": "email if present, else null",
  "phone": "phone if present, else null",
  "currentRole": "current or most recent job title",
  "totalExp": "total years of experience as a string like '5 yrs'",
  "skills": ["array", "of", "technical", "skills"],
  "topSkills": ["top 3 most impressive skills"],
  "education": "highest degree + institution",
  "summary": "2-sentence professional summary written in third person",
  "strengths": ["3 key professional strengths"],
  "redFlags": ["any concerns or gaps, empty array if none"],
  "seniority": "Junior | Mid | Senior | Lead | Principal",
  "estimatedScore": <number 0-100 representing overall candidate quality>
}

Resume text:
${resumeText.slice(0, 4000)}`;

    const raw    = await callClaude(system, prompt, 800);
    const parsed = safeJSON(raw, null);

    if (!parsed) return res.status(422).json({ error: 'Could not parse resume', raw });
    return res.json({ parsed });
  } catch (err) {
    console.error('parse-resume error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/score-fit ────────────────────────────────────────────────────
// Body: { candidateText: string, jobTitle: string, jobDescription: string, requiredSkills: string[] }
// Returns a detailed fit analysis with score breakdown
router.post('/score-fit', authenticate, authorize('ai:use'), async (req, res) => {
  const { candidateText, jobTitle, jobDescription, requiredSkills = [] } = req.body;
  if (!candidateText || !jobTitle) {
    return res.status(400).json({ error: 'candidateText and jobTitle are required' });
  }

  try {
    const system = `You are a senior technical recruiter performing objective candidate-job fit analysis.
Always respond with valid JSON only — no markdown, no preamble.`;

    const prompt = `Analyze how well this candidate fits the job and return a JSON fit report:

JOB: ${jobTitle}
DESCRIPTION: ${jobDescription || 'Not provided'}
REQUIRED SKILLS: ${requiredSkills.join(', ') || 'Not specified'}

CANDIDATE PROFILE:
${candidateText.slice(0, 3000)}

Return this exact JSON structure:
{
  "overallScore": <0-100>,
  "recommendation": "Strong Hire | Hire | Maybe | No Hire",
  "breakdown": {
    "skillsMatch": <0-100>,
    "experienceMatch": <0-100>,
    "roleAlignment": <0-100>,
    "potentialGrowth": <0-100>
  },
  "matchedSkills": ["skills the candidate has that match the job"],
  "missingSkills": ["required skills the candidate lacks"],
  "highlights": ["3 strongest reasons to hire"],
  "concerns": ["1-3 concerns or gaps, empty array if none"],
  "fitSummary": "3-sentence executive summary of fit"
}`;

    const raw    = await callClaude(system, prompt, 900);
    const result = safeJSON(raw, null);

    if (!result) return res.status(422).json({ error: 'Could not generate fit score', raw });
    return res.json({ fitAnalysis: result });
  } catch (err) {
    console.error('score-fit error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/interview-questions ─────────────────────────────────────────
// Body: { jobTitle, skills, seniority, candidateSummary?, focusAreas? }
// Returns categorized interview questions
router.post('/interview-questions', authenticate, authorize('ai:use'), async (req, res) => {
  const { jobTitle, skills = [], seniority = 'Mid', candidateSummary = '', focusAreas = [] } = req.body;
  if (!jobTitle) return res.status(400).json({ error: 'jobTitle is required' });

  try {
    const system = `You are an expert technical interviewer. Generate targeted, insightful interview questions.
Always respond with valid JSON only — no markdown, no preamble.`;

    const prompt = `Generate a complete interview question set for this candidate/role:

ROLE: ${jobTitle}
SENIORITY: ${seniority}
KEY SKILLS: ${skills.join(', ') || 'General'}
CANDIDATE BACKGROUND: ${candidateSummary || 'Not provided'}
FOCUS AREAS: ${focusAreas.join(', ') || 'General assessment'}

Return this exact JSON:
{
  "technical": [
    { "question": "...", "purpose": "what this tests", "difficulty": "Easy|Medium|Hard", "followUp": "..." },
    { "question": "...", "purpose": "...", "difficulty": "...", "followUp": "..." },
    { "question": "...", "purpose": "...", "difficulty": "...", "followUp": "..." },
    { "question": "...", "purpose": "...", "difficulty": "...", "followUp": "..." }
  ],
  "behavioral": [
    { "question": "...", "purpose": "...", "framework": "STAR" },
    { "question": "...", "purpose": "...", "framework": "STAR" },
    { "question": "...", "purpose": "...", "framework": "STAR" }
  ],
  "situational": [
    { "question": "...", "purpose": "...", "idealAnswer": "key points to listen for" },
    { "question": "...", "purpose": "...", "idealAnswer": "..." },
    { "question": "...", "purpose": "...", "idealAnswer": "..." }
  ],
  "cultureAndGrowth": [
    { "question": "...", "purpose": "..." },
    { "question": "...", "purpose": "..." }
  ],
  "closingQuestions": ["Question they might ask you 1", "Question they might ask you 2"],
  "interviewTips": ["3 tips specific to evaluating this role/candidate"]
}`;

    const raw    = await callClaude(system, prompt, 1500);
    const result = safeJSON(raw, null);

    if (!result) return res.status(422).json({ error: 'Could not generate questions', raw });
    return res.json({ questions: result });
  } catch (err) {
    console.error('interview-questions error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/candidate-summary ───────────────────────────────────────────
// Body: { name, role, skills, exp, resumeText?, notes? }
router.post('/candidate-summary', authenticate, authorize('ai:use'), async (req, res) => {
  const { name, role, skills = [], exp, resumeText = '', notes = '' } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const system = `You are a senior talent acquisition specialist writing concise, professional candidate summaries for hiring managers.`;

    const prompt = `Write a professional candidate summary for a hiring manager. Be concise, objective, and highlight value.

Candidate: ${name}
Role applied for: ${role || 'Not specified'}
Experience: ${exp || 'Not specified'}
Skills: ${skills.join(', ') || 'Not specified'}
${resumeText ? `Resume excerpt:\n${resumeText.slice(0, 1500)}` : ''}
${notes ? `Recruiter notes: ${notes}` : ''}

Write a 3-paragraph summary:
1. Opening: Who they are and their strongest value proposition (2-3 sentences)
2. Experience & Skills: Most relevant experience and technical strengths (2-3 sentences)  
3. Recommendation: Overall assessment and next step suggestion (1-2 sentences)

Keep it professional, factual, and under 150 words total.`;

    const summary = await callClaude(system, prompt, 400);
    return res.json({ summary: summary.trim() });
  } catch (err) {
    console.error('candidate-summary error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ai/candidate/:id/full ────────────────────────────────────────────
// Runs all AI analysis on a saved candidate and returns the full AI report
router.get('/candidate/:id/full', authenticate, authorize('ai:use'), async (req, res) => {
  const row = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Candidate not found' });

  const candidate = { ...row, skills: JSON.parse(row.skills || '[]') };

  // Find linked job for fit analysis
  let job = null;
  if (candidate.job_id) {
    const jobRow = db.prepare('SELECT * FROM jobs WHERE id = ?').get(candidate.job_id);
    if (jobRow) job = { ...jobRow, skills: JSON.parse(jobRow.skills || '[]') };
  }

  const resumeText = candidate.resume_text || [
    candidate.name, candidate.role, candidate.exp,
    candidate.skills.join(', '), candidate.notes || ''
  ].filter(Boolean).join('\n');

  try {
    // Run all 3 AI calls in parallel for speed
    const [fitResult, questionsResult, summaryResult] = await Promise.allSettled([
      // Fit score (only if job linked)
      job ? callClaude(
        'You are a senior recruiter. Respond with valid JSON only.',
        `Score this candidate for the role and return JSON with keys: overallScore(0-100), recommendation(string), breakdown({skillsMatch,experienceMatch,roleAlignment,potentialGrowth} each 0-100), matchedSkills(array), missingSkills(array), highlights(array of 3), concerns(array), fitSummary(string).
Candidate: ${candidate.name}, ${candidate.role}, ${candidate.exp}, skills: ${candidate.skills.join(', ')}
Job: ${job.title}, requires: ${job.skills.join(', ')}, ${job.description || ''}`, 800
      ).then(t => safeJSON(t)) : Promise.resolve(null),

      // Interview questions
      callClaude(
        'You are an expert interviewer. Respond with valid JSON only.',
        `Generate 3 technical, 2 behavioral, and 2 situational interview questions for: ${candidate.role || 'this candidate'} with skills: ${candidate.skills.join(', ')}.
Return JSON: { technical:[{question,difficulty,followUp}], behavioral:[{question,purpose}], situational:[{question,idealAnswer}] }`, 900
      ).then(t => safeJSON(t)),

      // Summary
      callClaude(
        'You are a talent acquisition specialist. Write concise professional candidate summaries.',
        `Write a 3-paragraph hiring manager summary for ${candidate.name}, applying for ${candidate.role || 'a role'}, with ${candidate.exp || 'some'} experience in ${candidate.skills.join(', ')}. Under 120 words. Professional tone.`, 350
      ),
    ]);

    return res.json({
      candidate,
      job: job || null,
      aiReport: {
        fitAnalysis:          fitResult.status === 'fulfilled'      ? fitResult.value      : null,
        interviewQuestions:   questionsResult.status === 'fulfilled' ? questionsResult.value : null,
        summary:              summaryResult.status === 'fulfilled'   ? summaryResult.value  : null,
        generatedAt:          new Date().toISOString(),
      }
    });
  } catch (err) {
    console.error('full AI report error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
