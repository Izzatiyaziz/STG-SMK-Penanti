"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Pencil, UserPlus } from "lucide-react";

type SubjectRow = {
    id: string;
    name: string;
    coordinator: { id: string; name: string } | null;
};

type TeacherRow = {
    id: string;
    name: string;
    identifier?: string;
};

export default function AdminSubjectsPage() {
    const [rows, setRows] = useState<SubjectRow[]>([]);
    const [loading, setLoading] = useState(false);

    const [editing, setEditing] = useState<SubjectRow | null>(null);
    const [editName, setEditName] = useState("");

    const [teachers, setTeachers] = useState<TeacherRow[]>([]);
    const [assigning, setAssigning] = useState<SubjectRow | null>(null);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

    async function fetchSubjects() {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/subjects");
            const data = await res.json();
            setRows(data ?? []);
        } catch {
            setRows([]);
        } finally {
            setLoading(false);
        }
    }

    async function fetchTeachers() {
        try {
            const res = await fetch("/api/admin/users?role=teacher");
            const data = await res.json();
            setTeachers(Array.isArray(data) ? data : []);
        } catch {
            setTeachers([]);
        }
    }

    useEffect(() => {
        fetchSubjects();
        fetchTeachers();
    }, []);

    async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const subject_name = String(fd.get("subject_name") ?? "").trim();
        if (!subject_name) return;

        const toastId = toast.loading("Menambah subjek...");
        try {
            const res = await fetch("/api/admin/subjects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject_name }),
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json?.message ?? "Gagal", { id: toastId });
                return;
            }
            toast.success("Subjek berjaya ditambah", { id: toastId });
            fetchSubjects();
            (e.currentTarget as HTMLFormElement).reset();
        } catch {
            toast.error("Ralat sistem", { id: toastId });
        }
    }

    async function handleSaveEdit() {
        if (!editing) return;
        const toastId = toast.loading("Menyimpan...");
        try {
            const res = await fetch("/api/admin/subjects", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject_id: editing.id,
                    subject_name: editName,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json?.message ?? "Gagal", { id: toastId });
                return;
            }
            toast.success("Subjek dikemaskini", { id: toastId });
            setEditing(null);
            fetchSubjects();
        } catch {
            toast.error("Ralat sistem", { id: toastId });
        }
    }

    async function handleDelete(id: string) {
        const toastId = toast.loading("Memadam...");
        try {
            const res = await fetch(`/api/admin/subjects?id=${id}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json?.message ?? "Gagal", { id: toastId });
                return;
            }
            toast.success("Dipadam", { id: toastId });
            fetchSubjects();
        } catch {
            toast.error("Ralat sistem", { id: toastId });
        }
    }

    async function handleAssignCoordinator() {
        if (!assigning || !selectedTeacherId) return;

        const toastId = toast.loading("Menyimpan penyelaras...");
        try {
            const res = await fetch("/api/admin/subject-coordinator", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject_id: assigning.id,
                    teacher_id: selectedTeacherId,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json?.error ?? "Gagal", { id: toastId });
                return;
            }
            toast.success(json?.message ?? "Berjaya", { id: toastId });
            setAssigning(null);
            setSelectedTeacherId("");
            fetchSubjects();
        } catch {
            toast.error("Ralat sistem", { id: toastId });
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Subjek
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Urus senarai subjek dan penyelaras.
                        </p>
                    </div>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Tambah Subjek
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Tambah Subjek</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAdd} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nama Subjek</Label>
                                    <Input name="subject_name" required />
                                </div>
                                <DialogFooter>
                                    <Button type="submit">Simpan</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card className="shadow-lg border border-border/50">
                    <CardHeader>
                        <CardTitle>Senarai Subjek</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>Penyelaras</TableHead>
                                    <TableHead className="text-right">
                                        Tindakan
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{r.name}</TableCell>
                                        <TableCell>
                                            {r.coordinator?.name ?? "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setAssigning(r);
                                                        setSelectedTeacherId(
                                                            r.coordinator?.id ?? ""
                                                        );
                                                    }}
                                                    title={
                                                        r.coordinator
                                                            ? "Tukar penyelaras"
                                                            : "Lantik penyelaras"
                                                    }
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setEditing(r);
                                                        setEditName(r.name);
                                                    }}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDelete(r.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {!loading && rows.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={3}
                                            className="text-center text-muted-foreground py-10"
                                        >
                                            Tiada subjek.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {loading && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={3}
                                            className="text-center text-muted-foreground py-10"
                                        >
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={Boolean(editing)} onOpenChange={() => setEditing(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Subjek</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nama Subjek</Label>
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditing(null)}>
                                Batal
                            </Button>
                            <Button onClick={handleSaveEdit} disabled={!editName}>
                                Simpan
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(assigning)}
                onOpenChange={(open) => {
                    if (!open) {
                        setAssigning(null);
                        setSelectedTeacherId("");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {assigning?.coordinator
                                ? "Tukar Penyelaras Subjek"
                                : "Lantik Penyelaras Subjek"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                Subjek:{" "}
                                <span className="font-medium text-foreground">
                                    {assigning?.name ?? "-"}
                                </span>
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Guru</Label>
                            <Select
                                value={selectedTeacherId}
                                onValueChange={setSelectedTeacherId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih guru" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teachers.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name}
                                            {t.identifier ? ` (${t.identifier})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setAssigning(null);
                                    setSelectedTeacherId("");
                                }}
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={handleAssignCoordinator}
                                disabled={!selectedTeacherId}
                            >
                                Simpan
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
