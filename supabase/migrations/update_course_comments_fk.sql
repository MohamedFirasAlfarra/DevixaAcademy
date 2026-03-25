-- 1. Ensure public.profiles(user_id) is UNIQUE so it can be referenced
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- 2. Drop the old foreign key that points only to auth.users
ALTER TABLE public.course_comments 
DROP CONSTRAINT IF EXISTS course_comments_user_id_fkey;

-- 3. Add the new foreign key that points to public.profiles(user_id)
ALTER TABLE public.course_comments
ADD CONSTRAINT course_comments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 4. Reload the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
