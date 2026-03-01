<div align="center">

# Pathwise

[𝙻𝚒𝚟𝚎 𝙰𝚙𝚙](https://pathwise-app.vercel.app) ✦ [𝙹𝚘𝚋 𝚂𝚎𝚎𝚔𝚎𝚛 𝙳𝚊𝚜𝚑𝚋𝚘𝚊𝚛𝚍](https://pathwise-app.vercel.app/dashboard) ✦ [𝚁𝚎𝚌𝚛𝚞𝚒𝚝𝚎𝚛 𝙳𝚊𝚜𝚑𝚋𝚘𝚊𝚛𝚍](https://pathwise-app.vercel.app/dashboard/recruiter) ✦ [𝙰𝙿𝙸 𝙳𝚘𝚌𝚜](#api-reference) ✦ [𝙶𝚎𝚝𝚝𝚒𝚗𝚐 𝚂𝚝𝚊𝚛𝚝𝚎𝚍](#getting-started) ✦ [𝙲𝚛𝚎𝚊𝚝𝚘𝚛](#creators-note)

AI-powered resume intelligence platform. Job seekers get instant ATS match scores and a personal AI career coach. Recruiters batch-screen up to 10 candidates in under 60 seconds.

</div>

<br>

<div align="center">

![GitHub stars](https://img.shields.io/github/stars/Abdennasserbedroune/Pathwise-main?labelColor=F0F0E8&style=for-the-badge&color=1d4ed8)
![License](https://img.shields.io/github/license/Abdennasserbedroune/Pathwise-main?labelColor=F0F0E8&style=for-the-badge&color=1d4ed8)
![GitHub forks](https://img.shields.io/github/forks/Abdennasserbedroune/Pathwise-main?labelColor=F0F0E8&style=for-the-badge&color=1d4ed8)
![Version](https://img.shields.io/badge/Version-1.0%20Atlas-FFF?labelColor=F0F0E8&style=for-the-badge&color=1d4ed8)

[![Live App](https://img.shields.io/badge/Live-pathwise--app.vercel.app-FFF?labelColor=F0F0E8&style=for-the-badge&color=1d4ed8)](https://pathwise-app.vercel.app)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-FFF?labelColor=F0F0E8&logo=vercel&logoColor=1d4ed8&style=for-the-badge&color=1d4ed8)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-FFF?labelColor=F0F0E8&logo=nextdotjs&logoColor=1d4ed8&style=for-the-badge&color=1d4ed8)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-FFF?labelColor=F0F0E8&logo=fastapi&logoColor=1d4ed8&style=for-the-badge&color=1d4ed8)](https://fastapi.tiangolo.com)

</div>

> [!IMPORTANT]
>
> Pathwise is in active development. Features are shipped continuously. If you find a bug or have a feature request, please [open an issue](https://github.com/Abdennasserbedroune/Pathwise-main/issues). Contributions, feedback, and stars are always welcome.

---

## How It Works

### For Job Seekers

1. **Sign up** and choose the Job Seeker role
2. **Upload** your PDF resume
3. **Paste** a job description you are targeting
4. **Review** your AI match score (0–10) and detailed gap analysis
5. **Chat** with the built-in AI career coach for targeted advice
6. **Re-upload** an improved version and watch your score climb in real time

### For Recruiters

1. **Sign up** and choose the Recruiter role
2. **Paste** your job description
3. **Upload** up to 10 candidate PDF resumes in one batch
4. **Review** a ranked table with AI verdicts — strongest candidates at the top
5. **Focus** only on the top matches and skip the manual screening pile

---

## Key Features

### Resume Match Scoring

The AI reads both the resume and job description then produces a contextual 0–10 match score. It understands skill relationships — not just keyword density.

- Detects missing critical skills with specific fix suggestions
- Highlights transferable experience across different role titles
- Updates instantly when you re-upload a revised resume

### AI Career Coach

An always-available chat assistant trained on your resume and target role. Ask it anything:

- *"How do I rewrite my experience section for a Senior PM role?"*
- *"What skills am I missing for this job description?"*
- *"Give me 5 strong bullet points for my last role."*

### Batch Recruiter Screening

Upload up to 10 PDF resumes at once against a single job description. The AI processes them in parallel and returns:

| Field | Description |
|-------|-------------|
| **Match Score** | 0–10 relevance to the job description |
| **AI Verdict** | One-sentence summary of fit and gaps |
| **Rank** | Automatic sorting — best candidates first |

### Privacy-First Processing

Resumes are analyzed by AI and **never stored as raw files**. Only extracted text summaries and scores are kept. Auto-delete can be toggled per session.

### Role-Based Access

| Role | Dashboard | Core Ability |
|------|-----------|---------------|
| **Job Seeker** | `/dashboard` | Resume analysis, AI coach chat, match scoring |
| **Recruiter** | `/dashboard/recruiter` | Batch upload, candidate ranking, AI verdicts |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS |
| **Backend** | FastAPI, Python 3.11+, SQLAlchemy, Celery |
| **Auth** | Supabase Auth (JWT + session management) |
| **Database** | Supabase (PostgreSQL) |
| **AI / LLM** | LLM integration via API (model-agnostic) |
| **Queue** | Redis + Celery workers |
| **Deployment** | Vercel (frontend) · Railway / Render (backend) |
| **Styling** | Tailwind CSS, Framer Motion, Lucide Icons |

---

## Getting Started

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| Python | 3.11+ | [python.org](https://python.org) |
| Poetry | 1.8+ | [python-poetry.org](https://python-poetry.org) |
| Docker | Latest | [docker.com](https://docker.com) *(optional)* |

### Environment Variables

Copy the provided templates before starting any service:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Key variables to fill in:

| Variable | Where | Description |
|----------|-------|-------------|
| `SUPABASE_URL` | `frontend/.env` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | `frontend/.env` | Supabase public anon key |
| `OPENAI_API_KEY` | `backend/.env` | LLM provider key |
| `DATABASE_URL` | `backend/.env` | PostgreSQL connection string |
| `REDIS_URL` | `backend/.env` | Redis connection string |

### Quick Start — Docker Compose

Fastest way to run the full stack (Postgres, Redis, API, Celery, Next.js):

```bash
# 1. Clone
git clone https://github.com/Abdennasserbedroune/Pathwise-main.git
cd Pathwise-main

# 2. Configure environment
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Boot everything
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Postgres | localhost:5432 |
| Redis | localhost:6379 |

### Quick Start — Without Docker

**Backend** (Terminal 1):

```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
```

**Celery Worker** (Terminal 2):

```bash
cd backend
poetry run celery -A app.core.celery_app.celery_app worker --loglevel=info
```

**Frontend** (Terminal 3):

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**, sign up, and pick your role.

---

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/               # FastAPI routers
│   │   ├── core/              # Settings, Celery config
│   │   ├── db/                # SQLAlchemy session helpers
│   │   └── tasks/             # Celery task modules
│   ├── docs/
│   │   └── backend/
│   │       ├── api-contract.md    # Full endpoint reference
│   │       └── error-handling.md  # Error taxonomy & retry guide
│   ├── Dockerfile
│   ├── pyproject.toml         # Poetry (Black + Ruff)
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── dashboard/         # Job seeker dashboard
│   │   │   └── recruiter/     # Recruiter dashboard
│   │   └── auth/              # Sign-in / sign-up flows
│   ├── components/
│   │   ├── ui/                # Shared UI components
│   │   └── auth/              # Auth forms
│   ├── providers/
│   │   └── AuthProvider.tsx   # Supabase auth context
│   ├── lib/
│   │   └── auth/              # Auth client helpers
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API Reference

Full documentation: [`backend/docs/backend/api-contract.md`](backend/docs/backend/api-contract.md)

### Core Endpoints

| Method | Endpoint | Rate Limit | Description |
|--------|----------|------------|-------------|
| `POST` | `/api/cv/upload` | 10 / hour | Upload a CV (PDF) |
| `GET` | `/api/cv/:cvId` | — | Retrieve CV details |
| `POST` | `/api/cv/:cvId/analyze` | 20 / hour | Run AI match analysis |
| `POST` | `/api/chat` | 30 / minute | AI career coach chat |
| `GET` | `/api/health` | — | Service health check |

All responses follow a standardized JSON envelope with proper HTTP status codes and `X-RateLimit-*` headers.

> [!NOTE]
>
> Full request/response schemas, error codes, and retry strategies are documented in [`backend/docs/backend/api-contract.md`](backend/docs/backend/api-contract.md) and [`backend/docs/backend/error-handling.md`](backend/docs/backend/error-handling.md).

---

## Deployment

### Frontend — Vercel

```bash
# Install CLI
npm i -g vercel

# Deploy preview
vercel --cwd frontend

# Deploy to production
vercel --cwd frontend --prod
```

Or connect via [Vercel Dashboard](https://vercel.com/new):

1. Import `Abdennasserbedroune/Pathwise-main`
2. Set **Root Directory** → `frontend`
3. Add all environment variables from `frontend/.env.example`
4. Deploy

### Backend — Supported Platforms

| Platform | Notes |
|----------|-------|
| **Railway** | Easiest — Dockerfile auto-detected |
| **Render** | Free tier available |
| **Fly.io** | Docker-based, good for global edge |
| **AWS / GCP / Azure** | Production scale |

> [!IMPORTANT]
>
> 🔒 **Never commit real API keys or secrets.** All `.env.example` files contain placeholder values only. Set real secrets as environment variables in your deployment platform. `.gitignore` is pre-configured to block accidental commits.

---

## Roadmap

- [ ] Resume PDF export with customizable templates
- [ ] Multi-language resume generation
- [ ] Visual keyword highlighting in the diff view
- [ ] n8n automation workflows for recruiter outreach
- [ ] Interview prep module (AI mock Q&A)
- [ ] Analytics dashboard for recruiters

Have a suggestion? [Open an issue](https://github.com/Abdennasserbedroune/Pathwise-main/issues) or start a [discussion](https://github.com/Abdennasserbedroune/Pathwise-main/discussions).

---

## Contributing

Contributions are welcome — whether you are a developer, designer, or just have a good idea.

1. Fork the repo
2. Create your feature branch: `git checkout -b feat/your-feature`
3. Commit with a clear message: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feat/your-feature`
5. Open a Pull Request

Please run linting before submitting:

```bash
# Backend
poetry run ruff check .
poetry run black .

# Frontend
npm run lint
npm run format
```

<a href="https://github.com/Abdennasserbedroune/Pathwise-main/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Abdennasserbedroune/Pathwise-main" />
</a>

---

## Creator's Note

Thank you for checking out Pathwise. I built this because I was tired of submitting resumes into a void — ATS black holes with zero feedback. Pathwise is the tool I wish I had.

Feel free to reach out, collaborate, or just say hi.

**Abdennasser Bedroune** ✨

- LinkedIn: [linkedin.com/in/abdennasser-bedroune](https://linkedin.com/in/abdennasser-bedroune)
- GitHub: [github.com/Abdennasserbedroune](https://github.com/Abdennasserbedroune)

---

<div align="center">

<details>
  <summary><kbd>Star History</kbd></summary>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=Abdennasserbedroune/Pathwise-main&theme=dark&type=Date">
    <img width="100%" src="https://api.star-history.com/svg?repos=Abdennasserbedroune/Pathwise-main&type=Date">
  </picture>
</details>

![Stars](https://img.shields.io/github/stars/Abdennasserbedroune/Pathwise-main?labelColor=F0F0E8&style=for-the-badge&color=1d4ed8)

*If Pathwise helped you land an interview, a ⭐ on GitHub means the world.*

</div>
