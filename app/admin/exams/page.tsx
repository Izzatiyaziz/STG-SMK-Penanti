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

export default function ExamsPage() {
    const [exams, setExams] = useState<ExamItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState<ExamItem | null>(null);
    const [deleting, setDeleting] = useState<ExamItem | null>(null);

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

    useEffect(() => {
        fetchExams();
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
            toast.error(data.message || "Gagal memadam peperiksaan");
            setLoading(false);
            return;
        }

        toast.success("Peperiksaan berjaya dipadam");
        setDeleting(null);
        setLoading(false);
        fetchExams();
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* ================= HEADER + ADD BUTTON ================= */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                            <Button className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/80 shadow-lg">
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
                                <TableHead>No</TableHead>
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
                                        <TableCell className="flex gap-2">
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
            </div>
        </div>
    );
}
