import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, CheckCircle, XCircle, Eye, Wallet, FileText, Search, CreditCard, Send, AlertTriangle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface EnrollmentRequest {
    id: string;
    user_id: string;
    course_id: string;
    payment_method: string;
    receipt_image_url: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    courses: { title: string };
    profiles: { full_name: string } | null;
}

export default function AdminPayments() {
    const { t, dir, language } = useLanguage();
    const { toast } = useToast();

    const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ id: string, type: 'approve' | 'reject' | 'delete' } | null>(null);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('enrollment_requests')
                .select(`
                    *,
                    courses ( title ),
                    profiles!enrollment_requests_user_id_fkey ( full_name )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedRequests: EnrollmentRequest[] = (data as any[] || []).map(p => ({
                ...p,
                profiles: p.profiles || { full_name: 'Unknown Student' }
            }));

            setRequests(formattedRequests);
        } catch (error: any) {
            toast({
                title: t.adminPayments.fetchError,
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async () => {
        if (!confirmAction) return;
        const { id: requestId, type: action } = confirmAction;
        setConfirmAction(null);

        setActionLoading(requestId);
        try {
            if (action === 'delete') {
                const { error } = await supabase
                    .from('enrollment_requests')
                    .delete()
                    .eq('id', requestId);
                
                if (error) throw error;

                toast({
                    title: language === 'ar' ? 'تم الحذف' : 'Deleted',
                    description: language === 'ar' ? 'تم حذف الطلب بنجاح' : 'Request deleted successfully',
                });
            } else {
                const { error } = await supabase.functions.invoke('enrollment-handler', {
                    body: { action, requestId }
                });

                if (error) throw error;

                toast({
                    title: action === 'approve' ? (language === 'ar' ? 'تم القبول' : 'Approved') : (language === 'ar' ? 'تم الرفض' : 'Rejected'),
                    description: action === 'approve' ? (language === 'ar' ? 'تم تفعيل حساب الطالب بنجاح' : 'Student enrolled successfully') : (language === 'ar' ? 'تم رفض الطلب' : 'Request rejected'),
                });
            }
            fetchPayments();
        } catch (error: any) {
            toast({
                title: language === 'ar' ? 'خطأ في العملية' : 'Action failed',
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setActionLoading(null);
        }
    };

    const filteredRequests = requests.filter(p =>
        p.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.courses?.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pendingCount = requests.filter(p => p.status === 'pending').length;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">{t.adminPayments.statusTags.pending}</Badge>;
            case 'approved': return <Badge variant="secondary" className="bg-green-500/10 text-green-500">{t.adminPayments.statusTags.approved}</Badge>;
            case 'rejected': return <Badge variant="secondary" className="bg-destructive/10 text-destructive">{t.adminPayments.statusTags.rejected}</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    const getMethodIcon = (method: string) => {
        switch (method) {
            case 'syriatel_cash': return <CreditCard className="w-4 h-4" />;
            case 'sham_cash': return <Wallet className="w-4 h-4" />;
            case 'alharam': return <Send className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-6xl mx-auto" dir={dir}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
                            <Wallet className="w-8 h-8 text-primary" />
                            {t.adminPayments.title}
                        </h1>
                        <p className="text-muted-foreground">
                            {t.adminPayments.subtitle.replace("{count}", pendingCount.toString())}
                        </p>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                        <Input
                            placeholder={t.adminPayments.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`${dir === 'rtl' ? 'pr-10' : 'ps-10'} rounded-xl`}
                        />
                    </div>
                </div>

                <Card className="rounded-2xl border-border shadow-sm">
                    <CardHeader className="border-b bg-muted/20">
                        <CardTitle>{language === 'ar' ? 'طلبات التسجيل الأخيرة' : 'Recent Enrollment Requests'}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex h-64 items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : filteredRequests.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                {t.adminPayments.noPayments}
                            </div>
                        ) : (
                            <div className="divide-y">
                                {filteredRequests.map(request => (
                                    <div key={request.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div
                                                className="w-16 h-16 rounded-xl bg-muted border overflow-hidden cursor-pointer group relative shadow-sm shrink-0"
                                                onClick={() => setSelectedReceipt(request.receipt_image_url)}
                                            >
                                                <img
                                                    src={request.receipt_image_url}
                                                    alt="Receipt"
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Eye className="text-white w-6 h-6" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="font-bold text-lg leading-none">{request.profiles?.full_name}</h4>
                                                <p className="text-sm text-primary font-medium">{request.courses?.title}</p>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                                                    <span className="flex items-center gap-1 capitalize">
                                                        {getMethodIcon(request.payment_method)}
                                                        {request.payment_method.replace('_', ' ')}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{new Date(request.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 md:flex-col md:items-end md:justify-center shrink-0">
                                            {getStatusBadge(request.status)}

                                            <div className="flex gap-2">
                                                {request.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 rounded-lg text-destructive hover:bg-destructive hover:text-white border-destructive/20"
                                                            onClick={() => setConfirmAction({ id: request.id, type: 'reject' })}
                                                            disabled={actionLoading === request.id}
                                                        >
                                                            {actionLoading === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 sm:mx-1" />}
                                                            <span className="hidden sm:inline">{t.adminPayments.reject}</span>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="h-8 rounded-lg bg-green-500 hover:bg-green-600 border-none"
                                                            onClick={() => setConfirmAction({ id: request.id, type: 'approve' })}
                                                            disabled={actionLoading === request.id}
                                                        >
                                                            {actionLoading === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 sm:mx-1" />}
                                                            <span className="hidden sm:inline">{t.adminPayments.approve}</span>
                                                        </Button>
                                                    </>
                                                )}
                                                
                                                {/* Delete Button for all statuses */}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 w-8 p-0 rounded-lg text-destructive hover:bg-destructive hover:text-white border-destructive/20"
                                                    onClick={() => setConfirmAction({ id: request.id, type: 'delete' })}
                                                    disabled={actionLoading === request.id}
                                                >
                                                    {actionLoading === request.id && confirmAction?.type === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Receipt Preview Modal */}
            <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
                <DialogContent className="max-w-2xl bg-transparent border-none shadow-none">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Receipt Preview</DialogTitle>
                        <DialogDescription>Full size preview of the payment receipt</DialogDescription>
                    </DialogHeader>
                    <div className="relative w-full h-full min-h-[50vh] flex items-center justify-center">
                        {selectedReceipt && (
                            <img
                                src={selectedReceipt}
                                alt="Receipt Preview"
                                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            {/* Confirmation Alert Dialog */}
            <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-background">
                    <div className={cn(
                        "h-2 w-full",
                        confirmAction?.type === 'approve' ? "bg-green-500" : "bg-destructive"
                    )} />

                    <div className="p-8 space-y-6">
                        <AlertDialogHeader>
                            <div className="flex justify-center mb-4">
                                <AnimatePresence mode="wait">
                                    {confirmAction?.type === 'approve' ? (
                                        <motion.div
                                            key="approve-icon"
                                            initial={{ scale: 0.5, rotate: -45, opacity: 0 }}
                                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                            exit={{ scale: 0.5, opacity: 0 }}
                                            className="p-4 rounded-full bg-green-500/10 text-green-500"
                                        >
                                            <CheckCircle className="w-12 h-12" />
                                        </motion.div>
                                    ) : confirmAction?.type === 'reject' ? (
                                        <motion.div
                                            key="reject-icon"
                                            initial={{ scale: 0.5, rotate: 45, opacity: 0 }}
                                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                            exit={{ scale: 0.5, opacity: 0 }}
                                            className="p-4 rounded-full bg-destructive/10 text-destructive"
                                        >
                                            <AlertTriangle className="w-12 h-12" />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="delete-icon"
                                            initial={{ scale: 0.5, rotate: 15, opacity: 0 }}
                                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                            exit={{ scale: 0.5, opacity: 0 }}
                                            className="p-4 rounded-full bg-destructive/10 text-destructive"
                                        >
                                            <Trash2 className="w-12 h-12" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <AlertDialogTitle className="text-2xl font-black text-center">
                                {language === 'ar'
                                    ? (confirmAction?.type === 'approve' ? 'تأكيد قبول الطالب' : confirmAction?.type === 'reject' ? 'تأكيد رفض الطلب' : 'تأكيد الحذف')
                                    : (confirmAction?.type === 'approve' ? 'Confirm Approval' : confirmAction?.type === 'reject' ? 'Confirm Rejection' : 'Confirm Deletion')}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-center text-lg font-medium text-muted-foreground pt-2">
                                {language === 'ar'
                                    ? (confirmAction?.type === 'approve'
                                        ? 'هل أنت متأكد من رغبتك في قبول هذا الطالب وتفعيل الكورس له؟ سيتم إشعار الطالب فوراً.'
                                        : confirmAction?.type === 'reject' 
                                            ? 'هل أنت متأكد من رفض هذا الطلب؟ لن يتمكن الطالب من الوصول للكورس.'
                                            : 'هل أنت متأكد من مسح هذا الطلب نهائياً من النظام؟ لا يمكن التراجع عن هذه الخطوة.')
                                    : (confirmAction?.type === 'approve'
                                        ? 'Are you sure you want to approve this student and activate the course? They will be notified immediately.'
                                        : confirmAction?.type === 'reject'
                                            ? 'Are you sure you want to reject this request? The student will not be able to access the course.'
                                            : 'Are you sure you want to permanently delete this request from the system? This action cannot be undone.')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter className="flex-row gap-4 sm:justify-center">
                            <AlertDialogCancel className="flex-1 rounded-2xl h-12 border-2 text-lg font-bold hover:bg-muted transition-all">
                                {language === 'ar' ? 'تراجع' : 'Cancel'}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleAction}
                                className={cn(
                                    "flex-1 rounded-2xl h-12 text-lg font-bold shadow-lg transition-all",
                                    confirmAction?.type === 'approve'
                                        ? "bg-green-500 hover:bg-green-600 shadow-green-500/20"
                                        : "bg-destructive hover:bg-destructive/90 shadow-destructive/20"
                                )}
                            >
                                {language === 'ar' ? 'تأكيد' : 'Confirm'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout>
    );
}
