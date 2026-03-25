-- FUNCTION TO CALCULATE AND UPDATE COURSE PROGRESS
CREATE OR REPLACE FUNCTION public.update_course_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_lessons INTEGER;
    completed_lessons INTEGER;
    new_progress INTEGER;
BEGIN
    -- 1. Get total lessons for the course
    SELECT COUNT(*) INTO total_lessons
    FROM public.course_sessions
    WHERE course_id = NEW.course_id;

    -- 2. Get completed lessons for this user and course
    SELECT COUNT(*) INTO completed_lessons
    FROM public.lesson_completions
    WHERE user_id = NEW.user_id 
    AND course_id = NEW.course_id;

    -- 3. Calculate percentage (avoid division by zero)
    IF total_lessons > 0 THEN
        new_progress := (completed_lessons * 100) / total_lessons;
    ELSE
        new_progress := 0;
    END IF;

    -- 4. Update the enrollments table
    UPDATE public.enrollments
    SET progress_percentage = new_progress
    WHERE user_id = NEW.user_id 
    AND course_id = NEW.course_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER ON LESSON COMPLETIONS
DROP TRIGGER IF EXISTS trigger_update_progress ON public.lesson_completions;
CREATE TRIGGER trigger_update_progress
AFTER INSERT OR UPDATE OR DELETE ON public.lesson_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_course_progress();
