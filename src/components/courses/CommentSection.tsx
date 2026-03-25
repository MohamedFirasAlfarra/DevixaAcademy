import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Comment {
    id: string;
    content: string;
    rating: number;
    created_at: string;
    user_id: string;
    profiles: {
        full_name: string;
    } | null;
}

interface CommentSectionProps {
    courseId: string;
}

export default function CommentSection({ courseId }: CommentSectionProps) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { toast } = useToast();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState("");
    const [rating, setRating] = useState(5);
    const [submitting, setSubmitting] = useState(false);
    const [isEnrolled, setIsEnrolled] = useState(false);

    useEffect(() => {
        fetchComments();
        checkEnrollment();
    }, [courseId, user]);

    const fetchComments = async () => {
        try {
            const { data, error } = await supabase
                .from("course_comments")
                .select(`
          id,
          content,
          rating,
          created_at,
          user_id,
          profiles (
            full_name
          )
        `)
                .eq("course_id", courseId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setComments((data as any) || []);
        } catch (error) {
            console.error("Error fetching comments:", error);
        } finally {
            setLoading(false);
        }
    };

    const checkEnrollment = async () => {
        if (!user) {
            setIsEnrolled(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from("enrollments")
                .select("id")
                .eq("course_id", courseId)
                .eq("user_id", user.id)
                .maybeSingle();

            if (error) throw error;
            setIsEnrolled(!!data);
        } catch (error) {
            console.error("Error checking enrollment:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newComment.trim()) return;

        setSubmitting(true);
        try {
            const { error } = await supabase.from("course_comments").insert({
                course_id: courseId,
                user_id: user.id,
                content: newComment.trim(),
                rating,
            });

            if (error) throw error;

            toast({
                title: t.comments.success,
            });
            setNewComment("");
            setRating(5);
            fetchComments();
        } catch (error: any) {
            toast({
                title: t.comments.error,
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 border-b pb-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold">{t.comments.title}</h3>
            </div>

            {/* Add Comment Form */}
            <div className="bg-muted/30 p-4 rounded-xl space-y-4">
                {!user ? (
                    <p className="text-sm text-center text-muted-foreground py-2 font-medium">
                        {t.comments.loginToComment}
                    </p>
                ) : !isEnrolled ? (
                    <p className="text-sm text-center text-muted-foreground py-2 font-medium">
                        {t.comments.mustEnroll}
                    </p>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium">{t.comments.rating}:</span>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setRating(s)}
                                        className="focus:outline-none transition-transform hover:scale-110"
                                    >
                                        <Star
                                            className={`w-5 h-5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                                }`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <Textarea
                                placeholder={t.comments.placeholder}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="bg-background border-muted min-h-[100px] pr-10"
                                required
                            />
                            <div className="absolute bottom-2 right-2">
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={submitting || !newComment.trim()}
                                    className="gradient-primary"
                                >
                                    {submitting ? (
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                )}
            </div>

            {/* Comments List */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="animate-pulse flex gap-3 p-3 bg-muted/20 rounded-lg">
                                <div className="w-10 h-10 bg-muted rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-muted rounded w-24" />
                                    <div className="h-3 bg-muted rounded w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground italic">
                        {t.comments.noComments}
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 p-4 bg-card border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <Avatar className="w-10 h-10 border-2 border-primary/10">
                                <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                    {comment.profiles?.full_name?.charAt(0) || "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-foreground">
                                        {comment.profiles?.full_name || "Unknown User"}
                                    </span>
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                                key={s}
                                                className={`w-3 h-3 ${s <= comment.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {comment.content}
                                </p>
                                <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1 opacity-70">
                                    <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
