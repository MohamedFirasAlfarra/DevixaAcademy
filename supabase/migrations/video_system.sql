-- 1. EXTEND COURSE SESSIONS
ALTER TABLE public.course_sessions 
ADD COLUMN IF NOT EXISTS video_path TEXT,
ADD COLUMN IF NOT EXISTS is_secure BOOLEAN DEFAULT true;

-- 2. PROGRESS TRACKING TABLE
CREATE TABLE IF NOT EXISTS public.lesson_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.course_sessions(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT true,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Progress Tracking
DROP POLICY IF EXISTS "Users can view own completions" ON public.lesson_completions;
CREATE POLICY "Users can view own completions" 
ON public.lesson_completions FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own completions" ON public.lesson_completions;
CREATE POLICY "Users can manage own completions" 
ON public.lesson_completions FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. STORAGE SETUP
-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-videos', 'course-videos', false)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to manage all video objects
DROP POLICY IF EXISTS "Admins can manage course videos" ON storage.objects;
CREATE POLICY "Admins can manage course videos"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'course-videos' 
    AND (SELECT public.has_role(auth.uid(), 'admin'))
)
WITH CHECK (
    bucket_id = 'course-videos' 
    AND (SELECT public.has_role(auth.uid(), 'admin'))
);

-- Allow enrolled students to read video objects via signed URLs
DROP POLICY IF EXISTS "Enrolled students can access course videos" ON storage.objects;
CREATE POLICY "Enrolled students can access course videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'course-videos' 
    AND (
        EXISTS (
            SELECT 1 FROM public.course_sessions cs
            JOIN public.enrollments e ON cs.course_id = e.course_id
            WHERE cs.video_path = storage.objects.name
            AND e.user_id = auth.uid()
        )
        OR (SELECT public.has_role(auth.uid(), 'admin'))
    )
);
