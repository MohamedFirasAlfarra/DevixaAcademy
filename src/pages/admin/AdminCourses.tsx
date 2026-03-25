import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Plus, Pencil, Trash2, BookOpen, Loader2, Upload, X, Clock, Calendar, DollarSign, Layers, CheckCircle2, MoreVertical, PlayCircle, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import type { Tables } from "@/integrations/supabase/types";

type Course = Tables<"courses">;

interface CourseFormData {
  title: string;
  description: string;
  total_hours: number;
  sessions_count: number;
  price: number;
  price_syp: number;
  image_url: string;
  is_active: boolean;
}

const defaultFormData: CourseFormData = {
  title: "",
  description: "",
  total_hours: 0,
  sessions_count: 0,
  price: 0,
  price_syp: 0,
  image_url: "",
  is_active: true,
};

export default function AdminCourses() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [formData, setFormData] = useState<CourseFormData>(defaultFormData);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();


  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast({
        title: t.common.error,
        description: t.adminCourses.loadFailed,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        title: course.title,
        description: course.description || "",
        total_hours: course.total_hours || 0,
        sessions_count: course.sessions_count || 0,
        price: Number(course.price) || 0,
        price_syp: Number(course.price_syp) || 0,
        image_url: course.image_url || "",
        is_active: course.is_active ?? true,
      });
    } else {
      setEditingCourse(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCourse(null);
    setFormData(defaultFormData);
    setSelectedFile(null);
    setImagePreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from("courses")
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("courses")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: t.adminCourses.validationError,
        description: t.adminCourses.titleRequired,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = formData.image_url;

      if (selectedFile) {
        finalImageUrl = await uploadImage(selectedFile);
      }

      if (editingCourse) {
        const { error } = await supabase
          .from("courses")
          .update({
            title: formData.title.trim(),
            description: formData.description.trim(),
            total_hours: formData.total_hours,
            sessions_count: formData.sessions_count,
            price: formData.price,
            price_syp: formData.price_syp,
            image_url: finalImageUrl,
            is_active: formData.is_active,
          })
          .eq("id", editingCourse.id);

        if (error) throw error;

        toast({
          title: t.common.success,
          description: t.adminCourses.courseUpdated,
        });
      } else {
        const { error } = await supabase.from("courses").insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          total_hours: formData.total_hours,
          sessions_count: formData.sessions_count,
          price: formData.price,
          price_syp: formData.price_syp,
          image_url: finalImageUrl,
          is_active: formData.is_active,
        });

        if (error) throw error;

        toast({
          title: t.common.success,
          description: t.adminCourses.courseCreated,
        });
      }

      handleCloseDialog();
      fetchCourses();
    } catch (error) {
      console.error("Error saving course:", error);
      toast({
        title: t.common.error,
        description: t.adminCourses.saveFailed,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (course: Course) => {
    setCourseToDelete(course);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseToDelete.id);

      if (error) throw error;

      toast({
        title: t.common.success,
        description: t.adminCourses.courseDeleted,
      });

      fetchCourses();
    } catch (error) {
      console.error("Error deleting course:", error);
      toast({
        title: t.common.error,
        description: t.adminCourses.deleteFailed,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    }
  };

  const handleInputChange = (field: keyof CourseFormData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-3xl bg-card border border-accent/10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-black tracking-tight">{t.adminCourses.title}</h1>
              <p className="text-muted-foreground font-medium">{t.adminCourses.subtitle}</p>
            </div>
          </div>
          <Button onClick={() => handleOpenDialog()} size="lg" className="h-14 px-8 rounded-2xl gap-2 font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-95 transition-all">
            <Plus className="w-5 h-5" />
            {t.adminCourses.addCourse}
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse font-medium">{t.common.loading}</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-3xl border-2 border-dashed border-accent/20 border-spacing-4">
            <div className="w-20 h-20 rounded-full bg-accent/5 flex items-center justify-center mb-6">
              <BookOpen className="w-10 h-10 text-accent/40" />
            </div>
            <p className="text-2xl font-display font-black mb-2">{t.adminCourses.noCourses}</p>
            <p className="text-muted-foreground max-w-md mb-8">{t.adminCourses.noCoursesDesc}</p>
            <Button onClick={() => handleOpenDialog()} variant="outline" size="lg" className="h-14 px-10 rounded-2xl border-2 hover:bg-accent/5 font-bold">
              <Plus className="w-5 h-5 me-2" />
              {t.adminCourses.addCourse}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course) => (
              <Card
                key={course.id}
                className="group overflow-hidden border-accent/10 hover:border-accent/30 transition-all duration-300 hover:shadow-xl bg-card"
              >
                {/* Card Image Wrapper */}
                <div className="relative h-48 overflow-hidden">
                  {course.image_url ? (
                    <img
                      src={course.image_url}
                      alt={course.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-accent/5 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-accent/20" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge
                      className={`${course.is_active
                        ? "bg-green-500/90 text-white"
                        : "bg-gray-500/90 text-white"
                        } backdrop-blur-sm border-0`}
                    >
                      {course.is_active ? t.common.active : t.common.inactive}
                    </Badge>
                  </div>

                  {/* Quick Actions Dropdown */}
                  <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => handleOpenDialog(course)} className="gap-2 cursor-pointer">
                          <Pencil className="w-4 h-4" />
                          {t.common.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate(`/admin/courses/${course.id}/lessons`)}
                          className="gap-2 cursor-pointer"
                        >
                          <PlayCircle className="w-4 h-4 text-accent" />
                          {t.adminLessons.manageLessons}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(course)}
                          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                          {t.common.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <CardContent className="p-5">
                  <div className="mb-4">
                    <h3 className="text-xl font-display font-bold line-clamp-1 mb-2 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-muted-foreground text-sm line-clamp-2 h-10">
                      {course.description || "No description provided."}
                    </p>
                  </div>

                  {/* Course Details Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="flex items-center gap-2 text-muted-foreground bg-accent/5 p-2 rounded-lg">
                      <Clock className="w-4 h-4 text-accent" />
                      <span className="text-xs font-semibold">{course.total_hours || 0}h</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground bg-accent/5 p-2 rounded-lg">
                      <Layers className="w-4 h-4 text-accent" />
                      <span className="text-xs font-semibold">{course.sessions_count || 0} {t.common.sessions}</span>
                    </div>
                  </div>

                  {/* Pricing Section */}
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <span className="text-lg font-black text-foreground">${Number(course.price || 0).toFixed(0)}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{t.adminCourses.priceSYP.split('(')[0]}</p>
                        <p className="text-sm font-bold text-accent">{Number(course.price_syp || 0).toLocaleString()} <span className="text-[10px]">ل.س</span></p>
                      </div>
                    </div>
                  </div>
                </CardContent>

                <div className="px-5 pb-5 flex flex-col gap-2">
                  <Button
                    className="w-full gap-2 gradient-accent rounded-xl font-bold h-11"
                    onClick={() => navigate(`/admin/courses/${course.id}/lessons`)}
                  >
                    <PlayCircle className="w-4 h-4" />
                    {t.adminLessons.manageLessons}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-accent/20 hover:bg-accent/5 h-10 rounded-xl"
                      onClick={() => handleOpenDialog(course)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {t.common.edit}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full gap-2 text-destructive hover:bg-destructive/10 h-10 rounded-xl"
                      onClick={() => handleDeleteClick(course)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t.common.delete}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCourse ? t.adminCourses.editCourse : t.adminCourses.createCourse}
            </DialogTitle>
            <DialogDescription>
              {editingCourse ? t.adminCourses.editDesc : t.adminCourses.createDesc}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">{t.adminCourses.courseTitle} *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder={t.adminCourses.courseTitle}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">{t.adminCourses.description}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder={t.adminCourses.description}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="total_hours">{t.adminCourses.totalHours}</Label>
                  <Input
                    id="total_hours"
                    type="number"
                    min="0"
                    value={formData.total_hours}
                    onChange={(e) => handleInputChange("total_hours", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sessions_count">{t.adminCourses.sessionsCount}</Label>
                  <Input
                    id="sessions_count"
                    type="number"
                    min="0"
                    value={formData.sessions_count}
                    onChange={(e) => handleInputChange("sessions_count", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="image">{t.adminCourses.courseImage}</Label>
                <div className="flex flex-col gap-3">
                  {(imagePreview || formData.image_url) && (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border">
                      <img
                        src={imagePreview || formData.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 w-8 h-8 rounded-full"
                        onClick={() => {
                          setSelectedFile(null);
                          setImagePreview(null);
                          setFormData(prev => ({ ...prev, image_url: "" }));
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <Label
                      htmlFor="image-upload"
                      className="flex flex-1 items-center justify-center gap-2 h-20 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {selectedFile ? selectedFile.name : t.common.create}
                      </span>
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </Label>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">{t.adminCourses.priceUSD}</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleInputChange("price", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price_syp">{t.adminCourses.priceSYP}</Label>
                  <Input
                    id="price_syp"
                    type="number"
                    min="0"
                    value={formData.price_syp}
                    onChange={(e) => handleInputChange("price_syp", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange("is_active", checked)}
                />
                <Label htmlFor="is_active">{t.adminCourses.isActive}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                {editingCourse ? t.adminCourses.updateCourse : t.adminCourses.createCourseBtn}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-background">
          <div className="h-2 w-full bg-destructive" />
          
          <div className="p-8 space-y-6">
            <AlertDialogHeader>
              <div className="flex justify-center mb-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="delete-icon"
                    initial={{ scale: 0.5, rotate: 15, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="p-4 rounded-full bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="w-12 h-12" />
                  </motion.div>
                </AnimatePresence>
              </div>

              <AlertDialogTitle className="text-2xl font-black text-center">
                {t.adminCourses.deleteCourse}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-lg font-medium text-muted-foreground pt-2">
                {t.adminCourses.deleteConfirm.replace("{title}", courseToDelete?.title || "")}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="flex-row gap-4 sm:justify-center">
              <AlertDialogCancel className="flex-1 rounded-2xl h-12 border-2 text-lg font-bold hover:bg-muted transition-all">
                {t.common.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteConfirm();
                }}
                disabled={isDeleting}
                className="flex-1 rounded-2xl h-12 text-lg font-bold shadow-lg bg-destructive hover:bg-destructive/90 shadow-destructive/20 transition-all"
              >
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : t.common.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

    </DashboardLayout >
  );
}
