import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, DollarSign, Eye } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import CountdownTimer from "@/components/common/CountdownTimer";

type Offer = Tables<"offers">;
type Course = Tables<"courses">;

interface OfferCardProps {
    offer: Offer & { courses: Course };
}

export default function OfferCard({ offer }: OfferCardProps) {
    const { t, dir } = useLanguage();
    const navigate = useNavigate();
    const course = offer.courses;

    const originalPrice = Number(course.price || 0);
    const discountedPrice = originalPrice * (1 - offer.discount_percentage / 100);

    return (
        <Card className="group overflow-hidden border-accent/10 hover:border-accent/30 transition-all duration-500 hover:shadow-2xl bg-card">
            <div className="relative h-56 overflow-hidden">
                {course.image_url ? (
                    <img
                        src={course.image_url}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full bg-accent/5 flex items-center justify-center">
                        <BookOpen className="w-16 h-16 text-accent/20" />
                    </div>
                )}

                {/* Discount Badge */}
                <div className="absolute top-4 left-4">
                    <Badge className="bg-destructive text-white px-3 py-1 text-sm font-bold shadow-lg">
                        {offer.discount_percentage}% {t.courses.off}
                    </Badge>
                </div>

                {/* Glassmorphism Price Badge */}
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl flex flex-col items-end">
                    <span className="text-xs text-muted-foreground line-through font-bold">${originalPrice.toFixed(0)}</span>
                    <span className="text-2xl font-black text-primary flex items-center">
                        <DollarSign className="w-5 h-5" />
                        {discountedPrice.toFixed(0)}
                    </span>
                </div>
            </div>

            <CardContent className="p-6">
                <div className="flex flex-col gap-6">
                    <div className="space-y-2">
                        <h3 className="text-2xl font-display font-black line-clamp-1 group-hover:text-primary transition-colors">
                            {course.title}
                        </h3>
                        <p className="text-muted-foreground text-sm line-clamp-2 h-10">
                            {course.description || "Unlock your potential with this amazing course."}
                        </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-accent/10 pt-6 mt-2">
                        {offer.expires_at && (
                            <CountdownTimer expiryDate={offer.expires_at} />
                        )}

                        <Button
                            onClick={() => navigate(`/courses/${course.id}`)}
                            className="rounded-full px-6 h-12 font-bold gap-2 group/btn relative overflow-hidden"
                        >
                            <Eye className="w-4 h-4 transition-transform group-hover/btn:scale-110 relative z-10" />
                            <span className="relative z-10">{t.comments.viewDetails}</span>
                            <div className="absolute inset-0 bg-primary-foreground/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
