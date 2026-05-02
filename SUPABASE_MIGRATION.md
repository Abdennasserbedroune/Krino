# Supabase Security Migration

Run this SQL in your Supabase project → **SQL Editor**.

> ⚠️ Run each block separately in order. Do NOT skip any step.

---

## Step 1 — Add constraints to the `users` table

```sql
-- 1a. Only allow valid roles (blocks role injection from any client)
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('seeker', 'recruiter'));

-- 1b. Enforce unique (email, role) — same email can have two profiles
--     but NOT two seeker profiles or two recruiter profiles
ALTER TABLE public.users
  ADD CONSTRAINT users_email_role_unique
  UNIQUE (email, role);

-- 1c. Minimum password length is enforced in Auth settings, but also
--     make sure full_name and role are NOT NULL
ALTER TABLE public.users
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN email SET NOT NULL;
```

---

## Step 2 — Enable Row Level Security

```sql
-- CRITICAL: Without this, ANY authenticated user can read/write ALL rows
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

---

## Step 3 — Create RLS Policies

```sql
-- Users can only SELECT their own row
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can only INSERT their own row (id must match their auth UID)
CREATE POLICY "users_insert_own"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can only UPDATE their own row
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- NO delete policy — users cannot delete their own profile row
-- (use a server-side admin function for account deletion)
```

---

## Step 4 — Supabase Dashboard Settings

In your Supabase project dashboard:

### Authentication → Settings
- **Minimum password length**: `8`
- **Email confirmations**: `Enabled` (do NOT disable)
- **Secure email change**: `Enabled`
- **Secure password change**: `Enabled`

### Authentication → URL Configuration
- **Site URL**: `https://your-production-domain.com`
- **Redirect URLs** (add all of these exactly):
  ```
  https://your-production-domain.com/auth/callback
  http://localhost:3000/auth/callback
  ```
  > ⚠️ Do NOT add wildcards like `https://*.vercel.app` — this allows any
  > Vercel preview deployment to receive OAuth tokens, including PRs from
  > forks.

### Authentication → Providers → Google
1. Enable the Google provider
2. Add your **Google Client ID** and **Google Client Secret**
   (from Google Cloud Console → Credentials → OAuth 2.0 Client)
3. Copy the **Callback URL** shown in Supabase and add it to your
   Google Cloud Console → Authorized redirect URIs

---

## Step 5 — Vercel Environment Variables

In Vercel → Your Project → Settings → Environment Variables, add:

| Variable | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Production, Preview, Development |

> ⚠️ NEVER add `SUPABASE_SERVICE_ROLE_KEY` as `NEXT_PUBLIC_*`.
> The service role key bypasses ALL RLS — if it leaks, your entire DB is
> compromised. Only use it in server-only Route Handlers and store it as
> a non-public env var.

---

## What Each Layer Protects

| Layer | Protects Against |
|---|---|
| `CHECK (role IN (...))` | Role injection via direct API calls |
| `UNIQUE (email, role)` | Duplicate profile creation |
| RLS `USING (auth.uid() = id)` | Users reading other users' data |
| httpOnly `pending_oauth_role` cookie | XSS stealing OAuth role before callback |
| Server-side PKCE callback | CSRF on OAuth, open redirect attacks |
| Middleware role enforcement | Authenticated user accessing wrong dashboard |
| No localStorage role | XSS hijacking role to access wrong dashboard |
