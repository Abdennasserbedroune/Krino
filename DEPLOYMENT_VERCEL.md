# Vercel Deployment Guide for Pathwise Monorepo

To deploy this project successfully on Vercel:

### 1. Project Configuration in Vercel Dashboard
- **Root Directory**: Leave as `.` (root).
- **Framework Preset**: select `Next.js`.
- **Build Command**: `cd frontend && npm install && npm run build` (Should be auto-filled from `vercel.json`).
- **Output Directory**: `frontend/.next` (Should be auto-filled from `vercel.json`).
- **Install Command**: `cd frontend && npm install`.

### 2. Environment Variables
Add these variables in the Vercel Dashboard (**CRITICAL**):

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://postgres:YOUR_PASSWORD@your-db-host.supabase.co:5432/postgres` |
| `GROQ_API_KEY` | `YOUR_GROQ_API_KEY` |
| `NEXT_PUBLIC_API_BASE_URL` | (Leave empty or set to empty string if using same domain) |
| `SECRET_KEY` | `some_random_secret_string` |
| `JWT_SECRET` | `some_random_secret_string` |

### 3. Structural Changes made:
- Added a root `package.json` for monorepo awareness.
- Added a root `api/index.py` to serve as the FastAPI bridge for Vercel Serverless.
- Created a root `requirements.txt` with Vercel-friendly dependencies (no heavy OCR binaries).
- Updated `backend/app/core/config.py` to use `/tmp/uploads` for transient storage.
- Updated `backend/app/services/cv/parsing.py` to handle missing OCR libraries gracefully.

### 4. Why Vercel Free Tier?
- Vercel Free functions have a **10s timeout**. The CV analysis is fast enough, but if it takes longer, you might see "Task Timed Out".
- SQLite is not supported on Vercel; the project is now configured to use your **Supabase Postgres** automatically.
- OCR (scanned PDFs) is disabled on Vercel because it requires system-level binaries (Tesseract) not available on serverless. standard PDFs will work perfectly.
