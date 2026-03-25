import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  CreditCard, 
  Clock, 
  Layers, 
  ArrowUpRight, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Bell,
  ChevronRight,
  ArrowRight,
  Plus
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface DashboardStats {
  totalStudents: number;
  totalCourses: number;
  activeEnrollments: number;
  pendingPayments: number;
  approvedPayments: number;
  totalRevenue: number;
  activeBatches: number;
}

interface RecentActivity {
  id: string;
  user_name: string;
  course_title: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function AdminDashboard() {
  const { t, language, dir } = useLanguage();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalCourses: 0,
    activeEnrollments: 0,
    pendingPayments: 0,
    approvedPayments: 0,
    totalRevenue: 0,
    activeBatches: 0,
  });
  const [recentRequests, setRecentRequests] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [
        studentsRes, 
        coursesRes, 
        enrollmentsRes, 
        requestsRes,
        batchesRes
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id", { count: "exact", head: true }),
        supabase.from("enrollment_requests").select(`
          id,
          status,
          created_at,
          user_id,
          courses (title),
          profiles!enrollment_requests_user_id_fkey (full_name)
        `).order('created_at', { ascending: false }),
        supabase.from("batches").select("id", { count: "exact", head: true }).eq('is_active', true)
      ]);

      const requestsRaw = (requestsRes.data || []).slice(0, 5);

      const requests = requestsRaw.map(req => ({
        id: req.id,
        user_name: (req.profiles as any)?.full_name || 'Unknown Student',
        course_title: (req.courses as any)?.title || 'Course',
        created_at: req.created_at,
        status: req.status as any
      }));

      const pendingCount = (requestsRes.data || []).filter(r => r.status === 'pending').length;
      const approvedCount = (requestsRes.data || []).filter(r => r.status === 'approved').length;

      setStats({
        totalStudents: studentsRes.count || 0,
        totalCourses: coursesRes.count || 0,
        activeEnrollments: enrollmentsRes.count || 0,
        pendingPayments: pendingCount,
        approvedPayments: approvedCount,
        totalRevenue: 0, // In a real app we'd sum valid prices, but for now we'll mock or keep zero
        activeBatches: batchesRes.count || 0,
      });

      setRecentRequests(requests);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
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
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto pb-12" dir={dir}>
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl font-black font-display tracking-tight mb-2 flex items-center gap-3">
              <span className="bg-primary/10 p-2 rounded-2xl">
                <Activity className="w-8 h-8 text-primary" />
              </span>
              {t.admin.dashboard}
            </h1>
            <p className="text-muted-foreground font-medium text-lg">
              {t.admin.managePlatform}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/courses">
              <Button className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                <Plus className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
                {language === 'ar' ? 'كورس جديد' : 'New Course'}
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Primary Stats Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <StatCard 
            icon={Users} 
            label={t.admin.totalStudents} 
            value={stats.totalStudents} 
            color="bg-blue-500" 
            delay={0}
          />
          <StatCard 
            icon={BookOpen} 
            label={t.admin.coursesCount} 
            value={stats.totalCourses} 
            color="bg-indigo-500" 
            delay={0.1}
          />
          <StatCard 
            icon={Layers} 
            label={t.admin.batches} 
            value={stats.activeBatches} 
            color="bg-emerald-500" 
            delay={0.2}
          />
          <StatCard 
            icon={CreditCard} 
            label={t.adminPayments.title} 
            value={stats.pendingPayments} 
            color="bg-amber-500" 
            badge={stats.pendingPayments > 0 ? (language === 'ar' ? 'تنبيه' : 'Alert') : undefined}
            delay={0.3}
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity Table */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card className="h-full rounded-3xl border-none shadow-xl bg-background/50 backdrop-blur-sm overflow-hidden border border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <Clock className="w-6 h-6 text-primary" />
                    {language === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {language === 'ar' ? 'أحدث طلبات الاشتراك في المنصة' : 'Latest enrollment requests on the platform'}
                  </CardDescription>
                </div>
                <Link to="/admin/payments">
                  <Button variant="ghost" className="rounded-xl font-bold hover:bg-primary/5 text-primary">
                    {t.common.viewAll}
                    <ArrowRight className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0 rtl:rotate-180" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left rtl:text-right">
                    <thead>
                      <tr className="bg-muted/50 border-y border-border/50">
                        <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">{language === 'ar' ? 'الطالب' : 'Student'}</th>
                        <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">{language === 'ar' ? 'الكورس' : 'Course'}</th>
                        <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">{t.common.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {loading ? (
                        Array(5).fill(0).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="px-6 py-4"><div className="h-4 w-24 bg-muted rounded"></div></td>
                            <td className="px-6 py-4"><div className="h-4 w-32 bg-muted rounded"></div></td>
                            <td className="px-6 py-4"><div className="h-6 w-16 bg-muted rounded-full"></div></td>
                          </tr>
                        ))
                      ) : recentRequests.length > 0 ? (
                        recentRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-muted/20 transition-colors group">
                            <td className="px-6 py-4 font-medium text-foreground">{req.user_name}</td>
                            <td className="px-6 py-4 text-muted-foreground">{req.course_title}</td>
                            <td className="px-6 py-4">
                              <StatusBadge status={req.status} t={t} language={language} />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground font-medium">
                            {language === 'ar' ? 'لا يوجد نشاط مؤخراً' : 'No recent activity'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions List */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-6"
          >
            <Card className="rounded-3xl border-none shadow-xl bg-primary/5 border border-primary/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <TrendingUp className="w-32 h-32 text-primary" />
              </div>
              <CardHeader>
                <CardTitle className="text-xl font-bold">{t.admin.quickActions}</CardTitle>
                <CardDescription className="font-medium">{t.admin.quickActionsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 pb-8">
                <QuickLink to="/admin/payments" icon={CreditCard} label={t.adminPayments.title} count={stats.pendingPayments} />
                <QuickLink to="/admin/notifications" icon={Bell} label={t.nav.notifications} />
                <QuickLink to="/admin/users" icon={Users} label={t.nav.users} />
                <QuickLink to="/admin/stats" icon={TrendingUp} label={t.nav.statistics} />
              </CardContent>
            </Card>

            {/* Minor Stats Card */}
            <Card className="rounded-3xl border-none shadow-lg bg-emerald-500 text-white overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <Badge className="bg-white/20 text-white hover:bg-white/30 border-none rounded-lg font-bold">
                    +12% {language === 'ar' ? 'هذا الشهر' : 'This Month'}
                  </Badge>
                </div>
                <p className="text-white/80 font-bold text-sm uppercase tracking-wider">{language === 'ar' ? 'الاشتراكات المكتملة' : 'Completed Enrollments'}</p>
                <h3 className="text-4xl font-black mt-1">{stats.approvedPayments}</h3>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon: Icon, label, value, color, badge, delay }: any) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
      }}
    >
      <Card className="group rounded-3xl border-none shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden relative border border-border/50">
        <div className={`absolute top-0 left-0 w-full h-1.5 ${color}`} />
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className={`p-4 rounded-2xl ${color}/10 ${color.replace('bg-', 'text-')} group-hover:rotate-12 transition-transform duration-500`}>
              <Icon className="w-7 h-7" />
            </div>
            {badge && (
              <Badge variant="destructive" className="animate-pulse rounded-lg font-bold uppercase tracking-tight">
                {badge}
              </Badge>
            )}
          </div>
          <div>
            <h3 className="text-4xl font-black font-display tracking-tight group-hover:scale-105 transition-transform origin-left">{value}</h3>
            <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest mt-1 opacity-80">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function QuickLink({ to, icon: Icon, label, count }: any) {
  return (
    <Link to={to}>
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/50 hover:bg-white dark:bg-card/50 dark:hover:bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 group">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
          <span className="font-bold text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="w-6 h-6 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shadow-md">
              {count}
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status, t, language }: any) {
  const styles = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200/50",
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200/50",
    rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200/50"
  };

  const icons = {
    pending: AlertCircle,
    approved: CheckCircle2,
    rejected: XCircle
  };

  const Icon = icons[status as keyof typeof icons] || AlertCircle;
  const label = t.adminPayments.statusTags[status as keyof typeof t.adminPayments.statusTags] || status;

  return (
    <Badge className={`rounded-lg px-2.5 py-1 font-bold border ${styles[status as keyof typeof styles]} shadow-sm flex items-center gap-1.5 w-fit whitespace-nowrap`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Badge>
  );
}
