-- =============================================================================
-- Pathwise Supabase Database Setup Script
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- =============================================================================

-- =============================================================================
-- 1. CREATE THE CVs TABLE
-- =============================================================================
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

-- =============================================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. CREATE RLS POLICIES FOR THE CVs TABLE
-- =============================================================================

-- Policy: Users can only SELECT their own CVs
CREATE POLICY "Users can select their own CVs"
    ON cvs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can only INSERT their own CVs
CREATE POLICY "Users can insert their own CVs"
    ON cvs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own CVs
CREATE POLICY "Users can update their own CVs"
    ON cvs
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only DELETE their own CVs
CREATE POLICY "Users can delete their own CVs"
    ON cvs
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================================================
-- 4. CREATE INDEXES FOR BETTER PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_cvs_created_at ON cvs(created_at DESC);

-- =============================================================================
-- 5. CREATE STORAGE BUCKET (Run this separately if needed)
-- Note: Buckets are usually created via the Storage UI, but here's the SQL:
-- =============================================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('cvs', 'cvs', false)
-- ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 6. STORAGE RLS POLICIES (Run after creating the bucket)
-- These policies ensure users can only access their own files
-- =============================================================================

-- Policy: Allow users to upload their own CVs
CREATE POLICY "Allow users to upload their own CVs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'cvs' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to download their own CVs
CREATE POLICY "Allow users to download their own CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'cvs' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to delete their own CVs
CREATE POLICY "Allow users to delete their own CVs"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'cvs' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to update their own CVs
CREATE POLICY "Allow users to update their own CVs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'cvs' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================================================
-- VERIFICATION QUERIES (Run these to verify setup)
-- =============================================================================

-- Check if table exists
-- SELECT * FROM information_schema.tables WHERE table_name = 'cvs';

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'cvs';

-- Check storage policies
-- SELECT * FROM pg_policies WHERE schemaname = 'storage';

-- =============================================================================
-- END OF SETUP SCRIPT
-- =============================================================================
