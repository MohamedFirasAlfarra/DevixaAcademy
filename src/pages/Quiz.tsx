import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, AlertCircle, Loader2, Award, ArrowRight, ArrowLeft, Clock, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
    id: string;
    question_text: string;
    options: string[];
    correct_option_index: number;
}

interface Exam {
    id: string;
    title: string;
    passing_score: number;
    time_limit: number;
}

export default function Quiz() {
    const { courseId } = useParams();
    const { user } = useAuth();
    const { t, dir } = useLanguage();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [exam, setExam] = useState<Exam | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
    const [courseTitle, setCourseTitle] = useState("");
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (user && courseId) {
            fetchExamData();
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [user, courseId]);

    const fetchExamData = async () => {
        try {
            // Check enrollment
            const { data: enrollment, error: enrollmentError } = await supabase
                .from("enrollments")
                .select("progress_percentage")
                .eq("course_id", courseId)
                .eq("user_id", user?.id)
                .maybeSingle();

            if (enrollmentError) throw enrollmentError;
            if (!enrollment) {
                toast({
                    title: "Access Denied",
                    description: "You must be enrolled in this course to take the exam.",
                    variant: "destructive",
                });
                navigate("/courses");
                return;
            }

            // Fetch course title
            const { data: courseData } = await supabase
                .from("courses")
                .select("title")
                .eq("id", courseId)
                .single();

            if (courseData) setCourseTitle(courseData.title);

            // Fetch exam (stored in course_quizzes table)
            const { data: quizData, error: quizError } = await supabase
                .from("course_quizzes")
                .select("*")
                .eq("course_id", courseId)
                .maybeSingle();

            if (quizError) throw quizError;
            if (!quizData) {
                setLoading(false);
                return;
            }

            setExam(quizData);
            setTimeLeft(quizData.time_limit * 60);

            // Check if already passed
            const { data: attemptData } = await supabase
                .from("quiz_attempts")
                .select("*")
                .eq("quiz_id", quizData.id)
                .eq("user_id", user?.id)
                .eq("passed", true)
                .maybeSingle();

            if (attemptData) {
                setResult({ score: attemptData.score, passed: attemptData.passed });
                setLoading(false);
                return;
            }

            // Fetch questions
            const { data: questionsData, error: questionsError } = await supabase
                .from("quiz_questions")
                .select("*")
                .eq("quiz_id", quizData.id);

            if (questionsError) throw questionsError;
            setQuestions(questionsData as any[]);

            // Start timer
            startTimer();

        } catch (error) {
            console.error("Error fetching exam:", error);
            toast({
                title: "Error",
                description: "Failed to load exam data",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    handleSubmit(true); // Auto-submit when time is up
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handleAnswerSelect = (questionId: string, optionIndex: number) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    };

    const calculateScore = () => {
        if (questions.length === 0) return 0;
        let correctCount = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.correct_option_index) {
                correctCount++;
            }
        });
        return Math.round((correctCount / questions.length) * 100);
    };

    const handleSubmit = async (isAuto = false) => {
        if (!exam || !user) return;
        if (submitting) return;

        if (!isAuto && Object.keys(answers).length < questions.length) {
            toast({
                title: "Incomplete",
                description: "Please answer all questions before submitting",
                variant: "destructive",
            });
            return;
        }

        if (timerRef.current) clearInterval(timerRef.current);
        setSubmitting(true);

        const score = calculateScore();
        const passed = score >= exam.passing_score;

        try {
            const { error: attemptError } = await supabase.from("quiz_attempts").insert({
                user_id: user.id,
                quiz_id: exam.id,
                score,
                passed,
            });

            if (attemptError) throw attemptError;

            setResult({ score, passed });

            if (passed) {
                toast({
                    title: t.exam.successTitle,
                    description: t.exam.score.replace("{score}", String(score)),
                });
            } else {
                toast({
                    title: t.exam.failureTitle,
                    description: t.exam.score.replace("{score}", String(score)),
                    variant: "destructive",
                });
            }

        } catch (error) {
            console.error("Error submitting exam:", error);
            toast({
                title: "Error",
                description: t.exam.errorSubmit,
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleRetry = () => {
        setResult(null);
        setAnswers({});
        setTimeLeft(exam ? exam.time_limit * 60 : 0);
        startTimer();
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">{t.exam.loading}</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!exam) {
        return (
            <DashboardLayout>
                <div className="text-center py-20">
                    <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-2xl font-bold">{t.exam.notFound}</h2>
                    <Button onClick={() => navigate("/my-courses")} className="mt-6">
                        {t.exam.backToCourses}
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    if (result) {
        return (
            <DashboardLayout>
                <div className="max-w-2xl mx-auto py-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Card className="text-center overflow-hidden border-0 shadow-2xl rounded-[3rem]">
                            <div className={`h-3 ${result.passed ? 'bg-success' : 'bg-destructive'}`} />
                            <CardHeader className="pt-12 pb-6">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
                                    className="flex justify-center mb-8"
                                >
                                    {result.passed ? (
                                        <div className="relative">
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                                                transition={{ repeat: Infinity, duration: 2 }}
                                                className="absolute inset-0 bg-success/30 blur-3xl rounded-full scale-150"
                                            />
                                            <Award className="w-32 h-32 text-success relative" />
                                        </div>
                                    ) : (
                                        <XCircle className="w-32 h-32 text-destructive" />
                                    )}
                                </motion.div>
                                <CardTitle className="text-4xl font-display font-black mb-4">
                                    {result.passed ? t.exam.successTitle : t.exam.failureTitle}
                                </CardTitle>
                                <CardDescription className="text-2xl font-bold text-foreground/80">
                                    {t.exam.score.replace("{score}", String(result.score))}
                                </CardDescription>
                                <p className="text-muted-foreground mt-2 font-medium">
                                    {t.exam.passingScore.replace("{score}", String(exam.passing_score))}
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-6 pb-12">
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-6">
                                    {!result.passed && (
                                        <Button
                                            onClick={handleRetry}
                                            variant="outline"
                                            size="lg"
                                            className="w-full sm:w-auto rounded-full px-10 h-14 font-bold text-lg border-2"
                                        >
                                            <RotateCcw className="w-5 h-5 me-2" />
                                            {t.exam.retry}
                                        </Button>
                                    )}
                                    <Button
                                        onClick={() => navigate("/my-courses")}
                                        size="lg"
                                        className={`w-full sm:w-auto rounded-full px-10 h-14 font-bold text-lg ${result.passed ? 'gradient-primary shadow-glow' : ''}`}
                                    >
                                        {t.exam.backToCourses}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-8 pb-32 relative">
                {/* Fixed Header with Timer */}
                <div className="sticky top-16 z-20 bg-background/95 backdrop-blur-sm py-4 border-b">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <Button
                                variant="ghost"
                                onClick={() => navigate("/my-courses")}
                                className="mb-2 hover:bg-muted"
                            >
                                {dir === 'rtl' ? <ArrowRight className="w-4 h-4 me-2" /> : <ArrowLeft className="w-4 h-4 me-2" />}
                                {t.exam.backToCourses}
                            </Button>
                            <h1 className="text-2xl md:text-3xl font-display font-black leading-tight">
                                {t.exam.title.replace("{course}", courseTitle)}
                            </h1>
                        </div>
                        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-colors ${timeLeft < 60 ? 'border-destructive bg-destructive/5 text-destructive animate-pulse' : 'border-primary/20 bg-primary/5 text-primary'}`}>
                            <Clock className="w-6 h-6" />
                            <div className="text-xl font-mono font-black tabular-nums">
                                {formatTime(timeLeft)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8 pt-4">
                    <AnimatePresence>
                        {questions.map((q, qIndex) => (
                            <motion.div
                                key={q.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: qIndex * 0.1 }}
                            >
                                <Card className="border-accent/10 shadow-sm rounded-[2rem] overflow-hidden hover:shadow-md transition-shadow">
                                    <CardHeader className="bg-muted/30 pb-4">
                                        <div className="flex items-center gap-4 mb-2">
                                            <span className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-lg">
                                                {qIndex + 1}
                                            </span>
                                            <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em]">
                                                {t.exam.questionCount.replace("{current}", String(qIndex + 1)).replace("{total}", String(questions.length))}
                                            </p>
                                        </div>
                                        <CardTitle className="text-xl md:text-2xl font-bold leading-relaxed pt-2">
                                            {q.question_text}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-8">
                                        <RadioGroup
                                            onValueChange={(val) => handleAnswerSelect(q.id, parseInt(val))}
                                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                            value={answers[q.id]?.toString()}
                                        >
                                            {q.options.map((option, oIndex) => (
                                                <div key={oIndex} className="relative group">
                                                    <RadioGroupItem
                                                        value={oIndex.toString()}
                                                        id={`${q.id}-${oIndex}`}
                                                        className="peer sr-only"
                                                    />
                                                    <Label
                                                        htmlFor={`${q.id}-${oIndex}`}
                                                        className="flex items-center p-5 rounded-2xl border-2 border-border/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50 cursor-pointer transition-all duration-200 group-hover:border-primary/30"
                                                    >
                                                        <span className="w-7 h-7 rounded-full border-2 border-primary/30 flex items-center justify-center me-4 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary transition-all">
                                                            <span className="w-2.5 h-2.5 rounded-full bg-white opacity-0 peer-data-[state=checked]:opacity-100" />
                                                        </span>
                                                        <span className="text-lg font-medium">{option}</span>
                                                    </Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <div className="pt-12 flex justify-center sticky bottom-8">
                    <Button
                        onClick={() => handleSubmit()}
                        disabled={submitting}
                        size="lg"
                        className="h-20 px-16 rounded-full text-2xl font-black shadow-glow-primary min-w-[300px] hover:scale-[1.05] active:scale-[0.95] transition-all"
                    >
                        {submitting ? (
                            <Loader2 className="w-8 h-8 animate-spin" />
                        ) : (
                            t.exam.submit
                        )}
                    </Button>
                </div>
            </div>
        </DashboardLayout>
    );
}
