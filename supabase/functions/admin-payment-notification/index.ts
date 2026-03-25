import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'mohamedfirasalfarra@gmail.com'
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')
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
    const { requestId, studentName, studentEmail, courseTitle, paymentMethod } = body;

    console.log(`--- [START] Processing notification for request ${requestId} ---`);
    console.log(`Student: ${studentName} (${studentEmail}), Course: ${courseTitle}`);

    const requestDate = new Date().toLocaleString('ar-EG', {
      timeZone: 'Asia/Damascus',
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

    // 1. Database Notification for Admin
    try {
      console.log("DB: Searching for admins in user_roles...");
      const { data: adminUsers, error: adminFetchError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminFetchError) throw adminFetchError;

      if (adminUsers && adminUsers.length > 0) {
        console.log(`DB: Found ${adminUsers.length} admins. Creating notification record...`);
        const { data: notification, error: notifError } = await supabase
          .from('notifications')
          .insert({
            title: 'طلب تسجيل جديد 🚨',
            message: `قام ${studentName} بطلب التسجيل في كورس ${courseTitle}`,
            target_type: 'user'
          })
          .select('id')
          .single();

        if (notifError) throw notifError;

        if (notification) {
          const recipients = adminUsers.map(admin => ({
            notification_id: notification.id,
            user_id: admin.user_id
          }));

          const { error: recipError } = await supabase.from('notification_recipients').insert(recipients);
          if (recipError) throw recipError;
          console.log("DB: Successfully created database notifications for admins.");
        }
      } else {
        console.warn("DB: No users with 'admin' role found in user_roles table.");
      }
    } catch (dbErr) {
      console.error("DB: Error in database notifications:", dbErr.message);
    }

    const emailHtml = `
      <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-w-2xl; margin: 0 auto; padding: 20px; border: 2px solid #4f46e5; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; text-align: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 15px;">🚨 يوجد طلب تسجيل جديد</h2>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p style="font-size: 18px; margin: 10px 0;"><strong>👤 اسم الطالب:</strong> ${studentName}</p>
          <p style="font-size: 18px; margin: 10px 0;"><strong>📧 البريد الإلكتروني:</strong> ${studentEmail}</p>
          <p style="font-size: 18px; margin: 10px 0;"><strong>📚 اسم الكورس:</strong> ${courseTitle}</p>
          <p style="font-size: 18px; margin: 10px 0;"><strong>💳 طريقة الدفع:</strong> ${paymentMethod}</p>
          <p style="font-size: 18px; margin: 10px 0;"><strong>📅 تاريخ الطلب:</strong> ${requestDate}</p>
        </div>
      </div>
    `

    const telegramMessage = `🚨 *طلب تسجيل جديد*\n\n👤 *الطالب:* ${studentName}\n📚 *الكورس:* ${courseTitle}\n💳 *طريقة الدفع:* ${paymentMethod}\n📅 *التاريخ:* ${requestDate}`;

    const promises = [];

    // RESEND EMAIL
    if (RESEND_API_KEY) {
      console.log("RESEND: Attempting to send email...");
      promises.push(
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Devixa <onboarding@resend.dev>',
            to: [ADMIN_EMAIL],
            subject: `طلب تسجيل جديد - ${studentName}`,
            html: emailHtml,
          }),
        }).then(async res => {
          const data = await res.json();
          console.log("RESEND: Response", data);
          return { type: 'email', status: 'success', data };
        }).catch(err => {
          console.error("RESEND: Error", err.message);
          return { type: 'email', status: 'error', error: err.message };
        })
      );
    } else {
      console.warn("RESEND: API Key missing.");
    }

    // TELEGRAM
    if (BOT_TOKEN && TELEGRAM_CHAT_ID) {
      console.log(`TELEGRAM: Attempting to send message to ${TELEGRAM_CHAT_ID}...`);
      promises.push(
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: telegramMessage,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '✅ قبول', callback_data: `approve:${requestId}` },
                { text: '❌ رفض', callback_data: `reject:${requestId}` }
              ]]
            }
          }),
        }).then(async res => {
          const data = await res.json();
          console.log("TELEGRAM: Response", data);
          return { type: 'telegram', status: 'success', data };
        }).catch(err => {
          console.error("TELEGRAM: Error", err.message);
          return { type: 'telegram', status: 'error', error: err.message };
        })
      );
    } else {
      console.warn("TELEGRAM: Bot Token or Chat ID missing.");
    }

    const results = await Promise.allSettled(promises);
    console.log("--- [FINISH] All notifications processed ---");

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("GLOBAL ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
