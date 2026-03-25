import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  className?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({ className, fullScreen = true }: LoadingScreenProps) {
  const { t } = useLanguage();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center bg-background overflow-hidden relative",
        fullScreen ? "fixed inset-0 z-[100]" : "w-full h-full min-h-[400px]",
        className
      )}
    >
      {/* Animated Hexagon Background Pattern (Subtle) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <svg width="100%" height="100%">
          <pattern
            id="hexagons"
            width="50"
            height="43.4"
            patternUnits="userSpaceOnUse"
            patternTransform="scale(2)"
          >
            <path
              d="M25 0 L50 14.4 L50 43.4 L25 57.8 L0 43.4 L0 14.4 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </pattern>
          <rect width="100%" height="100%" fill="url(#hexagons)" />
        </svg>
      </div>

      {/* Central Animation */}
      <div className="relative flex flex-col items-center">
        {/* Glowing Rings */}
        <div className="relative w-32 h-32 mb-12">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/20"
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: { duration: 8, repeat: Infinity, ease: "linear" },
              scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-accent/20 border-t-accent shadow-[0_0_15px_rgba(14,165,233,0.3)]"
            animate={{
              rotate: -360,
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-4xl font-black text-primary drop-shadow-[0_0_10px_rgba(124,58,237,0.5)]">
              {/* Code symbols animation */}
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0 }}
              >
                &lt;
              </motion.span>
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                className="mx-1"
              >
                /
              </motion.span>
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              >
                &gt;
              </motion.span>
            </div>
          </motion.div>
        </div>

        {/* Brand Name */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center space-y-4"
        >
          <h1 className="text-5xl font-display font-black tracking-tighter text-foreground relative">
            Devixa
            <motion.div
              className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary rounded-full shadow-glow"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.5, duration: 1, ease: "circOut" }}
            />
          </h1>
          <motion.p
            className="text-muted-foreground font-bold tracking-[0.2em] uppercase text-xs"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {t.courseDetails?.loadingExperience || "Loading your experience..."}
          </motion.p>
        </motion.div>
      </div>

      {/* Floating Particles (Subtle) */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary/40 rounded-full"
          initial={{
            x: Math.random() * 200 - 100,
            y: Math.random() * 200 - 100,
            opacity: 0,
          }}
          animate={{
            y: [null, -100, -200],
            x: [null, (Math.random() - 0.5) * 50],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${90}%`,
          }}
        />
      ))}
    </div>
  );
}
