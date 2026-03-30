import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight, ArrowLeft, Play, FileText, Sparkles, Award, ChevronRight, Tag, CheckCircle2, Star, Users, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import img1 from "@/assets/images/course-web.png";
import img2 from "@/assets/images/course-mobile.png";
import img3 from "@/assets/images/course-UIUX.png";
import img4 from "@/assets/images/course-ICDL.png";
import img5 from "@/assets/images/course-cyberSecurity.png";
import img6 from "@/assets/images/course-SQL-Language.png";
import img7 from "@/assets/images/course-Linux.png";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import OfferCard from "@/components/courses/OfferCard";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollReveal from "@/components/animations/ScrollReveal";
import AntigravityBackground from "@/components/animations/AntigravityBackground";
import TechLogoStrip from "@/components/sections/TechLogoStrip";

type Offer = Tables<"offers">;
type Course = Tables<"courses">;

export default function Index() {
  const { user } = useAuth();
  const { t, dir, language } = useLanguage();
  const { theme } = useTheme();
  const [offers, setOffers] = useState<(Offer & { courses: Course })[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);

  useEffect(() => {
    async function fetchOffers() {
      try {
        const { data, error } = await supabase
          .from("offers")
          .select("*, courses(*)")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(3);

        if (error) throw error;
        setOffers(data as (Offer & { courses: Course })[] || []);
      } catch (error) {
        console.error("Error fetching offers:", error);
      } finally {
        setLoadingOffers(false);
      }
    }

    fetchOffers();
  }, []);

  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  const slides = [
    {
      title: language === "ar" ? "تطوير مواقع ويب" : "Web Development",
      subtitle: language === "ar" ? "ابدأ رحلتك في عالم البرمجة" : "Start your journey in the world of programming",
      description: language === "ar" ? "تعلم بناء تطبيقات ويب متكاملة من الصفر حتى الاحتراف باستخدام أحدث التقنيات العالمية." : "Learn to build complete web applications from scratch to professional level using latest global technologies.",
      image: img1,
      gradient: "from-blue-600/20 to-cyan-600/20"
    },
    {
      title: language === "ar" ? "تطوير تطبيقات موبايل" : "Mobile App Development",
      subtitle: language === "ar" ? "صمم تطبيقاتك المفضلة" : "Design your favorite apps",
      description: language === "ar" ? "احترف تطوير تطبيقات الهواتف الذكية لنظامي Android و iOS باستخدام أحدث لغات البرمجة." : "Master smart phone app development for Android and iOS using modern programming languages.",
      image: img2,
      gradient: "from-purple-600/20 to-pink-600/20"
    },
    {
      title: language === "ar" ? "UI/UX Designer" : "UI/UX Designer",
      subtitle: language === "ar" ? "جمال التصميم وسهولة الاستخدام" : "Design Beauty & Ease of Use",
      description: language === "ar" ? "تعلم فن تصميم واجهات المستخدم وتجربة المستخدم لخلق منتجات رقمية مبهرة وجذابة." : "Learn the art of UI/UX design to create stunning and engaging digital products.",
      image: img3,
      gradient: "from-emerald-600/20 to-teal-600/20"
    },
    {
      title: language === "ar" ? "كورس ICDL كامل" : "Full ICDL Course",
      subtitle: language === "ar" ? "إتقان المهارات الحاسوبية" : "Master Computer Skills",
      description: language === "ar" ? "احصل على المهارات الأساسية في الحاسوب والبرامج المكتبية بشهادة معترف بها دولياً." : "Gain essential computer and office software skills with an internationally recognized certificate.",
      image: img4,
      gradient: "from-amber-600/20 to-orange-600/20"
    },
    {
      title: language === "ar" ? "كورس الأمن السيبراني الشامل" : "Comprehensive Cybersecurity",
      subtitle: language === "ar" ? "احمِ عالمك الرقمي" : "Protect Your Digital World",
      description: language === "ar" ? "تعلم تقنيات حماية الأنظمة والشبكات، واحتراف القرصنة الأخلاقية والدفاع السيبراني المتقدم." : "Learn system and network protection techniques, master ethical hacking and advanced cyber defense.",
      image: img5,
      gradient: "from-indigo-600/20 to-violet-600/20"
    },
    {
      title: language === "ar" ? "SQL Language Course" : "SQL Language Course",
      subtitle: language === "ar" ? "التعامل مع قواعد البيانات" : "Working with databases",
      description: language === "ar" ? "تعلم لغة SQL الخاصة بالتعامل مع قواعد البيانات من المستوى المبتدئ حتى مستوى فوق المتوسط." : "Learn the SQL language for dealing with databases from beginner to upper-intermediate level.",
      image: img6,
      gradient: "from-emerald-600/20 to-teal-600/20"
    },
    {
      title: language === "ar" ? "Linux Basics Course" : "Linux Basics Course",
      subtitle: language === "ar" ? "مستوى متقدم للمبتدئين في عالم الأنظمة وإدارة الخوادم" : "Advanced level for beginners in the world of systems and server management",
      description: language === "ar" ? "تعلم أساسيات نظام Linux من الصفر حتى مستوى متقدم للمبتدئين في عالم الأنظمة وإدارة الخوادم." : "Learn the basics of Linux from scratch to an advanced level for beginners in the world of systems and server management.",
      image: img7,
      gradient: "from-emerald-600/20 to-teal-600/20"
    }
  ];

  const steps = [
    { icon: Users, title: t.landing.howItWorks.step1, desc: t.landing.howItWorks.step1Desc },
    { icon: Play, title: t.landing.howItWorks.step2, desc: t.landing.howItWorks.step2Desc },
    { icon: Briefcase, title: t.landing.howItWorks.step3, desc: t.landing.howItWorks.step3Desc },
    { icon: Award, title: t.landing.howItWorks.step4, desc: t.landing.howItWorks.step4Desc },
  ];

  const testimonials = [
    { name: language === "ar" ? "أحمد محمد" : "Ahmed Mohamed", role: "Frontend Developer", text: language === "ar" ? "من أفضل المنصات التي تعلمت منها، الشرح واضح جداً والمدربين محترفين." : "One of the best platforms I've learned from, the explanation is very clear and the trainers are professional.", rating: 5 },
    { name: language === "ar" ? "سارة أحمد" : "Sara Ahmed", role: "UI/UX Designer", text: language === "ar" ? "ساعدني كورس التصميم في الحصول على أول وظيفة كـ Freelancer." : "The design course helped me get my first job as a Freelancer.", rating: 5 },
    { name: language === "ar" ? "محمود علي" : "Mahmoud Ali", role: "Student", text: language === "ar" ? "نظام الجلسات التفاعلية رائع جداً ويسمح لنا بطرح الأسئلة مباشرة." : "The interactive sessions system is very great and allows us to ask questions directly.", rating: 5 },
  ];
  
  const features = [
    {
      icon: BookOpen,
      title: t.landing.features.premiumCourses,
      description: t.landing.features.premiumCoursesDesc,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Award,
      title: t.landing.features.certifications,
      description: t.landing.features.certificationsDesc,
      gradient: "from-amber-400 to-orange-500"
    },
    {
      icon: BookOpen,
      title: t.landing.features.expertMentors,
      description: t.landing.features.expertMentorsDesc,
      gradient: "from-purple-500 to-pink-500"
    },
  ];

  const featuredCourses = [
    {
      title: language === "ar" ? "تطوير الويب الشامل" : "Full Stack Web Development",
      category: language === "ar" ? "مسار الويب" : "Web Development",
      image: img1,
      rating: 4.9,
      students: 1240
    },
    {
      title: language === "ar" ? "تطوير تطبيقات الموبايل" : "Mobile App Development",
      category: language === "ar" ? "مسار الموبايل" : "Mobile Development",
      image: img2,
      rating: 4.8,
      students: 856
    },
    {
      title: language === "ar" ? "Linux Basics Course" : "Linux Basics Course",
      category: language === "ar" ? "الأنظمة وإدارة الخوادم" : "Systems & Servers",
      image: img7,
      rating: 4.7,
      students: 520
    },
    {
      title: language === "ar" ? "كورس ICDL كامل" : "Full ICDL Course",
      category: language === "ar" ? "مسار ICDL" : "ICDL",
      image: img4,
      rating: 4.5,
      students: 3100
    },
    {
      title: language === "ar" ? "كورس الأمن السيبراني الشامل" : "Comprehensive Cybersecurity",
      category: language === "ar" ? "الأمن السيبراني" : "Cyber Security",
      image: img5,
      rating: 4.9,
      students: 430
    },
    {
      title: language === "ar" ? "SQL Language Course" : "SQL Language Course",
      category: language === "ar" ? "قواعد البيانات" : "Databases",
      image: img6,
      rating: 4.6,
      students: 1100
    }
  ];

  const [api, setApi] = React.useState<any>();
  const [current, setCurrent] = React.useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <Navbar />

      {/* Hero Slider */}
      <section className="relative min-h-[85vh] md:min-h-[90vh] py-12 md:py-16 flex items-center overflow-hidden bg-background">
        <AntigravityBackground
          count={300}
          magnetRadius={35}
          ringRadius={14}
          waveSpeed={0.4}
          waveAmplitude={3.1}
          particleSize={2}
          lerpSpeed={0.01}
          color={'#5227FF'}
          autoAnimate
          particleVariance={0.5}
          rotationSpeed={0}
          depthFactor={1}
          pulseSpeed={3}
          particleShape="capsule"
          fieldStrength={10}
        />
        <Carousel
          setApi={setApi}
          className="w-full h-full pt-20"
          opts={{ align: "start", loop: true, direction: dir }}
          plugins={[Autoplay({ delay: 3000, stopOnInteraction: false })]}
        >
          <CarouselContent className="h-full">
            {slides.map((slide, index) => (
              <CarouselItem key={index} className="basis-full h-full">
                <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center min-h-[75vh] py-10 relative">
                  <div className={cn("absolute -z-10 w-full h-full blur-[120px] opacity-20", slide.gradient)} />

                  <div className="space-y-8 animate-fade-in text-start">
                    <div className="flex flex-col gap-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border-accent/20 text-accent font-bold text-xs uppercase tracking-widest w-fit">
                        <Sparkles className="w-4 h-4" />
                        {t.landing.firstTwoFree}
                      </div>
                    </div>
                    <div className="space-y-4 md:space-y-6">
                      <h2 className="text-lg md:text-2xl font-display font-bold text-primary uppercase tracking-wider">{slide.subtitle}</h2>
                      <h1 className="text-4xl xs:text-5xl lg:text-[5rem] font-display font-black leading-[1.1] tracking-tight text-foreground">
                        {slide.title}
                      </h1>
                    </div>
                    <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                      {slide.description}
                    </p>
                    <div className="flex flex-col xs:flex-row gap-4 pt-4">
                      <Link to="/auth?signup=true" className="w-full xs:w-auto">
                        <Button size="lg" className="w-full xs:w-auto rounded-2xl px-8 md:px-10 text-lg h-14 md:h-16 shadow-glow group gradient-primary border-none text-white transition-all hover:scale-105">
                          {t.landing.registerNow}
                          <ArrowIcon className="w-5 h-5 ms-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                      <Link to="/courses" className="w-full xs:w-auto">
                        <Button size="lg" variant="outline" className="w-full xs:w-auto rounded-2xl px-8 md:px-10 text-lg h-14 md:h-16 glass text-foreground border-border/40 hover:bg-accent/10 transition-all hover:scale-105">
                          <Play className="w-5 h-5 me-2 fill-primary text-primary" />
                          {t.landing.startLearning}
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="relative animate-float mt-8 md:mt-0">
                    <div className="absolute -inset-6 md:-inset-10 bg-primary/20 blur-[80px] md:blur-[100px] rounded-full animate-pulse" />
                    <div className="relative rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-white/20 shadow-2xl glass-dark group aspect-video md:aspect-[16/10]">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                      <img
                        src={slide.image}
                        alt={slide.title}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute bottom-6 left-6 right-6 p-6 glass rounded-2xl border-white/10 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                        <p className="text-white text-sm font-medium">{t.landing.joinPlatformDesc}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          <div className="absolute inset-y-0 left-4 lg:left-8 flex items-center z-30">
            <CarouselPrevious className="static h-12 w-12 rounded-full border-border bg-background/50 text-foreground hover:bg-accent/20 transition-all hover:scale-110 shadow-lg" />
          </div>
          <div className="absolute inset-y-0 right-4 lg:right-8 flex items-center z-30">
            <CarouselNext className="static h-12 w-12 rounded-full border-border bg-background/50 text-foreground hover:bg-accent/20 transition-all hover:scale-110 shadow-lg" />
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  "w-3 h-3 rounded-full transition-all duration-300",
                  current === index ? "bg-primary w-8 shadow-glow" : "bg-primary/20 hover:bg-primary/40"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </Carousel>
      </section>

      <TechLogoStrip />

      {/* Featured Courses */}
      <section className="py-24 bg-secondary/10 min-h-screen">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <h2 className="text-4xl font-display font-bold">{t.landing.featuredCourses}</h2>
              </motion.div>
              <motion.p
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="text-lg font-normal text-muted-foreground"
              >
                {t.landing.featuredCoursesDesc}
              </motion.p>
            </div>
            <Link to="/courses">
              <Button variant="link" className="text-primary font-bold gap-2 text-lg">
                {t.common.viewAll} <ArrowIcon className="w-5 h-5" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {featuredCourses.map((course, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: "easeOut" }}
                className="group relative bg-card rounded-[2rem] overflow-hidden shadow-xl hover-lift hover-glow border border-white/5"
              >
                <div className="h-56 overflow-hidden relative">
                  <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-4 right-4 glass px-3 py-1 rounded-full text-xs font-bold text-primary flex items-center gap-1">
                    <Star className="w-3 h-3 fill-primary" />
                    {course.rating}
                  </div>
                  {i === 0 && (
                    <div className="absolute top-4 left-4 bg-accent text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                      Best Seller
                    </div>
                  )}
                </div>
                <div className="p-8 space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold text-primary uppercase tracking-widest">
                    <span>{course.category}</span>
                    <span className="text-muted-foreground flex items-center gap-1 normal-case">
                      <Users className="w-3 h-3" />
                      {course.students}
                    </span>
                  </div>
                  <h3 className="text-2xl font-display font-bold line-clamp-2 min-h-[4rem]">{course.title}</h3>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <Button variant="ghost" className="p-0 h-auto hover:bg-transparent text-muted-foreground group-hover:text-primary transition-colors font-bold">
                      {t.landing.getMaterials}
                    </Button>
                    <Link to="/courses">
                      <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center group-hover:gradient-primary group-hover:text-white transition-all shadow-lg">
                        <ChevronRight className={`w-6 h-6 ${dir === "rtl" ? "rotate-180" : ""}`} />
                      </div>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="text-primary font-bold tracking-widest uppercase text-sm"
            >
              {t.landing.features.premiumCourses}
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl font-display font-bold"
            >
              {t.common.brandName2}
            </motion.h2>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.2, ease: "backOut" }}
                className="relative p-10 rounded-3xl glass hover-glow transition-all group"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-8 shadow-lg group-hover:rotate-6 transition-transform`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-display font-bold mb-4">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">{feature.description}</p>
                <div className="absolute top-6 right-6 text-primary/10 font-display font-black text-6xl group-hover:text-primary/20 transition-colors">0{i + 1}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Special Offers */}
      <section className="py-16 md:py-24 relative overflow-hidden bg-background">
        <div className="absolute inset-0 bg-accent/5 -z-10" />
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-16 gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent font-bold text-xs md:text-sm uppercase tracking-widest border border-accent/20">
                <Tag className="w-3 h-3 md:w-4 md:h-4" />
                {language === "ar" ? "عروض حصرية" : "Exclusive Offers"}
              </div>
              <motion.h2 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-3xl md:text-5xl lg:text-6xl font-display font-black leading-tight text-foreground"
              >
                {t.courses.offersTitle}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-lg md:text-xl font-normal text-muted-foreground leading-relaxed"
              >
                {t.courses.offersSubtitle}
              </motion.p>
            </div>

            {!user && (
              <Link to="/auth?signup=true" className="animate-fade-in w-full md:w-auto">
                <Button className="w-full md:w-auto rounded-xl px-8 h-12 md:h-14 text-base md:text-lg font-bold gradient-primary shadow-glow hover:scale-105 transition-all">
                  {t.landing.registerNow}
                </Button>
              </Link>
            )}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="w-full"
          >
            {loadingOffers ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-80 rounded-3xl bg-muted/20 animate-pulse border border-border/50" />
                ))}
              </div>
            ) : offers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {offers.map((offer) => (
                  <div key={offer.id}>
                    <OfferCard offer={offer} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative rounded-[2rem] md:rounded-[3rem] overflow-hidden gradient-hero p-8 md:p-16 lg:p-24 text-center text-white shadow-2xl">
                <div className="absolute inset-0 bg-black/20 backdrop-blur-md" />
                <div className="relative z-10 max-w-3xl mx-auto space-y-6 md:space-y-8">
                  <Sparkles className="w-12 h-12 md:w-16 md:h-16 mx-auto opacity-80 animate-pulse" />
                  <div className="space-y-3 md:space-y-4">
                    <h2 className="text-2xl md:text-4xl lg:text-5xl font-display font-black leading-tight">
                      {t.courses.noOffers}
                    </h2>
                    <p className="text-base md:text-lg lg:text-xl text-white/80 max-w-xl mx-auto">
                      {t.courses.noOffersDesc}
                    </p>
                  </div>
                  <div className="pt-4">
                    <Link to="/courses">
                      <Button size="lg" variant="secondary" className="rounded-full px-8 md:px-12 h-12 md:h-14 lg:h-16 text-base md:text-lg lg:text-xl font-bold shadow-2xl hover:scale-105 transition-transform active:scale-95">
                        {language === "ar" ? "تصفح جميع الدورات" : "Browse All Courses"}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <ScrollReveal>
        <section className="py-16 md:py-32 relative overflow-hidden bg-secondary/5">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20 space-y-4">
              <h2 className="text-3xl md:text-5xl font-display font-black">{t.landing.howItWorks.title}</h2>
              <div className="h-1.5 w-20 md:w-24 bg-primary mx-auto rounded-full" />
            </div>
            <div className="grid md:grid-cols-4 gap-8 relative">
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-y-1/2 -z-10" />
              {steps.map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center space-y-6 group">
                  <div className="w-20 h-20 rounded-[2rem] bg-card border border-white/5 flex items-center justify-center text-primary shadow-xl group-hover:gradient-primary group-hover:text-white transition-all duration-500 hover-lift relative">
                    <step.icon className="w-8 h-8" />
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full gradient-primary text-white text-xs font-black flex items-center justify-center border-4 border-background">
                      {i + 1}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-display font-bold">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Testimonials */}
      <section className="py-32 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="space-y-4">
              <h2 className="text-4xl font-display font-black">{t.landing.testimonials.title}</h2>
              <p className="text-lg text-muted-foreground">{t.landing.testimonials.subtitle}</p>
            </div>
          </div>

          <Carousel
            opts={{ align: "start", loop: true, direction: dir }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {testimonials.map((testimonial, i) => (
                <CarouselItem key={i} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="h-full p-8 rounded-[2.5rem] glass-dark border-white/5 space-y-6 hover-glow transition-all">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-lg text-white/80 leading-relaxed italic">"{testimonial.text}"</p>
                    <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                      <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center font-bold text-white">
                        {testimonial.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-white">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-end gap-2 mt-8">
              <CarouselPrevious className="static translate-y-0" />
              <CarouselNext className="static translate-y-0" />
            </div>
          </Carousel>
        </div>
      </section>

      {/* Final CTA */}
      <ScrollReveal>
        <section className="py-24 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="relative rounded-[3rem] overflow-hidden gradient-primary p-12 md:p-20 text-center text-white shadow-2xl">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
              <div className="relative z-10 space-y-8">
                <h2 className="text-4xl md:text-6xl font-display font-black leading-tight">
                  {t.landing.startJourney}
                </h2>
                <p className="text-xl text-white/80 max-w-2xl mx-auto">
                  {t.landing.description}
                </p>
                <div className="flex flex-wrap justify-center gap-6 pt-4">
                  <Link to="/auth?signup=true">
                    <Button size="lg" variant="secondary" className="rounded-2xl px-12 h-16 text-xl font-black shadow-2xl hover:scale-105 transition-transform">
                      {t.landing.registerNow}
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2 text-white font-bold animate-pulse">
                    <Tag className="w-5 h-5" />
                    {t.landing.limitedOffer}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <Footer />
    </div>
  );
}
