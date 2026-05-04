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
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, UserPlus, UserMinus, Search, RefreshCw, School, Users, Clock, Shield, Filter } from "lucide-react";

type ClassRow = {
    id: string;
    name: string;
    grade: number;
    studentCount: number;
};

type TeacherOption = {
    id: string;
    name: string;
    identifier?: string;
    roles?: string[];
};

// Client-side only time component
const LastUpdatedTime = () => {
    const [time, setTime] = useState<string>("");

    useEffect(() => {
        setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        const interval = setInterval(() => {
            setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    return <span className="font-medium text-primary">{time || "Memuatkan..."}</span>;
};

export default function AdminClassesPage() {
    const PAGE_SIZE = 8;
    const [rows, setRows] = useState<ClassRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterGrade, setFilterGrade] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [addOpen, setAddOpen] = useState(false);

    const [editing, setEditing] = useState<ClassRow | null>(null);
    const [editName, setEditName] = useState("");
    const [editGrade, setEditGrade] = useState<number>(1);
    const [deleting, setDeleting] = useState<ClassRow | null>(null);

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
            const classesData = await res.json();
            
            // Fetch student counts for each class
            const studentsRes = await fetch("/api/admin/students");
            const studentsData = await studentsRes.json();
            const students = studentsData?.data ?? [];
            
            // Count students per class
            const studentCountMap: Record<string, number> = {};
            students.forEach((student: any) => {
                if (student.class_id) {
                    studentCountMap[student.class_id] = (studentCountMap[student.class_id] || 0) + 1;
                }
            });
            
            // Merge student counts into class data
            const classesWithCounts = (classesData ?? []).map((cls: any) => ({
                id: cls.id,
                name: cls.name,
                grade: cls.grade,
                studentCount: studentCountMap[cls.id] || 0,
            }));
            
            setRows(classesWithCounts);
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

    // Filtered rows based on search and grade filter
    const filteredRows = useMemo(() => {
        let filtered = rows;

        // Filter by grade
        if (filterGrade !== "all") {
            filtered = filtered.filter((row) => row.grade === parseInt(filterGrade));
        }

        // Filter by search query (class name)
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter((row) =>
                row.name.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [rows, filterGrade, searchQuery]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterGrade, searchQuery]);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, filteredRows.length]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
    const paginatedRows = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
    }, [currentPage, filteredRows]);

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

    const classTeacherOptions = useMemo(
        () => teachers.filter((teacher) => teacher.roles?.includes("class teacher")),
        [teachers]
    );

    // Grade color helper
    const getGradeColor = (grade: number) => {
        switch (grade) {
            case 1:
                return {
                    bg: "bg-emerald-100",
                    text: "text-emerald-700",
                    border: "border-emerald-200",
                };
            case 2:
                return {
                    bg: "bg-blue-100",
                    text: "text-blue-700",
                    border: "border-blue-200",
                };
            case 3:
                return {
                    bg: "bg-amber-100",
                    text: "text-amber-700",
                    border: "border-amber-200",
                };
            case 4:
                return {
                    bg: "bg-purple-100",
                    text: "text-purple-700",
                    border: "border-purple-200",
                };
            case 5:
                return {
                    bg: "bg-rose-100",
                    text: "text-rose-700",
                    border: "border-rose-200",
                };
            default:
                return {
                    bg: "bg-gray-100",
                    text: "text-gray-700",
                    border: "border-gray-200",
                };
        }
    };

    async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
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
            form.reset();
            setAddOpen(false);
            await fetchClasses();
            await fetchClassTeachers();
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

    async function handleDelete() {
        if (!deleting) return;
        const toastId = toast.loading("Memadam...");
        try {
            const res = await fetch(`/api/admin/classes?id=${deleting.id}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json?.message ?? "Gagal", { id: toastId });
                return;
            }
            toast.success("Dipadam", { id: toastId });
            setDeleting(null);
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

    // Helper to get teacher name
    const getTeacherName = (classId: string) => {
        const teacherId = classTeacherByClassId[classId];
        if (!teacherId) return "—";
        const teacher = teachers.find((t) => t.id === teacherId);
        return teacher?.name ?? "—";
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
                                <School className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    Pengurusan Kelas
                                </h1>
                                <p className="text-muted-foreground font-medium mt-1">
                                    Urus kelas mengikut tingkatan
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5" />
                                <span>Data Kelas Terkawal</span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-muted" />
                            <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Kemas kini: <LastUpdatedTime /></span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                fetchClasses();
                                fetchClassTeachers();
                            }}
                            disabled={loading}
                            className="border-border hover:bg-accent hover:text-accent-foreground shadow-xs"
                        >
                            {loading ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Muat Semula
                        </Button>

                        <Dialog open={addOpen} onOpenChange={setAddOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Tambah Kelas
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] rounded-2xl border-2 border-border/50 bg-card shadow-2xl">
                                <DialogHeader className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-primary/10">
                                            <Plus className="w-6 h-6 text-primary" />
                                        </div>
                                        <DialogTitle className="text-xl font-bold">Tambah Kelas Baru</DialogTitle>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Daftar kelas baharu mengikut tingkatan.
                                    </p>
                                </DialogHeader>
                                <form onSubmit={handleAdd} className="space-y-5">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <School className="w-4 h-4 text-primary" />
                                            <h3 className="font-semibold text-foreground">
                                                Maklumat Kelas
                                            </h3>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-1">
                                                Nama Kelas <span className="text-red-500">*</span>
                                            </Label>
                                            <Input name="class_name" placeholder="contoh: Ibnu Khaldun" required className="rounded-xl border-2 border-border/30 focus:border-primary/50 h-11" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-1">
                                                Tingkatan <span className="text-red-500">*</span>
                                            </Label>
                                            <Select name="grade" defaultValue="1">
                                                <SelectTrigger className="h-11 rounded-xl border-2 border-border/30 focus:border-primary/50">
                                                    <SelectValue placeholder="Pilih tingkatan" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-2 border-border">
                                                    {[1, 2, 3, 4, 5].map((grade) => (
                                                        <SelectItem key={grade} value={grade.toString()} className="rounded-lg">
                                                            Tingkatan {grade}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setAddOpen(false)}
                                            className="flex-1 rounded-xl border-2 border-border/30 h-11 hover:bg-muted/50"
                                        >
                                            Batal
                                        </Button>
                                        <Button type="submit" className="flex-1 rounded-xl h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/80 shadow-lg font-medium">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Simpan Kelas
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* MAIN CONTENT CARD */}
                <Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
                    <CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                                    <Filter className="w-5 h-5 text-primary" />
                                    Senarai Kelas
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Urus dan pantau semua kelas dalam sistem
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-medium">
                                    <Filter className="w-3 h-3 mr-1" />
                                    {filteredRows.length} kelas ditemui
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6">
                        {/* FILTER AND SEARCH SECTION */}
                        <div className="flex flex-col lg:flex-row gap-4 mb-6">
                            {/* SEARCH */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari kelas..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-11 rounded-lg border-border bg-background focus:border-primary focus:ring-primary/20"
                                />
                            </div>

                            {/* LEVEL FILTER + RESET */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="w-full sm:w-[200px]">
                                    <Select value={filterGrade} onValueChange={setFilterGrade}>
                                        <SelectTrigger className="h-11 rounded-lg border-border bg-background">
                                            <SelectValue placeholder="Pilih Tingkatan" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-lg border-border">
                                            <SelectItem value="all">
                                                <div className="flex items-center gap-2">
                                                    <School className="w-4 h-4" />
                                                    Semua Tingkatan
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="1">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    Tingkatan 1
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                    Tingkatan 2
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                                    Tingkatan 3
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                                                    Tingkatan 4
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                                                    Tingkatan 5
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setFilterGrade("all");
                                    }}
                                    className="h-11 rounded-lg border-border hover:bg-accent hover:text-accent-foreground"
                                >
                                    Reset
                                </Button>
                            </div>
                        </div>

                        {/* TABLE SECTION */}
                        <div className="rounded-lg border border-border overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="hover:bg-transparent border-b border-border">
                                            <TableHead className="font-semibold text-foreground py-4 w-16 text-center">
                                                #
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">
                                                Tingkatan
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">
                                                Nama Kelas
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4 text-center">
                                                Bil. Pelajar
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">
                                                Guru Kelas
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4 text-right pr-6">
                                                Tindakan
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="py-16">
                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <div className="relative">
                                                            <RefreshCw className="w-10 h-10 animate-spin text-primary" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="font-semibold text-foreground">Memuatkan data kelas...</p>
                                                            <p className="text-sm text-muted-foreground mt-1">Sila tunggu sebentar</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredRows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="py-16">
                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <div className="p-4 rounded-full bg-muted/50">
                                                            <School className="w-12 h-12 text-muted-foreground/50" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="font-semibold text-foreground">Tiada kelas dijumpai</p>
                                                            <p className="text-sm text-muted-foreground mt-1 max-w-md">
                                                                {searchQuery || filterGrade !== "all" 
                                                                    ? "Tiada kelas yang sepadan dengan carian anda"
                                                                    : "Mulakan dengan menambah kelas pertama"}
                                                            </p>
                                                        </div>
                                                        {!searchQuery && filterGrade === "all" && (
                                                            <Button
                                                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                                                onClick={() => setAddOpen(true)}
                                                            >
                                                                <Plus className="w-4 h-4 mr-2" />
                                                                Tambah Kelas Pertama
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedRows.map((classItem, index) => {
                                                const gradeColors = getGradeColor(classItem.grade);
                                                const displayIndex = (currentPage - 1) * PAGE_SIZE + index + 1;
                                                
                                                return (
                                                    <TableRow
                                                        key={classItem.id}
                                                        className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group"
                                                    >
                                                        <TableCell
                                                            className="py-4 text-center cursor-pointer"
                                                            onClick={() => {
                                                                setAssigning(classItem);
                                                                setSelectedTeacherId(
                                                                    classTeacherByClassId[classItem.id] ?? ""
                                                                );
                                                            }}
                                                        >
                                                            <div className="font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                                                {displayIndex}
                                                            </div>
                                                        </TableCell>
                                                        
                                                        <TableCell className="py-4">
                                                            <Badge
                                                                className={`px-3 py-1.5 rounded-md font-medium border
                                                                    ${gradeColors.bg}
                                                                    ${gradeColors.text}
                                                                    ${gradeColors.border}`}
                                                            >
                                                                Tingkatan {classItem.grade}
                                                            </Badge>
                                                        </TableCell>
                                                        
                                                        <TableCell
                                                            className="py-4 cursor-pointer"
                                                            onClick={() => {
                                                                setAssigning(classItem);
                                                                setSelectedTeacherId(
                                                                    classTeacherByClassId[classItem.id] ?? ""
                                                                );
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
                                                                    <span className="font-semibold text-primary text-sm">
                                                                        {classItem.name.charAt(0)}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                                        {classItem.name}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        
                                                        <TableCell className="py-4 text-center">
                                                            <Badge 
                                                                variant="secondary"
                                                                className={`px-3 py-1.5 font-semibold ${
                                                                    classItem.studentCount > 0 
                                                                        ? "bg-cyan-100 text-indigo-700 border border-cyan-200" 
                                                                        : "bg-gray-100 text-gray-500"
                                                                }`}
                                                            >
                                                                <Users className="w-3 h-3 mr-1" />
                                                                {classItem.studentCount} pelajar
                                                            </Badge>
                                                        </TableCell>
                                                        
                                                        <TableCell className="py-4">
                                                            {classTeacherByClassId[classItem.id] ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shadow-sm border border-blue-200">
                                                                        <span className="text-blue-600 font-semibold text-sm">
                                                                            {getTeacherName(classItem.id).charAt(0)}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium text-foreground">
                                                                            {getTeacherName(classItem.id)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border border-dashed border-gray-300">
                                                                        <UserPlus className="w-4 h-4 text-gray-400" />
                                                                    </div>
                                                                    <span className="italic text-sm">Belum dilantik</span>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        
                                                        <TableCell className="py-4 text-right pr-6">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="h-8 w-8 text-primary"
                                                                    onClick={() => {
                                                                        setAssigning(classItem);
                                                                        setSelectedTeacherId(
                                                                            classTeacherByClassId[classItem.id] ?? ""
                                                                        );
                                                                    }}
                                                                    title={
                                                                        classTeacherByClassId[classItem.id]
                                                                            ? "Tukar guru kelas"
                                                                            : "Lantik guru kelas"
                                                                    }
                                                                    aria-label={
                                                                        classTeacherByClassId[classItem.id]
                                                                            ? "Tukar guru kelas"
                                                                            : "Lantik guru kelas"
                                                                    }
                                                                >
                                                                    <UserPlus className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="h-8 w-8 text-blue-600"
                                                                    onClick={() => {
                                                                        setEditing(classItem);
                                                                        setEditName(classItem.name);
                                                                        setEditGrade(classItem.grade);
                                                                    }}
                                                                    title="Kemaskini kelas"
                                                                    aria-label="Kemaskini kelas"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="h-8 w-8 text-rose-600"
                                                                    onClick={() => setDeleting(classItem)}
                                                                    title="Padam kelas"
                                                                    aria-label="Padam kelas"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </CardContent>

                    {/* FOOTER */}
                    <div className="border-t border-border bg-muted/20 px-6 py-4">
                        <div className="flex flex-col gap-4 text-sm">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-foreground">{filteredRows.length}</span>
                                        <span>daripada</span>
                                        <span className="font-semibold text-foreground">{rows.length}</span>
                                        <span>kelas dipaparkan</span>
                                    </div>
                                    {filterGrade !== "all" && (
                                        <Badge variant="secondary" className="ml-2">
                                            Tingkatan {filterGrade}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                        <span>Kemas kini: <LastUpdatedTime /></span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            fetchClasses();
                                            fetchClassTeachers();
                                        }}
                                        disabled={loading}
                                        className="h-8"
                                    >
                                        {loading && <RefreshCw className="w-3 h-3 mr-2 animate-spin" />}
                                        Muat Semula Data
                                    </Button>
                                </div>
                            </div>

                            {!loading && totalPages > 1 && (
                                <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
                                    <div className="text-sm text-muted-foreground">
                                        Menunjukkan {(currentPage - 1) * PAGE_SIZE + 1}
                                        {" - "}
                                        {Math.min(currentPage * PAGE_SIZE, filteredRows.length)} daripada {filteredRows.length} kelas
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

                                            {paginationItems.map((item, idx) => {
                                                if (typeof item !== "number") {
                                                    return (
                                                        <PaginationItem key={`${item}-${idx}`}>
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
                    </div>
                </Card>

                {/* FOOTER NOTES */}
                <div className="text-center pt-6">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-card/50 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
                        <Shield className="w-4 h-4" />
                        <span>Sistem Pengurusan Kelas v2.0 • Data kelas terkawal sepenuhnya</span>
                    </div>
                </div>
            </div>

            {/* EDIT DIALOG */}
            <Dialog open={Boolean(editing)} onOpenChange={() => setEditing(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-bold">
                            <Edit className="w-5 h-5 text-primary" />
                            Kemaskini Kelas
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1">
                                    <School className="w-3.5 h-3.5" /> Nama Kelas
                                </Label>
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1">
                                    <Filter className="w-3.5 h-3.5" /> Tingkatan
                                </Label>
                                <Select value={editGrade.toString()} onValueChange={(v) => setEditGrade(Number(v))}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5].map((g) => (
                                            <SelectItem key={g} value={g.toString()}>
                                                Tingkatan {g}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditing(null)}>
                            Batal
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={!editName} className="bg-primary px-8">
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DELETE CONFIRMATION */}
            <Dialog open={Boolean(deleting)} onOpenChange={() => setDeleting(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive font-bold">Padam Kelas?</DialogTitle>
                    </DialogHeader>
                    <p>
                        Padam rekod <strong>{deleting?.name}</strong>?
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleting(null)}>
                            Batal
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Ya, Padam
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ASSIGN TEACHER DIALOG */}
            <Dialog
                open={Boolean(assigning)}
                onOpenChange={(open) => {
                    if (!open) {
                        setAssigning(null);
                        setSelectedTeacherId("");
                    }
                }}
            >
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-bold">
                            <UserPlus className="w-5 h-5 text-primary" />
                            Lantik Guru Kelas
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-5 py-4">
            <div className="space-y-4">
                {/* Info Box - Meniru gaya input readonly/badge dalam form */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1 text-muted-foreground">
                            <School className="w-3.5 h-3.5" /> Nama Kelas
                        </Label>
                        <div className="h-11 px-3 flex items-center rounded-md border border-border bg-muted/30 font-medium">
                            {assigning?.name}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1 text-muted-foreground">
                            <Filter  className="w-3.5 h-3.5" /> Tingkatan
                        </Label>
                        <div className="h-11 px-3 flex items-center rounded-md border border-border bg-muted/30 font-medium">
                            Tingkatan {assigning?.grade}
                        </div>
                    </div>
                </div>

                {/* Pemilihan Guru */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5" /> Pilih Guru Kelas <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        value={selectedTeacherId}
                        onValueChange={setSelectedTeacherId}
                    >
                        <SelectTrigger className="h-11 border-border">
                            <SelectValue placeholder="Pilih guru kelas" />
                        </SelectTrigger>
                        <SelectContent>
                            {classTeacherOptions.length === 0 ? (
                                <SelectItem value="none" disabled>Tiada guru kelas ditemui</SelectItem>
                            ) : (
                                classTeacherOptions.map((t) => {
                                    const assignedTeacherIds = new Set(Object.values(classTeacherByClassId));
                                    const currentTeacherForClass = assigning?.id ? classTeacherByClassId[assigning.id] : "";
                                    const disabled = assignedTeacherIds.has(t.id) && t.id !== currentTeacherForClass;

                                    return (
                                        <SelectItem key={t.id} value={t.id} disabled={disabled}>
                                            {t.name} {disabled ? "— Sudah Ada Kelas" : ""}
                                        </SelectItem>
                                    );
                                })
                            )}
                        </SelectContent>
                    </Select>
                </div>
                           {/* Note Box - Selaras dengan nota di Edit Student */}
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg mt-2">
                    <p className="text-[11px] text-amber-700 leading-relaxed italic">
                        <strong>Nota:</strong> Seorang guru hanya boleh memegang tanggungjawab untuk <strong>satu (1) kelas</strong> sahaja pada satu masa.
                    </p>
                </div>
            </div>

        </div>
        <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    {assigning?.id && classTeacherByClassId[assigning.id] && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleRemoveClassTeacher}
                        >
                            <UserMinus className="w-4 h-4 mr-2" />
                            Buang Lantikan
                        </Button>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAssigning(null)}
                    >
                        Batal
                    </Button>
                    <Button
                        onClick={handleAssignClassTeacher}
                        disabled={!selectedTeacherId}
                        className="bg-primary px-8"
                    >
                        Simpan
                    </Button>
                </div>
            </div>
        </DialogFooter>
    </DialogContent>
</Dialog>
        </div>
    );
}
