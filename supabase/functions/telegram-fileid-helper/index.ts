import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as jose from "https://deno.land/x/jose@v5.2.2/index.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const JWT_SECRET = Deno.env.get('TELEGRAM_SECURITY_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET') || 'default-secret-change-me';

// Utility to sign JWT
async function createVideoToken(fileId: string) {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const jwt = await new jose.SignJWT({ file_id: fileId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(secret);
  return jwt;
}

// Utility to send Telegram message
async function sendMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text }),
  });
}

serve(async (req) => {
  try {
    const update = await req.json();

    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;

      // Check if it's a video or document
      if (msg.video || msg.document) {
        const fileId = msg.video?.file_id || msg.document?.file_id;
        const mimeType = msg.video?.mime_type || msg.document?.mime_type;

        if (mimeType && mimeType.includes('video')) {
           const token = await createVideoToken(fileId);
           await sendMessage(chatId, `✅ Video successfully received!\n\nHere is your secure streaming token:\n\n\`${token}\`\n\nCopy and paste this token into the Devixa Admin Panel under the specific lesson to link this video.`);
        } else {
           await sendMessage(chatId, '❌ Please upload a valid video file (e.g., MP4).');
        }
      } else if (msg.text === '/start') {
        await sendMessage(chatId, 'Welcome to Devixa Secure Video Bot! 🎬\n\nUpload a video here to securely store it on Telegram. I will return a secure token that you can use to stream to students directly inside the Devixa learning platform, completely bypassing the 20MB restriction.');
      } else {
        await sendMessage(chatId, 'Send me a video file to generate a secure streaming token.');
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Error in telegram-bot:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
