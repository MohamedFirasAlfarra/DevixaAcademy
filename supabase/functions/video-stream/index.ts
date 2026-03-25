import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as jose from "https://deno.land/x/jose@v5.2.2/index.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const JWT_SECRET = Deno.env.get('TELEGRAM_SECURITY_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET') || 'default-secret-change-me';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'range, authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
};

async function verifyToken(token: string): Promise<string | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return payload.file_id as string;
  } catch (err: any) {
    console.error("Token verification failed:", err.message);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
        return new Response('Missing token', { status: 400, headers: corsHeaders });
    }

    const fileId = await verifyToken(token);
    if (!fileId) {
        return new Response('Invalid token', { status: 403, headers: corsHeaders });
    }

    // 1. Get file path from Telegram
    const pathRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
    const pathJson = await pathRes.json();
    
    if (!pathJson.ok) {
        throw new Error("Telegram API Error: " + pathJson.description);
    }
    
    const filePath = pathJson.result.file_path;
    const fileSize = pathJson.result.file_size;
    const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
    
    // 2. Proxy request with Range support
    const range = req.headers.get("range");
    const headers = new Headers();
    if (range) headers.set("Range", range);

    const videoRes = await fetch(downloadUrl, { headers });
    
    // Create response headers
    const resHeaders = new Headers(corsHeaders);
    resHeaders.set("Content-Type", "video/mp4");
    resHeaders.set("Accept-Ranges", "bytes");
    
    if (videoRes.headers.get("Content-Range")) {
        resHeaders.set("Content-Range", videoRes.headers.get("Content-Range")!);
    }
    if (videoRes.headers.get("Content-Length")) {
        resHeaders.set("Content-Length", videoRes.headers.get("Content-Length")!);
    }

    return new Response(videoRes.body, {
      status: videoRes.status,
      headers: resHeaders
    });

  } catch (error: any) {
    console.error("Stream function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
