# RecruitAI — Full-Stack Project

An AI-powered recruitment platform with a vanilla HTML/CSS/JS frontend and a Node.js + Express + SQLite backend.

---

## Project Structure

```
recruitai-backend/         ← Backend (Node.js / Express)
├── src/
│   ├── server.js          ← Express entry point
│   ├── routes/
│   │   ├── auth.js        ← POST /api/auth/login|signup, GET /api/auth/me
│   │   ├── candidates.js  ← CRUD + resume upload + AI scoring
│   │   ├── jobs.js        ← CRUD for job postings
│   │   └── analytics.js   ← Dashboard stats, pipeline, charts
│   ├── middleware/
│   │   └── auth.js        ← JWT authentication middleware
│   ├── models/
│   │   └── db.js          ← SQLite schema (better-sqlite3)
│   └── utils/
│       ├── aiScorer.js    ← Keyword-based AI resume scorer (0–100)
│       └── seed.js        ← Seed database with demo data
├── uploads/resumes/       ← Uploaded resume files (auto-created)
├── data/                  ← SQLite database file (auto-created)
├── .env.example           ← Environment variable template
└── package.json

recruitai/                 ← Frontend (vanilla HTML/CSS/JS)
├── components/
│   ├── shared.js          ← Sidebar, topbar, icons, helpers
│   └── api.js             ← ★ NEW: API client (Auth, Candidates, Jobs, Analytics)
├── pages/
│   ├── auth.html          ← Login / Signup (wired to real API)
│   ├── dashboard.html     ← Live stats from API
│   ├── candidates.html    ← CRUD from API
│   ├── jobs.html          ← CRUD from API
│   └── analytics.html     ← Charts + auth guard
├── styles/main.css
└── index.html             ← Landing page
```

---

## Quick Start (Local)

### 1. Set up the Backend

```bash
# Enter the backend folder
cd recruitai-backend

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# (Optional: edit .env to change PORT, JWT_SECRET, etc.)

# Seed the database with demo data
npm run seed

# Start the server
npm start
```

The backend starts at **http://localhost:5000**

---

### 2. Run the Frontend

**Option A — Serve frontend via the backend (recommended)**

The backend already serves the frontend at http://localhost:5000 if the `recruitai/` folder
is in the parent directory of `recruitai-backend/`. Just open:

```
http://localhost:5000
```

**Option B — Separate dev server (e.g., VS Code Live Server)**

```bash
cd recruitai
python3 -m http.server 3000
# → open http://localhost:3000
```

The `components/api.js` file points to `http://localhost:5000/api` by default.
If you change the backend port, update the `API_BASE` constant at the top of `components/api.js`.

---

### 3. Log in with Demo Credentials

| Field    | Value                   |
|----------|-------------------------|
| Email    | sarah@acmecorp.com      |
| Password | password123             |

---

## API Endpoints

All endpoints (except `/api/auth/login` and `/api/auth/signup`) require:
```
Authorization: Bearer <token>
```

### Auth
| Method | Endpoint            | Description               |
|--------|---------------------|---------------------------|
| POST   | /api/auth/signup    | Create account            |
| POST   | /api/auth/login     | Login → returns JWT       |
| GET    | /api/auth/me        | Get logged-in user        |
| PUT    | /api/auth/profile   | Update profile/password   |

### Candidates
| Method | Endpoint                       | Description                      |
|--------|--------------------------------|----------------------------------|
| GET    | /api/candidates                | List with ?search, status, role  |
| GET    | /api/candidates/:id            | Get one candidate                |
| POST   | /api/candidates                | Add candidate (multipart/form)   |
| PUT    | /api/candidates/:id            | Update candidate                 |
| PATCH  | /api/candidates/:id/status     | Update status only               |
| DELETE | /api/candidates/:id            | Delete candidate                 |
| GET    | /api/candidates/:id/resume     | Download resume file             |

