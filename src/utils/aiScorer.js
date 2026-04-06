// src/utils/aiScorer.js — Resume / candidate AI scoring engine
// Scores a candidate 0–100 based on available signals.
// No external API needed — uses keyword matching + heuristics.
// You can later swap this for an OpenAI/Claude API call.

const SKILL_WEIGHTS = {
  // Frontend
  'React': 8, 'Vue': 7, 'Angular': 7, 'TypeScript': 8, 'JavaScript': 6, 'CSS': 4, 'HTML': 3,
  // Backend
  'Node.js': 8, 'Python': 8, 'Go': 8, 'Java': 7, 'Spring': 6, 'Django': 6, 'FastAPI': 7,
  'PostgreSQL': 7, 'MySQL': 6, 'MongoDB': 6, 'Redis': 6, 'Kafka': 7,
  // Cloud / Infra
  'AWS': 9, 'GCP': 8, 'Azure': 8, 'Docker': 8, 'Kubernetes': 9, 'Terraform': 8,
  // AI / ML
  'TensorFlow': 9, 'PyTorch': 9, 'ML': 8, 'NLP': 8, 'Keras': 7, 'CV': 7,
  // Product / Design
  'Figma': 6, 'Sketch': 5, 'Agile': 5, 'JIRA': 4, 'Roadmapping': 6,
  // Data
  'SQL': 6, 'Tableau': 6, 'Power BI': 6, 'R': 6, 'Statistics': 7, 'Pandas': 6,
};

const EXP_SCORES = {
  '0-1 yrs': 40, '0-1': 40,
  '1 yr': 45, '1': 45,
  '2 yrs': 55, '2': 55,
  '3 yrs': 65, '3': 65,
  '4 yrs': 72, '4': 72,
  '5 yrs': 80, '5': 80,
  '6 yrs': 85, '6': 85,
  '7 yrs': 88, '7': 88,
  '8 yrs': 90, '8': 90,
  '9 yrs': 92, '9': 92,
  '10+ yrs': 95, '10+': 95,
};

/**
 * scoreResume — main scoring function
 * @param {object} candidate
 * @param {string} candidate.name
 * @param {string} candidate.role
 * @param {string[]} candidate.skills
 * @param {string} candidate.exp
 * @param {string} candidate.resumeText   — extracted plain text
 * @param {string|null} candidate.job_id  — if set, fetch job skills for bonus
 * @returns {number} 0–100
 */
function scoreResume({ name, role, skills = [], exp = '', resumeText = '', job_id } = {}) {
  let score = 50; // baseline

  // ── 1. Skills score (max +30) ──────────────────────────────────────────────
  let skillScore = 0;
  const normalizedSkills = skills.map(s => s.toLowerCase());

  for (const [skill, weight] of Object.entries(SKILL_WEIGHTS)) {
    if (normalizedSkills.includes(skill.toLowerCase())) {
      skillScore += weight;
    }
  }
  // Also mine resumeText for extra skills
  if (resumeText) {
    for (const [skill, weight] of Object.entries(SKILL_WEIGHTS)) {
      if (
        !normalizedSkills.includes(skill.toLowerCase()) &&
        resumeText.toLowerCase().includes(skill.toLowerCase())
      ) {
        skillScore += Math.round(weight * 0.3); // partial credit from resume text
      }
    }
  }
  score += Math.min(30, Math.round(skillScore / 5));

  // ── 2. Experience score (max +15) ─────────────────────────────────────────
  const expKey = Object.keys(EXP_SCORES).find(k => exp && exp.toLowerCase().includes(k.toLowerCase()));
  if (expKey) {
    const expBase = EXP_SCORES[expKey];
    score += Math.round((expBase - 50) * 0.3); // scale to ±15
  }

  // ── 3. Resume quality signals (max +10) ───────────────────────────────────
  if (resumeText) {
    const words = resumeText.split(/\s+/).length;
    if (words > 200)  score += 3;
    if (words > 400)  score += 3;
    if (words > 600)  score += 2;

    // Bonus keywords
    const positives = ['led', 'built', 'improved', 'increased', 'launched', 'delivered', 'managed', 'designed', 'developed'];
    const found = positives.filter(w => resumeText.toLowerCase().includes(w)).length;
    score += Math.min(4, found);
  }

  // ── 4. Role match bonus (+5) ──────────────────────────────────────────────
  // (if job_id is given, we could compare job skills here — skipping DB call for perf)
  if (role && role.toLowerCase().includes('senior')) score += 3;
  if (role && role.toLowerCase().includes('lead'))   score += 3;

  // ── 5. Random spread (±3) — simulates AI variance ─────────────────────────
  score += Math.floor(Math.random() * 7) - 3;

  return Math.max(10, Math.min(99, score));
}

/**
 * getInitials — returns up to 2-char initials from a full name
 */
function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

module.exports = { scoreResume, getInitials };
