-- Add telegram_file_id to course_sessions
ALTER TABLE public.course_sessions 
ADD COLUMN IF NOT EXISTS telegram_file_id TEXT;
