import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Save, Upload, Settings2, Loader2, Image as ImageIcon } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type PaymentSetting = Database["public"]["Tables"]["payment_settings"]["Row"];

import { useLanguage } from "@/contexts/LanguageContext";

export default function AdminPaymentSettings() {
    const { t, dir } = useLanguage();
    const { toast } = useToast();
    const [settings, setSettings] = useState<Record<string, PaymentSetting>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingQr, setUploadingQr] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from("payment_settings")
                .select("*");

            if (error) throw error;

            const settingsMap: Record<string, PaymentSetting> = {};
            data?.forEach((s) => {
                settingsMap[s.method_name] = s;
            });
            setSettings(settingsMap);
        } catch (error: any) {
            toast({
                title: t.adminPaymentSettings.fetchError,
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateChange = (method: string, field: keyof PaymentSetting, value: any) => {
        setSettings((prev) => ({
            ...prev,
            [method]: {
                ...prev[method],
                [field]: value,
            },
        }));
    };

    const handleQrUpload = async (event: React.ChangeEvent<HTMLInputElement>, method: string) => {
        try {
            if (!event.target.files || event.target.files.length === 0) return;
            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            setUploadingQr(true);

            const { error: uploadError, data } = await supabase.storage
                .from('payment-qrs')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('payment-qrs')
                .getPublicUrl(filePath);

            handleUpdateChange(method, 'qr_image_url', publicUrl);
            toast({ title: t.adminPaymentSettings.qrUploadSuccess });
        } catch (error: any) {
            toast({
                title: t.adminPaymentSettings.qrUploadError,
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setUploadingQr(false);
        }
    };

    const handleSave = async (method: string) => {
        setSaving(true);
        try {
            const currentSetting = settings[method];
            if (!currentSetting) return;

            const { error } = await supabase
                .from("payment_settings")
                .upsert({
                    id: currentSetting.id,
                    method_name: method,
                    is_enabled: currentSetting.is_enabled,
                    admin_full_name: currentSetting.admin_full_name,
                    admin_phone_number: currentSetting.admin_phone_number,
                    governorate: currentSetting.governorate,
                    qr_image_url: currentSetting.qr_image_url,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'method_name' });

            if (error) throw error;

            toast({
                title: t.adminPaymentSettings.saveSuccess,
                description: t.adminPaymentSettings.saveDesc.replace("{methodName}", method),
            });
        } catch (error: any) {
            toast({
                title: t.adminPaymentSettings.saveError,
                description: error.message || t.adminPaymentSettings.saveErrorDesc,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    const methods = [
        { id: "syriatel_cash", label: t.courses.paymentMethods.syriatelCash },
        { id: "sham_cash", label: t.courses.paymentMethods.shamiCash },
        { id: "alharam", label: t.courses.paymentMethods.alHaram }
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-5xl mx-auto" dir={dir}>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
                        <Settings2 className="w-8 h-8 text-primary" />
                        {t.adminPaymentSettings.title}
                    </h1>
                    <p className="text-muted-foreground">
                        {t.adminPaymentSettings.subtitle}
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {methods.map((method) => {
                        const s = settings[method.id] || ({ method_name: method.id, is_enabled: false } as Partial<PaymentSetting>);
                        return (
                            <Card key={method.id} className={`transition-all ${s.is_enabled ? 'border-primary/50 shadow-md' : 'opacity-80'}`}>
                                <CardHeader className="pb-4 border-b">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg">{method.label}</CardTitle>
                                        <Switch
                                            checked={!!s.is_enabled}
                                            onCheckedChange={(val) => handleUpdateChange(method.id, 'is_enabled', val)}
                                            style={dir === 'rtl' ? { transform: 'scaleX(-1)' } : undefined}
                                        />
                                    </div>
                                    <CardDescription>
                                        {s.is_enabled ? t.common.active : t.common.inactive}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label>{t.adminPaymentSettings.fields.adminFullName}</Label>
                                        <Input
                                            placeholder={t.adminPaymentSettings.fields.adminFullNamePlaceholder}
                                            value={s.admin_full_name || ""}
                                            onChange={(e) => handleUpdateChange(method.id, 'admin_full_name', e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t.adminPaymentSettings.fields.adminPhoneNumber}</Label>
                                        <Input
                                            placeholder={t.adminPaymentSettings.fields.adminPhoneNumberPlaceholder}
                                            value={s.admin_phone_number || ""}
                                            onChange={(e) => handleUpdateChange(method.id, 'admin_phone_number', e.target.value)}
                                        />
                                    </div>

                                    {(method.id === 'syriatel_cash' || method.id === 'alharam') && (
                                        <div className="space-y-2">
                                            <Label>{t.adminPaymentSettings.fields.governorate}</Label>
                                            <Input
                                                placeholder={t.adminPaymentSettings.fields.governoratePlaceholder}
                                                value={s.governorate || ""}
                                                onChange={(e) => handleUpdateChange(method.id, 'governorate', e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {method.id === 'sham_cash' && (
                                        <div className="space-y-2">
                                            <Label>{t.adminPaymentSettings.fields.qrImage}</Label>
                                            <div className="border-2 border-dashed rounded-lg p-4 text-center">
                                                {s.qr_image_url ? (
                                                    <div className="space-y-2">
                                                        <img src={s.qr_image_url} alt="QR Code" className="w-32 h-32 mx-auto object-contain bg-white rounded-md" />
                                                        <Button variant="outline" size="sm" className="w-full relative overflow-hidden" disabled={uploadingQr}>
                                                            {uploadingQr ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                                            {uploadingQr ? t.adminPaymentSettings.uploadingQr : t.adminPaymentSettings.fields.uploadQr}
                                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleQrUpload(e, method.id)} />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2 py-4">
                                                        <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto" />
                                                        <Button variant="secondary" size="sm" className="relative overflow-hidden" disabled={uploadingQr}>
                                                            {uploadingQr ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                                            {uploadingQr ? t.adminPaymentSettings.uploadingQr : t.adminPaymentSettings.fields.noQr}
                                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleQrUpload(e, method.id)} />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        className="w-full mt-4"
                                        onClick={() => handleSave(method.id)}
                                        disabled={saving}
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                        {t.common.save}
                                    </Button>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </DashboardLayout>
    );
}
