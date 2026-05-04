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
import { 
    Plus, Trash2, Edit, UserPlus, UserMinus, Search, RefreshCw, 
    BookOpen, Users, Clock, Shield, Filter, X, Loader2, SortAsc, SortDesc
} from "lucide-react";

type SubjectRow = {
    id: string;
    name: string;
    coordinator: { id: string; name: string } | null;
};

type TeacherRow = {
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

export default function AdminSubjectsPage() {
    const PAGE_SIZE = 8;
    const [rows, setRows] = useState<SubjectRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [addOpen, setAddOpen] = useState(false);

    const [editing, setEditing] = useState<SubjectRow | null>(null);
    const [editName, setEditName] = useState("");
    const [deleting, setDeleting] = useState<SubjectRow | null>(null);

    const [teachers, setTeachers] = useState<TeacherRow[]>([]);
    const [assigning, setAssigning] = useState<SubjectRow | null>(null);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
    const [assignLoading, setAssignLoading] = useState(false);

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
            const list = Array.isArray(data) ? data : [];
            
            const options: TeacherRow[] = [];
            for (const item of list) {
                if (!item || typeof item !== "object") continue;
                const id = String((item as { id?: unknown }).id ?? "").trim();
                const name = String((item as { name?: unknown }).name ?? "").trim();
                const rolesRaw = (item as { roles?: unknown }).roles;
                const roles = Array.isArray(rolesRaw)
                    ? rolesRaw.map((role) => String(role))
                    : [];
                if (!id || !name) continue;
                options.push({
                    id,
                    name,
                    identifier: (item as { identifier?: unknown }).identifier as string | undefined,
                    roles,
                });
            }
            setTeachers(options);
        } catch {
            setTeachers([]);
        }
    }

    useEffect(() => {
        fetchSubjects();
        fetchTeachers();
    }, []);

    // Filtered rows based on search
    const filteredRows = useMemo(() => {
        let filtered = rows;
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter((row) =>
                row.name.toLowerCase().includes(query)
            );
        }
        return [...filtered].sort((a, b) =>
            sortOrder === "asc"
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name)
        );
    }, [rows, searchQuery, sortOrder]);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, sortOrder]);

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

    // Stats for cards
    const stats = {
        total: rows.length,
        withCoordinator: rows.filter(r => r.coordinator !== null).length,
        withoutCoordinator: rows.filter(r => r.coordinator === null).length,
    };

    const coordinatorOptions = useMemo(
        () => teachers.filter((teacher) => teacher.roles?.includes("subject coordinator")),
        [teachers]
    );

