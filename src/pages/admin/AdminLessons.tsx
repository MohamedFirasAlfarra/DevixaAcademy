import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Plus,
    Pencil,
    Trash2,
    PlayCircle,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ArrowUp,
    ArrowDown,
    ExternalLink,
    Upload,
    Video,
    Link as LinkIcon,
    Send,
    X,
    AlertTriangle
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import { useToast } from "@/hooks/use-toast";
import VideoUploadPro, { VideoMetadata } from "@/components/admin/VideoUploadPro";
import CustomVideoPlayer from "@/components/courses/CustomVideoPlayer";

interface Lesson {
    id: string;
    course_id: string;
    title: string;
    order_index: number;
    telegram_file_id: string | null;
    telegram_token: string | null;
    video_url: string | null;
    video_path: string | null;
    duration_hours: number;
}

export default function AdminLessons() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { t, dir } = useLanguage();
    const { toast } = useToast();
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [courseTitle, setCourseTitle] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);


    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
    const [sourceType, setSourceType] = useState<'upload' | 'youtube' | 'telegram'>('youtube');
    const [formData, setFormData] = useState({
        title: "",
        order_index: 0,
        video_url: "",
        video_path: "",
        telegram_token: "",
        duration_hours: 1
    });

    // Upload state (legacy removed)
    const [uploadMetadata, setUploadMetadata] = useState<VideoMetadata | null>(null);

    // Preview state
    const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
    const [lessonToPreview, setLessonToPreview] = useState<Lesson | null>(null);

    // Delete state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);

    useEffect(() => {
        if (courseId) {
            fetchCourseDetails();
            fetchLessons();
        }
    }, [courseId]);

    const fetchCourseDetails = async () => {
        const { data } = await supabase
            .from("courses")
            .select("title")
            .eq("id", courseId)
            .single();
        if (data) setCourseTitle(data.title);
    };

    const fetchLessons = async () => {
        try {
            setLoading(true);
            const { data, error } = await (supabase
                .from("course_sessions" as any) as any)
                .select("*")
                .eq("course_id", courseId)
                .order("order_index", { ascending: true });

            if (error) throw error;
            setLessons((data as any[]) || []);
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

    const handleOpenDialog = (lesson?: Lesson) => {
        if (lesson) {
            setEditingLesson(lesson);
            setFormData({
                title: lesson.title,
                order_index: lesson.order_index,
                video_url: lesson.video_url || "",
                video_path: lesson.video_path || "",
                telegram_token: (lesson as any).telegram_token || "",
                duration_hours: lesson.duration_hours || 1
            });
            if (lesson.video_path) setSourceType('upload');
            else if ((lesson as any).telegram_token) setSourceType('telegram');
            else setSourceType('youtube');
        } else {
            setEditingLesson(null);
            setSourceType('youtube');
            setFormData({
                title: "",
                order_index: lessons.length > 0 ? Math.max(...lessons.map(l => l.order_index)) + 1 : 1,
                video_url: "",
                video_path: "",
                telegram_token: "",
                duration_hours: 1
            });
        }
        setUploadMetadata(null);
        setDialogOpen(true);
    };

    const handlePreviewLesson = (lesson: Lesson) => {
        setLessonToPreview(lesson);
        setPreviewDialogOpen(true);
    };

    // Legacy handleUploadVideo removed - now handled by VideoUploadPro component

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let finalVideoPath = formData.video_path;
            let finalDuration = formData.duration_hours;

            // If metadata was captured, use it
            if (uploadMetadata) {
                finalDuration = uploadMetadata.duration / 3600; // Convert to hours
            }

            const lessonData = {
                course_id: courseId,
                title: formData.title,
                order_index: formData.order_index,
                telegram_file_id: null,
                telegram_token: sourceType === 'telegram' ? formData.telegram_token : null,
                video_url: sourceType === 'youtube' ? formData.video_url : null,
                video_path: sourceType === 'upload' ? finalVideoPath : null,
                duration_hours: finalDuration
            };

            if (editingLesson) {
                const { error } = await (supabase
                    .from("course_sessions" as any) as any)
                    .update(lessonData)
                    .eq("id", editingLesson.id);
                if (error) throw error;
            } else {
                const { error } = await (supabase
                    .from("course_sessions" as any) as any)
                    .insert(lessonData);
                if (error) throw error;
            }

            toast({ title: t.adminLessons.saveSuccess });
            setDialogOpen(false);
            fetchLessons();
        } catch (error: any) {
            toast({
                title: t.common.error,
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!lessonToDelete) return;
        setIsDeleting(true);
        try {
            // Delete from storage if exists
            if (lessonToDelete.video_path) {
                await supabase.storage.from('course-videos').remove([lessonToDelete.video_path]);
            }

            const { error } = await (supabase
                .from("course_sessions" as any) as any)
                .delete()
                .eq("id", lessonToDelete.id);
            if (error) throw error;
            toast({ title: t.common.success });
            fetchLessons();
        } catch (error: any) {
            toast({
                title: t.common.error,
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
            setDeleteDialogOpen(false);
            setLessonToDelete(null);
        }
    };

    const moveLesson = async (index: number, direction: 'up' | 'down') => {
        const newLessons = [...lessons];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= lessons.length) return;

        const currentLesson = newLessons[index];
        const targetLesson = newLessons[targetIndex];

        const currentOrder = currentLesson.order_index;
        const targetOrder = targetLesson.order_index;

        try {
            await Promise.all([
                (supabase.from("course_sessions" as any) as any).update({ order_index: targetOrder }).eq("id", currentLesson.id),
                (supabase.from("course_sessions" as any) as any).update({ order_index: currentOrder }).eq("id", targetLesson.id)
            ]);
            fetchLessons();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/courses")} className="rounded-xl">
                            {dir === 'rtl' ? <ChevronRight /> : <ChevronLeft />}
                        </Button>
                        <div>
                            <h1 className="text-3xl font-display font-bold tracking-tight">{t.adminLessons.title}</h1>
                            <p className="text-muted-foreground font-medium">{courseTitle}</p>
                        </div>
                    </div>
                    <Button onClick={() => handleOpenDialog()} className="gradient-primary h-12 px-6 rounded-xl font-bold shadow-lg shadow-primary/20">
                        <Plus className="w-5 h-5 me-2" />
                        {t.adminLessons.addLesson}
                    </Button>
                </div>

                <Card className="border-accent/10 shadow-sm overflow-hidden rounded-[2rem]">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="w-24 text-center">{t.adminLessons.orderNumber}</TableHead>
                                    <TableHead>{t.adminLessons.lessonTitle}</TableHead>
                                    <TableHead>{t.adminLessons.duration}</TableHead>
                                    <TableHead className="text-center">{t.common.actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-20">
                                            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
                                        </TableCell>
                                    </TableRow>
                                ) : lessons.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-20 text-muted-foreground">
                                            <Video className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                            {t.adminLessons.noLessons}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    lessons.map((lesson, index) => (
                                        <TableRow key={lesson.id} className="group transition-colors hover:bg-muted/30">
                                            <TableCell className="font-bold text-center">
                                                <Badge variant="outline" className="rounded-lg px-3 py-1 bg-background">
                                                    #{lesson.order_index}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <button 
                                                        onClick={() => (lesson.video_path || lesson.video_url) && handlePreviewLesson(lesson)}
                                                        className={cn(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                                            (lesson.video_path || lesson.video_url) 
                                                                ? "bg-primary/10 text-primary hover:bg-primary hover:text-white cursor-pointer" 
                                                                : "bg-accent/10 text-accent opacity-50 cursor-not-allowed"
                                                        )}
                                                    >
                                                        <PlayCircle className="w-5 h-5" />
                                                    </button>
                                                    <div>
                                                        <p className="font-bold">{lesson.title}</p>
                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                                            {lesson.video_path ? 'Hosted' : 'YouTube'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-semibold text-muted-foreground">
                                                {lesson.duration_hours} {t.common.hours}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 rounded-sm hover:bg-primary/10 hover:text-primary"
                                                            disabled={index === 0}
                                                            onClick={() => moveLesson(index, 'up')}
                                                        >
                                                            <ArrowUp className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 rounded-sm hover:bg-primary/10 hover:text-primary"
                                                            disabled={index === lessons.length - 1}
                                                            onClick={() => moveLesson(index, 'down')}
                                                        >
                                                            <ArrowDown className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => handleOpenDialog(lesson)}>
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => {
                                                        setLessonToDelete(lesson);
                                                        setDeleteDialogOpen(true);
                                                    }}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-xl rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-display font-black">
                            {editingLesson ? t.adminLessons.editLesson : t.adminLessons.addLesson}
                        </DialogTitle>
                        <DialogDescription>
                            {dir === 'rtl' ? "أدخل تفاصيل الدرس واختر طريقة عرض الفيديو" : "Enter lesson details and choose video source"}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 lg:col-span-2">
                                <Label className="font-bold">{t.adminLessons.lessonTitle}</Label>
                                <Input
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder={dir === 'rtl' ? "عنوان الدرس..." : "Lesson Title..."}
                                    className="h-12 rounded-xl"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold">{t.adminLessons.orderNumber}</Label>
                                <Input
                                    type="number"
                                    value={formData.order_index}
                                    onChange={e => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                                    className="h-12 rounded-xl"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold">{t.adminLessons.duration}</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={formData.duration_hours}
                                    onChange={e => setFormData({ ...formData, duration_hours: parseFloat(e.target.value) })}
                                    className="h-12 rounded-xl"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-accent/10">
                            <Label className="font-black text-primary uppercase tracking-widest text-xs flex items-center gap-2">
                                <Video className="w-4 h-4" />
                                {dir === 'rtl' ? "مصدر الفيديو" : "Video Source"}
                            </Label>

                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    type="button"
                                    variant={sourceType === 'youtube' ? 'default' : 'outline'}
                                    className="h-20 flex-col gap-2 rounded-2xl"
                                    onClick={() => setSourceType('youtube')}
                                >
                                    <LinkIcon className="w-5 h-5 text-red-500" />
                                    <span className="text-[10px] font-bold uppercase">YouTube</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant={sourceType === 'upload' ? 'default' : 'outline'}
                                    className="h-20 flex-col gap-2 rounded-2xl"
                                    onClick={() => setSourceType('upload')}
                                >
                                    <Upload className="w-5 h-5 text-green-500" />
                                    <span className="text-[10px] font-bold uppercase leading-tight">Supabase</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant={sourceType === 'telegram' ? 'default' : 'outline'}
                                    className="h-20 flex-col gap-2 rounded-2xl"
                                    onClick={() => setSourceType('telegram')}
                                >
                                    <Send className="w-5 h-5 text-blue-500" />
                                    <span className="text-[10px] font-bold uppercase">Telegram</span>
                                </Button>
                            </div>



                            {sourceType === 'upload' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pt-2">
                                    <VideoUploadPro 
                                        courseId={courseId!} 
                                        initialVideoPath={formData.video_path}
                                        onUploadComplete={(path, meta) => {
                                            setFormData({ ...formData, video_path: path });
                                            setUploadMetadata(meta);
                                        }}
                                    />
                                </div>
                            )}

                            {sourceType === 'youtube' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label className="text-xs font-bold opacity-70">YouTube Video URL</Label>
                                    <Input
                                        value={formData.video_url}
                                        onChange={e => setFormData({ ...formData, video_url: e.target.value })}
                                        placeholder="https://youtube.com/watch?v=..."
                                        className="h-12 rounded-xl"
                                        required={sourceType === 'youtube'}
                                    />
                                    <p className="text-[10px] text-muted-foreground opacity-60">
                                        {dir === 'rtl'
                                            ? "ألصق رابط يوتيوب هنا. يفضل أن يكون الفيديو Unlisted (غير مدرج)"
                                            : "Paste YouTube link here. Unlisted videos are recommended"}
                                    </p>
                                </div>
                            )}

                            {sourceType === 'telegram' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label className="text-xs font-bold opacity-70">Telegram Secure Token</Label>
                                    <Input
                                        value={formData.telegram_token}
                                        onChange={e => setFormData({ ...formData, telegram_token: e.target.value })}
                                        placeholder="eyJhbGciOiJIUzI1NiI..."
                                        className="h-12 rounded-xl font-mono text-xs"
                                        required={sourceType === 'telegram'}
                                    />
                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                        <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0" />
                                        <p className="text-[10px] text-blue-600/80 leading-snug">
                                            {dir === 'rtl'
                                                ? "احصل على هذا الرمز من بوت التلغرام الخاص بنا بعد رفع الفيديو"
                                                : "Get this token from our Telegram Bot after successfully uploading the video"}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-6">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving} className="h-12 px-6 rounded-xl font-bold">
                                {t.common.cancel}
                            </Button>
                            <Button type="submit" disabled={saving} className="h-12 px-8 rounded-xl font-bold gradient-primary shadow-glow">
                                {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                                {t.common.save}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-background">
                    <div className="h-2 w-full bg-destructive" />
                    
                    <div className="p-8 space-y-6">
                        <AlertDialogHeader>
                            <div className="flex justify-center mb-4">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key="delete-icon"
                                        initial={{ scale: 0.5, rotate: 15, opacity: 0 }}
                                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                        exit={{ scale: 0.5, opacity: 0 }}
                                        className="p-4 rounded-full bg-destructive/10 text-destructive"
                                    >
                                        <Trash2 className="w-12 h-12" />
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            <AlertDialogTitle className="text-2xl font-black text-center">
                                {t.adminLessons.deleteLesson}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-center text-lg font-medium text-muted-foreground pt-2">
                                {t.adminLessons.deleteConfirm?.replace("{title}", lessonToDelete?.title || "")}
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter className="flex-row gap-4 sm:justify-center">
                            <AlertDialogCancel className="flex-1 rounded-2xl h-12 border-2 text-lg font-bold hover:bg-muted transition-all">
                                {t.common.cancel}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleDelete();
                                }}
                                disabled={isDeleting}
                                className="flex-1 rounded-2xl h-12 text-lg font-bold shadow-lg bg-destructive hover:bg-destructive/90 shadow-destructive/20 transition-all"
                            >
                                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : t.common.delete}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none rounded-[2rem]">
                    <div className="p-6 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10 flex items-center justify-between">
                        <div>
                            <h2 className="text-white font-black text-xl">{lessonToPreview?.title}</h2>
                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">
                                {lessonToPreview?.video_path ? 'Hosted on Supabase' : 'External URL'}
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setPreviewDialogOpen(false)} className="text-white hover:bg-white/20 rounded-full">
                            <X className="w-6 h-6" />
                        </Button>
                    </div>
                    {lessonToPreview && (
                        <CustomVideoPlayer 
                            videoPath={lessonToPreview.video_path || undefined} 
                            src={lessonToPreview.video_url || undefined}
                            className="w-full h-full"
                            autoPlay
                        />
                    )}
                </DialogContent>
            </Dialog>

        </DashboardLayout>
    );
}
