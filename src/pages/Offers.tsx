import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tag, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import OfferCard from "@/components/courses/OfferCard";

type Offer = Tables<"offers">;
type Course = Tables<"courses">;

export default function Offers() {
    const { t } = useLanguage();
    const [offers, setOffers] = useState<(Offer & { courses: Course })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOffers();
    }, []);

    const fetchOffers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("offers")
                .select("*, courses(*)")
                .eq("is_active", true)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setOffers(data as (Offer & { courses: Course })[] || []);
        } catch (error) {
            console.error("Error fetching offers:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in duration-700">
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-display font-black tracking-tight">{t.courses.offersTitle}</h1>
                    <p className="text-muted-foreground text-lg">{t.courses.offersSubtitle}</p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        <p className="text-muted-foreground animate-pulse font-medium">{t.common.loading}</p>
                    </div>
                ) : offers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-3xl border-2 border-dashed border-accent/20">
                        <div className="w-20 h-20 rounded-full bg-accent/5 flex items-center justify-center mb-6">
                            <Tag className="w-10 h-10 text-accent/40" />
                        </div>
                        <p className="text-2xl font-display font-black mb-2">{t.courses.noOffers}</p>
                        <p className="text-muted-foreground max-w-md">{t.courses.noOffersDesc}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {offers.map((offer) => (
                            <OfferCard key={offer.id} offer={offer} />
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
