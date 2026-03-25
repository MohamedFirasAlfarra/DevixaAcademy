import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Save, BookOpen, Clock, Award, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";

type Course = Tables<"courses">;

interface Question {
    id?: string;
    question_text: string;
    options: string[];
    correct_option_index: number;
}

interface Exam {
    id?: string;
    course_id: string;
    title: string;
    passing_score: number;
    reward_points: number;
    time_limit: number;
}

export default function AdminExams() {
    const { t, dir } = useLanguage();
    const { toast } = useToast();
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exam, setExam] = useState<Exam | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const { data, error } = await supabase
                .from("courses")
                .select("*")
                .eq("is_active", true)
                .order("title");

            if (error) throw error;
            setCourses(data || []);
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchExamAndQuestions = async (courseId: string) => {
        setLoading(true);
        try {
            // Fetch exam
            const { data: examData, error: examError } = await supabase
                .from("course_quizzes")
                .select("*")
                .eq("course_id", courseId)
                .maybeSingle();

            if (examError) throw examError;

            if (examData) {
                setExam(examData as any);
                // Fetch questions
                const { data: questionsData, error: questionsError } = await supabase
                    .from("quiz_questions")
                    .select("*")
                    .eq("quiz_id", examData.id);

                if (questionsError) throw questionsError;
                setQuestions(questionsData as any[]);
            } else {
                setExam({
                    course_id: courseId,
                    title: "",
                    passing_score: 70,
                    reward_points: 100,
                    time_limit: 30,
                });
                setQuestions([]);
            }
        } catch (error) {
            console.error("Error fetching exam data:", error);
            toast({
                title: t.common.error,
                description: t.adminExams.saveError,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCourseChange = (courseId: string) => {
        setSelectedCourseId(courseId);
        if (courseId) {
            fetchExamAndQuestions(courseId);
        }
    };

    const handleAddQuestion = () => {
        setQuestions(prev => [
            ...prev,
            {
                question_text: "",
                options: ["", "", "", ""],
                correct_option_index: 0,
            }
        ]);
    };

    const handleRemoveQuestion = (index: number) => {
        setQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const handleQuestionTextChange = (index: number, text: string) => {
        setQuestions(prev => {
            const next = [...prev];
            next[index].question_text = text;
            return next;
        });
    };

    const handleOptionChange = (qIndex: number, oIndex: number, text: string) => {
        setQuestions(prev => {
            const next = [...prev];
            next[qIndex].options[oIndex] = text;
            return next;
        });
    };

    const handleAddOption = (qIndex: number) => {
        setQuestions(prev => {
            const next = [...prev];
            next[qIndex].options.push("");
            return next;
        });
    };

    const handleRemoveOption = (qIndex: number, oIndex: number) => {
        setQuestions(prev => {
            const next = [...prev];
            next[qIndex].options = next[qIndex].options.filter((_, i) => i !== oIndex);
            if (next[qIndex].correct_option_index >= next[qIndex].options.length) {
                next[qIndex].correct_option_index = 0;
            }
            return next;
        });
    };

    const handleSaveExam = async () => {
        if (!exam || !selectedCourseId) return;

        if (!exam.title.trim()) {
            toast({
                title: t.common.error,
                description: "Exam title is required",
                variant: "destructive",
            });
            return;
        }

        setSaving(true);
        try {
            let examId = exam.id;

            if (examId) {
                // Update existing exam
                const { error } = await supabase
                    .from("course_quizzes")
                    .update({
                        title: exam.title,
                        passing_score: exam.passing_score,
                        reward_points: exam.reward_points,
                        time_limit: exam.time_limit,
                        updated_at: new Date().toISOString(),
                    } as any)
                    .eq("id", examId);

                if (error) throw error;
            } else {
                // Create new exam
                const { data, error } = await supabase
                    .from("course_quizzes")
                    .insert({
                        course_id: selectedCourseId,
                        title: exam.title,
                        passing_score: exam.passing_score,
                        reward_points: exam.reward_points,
                        time_limit: exam.time_limit,
                    } as any)
                    .select()
                    .single();

                if (error) throw error;
                examId = (data as any).id;
                setExam({ ...exam, id: examId });
            }

            // Handle Questions (Delete all and re-insert for simplicity in this admin tool, 
            // or implement a more robust sync. Given the "unlimited" and "unspecified sync logic", 
            // we'll go with clear and re-add for simplicity if examId already existed)

            if (exam.id) {
                const { error: deleteError } = await supabase
                    .from("quiz_questions")
                    .delete()
                    .eq("quiz_id", examId);
                if (deleteError) throw deleteError;
            }

            if (questions.length > 0) {
                const questionsToInsert = questions.map(q => ({
                    quiz_id: examId,
                    question_text: q.question_text,
                    options: q.options,
                    correct_option_index: q.correct_option_index,
                }));

                const { error: questionsError } = await supabase
                    .from("quiz_questions")
                    .insert(questionsToInsert as any);

                if (questionsError) throw questionsError;
            }

            toast({
                title: t.common.success,
                description: t.adminExams.saveSuccess,
            });

            fetchExamAndQuestions(selectedCourseId);

        } catch (error) {
            console.error("Error saving exam:", error);
            toast({
                title: t.common.error,
                description: t.adminExams.saveError,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-3xl bg-card border border-accent/10 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <Award className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-display font-black tracking-tight">{t.adminExams.title}</h1>
                            <p className="text-muted-foreground font-medium">{t.adminExams.subtitle}</p>
                        </div>
                    </div>
                </div>

                <Card className="border-accent/10 shadow-sm overflow-hidden rounded-[2rem]">
                    <CardHeader className="bg-muted/30">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            {t.adminExams.selectCourse}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <Select value={selectedCourseId} onValueChange={handleCourseChange}>
                            <SelectTrigger className="h-12 rounded-xl text-lg">
                                <SelectValue placeholder={t.adminAttendance.selectPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                                {courses.map(course => (
                                    <SelectItem key={course.id} value={course.id}>
                                        {course.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p className="text-muted-foreground animate-pulse">{t.common.loading}</p>
                    </div>
                ) : selectedCourseId && exam ? (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Exam Settings */}
                        <Card className="border-accent/10 shadow-lg rounded-[2rem] overflow-hidden">
                            <CardHeader className="border-b bg-primary/5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-2xl font-black">{exam.id ? t.adminExams.editExam : t.adminExams.addExam}</CardTitle>
                                        <CardDescription>{t.adminExams.createExam}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="exam-title">{t.adminCourses.courseTitle}</Label>
                                        <Input
                                            id="exam-title"
                                            value={exam.title}
                                            onChange={e => setExam({ ...exam, title: e.target.value })}
                                            className="h-12 rounded-xl"
                                            placeholder="e.g. Final Certification Exam"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="passing-score">{t.adminExams.passingScore}</Label>
                                        <Input
                                            id="passing-score"
                                            type="number"
                                            value={exam.passing_score}
                                            onChange={e => setExam({ ...exam, passing_score: parseInt(e.target.value) || 0 })}
                                            className="h-12 rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reward-points">{t.adminExams.rewardPoints}</Label>
                                        <Input
                                            id="reward-points"
                                            type="number"
                                            value={exam.reward_points}
                                            onChange={e => setExam({ ...exam, reward_points: parseInt(e.target.value) || 0 })}
                                            className="h-12 rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="time-limit">{t.adminExams.timeLimit}</Label>
                                        <div className="relative">
                                            <Input
                                                id="time-limit"
                                                type="number"
                                                value={exam.time_limit}
                                                onChange={e => setExam({ ...exam, time_limit: parseInt(e.target.value) || 0 })}
                                                className="h-12 rounded-xl pe-12"
                                            />
                                            <Clock className="absolute top-3.5 right-4 w-5 h-5 text-muted-foreground" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Questions Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h2 className="text-2xl font-display font-black flex items-center gap-3">
                                    <CheckCircle2 className="w-8 h-8 text-success" />
                                    {t.adminExams.options}
                                </h2>
                                <Button onClick={handleAddQuestion} size="lg" className="rounded-2xl gap-2 font-bold shadow-glow">
                                    <Plus className="w-5 h-5" />
                                    {t.adminExams.addQuestion}
                                </Button>
                            </div>

                            {questions.map((q, qIndex) => (
                                <Card key={qIndex} className="border-accent/10 shadow-md group rounded-[2rem] overflow-hidden">
                                    <CardHeader className="bg-muted/50 py-4 px-6 flex flex-row items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                                                {qIndex + 1}
                                            </span>
                                            <CardTitle className="text-lg">{t.adminExams.addingQuestion}</CardTitle>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveQuestion(qIndex)}
                                            className="text-destructive hover:bg-destructive/10 rounded-full"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-6">
                                        <div className="space-y-2">
                                            <Label>{t.adminExams.questionText}</Label>
                                            <Input
                                                value={q.question_text}
                                                onChange={e => handleQuestionTextChange(qIndex, e.target.value)}
                                                className="h-12 rounded-xl font-medium"
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <Label className="flex justify-between items-center">
                                                <span>{t.adminExams.options}</span>
                                                <Button variant="outline" size="sm" onClick={() => handleAddOption(qIndex)} className="h-8 rounded-lg text-xs">
                                                    <Plus className="w-3 h-3 me-1" /> {t.adminExams.addOption}
                                                </Button>
                                            </Label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {q.options.map((option, oIndex) => (
                                                    <div key={oIndex} className="flex items-center gap-3">
                                                        <div
                                                            className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all ${q.correct_option_index === oIndex ? 'bg-success border-success text-white' : 'border-accent/20 hover:border-primary/50'}`}
                                                            onClick={() => {
                                                                const next = [...questions];
                                                                next[qIndex].correct_option_index = oIndex;
                                                                setQuestions(next);
                                                            }}
                                                        >
                                                            {oIndex + 1}
                                                        </div>
                                                        <div className="relative flex-1">
                                                            <Input
                                                                value={option}
                                                                onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)}
                                                                className={`h-12 rounded-xl ${q.correct_option_index === oIndex ? 'border-success bg-success/5' : ''}`}
                                                            />
                                                            {q.options.length > 2 && (
                                                                <button
                                                                    onClick={() => handleRemoveOption(qIndex, oIndex)}
                                                                    className="absolute top-3.5 right-3 text-muted-foreground hover:text-destructive transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {questions.length === 0 && (
                                <div className="text-center py-16 bg-muted/20 rounded-[2rem] border-2 border-dashed border-accent/20">
                                    <Plus className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                                    <p className="text-muted-foreground font-medium">{t.adminExams.createExam}</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-8 sticky bottom-8 flex justify-center z-50">
                            <Button
                                onClick={handleSaveExam}
                                disabled={saving}
                                size="lg"
                                className="h-16 px-12 rounded-full text-xl font-black shadow-glow-primary min-w-[300px]"
                            >
                                {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                    <>
                                        <Save className="w-6 h-6 me-2" />
                                        {t.adminExams.saveExam}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                ) : !selectedCourseId ? (
                    <div className="text-center py-32 bg-card rounded-[3rem] border shadow-sm flex flex-col items-center justify-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-accent/5 flex items-center justify-center text-accent/30">
                            {dir === 'rtl' ? <ChevronLeft className="w-16 h-16" /> : <ChevronRight className="w-16 h-16" />}
                        </div>
                        <h2 className="text-2xl font-display font-black text-muted-foreground">{t.adminExams.selectCourse}</h2>
                    </div>
                ) : null}
            </div>
        </DashboardLayout>
    );
}
