-- 1. Schema Update: Add Telegram and Ordering support
ALTER TABLE public.course_sessions 
ADD COLUMN IF NOT EXISTS telegram_file_id TEXT,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- 2. Progress Automation: Auto-calculate enrollment progress
CREATE TABLE IF NOT EXISTS public.lesson_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.course_sessions(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, lesson_id)
);

-- Function to update enrollment progress percentage
CREATE OR REPLACE FUNCTION public.update_course_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_lessons INTEGER;
    completed_lessons INTEGER;
    progress_val INTEGER;
BEGIN
    -- Get total lessons for this course
    SELECT COUNT(*) INTO total_lessons 
    FROM public.course_sessions 
    WHERE course_id = NEW.course_id;

    -- Get completed lessons for this user and course
    SELECT COUNT(*) INTO completed_lessons 
    FROM public.lesson_completions 
    WHERE user_id = NEW.user_id AND course_id = NEW.course_id;

    -- Calculate percentage
    IF total_lessons > 0 THEN
        progress_val := (completed_lessons * 100) / total_lessons;
    ELSE
        progress_val := 0;
    END IF;

    -- Update or insert enrollment progress
    UPDATE public.enrollments 
    SET progress_percentage = progress_val
    WHERE user_id = NEW.user_id AND course_id = NEW.course_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after completion
DROP TRIGGER IF EXISTS trigger_update_progress ON public.lesson_completions;
CREATE TRIGGER trigger_update_progress
AFTER INSERT OR UPDATE ON public.lesson_completions
FOR EACH ROW EXECUTE FUNCTION public.update_course_progress();