### Jobs
| Method | Endpoint                     | Description                |
|--------|------------------------------|----------------------------|
| GET    | /api/jobs                    | List with ?search, status  |
| GET    | /api/jobs/:id                | Get one job                |
| POST   | /api/jobs                    | Create job posting         |
| PUT    | /api/jobs/:id                | Update job                 |
| PATCH  | /api/jobs/:id/status         | Change status only         |
| DELETE | /api/jobs/:id                | Delete job                 |
| GET    | /api/jobs/:id/candidates     | All candidates for a job   |

### Analytics
| Method | Endpoint                  | Description                   |
|--------|---------------------------|-------------------------------|
| GET    | /api/analytics/dashboard  | Full dashboard stats          |
| GET    | /api/analytics/trends     | Monthly trend data            |
| GET    | /api/analytics/summary    | Status + department breakdown |

### Health
| Method | Endpoint     | Description |
|--------|--------------|-------------|
| GET    | /api/health  | Status check |

---

## Deployment

### Option 1 — Railway (Free tier, easiest)

1. Create a free account at https://railway.app
2. Click **New Project → Deploy from GitHub**
3. Push your `recruitai-backend/` to a GitHub repo
4. In Railway dashboard → Variables, add:
   - `JWT_SECRET` = (any long random string)
   - `NODE_ENV` = production
   - `PORT` = 5000
5. Railway auto-detects the `start` script and deploys

To serve the frontend from the same server, copy the `recruitai/` folder
into `recruitai-backend/` and Railway will serve it at your deployment URL.

### Option 2 — Render (Free tier)

1. Push to GitHub
2. Create a new **Web Service** on https://render.com
3. Set **Build Command**: `npm install && npm run seed`
4. Set **Start Command**: `npm start`
5. Add environment variables (same as above)

### Option 3 — VPS / Cloud VM (DigitalOcean, EC2, etc.)

```bash
# On the server
git clone <your-repo>
cd recruitai-backend
npm install
npm run seed

# Use PM2 to keep it running
npm install -g pm2
pm2 start src/server.js --name recruitai
pm2 save && pm2 startup

# Optionally set up Nginx as reverse proxy on port 80/443
```

### Option 4 — Docker

```dockerfile
# Dockerfile (place in recruitai-backend/)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run seed
EXPOSE 5000
CMD ["node", "src/server.js"]
```

```bash
docker build -t recruitai-backend .
docker run -p 5000:5000 -e JWT_SECRET=mysecret recruitai-backend
```

---

## Environment Variables

| Variable        | Default                    | Description                      |
|-----------------|----------------------------|----------------------------------|
| PORT            | 5000                       | Server port                      |
| NODE_ENV        | development                | Environment                      |
| JWT_SECRET      | *(required in production)* | Secret key for JWT signing       |
| JWT_EXPIRES_IN  | 7d                         | Token expiry                     |
| DB_PATH         | ./data/recruitai.db        | SQLite database file path        |
| MAX_UPLOAD_SIZE | 10485760 (10 MB)           | Max resume file size in bytes    |
| CORS_ORIGINS    | (all)                      | Comma-separated allowed origins  |

---

## Features Implemented

- ✅ JWT Authentication (signup, login, protected routes)
- ✅ Candidate CRUD with real persistence (SQLite)
- ✅ Resume upload (PDF, DOC, DOCX, TXT) with text extraction
- ✅ AI resume scoring engine (keyword matching + heuristics, 0–100)
- ✅ Job posting CRUD
- ✅ Dashboard analytics from live data
- ✅ Search & filter with server-side pagination
- ✅ Status management (Pending → Shortlisted → Selected → Rejected)
- ✅ CORS, rate limiting, helmet security headers
- ✅ Frontend auth guard (redirects to login if no token)
- ✅ Toast notifications for all actions
- ✅ Demo seed data matching original frontend design

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Runtime    | Node.js 18+                       |
| Framework  | Express 4                         |
| Database   | SQLite via better-sqlite3         |
| Auth       | JWT (jsonwebtoken) + bcryptjs     |
| Uploads    | Multer                            |
| PDF Parse  | pdf-parse                         |
| Security   | Helmet + express-rate-limit + CORS|
| Frontend   | Vanilla HTML/CSS/JS (no build)    |
