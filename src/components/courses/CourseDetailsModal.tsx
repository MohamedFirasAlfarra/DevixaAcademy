import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookOpen, Clock, Users, Star, Award, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import CommentSection from "./CommentSection";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Course {
    id: string;
    title: string;
    description: string;
    total_hours: number;
    sessions_count: number;
    price: number;
    price_syp: number;
    image_url: string | null;
}

interface CourseDetailsModalProps {
    course: Course | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function CourseDetailsModal({ course, isOpen, onClose }: CourseDetailsModalProps) {
    const { t } = useLanguage();

    if (!course) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden border-none bg-background shadow-2xl">
                <div className="flex flex-col h-full max-h-[90vh]">
                    {/* Header/Hero Section */}
                    <div className="relative h-48 md:h-64 gradient-hero flex items-center justify-center shrink-0">
                        {course.image_url ? (
                            <img
                                src={course.image_url}
                                alt={course.title}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        ) : (
                            <BookOpen className="w-20 h-20 text-white/40 relative z-10" />
                        )}
                        <div className="absolute inset-0 bg-black/40" />
                        <div className="absolute bottom-4 left-6 right-6 z-10">
                            <Badge className="mb-2 bg-white/20 hover:bg-white/30 text-white border-white/40 backdrop-blur-md">
                                {course.total_hours} {t.common.hours}
                            </Badge>
                            <DialogTitle className="text-2xl md:text-3xl font-bold text-white drop-shadow-md">
                                {course.title}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                {course.description || "Course details and information"}
                            </DialogDescription>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 overflow-y-auto">
                        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Content */}
                            <div className="lg:col-span-2 space-y-8">
                                <div>
                                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-primary" />
                                        {t.adminCourses.description}
                                    </h3>
                                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                        {course.description || "No description available for this course yet."}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
                                        <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
                                        <div className="text-sm font-bold">{course.total_hours}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.common.hours}</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-accent/5 border border-accent/10 text-center">
                                        <Users className="w-5 h-5 mx-auto mb-2 text-accent" />
                                        <div className="text-sm font-bold">{course.sessions_count}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.common.sessions}</div>
                                    </div>
                                </div>

                                {/* Comments Section */}
                                <div className="pt-4 border-t">
                                    <CommentSection courseId={course.id} />
                                </div>
                            </div>

                            {/* Sidebar/CTA Area */}
                            <div className="lg:col-span-1">
                                <div className="sticky top-0 space-y-4">
                                    <div className="p-6 rounded-2xl border bg-card shadow-sm space-y-6">
                                        <div>
                                            <div className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
                                                {t.adminCourses.price}
                                            </div>
                                            <div className="text-4xl font-extrabold text-foreground">
                                                ${course.price.toFixed(0)}
                                            </div>
                                            <div className="text-xl font-bold text-muted-foreground mt-1">
                                                {Number(course.price_syp || 0).toLocaleString()} ل.س
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground italic">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                <span>Lifetime access to course materials</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground italic">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                <span>Official certificate of completion</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground italic">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                <span>Interactive live sessions</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
