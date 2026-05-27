# Loophire — AI Job Application Agent

> An autonomous, full-stack AI agent that tailors CVs,
> writes cover letters, scores fit, and tracks job
> applications end-to-end.
>
> **Live at [loophire.xyz](https://loophire.xyz)**

![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-green?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square&logo=postgresql)
![Claude API](https://img.shields.io/badge/Claude-API-orange?style=flat-square)
![Railway](https://img.shields.io/badge/Deployed-Railway-purple?style=flat-square)
![Live Demo](https://img.shields.io/badge/Demo-Live-orange?style=flat-square)

---

## What it does

Loophire is a solo end-to-end engineering project that
solves a real problem: job applications are repetitive,
slow, and poorly targeted.

A user uploads their CV once. For each job they want to
apply for — found via Reed, Adzuna, LinkedIn import, or
manual paste — Loophire runs a fully autonomous 6-agent
AI pipeline that produces:

- A **fit score** (0–100) with keyword gap analysis
- A **tailored CV** rewritten to match the job description
- A **personalised cover letter** tuned to the company's tone
- **Company research** pulled from live web search
- **Interview prep questions** generated from the JD
- A **formatted PDF** using the user's original LaTeX template

All of this runs in under 30 seconds with real-time
WebSocket progress updates. A one-click demo at
[loophire.xyz](https://loophire.xyz) lets employers
explore the full product instantly — no signup required.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT LAYER                      │
│                                                      │
│   React + Vite     React Query      WebSocket        │
│   Tailwind CSS     (caching)        (progress)       │
│   Recharts         React Router     Chrome Ext.      │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS / WSS
┌────────────────────────▼────────────────────────────┐
│                   API LAYER (FastAPI)                │
│                                                      │
│  /api/auth    JWT auth · bcrypt · rate limiting      │
│  /api/cv      PDF parse · multi-CV · template store  │
│  /api/apps    Generate · Regenerate · Export         │
│  /api/jobs    Reed API · Adzuna API · LinkedIn scrape│
│  /ws/progress WebSocket connection manager           │
│                                                      │
│  Middleware: CORS · Bot blocker · Input validation   │
│              Security headers · Prompt injection     │
└──────────┬──────────────────────┬───────────────────┘
           │                      │
┌──────────▼──────────┐  ┌───────▼───────────────────┐
│   AI AGENT PIPELINE │  │      DATA LAYER            │
│                     │  │                            │
│  1. Tone agent      │  │  PostgreSQL + SQLAlchemy   │
│  2. Fit agent       │  │  Alembic migrations        │
│  3. Research agent  │  │  Redis (Upstash)           │
│  4. Writer agent    │  │  Session + agent memory    │
│     ├─ CV tailor    │  │                            │
│     └─ Cover letter │  │  Anthropic Claude API      │
│  5. Interview agent │  │  Prompt caching (90% cost  │
│  6. LaTeX export    │  │  reduction)                │
│                     │  │  Tavily web search API     │
│  Background tasks   │  │  Reed + Adzuna job APIs    │
│  (FastAPI + async)  │  │                            │
└─────────────────────┘  └────────────────────────────┘
           │
┌──────────▼─────────────────────────────────────────┐
│                  INFRASTRUCTURE                      │
│                                                      │
│  Backend → Railway    Frontend → Vercel             │
│  DB → Railway PostgreSQL    Cache → Upstash Redis   │
│  CI/CD → Git push → auto deploy (both platforms)   │
└─────────────────────────────────────────────────────┘
```

---

## Feature overview

### Core AI pipeline

| Feature | Detail |
|---|---|
| Fit scoring | 0–100 score with reasoning and keyword gap analysis |
| CV tailoring | Structured JSON output rewritten to match the JD |
| Cover letter | 3-paragraph personalised letter tuned to company tone |
| Tone analysis | Detects formal / startup / technical / corporate from JD |
| Company research | Live Tavily web search synthesised by Claude |
| Interview prep | Role-specific technical and behavioural questions |
| Generation mode selector | Users choose: fit only, CV rewrite, cover letter, or all three. Shows estimated API cost tier before generating. |

### Job sourcing

| Feature | Detail |
|---|---|
| Reed API | Free UK job board — full JD, salary, contract filters |
| Adzuna API | Aggregates hundreds of UK sources, 250 req/day free tier |
| LinkedIn import | URL scraper with Tavily fallback + direct job ID normalisation |
| Chrome extension | Manifest V3 extension — injects import button on LinkedIn pages |
| Manual paste | Full job description paste with validation |

### Application management

| Feature | Detail |
|---|---|
| Dashboard | Table view + Kanban board with drag-and-drop status updates |
| Delete application | Two-click confirm delete on table, Kanban, and detail page. Optimistic UI update with instant cache removal. |
| A/B tracking | Records which CV versions get responses vs rejections |
| Interview tracker | Interview dates, notes, upcoming interview card |
| Notes | Auto-saving notes field per application (debounced, 1.5s) |
| Regenerate | Re-run the full pipeline on an existing application |
| CV version tracking | Every application records which CV version was used. Shown as a badge in table, Kanban, and detail view. |

### CV management

| Feature | Detail |
|---|---|
| Multi-CV | Store multiple CV versions (SWE, DA, DS etc.) |
| Template library | 4 LaTeX templates: Classic, Minimal, Two Column, Compact |
| Auto-detection | Analyses CV structure to pick the closest matching template |
| PDF export | Server-side pdflatex compilation with hyperlinks preserved |
| PDF preview | Streams PDF inline to a new browser tab before download |
| CV viewer | Split-panel viewer with keyboard navigation (↑↓/J/K/Esc) |

### Infrastructure and security

| Feature | Detail |
|---|---|
| Auth | JWT (python-jose) + bcrypt password hashing |
| Rate limiting | slowapi — per-user limits on all endpoints |
| Input validation | Pydantic schemas + bleach HTML stripping + prompt injection detection |
| Prompt caching | Anthropic cache_control on system prompts and CV text — ~90% cost reduction on repeated calls |
| Bot blocking | Middleware blocks PHP/WordPress scan attempts with 403 |
| WebSockets | Real-time 7-stage pipeline progress with per-stage status |
| Background jobs | FastAPI BackgroundTasks — generation never blocks HTTP |
| SSRF protection | URL validation blocks localhost and private IP ranges |
| Error boundaries | React error boundaries on every page, section, and card. Four fallback levels. Crashes show recovery UI, not a blank screen. |
| Demo mode | One-click employer preview with pre-populated applications. Read-only, anonymised data, resets every 24 hours. No signup required. |
| Usage analytics | Per-user API usage tracking — calls, tokens, estimated cost, prompt caching savings breakdown, per-agent stats, 30-day activity chart. |
| Onboarding flow | Post-registration guided flow from CV upload to first application. Empty states, welcome banner, contextual nav hints. |

---

## Tech stack

### Backend

```
Python 3.11          FastAPI              Uvicorn
SQLAlchemy           Alembic              psycopg2
python-jose          bcrypt               passlib
slowapi              bleach               validators
anthropic            httpx                pdfplumber
reportlab            websockets           upstash-redis
python-multipart     pydantic[email]
```

### Frontend

```
React 18             Vite                 React Router v6
Tailwind CSS         React Query          Recharts
@hello-pangea/dnd    Axios                date-fns
```

### Infrastructure

```
Railway              Vercel               PostgreSQL 15
Upstash Redis        pdflatex (TeX Live)  Docker
```

### External APIs

```
Anthropic Claude     Tavily Search        Reed Jobs
Adzuna Jobs          Chrome Extensions (Manifest V3)
```

---

## Project structure

```
loophire/
│
├── backend/
│   ├── agents/
│   │   ├── fit_agent.py          # Fit scoring + keyword gaps
│   │   ├── writer_agent.py       # CV tailoring + cover letter
│   │   ├── tone_agent.py         # JD tone detection
│   │   └── interview_agent.py    # Interview question generation
│   │
│   ├── routers/
│   │   ├── auth.py               # Register, login, JWT, demo login
│   │   ├── applications.py       # Generate, list, export, WS
│   │   ├── cv.py                 # Upload, parse, store
│   │   ├── cvs.py                # Multi-CV manager
│   │   ├── jobs.py               # Reed + Adzuna search
│   │   ├── usage.py              # API usage analytics endpoint
│   │   └── ws.py                 # WebSocket progress endpoint
│   │
│   ├── services/
│   │   ├── cv_parser.py          # pdfplumber PDF parsing
│   │   ├── cv_templates.py       # 4 LaTeX templates + detector
│   │   ├── latex_export_service.py # pdflatex PDF generation
│   │   ├── pdf_export_service.py # reportlab fallback PDF generation
│   │   ├── research_service.py   # Tavily company research
│   │   ├── job_search_service.py # Reed + Adzuna integration
│   │   ├── memory_service.py     # Redis agent memory
│   │   └── usage_service.py      # API call logging + cost calculation
│   │
│   ├── utils/
│   │   ├── auth.py               # JWT + bcrypt helpers
│   │   ├── sanitiser.py          # Input validation + injection check
│   │   ├── rate_limiter.py       # slowapi config
│   │   ├── progress.py           # WebSocket connection manager
│   │   └── claude_helpers.py     # Prompt caching helpers
│   │
│   ├── models/                   # SQLAlchemy ORM models (User, Application, CVVersion, APIUsageLog)
│   ├── schemas/                  # Pydantic request schemas
│   ├── migrations/               # Alembic migration history
│   ├── tests/
│   │   └── e2e_test.py           # Full end-to-end test suite
│   ├── main.py                   # FastAPI app + middleware
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── ApplyPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ApplicationDetailPage.jsx
│   │   │   ├── CVManagerPage.jsx
│   │   │   ├── UsagePage.jsx             # API usage + cost analytics
│   │   │   └── NotFoundPage.jsx          # 404 with navigation links
│   │   │
│   │   ├── components/
│   │   │   ├── KanbanBoard.jsx           # Drag-and-drop board
│   │   │   ├── CVViewer.jsx              # Split-panel CV reader
│   │   │   ├── CVCard.jsx                # Template selector + PDF preview
│   │   │   ├── GenerationProgress.jsx    # WebSocket progress UI
│   │   │   ├── DeleteButton.jsx          # Two-click confirm delete
│   │   │   ├── NotesEditor.jsx           # Auto-saving notes
│   │   │   ├── ErrorBoundary.jsx         # 4-level error recovery system
│   │   │   ├── DemoBanner.jsx            # Read-only demo mode indicator
│   │   │   ├── DashboardEmptyState.jsx   # Guided empty state for new users
│   │   │   ├── CVManagerEmptyState.jsx   # CV upload prompt for new users
│   │   │   └── skeletons/               # Loading skeleton components
│   │   │
│   │   ├── hooks/
│   │   │   ├── useApplications.js        # React Query hooks
│   │   │   ├── useGenerationProgress.js  # WebSocket hook
│   │   │   ├── usePdfAction.js           # PDF fetch/download
│   │   │   └── useDemoGuard.js           # Demo mode action blocking
│   │   │
│   │   └── utils/
│   │       ├── api.js            # Axios instance + interceptors
│   │       └── auth.js           # Token helpers
│   │
│   └── vercel.json               # SPA rewrite rules
│
├── extension/
│   ├── manifest.json             # Manifest V3
│   ├── content.js                # LinkedIn page injection
│   ├── background.js             # Service worker + API calls
│   └── popup/                    # Extension popup UI
│
└── scripts/
    └── generate_icons.py         # Icon generation utility
```

---

## Data model

```
User
├── id, email, password_hash, is_active, is_demo, created_at
├── base_cv_text, cv_links, preferences
└── → CVVersion[] (one-to-many)

CVVersion
├── id, user_id, name, cv_text, cv_json
├── template_id, is_default, created_at
└── → Application[] (one-to-many via cv_version_id)

Application
├── id, user_id, cv_version_id, cv_version_name
├── job_title, company_name, job_description, source_url
├── fit_score, keyword_gaps (JSON)
├── tailored_cv (Text), tailored_cv_json (JSON)
├── cover_letter, company_research (JSON)
├── tone_analysis (JSON), interview_prep (JSON)
├── status (draft/applied/interviewing/rejected/offer)
├── got_response, response_type, response_date
├── interview_date, interview_notes
├── notes, rewrite_cv, cover_letter_generated
└── last_generated_at, created_at

APIUsageLog
├── id, user_id, created_at
├── agent_name, model
├── input_tokens, output_tokens
├── cache_creation_tokens, cache_read_tokens
└── application_id (nullable FK)

AgentMemory
└── id, user_id, memory_type, content (JSON)
```

---

## API reference

Key endpoints — full docs at `https://api.loophire.xyz/docs`

```
POST   /api/auth/register           Register new user
POST   /api/auth/login              Login, returns JWT
GET    /api/auth/me                 Current user info
POST   /api/auth/demo               One-click demo login (no credentials)

POST   /api/cv/upload               Upload and parse CV PDF
GET    /api/cv                      Get stored CV text
GET    /api/cvs                     List all CV versions
PATCH  /api/cvs/{id}/template       Update CV template
GET    /api/cvs/{id}/preview-pdf    Stream PDF preview (inline)
GET    /api/cvs/{id}/download-pdf   Download CV as PDF

POST   /api/applications/generate   Start AI pipeline (async)
GET    /api/applications            List all applications
GET    /api/applications/{id}       Application detail
PATCH  /api/applications/{id}       Update CV/cover letter/notes
DELETE /api/applications/{id}       Delete an application
POST   /api/applications/{id}/regenerate  Re-run pipeline
GET    /api/applications/{id}/export/cv   Download tailored CV
GET    /api/applications/analytics  A/B response analytics
WS     /ws/progress/{job_id}        Real-time pipeline progress

POST   /api/jobs/search             Search Reed + Adzuna
POST   /api/jobs/import             Import job by ID
POST   /api/applications/scrape-job Import from LinkedIn URL

GET    /api/usage                   Usage analytics + cost data
```

---

## AI pipeline detail

Each application generation runs 6 sequential async agents:

```
Stage 1 — Tone agent          (claude-haiku)
  Input:  Job description
  Output: tone, vocabulary guidance, writing style

Stage 2 — Fit agent           (claude-sonnet)
  Input:  CV text + job description
  Output: fit_score (0-100), keyword_gaps, strengths

Stage 3 — Research agent      (claude-sonnet + Tavily)
  Input:  Company name
  Output: culture, tech stack, recent news, red flags

Stage 4 — Writer agent: CV    (claude-sonnet)
  Input:  CV + JD + fit analysis + tone + research
  Output: Structured JSON CV (tailored to the role)

Stage 5 — Writer agent: CL    (claude-sonnet)
  Input:  CV + JD + research + tone
  Output: 3-paragraph cover letter

Stage 6 — LaTeX export        (pdflatex)
  Input:  Structured JSON CV + template selection
  Output: PDF binary (compiled server-side)

Cost optimisation:
  - Prompt caching on system prompts + CV text → ~90% reduction
  - Two-tier model: Haiku for classification, Sonnet for generation
  - Optional stages: users can skip CV rewrite or cover letter
  - Generation mode selector: "Fit only" skips stages 4-6
```

---

## Local development setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15
- Redis (or Upstash account)
- pdflatex (`texlive-latex-extra` on Linux)
- API keys: Anthropic, Tavily, Reed, Adzuna

### 1. Clone and configure

```bash
git clone https://github.com/HamzaLatif02/loophire.git
cd loophire
cp .env.example .env
# Fill in your API keys in .env
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start the API server
uvicorn main:app --reload --port 8000
```

API available at `http://localhost:8000`  
Swagger docs at `http://localhost:8000/docs`

### 3. Frontend setup

```bash
cd frontend
npm install

# Set the API URL
echo "VITE_API_URL=http://localhost:8000" > .env.local

npm run dev
```

App available at `http://localhost:5173`

### 4. Chrome extension (optional)

```
1. Open Chrome → chrome://extensions
2. Enable Developer mode (top right)
3. Click "Load unpacked"
4. Select the /extension folder
```

### 5. Environment variables reference

```bash
# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost/loophire
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
ANTHROPIC_API_KEY=sk-ant-...
TAVILY_API_KEY=tvly-...
REED_API_KEY=...
ADZUNA_APP_ID=...
ADZUNA_APP_KEY=...
SECRET_KEY=<64-char random hex>
ACCESS_TOKEN_EXPIRE_DAYS=7
ENVIRONMENT=development

# Frontend (.env.local)
VITE_API_URL=http://localhost:8000
```

### 6. Run the end-to-end test suite

```bash
cd backend
python tests/e2e_test.py
# Runs 40 automated tests against the live API
# Covers: auth, CV upload, generation, PDF export,
#         analytics, job search, rate limiting, security
```

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Backend API | Railway | Auto-deploys on push to main |
| Frontend | Vercel | Auto-deploys on push to main |
| PostgreSQL | Railway | Managed, auto-provisioned |
| Redis | Upstash | Serverless, REST API |
| pdflatex | Railway Docker | Installed in Dockerfile |

```bash
# Deploy: just push to main
git push origin main

# Railway runs:
# alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT

# Vercel builds:
# cd frontend && npm run build
```

---

## Engineering decisions

**Why FastAPI over Django/Flask?**  
Async-native, automatic OpenAPI docs, Pydantic validation
built in. Critical for non-blocking WebSocket + background
task pipeline.

**Why LaTeX for PDF export over reportlab/WeasyPrint?**  
LaTeX produces the highest quality typographic output. The
user's original CV was a LaTeX document — matching it
exactly requires LaTeX, not a reimplementation. Four
templates cover the most common CV layouts.

**Why prompt caching?**  
The system prompt and CV text are identical across all
6 agent calls in a pipeline run. Caching them saves
~90% of input token costs on repeated content. Without
caching, a full pipeline run would cost ~$0.08; with
caching it costs ~$0.01.

**Why optional generation stages?**  
A fit check costs ~$0.003 (haiku + sonnet). A full
generation costs ~$0.01. For users evaluating many
jobs, optional stages reduce costs by up to 70% while
still surfacing the most valuable output (fit score).

**Why two-click delete?**  
Applications contain generated content and tracked
history. Accidental deletion has no undo. The two-click
pattern (arm then confirm, auto-reset after 3s) prevents
mistakes without the friction of a modal.

**Why React Query over Redux/Zustand?**  
The app's state is almost entirely server state. React
Query handles caching, background refetching, and
optimistic updates out of the box — no reducers needed.

---

## What I learnt building this

1. **Production debugging is the real job** — the start
   command, port mismatch, and CORS issues that blocked
   deployment were invisible locally and took systematic
   log reading to diagnose.

2. **Familiar stacks compound** — using FastAPI,
   PostgreSQL, and Railway (consistent with Roleprint
   and Finpipe) meant zero ramp-up time on infrastructure,
   freeing focus for the AI architecture.

3. **Specialised agents > one big prompt** — splitting
   the pipeline into tone, fit, research, and writing
   agents produced significantly better outputs than a
   single combined prompt, and made debugging each stage
   straightforward.

4. **Official APIs always beat scraping** — LinkedIn and
   Indeed block every scraping approach. Reed and Adzuna
   give full job descriptions via free official APIs
   with better data quality.

5. **Ship the MVP, then make it good** — the core
   CV-tailor-and-score loop shipped in phase 1. Every
   subsequent feature (Kanban, extension, templates,
   multi-CV) was validated against real use before being
   built.

6. **Ship the demo, not just the product** — an employer
   who has to register before seeing anything will not
   register. A one-click demo with realistic pre-populated
   data communicated the product's value in seconds. The
   hardest part was anonymising the seed data convincingly,
   not the technical implementation.

---

## Author

**Hamza Latif**  
First Class BSc Computer Science, City University of London  
MSc Data Science with Distinction, King's College London

[LinkedIn](https://www.linkedin.com/in/latif-hamza/) ·
[GitHub](https://github.com/HamzaLatif02) ·
[Website](https://hamzalatif.xyz) ·
[Loophire](https://loophire.xyz)

---

*Built solo as a portfolio project and genuine job
application tool. Every feature documented here is
deployed and working at loophire.xyz.*
