"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    Loader2,
    ArrowLeft,
    Users,
    GraduationCap,
    Hash,
    UserCheck,
    Calendar,
    FileText,
    Edit,
    Save,
    Trash2,
    Eye,
    Building2,
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Student = {
    student_id: string;
    fullname: string;
    ic_number: string;
    status: string;
};

type TeacherItem = {
    id: string;
    name: string;
    email?: string | null;
};

export default function ClassDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [classInfo, setClassInfo] = useState<any>(null);
    const [students, setStudents] = useState<Student[]>([]);

    // Edit states
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState("");

    // Teacher assignment states
    const [teachers, setTeachers] = useState<TeacherItem[]>([]);
    const [loadingTeachers, setLoadingTeachers] = useState(false);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

    useEffect(() => {
        async function fetchDetail() {
            try {
                const res = await fetch(`/api/admin/classes/${id}`);
                const data = await res.json();

                if (!res.ok) throw new Error(data?.error);

                setClassInfo(data.class);
                setStudents(data.students);
                setEditedName(data.class.name);

                // Fetch teachers for assignment
                await fetchTeachers();

                // Fetch current assigned teacher
                await fetchCurrentTeacher();
            } catch (err) {
                console.error(err);
                toast.error("Gagal memuatkan maklumat kelas");
            } finally {
                setLoading(false);
            }
        }

        fetchDetail();
    }, [id]);

    // Fetch teachers
    async function fetchTeachers() {
        setLoadingTeachers(true);
        try {
            const res = await fetch("/api/admin/users?role=teacher");
            const data = await res.json();

            if (!res.ok) {
                toast.error(data?.error || "Gagal memuatkan senarai guru");
                return;
            }

            const classTeachers: TeacherItem[] = (data || [])
                .filter(
                    (t: any) =>
                        Array.isArray(t.roles) &&
                        t.roles.includes("class teacher")
                )
                .map((t: any) => ({
                    id: t.id,
                    name: t.name,
                    email: t.email ?? null,
                }));

            setTeachers(classTeachers);
        } catch {
            toast.error("Gagal memuatkan senarai guru");
        } finally {
            setLoadingTeachers(false);
        }
    }

    // Fetch current assigned teacher
    async function fetchCurrentTeacher() {
        try {
            const res = await fetch(`/api/admin/class-teacher?class_id=${id}`);
            const data = await res.json();
            if (data?.teacher_id) {
                setSelectedTeacherId(data.teacher_id);
            }
        } catch {
            // Ignore error, just means no teacher assigned
        }
    }

    // Save class name changes
    async function handleSaveName() {
        if (!editedName.trim()) {
            toast.error("Nama kelas tidak boleh kosong");
            return;
        }

        try {
            const res = await fetch("/api/admin/classes", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    class_id: id,
                    class_name: editedName.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data?.message || "Gagal mengemas kini kelas");
                return;
            }

            toast.success("Kelas berjaya dikemas kini");
            setClassInfo({ ...classInfo, name: editedName.trim() });
            setIsEditing(false);
        } catch {
            toast.error("Ralat sistem. Sila cuba lagi");
        }
    }

    // Assign class teacher
    async function handleAssignClassTeacher() {
        if (!selectedTeacherId) {
            toast.error("Sila pilih guru untuk kelas ini");
            return;
        }

        try {
            const res = await fetch("/api/admin/class-teacher", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    class_id: id,
                    teacher_id: selectedTeacherId,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data?.error || "Gagal lantik guru kelas");
                return;
            }

            toast.success("Guru kelas berjaya dilantik");
        } catch {
            toast.error("Ralat sistem. Sila cuba lagi");
        }
    }

    // Delete class
    async function handleDeleteClass() {
        if (
            !confirm(
                "Adakah anda pasti mahu memadam kelas ini? Tindakan ini tidak boleh dibatalkan."
            )
        ) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/classes?id=${id}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data?.message || "Gagal memadam kelas");
                return;
            }

            toast.success("Kelas berjaya dipadam");
            router.push("/admin/classes");
        } catch {
            toast.error("Ralat sistem. Sila cuba lagi");
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-24 rounded-lg" />
                </div>

                <Card className="border-border/40">
                    <CardHeader>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-6 w-48" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[...Array(3)].map((_, i) => (
                                <Skeleton key={i} className="h-24 rounded-xl" />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/40">
                    <CardHeader>
                        <Skeleton className="h-7 w-40" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12 rounded-lg" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const activeStudents = students.filter((s) => s.status === "active").length;
    const inactiveStudents = students.filter(
        (s) => s.status === "inactive"
    ).length;

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/admin/classes")}
                        className="rounded-lg gap-2 border-border/60 hover:bg-muted/30"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali
                    </Button>
                    <div className="h-6 w-px bg-border/60" />
                    <h1 className="text-lg md:text-xl font-semibold text-foreground">
                        Maklumat Kelas
                    </h1>
                </div>

                <div className="flex w-full gap-2 sm:w-auto">
                    <Button
                        variant="outline"
                        onClick={() => setIsEditing(!isEditing)}
                        className="w-full rounded-lg gap-2 sm:w-auto"
                    >
                        <Edit className="w-4 h-4" />
                        {isEditing ? "Batal Edit" : "Edit Kelas"}
                    </Button>
                </div>
            </div>

            {/* Class Overview Card */}
            <Card className="border-border/40 bg-gradient-to-br from-card to-muted/10 rounded-xl shadow-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <GraduationCap className="w-5 h-5 text-primary" />
                                </div>
                                {isEditing ? (
                                    <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                                        <Input
                                            value={editedName}
                                            onChange={(e) =>
                                                setEditedName(e.target.value)
                                            }
                                            className="h-12 text-xl font-bold md:text-2xl"
                                        />
                                        <Button
                                            onClick={handleSaveName}
                                            className="w-full gap-2 sm:w-auto"
                                        >
                                            <Save className="w-4 h-4" />
                                            Simpan
                                        </Button>
                                    </div>
                                ) : (
                                    <CardTitle className="text-xl md:text-2xl font-bold">
                                        {classInfo.name}
                                    </CardTitle>
                                )}
                                <Badge
                                    variant="outline"
                                    className="rounded-lg px-3 py-1 text-sm font-medium bg-primary/5 border-primary/20"
                                >
                                    Tingkatan {classInfo.grade}
                                </Badge>
                            </div>
                            <CardDescription className="text-base">
                                Maklumat lengkap dan senarai pelajar kelas ini
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Users className="w-5 h-5 text-muted-foreground" />
                            <span className="text-lg font-semibold text-foreground">
                                {students.length} Pelajar
                            </span>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {/* Class Teacher Assignment */}
                    <div className="mb-6">
                        <Label className="block text-sm font-medium text-foreground mb-3">
                            Guru Kelas
                        </Label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Select
                                value={selectedTeacherId}
                                onValueChange={setSelectedTeacherId}
                                disabled={loadingTeachers}
                            >
                                <SelectTrigger className="flex-1 rounded-lg">
                                    <SelectValue
                                        placeholder={
                                            loadingTeachers
                                                ? "Memuatkan..."
                                                : "Pilih guru kelas"
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg">
                                    {loadingTeachers ? (
                                        <SelectItem value="loading" disabled>
                                            Memuatkan...
                                        </SelectItem>
                                    ) : teachers.length === 0 ? (
                                        <SelectItem value="empty" disabled>
                                            Tiada guru kelas tersedia
                                        </SelectItem>
                                    ) : (
                                        teachers.map((t) => (
                                            <SelectItem
                                                key={t.id}
                                                value={t.id}
                                                className="rounded-md"
                                            >
                                                {t.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            <Button
                                onClick={handleAssignClassTeacher}
                                className="gap-2 rounded-lg"
                                disabled={!selectedTeacherId || loadingTeachers}
                            >
                                <UserCheck className="w-4 h-4" />
                                Lantik Guru
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-200/50">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">
                                            Jumlah Pelajar
                                        </p>
                                        <p className="text-2xl font-bold text-foreground">
                                            {students.length}
                                        </p>
                                    </div>
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <Users className="w-4 h-4 text-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-200/50">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">
                                            Pelajar Aktif
                                        </p>
                                        <p className="text-2xl font-bold text-foreground">
                                            {activeStudents}
                                        </p>
                                    </div>
                                    <div className="p-2 bg-green-500/10 rounded-lg">
                                        <UserCheck className="w-4 h-4 text-green-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-200/50">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">
                                            Tidak Aktif
                                        </p>
                                        <p className="text-2xl font-bold text-foreground">
                                            {inactiveStudents}
                                        </p>
                                    </div>
                                    <div className="p-2 bg-amber-500/10 rounded-lg">
                                        <FileText className="w-4 h-4 text-amber-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            {/* Student List Card */}
            <Card className="border-border/40 bg-gradient-to-br from-card to-muted/10 rounded-xl shadow-sm">
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Senarai Pelajar</CardTitle>
                                <CardDescription>
                                    Kesemua pelajar dalam kelas {classInfo.name}
                                </CardDescription>
                            </div>
                        </div>
                        <Badge
                            variant="secondary"
                            className="rounded-lg px-3 py-1.5"
                        >
                            {students.length} Rekod
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent>
                    {students.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center mx-auto mb-6">
                                <Users className="w-10 h-10 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                Tiada pelajar dalam kelas ini
                            </h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Kelas ini belum mempunyai sebarang pelajar.
                                Tambah pelajar untuk mengisi kelas ini.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-border/60 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="font-medium text-foreground w-16 text-center">
                                            #
                                        </TableHead>
                                        <TableHead className="font-medium text-foreground">
                                            <div className="flex items-center gap-2">
                                                <Hash className="w-3.5 h-3.5" />
                                                Nama Pelajar
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-medium text-foreground">
                                            No. Kad Pengenalan
                                        </TableHead>
                                        <TableHead className="font-medium text-foreground">
                                            Status
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map((student, index) => (
                                        <TableRow
                                            key={student.student_id}
                                            className="group hover:bg-muted/30 transition-colors"
                                        >
                                            <TableCell className="text-center text-muted-foreground">
                                                {index + 1}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-foreground">
                                                    {student.fullname}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground font-mono">
                                                {student.ic_number}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        student.status ===
                                                        "active"
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    className={`rounded-lg ${
                                                        student.status ===
                                                        "active"
                                                            ? "bg-green-500/10 text-green-700 border-green-200 hover:bg-green-500/20"
                                                            : "bg-amber-500/10 text-amber-700 border-amber-200 hover:bg-amber-500/20"
                                                    }`}
                                                >
                                                    {student.status === "active"
                                                        ? "Aktif"
                                                        : "Tidak Aktif"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/40">
                <Button
                    variant="outline"
                    onClick={() => router.push("/admin/classes")}
                    className="rounded-lg gap-2 border-border/60 w-full sm:w-auto"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali ke Senarai
                </Button>

                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <Button className="w-full rounded-lg gap-2 sm:w-auto">
                        <Users className="w-4 h-4" />
                        Eksport Senarai
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDeleteClass}
                        className="rounded-lg gap-2 w-full sm:w-auto"
                    >
                        <Trash2 className="w-4 h-4" />
                        Padam Kelas
                    </Button>
                </div>
            </div>
        </div>
    );
}
