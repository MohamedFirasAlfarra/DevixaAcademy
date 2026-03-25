-- Add course_id and order_index to course_sessions
ALTER TABLE public.course_sessions 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ALTER COLUMN batch_id DROP NOT NULL;

-- Optional: Link existing sessions to courses via their batches if course_id is null
UPDATE public.course_sessions cs
SET course_id = b.course_id
FROM public.batches b
WHERE cs.batch_id = b.id AND cs.course_id IS NULL;

-- Ensure RLS policies are updated for course-level access
-- Users can view sessions if they are enrolled in the course associated with the session
DROP POLICY IF EXISTS "Enrolled students can view sessions" ON public.course_sessions;

CREATE POLICY "Enrolled students can view sessions" ON public.course_sessions 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e 
    WHERE e.course_id = course_sessions.course_id 
    AND e.user_id = auth.uid()
  ) 
  OR public.has_role(auth.uid(), 'admin')
);

-- Admin can manage all sessions
DROP POLICY IF EXISTS "Admins can manage sessions" ON public.course_sessions;
CREATE POLICY "Admins can manage sessions" ON public.course_sessions 
FOR ALL USING (public.has_role(auth.uid(), 'admin'));
