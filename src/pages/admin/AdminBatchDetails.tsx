import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  ArrowRight, 
  Plus, 
  UserMinus, 
  Search, 
  Loader2, 
  GraduationCap,
  Mail,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import AddStudentModal from "@/components/admin/AddStudentModal";
import { cn } from "@/lib/utils";
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

interface BatchInfo {
  id: string;
  name: string;
  max_students: number;
  current_students: number;
  courses: {
    title: string;
  } | null;
}

interface EnrolledStudent {
  id: string;
  student_id: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

export default function AdminBatchDetails() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  const isRTL = dir === "rtl";

  const [batch, setBatch] = useState<BatchInfo | null>(null);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchBatchData = async () => {
    if (!batchId) return;
    
    try {
      setLoading(true);
      
      // 1. Fetch Batch Info
      const { data: batchData, error: batchError } = await supabase
        .from("batches")
        .select(`
          id,
          name,
          max_students,
          current_students,
          courses (title)
        `)
        .eq("id", batchId)
        .single();
      
      if (batchError) throw batchError;
      setBatch(batchData as any);

      // 2. Fetch Enrolled Students
      const { data: enrolledData, error: enrolledError } = await supabase
        .from("batch_students")
        .select(`
          id,
          student_id,
          profiles:student_id (
            full_name,
            email
          )
        `)
        .eq("batch_id", batchId);
      
      if (enrolledError) throw enrolledError;
      setStudents(enrolledData as any);

    } catch (error: any) {
      console.error("Error fetching batch details:", error);
      toast({
        title: isRTL ? "خطأ في تحميل البيانات" : "Error Loading Data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchData();
  }, [batchId]);

  const handleRemoveStudent = async () => {
    if (!removeId) return;

    try {
      setIsRemoving(true);
      const { error } = await supabase
        .from("batch_students")
        .delete()
        .eq("id", removeId);

      if (error) throw error;

      toast({
        title: isRTL ? "تم حذف الطالب" : "Student Removed",
        description: isRTL ? "تمت إزالة الطالب من الدفعة بنجاح." : "The student has been removed from the batch."
      });

      // Refresh data
      fetchBatchData();
    } catch (error: any) {
      toast({
        title: isRTL ? "فشل الحذف" : "Removal Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRemoving(false);
      setRemoveId(null);
    }
  };

  const filteredStudents = students.filter(s => {
    const search = searchQuery.toLowerCase();
    return (
      s.profiles?.full_name?.toLowerCase().includes(search) ||
      s.profiles?.email?.toLowerCase().includes(search)
    );
  });

  if (loading && !batch) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!batch) return null;

  const isFull = batch.max_students > 0 && (batch.current_students || 0) >= batch.max_students;

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-8">
        {/* Header Navigation */}
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/admin/batches")}
            className="rounded-xl"
          >
            {isRTL ? <ChevronRight className="w-4 h-4 me-2" /> : <ChevronLeft className="w-4 h-4 me-2" />}
            {isRTL ? "العودة للدفعات" : "Back to Batches"}
          </Button>
        </div>

        {/* Batch Hero Card */}
        <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {batch.courses?.title}
                </Badge>
                {isFull && (
                   <Badge className="bg-[#ff4d4f] text-white border-0 animate-badge-pulse">
                    {isRTL ? "ممتلئة" : "FULL"}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                {batch.name}
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                {isRTL ? "إدارة طلاب الدفعة الحالية" : "Managing current batch students"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="bg-background/80 p-4 rounded-2xl border border-border/50 text-center min-w-[140px]">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                  {isRTL ? "الطلاب المسجلين" : "Enrolled Students"}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-2xl font-display font-bold">
                    {batch.current_students || 0}
                  </span>
                  <span className="text-sm text-muted-foreground">/ {batch.max_students || "∞"}</span>
                </div>
              </div>

              <Button 
                onClick={() => setIsAddModalOpen(true)}
                disabled={isFull}
                className={cn(
                  "h-14 px-8 rounded-2xl font-bold shadow-lg transition-all hover:scale-[1.02]",
                  isFull ? "bg-muted" : "gradient-primary text-white"
                )}
              >
                <Plus className="w-5 h-5 me-2" />
                {isRTL ? "إضافة طالب" : "Add Student"}
              </Button>
            </div>
          </div>
        </div>

        {/* Student Management Section */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
              <GraduationCap className="w-6 h-6 text-primary" />
              {isRTL ? "قائمة طلاب الدفعة" : "Batch Students List"}
            </h2>

            <div className="relative max-w-sm w-full">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
              <Input 
                placeholder={isRTL ? "ابحث عن طالب..." : "Search for a student..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(isRTL ? "pr-9" : "pl-9", "bg-card border-border/50 rounded-xl")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-card/40 border border-dashed border-border/50 rounded-3xl">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-lg">
                  {students.length === 0 
                    ? (isRTL ? "لا يوجد طلاب مسجلين في هذه الدفعة بعد." : "No students enrolled in this batch yet.")
                    : (isRTL ? "لا توجد نتائج مطابقة لبحثك." : "No matching results for your search.")}
                </p>
                {students.length === 0 && (
                  <Button 
                    variant="link" 
                    className="mt-2 text-primary h-auto p-0"
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    {isRTL ? "اضغط هنا لإضافة أول طالب" : "Click here to add the first student"}
                  </Button>
                )}
              </div>
            ) : (
              filteredStudents.map((item) => (
                <div 
                  key={item.id}
                  className="group bg-card hover:bg-card/80 border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/10 text-primary">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-foreground mb-1 leading-none">
                          {item.profiles?.full_name || (isRTL ? "طالب" : "Student")}
                        </h4>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Mail className="w-3 h-3 me-1.5 shrink-0" />
                          <span className="truncate max-w-[150px]">{item.profiles?.email}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-9 h-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setRemoveId(item.id)}
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      <AddStudentModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        batchId={batchId!}
        onStudentAdded={fetchBatchData}
        currentCount={batch.current_students || 0}
        maxCount={batch.max_students}
      />

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeId} onOpenChange={(open) => !open && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "إزالة طالب من الدفعة" : "Remove Student"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL 
                ? "هل أنت متأكد من رغبتك في إزالة هذا الطالب من الدفعة؟ لن يتم حذف حسابه، بل إزالته فقط من هذه الدفعة المحددة." 
                : "Are you sure you want to remove this student from the batch? Their account will not be deleted, only their enrollment in this specific batch."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveStudent}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRTL ? "إزالة" : "Remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
