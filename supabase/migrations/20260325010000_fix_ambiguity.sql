-- 1. CLEAN UP REDUNDANT FOREIGN KEYS ON enrollment_requests
-- The error "more than one relationship" happens because enrollment_requests(user_id) 
-- might have multiple FKs pointing to profiles or auth.users.

DO $$ 
DECLARE 
    fk_name TEXT;
BEGIN
    -- Find and drop ALL foreign keys on the column 'user_id' in 'enrollment_requests' table
    -- except the one we want to keep (enrollment_requests_user_id_fkey)
    FOR fk_name IN 
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_name = 'enrollment_requests' 
          AND column_name = 'user_id' 
          AND constraint_name != 'enrollment_requests_user_id_fkey'
    LOOP
        EXECUTE 'ALTER TABLE public.enrollment_requests DROP CONSTRAINT ' || quote_ident(fk_name);
    END LOOP;
END $$;

-- 2. ENSURE OUR DESIRED CONSTRAINT EXISTS AND POINTS TO profiles(user_id)
ALTER TABLE public.enrollment_requests
DROP CONSTRAINT IF EXISTS enrollment_requests_user_id_fkey;

ALTER TABLE public.enrollment_requests
ADD CONSTRAINT enrollment_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 3. NOTIFY SCHEMA RELOAD
NOTIFY pgrst, 'reload schema';
