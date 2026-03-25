import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Plus, CheckCircle2, XCircle, User, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

interface Batch {
    id: string;
    name: string;
    course_id: string;
    courses: { title: string; };
}

interface CourseSession {
    id: string;
    batch_id: string;
    title: string;
    session_date: string;
    duration_hours: number;
    video_url?: string;
    video_description?: string;
}

interface EnrollmentWithProfile {
    user_id: string;
    profiles: { full_name: string | null; };
}

export default function AdminAttendance() {
    const { t, dir } = useLanguage();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedBatchId, setSelectedBatchId] = useState<string>("");
    const [sessions, setSessions] = useState<CourseSession[]>([]);

    // Create Session State
    const [isAddSessionOpen, setIsAddSessionOpen] = useState(false);
    const [newSession, setNewSession] = useState({
        title: "",
        date: new Date().toISOString().split('T')[0],
        duration: 1,
        videoUrl: "",
        videoDescription: ""
    });

    // Edit Session State
    const [isEditSessionOpen, setIsEditSessionOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<CourseSession | null>(null);
    const [editForm, setEditForm] = useState({
        title: "",
        date: "",
        duration: 1,
        videoUrl: "",
        videoDescription: ""
    });

    // Attendance State
    const [isMarkAttendanceOpen, setIsMarkAttendanceOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<CourseSession | null>(null);
    const [students, setStudents] = useState<EnrollmentWithProfile[]>([]);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
    const [savingAttendance, setSavingAttendance] = useState(false);

    useEffect(() => {
        fetchBatches();
    }, []);

    useEffect(() => {
        if (selectedBatchId) {
            fetchSessions(selectedBatchId);
        } else {
            setSessions([]);
        }
    }, [selectedBatchId]);

    const fetchBatches = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('batches')
                .select('*, courses(title)')
                .eq('is_active', true);

            if (error) throw error;
            setBatches((data as any[]) || []);
        } catch (error: any) {
            toast({
                title: t.common.error,
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchSessions = async (batchId: string) => {
        try {
            const { data, error } = await supabase
                .from('course_sessions')
                .select('*')
                .eq('batch_id', batchId)
                .order('session_date', { ascending: false });

            if (error) throw error;
            setSessions(data || []);
        } catch (error: any) {
            toast({
                title: t.common.error,
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleCreateSession = async () => {
        if (!newSession.title || !selectedBatchId) return;

        try {
            const { error } = await supabase
                .from('course_sessions')
                .insert({
                    batch_id: selectedBatchId,
                    title: newSession.title,
                    session_date: newSession.date,
                    duration_hours: newSession.duration,
                    video_url: newSession.videoUrl,
                    video_description: newSession.videoDescription
                });

            if (error) throw error;

            toast({ title: t.adminAttendance.sessionCreated });
            setIsAddSessionOpen(false);
            setNewSession({ title: "", date: new Date().toISOString().split('T')[0], duration: 1, videoUrl: "", videoDescription: "" });
            fetchSessions(selectedBatchId);
        } catch (error: any) {
            toast({
                title: t.common.error,
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const openEditSession = (session: CourseSession) => {
        setEditingSession(session);
        setEditForm({
            title: session.title,
            date: session.session_date,
            duration: session.duration_hours,
            videoUrl: session.video_url || "",
            videoDescription: session.video_description || ""
        });
        setIsEditSessionOpen(true);
    };

    const handleUpdateSession = async () => {
        if (!editingSession || !editForm.title) return;
        try {
            const { error } = await supabase
                .from('course_sessions')
                .update({
                    title: editForm.title,
                    session_date: editForm.date,
                    duration_hours: editForm.duration,
                    video_url: editForm.videoUrl,
                    video_description: editForm.videoDescription
                })
                .eq('id', editingSession.id);

            if (error) throw error;
            toast({ title: t.adminAttendance.saveSuccess });
            setIsEditSessionOpen(false);
            fetchSessions(selectedBatchId);
        } catch (error: any) {
            toast({
                title: t.common.error,
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const openMarkAttendance = async (session: CourseSession) => {
        setSelectedSession(session);
        setIsMarkAttendanceOpen(true);
        setAttendanceMap({});

        try {
            const { data: studentsData, error: studentsError } = await supabase
                .from('enrollments')
                .select('user_id, profiles(full_name)')
                .eq('batch_id', selectedBatchId);

            if (studentsError) throw studentsError;
            setStudents((studentsData as any[]) || []);

            const { data: attData, error: attError } = await supabase
                .from('attendance')
                .select('user_id, attended')
                .eq('session_id', session.id);

            if (attError) throw attError;

            const map: Record<string, boolean> = {};
            (attData || []).forEach(a => {
                map[a.user_id] = a.attended;
            });
            setAttendanceMap(map);
        } catch (error: any) {
            toast({
                title: t.common.error,
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleToggleAttendance = (userId: string, attended: boolean) => {
        setAttendanceMap(prev => ({ ...prev, [userId]: attended }));
    };

    const saveAttendance = async () => {
        if (!selectedSession) return;
        try {
            setSavingAttendance(true);
            const attendanceData = students.map(student => ({
                session_id: selectedSession.id,
                user_id: student.user_id,
                attended: attendanceMap[student.user_id] || false,
                hours_attended: attendanceMap[student.user_id] ? selectedSession.duration_hours : 0
            }));

            const { error } = await supabase
                .from('attendance')
                .upsert(attendanceData, { onConflict: 'session_id, user_id' });

            if (error) throw error;

            toast({ title: t.adminAttendance.saveSuccess });
            setIsMarkAttendanceOpen(false);
        } catch (error: any) {
            toast({
                title: t.common.error,
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setSavingAttendance(false);
        }
    };

    const ArrowIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold mb-2">{t.nav.attendance}</h1>
                        <p className="text-muted-foreground">{t.adminAttendance.subtitle}</p>
                    </div>
                    {selectedBatchId && (
                        <Button onClick={() => setIsAddSessionOpen(true)} className="gradient-primary">
                            <Plus className="w-4 h-4 me-2" />
                            {t.adminAttendance.addSession}
                        </Button>
                    )}
                </div>

                <Card className="border-accent/10">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="w-5 h-5 text-accent" />
                            {t.adminAttendance.selectBatch}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                            <SelectTrigger className="w-full md:w-[400px]">
                                <SelectValue placeholder={t.adminAttendance.selectPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                                {batches.map((batch) => (
                                    <SelectItem key={batch.id} value={batch.id}>
                                        {batch.courses.title} - {batch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {selectedBatchId ? (
                    <div className="space-y-4">
                        {sessions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sessions.map((session) => (
                                    <Card key={session.id} className="hover:shadow-md transition-all duration-300 group">
                                        <CardHeader className="pb-3 relative">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="text-lg">{session.title}</CardTitle>
                                                    <CardDescription className="flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(session.session_date).toLocaleDateString()}
                                                    </CardDescription>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => openEditSession(session)}
                                                >
                                                    {t.adminAttendance.editSession}
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <Button
                                                variant="outline"
                                                className="w-full justify-between hover:bg-accent/5 hover:text-accent border-accent/20"
                                                onClick={() => openMarkAttendance(session)}>
                                                {t.adminAttendance.markAttendance}
                                                <ArrowIcon className="w-4 h-4" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                                {t.adminAttendance.noSessions}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-muted/10 rounded-2xl border border-dashed">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <h3 className="text-lg font-medium text-muted-foreground">{t.adminAttendance.selectPlaceholder}</h3>
                    </div>
                )}

                {/* Add Session Dialog */}
                <Dialog open={isAddSessionOpen} onOpenChange={setIsAddSessionOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t.adminAttendance.createSessionTitle}</DialogTitle>
                            <DialogDescription>{t.adminAttendance.createSessionDesc}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">{t.adminAttendance.sessionTitle}</Label>
                                <Input
                                    id="title"
                                    value={newSession.title}
                                    onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date">{t.adminAttendance.sessionDate}</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={newSession.date}
                                        onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="duration">{t.common.hours}</Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        step="0.1"
                                        value={newSession.duration}
                                        onChange={(e) => setNewSession({ ...newSession, duration: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="videoUrl">{t.adminAttendance.videoUrl}</Label>
                                <Input
                                    id="videoUrl"
                                    placeholder={t.adminAttendance.videoUrlPlaceholder}
                                    value={newSession.videoUrl}
                                    onChange={(e) => setNewSession({ ...newSession, videoUrl: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="videoDescription">{t.adminAttendance.videoDescription}</Label>
                                <Input
                                    id="videoDescription"
                                    value={newSession.videoDescription}
                                    onChange={(e) => setNewSession({ ...newSession, videoDescription: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddSessionOpen(false)}>{t.common.cancel}</Button>
                            <Button onClick={handleCreateSession} className="gradient-primary">{t.adminAttendance.createBtn}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Session Dialog */}
                <Dialog open={isEditSessionOpen} onOpenChange={setIsEditSessionOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t.adminAttendance.updateSessionTitle}</DialogTitle>
                            <DialogDescription>{t.adminAttendance.updateSessionDesc}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-title">{t.adminAttendance.sessionTitle}</Label>
                                <Input
                                    id="edit-title"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-date">{t.adminAttendance.sessionDate}</Label>
                                    <Input
                                        id="edit-date"
                                        type="date"
                                        value={editForm.date}
                                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-duration">{t.common.hours}</Label>
                                    <Input
                                        id="edit-duration"
                                        type="number"
                                        step="0.1"
                                        value={editForm.duration}
                                        onChange={(e) => setEditForm({ ...editForm, duration: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-videoUrl">{t.adminAttendance.videoUrl}</Label>
                                <Input
                                    id="edit-videoUrl"
                                    placeholder={t.adminAttendance.videoUrlPlaceholder}
                                    value={editForm.videoUrl}
                                    onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-videoDescription">{t.adminAttendance.videoDescription}</Label>
                                <Input
                                    id="edit-videoDescription"
                                    value={editForm.videoDescription}
                                    onChange={(e) => setEditForm({ ...editForm, videoDescription: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditSessionOpen(false)}>{t.common.cancel}</Button>
                            <Button onClick={handleUpdateSession} className="gradient-primary">{t.common.save}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Attendance Dialog */}
                <Dialog open={isMarkAttendanceOpen} onOpenChange={setIsMarkAttendanceOpen}>
                    <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                        <DialogHeader className="p-6 pb-2">
                            <DialogTitle className="text-xl flex items-center gap-2">
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                                {t.adminAttendance.markAttendance}: {selectedSession?.title}
                            </DialogTitle>
                            <DialogDescription>
                                {selectedSession && new Date(selectedSession.session_date).toLocaleDateString()}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto px-6 py-2">
                            {students.length > 0 ? (
                                <div className="divide-y divide-border">
                                    {students.map((student) => (
                                        <div key={student.user_id} className="py-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <span className="font-medium">{student.profiles.full_name || "N/A"}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={`text-xs font-medium uppercase tracking-wider ${attendanceMap[student.user_id] ? 'text-green-500' : 'text-red-400'}`}>
                                                    {attendanceMap[student.user_id] ? t.adminAttendance.attended : t.adminAttendance.absent}
                                                </span>
                                                <Switch
                                                    checked={!!attendanceMap[student.user_id]}
                                                    onCheckedChange={(checked) => handleToggleAttendance(student.user_id, checked)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">{t.adminAttendance.noActiveBatches}</p>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-6 pt-2 border-t bg-muted/10">
                            <Button variant="outline" onClick={() => setIsMarkAttendanceOpen(false)}>{t.common.cancel}</Button>
                            <Button onClick={saveAttendance} className="gradient-primary" disabled={savingAttendance}>
                                {savingAttendance && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                                {t.common.save}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}