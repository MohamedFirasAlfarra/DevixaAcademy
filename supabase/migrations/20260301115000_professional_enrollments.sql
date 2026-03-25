-- Rename payments table to enrollment_requests to match the new spec
ALTER TABLE IF EXISTS public.payments RENAME TO enrollment_requests;

-- Drop old policies if they exist to recreate them with new names
DROP POLICY IF EXISTS "Users can view own payments" ON public.enrollment_requests;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.enrollment_requests;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.enrollment_requests;
DROP POLICY IF EXISTS "Admins can update payments" ON public.enrollment_requests;
DROP POLICY IF EXISTS "Admins can delete payments" ON public.enrollment_requests;

-- Recreate policies with proper naming conventions
CREATE POLICY "Users can view own enrollment_requests" ON public.enrollment_requests
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own enrollment_requests" ON public.enrollment_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all enrollment_requests" ON public.enrollment_requests
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update enrollment_requests" ON public.enrollment_requests
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete enrollment_requests" ON public.enrollment_requests
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Add UNIQUE constraint to enrollments to prevent duplicate enrollment
ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS unique_user_course;
ALTER TABLE public.enrollments ADD CONSTRAINT unique_user_course UNIQUE (user_id, course_id);
