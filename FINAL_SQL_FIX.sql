-- Run this in your Supabase SQL Editor to fix the 400 Bad Request error

-- 1. Ensure the telegram_token column exists
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS telegram_token TEXT;

-- 2. Ensure all other columns from the latest design exist
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS telegram_file_id TEXT;
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS video_path TEXT;
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 3. Verify RLS (optional but recommended)
-- Enable RLS on course_sessions if not already enabled
ALTER TABLE course_sessions ENABLE ROW LEVEL SECURITY;

-- Allow admins full access
DROP POLICY IF EXISTS "Admins have full access to course_sessions" ON course_sessions;
CREATE POLICY "Admins have full access to course_sessions" ON course_sessions
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow students to read sessions of courses they are enrolled in
DROP POLICY IF EXISTS "Enrolled students can read course_sessions" ON course_sessions;
CREATE POLICY "Enrolled students can read course_sessions" ON course_sessions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM enrollments 
            WHERE enrollments.user_id = auth.uid() 
            AND enrollments.course_id = course_sessions.course_id
        )
        OR
        public.has_role(auth.uid(), 'admin')
    );
