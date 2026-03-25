import { useTheme } from "@/contexts/ThemeProvider";
import { cn } from "@/lib/utils";
import logoLight from "@/assets/logos/logo-light-new.png";
import logoDark from "@/assets/logos/logo-dark-new.png";
import logoMobileLight from "@/assets/logos/logo-mobile-light.png";
import logoMobileDark from "@/assets/logos/logo-mobile-dark.png";

interface LogoProps {
    className?: string;
    imageClassName?: string;
    isNavbar?: boolean;
}

export default function Logo({ className, imageClassName, isNavbar }: LogoProps) {
    const { theme } = useTheme();
    const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    return (
        <div className={cn("flex items-center transition-all duration-300 hover:scale-105", className)}>
            {/* Mobile Logo with background - Only for Navbar on small screens */}
            {isNavbar ? (
                <>
                    <img
                        src={isDark ? logoMobileDark : logoMobileLight}
                        alt="Devixa Logo Mobile"
                        className={cn(
                            "h-full w-auto object-contain md:hidden",
                            imageClassName
                        )}
                    />
                    <img
                        src={isDark ? logoDark : logoLight}
                        alt="Devixa Logo"
                        className={cn(
                            "h-full w-auto object-contain hidden md:block",
                            isDark ? "mix-blend-screen" : "mix-blend-multiply contrast-125",
                            imageClassName
                        )}
                    />
                </>
            ) : (
                /* Standard Logo with blend modes */
                <img
                    src={isDark ? logoDark : logoLight}
                    alt="Devixa Logo"
                    className={cn(
                        "h-full w-auto object-contain",
                        isDark ? "mix-blend-screen" : "mix-blend-multiply contrast-125",
                        imageClassName
                    )}
                />
            )}
        </div>
    );
}
