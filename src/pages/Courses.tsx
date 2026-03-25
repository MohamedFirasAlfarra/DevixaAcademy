import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Clock, Users, Tag, Check, Info, Wallet, CreditCard, Send } from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import CourseDetailsModal from "@/components/courses/CourseDetailsModal";
import CourseCheckoutModal from "@/components/courses/CourseCheckoutModal";

interface Course {
  id: string;
  title: string;
  description: string;
  total_hours: number;
  sessions_count: number;
  price: number;
  price_syp: number;
  image_url: string | null;
  level?: string; // e.g., "Beginner", "Intermediate"
  duration?: number; // duration in months
}

interface Offer {
  id: string;
  course_id: string;
  discount_percentage: number;
  max_students: number | null;
  used_count: number;
}

interface Enrollment {
  course_id: string;
}

export default function Courses() {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [courses, setCourses] = useState<Course[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: coursesData } = await supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (coursesData) {
        setCourses(coursesData);
      }

      const { data: offersData } = await supabase
        .from("offers")
        .select("*")
        .eq("is_active", true);

      if (offersData) {
        setOffers(offersData);
      }

      if (user) {
        const { data: enrollmentData } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("user_id", user.id);

        if (enrollmentData) {
          setEnrollments(enrollmentData);
        }
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const getOfferForCourse = (courseId: string) => {
    return offers.find(
      (o) =>
        o.course_id === courseId &&
        (o.max_students === null || o.used_count < o.max_students)
    );
  };

  const isEnrolled = (courseId: string) => {
    return enrollments.some((e) => e.course_id === courseId);
  };

  const handleEnrollClick = (course: Course) => {
    setSelectedCourse(course);
    setPaymentModalOpen(true);
  };

  const handleEnrollmentSuccess = () => {
    // Refresh enrollments after successful request submission
    fetchData();
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight">{t.courses.title}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
            {t.courses.subtitle}
          </p>
        </div>

        {/* Courses grid */}
        {courses.length === 0 ? (
          <div className="p-20 text-center glass-dark rounded-[3rem] border-white/5 shadow-2xl">
            <BookOpen className="w-20 h-20 mx-auto text-primary/40 mb-6" />
            <h3 className="text-2xl font-display font-bold mb-4">{t.courses.noCourses}</h3>
            <p className="text-muted-foreground text-lg">
              {t.courses.noCoursesDesc}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => {
              const offer = getOfferForCourse(course.id);
              const enrolled = isEnrolled(course.id);
              const discountedPrice = offer
                ? course.price * (1 - offer.discount_percentage / 100)
                : course.price;

              return (
                <div
                  key={course.id}
                  className="group relative bg-card rounded-[2.5rem] overflow-hidden shadow-xl hover-lift hover-glow border border-white/5 flex flex-col h-full transition-all duration-500"
                >
                  {/* Image Section */}
                  <div
                    className="aspect-video relative overflow-hidden cursor-pointer"
                    onClick={() => {
                      setSelectedCourse(course);
                      setIsModalOpen(true);
                    }}
                  >
                    {course.image_url ? (
                      <img
                        src={course.image_url}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full gradient-primary opacity-20 flex items-center justify-center">
                        <BookOpen className="w-16 h-16 text-primary" />
                      </div>
                    )}
                    
                    {/* Floating Badges */}
                    <div className="absolute top-4 inset-x-4 flex justify-between items-start">
                        <Badge className="bg-primary/20 backdrop-blur-md text-primary border-primary/20 font-black px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest">
                            {course.level || t.courses.levelBeginner}
                        </Badge>
                        {offer && (
                            <Badge className="bg-destructive text-white border-none py-1.5 px-4 text-xs font-black shadow-glow-destructive animate-pulse">
                                {offer.discount_percentage}% {t.courses.off}
                            </Badge>
                        )}
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-8 flex-grow flex flex-col gap-6">
                    <div className="space-y-4 flex-grow">
                      <h3 className="text-2xl font-display font-bold line-clamp-2 min-h-[4rem] group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                      
                      {/* Course info */}
                      <div className="flex flex-wrap gap-4 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          {course.total_hours} {t.common.hours}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-accent" />
                          {course.sessions_count} {t.common.sessions}
                        </div>
                      </div>

                      <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                        {course.description}
                      </p>
                    </div>

                    {/* Pricing & CTA */}
                    <div className="pt-6 border-t border-white/5 space-y-6">
                      <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-display font-black text-foreground">
                              ${discountedPrice.toFixed(0)}
                            </span>
                            {offer && (
                              <span className="text-sm font-bold text-muted-foreground line-through opacity-40">
                                ${course.price}
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-bold text-primary/80 uppercase tracking-tighter">
                            {Number(course.price_syp || 0).toLocaleString()} ل.س
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-12 h-12 rounded-2xl bg-secondary/50 hover:bg-primary hover:text-white transition-all shadow-lg"
                          onClick={() => {
                            setSelectedCourse(course);
                            setIsModalOpen(true);
                          }}
                        >
                          <Info className="w-6 h-6" />
                        </Button>
                      </div>

                      {enrolled ? (
                        <Button className="w-full h-16 rounded-2xl text-lg font-black bg-secondary text-muted-foreground cursor-default" disabled>
                          <Check className="w-5 h-5 me-2" />
                          {t.courses.enrolled}
                        </Button>
                      ) : (
                        <Button
                          className="w-full h-16 rounded-2xl text-lg font-display font-black gradient-primary shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all"
                          onClick={() => handleEnrollClick(course)}
                          disabled={enrolling === course.id}
                        >
                          {enrolling === course.id
                            ? t.courses.enrolling
                            : t.courses.enroll}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CourseDetailsModal
        course={selectedCourse}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <CourseCheckoutModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        courseId={selectedCourse?.id || ""}
        courseTitle={selectedCourse?.title || ""}
        onSuccess={handleEnrollmentSuccess}
      />
    </DashboardLayout >
  );
}

