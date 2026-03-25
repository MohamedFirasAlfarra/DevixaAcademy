import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Clock, AlertCircle } from "lucide-react";

interface CountdownTimerProps {
    expiryDate: string;
    onExpire?: () => void;
}

export default function CountdownTimer({ expiryDate, onExpire }: CountdownTimerProps) {
    const { t } = useLanguage();
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
        isExpired: boolean;
    } | null>(null);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = new Date(expiryDate).getTime() - new Date().getTime();

            if (difference <= 0) {
                if (!timeLeft?.isExpired && onExpire) {
                    onExpire();
                }
                return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
            }

            return {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
                isExpired: false,
            };
        };

        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [expiryDate, onExpire]);

    if (!timeLeft) return null;

    if (timeLeft.isExpired) {
        return (
            <div className="flex items-center gap-2 text-destructive font-bold text-sm bg-destructive/10 px-3 py-1.5 rounded-full animate-pulse">
                <AlertCircle className="w-4 h-4" />
                <span>{t.courses.offerExpired}</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-accent" />
                {t.courses.endsIn}
            </p>
            <div className="flex items-center gap-2">
                {timeLeft.days > 0 && (
                    <div className="flex flex-col items-center">
                        <span className="text-xl font-black tabular-nums leading-none">{timeLeft.days}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{t.common.days}</span>
                    </div>
                )}
                {timeLeft.days > 0 && <span className="text-muted-foreground font-black mb-4">:</span>}

                <div className="flex flex-col items-center">
                    <span className="text-xl font-black tabular-nums leading-none">{String(timeLeft.hours).padStart(2, '0')}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{t.common.hours}</span>
                </div>
                <span className="text-muted-foreground font-black mb-4">:</span>

                <div className="flex flex-col items-center">
                    <span className="text-xl font-black tabular-nums leading-none">{String(timeLeft.minutes).padStart(2, '0')}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{t.common.minutes}</span>
                </div>
                <span className="text-muted-foreground font-black mb-4">:</span>

                <div className="flex flex-col items-center">
                    <span className="text-xl font-black tabular-nums leading-none text-accent">{String(timeLeft.seconds).padStart(2, '0')}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{t.common.seconds}</span>
                </div>
            </div>
        </div>
    );
}
