// src/utils/seed.js — Populate database with demo data matching the frontend
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db = require('../models/db');

console.log('🌱 Seeding RecruitAI database...\n');

// ── Clear existing data ───────────────────────────────────────────────────────
db.exec('DELETE FROM candidates; DELETE FROM jobs; DELETE FROM users;');

// ── Demo User (Sarah Ahmed, HR Manager — the original) ───────────────────────
const userId = uuid();
const hashedPass = bcrypt.hashSync('password123', 12);
db.prepare(`
  INSERT INTO users (id, first_name, last_name, email, password, company, role)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(userId, 'Sarah', 'Ahmed', 'sarah@acmecorp.com', hashedPass, 'Acme Corp', 'hr_manager');

// ── Additional demo users for each role ──────────────────────────────────────
const demoUsers = [
  { first: 'Alex',  last: 'Kumar',  email: 'admin@acmecorp.com',       role: 'admin' },
  { first: 'Jamie', last: 'Chen',   email: 'interviewer@acmecorp.com',  role: 'interviewer' },
  { first: 'Pat',   last: 'Rivera', email: 'viewer@acmecorp.com',       role: 'viewer' },
];

const demoPass = bcrypt.hashSync('password123', 12);
demoUsers.forEach(u => {
  db.prepare(`
    INSERT INTO users (id, first_name, last_name, email, password, company, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuid(), u.first, u.last, u.email, demoPass, 'Acme Corp', u.role);
});

console.log('✅ Created demo user: sarah@acmecorp.com / password123 (HR Manager)');

// ── Jobs ──────────────────────────────────────────────────────────────────────
const jobs = [
  { title: 'Senior Frontend Engineer', dept: 'Engineering', location: 'Remote', type: 'Full-time', exp: '5+ yrs', salary: '$120k – $150k', skills: ['React','TypeScript','Node.js','CSS'], status: 'Active', applicants: 48 },
  { title: 'Product Manager',          dept: 'Product',     location: 'San Francisco', type: 'Full-time', exp: '5+ yrs', salary: '$130k – $160k', skills: ['Roadmapping','Agile','JIRA','Analytics'], status: 'Active', applicants: 35 },
  { title: 'Data Scientist',           dept: 'Data',        location: 'Remote', type: 'Full-time', exp: '3+ yrs', salary: '$110k – $140k', skills: ['Python','ML','TensorFlow','SQL'], status: 'Active', applicants: 62 },
  { title: 'ML Engineer',              dept: 'Engineering', location: 'New York', type: 'Full-time', exp: '3+ yrs', salary: '$115k – $145k', skills: ['PyTorch','NLP','AWS','Python'], status: 'Active', applicants: 29 },
  { title: 'UX Designer',              dept: 'Design',      location: 'Remote', type: 'Full-time', exp: '4+ yrs', salary: '$90k – $120k', skills: ['Figma','User Research','Prototyping'], status: 'Active', applicants: 41 },
  { title: 'Backend Engineer',         dept: 'Engineering', location: 'Remote', type: 'Full-time', exp: '4+ yrs', salary: '$110k – $140k', skills: ['Go','PostgreSQL','Docker','Kubernetes'], status: 'Closed', applicants: 55 },
  { title: 'DevOps Engineer',          dept: 'Engineering', location: 'Austin', type: 'Full-time', exp: '3+ yrs', salary: '$105k – $135k', skills: ['AWS','Terraform','Docker','Kubernetes'], status: 'Draft', applicants: 0 },
];

const jobIds = jobs.map(j => {
  const id = uuid();
  db.prepare(`
    INSERT INTO jobs (id, title, dept, location, type, exp, salary, description, skills, status, applicants, created_by, posted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now', '-' || ? || ' days'))
  `).run(id, j.title, j.dept, j.location, j.type, j.exp, j.salary,
    `We are looking for a talented ${j.title} to join our team. You will work on exciting projects and collaborate with a world-class team.`,
    JSON.stringify(j.skills), j.status, j.applicants, userId, Math.floor(Math.random() * 30));
  return { id, ...j };
});
console.log(`✅ Created ${jobs.length} job postings`);

