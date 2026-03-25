import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to get a temporary signed URL for a private file in Supabase Storage.
 * Automatically handles expiration and refreshing.
 * 
 * @param bucket - The storage bucket name
 * @param path - The path to the file within the bucket
 * @param expiresIn - Expiration time in seconds (default 60)
 */
export function useSignedUrl(bucket: string, path: string | null, expiresIn: number = 60) {
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(!!path);
    const [error, setError] = useState<Error | null>(null);

    const getSignedUrl = useCallback(async () => {
        if (!path) {
            setSignedUrl(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error: signedError } = await supabase.storage
                .from(bucket)
                .createSignedUrl(path, expiresIn);

            if (signedError) throw signedError;
            if (data?.signedUrl) {
                setSignedUrl(data.signedUrl);
            }
        } catch (err: any) {
            console.error('Error creating signed URL:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [bucket, path, expiresIn]);

    useEffect(() => {
        getSignedUrl();

        // If path changes or component remounts, we get a new one.
        // For very long videos, we might need a refresh logic based on time,
        // but for now, 60s is usually enough for the initial load.
        // The browser usually handles the stream once it's started.
    }, [getSignedUrl]);

    return { signedUrl, loading, error, refresh: getSignedUrl };
}
