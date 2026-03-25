import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
    Upload, 
    Video, 
    X, 
    Play, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    Clock, 
    Zap,
    FileVideo
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VideoUploadProProps {
    courseId: string;
    onUploadComplete: (videoPath: string, metadata: VideoMetadata) => void;
    initialVideoPath?: string;
}

export interface VideoMetadata {
    name: string;
    size: number;
    duration: number;
    type: string;
    thumbnail?: string;
}

type UploadState = 'idle' | 'preview' | 'uploading' | 'processing' | 'completed' | 'error';

export default function VideoUploadPro({ courseId, onUploadComplete, initialVideoPath }: VideoUploadProProps) {
    const { t, dir } = useLanguage();
    const { toast } = useToast();
    
    // States
    const [state, setState] = useState<UploadState>(initialVideoPath ? 'completed' : 'idle');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
    const [progress, setProgress] = useState(0);
    const [uploadSpeed, setUploadSpeed] = useState<number>(0); // bytes per second
    const [eta, setEta] = useState<number | null>(null); // seconds
    const [error, setError] = useState<string | null>(null);
    const [videoPath, setVideoPath] = useState<string | null>(initialVideoPath || null);

    // Refs for telemetry
    const lastLoadedRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Clean up preview URL
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return [h, m, s].map(v => v < 10 ? '0' + v : v).filter((v, i) => v !== '00' || i > 0).join(':');
    };

    const formatSpeed = (bps: number) => {
        if (bps < 1024) return `${bps} B/s`;
        if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
        return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
    };

    const handleFileChange = async (selectedFile: File) => {
        if (!selectedFile.type.startsWith('video/')) {
            toast({
                title: t.common.error,
                description: dir === 'rtl' ? "يرجى اختيار ملف فيديو صالح" : "Please select a valid video file",
                variant: "destructive"
            });
            return;
        }

        // Max size 500MB
        if (selectedFile.size > 500 * 1024 * 1024) {
            toast({
                title: t.common.error,
                description: t.adminLessons.maxSizeError,
                variant: "destructive"
            });
            return;
        }

        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
        setFile(selectedFile);
        setState('preview');

        // Extract metadata and generate thumbnail
        const video = document.createElement('video');
        video.src = url;
        video.onloadedmetadata = () => {
            setMetadata({
                name: selectedFile.name,
                size: selectedFile.size,
                duration: video.duration,
                type: selectedFile.type
            });
            
            // Go to 1s for thumbnail
            video.currentTime = Math.min(1.0, video.duration / 2);
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumb = canvas.toDataURL('image/jpeg', 0.8);
            setThumbnailUrl(thumb);
            setMetadata(prev => prev ? { ...prev, thumbnail: thumb } : null);
        };
    };

    const startUpload = async () => {
        if (!file) return;

        setState('uploading');
        setProgress(0);
        setError(null);
        lastTimeRef.current = performance.now();
        lastLoadedRef.current = 0;

        const fileExt = file.name.split('.').pop();
        const fileName = `${courseId}/${Date.now()}.${fileExt}`;

        try {
            const { data, error: uploadError } = await supabase.storage
                .from('course-videos')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type,
                    onUploadProgress: (evt) => {
                        const now = performance.now();
                        const timeDiff = (now - lastTimeRef.current) / 1000; // seconds
                        
                        if (timeDiff >= 0.5) { // Update every 0.5s
                            const loadedDiff = evt.loaded - lastLoadedRef.current;
                            const currentSpeed = loadedDiff / timeDiff;
                            setUploadSpeed(currentSpeed);
                            
                            const remainingBytes = evt.total - evt.loaded;
                            setEta(remainingBytes / currentSpeed);
                            
                            lastTimeRef.current = now;
                            lastLoadedRef.current = evt.loaded;
                        }

                        const p = Math.round((evt.loaded / evt.total) * 100);
                        setProgress(p);
                    }
                } as any);

            if (uploadError) throw uploadError;

            setState('processing');
            // Small delay to simulate processing or just wait for Supabase to reflect consistency
            await new Promise(r => setTimeout(r, 1000));
            
            setVideoPath(fileName);
            setState('completed');
            if (metadata) {
                onUploadComplete(fileName, metadata);
            }

            toast({
                title: t.common.success,
                description: dir === 'rtl' ? "تم رفع الفيديو بنجاح" : "Video uploaded successfully"
            });
        } catch (err: any) {
            console.error("Upload error:", err);
            setError(err.message);
            setState('error');
            toast({
                title: t.common.error,
                description: err.message,
                variant: "destructive"
            });
        }
    };

    const reset = () => {
        setState('idle');
        setFile(null);
        setPreviewUrl(null);
        setMetadata(null);
        setProgress(0);
        setError(null);
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
                {state === 'idle' && (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="relative"
                    >
                        <input
                            type="file"
                            accept="video/*"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                        />
                        <div
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5'); }}
                            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary', 'bg-primary/5'); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                                const droppedFile = e.dataTransfer.files?.[0];
                                if (droppedFile) handleFileChange(droppedFile);
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-[2.5rem] bg-accent/5 cursor-pointer hover:bg-accent/10 border-accent/20 transition-all group"
                        >
                            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-glow">
                                <Upload className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-black mb-2">{dir === 'rtl' ? "اسحب وأفلت الفيديو هنا" : "Drag & Drop Video Here"}</h3>
                            <p className="text-muted-foreground text-sm font-medium opacity-70">
                                {dir === 'rtl' ? "أو انقر لاختيار ملف من جهازك" : "Or click to browse your files"}
                            </p>
                            <div className="flex gap-4 mt-8">
                                <span className="px-3 py-1 rounded-full bg-background border text-[10px] font-bold uppercase tracking-widest opacity-60">MP4</span>
                                <span className="px-3 py-1 rounded-full bg-background border text-[10px] font-bold uppercase tracking-widest opacity-60">WEBM</span>
                                <span className="px-3 py-1 rounded-full bg-background border text-[10px] font-bold uppercase tracking-widest opacity-60">MAX 500MB</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {state === 'preview' && metadata && (
                    <motion.div
                        key="preview"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 rounded-[2.5rem] border border-accent/10 bg-card shadow-2xl space-y-6"
                    >
                        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black relative group shadow-2xl ring-1 ring-white/10">
                            {thumbnailUrl ? (
                                <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                            ) : (
                                <video src={previewUrl!} className="w-full h-full object-contain" />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="secondary" size="icon" className="rounded-full h-16 w-16 bg-white/20 backdrop-blur-xl border border-white/30 text-white" onClick={() => {
                                    const v = document.createElement('video');
                                    v.src = previewUrl!;
                                    v.controls = true;
                                    v.play();
                                    // In a real app, I'd open a modal player here
                                }}>
                                    <Play className="w-8 h-8 fill-white ml-1" />
                                </Button>
                            </div>
                            <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white border border-white/10 uppercase tracking-widest">
                                {dir === 'rtl' ? "معاينة تلقائية" : "Auto Preview"}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-accent/5 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <FileVideo className="w-5 h-5" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{dir === 'rtl' ? "اسم الملف" : "File Name"}</p>
                                    <p className="font-bold truncate">{metadata.name}</p>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-accent/5 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{dir === 'rtl' ? "المدة" : "Duration"}</p>
                                    <p className="font-bold">{formatDuration(metadata.duration)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-accent/10">
                            <Button variant="ghost" onClick={reset} className="h-12 px-6 rounded-xl font-bold">
                                <X className="w-4 h-4 me-2" />
                                {dir === 'rtl' ? "إلغاء واختيار ملف آخر" : "Cancel & Change File"}
                            </Button>
                            <Button onClick={startUpload} className="h-12 px-8 rounded-xl font-bold gradient-primary shadow-glow">
                                <Upload className="w-4 h-4 me-2" />
                                {dir === 'rtl' ? "بدء الرفع الآن" : "Start Upload Now"}
                            </Button>
                        </div>
                    </motion.div>
                )}

                {(state === 'uploading' || state === 'processing') && (
                    <motion.div
                        key="uploading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-8 rounded-[2.5rem] border border-primary/20 bg-primary/5 shadow-2xl space-y-8"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                                    {state === 'uploading' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 animate-pulse" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black">
                                        {state === 'uploading' 
                                            ? (dir === 'rtl' ? "جاري الرفع..." : "Uploading Material...") 
                                            : (dir === 'rtl' ? "جاري المعالجة..." : "Finalizing Upload...")}
                                    </h3>
                                    <p className="text-sm font-medium opacity-60">
                                        {metadata?.name}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-4xl font-black text-primary">{progress}%</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Progress value={progress} className="h-4 rounded-full bg-primary/10" />
                            
                            {state === 'uploading' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2 text-xs font-bold opacity-60">
                                        <Zap className="w-3 h-3 text-yellow-500" />
                                        <span>{formatSpeed(uploadSpeed)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold opacity-60 justify-end">
                                        <Clock className="w-3 h-3 text-blue-500" />
                                        <span>{eta ? (dir === 'rtl' ? `متبقي ${Math.round(eta)} ثانية` : `${Math.round(eta)}s remaining`) : 'Calculating...'}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {state === 'processing' && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="font-bold text-sm">
                                    {dir === 'rtl' ? "جاري تأمين الرابط وجدولة الكورس..." : "Securing link and scheduling materials..."}
                                </span>
                            </div>
                        )}
                    </motion.div>
                )}

                {state === 'completed' && (
                    <motion.div
                        key="completed"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-8 rounded-[2.5rem] border border-green-500/20 bg-green-500/5 text-center space-y-6"
                    >
                        <div className="w-20 h-20 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black">{dir === 'rtl' ? "تم الرفع بنجاح!" : "Upload Complete!"}</h3>
                            <p className="text-muted-foreground font-medium mt-1">
                                {dir === 'rtl' ? "الفيديو الآن جاهز للعرض للطلاب" : "The video is now ready for students"}
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-background border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                                    <Video className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-bold truncate max-w-[200px]">{videoPath}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={reset} className="text-[10px] font-black uppercase tracking-widest hover:text-red-500 transition-colors">
                                {dir === 'rtl' ? "تغيير الملف" : "Replace Video"}
                            </Button>
                        </div>
                    </motion.div>
                )}

                {state === 'error' && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-8 rounded-[2.5rem] border border-destructive/20 bg-destructive/5 text-center space-y-6"
                    >
                        <div className="w-20 h-20 rounded-full bg-destructive text-white flex items-center justify-center mx-auto shadow-lg shadow-destructive/30">
                            <AlertCircle className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black">{dir === 'rtl' ? "فشل الرفع" : "Upload Failed"}</h3>
                            <p className="text-destructive font-medium mt-1">
                                {error || (dir === 'rtl' ? "حدث خطأ غير متوقع" : "An unexpected error occurred")}
                            </p>
                        </div>
                        <div className="flex justify-center gap-4">
                            <Button variant="outline" onClick={reset} className="h-12 px-6 rounded-xl font-bold">
                                {dir === 'rtl' ? "البدء من جديد" : "Start Over"}
                            </Button>
                            <Button onClick={startUpload} className="h-12 px-6 rounded-xl font-bold gradient-primary">
                                {dir === 'rtl' ? "محاولة مرة أخرى" : "Try Again"}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
