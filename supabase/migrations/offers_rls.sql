-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- 1. Anyone can view offers (to see them on the landing page/courses page)
DROP POLICY IF EXISTS "Offers are viewable by everyone" ON public.offers;
CREATE POLICY "Offers are viewable by everyone" 
ON public.offers FOR SELECT 
USING (true);

-- 2. Admins can manage everything
DROP POLICY IF EXISTS "Admins can manage offers" ON public.offers;
CREATE POLICY "Admins can manage offers" 
ON public.offers FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Also ensuring other related tables have at least basic Admin access if missing
-- course_quizzes
ALTER TABLE public.course_quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Quizzes are viewable by everyone" ON public.course_quizzes;
CREATE POLICY "Quizzes are viewable by everyone" ON public.course_quizzes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage quizzes" ON public.course_quizzes;
CREATE POLICY "Admins can manage quizzes" ON public.course_quizzes FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance;
CREATE POLICY "Users can view own attendance" ON public.attendance FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage attendance" ON public.attendance;
CREATE POLICY "Admins can manage attendance" ON public.attendance FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
