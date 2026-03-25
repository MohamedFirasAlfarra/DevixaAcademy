-- MASTER INITIALIZATION FOR DEVIXA ACADEMY
-- PROJECT: lhognrxzhmqnjqgdvpzz

-- 1. SETUP ENUMS & TYPES
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('student', 'admin');
    END IF;
END $$;

-- 2. CREATE TABLES

-- Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    student_level TEXT,
    total_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'student',
    UNIQUE(user_id, role)
);

-- Courses
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    price NUMERIC DEFAULT 0,
    price_syp NUMERIC DEFAULT 0,
    total_hours NUMERIC DEFAULT 0,
    sessions_count INTEGER DEFAULT 0,
    points_required INTEGER DEFAULT 0,
    points_reward INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Batches
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE,
    max_students INTEGER DEFAULT 50,
    current_students INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    telegram_group_link TEXT,
    resources_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Course Sessions (Lessons)
CREATE TABLE IF NOT EXISTS public.course_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    session_date TIMESTAMP WITH TIME ZONE,
    duration_hours NUMERIC DEFAULT 1,
    session_type TEXT DEFAULT 'video',
    video_url TEXT,
    video_description TEXT,
    video_path TEXT,
    is_secure BOOLEAN DEFAULT true,
    telegram_file_id TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enrollments
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    payment_method TEXT DEFAULT 'cash',
    points_used INTEGER DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0
);

-- Lesson Completions
CREATE TABLE IF NOT EXISTS public.lesson_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.course_sessions(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT true,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, lesson_id)
);

-- Video Sessions (Security)
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

-- Quizzes
CREATE TABLE IF NOT EXISTS public.course_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID UNIQUE NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    time_limit INTEGER DEFAULT 30, -- minutes
    passing_score INTEGER DEFAULT 70,
    reward_points INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.course_quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES public.course_quizzes(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_type TEXT NOT NULL DEFAULT 'all', -- 'all', 'course', 'user'
    target_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.notification_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    email_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Others
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    discount_percentage INTEGER NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    max_students INTEGER,
    used_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.points_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    points INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'reward', 'usage', 'admin_adjustment'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.course_sessions(id) ON DELETE CASCADE,
    attended BOOLEAN DEFAULT true,
    hours_attended NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. FUNCTIONS & TRIGGERS

-- Function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.user_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = _user_id AND role = _role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Master progress automation
CREATE OR REPLACE FUNCTION public.update_course_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_lessons INTEGER;
    completed_lessons INTEGER;
    progress_val INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_lessons FROM public.course_sessions WHERE course_id = NEW.course_id;
    SELECT COUNT(*) INTO completed_lessons FROM public.lesson_completions WHERE user_id = NEW.user_id AND course_id = NEW.course_id;

    IF total_lessons > 0 THEN
        progress_val := (completed_lessons * 100) / total_lessons;
    ELSE
        progress_val := 0;
    END IF;

    UPDATE public.enrollments SET progress_percentage = progress_val
    WHERE user_id = NEW.user_id AND course_id = NEW.course_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_progress ON public.lesson_completions;
CREATE TRIGGER trigger_update_progress
AFTER INSERT OR UPDATE ON public.lesson_completions
FOR EACH ROW EXECUTE FUNCTION public.update_course_progress();

-- 4. STORAGE SETUP (FINAL)
-- Ensure buckets exist
INSERT INTO storage.buckets (id, name, public) VALUES ('course-videos', 'course-videos', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('courses', 'courses', true) ON CONFLICT (id) DO NOTHING;

-- storage.objects Policies
DROP POLICY IF EXISTS "Admins can manage course videos" ON storage.objects;
CREATE POLICY "Admins can manage course videos" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'admin')) WITH CHECK (bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Enrolled students can access course videos" ON storage.objects;
CREATE POLICY "Enrolled students can access course videos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'course-videos' AND (EXISTS (SELECT 1 FROM public.course_sessions cs JOIN public.enrollments e ON cs.course_id = e.course_id WHERE cs.video_path = storage.objects.name AND e.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Public can view course images" ON storage.objects;
CREATE POLICY "Public can view course images" ON storage.objects FOR SELECT USING (bucket_id = 'courses');

DROP POLICY IF EXISTS "Admins can manage course images" ON storage.objects;
CREATE POLICY "Admins can manage course images" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'courses' AND public.has_role(auth.uid(), 'admin')) WITH CHECK (bucket_id = 'courses' AND public.has_role(auth.uid(), 'admin'));

-- 5. ENABLE RLS ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

-- 6. DETAILED POLICIES
-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- course_sessions (Essential Fix for 403)
DROP POLICY IF EXISTS "Enrolled students can view sessions" ON public.course_sessions;
CREATE POLICY "Enrolled students can view sessions" ON public.course_sessions FOR SELECT USING (EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = course_sessions.course_id AND e.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage sessions" ON public.course_sessions;
CREATE POLICY "Admins can manage sessions" ON public.course_sessions FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- courses
DROP POLICY IF EXISTS "Courses are viewable by everyone" ON public.courses;
CREATE POLICY "Courses are viewable by everyone" ON public.courses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. INITIAL ADMIN SETUP (RUN THIS AFTER CREATING YOUR USER)
-- INSERT INTO public.user_roles (user_id, role) VALUES ('<YOUR_USER_ID>', 'admin');
