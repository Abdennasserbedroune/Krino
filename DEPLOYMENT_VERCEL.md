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

| Key | Value | Required |
|-----|-------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | **YES** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key` | **YES** |
| `GROQ_API_KEY` | `gsk_your_groq_key` | **YES** |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | **YES** |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | **YES** |

**Note**: The `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are found in your Supabase Dashboard → Project Settings → API.

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed Supabase configuration instructions.

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
