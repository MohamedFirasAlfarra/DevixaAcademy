import { supabase } from "@/integrations/supabase/client";

export const createVideoSession = async (userId: string, sessionId: string) => {
    // 1. Cleanup old sessions for this user
    await (supabase
        .from("video_sessions" as any) as any)
        .delete()
        .eq("user_id", userId)
        .eq("session_id", sessionId);

    // 2. Check for concurrent sessions on OTHER videos (anti-account sharing)
    // We allow one active video at a time per user globally
    const { data: activeSessions } = await (supabase
        .from("video_sessions" as any) as any)
        .select("id, last_active")
        .eq("user_id", userId)
        .gt("expires_at", new Date().toISOString());

    if (activeSessions && activeSessions.length > 0) {
        // Optional: could block or just warn. For now, let's delete them to allow the new one
        // (This effectively logs out the previous device/tab)
        await (supabase
            .from("video_sessions" as any) as any)
            .delete()
            .eq("user_id", userId);
    }

    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour

    const { data, error } = await (supabase
        .from("video_sessions" as any) as any)
        .insert({
            user_id: userId,
            session_id: sessionId,
            token,
            expires_at: expiresAt,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateVideoSessionHeartbeat = async (tokenId: string) => {
    const { error } = await (supabase
        .from("video_sessions" as any) as any)
        .update({
            last_active: new Date().toISOString(),
            expires_at: new Date(Date.now() + 1000 * 60 * 5).toISOString() // Sliding window 5 mins
        })
        .eq("id", tokenId);

    if (error) console.error("Heartbeat error:", error);
};
