import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  BookOpen,
  Calendar,
  Link as LinkIcon,
  MessageCircle,
  Plus,
  Loader2,
  GraduationCap,
  Activity,
  Trash2,
  Edit2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Batch {
  id: string;
  name: string;
  course_id: string;
  current_students: number;
  max_students: number;
  is_active: boolean;
  start_date: string;
  resources_link: string | null;
  telegram_group_link: string | null;
  created_at: string;
  courses: {
    title: string;
  } | null;
}

export default function AdminBatches() {
  const { t, language, dir } = useLanguage();
  const { toast } = useToast();
  const isRTL = dir === "rtl";
  
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<{ id: string, title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Create Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    course_id: "",
    max_students: "",
    start_date: "",
    telegram_group_link: "",
    resources_link: ""
  });

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    course_id: "",
    max_students: "",
    start_date: "",
    telegram_group_link: "",
    resources_link: "",
    is_active: true
  });

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("batches")
        .select(`
          *,
          courses (
            title
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBatches(data || []);

      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, title")
        .eq("is_active", true);
        
      if (coursesData) {
        setCourses(coursesData);
      }
    } catch (error: any) {
      console.error("Error fetching batches:", error);
      toast({
        title: isRTL ? "خطأ في تحميل الدفعات" : "Error loading batches",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const openEditDialog = (batch: Batch) => {
    setEditingBatch(batch);
    setEditFormData({
      name: batch.name,
      course_id: batch.course_id,
      max_students: batch.max_students?.toString() || "",
      start_date: batch.start_date || "",
      telegram_group_link: batch.telegram_group_link || "",
      resources_link: batch.resources_link || "",
      is_active: batch.is_active
    });
    setIsEditOpen(true);
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.course_id) {
      toast({
        title: isRTL ? "معلومات ناقصة" : "Missing Information",
        description: isRTL ? "يرجى تعبئة اسم الدفعة واختيار الكورس." : "Please provide a batch name and select a course.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from("batches")
        .insert({
          name: formData.name,
          course_id: formData.course_id,
          max_students: formData.max_students ? parseInt(formData.max_students) : null,
          start_date: formData.start_date || null,
          telegram_group_link: formData.telegram_group_link || null,
          resources_link: formData.resources_link || null,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: isRTL ? "تم الإنشاء بنجاح" : "Success",
        description: isRTL ? "تم إنشاء الدفعة وإضافتها للقائمة." : "Learning batch has been successfully created."
      });
      
      setIsCreateOpen(false);
      setFormData({ name: "", course_id: "", max_students: "", start_date: "", telegram_group_link: "", resources_link: "" });
      fetchBatches();
    } catch (error: any) {
      toast({
        title: isRTL ? "حدث خطأ" : "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch || !editFormData.name || !editFormData.course_id) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from("batches")
        .update({
          name: editFormData.name,
          course_id: editFormData.course_id,
          max_students: editFormData.max_students ? parseInt(editFormData.max_students) : null,
          start_date: editFormData.start_date || null,
          telegram_group_link: editFormData.telegram_group_link || null,
          resources_link: editFormData.resources_link || null,
          is_active: editFormData.is_active
        })
        .eq("id", editingBatch.id);

      if (error) throw error;

      toast({
        title: isRTL ? "تم التحديث بنجاح" : "Updated Successfully",
        description: isRTL ? "تمت تحديث بيانات الدفعة بنجاح." : "The batch details have been updated."
      });
      
      setIsEditOpen(false);
      fetchBatches();
    } catch (error: any) {
      toast({
        title: isRTL ? "حدث خطأ" : "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (!deleteId) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from("batches")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: isRTL ? "تم الحذف بنجاح" : "Deleted Successfully",
        description: isRTL ? "تم حذف الدفعة من قاعدة البيانات." : "The batch has been removed from the database."
      });
      
      fetchBatches();
    } catch (error: any) {
      toast({
        title: isRTL ? "خطأ في الحذف" : "Deletion Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const filteredBatches = batches.filter(batch => {
    const searchLower = searchQuery.toLowerCase();
    return (
      batch.name.toLowerCase().includes(searchLower) ||
      (batch.courses?.title && batch.courses.title.toLowerCase().includes(searchLower))
    );
  });

  const totalBatches = batches.length;
  const activeBatches = batches.filter(b => b.is_active).length;
  const totalStudents = batches.reduce((sum, b) => sum + (b.current_students || 0), 0);
  
  const totalCapacity = batches.filter(b => b.is_active).reduce((sum, b) => sum + (b.max_students || 0), 0);
  const capacityPercentage = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

  const stats = [
    {
      label: t.adminBatches.totalBatches || (isRTL ? "إجمالي الدفعات" : "Total Batches"),
      value: totalBatches,
      icon: GraduationCap,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      label: t.adminBatches.activeBatches || (isRTL ? "الدفعات النشطة" : "Active Batches"),
      value: activeBatches,
      icon: Activity,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    },
    {
      label: t.adminBatches.totalStudents || (isRTL ? "إجمالي الطلاب" : "Total Students"),
      value: totalStudents,
      icon: Users,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10"
    },
    {
      label: t.adminBatches.capacity || (isRTL ? "القدرة الاستيعابية" : "Capacity Used"),
      value: `${capacityPercentage}%`,
      icon: BookOpen,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-8">
        {/* Header content */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2 text-foreground">{t.nav.batches}</h1>
            <p className="text-muted-foreground">{t.adminBatches.subtitle}</p>
          </div>
          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="gradient-primary text-white border-0 shrink-0 shadow-lg hover:scale-[1.02] transition-transform"
          >
            <Plus className="w-5 h-5 me-2" />
            {t.adminBatches.createBatch || (isRTL ? "إنشاء دفعة" : "Create Batch")}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl", stat.bgColor, stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search Bar */}
        <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
          <div className="relative max-w-md">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
            <Input
              type="text"
              placeholder={t.adminBatches.searchPlaceholder || (isRTL ? "ابحث بالاسم أو الدورة..." : "Search by name or course...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn("bg-background", isRTL ? "pr-9" : "pl-9")}
            />
          </div>
        </div>

        {/* Batches Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="bg-card border border-border/50 rounded-2xl p-12 text-center">
            <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-bold mb-2">{t.adminBatches.noBatches || (isRTL ? "لا توجد دفعات" : "No Batches Found")}</h3>
            <p className="text-muted-foreground">
              {(isRTL ? "لم يتم العثور على دفعات مطابقة لبحثك." : "No learning batches found matching your search criteria.")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            <AnimatePresence>
              {filteredBatches.map((batch, index) => (
                <motion.div
                  key={batch.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="group relative bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/40 transition-all duration-500 hover:-translate-y-2 flex flex-col h-full"
                >
                  {/* Status Indicator Bar */}
                  <div className={cn(
                    "h-1.5 w-full",
                    batch.is_active ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-slate-400 to-slate-600"
                  )} />

                  {/* Card Header Section */}
                  <div className={cn(
                    "relative p-6 pb-4 bg-gradient-to-br transition-colors duration-500",
                    batch.is_active ? "from-emerald-500/10 to-transparent" : "from-slate-500/10 to-transparent"
                  )}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant="outline"
                            className={cn(
                              "font-semibold text-[10px] uppercase tracking-wider px-2 py-0",
                              batch.is_active 
                                ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" 
                                : "border-slate-500/30 text-slate-500 bg-slate-500/5"
                            )}
                          >
                            {batch.is_active 
                              ? (t.adminBatches.statusActive || (isRTL ? "نشطة" : "Active")) 
                              : (t.adminBatches.statusInactive || (isRTL ? "مكتملة" : "Completed"))}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground/60 font-mono">#{batch.id.slice(0, 8)}</span>
                        </div>
                        <h3 className="text-xl font-display font-bold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                          {batch.name}
                        </h3>
                        <div className="flex items-center text-sm text-muted-foreground font-medium">
                          <BookOpen className="w-4 h-4 me-2 text-primary/60 shrink-0" />
                          <span className="truncate">{batch.courses?.title || (isRTL ? "دورة غير معروفة" : "Unknown Course")}</span>
                        </div>
                      </div>
                      
                      {/* Action Buttons Overlay */}
                      <div className="flex flex-col gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(batch)}
                          className="w-9 h-9 rounded-xl bg-background/50 backdrop-blur-md border border-border/40 text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(batch.id)}
                          className="w-9 h-9 rounded-xl bg-background/50 backdrop-blur-md border border-border/40 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all duration-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Card Body Section */}
                  <div className="p-6 pt-2 space-y-6 flex-1 flex flex-col">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/30 border border-border/30">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-blue-500" />
                          {t.adminBatches.students || (isRTL ? "الطلاب" : "Students")}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-display font-bold">{batch.current_students || 0}</span>
                          <span className="text-xs text-muted-foreground">/ {batch.max_students || "∞"}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          {t.adminBatches.startDate || (isRTL ? "البدء" : "Start")}
                        </span>
                        <p className="text-sm font-semibold truncate">
                          {batch.start_date ? new Date(batch.start_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' }) : '-'}
                        </p>
                      </div>
                    </div>

                    {/* Progress Visualization */}
                    {batch.max_students && batch.max_students > 0 ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[11px] font-bold">
                          <span className="text-muted-foreground">{isRTL ? "نسبة الإشغال" : "Batch Occupancy"}</span>
                          <span className={cn(
                            ((batch.current_students || 0) / batch.max_students) >= 0.9 ? "text-destructive" :
                            ((batch.current_students || 0) / batch.max_students) > 0.7 ? "text-amber-500" : "text-emerald-500"
                          )}>
                            {Math.round(((batch.current_students || 0) / batch.max_students) * 100)}%
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-muted/40 rounded-full overflow-hidden border border-border/20 p-[2px]">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(((batch.current_students || 0) / batch.max_students) * 100, 100)}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={cn(
                              "h-full rounded-full shadow-inner",
                              ((batch.current_students || 0) / batch.max_students) >= 1 ? "bg-gradient-to-r from-red-500 to-rose-600" :
                              ((batch.current_students || 0) / batch.max_students) > 0.8 ? "bg-gradient-to-r from-amber-400 to-orange-500" : 
                              "bg-gradient-to-r from-primary to-blue-500"
                            )}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center p-4 rounded-2xl border border-dashed border-border/50 text-muted-foreground/40 text-xs italic">
                        {isRTL ? "بدون حد أقصى للطلاب" : "Unlimited Capacity"}
                      </div>
                    )}

                    {/* Bottom Actions Section */}
                    <div className="pt-4 mt-auto flex gap-3 border-t border-border/30">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "flex-1 h-11 rounded-xl bg-blue-500/5 hover:bg-blue-500/15 text-blue-500 border border-blue-500/10 hover:border-blue-500/30 transition-all group/btn",
                          !batch.telegram_group_link && "opacity-30 grayscale cursor-not-allowed"
                        )}
                        disabled={!batch.telegram_group_link}
                        onClick={() => batch.telegram_group_link && window.open(batch.telegram_group_link, '_blank')}
                      >
                        <MessageCircle className="w-4 h-4 me-2 transition-transform group-hover/btn:scale-110" />
                        <span className="text-xs font-bold">{t.adminBatches.telegramGroup || (isRTL ? "القروب" : "Group")}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "flex-1 h-11 rounded-xl bg-purple-500/5 hover:bg-purple-500/15 text-purple-500 border border-purple-500/10 hover:border-purple-500/30 transition-all group/btn",
                          !batch.resources_link && "opacity-30 grayscale cursor-not-allowed"
                        )}
                        disabled={!batch.resources_link}
                        onClick={() => batch.resources_link && window.open(batch.resources_link, '_blank')}
                      >
                        <LinkIcon className="w-4 h-4 me-2 transition-transform group-hover/btn:rotate-12" />
                        <span className="text-xs font-bold">{t.adminBatches.resources || (isRTL ? "المصادر" : "Drive")}</span>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Batch Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className={cn("sm:max-w-[500px]", dir === "rtl" && "font-cairo")} dir={dir}>
          <DialogHeader>
            <DialogTitle>{t.adminBatches.addBatchTitle || (isRTL ? "إضافة دفعة جديدة" : "Add New Batch")}</DialogTitle>
            <DialogDescription>
              {t.adminBatches.addBatchDesc || (isRTL ? "تكوين تفاصيل دفعة تعليمية جديدة." : "Configure details for a new learning batch.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBatch} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{isRTL ? "اسم الدفعة" : "Batch Name"} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={isRTL ? "مثال: دفعة برمجة الويب 1" : "e.g., Web Dev Batch 1"}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="course">{t.adminBatches.course || (isRTL ? "الكورس" : "Course")} *</Label>
              <select
                id="course"
                value={formData.course_id}
                onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="" disabled>
                  {isRTL ? "اختر الكورس" : "Select a Course"}
                </option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_students">{t.adminBatches.capacity || (isRTL ? "القدرة الاستيعابية" : "Max Students")}</Label>
                <Input
                  id="max_students"
                  type="number"
                  min="0"
                  value={formData.max_students}
                  onChange={(e) => setFormData({ ...formData, max_students: e.target.value })}
                  placeholder={isRTL ? "الحد الأقصى للطلاب" : "Unlimited if empty"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">{t.adminBatches.startDate || (isRTL ? "تاريخ البدء" : "Start Date")}</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram">{t.adminBatches.telegramGroup || (isRTL ? "مجموعة التلغرام" : "Telegram Group")} (Optional)</Label>
              <Input
                id="telegram"
                type="url"
                value={formData.telegram_group_link}
                onChange={(e) => setFormData({ ...formData, telegram_group_link: e.target.value })}
                placeholder="https://t.me/..."
                className="text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resources">{t.adminBatches.resources || (isRTL ? "المصادر" : "Resources Link")} (Optional)</Label>
              <Input
                id="resources"
                type="url"
                value={formData.resources_link}
                onChange={(e) => setFormData({ ...formData, resources_link: e.target.value })}
                placeholder="https://drive.google.com/..."
                className="text-left"
                dir="ltr"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t.common.cancel || (isRTL ? "إلغاء" : "Cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gradient-primary text-white border-0">
                {isSubmitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                {t.adminBatches.saveBatchBtn || (isRTL ? "إنشاء الدفعة" : "Create Batch")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Batch Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className={cn("sm:max-w-[500px]", dir === "rtl" && "font-cairo")} dir={dir}>
          <DialogHeader>
            <DialogTitle>{isRTL ? "تعديل الدفعة" : "Edit Batch"}</DialogTitle>
            <DialogDescription>
              {isRTL ? "تعديل بيانات الدفعة المحددة." : "Update the details for the selected batch."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateBatch} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{isRTL ? "اسم الدفعة" : "Batch Name"} *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder={isRTL ? "مثال: دفعة برمجة الويب 1" : "e.g., Web Dev Batch 1"}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-course">{t.adminBatches.course || (isRTL ? "الكورس" : "Course")} *</Label>
              <select
                id="edit-course"
                value={editFormData.course_id}
                onChange={(e) => setEditFormData({ ...editFormData, course_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="" disabled>
                  {isRTL ? "اختر الكورس" : "Select a Course"}
                </option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-max_students">{t.adminBatches.capacity || (isRTL ? "القدرة الاستيعابية" : "Max Students")}</Label>
                <Input
                  id="edit-max_students"
                  type="number"
                  min="0"
                  value={editFormData.max_students}
                  onChange={(e) => setEditFormData({ ...editFormData, max_students: e.target.value })}
                  placeholder={isRTL ? "الحد الأقصى للطلاب" : "Unlimited if empty"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-start_date">{t.adminBatches.startDate || (isRTL ? "تاريخ البدء" : "Start Date")}</Label>
                <Input
                  id="edit-start_date"
                  type="date"
                  value={editFormData.start_date}
                  onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2 pb-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-is_active"
                  checked={editFormData.is_active}
                  onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="edit-is_active" className="cursor-pointer">{isRTL ? "اسم الدفعة نشط" : "Batch is Active"}</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-telegram">{t.adminBatches.telegramGroup || (isRTL ? "مجموعة التلغرام" : "Telegram Group")} (Optional)</Label>
              <Input
                id="edit-telegram"
                type="url"
                value={editFormData.telegram_group_link}
                onChange={(e) => setEditFormData({ ...editFormData, telegram_group_link: e.target.value })}
                placeholder="https://t.me/..."
                className="text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-resources">{t.adminBatches.resources || (isRTL ? "المصادر" : "Resources Link")} (Optional)</Label>
              <Input
                id="edit-resources"
                type="url"
                value={editFormData.resources_link}
                onChange={(e) => setEditFormData({ ...editFormData, resources_link: e.target.value })}
                placeholder="https://drive.google.com/..."
                className="text-left"
                dir="ltr"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                {t.common.cancel || (isRTL ? "إلغاء" : "Cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gradient-primary text-white border-0">
                {isSubmitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                {t.common.save || (isRTL ? "حفظ التغييرات" : "Save Changes")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className={cn(dir === "rtl" && "font-cairo")} dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRTL ? "هل أنت متأكد من الحذف؟" : "Are you absolutely sure?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL 
                ? "سيؤدي هذا الإجراء إلى حذف الدفعة نهائياً من النظام. لا يمكن التراجع عن هذه الخطوة." 
                : "This action cannot be undone. This will permanently delete the batch and remove it from our servers."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeleting}>
              {t.common.cancel || (isRTL ? "إلغاء" : "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteBatch();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRTL ? "حذف نهائي" : "Delete Permanently")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
