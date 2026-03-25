import { useState, useEffect } from "react";
import { Bell, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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
import { Loader2 } from "lucide-react";


interface Notification {
  id: string;
  notification_id: string;
  is_read: boolean;
  created_at: string;
  notifications: {
    id: string;
    title: string;
    message: string;
    created_at: string;
  };
}

const NotificationsBell = () => {
  const { dir } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const isRTL = dir === "rtl";
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);


  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("notification_recipients")
      .select(`
        id,
        notification_id,
        is_read,
        created_at,
        notifications (
          id,
          title,
          message,
          created_at
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data as any);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
  };

  const markAsRead = async (recipientId: string) => {
    await supabase
      .from("notification_recipients")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", recipientId);

    setNotifications(prev =>
      prev.map(n =>
        n.id === recipientId ? { ...n, is_read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from("notification_recipients")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true }))
    );
    setUnreadCount(0);
  };

  const deleteNotification = async () => {
    if (!deleteId || !user) return;

    setIsDeletingSingle(true);
    const { error } = await supabase
      .from("notification_recipients")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast({
        title: isRTL ? "خطأ في الحذف" : "Error deleting",
        description: error.message,
        variant: "destructive"
      });
      setIsDeletingSingle(false);
      return;
    }

    setNotifications(prev => {
        const remaining = prev.filter(n => n.id !== deleteId);
        setUnreadCount(remaining.filter(n => !n.is_read).length);
        return remaining;
    });
    setIsDeletingSingle(false);
    setDeleteId(null);
  };

  const deleteAllNotifications = async () => {
    if (!user) return;

    setIsDeletingAll(true);
    const { error } = await supabase
      .from("notification_recipients")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: isRTL ? "خطأ في الحذف" : "Error deleting",
        description: error.message,
        variant: "destructive"
      });
      setIsDeletingAll(false);
      return;
    }

    setNotifications([]);
    setUnreadCount(0);
    setIsDeletingAll(false);
    setShowDeleteAllConfirm(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 60) {
      return isRTL ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
    } else if (hours < 24) {
      return isRTL ? `منذ ${hours} ساعة` : `${hours}h ago`;
    } else {
      return isRTL ? `منذ ${days} يوم` : `${days}d ago`;
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align={isRTL ? "start" : "end"}
      >
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">
            {isRTL ? "التنبيهات" : "Notifications"}
          </h4>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-auto py-1 px-2"
              >
                {isRTL ? "تحديد الكل كمقروء" : "Mark all read"}
              </Button>
            )}
            {notifications.length > 0 && (
               <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteAllConfirm(true)}

                className="text-xs h-auto py-1 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {isRTL ? "لا توجد تنبيهات" : "No notifications"}
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                    !notification.is_read && "bg-primary/5"
                  )}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-2">
                    {!notification.is_read && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                    <div className={cn("flex-1", notification.is_read && "ms-4")}>
                      <h5 className="font-medium text-sm">
                        {notification.notifications?.title}
                      </h5>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.notifications?.message}
                      </p>
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                       onClick={(e) => {
                         e.stopPropagation();
                         setDeleteId(notification.id);
                       }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>

      {/* Delete Single Notification Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-background">
          <div className="h-2 w-full bg-destructive" />
          <div className="p-6 space-y-4">
            <AlertDialogHeader>
              <div className="flex justify-center mb-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="delete-icon"
                    initial={{ scale: 0.5, rotate: 15, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="p-3 rounded-full bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="w-8 h-8" />
                  </motion.div>
                </AnimatePresence>
              </div>
              <AlertDialogTitle className="text-xl font-black text-center">
                {isRTL ? 'حذف التنبيه' : 'Delete Notification'}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-sm font-medium text-muted-foreground">
                {isRTL 
                  ? 'هل أنت متأكد من حذف هذا التنبيه؟' 
                  : 'Are you sure you want to delete this notification?'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row gap-3 sm:justify-center">
              <AlertDialogCancel className="flex-1 rounded-xl h-10 border-2 text-sm font-bold hover:bg-muted transition-all">
                {isRTL ? 'تراجع' : 'Cancel'}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  deleteNotification();
                }}
                disabled={isDeletingSingle}
                className="flex-1 rounded-xl h-10 text-sm font-bold shadow-lg bg-destructive hover:bg-destructive/90 shadow-destructive/20 transition-all"
              >
                {isDeletingSingle ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRTL ? 'حذف' : 'Delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Notifications Confirmation */}
      <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-background">
          <div className="h-2 w-full bg-destructive" />
          <div className="p-6 space-y-4">
            <AlertDialogHeader>
              <div className="flex justify-center mb-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="delete-all-icon"
                    initial={{ scale: 0.5, rotate: -15, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="p-3 rounded-full bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="w-10 h-10" />
                  </motion.div>
                </AnimatePresence>
              </div>
              <AlertDialogTitle className="text-xl font-black text-center text-destructive">
                {isRTL ? 'حذف جميع التنبيهات' : 'Delete All Notifications'}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-sm font-medium text-muted-foreground">
                {isRTL 
                  ? 'هل أنت متأكد من حذف كافة التنبيهات؟ لا يمكن التراجع عن هذا الإجراء.' 
                  : 'Are you sure you want to delete all notifications? This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row gap-3 sm:justify-center">
              <AlertDialogCancel className="flex-1 rounded-xl h-10 border-2 text-sm font-bold hover:bg-muted transition-all">
                {isRTL ? 'تراجع' : 'Cancel'}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  deleteAllNotifications();
                }}
                disabled={isDeletingAll}
                className="flex-1 rounded-xl h-10 text-sm font-bold shadow-lg bg-destructive hover:bg-destructive/90 shadow-destructive/20 transition-all"
              >
                {isDeletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRTL ? 'حذف الكل' : 'Delete All')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Popover>

  );
};

export default NotificationsBell;
