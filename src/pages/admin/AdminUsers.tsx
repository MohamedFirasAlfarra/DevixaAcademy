import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    User,
    Mail,
    CheckCircle2,
    Clock,
    ChevronRight,
    GraduationCap,
    BookOpen,
    Calendar,
    Trophy,
    Activity,
    Users,
    Filter,
    ArrowUpDown,
    Trash2,
    Loader2
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
    student_level: string | null;
    total_points: number | null;
    created_at: string;
    user_id: string;
    enrollment_count?: number;
}

interface Enrollment {
    id: string;
    course_id: string;
    progress_percentage: number;
    enrolled_at: string;
    courses: {
        title: string;
    };
}

export default function AdminUsers() {
    const { t, dir, language } = useLanguage();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<Profile[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [userDetails, setUserDetails] = useState<{
        enrollments: Enrollment[];
    }>({ enrollments: [] });
    const [loadingDetails, setLoadingDetails] = useState(false);
    
    // Deletion State
    const [isDeletingUser, setIsDeletingUser] = useState(false);
    const [userToDelete, setUserToDelete] = useState<Profile | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profilesError) throw profilesError;
            
            const { data: enrollments, error: enrollmentsError } = await supabase
                .from('enrollments')
                .select('user_id');

            if (enrollmentsError) throw enrollmentsError;
            
            const transformedData = (profiles || []).map(profile => ({
                ...profile,
                enrollment_count: enrollments?.filter(e => e.user_id === profile.user_id).length || 0
            }));
            
            setUsers(transformedData);
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

    const fetchUserDetails = async (profileId: string) => {
        try {
            setLoadingDetails(true);
            const { data, error } = await supabase
                .from('enrollments')
                .select('*, courses(title)')
                .eq('user_id', profileId);

            if (error) throw error;
            setUserDetails({ enrollments: (data as any) || [] });
        } catch (error: any) {
            toast({
                title: t.common.error,
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleUserClick = (user: Profile) => {
        setSelectedUser(user);
        fetchUserDetails(user.user_id);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            setIsDeletingUser(true);
            
            // Call the Edge Function to delete from Auth + Profiles
            const { data, error } = await supabase.functions.invoke('delete-user', {
                body: { userId: userToDelete.user_id }
            });

            if (error) throw error;

            toast({
                title: language === 'ar' ? 'تم الحذف بنجاح' : 'User Deleted',
                description: language === 'ar' ? 'تم حذف المستخدم نهائياً من النظام.' : 'User has been permanently removed from the system.',
            });

            // Update local state
            setUsers(prev => prev.filter(u => u.user_id !== userToDelete.user_id));
            setUserToDelete(null);

        } catch (error: any) {
            console.error("Delete Error:", error);
            toast({
                title: t.common.error,
                description: error.message || (language === 'ar' ? 'فشل حذف المستخدم' : 'Failed to delete user'),
                variant: "destructive",
            });
        } finally {
            setIsDeletingUser(false);
        }
    };

    const filteredUsers = users.filter(user =>
        (user.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (user.email?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );

    const activeEnrollments = userDetails.enrollments.filter(e => e.progress_percentage < 100);
    const completedEnrollments = userDetails.enrollments.filter(e => e.progress_percentage === 100);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 260, damping: 20 } }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 max-w-7xl mx-auto pb-12" dir={dir}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h1 className="text-4xl font-black font-display tracking-tight mb-2 flex items-center gap-3">
                            <span className="bg-primary/10 p-2 rounded-2xl">
                                <Users className="w-8 h-8 text-primary" />
                            </span>
                            {t.nav.users}
                        </h1>
                        <p className="text-muted-foreground font-medium text-lg">
                            {t.adminUsers.subtitle}
                        </p>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto"
                    >
                        <div className="relative w-full sm:w-80">
                            <Search className={`absolute ${dir === 'rtl' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground`} />
                            <Input
                                placeholder={t.adminUsers.searchPlaceholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`${dir === 'rtl' ? 'pr-12' : 'ps-12'} h-12 rounded-2xl border-border/50 shadow-sm focus:ring-primary/20 transition-all text-lg`}
                            />
                        </div>
                        <Button variant="outline" className="h-12 w-12 p-0 rounded-2xl shrink-0">
                            <Filter className="w-5 h-5" />
                        </Button>
                    </motion.div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-64 rounded-[2rem] bg-muted/50 animate-pulse border-2 border-dashed border-border/30" />
                        ))}
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-[2rem] border-2 border-dashed border-border/50"
                    >
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                            <Search className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <p className="text-xl font-bold text-muted-foreground">{language === 'ar' ? 'لم يتم العثور على مستخدمين' : 'No users found'}</p>
                    </motion.div>
                ) : (
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {filteredUsers.map((user) => (
                            <UserCard 
                                key={user.id} 
                                user={user} 
                                onClick={() => handleUserClick(user)}
                                onDelete={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    setUserToDelete(user);
                                }}
                                variants={itemVariants}
                                language={language}
                                dir={dir}
                                t={t}
                            />
                        ))}
                    </motion.div>
                )}

                {/* Confirm Delete Dialog */}
                <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                    <AlertDialogContent className="rounded-[2rem]">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-black text-foreground">
                                {language === 'ar' ? 'هل أنت متأكد من الحذف النهائي؟' : 'Are you absolutely sure?'}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-base font-medium">
                                {language === 'ar' 
                                    ? `سيتم حذف حساب "${userToDelete?.full_name}" نهائياً من نظام المصادقة ومن قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء.`
                                    : `This will permanently delete ${userToDelete?.full_name}'s account from both the Auth system and the database. This action cannot be undone.`}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-3">
                            <AlertDialogCancel className="rounded-xl border-none bg-muted hover:bg-muted/80 font-bold">
                                {t.common.cancel}
                            </AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleDeleteUser();
                                }}
                                disabled={isDeletingUser}
                                className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold px-6"
                            >
                                {isDeletingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : (language === 'ar' ? 'حذف نهائي' : 'Delete Permanently')}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                    <DialogContent className="max-w-3xl p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl">
                        <div className="bg-primary h-32 relative">
                            <div className="absolute -bottom-16 left-8 rtl:right-8 bg-background p-2 rounded-3xl shadow-xl">
                                <div className="w-28 h-28 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <User className="w-16 h-16" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="pt-20 px-8 pb-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-black">{selectedUser?.full_name || "N/A"}</h2>
                                    <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1">
                                        <Mail className="w-4 h-4" />
                                        {selectedUser?.email}
                                    </p>
                                </div>
                                <Badge className="rounded-xl px-4 py-1.5 font-bold bg-primary/10 text-primary border-none">
                                    {selectedUser?.student_level || 'Beginner'}
                                </Badge>
                            </div>

                            {loadingDetails ? (
                                <div className="space-y-4 py-8">
                                    <div className="h-32 bg-muted animate-pulse rounded-2xl" />
                                    <div className="h-32 bg-muted animate-pulse rounded-2xl" />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 rounded-3xl bg-blue-500/5 border border-blue-500/10 text-center">
                                            <div className="flex justify-center mb-2"><BookOpen className="w-6 h-6 text-blue-500" /></div>
                                            <div className="text-2xl font-black text-blue-500">{activeEnrollments.length}</div>
                                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t.adminUsers.activeCourses}</div>
                                        </div>
                                        <div className="p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                                            <div className="flex justify-center mb-2"><CheckCircle2 className="w-6 h-6 text-emerald-500" /></div>
                                            <div className="text-2xl font-black text-emerald-500">{completedEnrollments.length}</div>
                                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t.adminUsers.completedCourses}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-2 rtl:pl-2">
                                        {userDetails.enrollments.length > 0 ? (
                                            <div className="space-y-4">
                                                <h3 className="text-lg font-bold flex items-center gap-2">
                                                    <Activity className="w-5 h-5 text-primary" />
                                                    {language === 'ar' ? 'سجل التعلم' : 'Learning History'}
                                                </h3>
                                                <div className="space-y-3">
                                                    {userDetails.enrollments.map((enr) => (
                                                        <div key={enr.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2 rounded-lg ${enr.progress_percentage === 100 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                                    {enr.progress_percentage === 100 ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                                                </div>
                                                                <span className="font-bold">{enr.courses.title}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-sm font-bold opacity-60">{enr.progress_percentage}%</span>
                                                                <div className="w-24 h-2 bg-border/50 rounded-full overflow-hidden hidden sm:block">
                                                                    <div 
                                                                        className={`h-full transition-all duration-500 ${enr.progress_percentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                                        style={{ width: `${enr.progress_percentage}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-10 text-center text-muted-foreground font-medium">
                                                {language === 'ar' ? 'لا يوجد كورسات نشطة' : 'No active courses'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}

function UserCard({ user, onClick, onDelete, variants, language, dir, t }: any) {
    const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString(language === 'ar' ? 'ar-SY' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'N/A';

    return (
        <motion.div variants={variants}>
            <Card 
                className="group relative rounded-[2rem] border-none shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden bg-background border border-border/50"
                onClick={onClick}
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 group-hover:bg-primary transition-colors" />
                
                <CardHeader className="pb-4 space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                            <User className="w-8 h-8" />
                        </div>
                        <div className="flex gap-2">
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={onDelete}
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                            <Badge variant="outline" className="rounded-lg border-primary/20 text-primary font-bold px-3 py-1">
                                {user.student_level || 'Beginner'}
                            </Badge>
                        </div>
                    </div>
                    
                    <div>
                        <CardTitle className="text-2xl font-black mb-1 group-hover:text-primary transition-colors">{user.full_name || "Unknown student"}</CardTitle>
                        <CardDescription className="flex items-center gap-2 font-medium text-base">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate">{user.email}</span>
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">
                                {language === 'ar' ? 'الكورسات المشترك بها' : 'Enrolled Courses'}
                            </p>
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-primary" />
                                <span className="text-lg font-black">{user.enrollment_count}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">
                                {language === 'ar' ? 'إجمالي النقاط' : 'Total Points'}
                            </p>
                            <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-500" />
                                <span className="text-lg font-black">{user.total_points || 0}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span className="text-xs font-bold">{joinDate}</span>
                        </div>
                        <div className={`p-2 rounded-full bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 ${dir === 'rtl' ? 'group-hover:-translate-x-2' : 'group-hover:translate-x-2'}`}>
                            <ChevronRight className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
