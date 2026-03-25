import React, { useState, useRef, useEffect } from 'react';
import { Play, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface CustomVideoPlayerProps {
    src?: string;
    videoPath?: string;
    telegramToken?: string | null;
    bucket?: string;
    poster?: string;
    className?: string;
    showWatermark?: boolean; // Platform Logo
}

export default function CustomVideoPlayer({ 
    src, 
    videoPath, 
    telegramToken,
    bucket = 'course-videos',
    poster, 
    className, 
    showWatermark = true,
}: CustomVideoPlayerProps) {
    const { user, profile } = useAuth();
    const { dir } = useLanguage();
    const { toast } = useToast();
    
    // Media References
    const videoRef = useRef<HTMLVideoElement>(null);
    const ytPlayerRef = useRef<YouTubePlayer | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Get signed URL if videoPath is provided (for Supabase Storage fallback)
    const { signedUrl, loading: signedLoading } = useSignedUrl(bucket, videoPath || null);
    
    // Final Source Logic: 
    // 1. If telegramToken exists, use the proxy edge function
    // 2. Else if videoPath exists, use the Supabase signed URL
    // 3. Else fallback to the raw src (usually YouTube)
    const getFinalSrc = () => {
        if (telegramToken) {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            // The video-stream function expects a 'token' parameter
            return `${supabaseUrl}/functions/v1/video-stream?token=${encodeURIComponent(telegramToken)}`;
        }
        if (videoPath) return signedUrl;
        return src;
    };

    const finalSrc = getFinalSrc();
    
    // States
    const [hasStarted, setHasStarted] = useState(false);
    const [shouldMount, setShouldMount] = useState(false);
    const [securityAlert, setSecurityAlert] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false); // Used when iframe is mounting
    const [isHovered, setIsHovered] = useState(false);

    /// --- AUTO MOUNT DELAY --- ///
    useEffect(() => {
        // Advanced Auto Play: Mount iframe after a short delay to prevent initial UI flash
        const timer = setTimeout(() => {
            setShouldMount(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    /// --- SECURITY & ANTI-INSPECT --- ///
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === "F12" ||
                (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
                (e.ctrlKey && e.key === "u") ||
                (e.ctrlKey && e.key === "s") ||
                e.key === "PrintScreen"
            ) {
                e.preventDefault();
                setSecurityAlert("Recording or inspecting content is restricted.");
                setTimeout(() => setSecurityAlert(null), 3000);
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("contextmenu", handleContextMenu);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("contextmenu", handleContextMenu);
        };
    }, []);

    /// --- YOUTUBE HELPERS --- ///
    const isYouTubeUrl = (url: string) => {
        const trimmed = url.trim();
        // Check if it's a full URL
        if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) return true;
        // Check if it's a direct 11-character ID
        return /^[a-zA-Z0-9_-]{11}$/.test(trimmed);
    };

    const extractYouTubeId = (url: string) => {
        const trimmed = url.trim();
        // If it's already an ID, return it
        if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
        // Otherwise try to extract from URL
        const match = trimmed.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
        return match ? match[1] : null;
    };

    // YouTube Event Handlers
    const onYouTubeReady = (event: YouTubeEvent) => {
        ytPlayerRef.current = event.target;
        setIsLoading(false);
        // Autoplay triggered dynamically
        event.target.playVideo();
    };

    const onYouTubeStateChange = (event: YouTubeEvent) => {
        // 1 = PLAYING
        if (event.data === 1) {
            setHasStarted(true);
            setIsLoading(false);
        } else if (event.data === 3) {
            // 3 = BUFFERING
            setIsLoading(true);
        }
    };

    const onYouTubeError = (event: YouTubeEvent) => {
        setIsLoading(false);
        setHasStarted(false);
        console.error("YouTube Player Error:", event.data);
        toast({
            title: dir === 'rtl' ? "خطأ في الفيديو" : "Video Error",
            description: dir === 'rtl' ? "فشل تحميل الفيديو. يرجى التحقق من الرابط." : "Failed to load the video. Please check the URL.",
            variant: "destructive"
        });
    };

    /// --- USER INTERACTION --- ///
    const handleStartLesson = () => {
        if (!hasStarted) {
            setIsLoading(true);
            const isYT = isYouTubeUrl(finalSrc || '');

            if (isYT) {
                // IMPORTANT: Do NOT set hasStarted(true) here. 
                // Wait for onYouTubeStateChange to report playing (data == 1).
                // This keeps the Cover visible while YouTube loads its initial UI.
                if (ytPlayerRef.current) {
                    try {
                        ytPlayerRef.current.unMute();
                        ytPlayerRef.current.playVideo();
                    } catch (e) {
                        console.error("YouTube Play Error:", e);
                    }
                }
            } else if (videoRef.current && finalSrc) {
                videoRef.current.play().then(() => {
                    setHasStarted(true);
                    setIsLoading(false);
                }).catch(e => {
                    console.error("Native Video Play Error:", e);
                    setIsLoading(false);
                });
            } else {
                setIsLoading(false);
                console.warn("No video source found to play.");
            }
            
            // Optional click sound effect
            try {
                const audio = new Audio('/sounds/click.mp3');
                audio.volume = 0.2;
                audio.play().catch(() => {
                    // Ignore sound errors
                });
            } catch (e) {
                // Ignore audio object errors
            }
        }
    };

    const renderVideoElement = () => {
        if (!finalSrc) return null;

        if (isYouTubeUrl(finalSrc)) {
            const videoId = extractYouTubeId(finalSrc);
            if (!videoId) return <div className="text-white">Invalid YouTube URL</div>;

            // ONLY mount when shouldMount is true (lazy load delay)
            if (!shouldMount) return null;

            return (
                <div className={cn(
                    "absolute inset-0 w-full h-full bg-black transition-all duration-700 ease-in-out overflow-hidden origin-center",
                    hasStarted ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-[1.05] pointer-events-none"
                )}>
                    {/* The Cropping Trick: Scale the iframe slightly to hide YouTube corner logs/ui */}
                    <div className="absolute inset-x-[-2%] inset-y-[-2%] scale-[1.05] w-[104%] h-[104%]">
                        <YouTube
                            videoId={videoId}
                            opts={{
                                height: '100%',
                                width: '100%',
                                playerVars: {
                                    autoplay: 1, 
                                    mute: 1, 
                                    modestbranding: 1,
                                    rel: 0,
                                    controls: 1, 
                                    showinfo: 0,
                                    fs: 1,
                                    playsinline: 1,
                                    iv_load_policy: 3, // Disable annotations
                                },
                            }}
                            onReady={onYouTubeReady}
                            onStateChange={onYouTubeStateChange}
                            onError={onYouTubeError}
                            className="w-full h-full"
                            iframeClassName="w-full h-full border-none outline-none"
                        />
                    </div>
                </div>
            );
        }

        // Fallback for native HTML5 video
        return (
            <div className={cn(
                "absolute inset-0 w-full h-full bg-black transition-all duration-400 ease-in-out",
                hasStarted ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-[1.05] pointer-events-none"
            )}>
                <video
                    ref={videoRef}
                    key={finalSrc} // Force video element to recreate when source changes
                    src={finalSrc}
                    poster={poster}
                    className="w-full h-full object-contain"
                    controls={hasStarted}
                    controlsList="nodownload"
                    onDragStart={(e) => e.preventDefault()}
                    disablePictureInPicture
                    onWaiting={() => setIsLoading(true)}
                    onPlaying={() => {
                        setIsLoading(false);
                        setHasStarted(true);
                    }}
                    onCanPlay={() => setIsLoading(false)}
                />
            </div>
        );
    };

    return (
        <div 
            ref={containerRef}
            className={cn(
                "relative group overflow-hidden bg-zinc-950 rounded-2xl md:rounded-[2rem] shadow-2xl ring-1 ring-white/5 select-none w-full aspect-video transition-all duration-500",
                className
            )}
            onContextMenu={(e) => e.preventDefault()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* 1. Underlying Video Mount */}
            {renderVideoElement()}

            {/* 2. Premium Custom Cover UI (Before Play) */}
            <AnimatePresence>
                {!hasStarted && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                        className="absolute inset-0 z-20 flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-zinc-950"
                        onClick={handleStartLesson}
                    >
                        {/* Background Thumbnail (Blurred) or Gradient */}
                        {poster ? (
                            <div className="absolute inset-0 opacity-40 mix-blend-overlay">
                                <img src={poster} alt="Video Thumbnail" className="w-full h-full object-cover blur-xl scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-zinc-950/80 to-transparent" />
                            </div>
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-zinc-950 to-primary/5" />
                        )}

                        {/* Subtle Animated Particles/Glow */}
                        <motion.div 
                            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }} 
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] aspect-square bg-primary/20 blur-[100px] rounded-full pointer-events-none" 
                        />

                        {/* Center Play Button & Text */}
                        <div className="relative z-30 flex flex-col items-center gap-6 transform transition-transform duration-500 ease-out">
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative group/play"
                            >
                                {/* Glow Ring */}
                                <div className={cn(
                                    "absolute inset-0 bg-primary rounded-full blur-xl transition-opacity duration-500 opacity-60 group-hover/play:opacity-100 animate-pulse"
                                )} />
                                
                                {/* Glass Button */}
                                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary flex items-center justify-center shadow-inner">
                                        <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white ml-2" />
                                    </div>
                                </div>
                            </motion.div>

                            <div className="text-center">
                                <h3 className="text-white font-display font-bold text-xl sm:text-3xl tracking-wide drop-shadow-lg mb-2">
                                    {dir === 'rtl' ? "بدء الدرس" : "Start Lesson"}
                                </h3>
                                <p className="text-white/60 text-xs sm:text-sm tracking-widest uppercase font-medium">
                                    {dir === 'rtl' ? "اضغط لبدء المشاهدة" : "Click to start the lesson"}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3. Loading State (Iframe spinup) */}
            <AnimatePresence>
                {(isLoading || signedLoading) && hasStarted && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-[25] pointer-events-none"
                    >
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            <p className="text-white/50 text-xs uppercase tracking-widest animate-pulse font-medium">
                                {dir === 'rtl' ? "جاري التحميل..." : "Loading experience..."}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 4. Platform Watermark (Always Top Overlay) */}
            <AnimatePresence>
                {showWatermark && hasStarted && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 0.8, y: 0 }}
                        className="absolute bottom-20 right-4 sm:bottom-24 sm:right-6 md:bottom-28 md:right-8 z-30 pointer-events-none select-none flex items-center gap-2"
                    >
                        <div className="flex flex-col items-end">
                            <span className="text-white/40 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] drop-shadow-md">Official Content</span>
                            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                                <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                                <span className="text-white font-black text-xl sm:text-2xl italic tracking-tighter drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">DEVI<span className="text-primary text-glow">XA</span></span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Security Alert Popup */}
            <AnimatePresence>
                {securityAlert && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        className="absolute top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-red-600/90 backdrop-blur-md rounded-2xl flex items-center gap-3 text-white font-bold shadow-2xl border border-red-500/50"
                    >
                        <AlertTriangle className="w-5 h-5" />
                        <span className="text-sm">{securityAlert}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
