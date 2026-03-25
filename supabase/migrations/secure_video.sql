-- 1. Create table to track active video sessions
CREATE TABLE IF NOT EXISTS public.video_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.course_sessions(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can view own video sessions" 
ON public.video_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own video sessions" 
ON public.video_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own video sessions" 
ON public.video_sessions FOR UPDATE 
USING (auth.uid() = user_id);

-- 4. Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_video_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.video_sessions WHERE expires_at < now();
END;
$$;