async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
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

        if (res.ok) {
            toast.success("Subjek berjaya ditambah", { id: toastId });
            form.reset();
            setAddOpen(false);
            // PENTING: Gunakan router.refresh() atau fetchSubjects() 
            // untuk sync semula data UI dengan DB
            await fetchSubjects(); 
            } else {
            toast.error(json?.message ?? "Gagal", { id: toastId });
        }
    } catch (err) {
        // Jika data masuk DB tapi tetap masuk sini, 
        // maknanya ralat berlaku semasa proses 'update UI'
        toast.error("Ralat komunikasi pelayar", { id: toastId });
        console.error(err);
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

    async function handleDelete() {
        if (!deleting) return;
        const toastId = toast.loading("Memadam...");
        try {
            const res = await fetch(`/api/admin/subjects?id=${deleting.id}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json?.message ?? "Gagal", { id: toastId });
                return;
            }
            toast.success("Dipadam", { id: toastId });
            setDeleting(null);
            fetchSubjects();
        } catch {
            toast.error("Ralat sistem", { id: toastId });
        }
    }

    async function handleAssignCoordinator() {
        if (!assigning || !selectedTeacherId) return;
        
        setAssignLoading(true);
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
            
            const teacherName = teachers.find(t => t.id === selectedTeacherId)?.name;
            toast.success(`${teacherName} telah dilantik sebagai penyelaras untuk subjek ${assigning.name}`, { 
                id: toastId,
            });
            
            setAssigning(null);
            setSelectedTeacherId("");
            fetchSubjects();
        } catch {
            toast.error("Ralat sistem", { id: toastId });
        } finally {
            setAssignLoading(false);
        }
    }

    async function handleRemoveCoordinator() {
    if (!assigning) return;
    const toastId = toast.loading("Membuang penyelaras...");
    try {
        const res = await fetch(
            `/api/admin/subject-coordinator?subject_id=${assigning.id}`,
            { method: "DELETE" }
        );
        const json = await res.json();
        if (!res.ok) {
            toast.error(json?.error ?? "Gagal", { id: toastId });
            return;
        }
        toast.success("Lantikan penyelaras dibuang", { id: toastId });
        setAssigning(null);
        setSelectedTeacherId("");
        fetchSubjects(); // Refresh senarai subjek
    } catch {
        toast.error("Ralat sistem", { id: toastId });
    }
}

    const getCoordinatorName = (coordinator: { id: string; name: string } | null) => {
        if (!coordinator) return "—";
        return coordinator.name;
    };

    const getAssignedCoordinator = (subject: SubjectRow) => {
        return subject.coordinator;
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
                                <BookOpen className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    Pengurusan Subjek
                                </h1>
                                <p className="text-muted-foreground font-medium mt-1">
                                    Urus senarai subjek dan penyelaras
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5" />
                                <span>Data Subjek Terkawal</span>
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
                            onClick={fetchSubjects}
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
                                    Tambah Subjek
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] rounded-2xl border-2 border-border/50 bg-card shadow-2xl">
                                <DialogHeader className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-primary/10">
                                            <Plus className="w-6 h-6 text-primary" />
                                        </div>
                                        <DialogTitle className="text-xl font-bold">Daftar Subjek Baharu</DialogTitle>
                                    </div>
                                </DialogHeader>
                                <form onSubmit={handleAdd} className="space-y-5">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <BookOpen className="w-4 h-4 text-primary" />
                                            <h3 className="font-semibold text-foreground">
                                                Maklumat Subjek
                                            </h3>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-1">
                                                <p> Nama Subjek </p><span className="text-red-500">*</span>
                                            </Label>
                                            <Input name="subject_name" placeholder="contoh: Biologi, Matematik, Sejarah" required className="rounded-xl border-2 border-border/30 focus:border-primary/50 h-11" />
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
                                            Simpan Subjek
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
                                    Senarai Subjek
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Urus dan pantau semua subjek dalam sistem
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-medium">
                                    <Filter className="w-3 h-3 mr-1" />
                                    {filteredRows.length} subjek ditemui
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6">
                        {/* SEARCH SECTION */}
                        <div className="flex flex-col lg:flex-row gap-4 mb-6">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari subjek..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-11 rounded-lg border-border bg-background focus:border-primary focus:ring-primary/20"
                                />
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearchQuery("");
                                    setSortOrder("asc");
                                }}
                                className="h-11 rounded-lg border-border hover:bg-accent hover:text-accent-foreground"
                            >
                                Reset
                            </Button>
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
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSortOrder((order) => order === "asc" ? "desc" : "asc")}
                                                    className="p-0 h-auto font-semibold hover:bg-transparent"
                                                >
                                                    Nama Subjek
                                                    {sortOrder === "asc" ? (
                                                        <SortAsc className="w-3.5 h-3.5 ml-1" />
                                                    ) : (
                                                        <SortDesc className="w-3.5 h-3.5 ml-1" />
                                                    )}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">
                                                Penyelaras Subjek
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4 text-right pr-6">
                                                Tindakan
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="py-16">
                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <RefreshCw className="w-10 h-10 animate-spin text-primary" />
                                                        <div className="text-center">
                                                            <p className="font-semibold text-foreground">Memuatkan data subjek...</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredRows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="py-16">
                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <BookOpen className="w-12 h-12 text-muted-foreground/50" />
                                                        <div className="text-center">
                                                            <p className="font-semibold text-foreground">Tiada subjek dijumpai</p>
                                                            <p className="text-sm text-muted-foreground mt-1 max-w-md">
                                                                {searchQuery 
                                                                    ? "Tiada subjek yang sepadan dengan carian anda"
                                                                    : "Mulakan dengan menambah subjek pertama"}
                                                            </p>
                                                        </div>
                                                        {!searchQuery && (
                                                            <Button
                                                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                                                onClick={() => setAddOpen(true)}
                                                            >
                                                                <Plus className="w-4 h-4 mr-2" />
                                                                Tambah Subjek Pertama
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedRows.map((subject, index) => {
                                                const displayIndex = (currentPage - 1) * PAGE_SIZE + index + 1;
                                                const coordinator = getAssignedCoordinator(subject);
                                                
                                                return (
                                                    <TableRow
                                                        key={subject.id}
                                                        className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group"
                                                    >
                                                        <TableCell
                                                            className="py-4 text-center cursor-pointer"
                                                            onClick={() => {
                                                                setAssigning(subject);
                                                                setSelectedTeacherId(subject.coordinator?.id ?? "");
                                                            }}
                                                        >
                                                            <div className="font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                                                {displayIndex}
                                                            </div>
                                                        </TableCell>
                                                        
                                                        <TableCell
                                                            className="py-4 cursor-pointer"
                                                            onClick={() => {
                                                                setAssigning(subject);
                                                                setSelectedTeacherId(subject.coordinator?.id ?? "");
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
                                                                    <span className="font-semibold text-primary text-sm">
                                                                        {subject.name.charAt(0)}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                                        {subject.name}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        
                                                        <TableCell className="py-4">
                                                            {coordinator ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                                        <span className="text-blue-600 font-semibold text-sm">
                                                                            {coordinator.name.charAt(0)}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium text-foreground">
                                                                            {coordinator.name}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                                    <UserPlus className="w-4 h-4" />
                                                                    <span className="italic">Belum dilantik</span>
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
                                                                        setAssigning(subject);
                                                                        setSelectedTeacherId(subject.coordinator?.id ?? "");
                                                                    }}
                                                                    title={subject.coordinator ? "Tukar penyelaras" : "Lantik penyelaras"}
                                                                    aria-label={subject.coordinator ? "Tukar penyelaras" : "Lantik penyelaras"}
                                                                >
                                                                    <UserPlus className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="h-8 w-8 text-blue-600"
                                                                    onClick={() => {
                                                                        setEditing(subject);
                                                                        setEditName(subject.name);
                                                                    }}
                                                                    title="Kemaskini subjek"
                                                                    aria-label="Kemaskini subjek"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="h-8 w-8 text-rose-600"
                                                                    onClick={() => setDeleting(subject)}
                                                                    title="Padam subjek"
                                                                    aria-label="Padam subjek"
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
                                        <span>subjek dipaparkan</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                        <span>Kemas kini: <LastUpdatedTime /></span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={fetchSubjects}
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
                                        {Math.min(currentPage * PAGE_SIZE, filteredRows.length)} daripada {filteredRows.length} subjek
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
                                                    className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
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
                                                        setCurrentPage((page) => Math.min(totalPages, page + 1));
                                                    }}
                                                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
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
                        <span>Sistem Pengurusan Subjek v2.0 • Data subjek terkawal sepenuhnya</span>
                    </div>
                </div>
            </div>

            {/* EDIT DIALOG */}
            <Dialog open={Boolean(editing)} onOpenChange={() => setEditing(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-bold">
                            <Edit className="w-5 h-5 text-primary" />
                            Kemaskini Subjek
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1">
                                    <BookOpen className="w-3.5 h-3.5" /> Nama Subjek
                                </Label>
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="h-11"
                                />
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
                        <DialogTitle className="text-destructive font-bold">Padam Subjek?</DialogTitle>
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

            {/* ASSIGN COORDINATOR DIALOG - Styled like classes page */}
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
                Lantik Penyelaras Subjek
            </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
            <div className="space-y-4">
                {/* Info Box - Meniru gaya input readonly dalam classes page */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-muted-foreground">
                        <BookOpen className="w-3.5 h-3.5" /> Nama Subjek
                    </Label>
                    <div className="h-11 px-3 flex items-center rounded-md border border-border bg-muted/30 font-medium">
                        {assigning?.name}
                    </div>
                </div>

                {/* Pemilihan Guru */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5" /> Pilih Guru Penyelaras <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        value={selectedTeacherId}
                        onValueChange={setSelectedTeacherId}
                        disabled={assignLoading}
                    >
                        <SelectTrigger className="h-11 border-border">
                            <SelectValue placeholder="Pilih guru penyelaras" />
                        </SelectTrigger>
                        <SelectContent>
                            {coordinatorOptions.length === 0 ? (
                                <SelectItem value="none" disabled>Tiada penyelaras subjek ditemui</SelectItem>
                            ) : (
                                coordinatorOptions.map((t) => {
                                    const assignedCoordinatorIds = new Set(
                                        rows
                                            .map((subject) => subject.coordinator?.id)
                                            .filter(Boolean)
                                    );
                                    const currentCoordinatorForSubject = assigning?.coordinator?.id ?? "";
                                    const disabled =
                                        assignedCoordinatorIds.has(t.id) &&
                                        t.id !== currentCoordinatorForSubject;

                                    return (
                                        <SelectItem key={t.id} value={t.id} disabled={disabled}>
                                            {t.name} {disabled ? "- Sudah Ada Subjek" : ""}
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
                        <strong>Nota:</strong> Penyelaras subjek bertanggungjawab untuk menguruskan kurikulum dan laporan bagi subjek <strong>{assigning?.name}</strong>.
                    </p>
                </div>
            </div>

        </div>
        <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    {assigning?.coordinator && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleRemoveCoordinator}
                            disabled={assignLoading}
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
                        disabled={assignLoading}
                    >
                        Batal
                    </Button>
                    <Button
                        onClick={handleAssignCoordinator}
                        disabled={!selectedTeacherId || assignLoading}
                        className="bg-primary px-8"
                    >
                        {assignLoading ? "Menyimpan..." : "Simpan"}
                    </Button>
                </div>
            </div>
        </DialogFooter>
    </DialogContent>
</Dialog>
        </div>
    );
}
