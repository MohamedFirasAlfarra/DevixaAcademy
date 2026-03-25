import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import Logo from "@/components/common/Logo";
import {
  FiMail,
  FiLock,
  FiUser,
  FiCheck,
  FiCode,
  FiAward,
  FiLayout,
  FiTag,
  FiEye,
  FiEyeOff
} from "react-icons/fi";
import { FaHtml5, FaCss3Alt, FaReact, FaDatabase, FaGoogle } from "react-icons/fa";
import { IoLogoJavascript } from "react-icons/io5";

const FloatingInput = ({ label, id, type, value, onChange, error, icon: Icon, dir }: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="relative mb-6 group">
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300
        ${isFocused ? "border-primary ring-2 ring-primary/20 bg-background/50" : "border-border bg-muted/30"}
        ${error ? "border-destructive ring-destructive/20" : ""}
      `}>
        {Icon && <Icon className={`transition-colors duration-300 ${isFocused ? "text-primary" : "text-muted-foreground"}`} />}
        <div className="relative flex-1">
          <input
            id={id}
            type={inputType}
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder=" "
            className="w-full bg-transparent border-none focus:ring-0 p-0 text-foreground placeholder-transparent"
          />
          <Label
            htmlFor={id}
            className={`
              absolute transition-all duration-300 pointer-events-none
              ${(isFocused || value)
                ? "-top-2 text-xs text-primary font-bold bg-background px-1"
                : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"}
              ${dir === "rtl" ? "right-0" : "left-0"}
              ${(isFocused || value) && (dir === "rtl" ? "right-1" : "left-1")}
            `}
          >
            {label}
          </Label>
        </div>
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-xs text-destructive mt-1 ml-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Auth() {
  const { t, dir, language } = useLanguage();
  const { theme } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const authSchema = z.object({
    email: z.string().email(t.validation.emailInvalid).max(255),
    password: z.string().min(6, t.validation.passwordMin).max(100),
    fullName: isLogin ? z.string().optional() : z.string().min(1, "Full name is required").max(100),
    confirmPassword: isLogin ? z.string().optional() : z.string().min(1, "Please confirm your password")
  }).refine((data) => isLogin || data.password === data.confirmPassword, {
    message: t.password.mismatch,
    path: ["confirmPassword"]
  });

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const validateForm = () => {
    try {
      authSchema.parse({
        email,
        password,
        fullName,
        confirmPassword
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast({ title: t.auth.loginSuccess, description: t.auth.loginSuccessDesc });
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        toast({ title: t.auth.accountCreated, description: t.auth.accountCreatedDesc });
      }
      navigate("/dashboard");
    } catch (error: any) {
      let errorMessage = error.message;

      // Handle common Supabase auth errors to display bilingual/RTL friendly messages
      if (errorMessage?.toLowerCase().includes("invalid login credentials")) {
        errorMessage = language === "ar" ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password";
      } else if (errorMessage?.toLowerCase().includes("user already registered")) {
        errorMessage = language === "ar" ? "هذا البريد الإلكتروني مسجل مسبقاً" : "Email already registered";
      }

      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: errorMessage || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.message || "Could not sign in with Google",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  const features = [
    { icon: FiCode, text: t.auth.features.modernCourses },
    { icon: FiAward, text: t.auth.features.beginnerToPro },
    { icon: FiLayout, text: t.auth.features.practicalProjects },
    { icon: FiTag, text: t.auth.features.affordablePrice },
  ];

  const techIcons = [
    { icon: FaHtml5, color: "text-orange-500" },
    { icon: FaCss3Alt, color: "text-blue-500" },
    { icon: IoLogoJavascript, color: "text-yellow-400" },
    { icon: FaReact, color: "text-blue-400" },
    { icon: FaDatabase, color: "text-slate-500" },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background" dir={dir}>
      {/* Left side - Design Section */}
      <div className="relative overflow-hidden w-full md:w-1/2 min-h-[40vh] md:min-h-screen bg-gradient-to-br from-primary/95 to-secondary/90 dark:from-primary/20 dark:to-background p-8 md:p-16 flex flex-col justify-between items-start">
        {/* Animated Shapes */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-secondary/20 rounded-full blur-3xl opacity-50" />

        <div className="relative z-10 w-full mb-12">
          <Logo imageClassName="h-16 w-auto mb-8 filter brightness-0 invert dark:brightness-100 dark:invert-0" />
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4">
              {t.auth.welcomeTitle}
            </h1>
            <p className="text-xl text-white/80 max-w-md">
              {t.auth.welcomeSubtitle}
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 space-y-6 mb-12">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="flex items-center gap-4 text-white"
            >
              <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
                <feature.icon className="w-5 h-5" />
              </div>
              <span className="text-lg font-medium opacity-90">{feature.text}</span>
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 w-full flex items-center gap-6 mt-auto">
          {techIcons.map((tech, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.2, rotate: 10 }}
              className={`p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 ${tech.color} text-2xl shadow-xl`}
            >
              <tech.icon />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
        <div className="absolute top-8 right-8 z-50">
          <LanguageSwitcher />
        </div>

        <motion.div
          className="w-full max-w-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-bold mb-2">
              {isLogin ? t.auth.welcomeBack : t.auth.createAccount}
            </h2>
            <p className="text-muted-foreground">
              {isLogin ? t.auth.loginDesc : t.auth.signupDesc}
            </p>
          </div>

          <Card className="border-border/50 bg-background/50 backdrop-blur-xl shadow-2xl relative overflow-hidden rounded-2xl">
            {/* Background Blur Spot */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-50" />

            <CardContent className="pt-8 px-6 md:px-10 pb-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isLogin ? "login" : "signup"}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <AnimatePresence>
                      {!isLogin && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <FloatingInput
                            id="fullName"
                            type="text"
                            label={t.auth.fullName}
                            value={fullName}
                            onChange={(e: any) => setFullName(e.target.value)}
                            error={errors.fullName}
                            icon={FiUser}
                            dir={dir}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <FloatingInput
                      id="email"
                      type="email"
                      label={t.auth.email}
                      value={email}
                      onChange={(e: any) => setEmail(e.target.value)}
                      error={errors.email}
                      icon={FiMail}
                      dir={dir}
                    />

                    <FloatingInput
                      id="password"
                      type="password"
                      label={t.auth.password}
                      value={password}
                      onChange={(e: any) => setPassword(e.target.value)}
                      error={errors.password}
                      icon={FiLock}
                      dir={dir}
                    />

                    {!isLogin && (
                      <FloatingInput
                        id="confirmPassword"
                        type="password"
                        label={t.auth.confirmPassword}
                        value={confirmPassword}
                        onChange={(e: any) => setConfirmPassword(e.target.value)}
                        error={errors.confirmPassword}
                        icon={FiLock}
                        dir={dir}
                      />
                    )}

                    {isLogin && (
                      <div className="flex items-center justify-end py-1">
                        <Link
                          to="/forgot-password"
                          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          {t.password.forgotTitle}
                        </Link>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl text-lg font-bold gradient-primary hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg text-white"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t.auth.pleaseWait}
                        </div>
                      ) : (
                        isLogin ? t.common.signIn : t.common.signUp
                      )}
                    </Button>
                  </form>

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground whitespace-nowrap">
                        {language === 'ar' ? "أو المتابعة باستخدام" : "Or continue with"}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-xl font-medium flex items-center justify-center gap-3 hover:bg-muted/50 border && border-border active:scale-[0.98] transition-all"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                  >
                    {googleLoading ? (
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <>
                        <FaGoogle className="text-red-500" />
                        {t.auth.continueWithGoogle}
                      </>
                    )}
                  </Button>

                  <div className="mt-8 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(!isLogin);
                        setErrors({});
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors font-medium flex items-center justify-center gap-1 w-full"
                    >
                      {isLogin ? (
                        <>
                          {t.auth.noAccount.split('?')[0]}? <span className="text-primary font-bold">{t.auth.noAccount.split('?')[1]}</span>
                        </>
                      ) : (
                        <>
                          {t.auth.hasAccount.split('?')[0]}? <span className="text-primary font-bold">{t.auth.hasAccount.split('?')[1]}</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
