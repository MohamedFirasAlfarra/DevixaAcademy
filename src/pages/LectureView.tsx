import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Loader2,
    PlayCircle,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Menu,
    X,
    Layout
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CustomVideoPlayer from "@/components/courses/CustomVideoPlayer";
import { cn } from "@/lib/utils";

interface Lesson {
    id: string;
    title: string;
    order_index: number;
    duration_hours: number;
    completed?: boolean;
}

export default function LectureView() {
    const { sessionId } = useParams();
    const { user } = useAuth();
    const { t, dir } = useLanguage();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const [courseLessons, setCourseLessons] = useState<Lesson[]>([]);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

    useEffect(() => {
        if (sessionId && user) {
            fetchSessionData();
        }
    }, [sessionId, user]);

    const fetchSessionData = async () => {
        try {
            setLoading(true);

            // 1. Fetch current session details
            const { data: sessionData, error: sessionError } = await (supabase
                .from('course_sessions' as any) as any)
                .select('*, courses(*), batches(*)')
                .eq('id', sessionId)
                .single();

            if (sessionError) throw sessionError;
            setSession(sessionData);

            const courseId = sessionData.course_id || sessionData.batches?.course_id;

            // 2. Check enrollment
            const { data: enrollmentData } = await supabase
                .from('enrollments')
                .select('id')
                .eq('user_id', user?.id)
                .eq('course_id', courseId)
                .maybeSingle();

            if (!enrollmentData) {
                // Check if admin using the helper function
                const { data: isAdmin } = await supabase.rpc('has_role', {
                    _role: 'admin',
                    _user_id: user?.id
                });

                if (!isAdmin) {
                    navigate("/my-courses");
                    return;
                }
            }
            setIsEnrolled(true);

            // 3. Fetch all lessons in this course for navigation
            const { data: lessonsData } = await (supabase
                .from('course_sessions' as any) as any)
                .select('id, title, order_index, duration_hours')
                .eq('course_id', courseId)
                .order('order_index', { ascending: true });

            // 4. Fetch completions for highlighting
            const { data: completions } = await (supabase
                .from('lesson_completions' as any) as any)
                .select('lesson_id')
                .eq('user_id', user?.id);

            const completionIds = new Set(completions?.map(c => c.lesson_id));

            setCourseLessons(lessonsData?.map(l => ({
                ...l,
                completed: completionIds.has(l.id)
            })) || []);

            setIsCompleted(completionIds.has(sessionId!));

            // 5. Generate Streaming URL / Path
            if (sessionData.telegram_file_id || sessionData.telegram_token) {
                const { data: { session: authSession } } = await supabase.auth.getSession();
                const token = authSession?.access_token;
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
                const streamUrl = `${supabaseUrl}/functions/v1/video-stream?lessonId=${sessionId}&token=${encodeURIComponent(token || '')}&apikey=${supabaseAnonKey}`;
                setSignedUrl(streamUrl);
            } else {
                setSignedUrl(null);
            }

        } catch (error: any) {
            toast({
                title: t.common.error,
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleMarkCompleted = async () => {
        if (!user || !session) return;
        setIsCompleting(true);
        try {
            const { error } = await (supabase
                .from('lesson_completions' as any) as any)
                .upsert({
                    user_id: user.id,
                    course_id: session.course_id || session.batches?.course_id,
                    lesson_id: session.id,
                    completed: true
                });

            if (error) throw error;
            setIsCompleted(true);
            setCourseLessons(prev => prev.map(l => l.id === session.id ? { ...l, completed: true } : l));
            toast({ title: t.common.success });
        } catch (error: any) {
            toast({
                title: t.common.error,
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsCompleting(false);
        }
    };

    const navigateToLesson = (id: string) => {
        navigate(`/lecture/${id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!session || !isEnrolled) return null;

    const currentIndex = courseLessons.findIndex(l => l.id === sessionId);
    const prevLesson = currentIndex > 0 ? courseLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < courseLessons.length - 1 ? courseLessons[currentIndex + 1] : null;

    return (
        <DashboardLayout>
            <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)] bg-background relative overflow-hidden" onContextMenu={(e) => e.preventDefault()}>

                {/* LESSON SIDEBAR */}
                <aside className={cn(
                    "w-full lg:w-80 border-e border-accent/10 bg-card/30 backdrop-blur-md transition-all duration-300 z-30",
                    !sidebarOpen && "lg:w-0 lg:opacity-0 lg:pointer-events-none"
                )}>
                    <div className="p-4 border-b border-accent/10 flex items-center justify-between">
                        <h3 className="font-display font-bold text-lg flex items-center gap-2">
                            <Layout className="w-5 h-5 text-primary" />
                            {dir === 'rtl' ? "محتوى الدورة" : "Course Content"}
                        </h3>
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="lg:hidden">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    <div className="overflow-y-auto max-h-[400px] lg:max-h-[calc(100vh-140px)] p-2 space-y-1">
                        {courseLessons.map((lesson) => (
                            <button
                                key={lesson.id}
                                onClick={() => navigateToLesson(lesson.id)}
                                className={cn(
                                    "w-full text-start p-3 rounded-xl transition-all flex items-start gap-3 group",
                                    lesson.id === sessionId
                                        ? "bg-primary/10 border-primary/20 shadow-sm"
                                        : "hover:bg-muted/50 text-muted-foreground"
                                )}
                            >
                                <div className={cn(
                                    "mt-1 p-1 rounded-full",
                                    lesson.completed ? "bg-green-500/20 text-green-500" : "bg-accent/10 text-accent"
                                )}>
                                    {lesson.completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "font-medium text-sm line-clamp-2",
                                        lesson.id === sessionId ? "text-primary font-bold" : "text-foreground/80"
                                    )}>
                                        {lesson.title}
                                    </p>
                                    <span className="text-[10px] opacity-60">
                                        {lesson.duration_hours} {t.common.hours}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* MAIN CONTENT AREA */}
                <main className="flex-1 flex flex-col min-w-0">
                    {/* Header Controls */}
                    <div className="p-4 border-b border-accent/5 bg-card/20 flex items-center justify-between backdrop-blur-sm sticky top-0 z-20">
                        <div className="flex items-center gap-3">
                            {!sidebarOpen && (
                                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="hidden lg:flex">
                                    <Menu className="w-5 h-5" />
                                </Button>
                            )}
                            <div>
                                <h1 className="text-lg font-bold font-display truncate max-w-[200px] sm:max-w-md">
                                    {session.title}
                                </h1>
                                <p className="text-[10px] text-muted-foreground">
                                    {session.courses?.title || session.batches?.courses?.title}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                className={cn(
                                    "h-9 px-4 rounded-full text-xs font-bold transition-all",
                                    isCompleted ? "bg-green-500 text-white" : "gradient-primary shadow-glow"
                                )}
                                onClick={handleMarkCompleted}
                                disabled={isCompleted || isCompleting}
                            >
                                {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                    isCompleted ? (dir === 'rtl' ? "مكتمل ✓" : "Done ✓") : (dir === 'rtl' ? "إكمال" : "Mark Done")
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* CINEMATIC VIDEO CONTAINER */}
                    <div className="flex-1 bg-black/95 flex items-center justify-center p-0 lg:p-4 overflow-hidden">
                        <div className="w-full max-w-[1400px] aspect-video relative group border-x lg:border border-accent/10 lg:rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                            {signedUrl || session.video_path || session.video_url || session.telegram_token ? (
                                <CustomVideoPlayer
                                    videoPath={session.video_path || undefined}
                                    telegramToken={session.telegram_token}
                                    src={signedUrl || session.video_url || undefined}
                                    className="w-full h-full"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
                                    <PlayCircle className="w-16 h-16 text-primary/20 mb-4 animate-pulse" />
                                    <p className="text-zinc-500 font-medium tracking-widest uppercase text-xs">
                                        {dir === 'rtl' ? "الفيديو غير متوفر" : "Video not available"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* NAVIGATION CONTROLS (BOTTOM) */}
                    <div className="p-4 bg-muted/20 border-t border-accent/5 flex items-center justify-between">
                        <Button
                            variant="ghost"
                            disabled={!prevLesson}
                            onClick={() => prevLesson && navigateToLesson(prevLesson.id)}
                            className="gap-2 text-sm"
                        >
                            {dir === 'rtl' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                            <span className="hidden sm:inline">{dir === 'rtl' ? "الدرس السابق" : "Previous"}</span>
                        </Button>

                        <div className="text-xs text-muted-foreground font-medium bg-muted/50 px-4 py-1.5 rounded-full border border-accent/5">
                            {currentIndex + 1} / {courseLessons.length}
                        </div>

                        <Button
                            variant="ghost"
                            disabled={!nextLesson}
                            onClick={() => nextLesson && navigateToLesson(nextLesson.id)}
                            className="gap-2 text-sm text-primary hover:text-primary hover:bg-primary/10"
                        >
                            <span className="hidden sm:inline">{dir === 'rtl' ? "الدرس التالي" : "Next"}</span>
                            {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                    </div>
                </main>
            </div>
        </DashboardLayout>
    );
}