// ── Candidates ────────────────────────────────────────────────────────────────
const COLORS = ['#3b6be8','#8b5cf6','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];
const candidatesData = [
  { name:'Arjun Kapoor',   role:'Senior Frontend Engineer', exp:'5 yrs', skills:['React','TypeScript','Node.js'],    score:96, status:'Shortlisted', applied:'2025-06-10' },
  { name:'Priya Mehta',    role:'Product Manager',          exp:'7 yrs', skills:['Roadmapping','Agile','JIRA'],      score:91, status:'Selected',    applied:'2025-06-09' },
  { name:'Sneha Iyer',     role:'Data Scientist',           exp:'4 yrs', skills:['Python','ML','TensorFlow'],        score:88, status:'Shortlisted', applied:'2025-06-08' },
  { name:'Dev Sharma',     role:'ML Engineer',              exp:'3 yrs', skills:['PyTorch','NLP','AWS'],             score:85, status:'Pending',     applied:'2025-06-08' },
  { name:'Kavya Nair',     role:'UX Designer',              exp:'6 yrs', skills:['Figma','User Research','Prototyping'], score:82, status:'Pending', applied:'2025-06-07' },
  { name:'Rohan Verma',    role:'Backend Engineer',         exp:'5 yrs', skills:['Go','PostgreSQL','Docker'],        score:80, status:'Shortlisted', applied:'2025-06-07' },
  { name:'Ananya Raj',     role:'Product Manager',          exp:'4 yrs', skills:['Strategy','Analytics','SQL'],      score:77, status:'Pending',     applied:'2025-06-06' },
  { name:'Kiran Das',      role:'Senior Frontend Engineer', exp:'2 yrs', skills:['Vue','CSS','JavaScript'],         score:58, status:'Rejected',    applied:'2025-06-05' },
  { name:'Meera Pillai',   role:'Data Scientist',           exp:'3 yrs', skills:['R','Statistics','Tableau'],       score:74, status:'Pending',     applied:'2025-06-05' },
  { name:'Vikram Singh',   role:'ML Engineer',              exp:'6 yrs', skills:['Keras','CV','GCP'],               score:89, status:'Shortlisted', applied:'2025-06-04' },
  { name:'Pooja Krishnan', role:'UX Designer',              exp:'5 yrs', skills:['Sketch','InVision','CSS'],        score:79, status:'Pending',     applied:'2025-06-04' },
  { name:'Amit Gupta',     role:'Backend Engineer',         exp:'8 yrs', skills:['Java','Spring','Kafka'],          score:86, status:'Selected',    applied:'2025-06-03' },
];

const { getInitials } = require('./aiScorer');

const candidateIds = [];
candidatesData.forEach((c, i) => {
  const id = uuid();
  // Link to a matching job
  const matchedJob = jobIds.find(j => j.title.includes(c.role.split(' ')[0])) || jobIds[i % jobIds.length];
  db.prepare(`
    INSERT INTO candidates (id, name, initials, role, exp, skills, score, status, email, job_id, applied)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, c.name, getInitials(c.name), c.role, c.exp,
    JSON.stringify(c.skills), c.score, c.status,
    `${c.name.toLowerCase().replace(' ', '.')}@email.com`,
    matchedJob.id, c.applied
  );
  candidateIds.push({ id, name: c.name, role: c.role });
});
console.log(`✅ Created ${candidatesData.length} candidates`);

// ── Demo Interviews ───────────────────────────────────────────────────────────
const now = new Date();
const interviewData = candidateIds.slice(0, 5).map((c, i) => ({
  id: uuid(),
  candidateId:   c.id,
  candidateName: c.name,
  jobId:         jobIds[i % jobIds.length].id,
  scheduledAt:   new Date(now.getTime() + (i * 2 + 1) * 24 * 60 * 60 * 1000).toISOString(),
  duration:      i % 2 === 0 ? 60 : 45,
  format:        ['Video Call', 'Phone Call', 'In Person', 'Video Call', 'Technical Test'][i],
  meetingLink:   i % 2 === 0 ? 'https://meet.google.com/demo-link' : null,
  interviewers:  ['Sarah Ahmed', 'Dev Lead'][i % 2 === 0 ? 0 : 1].split(', '),
  notes:         'Prepare system design questions',
  round:         (i % 3) + 1,
  status:        i < 2 ? 'scheduled' : i === 2 ? 'completed' : 'scheduled',
  feedback:      i === 2 ? 'Strong communicator, good technical depth' : null,
  rating:        i === 2 ? 4 : null,
  recommendation:i === 2 ? 'Hire' : null,
  created_by:    userId,
  created_at:    new Date().toISOString(),
}));

if (!db.data.interviews) db.data.interviews = [];
db.data.interviews.push(...interviewData);
db.write();
console.log(`✅ Created ${interviewData.length} demo interviews`);

// ── Demo Notifications ────────────────────────────────────────────────────────
const notifData = [
  { type:'new_application',    title:'New application received',     message:'Arjun Kapoor applied for Senior Frontend Engineer', link:'/pages/candidates.html' },
  { type:'interview_scheduled',title:'Interview scheduled',          message:'Priya Mehta — Tomorrow at 10:00 AM',               link:'/pages/interviews.html' },
  { type:'status_change',      title:'Candidate shortlisted',        message:'Sneha Iyer moved to Shortlisted',                  link:'/pages/candidates.html' },
  { type:'email_sent',         title:'Email sent',                   message:'Interview invite sent to Dev Sharma',              link:'/pages/emails.html' },
  { type:'new_application',    title:'New public application',       message:'Rahul Patel applied via Job Board for ML Engineer', link:'/pages/candidates.html' },
];

if (!db.data.notifications) db.data.notifications = [];
notifData.forEach((n, i) => {
  const d = new Date(now.getTime() - i * 2 * 60 * 60 * 1000);
  db.data.notifications.push({ id: uuid(), ...n, userId, read: i > 2, created_at: d.toISOString() });
});
db.write();
console.log(`✅ Created ${notifData.length} demo notifications`);

// ── Demo Talent Pool ──────────────────────────────────────────────────────────
if (!db.data.talent_pool) db.data.talent_pool = [];
candidateIds.slice(0, 4).forEach((c, i) => {
  db.data.talent_pool.push({
    id: uuid(), candidateId: c.id,
    tags:         [['React','Senior'],['Python','ML'],['Product'],['Go','Backend']][i],
    notes:        'Strong candidate — keep for future senior openings',
    source:       'pipeline',
    targetRoles:  [c.role],
    availableFrom: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0,10),
    addedBy:      userId,
    added_at:     new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString(),
    priority:     ['high','normal','normal','low'][i],
  });
});
db.write();
console.log(`✅ Created 4 talent pool entries`);

// ── Demo Scorecards ───────────────────────────────────────────────────────────
if (!db.data.scorecards) db.data.scorecards = [];
candidateIds.slice(0, 6).forEach((c, i) => {
  db.data.scorecards.push({
    id: uuid(), candidateId: c.id, candidateName: c.name,
    jobId: jobIds[i % jobIds.length].id,
    reviewerId: userId,
    scores: {
      technical:    3 + (i % 3),
      communication:3 + ((i+1) % 3),
      culture:      4,
      experience:   3 + (i % 2),
      motivation:   4 + (i % 2),
    },
    recommendation: ['Strong Hire','Hire','Hire','Maybe','No Hire','Strong Hire'][i],
    notes:    'Evaluated after technical round',
    strengths:'Strong problem solving, good communication',
    weaknesses: i > 3 ? 'Limited experience in the domain' : '',
    created_at: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
});
db.write();
console.log(`✅ Created 6 demo scorecards`);

console.log('\n🎉 Database seeded successfully!');
console.log('\n📋 Demo accounts (all password: password123):');
console.log('   admin@acmecorp.com       → Admin        (full access)');
console.log('   sarah@acmecorp.com       → HR Manager   (manage candidates, jobs, emails)');
console.log('   interviewer@acmecorp.com → Interviewer  (view + scorecards/feedback only)');
console.log('   viewer@acmecorp.com      → Viewer       (read-only)');
console.log('\n🌐 Public job board: http://localhost:5000/pages/job-board.html');
console.log('🚀 Dashboard:        http://localhost:5000/pages/dashboard.html');
console.log('🔐 Admin panel:      http://localhost:5000/pages/admin.html\n');
