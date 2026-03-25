import { useLanguage } from '@/contexts/LanguageContext';
import {
    SiReact,
    SiTypescript,
    SiJavascript,
    SiHtml5,
    SiCss,
    SiTailwindcss,
    SiNodedotjs,
    SiMysql
} from "react-icons/si";
import LogoLoop from '../LogoLoop';

const TechLogoStrip: React.FC = () => {
    const { language } = useLanguage();
    const techLogos = [
        { node: <SiReact title="React" />, title: "React" },
        { node: <SiTypescript title="TypeScript" />, title: "TypeScript" },
        { node: <SiJavascript title="JavaScript" />, title: "JavaScript" },
        { node: <SiHtml5 title="HTML5" />, title: "HTML5" },
        { node: <SiCss title="CSS3" />, title: "CSS3" },
        { node: <SiTailwindcss title="TailwindCSS" />, title: "TailwindCSS" },
        { node: <SiNodedotjs title="NodeJS" />, title: "NodeJS" },
        { node: <SiMysql title="MySQL" />, title: "MySQL" }
    ];

    return (
        <div className="w-full bg-background border-y border-border/10 py-12 md:py-20 overflow-hidden relative">
            <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
            <div className="container mx-auto px-6 mb-10 relative z-10">
                <h3 className="text-center text-muted-foreground/60 font-display font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs">
                    {language === 'ar' ? "التقنيات التي ندرسها" : "Technologies We Teach"}
                </h3>
            </div>
            <LogoLoop
                logos={techLogos}
                speed={60}
                direction="left"
                logoHeight={56}
                gap={100}
                hoverSpeed={30}
                scaleOnHover
                fadeOut
            />
        </div>
    );
};

export default TechLogoStrip;
