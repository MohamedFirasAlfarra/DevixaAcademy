import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    BookOpen, Clock, Users, Star, CheckCircle2,
    Wallet, CreditCard, Send, ShieldCheck,
    ChevronRight, ChevronLeft, Loader2, Info, Award
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import CommentSection from "@/components/courses/CommentSection";
import CourseCheckoutModal from "@/components/courses/CourseCheckoutModal";
import CountdownTimer from "@/components/common/CountdownTimer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import LoadingScreen from "@/components/common/LoadingScreen";
import type { Tables } from "@/integrations/supabase/types";

type Course = Tables<"courses">;
type Offer = Tables<"offers">;

export default function CourseDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, profile, refreshProfile } = useAuth();
    const { t, dir, language } = useLanguage();
    const { toast } = useToast();

    const [course, setCourse] = useState<Course | null>(null);
    const [offer, setOffer] = useState<Offer | null>(null);
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);

    useEffect(() => {
        if (id) {
            fetchCourseData();
        }
    }, [id]);

    const fetchCourseData = async () => {
        try {
            setLoading(true);
            const { data: courseData, error: courseError } = await supabase
                .from("courses")
                .select("*")
                .eq("id", id)
                .single();

            if (courseError) throw courseError;
            setCourse(courseData);

            const { data: offerData } = await supabase
                .from("offers")
                .select("*")
                .eq("course_id", id)
                .eq("is_active", true)
                .maybeSingle();

            setOffer(offerData);
        } catch (error) {
            console.error("Error fetching course details:", error);
            toast({
                title: t.common.error,
                description: "Could not load course details",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEnrollmentSuccess = () => {
        // Don't close the modal here, let the user see the success animation
        // and close it manually using the "Close & Return" button.
    };

    if (loading) {
        return <LoadingScreen />;
    }

    if (!course) {
        return (
            <DashboardLayout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Info className="w-10 h-10 text-destructive" />
                    </div>
                    <h1 className="text-3xl font-display font-black">Course Not Found</h1>
                    <Button onClick={() => navigate("/courses")} variant="outline" className="rounded-xl px-8">
                        Back to Courses
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    const originalPrice = Number(course.price || 0);
    const discountedPrice = offer
        ? originalPrice * (1 - offer.discount_percentage / 100)
        : originalPrice;

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                {/* Navigation Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground/60 transition-opacity hover:opacity-100">
                    <button onClick={() => navigate("/courses")} className="hover:text-primary transition-colors flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {t.courses.title}
                    </button>
                    {dir === "rtl" ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="text-foreground font-semibold truncate max-w-[250px]">{course.title}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-12">
                        {/* Hero / Preview Section */}
                        <div className="space-y-6">
                            <div className="relative group rounded-[3rem] overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] border border-white/5 bg-black">
                                <div className="aspect-video relative overflow-hidden">
                                    {course.image_url ? (
                                        <img
                                            src={course.image_url}
                                            alt={course.title}
                                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-60"
                                        />
                                    ) : (
                                        <div className="w-full h-full gradient-primary opacity-40 flex items-center justify-center">
                                            <BookOpen className="w-24 h-24 text-white/30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-20 h-20 rounded-full glass-dark flex items-center justify-center text-white hover:scale-110 hover:gradient-primary transition-all cursor-pointer group/play shadow-glow">
                                            <Play className="w-8 h-8 fill-white ms-1 group-hover/play:scale-110" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                                        <div className="glass px-4 py-2 rounded-full text-xs font-bold text-white flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                            {t.courseDetails.previewVideo}
                                        </div>
                                        {offer && (
                                            <Badge className="bg-destructive text-white border-none py-1.5 px-4 text-sm font-black shadow-glow-destructive animate-bounce">
                                                {offer.discount_percentage}% {t.courses.off}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 px-2">
                                <h1 className="text-4xl md:text-6xl font-display font-black text-foreground leading-[1.1] tracking-tight">
                                    {course.title}
                                </h1>
                                <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl italic">
                                    {t.auth.welcomeSubtitle}
                                </p>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard icon={Clock} value={course.total_hours} label={t.common.hours} color="text-primary" />
                            <StatCard icon={Users} value={course.sessions_count} label={t.common.sessions} color="text-accent" />
                            <StatCard icon={Star} value="4.9/5" label="Rating" color="text-yellow-500" />
                            <StatCard icon={Award} value="Check" label={t.courseDetails.officialCertificate} color="text-green-500" />
                        </div>

                        {/* What you will learn */}
                        <div className="bg-card border border-white/5 p-10 rounded-[3rem] shadow-xl space-y-8 relative overflow-hidden group">
                           <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all" />
                           <h2 className="text-2xl font-display font-black flex items-center gap-3">
                               <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white">
                                   <CheckCircle2 className="w-6 h-6" />
                               </div>
                               {t.courseDetails.whatYouWillLearn}
                           </h2>
                           <div className="grid md:grid-cols-2 gap-4">
                               {[1, 2, 3, 4, 5, 6].map((i) => (
                                   <div key={i} className="flex items-start gap-3 p-4 rounded-2xl hover:bg-primary/5 transition-colors">
                                       <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                       <span className="text-muted-foreground font-medium">Learning outcome {i} - Pro technical skill description</span>
                                   </div>
                               ))}
                           </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-8 bg-card/50 border border-white/5 p-10 rounded-[3rem] shadow-inner backdrop-blur-sm">
                            <h2 className="text-2xl font-display font-black flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                    <Info className="w-6 h-6" />
                                </div>
                                {t.adminCourses.description}
                            </h2>
                            <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {course.description || "Course description will be updated soon with full details about the curriculum and projects."}
                            </p>
                        </div>

                        {/* Instructor Profile */}
                        <div className="p-10 rounded-[3rem] glass-dark border-white/5 space-y-8">
                            <h2 className="text-2xl font-display font-black">{t.courseDetails.instructor}</h2>
                            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-start">
                                <div className="w-32 h-32 rounded-[2rem] gradient-primary flex items-center justify-center text-white text-5xl font-black shadow-glow shrink-0">
                                    D
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-3xl font-display font-black">Devixa Academy Expert</h3>
                                    <p className="text-lg text-white/60 leading-relaxed max-w-xl">
                                        {t.courseDetails.instructorDesc} Specialized in modern programming, networking, and security.
                                    </p>
                                    <div className="flex gap-4 justify-center md:justify-start">
                                        <div className="flex items-center gap-1 text-sm font-bold text-primary">
                                            <Users className="w-4 h-4" /> 5,000+ Students
                                        </div>
                                        <div className="flex items-center gap-1 text-sm font-bold text-yellow-500">
                                            <Star className="w-4 h-4 fill-yellow-500" /> 4.9 Rating
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Comments Section */}
                        <div className="bg-card border border-white/5 p-10 rounded-[3rem] shadow-xl">
                            <CommentSection courseId={course.id} />
                        </div>
                    </div>

                    {/* Pricing & CTA Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-12 space-y-8">
                            <div className="p-10 rounded-[3rem] border border-white/10 bg-card shadow-[-20px_20px_60px_rgba(0,0,0,0.3)] space-y-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-primary/20 transition-all" />

                                <div className="space-y-4 relative z-10">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-[10px] font-black uppercase tracking-widest border border-destructive/20 animate-pulse">
                                        <Tag className="w-3 h-3" />
                                        {t.courseDetails.limitedSeats}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-baseline gap-3">
                                            <div className="text-6xl font-display font-black text-foreground tracking-tighter">
                                                ${discountedPrice.toFixed(0)}
                                            </div>
                                            {offer && (
                                                <div className="text-2xl font-bold text-muted-foreground line-through opacity-40">
                                                    ${originalPrice}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-2xl font-bold text-primary opacity-80">
                                            {Number(course.price_syp || 0).toLocaleString()} ل.س
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                                        <Users className="w-3 h-3 text-primary" />
                                        {t.courseDetails.studentsEnrolled.replace('{count}', '1,240')}
                                    </p>
                                </div>

                                {offer?.expires_at && (
                                    <div className="p-6 rounded-3xl bg-destructive/5 border border-destructive/10 space-y-3 shadow-inner">
                                        <div className="text-[10px] font-black uppercase text-destructive tracking-[0.2em] flex items-center gap-2">
                                            <Clock className="w-3 h-3" />
                                            {t.courses.endsIn}
                                        </div>
                                        <CountdownTimer expiryDate={offer.expires_at} />
                                    </div>
                                )}

                                <div className="space-y-6 pt-4 relative z-10">
                                    <Button
                                        onClick={() => setPaymentModalOpen(true)}
                                        className="w-full h-20 rounded-2xl text-2xl font-display font-black gradient-primary shadow-glow hover:scale-[1.03] active:scale-[0.98] transition-all hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.5)]"
                                    >
                                        {t.courses.enroll}
                                    </Button>

                                    <div className="space-y-4">
                                        <BenefitItem icon={ShieldCheck} text={t.courseDetails.lifetimeAccess} />
                                        <BenefitItem icon={Briefcase} text={t.courseDetails.practicalTraining} />
                                        <BenefitItem icon={Award} text={t.courseDetails.officialCertificate} />
                                        <BenefitItem icon={BookOpen} text="Downloadable Materials" />
                                    </div>
                                </div>
                            </div>

                            {/* Trust Signals Under Sidebar */}
                            <div className="p-6 text-center space-y-4 opacity-60">
                                <p className="text-xs font-bold uppercase tracking-widest">{t.landing.testimonials.title}</p>
                                <div className="flex justify-center -space-x-3">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="w-10 h-10 rounded-full border-4 border-background bg-secondary flex items-center justify-center font-bold text-[10px]">U{i}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Selection Modal */}
            <CourseCheckoutModal
                isOpen={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                courseId={course.id}
                courseTitle={course.title}
                onSuccess={handleEnrollmentSuccess}
            />
        </DashboardLayout>
    );
}

function StatCard({ icon: Icon, value, label, color }: { icon: any, value: any, label: string, color: string }) {
    return (
        <div className="p-8 rounded-[2.5rem] bg-card border border-white/5 shadow-lg group hover:bg-secondary/20 transition-all hover-lift">
            <Icon className={cn("w-8 h-8 mx-auto mb-4 group-hover:scale-125 transition-transform duration-500", color)} />
            <div className="text-2xl font-black text-center">{value}</div>
            <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground text-center mt-1">{label}</div>
        </div>
    );
}

function BenefitItem({ icon: Icon, text }: { icon: any, text: string }) {
    return (
        <div className="flex items-center gap-4 text-sm text-foreground/80 font-bold group/item cursor-default">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover/item:gradient-primary group-hover/item:text-white transition-all">
                <Icon className="w-4 h-4" />
            </div>
            <span className="group-hover/item:text-primary transition-colors">{text}</span>
        </div>
    );
}
