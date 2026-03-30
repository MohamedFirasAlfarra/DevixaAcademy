-- 1. Create the batch_students table
CREATE TABLE IF NOT EXISTS public.batch_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(batch_id, student_id)
);

-- 2. Trigger to update current_students automatically
CREATE OR REPLACE FUNCTION public.update_batch_student_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.batches 
        SET current_students = COALESCE(current_students, 0) + 1 
        WHERE id = NEW.batch_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.batches 
        SET current_students = GREATEST(COALESCE(current_students, 1) - 1, 0)
        WHERE id = OLD.batch_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_batch_count ON public.batch_students;
CREATE TRIGGER tr_update_batch_count
AFTER INSERT OR DELETE ON public.batch_students
FOR EACH ROW EXECUTE FUNCTION public.update_batch_student_count();

-- 3. Enable RLS and add policies
ALTER TABLE public.batch_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage batch students" ON public.batch_students;
CREATE POLICY "Admins can manage batch students"
ON public.batch_students
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Allow students to view batch students if needed (e.g. for classmate list)
DROP POLICY IF EXISTS "Anyone can view batch students" ON public.batch_students;
CREATE POLICY "Anyone can view batch students"
ON public.batch_students
FOR SELECT
TO authenticated
USING (true);

-- 5. Reload the schema
NOTIFY pgrst, 'reload schema';
