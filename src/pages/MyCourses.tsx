import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  Sparkles
} from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CourseSession {
  id: string;
  title: string;
  duration_hours: number;
  session_date: string | null;
  attended: boolean;
  hours_attended: number;
  video_url?: string;
}

interface EnrolledCourse {
  id: string;
  course_id: string;
  progress_percentage: number;
  course: {
    id: string;
    title: string;
    description: string | null;
    total_hours: number;
    sessions_count: number;
  };
  batch: {
    id: string;
    name: string;
  } | null;
  sessions: CourseSession[];
  hasQuiz?: boolean;
  quizAttempted?: boolean;
  quizPassingScore?: number;
}

export default function MyCourses() {
  const navigate = useNavigate();
  const { t, dir } = useLanguage();
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchEnrolledCourses();
    }
  }, [user]);

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      // Fetch enrollments with course and batch info
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select(`
          id,
          course_id,
          progress_percentage,
          batch_id,
          courses(
            id,
            title,
            description,
            total_hours,
            sessions_count
          ),
          batches(
            id,
            name
          )
        `)
        .eq("user_id", user?.id);

      if (enrollmentsError) throw enrollmentsError;

      // For each enrollment, fetch sessions, attendance, and quiz info
      const coursesWithSessions = await Promise.all(
        (enrollments || []).map(async (enrollment: any) => {
          let sessions: CourseSession[] = [];
          let hasQuiz = false;
          let quizAttempted = false;
          let quizPassingScore = 0;

          // Check if quiz exists
          const { data: quizData } = await supabase
            .from("course_quizzes")
            .select("id, passing_score")
            .eq("course_id", enrollment.course_id)
            .maybeSingle();

          if (quizData) {
            hasQuiz = true;
            quizPassingScore = quizData.passing_score;
            // Check if user attempted it (and passed)
            const { data: attemptData } = await supabase
              .from("quiz_attempts")
              .select("id")
              .eq("quiz_id", quizData.id)
              .eq("user_id", user?.id)
              .eq("passed", true)
              .maybeSingle();

            if (attemptData) {
              quizAttempted = true;
            }
          }

          // Fetch lessons for the course (try course-level first, then batch-level)
          // Actually course_sessions has both course_id and batch_id (judging by types.ts Row)
          // But types.ts showed batch_id as mandatory in Insert but maybe optional in reality

          let { data: sessionsData } = await (supabase
            .from("course_sessions" as any) as any)
            .select("*")
            .eq("course_id", enrollment.course_id)
            .order("order_index", { ascending: true });

          // If no sessions found by course_id, try by batch_id
          if ((!sessionsData || sessionsData.length === 0) && enrollment.batch_id) {
            const { data: batchSessions } = await (supabase
              .from("course_sessions" as any) as any)
              .select("*")
              .eq("batch_id", enrollment.batch_id)
              .order("order_index", { ascending: true });
            sessionsData = batchSessions;
          }

          if (sessionsData && sessionsData.length > 0) {
            // Fetch completions for these lessons
            const sessionIds = sessionsData.map((s: any) => s.id);
            const { data: completionsData } = await (supabase
              .from("lesson_completions" as any) as any)
              .select("lesson_id, completed")
              .eq("user_id", user?.id)
              .in("lesson_id", sessionIds);

            sessions = sessionsData.map((session: any) => {
              const completion = completionsData?.find(
                (c: any) => c.lesson_id === session.id
              );
              return {
                id: session.id,
                title: session.title,
                duration_hours: session.duration_hours || 1,
                session_date: (session as any).session_date || null,
                attended: completion?.completed || false,
                hours_attended: session.duration_hours || 1,
                video_url: (session as any).video_url || (session as any).video_path || (session as any).telegram_file_id || (session as any).telegram_token || "",
              };
            });
          }

          return {
            id: enrollment.id,
            course_id: enrollment.course_id,
            progress_percentage: enrollment.progress_percentage || 0,
            course: enrollment.courses as EnrolledCourse["course"],
            batch: enrollment.batches as EnrolledCourse["batch"],
            sessions,
            hasQuiz,
            quizAttempted,
            quizPassingScore
          };
        })
      );

      setEnrolledCourses(coursesWithSessions);
    } catch (error) {
      console.error("Error fetching enrolled courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCourseExpanded = (courseId: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-3xl bg-card border border-accent/10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-black tracking-tight">{t.nav.myCourses}</h1>
              <p className="text-muted-foreground font-medium">{t.myCourses.subtitle}</p>
            </div>
          </div>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-[2rem] border border-accent/10 shadow-sm">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3">{t.myCourses.noCourses}</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {t.myCourses.noCoursesDesc}
            </p>
            <Link to="/courses">
              <Button size="lg" className="rounded-full px-10 h-14 font-bold text-lg gradient-primary shadow-glow">
                {t.myCourses.browseCourses}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {enrolledCourses.map((enrollment) => (
              <Card
                key={enrollment.id}
                className="overflow-hidden border-accent/10 shadow-md hover:shadow-xl transition-all duration-500 rounded-[2rem] bg-card/50 backdrop-blur-sm group"
              >
                <div className="md:flex h-full">
                  <div className="md:w-1/3 min-h-[240px] relative overflow-hidden bg-primary/5">
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <BookOpen className="w-32 h-32 text-primary" />
                    </div>
                  </div>

                  <div className="md:w-2/3 p-8 flex flex-col">
                    <CardHeader className="p-0 mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                          {enrollment.batch?.name || "Devixa"}
                        </span>
                      </div>
                      <CardTitle className="text-3xl font-display font-black mb-3 group-hover:text-primary transition-colors duration-300">
                        {enrollment.course.title}
                      </CardTitle>
                      <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                        {enrollment.course.description}
                      </p>
                    </CardHeader>

                    <CardContent className="p-0 space-y-6 flex-1">
                      {/* Course Progress */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold text-muted-foreground">{t.myCourses.courseProgress}</span>
                          <span className="font-black text-primary text-lg">{enrollment.progress_percentage}%</span>
                        </div>
                        <Progress value={enrollment.progress_percentage} className="h-3 rounded-full bg-primary/10" />
                      </div>

                      {/* Final Exam Button */}
                      {enrollment.hasQuiz && (
                        <div className="pt-4">
                          <Link to={`/quiz/${enrollment.course_id}`} className={enrollment.progress_percentage < 100 ? "pointer-events-none" : ""}>
                            <Button
                              className={cn(
                                "w-full h-16 rounded-2xl text-xl font-black gap-3 shadow-glow transition-all duration-300",
                                enrollment.progress_percentage < 100 ? "bg-muted text-muted-foreground grayscale cursor-not-allowed" : "gradient-primary hover:scale-[1.02] active:scale-[0.98]"
                              )}
                              disabled={enrollment.progress_percentage < 100 || enrollment.quizAttempted}
                            >
                              <Sparkles className="w-6 h-6" />
                              {enrollment.quizAttempted
                                ? t.myCourses.quizCompleted
                                : enrollment.progress_percentage < 100
                                  ? t.myCourses.quizNotAvailable
                                  : t.myCourses.startQuiz}
                            </Button>
                          </Link>
                        </div>
                      )}
                    </CardContent>

                    <div className="mt-8 pt-6 border-t border-accent/10">
                      <Collapsible
                        open={expandedCourses.has(enrollment.id)}
                        onOpenChange={() => toggleCourseExpanded(enrollment.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between hover:bg-primary/5 rounded-xl h-12">
                            <span className="font-bold flex items-center gap-2">
                              <PlayCircle className="w-5 h-5 text-primary" />
                              {t.myCourses.sessions} ({enrollment.sessions.length})
                            </span>
                            {expandedCourses.has(enrollment.id) ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-4 space-y-3">
                          {enrollment.sessions.length === 0 ? (
                            <p className="text-center py-4 text-muted-foreground text-sm">{t.myCourses.noSessions}</p>
                          ) : (
                            enrollment.sessions.map((session) => (
                              <div
                                key={session.id}
                                className="p-5 rounded-2xl bg-muted/30 border border-accent/5 hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${session.attended ? 'bg-green-500/10 text-green-500' : 'bg-accent/10 text-accent'}`}>
                                      {session.attended ? <CheckCircle2 className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                        {session.title}
                                      </h4>
                                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-3.5 h-3.5" />
                                          {session.duration_hours} {t.common.hours}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {session.video_url && (
                                      <Button
                                        size="sm"
                                        variant={session.attended ? "outline" : "default"}
                                        className={session.attended ? "border-green-500/50 text-green-500 hover:bg-green-500/10" : "gradient-primary shadow-glow"}
                                        onClick={() => navigate(`/lecture/${session.id}`)}
                                      >
                                        {t.myCourses.watchLecture}
                                        <PlayCircle className="w-4 h-4 ms-2" />
                                      </Button>
                                    )}
                                    <Badge variant={session.attended ? "default" : "secondary"} className={session.attended ? "bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/30" : "bg-gray-800 text-gray-400"}>
                                      {session.attended ? t.myCourses.lectureCompleted : t.common.pending}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("animate-spin", className)}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
