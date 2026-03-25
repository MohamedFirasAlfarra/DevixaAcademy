import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Bell, Send, Users, BookOpen, Loader2, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";


interface Course {
  id: string;
  title: string;
}

interface User {
  user_id: string;
  full_name: string;
  email: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  target_type: string;
  created_at: string;
}

const AdminNotifications = () => {
  const { t, dir } = useLanguage();
  const { session } = useAuth();
  const isRTL = dir === "rtl";
  
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState<"all" | "specific_users" | "course_enrollees">("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [coursesRes, usersRes, notificationsRes] = await Promise.all([
        supabase.from("courses").select("id, title"),
        supabase.from("profiles").select("user_id, full_name, email"),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(10),
      ]);

      if (coursesRes.data) setCourses(coursesRes.data);
      if (usersRes.data) setUsers(usersRes.data);
      if (notificationsRes.data) setNotifications(notificationsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error(isRTL ? "يرجى ملء جميع الحقول" : "Please fill all fields");
      return;
    }

    if (targetType === "specific_users" && selectedUsers.length === 0) {
      toast.error(isRTL ? "يرجى اختيار مستخدمين" : "Please select users");
      return;
    }

    if (targetType === "course_enrollees" && !selectedCourse) {
      toast.error(isRTL ? "يرجى اختيار كورس" : "Please select a course");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          title,
          message,
          target_type: targetType,
          target_course_id: targetType === "course_enrollees" ? selectedCourse : undefined,
          target_user_ids: targetType === "specific_users" ? selectedUsers : undefined,
        },
      });

      if (error) throw error;

      toast.success(
        isRTL 
          ? `تم إرسال التنبيه إلى ${data.recipients_count} مستخدم`
          : `Notification sent to ${data.recipients_count} users`
      );

      // Reset form
      setTitle("");
      setMessage("");
      setTargetType("all");
      setSelectedCourse("");
      setSelectedUsers([]);
      
      // Refresh notifications list
      fetchData();
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast.error(isRTL ? "فشل في إرسال التنبيه" : "Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const deleteNotification = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success(isRTL ? "تم حذف التنبيه بنجاح" : "Notification deleted successfully");
      setNotifications(prev => prev.filter(n => n.id !== deleteId));
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      toast.error(isRTL ? "فشل الحذف" : "Failed to delete");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isRTL ? "إدارة التنبيهات" : "Notifications Management"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isRTL ? "أرسل تنبيهات للمستخدمين عبر الموقع والبريد الإلكتروني" : "Send notifications to users via website and email"}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Send Notification Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                {isRTL ? "إرسال تنبيه جديد" : "Send New Notification"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{isRTL ? "عنوان التنبيه" : "Notification Title"}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isRTL ? "أدخل عنوان التنبيه" : "Enter notification title"}
                />
              </div>

              <div className="space-y-2">
                <Label>{isRTL ? "نص التنبيه" : "Notification Message"}</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={isRTL ? "أدخل نص التنبيه" : "Enter notification message"}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>{isRTL ? "الجمهور المستهدف" : "Target Audience"}</Label>
                <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {isRTL ? "جميع المستخدمين" : "All Users"}
                      </span>
                    </SelectItem>
                    <SelectItem value="specific_users">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {isRTL ? "مستخدمين محددين" : "Specific Users"}
                      </span>
                    </SelectItem>
                    <SelectItem value="course_enrollees">
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        {isRTL ? "المسجلين في كورس" : "Course Enrollees"}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetType === "course_enrollees" && (
                <div className="space-y-2">
                  <Label>{isRTL ? "اختر الكورس" : "Select Course"}</Label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? "اختر كورس" : "Select a course"} />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {targetType === "specific_users" && (
                <div className="space-y-2">
                  <Label>{isRTL ? "اختر المستخدمين" : "Select Users"} ({selectedUsers.length})</Label>
                  <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                    {users.map((user) => (
                      <div key={user.user_id} className="flex items-center gap-2">
                        <Checkbox
                          id={user.user_id}
                          checked={selectedUsers.includes(user.user_id)}
                          onCheckedChange={() => toggleUserSelection(user.user_id)}
                        />
                        <label htmlFor={user.user_id} className="text-sm cursor-pointer flex-1">
                          {user.full_name || user.email || user.user_id}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={handleSendNotification} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                    {isRTL ? "جاري الإرسال..." : "Sending..."}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 me-2" />
                    {isRTL ? "إرسال التنبيه" : "Send Notification"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {isRTL ? "التنبيهات الأخيرة" : "Recent Notifications"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "آخر 10 تنبيهات تم إرسالها" : "Last 10 sent notifications"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {isRTL ? "لا توجد تنبيهات" : "No notifications yet"}
                </p>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium">{notification.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => setDeleteId(notification.id)}

                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>
                          {notification.target_type === "all" 
                            ? (isRTL ? "الجميع" : "All")
                            : notification.target_type === "specific_users"
                            ? (isRTL ? "مستخدمين محددين" : "Specific users")
                            : (isRTL ? "مسجلي كورس" : "Course enrollees")
                          }
                        </span>
                        <span>•</span>
                        <span>{new Date(notification.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
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
                  {isRTL ? 'تأكيد الحذف' : 'Confirm Deletion'}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-center text-lg font-medium text-muted-foreground pt-2">
                  {isRTL 
                    ? 'هل أنت متأكد من حذف هذا التنبيه نهائياً؟ سيتم إزالته من عند جميع المستخدمين.' 
                    : 'Are you sure you want to permanently delete this notification? It will be removed for all users.'}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter className="flex-row gap-4 sm:justify-center">
                <AlertDialogCancel className="flex-1 rounded-2xl h-12 border-2 text-lg font-bold hover:bg-muted transition-all">
                  {isRTL ? 'تراجع' : 'Cancel'}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    deleteNotification();
                  }}
                  disabled={isDeleting}
                  className="flex-1 rounded-2xl h-12 text-lg font-bold shadow-lg bg-destructive hover:bg-destructive/90 shadow-destructive/20 transition-all"
                >
                  {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRTL ? 'تأكيد الحذف' : 'Confirm Deletion')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>

  );
};

export default AdminNotifications;
