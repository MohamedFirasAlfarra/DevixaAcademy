import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronRight, Instagram } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/common/Logo";

export default function Footer() {
    const { t, dir, language } = useLanguage();

    return (
        <footer
            className="relative overflow-hidden"
            style={{ backgroundColor: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border) / 0.15)" }}
        >
            {/* Accent top line */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            {/* Main 4-column grid */}
            <div className="container mx-auto px-6 py-16">
                <div
                    className={cn(
                        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12",
                        dir === "rtl" ? "lg:flex lg:flex-row-reverse" : "lg:grid"
                    )}
                >
                    {/* ── Col 1: Logo + About ── */}
                    <div className="flex flex-col gap-5" style={{ animation: "footerFadeUp 0.6s ease both", animationDelay: "0ms" }}>
                        <Link to="/" className="inline-block w-fit hover:scale-105 transition-transform duration-300">
                            <Logo imageClassName="h-20 md:h-32" />
                        </Link>
                        <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
                            {language === "ar"
                                ? "منصة تعليمية متخصصة في البرمجة والتكنولوجيا. نبني جيل المطوّرين القادم بأحدث المناهج وأفضل المدرّبين."
                                : "A specialized learning platform for programming & tech. We build the next generation of developers with cutting-edge curricula."}
                        </p>
                        <Link
                            to="/courses"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold transition-all duration-200 hover:gap-2.5 group w-fit"
                            style={{ color: "hsl(var(--primary))" }}
                        >
                            {language === "ar" ? "اقرأ المزيد" : "read more"}
                            <ChevronRight className={cn("w-4 h-4 transition-transform duration-200", dir === "rtl" ? "rotate-180 group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5")} />
                        </Link>
                    </div>

                    {/* ── Col 2: Quick Links ── */}
                    <div className="flex flex-col gap-5" style={{ animation: "footerFadeUp 0.6s ease both", animationDelay: "80ms" }}>
                        <h4 className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: "hsl(var(--foreground))" }}>
                            {language === "ar" ? "روابط سريعة" : "QUICK LINKS"}
                        </h4>
                        <ul className="flex flex-col gap-3.5">
                            {[
                                { label: language === "ar" ? "الرئيسية" : "Home", to: "/" },
                                { label: language === "ar" ? "الدورات" : "Courses", to: "/courses" },
                                { label: language === "ar" ? "العروض المميزة" : "Special Offers", to: "/offers" },
                                { label: language === "ar" ? "تسجيل الدخول" : "Sign In", to: "/auth" },
                            ].map((link, i) => (
                                <li key={link.to} style={{ animation: "footerFadeUp 0.5s ease both", animationDelay: `${120 + i * 60}ms` }}>
                                    <Link
                                        to={link.to}
                                        className="text-sm transition-all duration-200 group flex items-center gap-2 hover:ps-1"
                                        style={{ color: "hsl(var(--muted-foreground))" }}
                                    >
                                        <span
                                            className="w-0 group-hover:w-3 h-px transition-all duration-300 flex-shrink-0"
                                            style={{ backgroundColor: "hsl(var(--primary))" }}
                                        />
                                        <span className="group-hover:text-foreground transition-colors duration-200">{link.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* ── Col 3: Tag Cloud ── */}
                    <div className="flex flex-col gap-5" style={{ animation: "footerFadeUp 0.6s ease both", animationDelay: "160ms" }}>
                        <h4 className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: "hsl(var(--foreground))" }}>
                            {language === "ar" ? "مجالاتنا" : "TAG CLOUD"}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {(language === "ar"
                                ? ["ويب", "موبايل", "UI/UX", "ICDL", "برمجة", "فلاتر", "تصميم", "ذكاء اصطناعي"]
                                : ["Web", "Mobile", "UI/UX", "ICDL", "Flutter", "React", "Design", "AI"]
                            ).map((tag, i) => (
                                <span
                                    key={tag}
                                    className="px-3 py-1.5 text-xs font-semibold rounded border cursor-default transition-all duration-200 hover:scale-105 hover:-translate-y-0.5"
                                    style={{
                                        animation: "footerFadeUp 0.5s ease both",
                                        animationDelay: `${200 + i * 40}ms`,
                                        color: "hsl(var(--muted-foreground))",
                                        borderColor: "hsl(var(--border) / 0.6)",
                                        backgroundColor: "hsl(var(--background) / 0.4)",
                                    }}
                                    onMouseEnter={e => {
                                        const el = e.currentTarget as HTMLElement;
                                        el.style.color = "hsl(var(--primary-foreground))";
                                        el.style.backgroundColor = "hsl(var(--primary))";
                                        el.style.borderColor = "hsl(var(--primary))";
                                    }}
                                    onMouseLeave={e => {
                                        const el = e.currentTarget as HTMLElement;
                                        el.style.color = "hsl(var(--muted-foreground))";
                                        el.style.backgroundColor = "hsl(var(--background) / 0.4)";
                                        el.style.borderColor = "hsl(var(--border) / 0.6)";
                                    }}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* ── Col 4: Follow Us ── */}
                    <div className="flex flex-col gap-6" style={{ animation: "footerFadeUp 0.6s ease both", animationDelay: "240ms" }}>
                        <div className="flex flex-col gap-4">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: "hsl(var(--foreground))" }}>
                                {language === "ar" ? "تابعنا" : "FOLLOW US"}
                            </h4>
                            <div className="flex items-center gap-3">

                                {/* WhatsApp */}
                                <a
                                    href="https://wa.me/963940319051"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="WhatsApp"
                                    title="WhatsApp"
                                    className="group relative w-11 h-11 flex items-center justify-center rounded transition-all duration-300 hover:scale-110 hover:-translate-y-0.5"
                                    style={{ border: "1px solid hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--background) / 0.3)" }}
                                    onMouseEnter={e => {
                                        const el = e.currentTarget as HTMLElement;
                                        el.style.backgroundColor = "#25D366";
                                        el.style.borderColor = "#25D366";
                                        el.style.boxShadow = "0 4px 20px rgba(37,211,102,0.35)";
                                    }}
                                    onMouseLeave={e => {
                                        const el = e.currentTarget as HTMLElement;
                                        el.style.backgroundColor = "hsl(var(--background) / 0.3)";
                                        el.style.borderColor = "hsl(var(--border) / 0.5)";
                                        el.style.boxShadow = "none";
                                    }}
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        className="w-5 h-5 transition-colors duration-300 group-hover:fill-white"
                                        style={{ fill: "hsl(var(--muted-foreground))" }}
                                    >
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                </a>

                                {/* Instagram */}
                                <a
                                    href="https://www.instagram.com/code.withfiras?igsh=MW1nODFydmc2aThpOQ=="
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Instagram"
                                    title="Instagram"
                                    className="group relative w-11 h-11 flex items-center justify-center rounded transition-all duration-300 hover:scale-110 hover:-translate-y-0.5"
                                    style={{ border: "1px solid hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--background) / 0.3)" }}
                                    onMouseEnter={e => {
                                        const el = e.currentTarget as HTMLElement;
                                        el.style.background = "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)";
                                        el.style.borderColor = "#e6683c";
                                        el.style.boxShadow = "0 4px 20px rgba(220,39,67,0.35)";
                                    }}
                                    onMouseLeave={e => {
                                        const el = e.currentTarget as HTMLElement;
                                        el.style.background = "hsl(var(--background) / 0.3)";
                                        el.style.borderColor = "hsl(var(--border) / 0.5)";
                                        el.style.boxShadow = "none";
                                    }}
                                >
                                    <Instagram className="w-5 h-5 transition-colors duration-300 group-hover:text-white" style={{ color: "hsl(var(--muted-foreground))" }} />
                                </a>

                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div style={{ borderTop: "1px solid hsl(var(--border) / 0.2)" }}>
                <div
                    className={cn(
                        "container mx-auto px-6 py-5 flex flex-col sm:flex-row items-center gap-2 text-xs",
                        dir === "rtl" ? "sm:flex-row-reverse" : ""
                    )}
                    style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}
                >
                    <p className="flex-1 text-center sm:text-start">
                        © {new Date().getFullYear()}{" "}
                        <span className="font-bold" style={{ color: "hsl(var(--muted-foreground))" }}>
                            {t.common.brandName}
                        </span>
                        . {t.footer.allRightsReserved}.
                    </p>
                </div>
            </div>

            {/* CSS animation keyframe */}
            <style>{`
        @keyframes footerFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </footer>
    );
}
