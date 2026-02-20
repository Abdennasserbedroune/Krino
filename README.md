# Pathwise

Pathwise is a full-stack starter kit for building an AI-assisted résumé intelligence platform. The
stack combines a Next.js 14 frontend, a FastAPI backend powered by Poetry, and background
workloads handled by Celery workers. Docker Compose keeps local development ergonomic by wiring up
Postgres and Redis alongside the application services.

## Tech stack

```
frontend/  →  Next.js 14 · TypeScript · TailwindCSS · ESLint · Prettier
backend/   →  FastAPI · SQLAlchemy · Celery · spaCy · transformers · Ruff · Black
ops/       →  Docker Compose · Postgres 15 · Redis 7
```

## Getting started

### Prerequisites

- **Node.js 20** and **npm 10** (or run everything with Docker Compose)
- **Python 3.11** with [Poetry](https://python-poetry.org/) 1.8+
- Docker Desktop or Docker Engine if you plan to use the containerised workflow

### Environment variables

Shared templates are provided—duplicate them before booting any services:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Feel free to adjust ports, database credentials, or API hosts for your environment. The backend and
Celery services read from `backend/.env`, while the frontend picks up values from `frontend/.env`.

### Local development with Docker Compose

The quickest way to spin up the entire stack is with Docker Compose. This brings up Postgres, Redis,
the FastAPI app, Celery worker/beat, and the Next.js dev server.

```bash
docker compose up --build
```

- API: http://localhost:8000 (FastAPI docs available at `/docs`)
- Frontend: http://localhost:3000
- Postgres: localhost:5432 (credentials in `.env`)
- Redis: localhost:6379

Stop the stack with `docker compose down`. Add `-v` to prune the Postgres volume if you need a clean
slate.

### Working on the backend without Docker

```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
```

This installs dependencies (FastAPI, SQLAlchemy, spaCy, Celery, pdfplumber, python-docx, transformers,
and more) and launches the API with auto-reload on code changes.

Run the Celery worker locally in a separate terminal once Redis is available:

```bash
poetry run celery -A app.core.celery_app.celery_app worker --loglevel=info
```

Formatting and linting helpers:

- `poetry run ruff check .`
- `poetry run black .`

### Working on the frontend without Docker

```bash
cd frontend
npm install
npm run dev
```

Useful scripts:

- `npm run lint` – ESLint (Next.js core web vitals rules)
- `npm run format` – Prettier check
- `npm run format:fix` – Prettier write

The TailwindCSS config scans the `app/` and `components/` directories, so new UI files inherit the
shared design tokens automatically.

## Project structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/               # FastAPI routers (health check included)
│   │   ├── core/              # Settings, Celery wiring
│   │   ├── db/                # SQLAlchemy session helpers
│   │   └── tasks/             # Celery task modules
│   ├── Dockerfile
│   ├── README.md
│   ├── pyproject.toml         # Poetry configuration (Black + Ruff)
│   └── .env.example
├── frontend/
│   ├── app/                   # Next.js App Router entrypoints & layout
│   ├── components/
│   ├── Dockerfile
│   ├── package.json           # ESLint + Prettier scripts
│   └── .env.example
├── docker-compose.yml         # Postgres, Redis, API, Celery, and Next.js services
├── .env.example               # Shared environment template for containers
└── README.md
```

## API Documentation

Comprehensive API documentation is available in the `backend/docs/backend/` directory:

- **[API Contract Specification](backend/docs/backend/api-contract.md)** - Complete endpoint reference with request/response schemas, rate limits, and examples
- **[Error Handling Guide](backend/docs/backend/error-handling.md)** - Error taxonomy, retry strategies, and logging best practices

Quick API reference:
- `POST /api/cv/upload` - Upload CV (10 uploads/hour)
- `GET /api/cv/:cvId` - Retrieve CV details
- `POST /api/cv/:cvId/analyze` - Run AI analysis (20/hour)
- `POST /api/chat` - Interactive CV improvement chat (30/minute)
- `GET /api/health` - Health check endpoint

All endpoints return standardized JSON responses with proper error codes and rate limit headers.

## Deployment

### Vercel Deployment (Frontend)

The frontend is configured for seamless deployment to Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel --cwd frontend

# Deploy to production
vercel --cwd frontend --prod
```

**Quick Setup:**
1. Push your code to GitHub
2. Import repository in [Vercel Dashboard](https://vercel.com/new)
3. Set **Root Directory** to `frontend`
4. Add environment variables (see `frontend/.env.example`)
5. Deploy

📖 **See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions**, including:
- Environment variable configuration
- Database setup (Vercel Postgres, Supabase, Neon)
- Backend deployment options (Railway, Render, Fly.io)
- CORS configuration
- Security best practices
- Troubleshooting guide

### Backend Deployment

The FastAPI backend requires a Python-compatible platform:
- **Railway** - Easiest Python deployment
- **Render** - Free tier available
- **Fly.io** - Docker-based deployment
- **AWS/GCP/Azure** - Production scale

Refer to `backend/README.md` for backend-specific deployment instructions.

## Security

🚨 **CRITICAL**: Never commit secrets or API keys to version control.

- All `.env.example` files contain **placeholder values only**
- Real secrets must be set as environment variables in your deployment platform
- `.gitignore` is configured to prevent accidental commits of sensitive files
- Security headers are enabled in `frontend/next.config.mjs`

## Next steps

- Model résumé ingestion pipelines with spaCy, transformers, pdfplumber, and python-docx.
- Wire SQLAlchemy models to persist analysis history in Postgres.
- Extend the frontend with authenticated dashboards that consume the FastAPI endpoints.
- Configure CI to run formatters (`ruff`, `black`, `eslint`, `prettier`) and test suites automatically.
