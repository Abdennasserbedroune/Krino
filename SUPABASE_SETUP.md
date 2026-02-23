# Supabase Setup Guide for Pathwise

This guide walks you through setting up Supabase for the Pathwise application to enable CV storage, authentication, and database functionality.

## Required Environment Variables

Add these to your Vercel project settings (Settings → Environment Variables):

| Variable | Description | How to Get |
|----------|-------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key for client-side | Supabase Dashboard → Project Settings → API |
| `GROQ_API_KEY` | API key for AI analysis | https://console.groq.com/keys |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js | Run: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your Vercel deployment URL | https://your-app.vercel.app |

## Database Setup

### 1. Create the CVs Table

Go to Supabase Dashboard → SQL Editor → New Query, and run:

```sql
-- Create the cvs table
CREATE TABLE IF NOT EXISTS cvs (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    extracted_cv JSONB DEFAULT '{}',
    analysis_result JSONB DEFAULT '{}',
    structured_data JSONB DEFAULT '{}',
    suggestions JSONB DEFAULT '{}',
    score INTEGER,
    analyzed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own CVs
CREATE POLICY "Users can only access their own CVs"
    ON cvs
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_cvs_user_id ON cvs(user_id);
```

### 2. Create Storage Bucket

Go to Supabase Dashboard → Storage → New Bucket:

1. **Bucket name**: `cvs`
2. **Public**: Keep it private (unchecked)
3. Click "Create bucket"

### 3. Set Up Storage RLS Policies

Go to Supabase Dashboard → Storage → Policies → cvs bucket:

Add these policies:

#### Select Policy (Download/View)
```
Name: Allow users to download their own CVs
Allowed operation: SELECT
Target: cvs
Definition: (storage.foldername(name))[1] = auth.uid()::text
```

#### Insert Policy (Upload)
```
Name: Allow users to upload their own CVs
Allowed operation: INSERT
Target: cvs
Definition: (storage.foldername(name))[1] = auth.uid()::text
```

#### Delete Policy
```
Name: Allow users to delete their own CVs
Allowed operation: DELETE
Target: cvs
Definition: (storage.foldername(name))[1] = auth.uid()::text
```

Or use SQL:

```sql
-- Storage policies for cvs bucket
CREATE POLICY "Allow users to upload their own CVs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cvs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow users to download their own CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'cvs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow users to delete their own CVs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cvs' AND (storage.foldername(name))[1] = auth.uid()::text);
```

## Authentication Setup

### Enable Email/Password Auth

Go to Supabase Dashboard → Authentication → Providers → Email:

1. Enable "Email" provider
2. Disable "Confirm email" (for easier testing) or configure email templates
3. Save settings

### Configure Site URL

Go to Supabase Dashboard → Authentication → URL Configuration:

1. **Site URL**: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
2. **Redirect URLs**: Add your Vercel deployment URL

## Testing the Setup

After deployment, test these features:

1. **Sign up** - Create a new account
2. **Upload a CV** - Try uploading a PDF or DOCX file
3. **View CVs** - Check if uploaded CVs appear in the list
4. **Delete CV** - Try deleting a CV
5. **Analyze CV** - Click "Analyze" on a CV

## Troubleshooting

### "Failed to upload file to storage" Error

- Check that the `cvs` bucket exists in Supabase Storage
- Verify storage RLS policies are correctly configured
- Check browser console for detailed error messages

### "Failed to save CV record" Error

- Verify the `cvs` table exists with correct columns
- Check database RLS policies
- Ensure user is authenticated

### "Unauthorized" Error

- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly
- Verify the user is logged in
- Check that the JWT token is being passed in request headers

### PDF Upload Fails

- Ensure file is under 5MB
- Check that file is a valid PDF
- Check Vercel function logs for detailed errors

## Security Notes

- Never commit your Supabase service role key to git
- The anon key is safe to use client-side (it's public)
- RLS policies ensure users can only access their own data
- Files are stored in user-specific folders: `{user_id}/{timestamp}_{filename}`
