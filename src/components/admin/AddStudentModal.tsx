import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  onStudentAdded: () => void;
  currentCount: number;
  maxCount: number;
}

interface StudentProfile {
  user_id: string;
  full_name: string;
  email: string;
}

export default function AddStudentModal({
  isOpen,
  onClose,
  batchId,
  onStudentAdded,
  currentCount,
  maxCount
}: AddStudentModalProps) {
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  const isRTL = dir === "rtl";
  
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const isFull = maxCount > 0 && currentCount >= maxCount;

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
    }
  }, [isOpen]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch students already in this batch to exclude them
      const { data: alreadyInBatch } = await supabase
        .from("batch_students")
        .select("student_id")
        .eq("batch_id", batchId);
      
      const excludedIds = alreadyInBatch?.map(b => b.student_id) || [];

      // 2. Fetch admins to exclude them as well
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      
      const adminIds = adminRoles?.map(r => r.user_id) || [];
      const allExcludedIds = [...excludedIds, ...adminIds];

      // 3. Fetch all profiles that are not in the excluded list
      let query = supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .order("full_name");

      if (allExcludedIds.length > 0) {
        query = query.not("user_id", "in", `(${allExcludedIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddStudent = async (studentId: string) => {
    if (isFull) {
      toast({
        title: isRTL ? "الدفعة ممتلئة" : "Batch is Full",
        description: isRTL ? "لا يمكن إضافة المزيد من الطلاب لهذه الدفعة." : "Cannot add more students to this batch.",
        variant: "destructive"
      });
      return;
    }

    try {
      setAddingId(studentId);
      const { error } = await supabase
        .from("batch_students")
        .insert({
          batch_id: batchId,
          student_id: studentId
        });

      if (error) throw error;

      toast({
        title: isRTL ? "تمت الإضافة بنجاح" : "Student Added",
        description: isRTL ? "تمت إضافة الطالب للدفعة بنجاح." : "The student has been added to the batch."
      });

      onStudentAdded();
      onClose();
    } catch (error: any) {
      toast({
        title: isRTL ? "حدث خطأ" : "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isRTL ? "إضافة طالب للدفعة" : "Add Student to Batch"}</DialogTitle>
          <DialogDescription>
            {isRTL ? "ابحث عن طالب بالاسم أو البريد الإلكتروني." : "Search for a student by name or email."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث..." : "Search students..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              disabled={isFull}
            />
          </div>

          {isFull && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm font-medium">
              ⚠️ {isRTL ? "هذه الدفعة وصلت للحد الأقصى." : "This batch has reached its maximum capacity."}
            </div>
          )}

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground italic">
                {isRTL ? "لا يوجد طلاب متاحين للإضافة" : "No students available to add"}
              </div>
            ) : (
              filteredStudents.map((student) => (
                <div 
                  key={student.user_id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {student.full_name?.[0] || <User size={14} />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold leading-none">{student.full_name}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{student.email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-lg hover:bg-primary hover:text-white"
                    onClick={() => handleAddStudent(student.user_id)}
                    disabled={!!addingId || isFull}
                  >
                    {addingId === student.user_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {isRTL ? "إغلاق" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
