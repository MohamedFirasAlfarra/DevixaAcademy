-- Add telegram_token to course_sessions if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' 
                   AND table_name='course_sessions' 
                   AND column_name='telegram_token') THEN
        ALTER TABLE public.course_sessions ADD COLUMN telegram_token TEXT;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
