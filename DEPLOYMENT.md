# Pathwise - Vercel Deployment Guide

This guide walks you through deploying the Pathwise frontend to Vercel. The backend (FastAPI) requires separate deployment to a platform that supports Python/Docker (Railway, Render, Fly.io, AWS, etc.).

## 🚨 Security First

**CRITICAL**: Never commit secrets, API keys, or credentials to version control. Always use environment variables.

- ✅ Use `.env.example` files with placeholder values
- ✅ Set real secrets in Vercel Dashboard → Project Settings → Environment Variables
- ❌ Never hardcode API keys in your code
- ❌ Never commit `.env` or `.env.local` files

## Architecture Overview

```
┌─────────────────┐
│  Vercel         │
│  (Frontend)     │ ← Next.js 14 App
│  Port: 443      │
└────────┬────────┘
         │
         │ API calls
         ↓
┌─────────────────┐
│  Backend Host   │
│  (FastAPI)      │ ← Python backend (deploy separately)
│  Port: 8000     │
└─────────────────┘
         │
         ↓
┌─────────────────┐
│  Database       │ ← PostgreSQL (Vercel Postgres, Supabase, Neon, etc.)
└─────────────────┘
```

## Prerequisites

- [Vercel Account](https://vercel.com/signup) (free tier available)
- [GitHub Account](https://github.com) (for connecting your repository)
- Deployed backend API with a public URL
- PostgreSQL database (can use Vercel Postgres, Supabase, or Neon)

## Step 1: Prepare Your Repository

Ensure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Deploy to Vercel

### Option A: Using Vercel Dashboard (Recommended for first deployment)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository (authorize Vercel if needed)
4. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend` *(IMPORTANT: Set this to the frontend folder)*
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

5. Click **"Deploy"** (initial deployment will use default environment variables)

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from the project root
vercel --cwd frontend

# For production deployment
vercel --cwd frontend --prod
```

## Step 3: Configure Environment Variables

After the initial deployment, add environment variables in the Vercel Dashboard:

1. Go to your project in Vercel
2. Click **Settings** → **Environment Variables**
3. Add the following variables for **Production**, **Preview**, and **Development** environments:

### Required Environment Variables

| Variable | Example Value | Description |
|----------|--------------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://your-backend.railway.app` | Your deployed backend API URL |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |
| `NEXTAUTH_SECRET` | `[Generated Secret]` | Generate with: `openssl rand -base64 32` |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | PostgreSQL connection string |

### Optional Environment Variables (if using these features)

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `EMAIL_SERVER_HOST` | SMTP server (e.g., SendGrid, Resend) |
| `EMAIL_SERVER_PORT` | SMTP port |
| `EMAIL_SERVER_USER` | SMTP username |
| `EMAIL_SERVER_PASSWORD` | SMTP password |
| `EMAIL_FROM` | From email address |

### Generate Secure Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Alternative: Use online generator
# Visit: https://generate-secret.vercel.app/32
```

## Step 4: Redeploy with Environment Variables

After adding environment variables:

1. Go to **Deployments** tab in Vercel Dashboard
2. Click the **⋯** menu on the latest deployment
3. Select **"Redeploy"** to trigger a new build with your environment variables

## Step 5: Set Up Database

### Option 1: Vercel Postgres (Recommended)

1. In your Vercel project, go to **Storage** tab
2. Click **"Create Database"** → **"Postgres"**
3. Vercel automatically adds `DATABASE_URL` environment variable
4. Run migrations (see Database Migrations section below)

### Option 2: External Database (Supabase, Neon, etc.)

1. Create a database on your chosen provider
2. Copy the connection string
3. Add it as `DATABASE_URL` in Vercel environment variables

## Step 6: Deploy Backend Separately

The FastAPI backend needs to be deployed to a platform that supports Python:

### Recommended Platforms:

- **Railway** ([railway.app](https://railway.app)) - Easy Python deployment
- **Render** ([render.com](https://render.com)) - Free tier available
- **Fly.io** ([fly.io](https://fly.io)) - Good for Docker deployments
- **AWS/GCP/Azure** - For production scale

### Backend Environment Variables

Ensure your backend has:

- `DATABASE_URL` - PostgreSQL connection string
- `GROQ_API_KEY` - Your Groq AI API key
- `CORS_ORIGIN` - Your Vercel frontend URL (e.g., `https://your-app.vercel.app`)
- `JWT_SECRET` - Secure random secret for authentication

## Step 7: Update CORS Configuration

In your backend, update CORS to allow your Vercel domain:

```python
# backend/app/main.py or similar
origins = [
    "http://localhost:3000",  # Local development
    "https://your-app.vercel.app",  # Production
    "https://*.vercel.app",  # Preview deployments
]
```

## Database Migrations

If using Prisma (frontend has @prisma/client):

```bash
# From frontend directory
npx prisma migrate deploy
```

For backend database setup, refer to `backend/README.md`.

## Verifying Your Deployment

### Check Environment Variables

```bash
# Using Vercel CLI
vercel env ls
```

### Check Build Logs

1. Go to **Deployments** tab
2. Click on the latest deployment
3. View **Build Logs** to troubleshoot issues

### Test Your Application

1. Visit your Vercel deployment URL
2. Check browser console for errors
3. Verify API calls to backend are working
4. Test authentication flow

## Common Issues & Troubleshooting

### Issue: "Module not found" errors

**Solution**: Ensure `frontend` is set as Root Directory in Vercel project settings

### Issue: API calls failing with CORS errors

**Solution**: 
1. Verify `NEXT_PUBLIC_API_BASE_URL` points to your deployed backend
2. Update backend CORS configuration to include your Vercel URL

### Issue: Environment variables not working

**Solution**: 
1. Ensure variables are set for the correct environment (Production/Preview/Development)
2. Redeploy after adding new environment variables
3. For client-side variables, ensure they start with `NEXT_PUBLIC_`

### Issue: Database connection errors

**Solution**:
1. Verify `DATABASE_URL` is correctly formatted
2. Check database allows connections from Vercel IPs
3. Ensure database is running and accessible

### Issue: "NEXTAUTH_SECRET" missing error

**Solution**: Generate a secure secret and add it to environment variables:
```bash
openssl rand -base64 32
```

## Continuous Deployment

Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

### Disable Auto-Deployment (Optional)

Go to **Settings** → **Git** → Disable automatic deployments for specific branches

## Custom Domain Setup

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. Update `NEXTAUTH_URL` environment variable to your custom domain

## Monitoring & Logs

- **Real-time Logs**: Vercel Dashboard → **Deployments** → Click deployment → **Runtime Logs**
- **Analytics**: Available in Vercel Dashboard → **Analytics** (Pro plan)
- **Error Tracking**: Consider integrating Sentry or similar

## Performance Optimization

- Enable **Edge Functions** for faster API routes (in next.config.mjs)
- Use Vercel's **Image Optimization** (already configured)
- Enable **Incremental Static Regeneration** for dynamic pages
- Monitor **Web Vitals** in Vercel Analytics

## Security Best Practices

✅ All secrets stored as environment variables
✅ Security headers configured in next.config.mjs
✅ HTTPS enforced by Vercel
✅ Regular dependency updates via `npm update`
✅ `.gitignore` prevents committing sensitive files

## Rollback Deployment

If something goes wrong:

1. Go to **Deployments** tab
2. Find a previous working deployment
3. Click **⋯** → **"Promote to Production"**

## Cost Considerations

Vercel Free Tier includes:
- 100 GB bandwidth per month
- Unlimited personal projects
- 6,000 Build Execution Minutes/month

For production apps with high traffic, consider Vercel Pro plan.

## Support & Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Vercel Discord Community](https://vercel.com/discord)

## Quick Reference Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel --cwd frontend

# Deploy to production
vercel --cwd frontend --prod

# View environment variables
vercel env ls

# Pull environment variables to local
vercel env pull

# View deployment logs
vercel logs [deployment-url]
```

---

**Last Updated**: 2025-08-19

For issues or questions, check the GitHub Issues page or Vercel support.
