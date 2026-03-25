import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import {
    BookOpen, ChevronRight, Menu, X, Tag, Home, LogIn, LayoutDashboard, User, GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/common/Logo";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
    const { user, isAdmin } = useAuth();
    const { t, language } = useLanguage();
    const location = useLocation();

    const [isScrolled, setIsScrolled] = React.useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    React.useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav
            className={cn(
                "fixed top-0 left-0 right-0 mx-auto z-50 transition-all duration-500",
                "w-full",
                isScrolled
                    ? "py-2 bg-background/40 backdrop-blur-xl shadow-xl"
                    : cn(
                        "py-3",
                        "dark:bg-black bg-white"
                    )
            )}
        >
            <div className="container mx-auto px-6 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Link to="/">
                        <Logo imageClassName="h-16 md:h-12 lg:h-16" isNavbar />
                    </Link>
                </div>

                {/* Desktop Links - Pill Shaped */}
                <div className="hidden md:block">
                    <div className="flex items-center bg-foreground/5 backdrop-blur-md rounded-full p-1 border border-foreground/10 relative">
                        {[
                            { to: "/", labelAr: "الرئيسية", labelEn: "Home" },
                            { to: "/courses", labelAr: "الدورات", labelEn: "Courses" },
                            { to: "/offers", labelAr: "العروض", labelEn: "Offers" },
                        ].map((link) => {
                            const isActive = location.pathname === link.to;
                            return (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={cn(
                                        "relative px-6 py-2 text-sm font-bold transition-all rounded-full z-10",
                                        isActive ? "text-white" : "text-foreground/70 hover:text-foreground"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-pill"
                                            className="absolute inset-0 bg-primary rounded-full -z-10 shadow-lg"
                                            transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                                        />
                                    )}
                                    {language === "ar" ? link.labelAr : link.labelEn}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <LanguageSwitcher />
                    </div>

                    <div className="hidden xs:block">
                        {user ? (
                            <Link to={isAdmin ? "/admin" : "/dashboard"}>
                                <Button variant="default" className="rounded-full px-4 md:px-6 shadow-glow gradient-primary border-none">
                                    {t.landing.goToDashboard}
                                </Button>
                            </Link>
                        ) : (
                            <Link to="/auth">
                                <Button variant="default" className="rounded-full px-4 md:px-6 shadow-glow gradient-primary border-none">
                                    {t.common.signIn}
                                </Button>
                            </Link>
                        )}
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        className="md:hidden p-2 text-foreground hover:bg-accent/10 rounded-xl transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu with AnimatePresence */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        {/* Mobile Menu Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="fixed inset-0 bg-background/60 backdrop-blur-xl z-[55] md:hidden"
                            onClick={() => setMobileMenuOpen(false)}
                        />

                        {/* Mobile Menu Full Screen Drawer */}
                        <motion.div
                            key="mobile-drawer"
                            initial={{ x: language === "ar" ? "100%" : "-100%", opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: language === "ar" ? "100%" : "-100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className={cn(
                                "fixed inset-0 z-[60] w-full h-[100dvh] bg-background/98 backdrop-blur-3xl border-none md:hidden flex flex-col",
                                language === "ar" ? "right-0" : "left-0"
                            )}
                        >
                            {/* Premium Decorative Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 pointer-events-none" />
                            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-[120px] pointer-events-none translate-y-1/2 -translate-x-1/2" />

                            <div className="relative z-10 flex flex-col h-full p-8 pt-12">
                                {/* Drawer Header */}
                                <div className="flex items-center justify-between shrink-0 mb-8">
                                    <Logo imageClassName="h-20" isNavbar />
                                    <button
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="p-4 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-all active:scale-90"
                                    >
                                        <X className="w-8 h-8" />
                                    </button>
                                </div>

                                <nav className="flex-1 flex flex-col justify-center gap-6 py-12">
                                    {[
                                        { to: "/", icon: Home, label: language === "ar" ? "الرئيسية" : "Home", color: "bg-primary/10 text-primary" },
                                        { to: "/courses", icon: BookOpen, label: language === "ar" ? "الدورات" : "Courses", color: "bg-accent/10 text-accent" },
                                        { to: "/offers", icon: Tag, label: language === "ar" ? "العروض" : "Offers", color: "bg-destructive/10 text-destructive" },
                                        { to: "/my-courses", icon: GraduationCap, label: language === "ar" ? "كورساتي" : "My Courses", color: "bg-blue-500/10 text-blue-500" },
                                        { to: "/profile", icon: User, label: language === "ar" ? "ملفي الشخصي" : "Profile", color: "bg-purple-500/10 text-purple-500" },
                                    ].map((link, idx) => (
                                        <motion.div
                                            key={link.to}
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 * idx + 0.1 }}
                                        >
                                            <Link
                                                to={link.to}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="group flex items-center gap-6 p-4 rounded-3xl hover:bg-foreground/5 transition-all max-w-md mx-auto w-full"
                                            >
                                                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shrink-0 shadow-lg", link.color)}>
                                                    <link.icon className="w-7 h-7" />
                                                </div>
                                                <span className="flex-1 text-2xl font-display font-black tracking-tight">{link.label}</span>
                                                <ChevronRight className={cn("w-6 h-6 opacity-20 group-hover:opacity-100 group-hover:translate-x-2 transition-all", language === "ar" && "rotate-180 group-hover:-translate-x-2")} />
                                            </Link>
                                        </motion.div>
                                    ))}
                                </nav>

                                {/* Auth Button Section */}
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.7 }}
                                    className="shrink-0 pt-8 border-t border-foreground/5"
                                >
                                    <div className="max-w-md mx-auto w-full px-4">
                                        {user ? (
                                            <Link to={isAdmin ? "/admin" : "/dashboard"} onClick={() => setMobileMenuOpen(false)}>
                                                <Button className="w-full rounded-2xl h-20 text-2xl font-display font-black gradient-primary shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all gap-4">
                                                    <LayoutDashboard className="w-8 h-8" />
                                                    {t.landing.goToDashboard}
                                                </Button>
                                            </Link>
                                        ) : (
                                            <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                                                <Button className="w-full rounded-2xl h-20 text-2xl font-display font-black gradient-primary shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all gap-4">
                                                    <LogIn className="w-8 h-8" />
                                                    {t.common.signIn}
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </motion.div>

                                {/* Footer in menu */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.3 }}
                                    transition={{ delay: 0.9 }}
                                    className="shrink-0 pt-12 pb-8 flex flex-col items-center gap-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-px bg-foreground" />
                                        <Logo imageClassName="h-8 grayscale opacity-50" />
                                        <div className="w-12 h-px bg-foreground" />
                                    </div>
                                    <p className="text-xs font-bold tracking-[0.2em] uppercase opacity-60">
                                        © {new Date().getFullYear()} {t.common.brandName}
                                    </p>
                                </motion.div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </nav>
    );
}
