-- Create the course_comments table
CREATE TABLE IF NOT EXISTS public.course_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.course_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view course comments" 
ON public.course_comments FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create course comments" 
ON public.course_comments FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
ON public.course_comments FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.course_comments FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Reload the PostgREST schema cache so the API recognizes the new table
NOTIFY pgrst, 'reload schema';
