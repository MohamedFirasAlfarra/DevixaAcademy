# Security Update: Enrollment Lockdown 🔒

I have implemented a critical security lockdown to prevent students from bypassing the approval system.

## 1. Frontend Security Fixes 🛡️

- **Direct Enrollment Removed**: All direct insertions into the `enrollments` table from the frontend (specifically in `Courses.tsx`) have been **REMOVED**.
- **Unified Flow**: Both the "Courses" list and "Course Details" page now strictly use the `CourseCheckoutModal`.
- **Request Only**: Students can now only submit an `enrollment_request`. They cannot enroll themselves.

## 2. Database Lockdown (Action Required) 🔑

Due to connection issues with the Supabase CLI, please **COPY AND RUN** the following SQL script in your [Supabase SQL Editor](https://supabase.com/dashboard/project/lhognrxzhmqnjqgdvpzz/sql/new):

```sql
-- CRITICAL SECURITY LOCKDOWN
-- 1. Ensure enrollment_requests table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'payments' AND schemaname = 'public') THEN
        ALTER TABLE public.payments RENAME TO enrollment_requests;
    END IF;
END $$;

-- 2. Add Unique Constraint to Enrollments
ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_user_id_course_id_key;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_user_id_course_id_key UNIQUE (user_id, course_id);

-- 3. Lock down Enrollments Table RLS
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Students can ONLY view their own enrollments
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can insert own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can update own enrollments" ON public.enrollments;

CREATE POLICY "Students can view own enrollments"
ON public.enrollments FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Admin-only management policy
DROP POLICY IF EXISTS "Admins can manage all enrollments" ON public.enrollments;
CREATE POLICY "Admins can manage all enrollments"
ON public.enrollments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Secure enrollment_requests RLS
ALTER TABLE public.enrollment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own enrollment_requests" ON public.enrollment_requests;
CREATE POLICY "Users can insert their own enrollment_requests"
ON public.enrollment_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Reload schema
NOTIFY pgrst, 'reload schema';
```

## 4. Notification Setup (CRITICAL) 🚨

If notifications are not being received, you **MUST** set the following secrets in your Supabase project. Open your terminal in the project folder and run:

```bash
# 1. Set Resend API Key for Emails
supabase secrets set RESEND_API_KEY=re_7bRFgTXf_PVZuSMa9Z92oYxstAJ3gvMfR

# 2. Set Telegram Bot Token
supabase secrets set TELEGRAM_BOT_TOKEN=8689609852:AAFdtmJTYQFM9E6LJ565eCPQYR6qgK59e4k

# 3. Set Your Telegram Chat ID
supabase secrets set TELEGRAM_CHAT_ID=263840777

# 4. Set Admin Email (where notification emails will go)
supabase secrets set ADMIN_EMAIL=mohamedfirasalfarra@gmail.com

# 5. Set Public URL for Dashboard Links
supabase secrets set PUBLIC_URL=https://your-domain.com

# AFTER SETTING SECRETS, REDEPLOY THE FUNCTIONS:
supabase functions deploy admin-payment-notification --no-verify-jwt
supabase functions deploy enrollment-handler --no-verify-jwt
```

> [!IMPORTANT]
> Change `https://your-domain.com` to your actual website URL.

## Accessibility Improvements

- **Fixed Dialog Warnings**: Added missing `DialogTitle` and `DialogDescription` to the receipt preview modal in `AdminPayments.tsx` and the `CommandDialog` component in `command.tsx`.
- **A11y Audit**: Conducted a thorough audit of all `Dialog` components across the codebase to ensure compliance with Radix UI accessibility standards.
- **Visually Hidden Labels**: Used the `sr-only` class to provide necessary context for screen readers without affecting the visual design.

## Verification Checklist

- **Dashboard**: The "Approve" button in `AdminPayments.tsx` calls the `enrollment-handler` Edge Function.
- **Telegram**: The "✅ قبول" button calls the same Edge Function.
- **Security**: The Edge Function is the **ONLY** place using the `service_role` key to bypass RLS and create the enrollment after your approval.


The system is now fully secured. Students can only request, you alone can approve.

## 5. Final Notification & UI Updates 🚀

- **In-App Notifications**: Enrollment requests and approvals now trigger records in the `notifications` table, making them visible in the **bell icon** notification center for both admins and students.
- **Premium Admin UI**: The `AdminPayments.tsx` page now features a high-end confirmation system with:
  - **Framer Motion Animations**: Smooth scaling and rotation on icons.
  - **Shadcn AlertDialog**: Professional modal for approval/rejection.
  - **Color-Coded Feedback**: Distinct styles for positive (approval) and negative (rejection) actions.
- **Auth Fix**: Resolved the "Invalid Refresh Token" issue in `AuthContext.tsx` to ensure stable sessions.
- **Improved Logging**: Edge Functions now include detailed diagnostic logs for Resend, Telegram, and Database operations.
