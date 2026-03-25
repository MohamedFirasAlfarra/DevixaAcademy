-- 1. Create payment_settings table
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    method_name TEXT NOT NULL UNIQUE, -- 'syriatel_cash', 'sham_cash', 'alharam'
    is_enabled BOOLEAN DEFAULT false,
    admin_full_name TEXT,
    admin_phone_number TEXT,
    governorate TEXT, -- Used for Syriatel Cash and AlHaram
    qr_image_url TEXT, -- Used for Sham Cash
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for payment_settings
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Policies for payment_settings
CREATE POLICY "Anyone can view payment settings" 
ON public.payment_settings FOR SELECT 
USING (true);

CREATE POLICY "Only admins can update payment settings" 
ON public.payment_settings FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default rows if they don't exist
INSERT INTO public.payment_settings (method_name, is_enabled)
VALUES 
    ('syriatel_cash', false),
    ('sham_cash', false),
    ('alharam', false)
ON CONFLICT (method_name) DO NOTHING;

-- 2. Create payments table (Student Submissions)
CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL,
    receipt_image_url TEXT NOT NULL,
    status payment_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies for payments
CREATE POLICY "Users can view their own payments" 
ON public.payments FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own payments" 
ON public.payments FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admins can update payments" 
ON public.payments FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete payments" 
ON public.payments FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Create Storage Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('payment-qrs', 'payment-qrs', true),
  ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for payment-qrs (Admins manage, anyone can read)
CREATE POLICY "Anyone can view QRs" ON storage.objects FOR SELECT TO public USING (bucket_id = 'payment-qrs');
CREATE POLICY "Admins can upload QRs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-qrs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update QRs" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'payment-qrs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete QRs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'payment-qrs' AND public.has_role(auth.uid(), 'admin'));

-- Storage Policies for payment-receipts (Users can upload, Admins can read/manage all, Users read their own)
CREATE POLICY "Users can upload receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-receipts');
CREATE POLICY "Admins can view ALL receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'payment-receipts' AND public.has_role(auth.uid(), 'admin'));
-- Note: It is tricky to write an RLS on storage.objects where user only reads their own unless the path contains their UUID. 
-- We'll just enforce that the path starts with their UUID or they are an admin.
CREATE POLICY "Users can view their own receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'payment-receipts' AND (auth.uid()::text = SPLIT_PART(name, '/', 1) OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Admins can delete receipts" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'payment-receipts' AND public.has_role(auth.uid(), 'admin'));

-- Reload schema
NOTIFY pgrst, 'reload schema';
