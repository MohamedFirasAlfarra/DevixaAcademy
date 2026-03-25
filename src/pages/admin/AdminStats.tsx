import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, BookOpen, Clock, CheckCircle2, Wallet, FileText, TrendingUp, AlertCircle, Bookmark, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface StatItem {
    title: { ar: string, en: string };
    value: number | string;
    icon: React.ReactNode;
    color: string;
    description?: { ar: string, en: string };
}

export default function AdminStats() {
    const { language, dir } = useLanguage();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalCourses: 0,
        activeEnrollments: 0,
        completedEnrollments: 0,
        pendingPayments: 0,
        approvedPayments: 0,
        rejectedPayments: 0,
        totalQuizzes: 0,
        totalOffers: 0,
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);

            // Fetch Profiles (Students only)
            const { count: studentsCount, error: studentsError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });
            
            if (studentsError) throw studentsError;

            // Fetch Courses
            const { count: coursesCount, error: coursesError } = await supabase
                .from('courses')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            if (coursesError) throw coursesError;

            // Fetch Enrollments (progress < 100 for active, progress == 100 for completed)
            const { data: enrollmentsData, error: enrollmentsError } = await supabase
                .from('enrollments')
                .select('progress_percentage');
            
            if (enrollmentsError) throw enrollmentsError;

            let activeEnr = 0;
            let completedEnr = 0;
            enrollmentsData?.forEach(e => {
                if (e.progress_percentage === 100) completedEnr++;
                else activeEnr++;
            });

            // Fetch Payment Requests (Enrollment Requests)
            const { data: paymentsData, error: paymentsError } = await supabase
                .from('enrollment_requests')
                .select('status');
                
            if (paymentsError) throw paymentsError;

            let pending = 0;
            let approved = 0;
            let rejected = 0;
            paymentsData?.forEach(p => {
                if (p.status === 'pending') pending++;
                else if (p.status === 'approved') approved++;
                else if (p.status === 'rejected') rejected++;
            });

            // Fetch Quizzes count
            const { count: quizzesCount, error: quizzesError } = await supabase
                .from('course_quizzes')
                .select('*', { count: 'exact', head: true });
                
            // Fetch Offers
            const { count: offersCount, error: offersError } = await supabase
                .from('offers')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            setStats({
                totalStudents: studentsCount || 0,
                totalCourses: coursesCount || 0,
                activeEnrollments: activeEnr,
                completedEnrollments: completedEnr,
                pendingPayments: pending,
                approvedPayments: approved,
                rejectedPayments: rejected,
                totalQuizzes: quizzesCount || 0,
                totalOffers: offersCount || 0,
            });

        } catch (error: any) {
            toast({
                title: language === 'ar' ? 'خطأ في جلب الإحصائيات' : 'Error fetching stats',
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    const statCards: StatItem[] = [
        {
            title: { ar: 'إجمالي الطلاب', en: 'Total Students' },
            value: stats.totalStudents,
            icon: <Users className="w-8 h-8" />,
            color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            description: { ar: 'الطلاب المسجلين في المنصة', en: 'Registered students on the platform' }
        },
        {
            title: { ar: 'الدورات النشطة', en: 'Active Courses' },
            value: stats.totalCourses,
            icon: <BookOpen className="w-8 h-8" />,
            color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
            description: { ar: 'الدورات المتاحة حالياً', en: 'Currently available courses' }
        },
        {
            title: { ar: 'الاشتراكات النشطة', en: 'Active Enrollments' },
            value: stats.activeEnrollments,
            icon: <Clock className="w-8 h-8" />,
            color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            description: { ar: 'الاشتراكات قيد التقدم', en: 'Enrollments in progress' }
        },
        {
            title: { ar: 'الاشتراكات المكتملة', en: 'Completed Enrollments' },
            value: stats.completedEnrollments,
            icon: <CheckCircle2 className="w-8 h-8" />,
            color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            description: { ar: 'الاشتراكات التي تم إنهاؤها', en: 'Finished enrollments' }
        },
        {
            title: { ar: 'طلبات الدفع المعلقة', en: 'Pending Payments' },
            value: stats.pendingPayments,
            icon: <AlertCircle className="w-8 h-8" />,
            color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
            description: { ar: 'بانتظار الموافقة', en: 'Awaiting approval' }
        },
        {
            title: { ar: 'طلبات الدفع المقبولة', en: 'Approved Payments' },
            value: stats.approvedPayments,
            icon: <Wallet className="w-8 h-8" />,
            color: 'bg-green-500/10 text-green-500 border-green-500/20',
            description: { ar: 'الطلبات المعتمدة', en: 'Confirmed payments' }
        },
        {
            title: { ar: 'إجمالي الاختبارات', en: 'Total Quizzes' },
            value: stats.totalQuizzes,
            icon: <FileText className="w-8 h-8" />,
            color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
            description: { ar: 'الاختبارات المتاحة', en: 'Available quizzes' }
        },
        {
            title: { ar: 'العروض الفعالة', en: 'Active Offers' },
            value: stats.totalOffers,
            icon: <Bookmark className="w-8 h-8" />,
            color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
            description: { ar: 'الخصومات والعروض الترويجية', en: 'Discounts and promos' }
        }
    ];

    return (
        <DashboardLayout>
            <div className="space-y-8 max-w-7xl mx-auto" dir={dir}>
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                    <div>
                        <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-2">
                            <TrendingUp className="w-8 h-8 text-primary" />
                            {language === 'ar' ? 'إحصائيات المنصة' : 'Platform Statistics'}
                        </h1>
                        <p className="text-muted-foreground">
                            {language === 'ar' ? 'نظرة شاملة على أداء المنصة والنشاط الحالي' : 'Comprehensive overview of platform performance and current activity'}
                        </p>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className="h-40 rounded-2xl bg-muted/50 animate-pulse border border-border" />
                        ))}
                    </div>
                ) : (
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                    >
                        {statCards.map((stat, index) => (
                            <motion.div key={index} variants={itemVariants}>
                                <Card className="group hover:shadow-xl transition-all duration-300 border-border/50 hover:border-primary/20 overflow-hidden relative">
                                    <div className={`absolute top-0 ${dir === 'rtl' ? 'right-0' : 'left-0'} w-1.5 h-full ${stat.color.split(' ')[0].replace('/10', '')}`} />
                                    <CardHeader className="pb-2 pt-6 flex flex-row items-center justify-between space-y-0">
                                        <CardTitle className="text-lg font-bold text-foreground">
                                            {stat.title[language as keyof typeof stat.title]}
                                        </CardTitle>
                                        <div className={`p-3 rounded-2xl ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                                            {stat.icon}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-baseline space-x-2">
                                            <motion.div 
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", delay: 0.2 + (index * 0.1) }}
                                                className="text-4xl font-black tracking-tight"
                                            >
                                                {stat.value}
                                            </motion.div>
                                        </div>
                                        {stat.description && (
                                            <p className="text-sm text-muted-foreground mt-2 font-medium">
                                                {stat.description[language as keyof typeof stat.description]}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {/* Highlight/Chart Section */}
                {!loading && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8"
                    >
                        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden relative">
                             <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Star className="w-5 h-5 text-yellow-500" />
                                    {language === 'ar' ? 'ملخص التقدم' : 'Progress Summary'}
                                </CardTitle>
                                <CardDescription>
                                    {language === 'ar' ? 'نسبة إكمال الدورات للطلاب النشطين' : 'Course completion rate for active students'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center p-8 space-y-6">
                                {/* Visual representation of completion progress */}
                                <div className="relative w-48 h-48 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                        <circle 
                                            cx="50" cy="50" r="40" 
                                            stroke="currentColor" 
                                            strokeWidth="8" 
                                            fill="none" 
                                            className="text-muted/30"
                                        />
                                        <motion.circle 
                                            initial={{ strokeDasharray: "0, 300" }}
                                            animate={{ strokeDasharray: `${(stats.completedEnrollments / (stats.activeEnrollments + stats.completedEnrollments || 1)) * 251.2}, 300` }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            cx="50" cy="50" r="40" 
                                            stroke="currentColor" 
                                            strokeWidth="8" 
                                            fill="none" 
                                            strokeLinecap="round"
                                            className="text-primary"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                        <span className="text-3xl font-black">
                                            {Math.round((stats.completedEnrollments / (stats.activeEnrollments + stats.completedEnrollments || 1)) * 100)}%
                                        </span>
                                        <span className="text-xs text-muted-foreground uppercase tracking-widest mt-1 font-bold">
                                            {language === 'ar' ? 'مكتمل' : 'Completed'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-4 w-full justify-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-primary" />
                                        <span className="text-sm font-medium">{language === 'ar' ? 'مكتمل' : 'Completed'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-muted/40" />
                                        <span className="text-sm font-medium">{language === 'ar' ? 'نشط' : 'Active'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl border-border/50 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Wallet className="w-5 h-5 text-green-500" />
                                    {language === 'ar' ? 'حالة الدفعات' : 'Payments Status'}
                                </CardTitle>
                                <CardDescription>
                                    {language === 'ar' ? 'توزع طلبات الاشتراك والدفعات' : 'Distribution of enrollment and payment requests'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>{language === 'ar' ? 'مقبولة' : 'Approved'} ({stats.approvedPayments})</span>
                                            <span className="text-green-500">
                                                {Math.round((stats.approvedPayments / ((stats.approvedPayments + stats.pendingPayments + stats.rejectedPayments) || 1)) * 100)}%
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(stats.approvedPayments / ((stats.approvedPayments + stats.pendingPayments + stats.rejectedPayments) || 1)) * 100}%` }}
                                                transition={{ duration: 1, delay: 0.5 }}
                                                className="h-full bg-green-500 rounded-full"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>{language === 'ar' ? 'قيد الانتظار' : 'Pending'} ({stats.pendingPayments})</span>
                                            <span className="text-orange-500">
                                                {Math.round((stats.pendingPayments / ((stats.approvedPayments + stats.pendingPayments + stats.rejectedPayments) || 1)) * 100)}%
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(stats.pendingPayments / ((stats.approvedPayments + stats.pendingPayments + stats.rejectedPayments) || 1)) * 100}%` }}
                                                transition={{ duration: 1, delay: 0.7 }}
                                                className="h-full bg-orange-500 rounded-full"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>{language === 'ar' ? 'مرفوضة' : 'Rejected'} ({stats.rejectedPayments})</span>
                                            <span className="text-destructive">
                                                {Math.round((stats.rejectedPayments / ((stats.approvedPayments + stats.pendingPayments + stats.rejectedPayments) || 1)) * 100)}%
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(stats.rejectedPayments / ((stats.approvedPayments + stats.pendingPayments + stats.rejectedPayments) || 1)) * 100}%` }}
                                                transition={{ duration: 1, delay: 0.9 }}
                                                className="h-full bg-destructive rounded-full"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </div>
        </DashboardLayout>
    );
}
