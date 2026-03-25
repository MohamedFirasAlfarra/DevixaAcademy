import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("Supabase internal env variables are missing!")
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        const body = await req.json()
        console.log('--- [START] Received Payload ---');
        console.log(JSON.stringify(body, null, 2));

        // 1. Handle Telegram Callback Query
        if (body.callback_query) {
            const { data, message } = body.callback_query
            const chatId = message.chat.id

            console.log(`TELEGRAM: Callback from chat ${chatId}`);
            if (String(chatId) !== String(ADMIN_CHAT_ID)) {
                console.warn("TELEGRAM: Unauthorized chat ID attempt.");
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
            }

            const [action, requestId] = data.split(':')
            console.log(`TELEGRAM: Action: ${action}, RequestID: ${requestId}`);
            return await handleEnrollmentAction(supabase, action, requestId, message.message_id)
        }

        // 2. Handle Direct API Call (from Admin Panel)
        const { action, requestId } = body
        if (action && requestId) {
            console.log(`API: Direct action: ${action}, RequestID: ${requestId}`);
            return await handleEnrollmentAction(supabase, action, requestId)
        }

        console.error("UNKNOWN: Invalid request payload.");
        return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 })

    } catch (error: any) {
        console.error('GLOBAL ERROR:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

async function handleEnrollmentAction(supabase: any, action: string, requestId: string, telegramMessageId: number | null = null) {
    const status = action === 'approve' ? 'approved' : 'rejected'
    console.log(`ACTION: Processing ${status} for request ${requestId}`);

    // 1. Get request details
    const { data: request, error: fetchError } = await supabase
        .from('enrollment_requests')
        .select('*, courses(title)')
        .eq('id', requestId)
        .single()

    if (fetchError || !request) {
        console.error("DB: Request not found or error:", fetchError);
        return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404, headers: corsHeaders })
    }

    if (request.status !== 'pending') {
        console.warn(`ACTION: Request ${requestId} already processed (status: ${request.status})`);
        return new Response(JSON.stringify({ error: 'Already processed' }), { status: 400, headers: corsHeaders })
    }

    // 2. Update status
    console.log("DB: Updating status in enrollment_requests...");
    const { error: updateError } = await supabase
        .from('enrollment_requests')
        .update({ status })
        .eq('id', requestId)

    if (updateError) {
        console.error("DB: Update status error:", updateError);
        throw updateError;
    }

    // 3. If approved, create enrollment
    if (status === 'approved') {
        console.log("DB: Creating enrollment record...");
        const { error: enrollError } = await supabase
            .from('enrollments')
            .insert({
                user_id: request.user_id,
                course_id: request.course_id,
                payment_method: request.payment_method,
                enrolled_at: new Date().toISOString()
            })

        if (enrollError && enrollError.code !== '23505') {
            console.error("DB: Enrollment creation error:", enrollError);
            throw enrollError;
        }
        console.log("DB: Enrollment record created or already exists.");
    }

    // 4. Update Telegram Message (if originated from Telegram)
    if (telegramMessageId && BOT_TOKEN && ADMIN_CHAT_ID) {
        console.log("TELEGRAM: Updating original message...");
        const statusText = status === 'approved' ? '✅ تم القبول' : '❌ تم الرفض'
        const newText = `🚨 *طلب تسجيل جديد*\n\n👤 *الطالب:* ${request.user_id}\n📚 *الكورس:* ${request.courses.title}\n💳 *طريقة الدفع:* ${request.payment_method}\n\n*القرار:* ${statusText}`

        try {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: ADMIN_CHAT_ID,
                    message_id: telegramMessageId,
                    text: newText,
                    parse_mode: 'Markdown'
                })
            })
        } catch (tgErr) {
            console.error("TELEGRAM: Update error:", tgErr.message);
        }
    }

    // 5. Notify Student
    console.log("NOTIFY: Triggering student notification...");
    await notifyStudent(supabase, request, status)

    return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    })
}

async function notifyStudent(supabase: any, request: any, status: 'approved' | 'rejected') {
    const { user_id, courses } = request;
    const courseTitle = courses?.title || 'Course';

    const title = status === 'approved' ? 'تهانينا! تم قبول طلبك 🎉' : 'عذراً، تم رفض طلب التسجيل';
    const message = status === 'approved'
        ? `تمت الموافقة على طلب انضمامك لكورس "${courseTitle}". يمكنك الآن البدء بالتعلم!`
        : `نعتذر منك، لم تتم الموافقة على طلب انضمامك لكورس "${courseTitle}". يرجى التواصل مع الإدارة للمزيد من التفاصيل.`;

    try {
        // 1. Database Notification
        console.log(`DB: Creating notification for student ${user_id}`);
        const { data: notification, error: notifError } = await supabase
            .from('notifications')
            .insert({ title, message, target_type: 'user' })
            .select('id')
            .single();

        if (!notifError && notification) {
            const { error: recipError } = await supabase
                .from('notification_recipients')
                .insert({ notification_id: notification.id, user_id: user_id });

            if (recipError) console.error("DB: Recipient error:", recipError);
            else console.log("DB: Notification success.");
        } else {
            console.error("DB: Notification error:", notifError);
        }

        // 2. Email Notification
        if (RESEND_API_KEY) {
            const { data: profile } = await supabase.from('profiles').select('email').eq('user_id', user_id).single();
            if (profile?.email) {
                console.log(`EMAIL: Sending to ${profile.email}`);
                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
                    body: JSON.stringify({
                        from: 'Devixa <academy@resend.dev>',
                        to: [profile.email],
                        subject: title,
                        html: `<div dir="rtl" style="font-family: Arial; padding: 20px;"><h2>${title}</h2><p>${message}</p></div>`
                    })
                }).catch(e => console.error("EMAIL: Error:", e.message));
            }
        }
    } catch (err: any) {
        console.error("NOTIFY: Global error:", err.message);
    }
}
