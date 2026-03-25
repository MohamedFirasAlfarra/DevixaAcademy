import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Calendar, Save, Lock, Award, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function Profile() {
    const { user, profile, refreshProfile, isAdmin } = useAuth();
    const { t } = useLanguage();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || "");
    const [saving, setSaving] = useState(false);
    const [examAttempts, setExamAttempts] = useState<any[]>([]);
    const [loadingExams, setLoadingExams] = useState(true);

    useEffect(() => {
        if (user) {
            fetchExamAttempts();
        }
    }, [user]);

    const fetchExamAttempts = async () => {
        try {
            const { data, error } = await supabase
                .from("quiz_attempts")
                .select(`
                    id,
                    score,
                    passed,
                    created_at,
                    course_quizzes (
                        title,
                        courses (
                            title
                        )
                    )
                `)
                .eq("user_id", user?.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setExamAttempts(data || []);
        } catch (error) {
            console.error("Error fetching exam attempts:", error);
        } finally {
            setLoadingExams(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const { error } = await supabase
                .from("profiles")
                .update({ full_name: fullName.trim() })
                .eq("user_id", user?.id);

            if (error) throw error;

            await refreshProfile();

            toast({
                title: t.profile?.updateSuccess || "Profile updated",
                description: t.profile?.updateSuccessDesc || "Your profile has been updated successfully",
            });
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

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-display font-bold mb-2">{t.profile.title}</h1>
                    <p className="text-muted-foreground">
                        {t.profile.subtitle}
                    </p>
                </div>

                {/* Avatar and Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t.profile.personalInfo}</CardTitle>
                        <CardDescription>
                            {t.profile.personalInfoDesc}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Edit Form */}
                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">
                                    <User className="w-4 h-4 inline me-2" />
                                    {t.auth.fullName}
                                </Label>
                                <Input
                                    id="fullName"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Enter your full name"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">
                                    <Mail className="w-4 h-4 inline me-2" />
                                    {t.auth.email}
                                </Label>
                                <Input
                                    id="email"
                                    value={profile?.email || user?.email || ""}
                                    disabled
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t.profile?.emailHint || "Email cannot be changed"}
                                </p>
                            </div>

                            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                                <Save className="w-4 h-4 me-2" />
                                {saving ? t.common.save + "..." : t.common.save}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Account Stats */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t.profile.accountStats}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-accent/5 border border-accent/10">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="w-4 h-4 text-accent" />
                                    <span className="text-sm font-medium text-muted-foreground">
                                        {t.profile.memberSince}
                                    </span>
                                </div>
                                <div className="text-2xl font-bold">
                                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                                </div>
                            </div>

                            <div className="p-4 rounded-lg bg-secondary/50 border border-secondary">
                                <div className="flex items-center gap-2 mb-1">
                                    <User className="w-4 h-4 text-secondary-foreground" />
                                    <span className="text-sm font-medium text-muted-foreground">
                                        {t.profile?.accountType || "Account Type"}
                                    </span>
                                </div>
                                <div className="text-2xl font-bold capitalize">
                                    {isAdmin ? (t.profile?.admin || "Admin") : (t.profile?.student || "Student")}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Security */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t.profile.security}</CardTitle>
                        <CardDescription>
                            {t.profile.securityDesc}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            onClick={() => navigate("/change-password")}
                            className="w-full sm:w-auto"
                        >
                            <Lock className="w-4 h-4 me-2" />
                            {t.profile.changePassword}
                        </Button>
                    </CardContent>
                </Card>

                {/* My Exams History */}
                <Card className="rounded-[2rem] overflow-hidden border-accent/10 shadow-lg">
                    <CardHeader className="bg-primary/5 border-b">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <Award className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black">{t.nav.exams}</CardTitle>
                                <CardDescription>{t.adminExams.subtitle}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loadingExams ? (
                            <div className="p-12 text-center text-muted-foreground animate-pulse">
                                {t.common.loading}...
                            </div>
                        ) : examAttempts.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                                <p className="font-medium">{t.adminExams.noExam}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-accent/5">
                                {examAttempts.map((attempt) => (
                                    <div key={attempt.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                                        <div className="space-y-1">
                                            <h4 className="font-black text-lg">
                                                {attempt.course_quizzes?.courses?.title || attempt.course_quizzes?.title}
                                            </h4>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(attempt.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="text-2xl font-black text-primary">
                                                    {attempt.score}%
                                                </div>
                                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                    {t.exam.score.split(':')[0]}
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-black text-sm ${attempt.passed
                                                ? "bg-success/10 text-success"
                                                : "bg-destructive/10 text-destructive"
                                                }`}>
                                                {attempt.passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                {attempt.passed ? t.exam.passed : t.exam.failed}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
