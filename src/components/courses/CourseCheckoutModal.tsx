import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Wallet, CreditCard, Send, Image as ImageIcon, CheckCircle2, Clock } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type PaymentSetting = Database["public"]["Tables"]["payment_settings"]["Row"];

interface CourseCheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: string;
    courseTitle: string;
    onSuccess?: () => void;
}

export default function CourseCheckoutModal({
    isOpen,
    onClose,
    courseId,
    courseTitle,
    onSuccess
}: CourseCheckoutModalProps) {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const { toast } = useToast();

    const [settings, setSettings] = useState<PaymentSetting[]>([]);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [selectedMethod, setSelectedMethod] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSettings();
            setReceiptFile(null);
            setSelectedMethod("");
            setIsSuccess(false);
        }
    }, [isOpen]);

    const fetchSettings = async () => {
        try {
            setLoadingSettings(true);
            const { data, error } = await supabase
                .from("payment_settings")
                .select("*")
                .eq("is_enabled", true);

            if (error) throw error;
            setSettings(data || []);

            if (data && data.length > 0) {
                setSelectedMethod(data[0].method_name);
            }
        } catch (error: any) {
            toast({
                title: t.common.error || "Error",
                description: "Failed to load payment methods.",
                variant: "destructive"
            });
        } finally {
            setLoadingSettings(false);
        }
    };

    const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setReceiptFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!user || !selectedMethod || !receiptFile) return;

        setSubmitting(true);
        try {
            // 0. Check if already enrolled or requested
            const { data: existingEnroll } = await supabase
                .from('enrollments')
                .select('id')
                .eq('user_id', user.id)
                .eq('course_id', courseId)
                .maybeSingle();

            if (existingEnroll) {
                toast({
                    title: language === 'ar' ? "أنت مسجل بالفعل!" : "Already Enrolled",
                    description: language === 'ar' ? "أنت مسجل مسبقاً في هذا الكورس." : "You are already enrolled in this course.",
                    variant: "destructive"
                });
                setSubmitting(false);
                return;
            }

            const { data: existingReq } = await supabase
                .from('enrollment_requests')
                .select('id')
                .eq('user_id', user.id)
                .eq('course_id', courseId)
                .eq('status', 'pending')
                .maybeSingle();

            if (existingReq) {
                toast({
                    title: language === 'ar' ? "طلبك قيد المراجعة" : "Pending Request",
                    description: language === 'ar' ? "لديك طلب مسبق قيد المراجعة لهذا الكورس." : "You already have a pending request for this course.",
                    variant: "destructive"
                });
                setSubmitting(false);
                return;
            }

            // 1. Upload receipt image
            const fileExt = receiptFile.name.split('.').pop();
            const fileName = `${user.id}/${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('payment-receipts')
                .upload(fileName, receiptFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('payment-receipts')
                .getPublicUrl(fileName);

            // 2. Insert payment record
            const { data: insertData, error: insertError } = await supabase
                .from('enrollment_requests')
                .insert({
                    user_id: user.id,
                    course_id: courseId,
                    payment_method: selectedMethod,
                    receipt_image_url: publicUrl,
                    status: 'pending'
                })
                .select('id')
                .single();

            if (insertError) throw insertError;

            toast({
                title: "Payment Submitted",
                description: "Your receipt has been uploaded and is pending admin approval.",
            });

            // Trigger email notification (don't await it so we don't block UI)
            supabase.functions.invoke('admin-payment-notification', {
                body: {
                    requestId: insertData.id,
                    studentName: user.user_metadata?.full_name || 'Unknown Student',
                    studentEmail: user.email,
                    courseTitle: courseTitle,
                    paymentMethod: getMethodLabel(selectedMethod),
                }
            }).catch(console.error);

            setIsSuccess(true);
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast({
                title: "Error submitting payment",
                description: error.message,
                variant: "destructive"
            });
            setSubmitting(false);
        }
    };

    const activeSetting = settings.find(s => s.method_name === selectedMethod);

    const getMethodIcon = (methodName: string) => {
        switch (methodName) {
            case 'syriatel_cash': return <CreditCard className="w-6 h-6" />;
            case 'sham_cash': return <Wallet className="w-6 h-6" />;
            case 'alharam': return <Send className="w-6 h-6" />;
            default: return <Wallet className="w-6 h-6" />;
        }
    };

    const getMethodLabel = (methodName: string) => {
        switch (methodName) {
            case 'syriatel_cash': return "Syriatel Cash (سيريتل كاش)";
            case 'sham_cash': return "Sham Cash (شام كاش)";
            case 'alharam': return "AlHaram Transfer (الهرم للحوالات)";
            default: return methodName;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md rounded-[2rem] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-display font-black">Checkout</DialogTitle>
                    <DialogDescription className="text-lg">
                        {courseTitle}
                    </DialogDescription>
                </DialogHeader>

                {loadingSettings ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : isSuccess ? (
                    <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 fade-in duration-500">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping duration-1000"></div>
                            <div className="relative gradient-primary p-6 rounded-full shadow-2xl shadow-primary/40 ring-4 ring-white">
                                <CheckCircle2 className="w-16 h-16 text-white" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-3xl font-display font-black text-foreground tracking-tight">
                                {language === 'ar' ? 'تم إرسال طلب تسجيلك بنجاح 🎉' : 'Request Sent Successfully! 🎉'}
                            </h3>
                            <div className="text-muted-foreground whitespace-pre-wrap max-w-sm mx-auto leading-relaxed text-lg font-medium">
                                {language === 'ar'
                                    ? 'طلبك الآن قيد المراجعة من قبل الإدارة.\nسيتم إشعارك فور قبول طلبك وتثبيت اسمك ضمن قائمة الطلاب المسجلين.\n\nشكراً لثقتك بنا 💙'
                                    : 'Your enrollment request is now pending admin review.\nYou will be notified as soon as your request is approved and your name is added to the student list.\n\nThank you for your trust 💙'}
                            </div>
                        </div>

                        <Button
                            onClick={onClose}
                            className="w-full max-w-[240px] rounded-2xl h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                            size="lg"
                        >
                            {language === 'ar' ? 'إغلاق' : 'Close'}
                        </Button>
                    </div>
                ) : settings.length === 0 ? (
                    <div className="text-center p-6 text-muted-foreground">
                        No payment methods are currently available. Please contact support.
                    </div>
                ) : (
                    <div className="py-2 space-y-6">
                        <RadioGroup
                            value={selectedMethod}
                            onValueChange={setSelectedMethod}
                            className="grid gap-3"
                        >
                            {settings.map(method => (
                                <div key={method.id} className={`flex items-center space-x-3 space-x-reverse border-2 p-4 rounded-2xl hover:bg-muted/50 transition-all cursor-pointer group ${selectedMethod === method.method_name ? 'border-primary/50 bg-primary/5' : 'border-transparent bg-muted/20'}`}>
                                    <RadioGroupItem value={method.method_name} id={method.method_name} className="w-5 h-5" />
                                    <Label
                                        htmlFor={method.method_name}
                                        className="flex flex-1 items-center gap-4 cursor-pointer"
                                    >
                                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            {getMethodIcon(method.method_name)}
                                        </div>
                                        <span className="font-bold text-base">{getMethodLabel(method.method_name)}</span>
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>

                        {/* Dynamic Instructions */}
                        {activeSetting && (
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-4">
                                <h4 className="font-bold text-primary mb-2">Payment Instructions</h4>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-muted-foreground">Recipient Name:</span>
                                        <span className="font-bold">{activeSetting.admin_full_name}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-muted-foreground">Phone Number:</span>
                                        <span className="font-bold" dir="ltr">{activeSetting.admin_phone_number}</span>
                                    </div>
                                    {activeSetting.governorate && (
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="text-muted-foreground">Governorate:</span>
                                            <span className="font-bold">{activeSetting.governorate}</span>
                                        </div>
                                    )}
                                </div>

                                {activeSetting.method_name === 'sham_cash' && activeSetting.qr_image_url && (
                                    <div className="mt-4 text-center space-y-2">
                                        <p className="text-sm font-medium text-muted-foreground">Scan QR Code to Pay</p>
                                        <div className="inline-block p-2 bg-white rounded-xl border shadow-sm">
                                            <img src={activeSetting.qr_image_url} alt="Payment QR" className="w-40 h-40 object-contain" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Receipt Upload */}
                        <div className="space-y-3">
                            <Label className="font-bold text-base">Upload Receipt Image</Label>
                            <p className="text-sm text-muted-foreground">Please transfer the funds and upload a screenshot of the digital receipt here.</p>

                            <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer relative">
                                {receiptFile ? (
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium text-primary break-all">{receiptFile.name}</div>
                                        <Button variant="outline" size="sm" className="relative z-10">
                                            Change Receipt
                                            <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleReceiptUpload} />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
                                            <ImageIcon className="w-6 h-6" />
                                        </div>
                                        <div className="text-sm font-medium">Click to browse or drag image here</div>
                                        <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleReceiptUpload} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {!isSuccess && !loadingSettings && settings.length > 0 && (
                    <DialogFooter className="gap-3 sm:gap-0 pt-4 border-t mt-2">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="rounded-xl"
                        >
                            {t.common.cancel || "Cancel"}
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || !selectedMethod || !receiptFile || settings.length === 0}
                            className="gradient-primary rounded-xl font-bold min-w-[120px]"
                        >
                            {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : "Submit Payment"}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
