-- CRITICAL SECURITY LOCKDOWN MIGRATION
-- This script prevents direct student enrollment and enforces the approval system.

-- 1. Ensure the enrollment_requests table exists (Renaming payments if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'payments' AND schemaname = 'public') THEN
        ALTER TABLE public.payments RENAME TO enrollment_requests;
    END IF;
END $$;

-- 2. Add Unique Constraint to Enrollments to prevent duplicates
-- First remove any duplicates if they exist (unlikely in this context, but safe)
DELETE FROM public.enrollments a USING public.enrollments b 
WHERE a.id < b.id AND a.user_id = b.user_id AND a.course_id = b.course_id;

ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_user_id_course_id_key;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_user_id_course_id_key UNIQUE (user_id, course_id);

-- 3. Lock down Enrollments Table RLS
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Students can ONLY view their own enrollments
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Enrolled students can view sessions" ON public.enrollments;
CREATE POLICY "Students can view own enrollments"
ON public.enrollments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- CRITICAL: Prevent ANY student from inserting directly into enrollments
DROP POLICY IF EXISTS "Users can insert own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can update own enrollments" ON public.enrollments;

-- Admin-only management policy
DROP POLICY IF EXISTS "Admins can manage all enrollments" ON public.enrollments;
CREATE POLICY "Admins can manage all enrollments"
ON public.enrollments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Update enrollment_requests RLS
ALTER TABLE public.enrollment_requests ENABLE ROW LEVEL SECURITY;

-- Students can view their own requests
DROP POLICY IF EXISTS "Users can view their own payments" ON public.enrollment_requests;
DROP POLICY IF EXISTS "Users can view their own enrollment_requests" ON public.enrollment_requests;
CREATE POLICY "Users can view their own enrollment_requests"
ON public.enrollment_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Students can insert their own requests in pending status
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.enrollment_requests;
DROP POLICY IF EXISTS "Users can insert their own enrollment_requests" ON public.enrollment_requests;
CREATE POLICY "Users can insert their own enrollment_requests"
ON public.enrollment_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Admins can update status
DROP POLICY IF EXISTS "Only admins can update payments" ON public.enrollment_requests;
DROP POLICY IF EXISTS "Admins can manage enrollment_requests" ON public.enrollment_requests;
CREATE POLICY "Admins can manage enrollment_requests"
ON public.enrollment_requests
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Force reload schema
NOTIFY pgrst, 'reload schema';
