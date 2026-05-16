"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, FileText } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { PiCalendarPlusLight } from "react-icons/pi";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ExamItem } from "@/app/types";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button as UIButton } from "@/components/ui/button";

type SubjectOption = { id: string; name: string };
type SubjectExamSettings = {
    deadline?: string | null;
    objective_questions?: number | string | null;
    objective_max?: number | string | null;
    subjective_max?: number | string | null;
};
type ExamWithSettings = ExamItem & {
    subject_settings?: Record<string, SubjectExamSettings>;
};

export default function ExamsPage() {
    const [exams, setExams] = useState<ExamWithSettings[]>([]);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState<ExamWithSettings | null>(null);
    const [deleting, setDeleting] = useState<ExamWithSettings | null>(null);
    const [settingExam, setSettingExam] = useState<ExamWithSettings | null>(null);
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
    const [deadline, setDeadline] = useState<string>("");
    const [objectiveQuestions, setObjectiveQuestions] = useState<number>(40);
    const [objectiveMax, setObjectiveMax] = useState<number>(40);
    const [subjectiveMax, setSubjectiveMax] = useState<number>(60);

    // ================= FETCH EXAMS =================
    async function fetchExams() {
        try {
            const res = await fetch("/api/admin/exams", { cache: "no-store" });
            const data = await res.json();
            setExams(data);
        } catch {
            toast.error("Gagal memuatkan senarai peperiksaan");
        }
    }

    async function fetchSubjects() {
        try {
            const res = await fetch("/api/admin/subjects", { cache: "no-store" });
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setSubjects(
                list
                    .map((s: { id?: unknown; name?: unknown }) => ({
                        id: String(s.id ?? ""),
                        name: String(s.name ?? ""),
                    }))
                    .filter((s) => s.id && s.name)
            );
        } catch {
            setSubjects([]);
        }
    }

    useEffect(() => {
        void (async () => {
            await Promise.all([fetchExams(), fetchSubjects()]);
        })();
    }, []);

    // ================= ADD EXAM =================
    async function handleAddExam(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        const res = await fetch("/api/admin/exams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                exam_name: formData.get("exam_name"),
                academic_year: formData.get("academic_year"),
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            toast.error(data.message || "Gagal menambah peperiksaan");
            setLoading(false);
            return;
        }

        toast.success("Peperiksaan berjaya ditambah");
        setLoading(false);
        fetchExams();

        (
            document.getElementById("close-exam-dialog") as HTMLButtonElement
        )?.click();
    }

    // ================= EDIT EXAM =================
    async function handleEditExam(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!editing) return;

        setLoading(true);
        const formData = new FormData(e.currentTarget);

        const res = await fetch("/api/admin/exams", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                exam_id: editing.id,
                exam_name: formData.get("exam_name"),
                academic_year: formData.get("academic_year"),
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            toast.error(data.message || "Gagal mengemas kini peperiksaan");
            setLoading(false);
            return;
        }

        toast.success("Peperiksaan berjaya dikemas kini");
        setEditing(null);
        setLoading(false);
        fetchExams();
    }

    // ================= DELETE EXAM =================
    async function handleDeleteExam() {
        if (!deleting) return;

        setLoading(true);

        const res = await fetch(
            `/api/admin/exams?id=${deleting.id}`,
            { method: "DELETE" }
        );

        const data = await res.json();

        if (!res.ok) {
            toast.error(data.message || "Gagal memadam peperiksaan", {
                duration: 7000,
            });
            setLoading(false);
            return;
        }

        toast.success("Peperiksaan berjaya dipadam");
        setDeleting(null);
        setLoading(false);
        fetchExams();
    }

    function openSettings(exam: ExamWithSettings) {
        setSettingExam(exam);
        setSelectedSubjectId("");
        setDeadline("");
        setObjectiveQuestions(40);
        setObjectiveMax(40);
        setSubjectiveMax(60);
    }

    function loadSubjectSettings(exam: ExamWithSettings | null, subjectId: string) {
        const settings = exam?.subject_settings ?? {};
        const s = settings?.[subjectId] ?? null;
        setDeadline(String(s?.deadline ?? ""));
        setObjectiveQuestions(Number(s?.objective_questions ?? 40));
        setObjectiveMax(Number(s?.objective_max ?? Number(s?.objective_questions ?? 40)));
        setSubjectiveMax(Number(s?.subjective_max ?? 60));
    }

    async function handleSaveSettings() {
        if (!settingExam || !selectedSubjectId) {
            toast.error("Sila pilih subjek");
            return;
        }

        const subject_settings = {
            ...(settingExam.subject_settings ?? {}),
            [selectedSubjectId]: {
                deadline: deadline || null,
                objective_questions: Number(objectiveQuestions) || 0,
                objective_max: Number(objectiveMax) || 0,
                subjective_max: Number(subjectiveMax) || 0,
            },
        };

        setLoading(true);
        const res = await fetch("/api/admin/exams", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                exam_id: settingExam.id,
                subject_settings,
            }),
        });

        const data = await res.json();
        setLoading(false);

        if (!res.ok) {
            toast.error(data.message || "Gagal menyimpan settings. Pastikan kolum `subject_settings` wujud dalam DB.");
            return;
        }

        toast.success("Settings berjaya disimpan");
        setSettingExam(null);
        fetchExams();
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* ================= HEADER + ADD BUTTON ================= */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <FileText className="w-6 h-6 text-primary" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                Pengurusan Peperiksaan
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Urus maklumat peperiksaan dan tahun akademik dalam
                            sistem pengurusan sekolah.
                        </p>
                    </div>

                    {/* ADD EXAM BUTTON */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="w-full bg-gradient-to-r from-primary to-primary/90 shadow-lg hover:from-primary/95 hover:to-primary/80 sm:w-auto">
                                <PiCalendarPlusLight className="w-4 h-4 mr-2" />
                                Tambah Peperiksaan
                            </Button>
                        </DialogTrigger>

                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Tambah Peperiksaan Baharu</DialogTitle>
                                <DialogDescription>
                                    Masukkan maklumat peperiksaan dan tahun akademik.
                                </DialogDescription>
                            </DialogHeader>

                            <form
                                onSubmit={handleAddExam}
                                className="space-y-4"
                            >
                                <div>
                                    <Label>Nama Peperiksaan</Label>
                                    <Input name="exam_name" required />
                                </div>

                                <div>
                                    <Label>Tahun Akademik</Label>
                                    <Input
                                        name="academic_year"
                                        placeholder="2024/2025"
                                        required
                                    />
                                </div>

                                <DialogFooter>
                                    <Button
                                        id="close-exam-dialog"
                                        type="button"
                                        variant="outline"
                                    >
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={loading}>
                                        {loading ? "Menyimpan..." : "Simpan"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* ================= TABLE ================= */}
                <div className="rounded-xl border bg-card shadow">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Nama Peperiksaan</TableHead>
                                <TableHead>Tahun Akademik</TableHead>
                                <TableHead>Tindakan</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {exams.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="text-center text-muted-foreground"
                                    >
                                        Tiada peperiksaan dijumpai
                                    </TableCell>
                                </TableRow>
                            ) : (
                                exams.map((exam, index) => (
                                    <TableRow key={exam.id}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>{exam.name}</TableCell>
                                        <TableCell>{exam.academic_year}</TableCell>
                                        <TableCell className="flex flex-wrap gap-2">
                                           
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                onClick={() => setEditing(exam)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>

                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                onClick={() => setDeleting(exam)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* ================= EDIT DIALOG ================= */}
                <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Kemas Kini Peperiksaan</DialogTitle>
                        </DialogHeader>

                        <form
                            onSubmit={handleEditExam}
                            className="space-y-4"
                        >
                            <div>
                                <Label>Nama Peperiksaan</Label>
                                <Input
                                    name="exam_name"
                                    defaultValue={editing?.name}
                                    required
                                />
                            </div>

                            <div>
                                <Label>Tahun Akademik</Label>
                                <Input
                                    name="academic_year"
                                    defaultValue={editing?.academic_year}
                                    required
                                />
                            </div>

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setEditing(null)}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    Simpan
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ================= DELETE DIALOG ================= */}
                <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Padam Peperiksaan</DialogTitle>
                            <DialogDescription>
                                Anda pasti ingin memadam peperiksaan{" "}
                                <b>{deleting?.name}</b>? Tindakan ini tidak boleh
                                dibatalkan.
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeleting(null)}
                            >
                                Batal
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteExam}
                                disabled={loading}
                            >
                                Padam
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ================= SETTINGS DIALOG ================= */}
                <Dialog open={!!settingExam} onOpenChange={() => setSettingExam(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Settings Peperiksaan (ikut subjek)</DialogTitle>
                            <DialogDescription>
                                Tetapkan deadline hantar markah + limit objektif/subjektif untuk setiap subjek bagi peperiksaan ini.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Subjek</Label>
                                <Select
                                    value={selectedSubjectId}
                                    onValueChange={(v) => {
                                        setSelectedSubjectId(v);
                                        loadSubjectSettings(settingExam, v);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih subjek" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Tarikh Akhir</Label>
                                <Input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="space-y-2">
                                    <Label>Bil. Soalan Objektif</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={objectiveQuestions}
                                        onChange={(e) =>
                                            setObjectiveQuestions(Number(e.target.value))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Max Objektif</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={objectiveMax}
                                        onChange={(e) => setObjectiveMax(Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Max Subjektif</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={subjectiveMax}
                                        onChange={(e) =>
                                            setSubjectiveMax(Number(e.target.value))
                                        }
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <UIButton
                                    variant="outline"
                                    onClick={() => setSettingExam(null)}
                                >
                                    Batal
                                </UIButton>
                                <UIButton
                                    onClick={handleSaveSettings}
                                    disabled={loading || !selectedSubjectId}
                                >
                                    Simpan
                                </UIButton>
                            </DialogFooter>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
