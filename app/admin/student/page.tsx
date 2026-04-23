"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { AddStudentDialog } from "./add-student-dialog";

type ClassRow = { id: string; name: string; grade: number };

type StudentRow = {
    id: string;
    name: string;
    identifier: string;
    class_id: string | null;
    className: string;
    status: string;
    enrollment_date: string | null;
    level: string | null;
};

export default function AdminStudentsPage() {
    const [classes, setClasses] = useState<ClassRow[]>([]);
    const [rows, setRows] = useState<StudentRow[]>([]);
    const [loading, setLoading] = useState(false);

    const [editing, setEditing] = useState<StudentRow | null>(null);
    const [editName, setEditName] = useState("");
    const [editIc, setEditIc] = useState("");
    const [editClassId, setEditClassId] = useState<string>("none");
    const [editEnrollmentDate, setEditEnrollmentDate] = useState<string>("");
    const [confirmDelete, setConfirmDelete] = useState(false);

    async function fetchClasses() {
        try {
            const res = await fetch("/api/admin/classes");
            const data = await res.json();
            setClasses(data ?? []);
        } catch {
            setClasses([]);
        }
    }

    async function fetchStudents() {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/students");
            const json = await res.json();
            setRows(json?.data ?? []);
        } catch {
            setRows([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchClasses();
        fetchStudents();
    }, []);

    function openEdit(s: StudentRow) {
        setEditing(s);
        setEditName(s.name);
        setEditIc(s.identifier);
        setEditClassId(s.class_id ?? "none");
        setEditEnrollmentDate(s.enrollment_date ?? "");
        setConfirmDelete(false);
    }

    async function handleSaveEdit() {
        if (!editing) return;
        const toastId = toast.loading("Menyimpan...");

        try {
            const res = await fetch(`/api/admin/students?id=${editing.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullname: editName,
                    ic_number: editIc,
                    class_id: editClassId === "none" ? null : editClassId,
                    enrollment_date: editEnrollmentDate || null,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json?.message ?? "Gagal", { id: toastId });
                return;
            }
            toast.success("Pelajar dikemaskini", { id: toastId });
            setEditing(null);
            fetchStudents();
        } catch {
            toast.error("Ralat sistem", { id: toastId });
        }
    }

    async function handleDelete() {
        if (!editing) return;
        const toastId = toast.loading("Memadam...");
        try {
            const res = await fetch(`/api/admin/students?id=${editing.id}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json?.message ?? "Gagal", { id: toastId });
                return;
            }
            toast.success("Dipadam", { id: toastId });
            setEditing(null);
            fetchStudents();
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
                            Pelajar
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Daftar dan urus maklumat pelajar.
                        </p>
                    </div>

                    <AddStudentDialog onSuccess={fetchStudents} classes={[]} />
                </div>

                <Card className="shadow-lg border border-border/50">
                    <CardHeader>
                        <CardTitle>Senarai Pelajar</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>No. KP</TableHead>
                                    <TableHead>Tingkatan</TableHead>
                                    <TableHead>Kelas</TableHead>
                                    <TableHead>Tarikh Daftar</TableHead>
                                    <TableHead className="text-right">
                                        Tindakan
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">
                                            {s.name}
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            {s.identifier}
                                        </TableCell>
                                        <TableCell>
                                            {s.level ? `Tingkatan ${s.level}` : "—"}
                                        </TableCell>
                                        <TableCell>{s.className || "—"}</TableCell>
                                        <TableCell>
                                            {s.enrollment_date
                                                ? new Date(s.enrollment_date).toLocaleDateString("ms-MY")
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openEdit(s)}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {!loading && rows.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="text-center text-muted-foreground py-10"
                                        >
                                            Tiada pelajar.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {loading && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
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
                        <DialogTitle>Edit Pelajar</DialogTitle>
                    </DialogHeader>

                    {editing && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nama Penuh</Label>
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>No. Kad Pengenalan</Label>
                                <Input
                                    value={editIc}
                                    onChange={(e) => setEditIc(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Kelas</Label>
                                <Select value={editClassId} onValueChange={setEditClassId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih kelas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Tiada</SelectItem>
                                        {classes.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                T{c.grade} • {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Tarikh Daftar</Label>
                                <Input
                                    type="date"
                                    value={editEnrollmentDate}
                                    onChange={(e) => setEditEnrollmentDate(e.target.value)}
                                />
                            </div>

                            <DialogFooter className="gap-2">
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => setConfirmDelete(true)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Padam
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditing(null)}
                                >
                                    Batal
                                </Button>
                                <Button type="button" onClick={handleSaveEdit} disabled={!editName || !editIc}>
                                    Simpan
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Padam Pelajar?</DialogTitle>
                    </DialogHeader>
                    <div className="text-sm text-muted-foreground">
                        Tindakan ini tidak boleh diundur.
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                            Batal
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Padam
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
