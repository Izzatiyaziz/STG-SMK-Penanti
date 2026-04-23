"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Plus, Trash2, Pencil, UserPlus } from "lucide-react";

type ClassRow = { id: string; name: string; grade: number };

type TeacherOption = {
    id: string;
    name: string;
    identifier?: string;
    roles?: string[];
};

export default function AdminClassesPage() {
    const PAGE_SIZE = 8;
    const [rows, setRows] = useState<ClassRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [editing, setEditing] = useState<ClassRow | null>(null);
    const [editName, setEditName] = useState("");
    const [editGrade, setEditGrade] = useState<number>(1);

    const [teachers, setTeachers] = useState<TeacherOption[]>([]);
    const [classTeacherByClassId, setClassTeacherByClassId] = useState<
        Record<string, string>
    >({});
    const [assigning, setAssigning] = useState<ClassRow | null>(null);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

    async function fetchClasses() {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/classes");
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

            const list = Array.isArray(data) ? data : [];

            const options: TeacherOption[] = [];
            for (const item of list) {
                if (!item || typeof item !== "object") continue;

                const id = String((item as { id?: unknown }).id ?? "").trim();
                const name = String((item as { name?: unknown }).name ?? "").trim();
                const identifierRaw = (item as { identifier?: unknown }).identifier;
                const rolesRaw = (item as { roles?: unknown }).roles;

                const roles = Array.isArray(rolesRaw)
                    ? rolesRaw.map((r) => String(r))
                    : [];

                if (!id || !name) continue;

                options.push({
                    id,
                    name,
                    identifier:
                        identifierRaw === undefined || identifierRaw === null
                            ? undefined
                            : String(identifierRaw),
                    roles,
                });
            }

            setTeachers(options);
        } catch {
            setTeachers([]);
        }
    }

    async function fetchClassTeachers() {
        try {
            const res = await fetch("/api/admin/class-teacher");
            const data = await res.json();
            const map: Record<string, string> = {};
            for (const row of Array.isArray(data) ? data : []) {
                if (row?.class_id && row?.teacher_id) map[row.class_id] = row.teacher_id;
            }
            setClassTeacherByClassId(map);
        } catch {
            setClassTeacherByClassId({});
        }
    }

    useEffect(() => {
        fetchClasses();
        fetchTeachers();
        fetchClassTeachers();
    }, []);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, rows.length]);

    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const paginatedRows = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return rows.slice(startIndex, startIndex + PAGE_SIZE);
    }, [currentPage, rows]);

    const paginationItems = useMemo(() => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        if (currentPage <= 3) {
            return [1, 2, 3, 4, "ellipsis", totalPages] as const;
        }

        if (currentPage >= totalPages - 2) {
            return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
        }

        return [1, "ellipsis-left", currentPage - 1, currentPage, currentPage + 1, "ellipsis-right", totalPages] as const;
    }, [currentPage, totalPages]);

    async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const class_name = String(fd.get("class_name") ?? "").trim();
        const grade = Number(fd.get("grade") ?? 1);

        if (!class_name) return;

        const toastId = toast.loading("Menambah kelas...");
        try {
            const res = await fetch("/api/admin/classes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ class_name, grade }),
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json?.message ?? "Gagal", { id: toastId });
                return;
            }
            toast.success("Kelas berjaya ditambah", { id: toastId });
            fetchClasses();
            fetchClassTeachers();
            (e.currentTarget as HTMLFormElement).reset();
        } catch {
            toast.error("Ralat sistem", { id: toastId });
        }
    }

    async function handleSaveEdit() {
        if (!editing) return;
        const toastId = toast.loading("Menyimpan...");
        try {
            const res = await fetch("/api/admin/classes", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    class_id: editing.id,
                    class_name: editName,
                    grade: editGrade,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json?.message ?? "Gagal", { id: toastId });
                return;
            }
            toast.success("Kelas dikemaskini", { id: toastId });
            setEditing(null);
            fetchClasses();
            fetchClassTeachers();
        } catch {
            toast.error("Ralat sistem", { id: toastId });
        }
    }

    async function handleDelete(id: string) {
        const toastId = toast.loading("Memadam...");
        try {
            const res = await fetch(`/api/admin/classes?id=${id}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json?.message ?? "Gagal", { id: toastId });
                return;
            }
            toast.success("Dipadam", { id: toastId });
            fetchClasses();
            fetchClassTeachers();
        } catch {
            toast.error("Ralat sistem", { id: toastId });
        }
    }

    async function handleAssignClassTeacher() {
        if (!assigning || !selectedTeacherId) return;
        const toastId = toast.loading("Menyimpan guru kelas...");
        try {
            const res = await fetch("/api/admin/class-teacher", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    class_id: assigning.id,
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
            fetchClassTeachers();
        } catch {
            toast.error("Ralat sistem", { id: toastId });
        }
    }

    async function handleRemoveClassTeacher() {
        if (!assigning) return;
        const toastId = toast.loading("Membuang guru kelas...");
        try {
            const res = await fetch(
                `/api/admin/class-teacher?class_id=${assigning.id}`,
                { method: "DELETE" }
            );
            const json = await res.json();
            if (!res.ok) {
                toast.error(json?.error ?? "Gagal", { id: toastId });
                return;
            }
            toast.success(json?.message ?? "Berjaya", { id: toastId });
            setAssigning(null);
            setSelectedTeacherId("");
            fetchClassTeachers();
        } catch {
            toast.error("Ralat sistem", { id: toastId });
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Kelas
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Urus kelas mengikut tingkatan.
                        </p>
                    </div>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Tambah Kelas
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Tambah Kelas</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAdd} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nama Kelas</Label>
                                    <Input name="class_name" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tingkatan</Label>
                                    <Input
                                        name="grade"
                                        type="number"
                                        min={1}
                                        max={5}
                                        defaultValue={1}
                                        required
                                    />
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
                        <CardTitle>Senarai Kelas</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tingkatan</TableHead>
                                    <TableHead>Nama Kelas</TableHead>
                                    <TableHead>Guru Kelas</TableHead>
                                    <TableHead className="text-right">
                                        Tindakan
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedRows.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{r.grade}</TableCell>
                                        <TableCell>{r.name}</TableCell>
                                        <TableCell>
                                            {teachers.find(
                                                (t) => t.id === classTeacherByClassId[r.id]
                                            )?.name ?? "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setAssigning(r);
                                                        setSelectedTeacherId(
                                                            classTeacherByClassId[r.id] ?? ""
                                                        );
                                                    }}
                                                    title="Assign guru kelas"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setEditing(r);
                                                        setEditName(r.name);
                                                        setEditGrade(r.grade);
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
                                            colSpan={4}
                                            className="text-center text-muted-foreground py-10"
                                        >
                                            Tiada kelas.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {loading && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
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

                {!loading && rows.length > 0 && (
                    <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                            Showing {(currentPage - 1) * PAGE_SIZE + 1}
                            {" - "}
                            {Math.min(currentPage * PAGE_SIZE, rows.length)} of {rows.length} classes
                        </div>
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setCurrentPage((page) => Math.max(1, page - 1));
                                        }}
                                        className={
                                            currentPage === 1
                                                ? "pointer-events-none opacity-50"
                                                : undefined
                                        }
                                    />
                                </PaginationItem>

                                {paginationItems.map((item, index) => {
                                    if (typeof item !== "number") {
                                        return (
                                            <PaginationItem key={`${item}-${index}`}>
                                                <PaginationEllipsis />
                                            </PaginationItem>
                                        );
                                    }

                                    return (
                                        <PaginationItem key={item}>
                                            <PaginationLink
                                                href="#"
                                                isActive={currentPage === item}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setCurrentPage(item);
                                                }}
                                            >
                                                {item}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                })}

                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setCurrentPage((page) =>
                                                Math.min(totalPages, page + 1)
                                            );
                                        }}
                                        className={
                                            currentPage === totalPages
                                                ? "pointer-events-none opacity-50"
                                                : undefined
                                        }
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}
            </div>

            <Dialog open={Boolean(editing)} onOpenChange={() => setEditing(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Kelas</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nama Kelas</Label>
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tingkatan</Label>
                            <Input
                                type="number"
                                min={1}
                                max={5}
                                value={editGrade}
                                onChange={(e) => setEditGrade(Number(e.target.value))}
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
                        <DialogTitle>Assign Guru Kelas</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                            Kelas:{" "}
                            <span className="font-medium text-foreground">
                                {assigning ? `T${assigning.grade} • ${assigning.name}` : "-"}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <Label>Guru</Label>
                            <Select
                                value={selectedTeacherId}
                                onValueChange={setSelectedTeacherId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih guru kelas" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teachers.map((t) => {
                                        const assignedTeacherIds = new Set(
                                            Object.values(classTeacherByClassId)
                                        );
                                        const currentTeacherForClass =
                                            assigning?.id
                                                ? classTeacherByClassId[assigning.id]
                                                : "";
                                        const disabled =
                                            assignedTeacherIds.has(t.id) &&
                                            t.id !== currentTeacherForClass;

                                        return (
                                            <SelectItem
                                                key={t.id}
                                                value={t.id}
                                                disabled={disabled}
                                            >
                                                {t.name}
                                                {t.identifier ? ` (${t.identifier})` : ""}
                                                {disabled ? " — sudah assigned" : ""}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Nota: Seorang guru hanya boleh menjadi guru kelas untuk
                                satu kelas sahaja.
                            </p>
                        </div>

                        <DialogFooter className="justify-between sm:justify-between">
                            <div className="flex gap-2">
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
                                    onClick={handleAssignClassTeacher}
                                    disabled={!selectedTeacherId}
                                >
                                    Simpan
                                </Button>
                            </div>
                            {assigning?.id && classTeacherByClassId[assigning.id] && (
                                <Button
                                    variant="destructive"
                                    onClick={handleRemoveClassTeacher}
                                >
                                    Buang
                                </Button>
                            )}
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
