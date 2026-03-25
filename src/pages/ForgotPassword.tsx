import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function ForgotPassword() {
    const { t, dir } = useLanguage();
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setEmailSent(true);
            toast({
                title: t.password?.resetEmailSent || "Reset email sent",
                description: t.password?.resetEmailSentDesc || "Check your email for the password reset link",
            });
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

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background" dir={dir}>
            <div className="w-full max-w-md">
                <div className="flex justify-end mb-4">
                    <LanguageSwitcher />
                </div>

                <Card className="border-0 shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-display">
                            {t.password.forgotTitle}
                        </CardTitle>
                        <CardDescription>
                            {t.password.forgotDesc}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {emailSent ? (
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                                    <Mail className="w-8 h-8 text-success" />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">
                                        {t.password.checkEmail}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t.password.resetLinkSent}{" "}
                                        <span className="font-medium">{email}</span>
                                    </p>
                                </div>
                                <Link to="/auth">
                                    <Button variant="outline" className="w-full">
                                        <ArrowLeft className="w-4 h-4 me-2" />
                                        {t.password.backToLogin}
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">{t.auth.email}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <Button type="submit" className="w-full" disabled={loading}>
                                    <Mail className="w-4 h-4 me-2" />
                                    {loading ? t.common.loading : t.password.sendResetLink}
                                </Button>

                                <Link to="/auth">
                                    <Button variant="ghost" className="w-full">
                                        <ArrowLeft className="w-4 h-4 me-2" />
                                        {t.password.backToLogin}
                                    </Button>
                                </Link>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
