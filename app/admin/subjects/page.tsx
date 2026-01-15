"use client";

import { useEffect, useState } from "react";
import {
    Pencil,
    Trash2,
    BookOpen,
    Plus,
    Search,
    RefreshCw,
    Loader2,
    Shield,
    Clock,
    Filter,
    SortAsc,
    SortDesc,
    Eye,
    UserCheck,
} from "lucide-react";

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

import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SubjectItem } from "@/app/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

/* ✅ Client-side only time component */
const LastUpdatedTime = () => {
    const [time, setTime] = useState<string>("");

    useEffect(() => {
        setTime(
            new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            })
        );
        const interval = setInterval(() => {
            setTime(
                new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                })
            );
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <span className="font-medium text-primary">{time || "Loading..."}</span>
    );
};

type CoordinatorTeacher = {
    id: string; // ✅ from API
    name: string; // ✅ from API
    email?: string | null;
    roles?: string[];
};

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);
    const [loading, setLoading] = useState(false);

    const [editing, setEditing] = useState<SubjectItem | null>(null);
    const [deleting, setDeleting] = useState<SubjectItem | null>(null);

    // ✅ Subject Details Modal
    const [detailsSubject, setDetailsSubject] = useState<SubjectItem | null>(
        null
    );

    // ✅ Coordinator list
    const [coordinatorTeachers, setCoordinatorTeachers] = useState<
        CoordinatorTeacher[]
    >([]);
    const [loadingTeachers, setLoadingTeachers] = useState(false);

    // ✅ Selected coordinator teacher_id
    const [selectedCoordinatorId, setSelectedCoordinatorId] =
        useState<string>("");

    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "studentCount">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const [stats, setStats] = useState({
        totalSubjects: 0,
        activeSubjects: 0,
        averageClasses: 0,
        completionRate: 85,
    });

    // ================= FETCH SUBJECTS =================
    async function fetchSubjects() {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/subjects");
            const data = await res.json();

            console.group("📦 FETCH SUBJECTS RESPONSE");
            console.log("Raw API data:", data);
            data.forEach((s: any, i: number) => {
                console.log(`Subject[${i}]`, {
                    id: s.id,
                    name: s.name,
                    coordinator: s.coordinator,
                });
            });
            console.groupEnd();

            setSubjects(data);
        } catch (err) {
            console.error("❌ FETCH SUBJECTS ERROR:", err);
            toast.error("Gagal memuatkan senarai subjek");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchSubjects();
    }, []);

    // ================= FILTER AND SORT =================
    const filteredSubjects = subjects
        .filter((subject) =>
            subject.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            let compareA: any, compareB: any;

            if (sortBy === "name") {
                compareA = a.name.toLowerCase();
                compareB = b.name.toLowerCase();
            } else {
                compareA = (a as any).studentCount || 0;
                compareB = (b as any).studentCount || 0;
            }

            if (sortOrder === "asc") return compareA > compareB ? 1 : -1;
            return compareA < compareB ? 1 : -1;
        });

    // ================= TOGGLE SORT =================
    const toggleSort = (field: "name" | "studentCount") => {
        if (sortBy === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortOrder("asc");
        }
    };

    // ================= ADD SUBJECT =================
    async function handleAddSubject(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const subjectName = formData.get("subject_name") as string;

        try {
            const res = await fetch("/api/admin/subjects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject_name: subjectName }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Gagal menambah subjek");
                setLoading(false);
                return;
            }

            toast.success("Subjek berjaya ditambah", {
                description: `Subjek "${subjectName}" telah ditambah ke dalam sistem`,
            });

            fetchSubjects();
            (
                document.getElementById("close-add-dialog") as HTMLButtonElement
            )?.click();
        } catch {
            toast.error("Ralat sistem. Sila cuba lagi.");
        } finally {
            setLoading(false);
        }
    }

    // ================= EDIT SUBJECT =================
    async function handleEditSubject(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!editing) return;

        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const subjectName = formData.get("subject_name") as string;

        try {
            const res = await fetch("/api/admin/subjects", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject_id: editing.id,
                    subject_name: subjectName,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Gagal mengemas kini subjek");
                setLoading(false);
                return;
            }

            toast.success("Subjek berjaya dikemas kini", {
                description: `Subjek telah dikemas kini kepada "${subjectName}"`,
            });

            setEditing(null);
            fetchSubjects();
        } catch {
            toast.error("Ralat sistem. Sila cuba lagi.");
        } finally {
            setLoading(false);
        }
    }

    // ================= DELETE SUBJECT =================
    async function handleDeleteSubject() {
        if (!deleting) return;
        setLoading(true);

        try {
            const res = await fetch(`/api/admin/subjects?id=${deleting.id}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Gagal memadam subjek");
                setLoading(false);
                return;
            }

            toast.success("Subjek berjaya dipadam", {
                description: `Subjek "${deleting.name}" telah dipadam dari sistem`,
            });

            setDeleting(null);
            fetchSubjects();
        } catch {
            toast.error("Ralat sistem. Sila cuba lagi.");
        } finally {
            setLoading(false);
        }
    }

    // ================= FETCH COORDINATOR TEACHERS =================
    async function fetchCoordinatorTeachers() {
        setLoadingTeachers(true);
        try {
            const res = await fetch(
                "/api/admin/users?role=subject coordinator"
            );
            const data = await res.json();

            console.group("👨‍🏫 FETCH COORDINATOR TEACHERS");
            console.log("Raw teachers:", data);

            const formattedTeachers = data.map((t: any) => ({
                id: t.teacher_id || t.id,
                name: t.fullname || t.name,
            }));

            console.log("Formatted teachers:", formattedTeachers);
            console.groupEnd();

            setCoordinatorTeachers(formattedTeachers);
        } catch (error) {
            console.error("❌ Error fetching teachers:", error);
            toast.error("Gagal memuatkan guru penyelaras");
        } finally {
            setLoadingTeachers(false);
        }
    }

    // ================= OPEN DETAILS MODAL =================
    function openDetails(subject: SubjectItem) {
        console.group("👁️ OPEN DETAILS");
        console.log("Subject clicked:", subject);
        console.log("Coordinator from subject:", subject.coordinator);

        const currentCoordinatorId = subject.coordinator?.id ?? "";
        console.log("Resolved coordinator ID:", currentCoordinatorId);

        setDetailsSubject(subject);
        setSelectedCoordinatorId(currentCoordinatorId);

        if (subject.coordinator) {
            setCoordinatorTeachers([
                {
                    id: subject.coordinator.id,
                    name: subject.coordinator.name,
                },
            ]);
        } else {
            setCoordinatorTeachers([]);
        }

        console.log("Prefilled coordinatorTeachers:", subject.coordinator);
        console.groupEnd();

        fetchCoordinatorTeachers();
    }

    // ================= APPOINT COORDINATOR =================
    async function handleAppointCoordinator() {
        if (!detailsSubject) return;

        if (!selectedCoordinatorId) {
            toast.error("Sila pilih guru penyelaras subjek");
            return;
        }

        try {
            const res = await fetch("/api/admin/subject-coordinator", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject_id: detailsSubject.id,
                    teacher_id: selectedCoordinatorId,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data?.error || "Gagal lantik penyelaras");
                return;
            }

            toast.success("Penyelaras berjaya dilantik ✅");
            setDetailsSubject(null);
            fetchSubjects();
        } catch {
            toast.error("Ralat sistem. Sila cuba lagi");
        }
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
                                <BookOpen className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground">
                                    Pengurusan Subjek
                                </h1>
                                <p className="text-muted-foreground font-medium mt-1">
                                    Urus dan pantau semua subjek dalam sistem
                                    pengurusan sekolah
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5" />
                                <span>Data Terurus</span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-muted" />
                            <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>
                                    Kemas kini: <LastUpdatedTime />
                                </span>
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
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Refresh
                        </Button>

                        {/* ADD SUBJECT */}
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Tambah Subjek
                                </Button>
                            </DialogTrigger>

                            <DialogContent className="rounded-lg border-border">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-semibold">
                                        Tambah Subjek Baharu
                                    </DialogTitle>
                                    <DialogDescription className="text-muted-foreground">
                                        Masukkan nama subjek untuk menambah
                                        subjek baharu dalam sistem.
                                    </DialogDescription>
                                </DialogHeader>

                                <form
                                    onSubmit={handleAddSubject}
                                    className="space-y-4 pt-4"
                                >
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="subject_name"
                                            className="font-medium"
                                        >
                                            Nama Subjek
                                        </Label>
                                        <Input
                                            id="subject_name"
                                            name="subject_name"
                                            placeholder="Contoh: Matematik"
                                            className="border-border focus:border-primary"
                                            required
                                        />
                                    </div>

                                    <DialogFooter className="pt-4">
                                        <Button
                                            id="close-add-dialog"
                                            type="button"
                                            variant="outline"
                                            className="border-border hover:bg-accent"
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="bg-primary hover:bg-primary/90"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Menyimpan...
                                                </>
                                            ) : (
                                                "Simpan"
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* CARD */}
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

                            <Badge
                                variant="outline"
                                className="border-primary/30 bg-primary/5 text-primary font-medium"
                            >
                                {filteredSubjects.length} subjek ditemui
                            </Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6">
                        {/* SEARCH */}
                        <div className="mb-6">
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari subjek..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="pl-10 h-11 rounded-lg border-border bg-background focus:border-primary focus:ring-primary/20"
                                />
                            </div>
                        </div>

                        {/* TABLE */}
                        <div className="rounded-lg border border-border overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="hover:bg-transparent border-b border-border">
                                            <TableHead className="w-16 text-center">
                                                #
                                            </TableHead>
                                            <TableHead>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        toggleSort("name")
                                                    }
                                                    className="p-0 h-auto font-semibold hover:bg-transparent"
                                                >
                                                    Nama Subjek
                                                    {sortBy === "name" &&
                                                        (sortOrder === "asc" ? (
                                                            <SortAsc className="w-3.5 h-3.5 ml-1" />
                                                        ) : (
                                                            <SortDesc className="w-3.5 h-3.5 ml-1" />
                                                        ))}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Tindakan
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={3}
                                                    className="py-16 text-center"
                                                >
                                                    <Loader2 className="w-8 h-8 animate-spin text-primary inline" />
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredSubjects.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={3}
                                                    className="py-16 text-center"
                                                >
                                                    Tiada subjek dijumpai
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredSubjects.map(
                                                (subject, index) => (
                                                    <TableRow
                                                        key={subject.id}
                                                        className="hover:bg-muted/50"
                                                    >
                                                        <TableCell className="text-center">
                                                            {index + 1}
                                                        </TableCell>

                                                        <TableCell className="font-semibold">
                                                            {subject.name}
                                                        </TableCell>

                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        openDetails(
                                                                            subject
                                                                        )
                                                                    }
                                                                    className="h-8 w-8 p-0"
                                                                    title="Details"
                                                                >
                                                                    <Eye className="h-3.5 w-3.5" />
                                                                </Button>

                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        setEditing(
                                                                            subject
                                                                        )
                                                                    }
                                                                    className="h-8 w-8 p-0"
                                                                >
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </Button>

                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() =>
                                                                        setDeleting(
                                                                            subject
                                                                        )
                                                                    }
                                                                    className="h-8 w-8 p-0"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            )
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* DETAILS MODAL */}
                <Dialog
                    open={!!detailsSubject}
                    onOpenChange={() => setDetailsSubject(null)}
                >
                    <DialogContent className="rounded-xl max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-primary" />
                                Maklumat Subjek
                            </DialogTitle>
                            <DialogDescription>
                                Lantik guru penyelaras untuk subjek ini.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="rounded-lg border border-border p-4">
                                <p className="text-xs text-muted-foreground">
                                    Nama Subjek
                                </p>
                                <p className="font-semibold text-foreground">
                                    {detailsSubject?.name}
                                </p>
                            </div>

                            {/* COORDINATOR SELECT */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    Guru Penyelaras Subjek
                                </Label>

                                <Select
                                    value={selectedCoordinatorId}
                                    onValueChange={setSelectedCoordinatorId}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={
                                                loadingTeachers
                                                    ? "Memuatkan guru..."
                                                    : "Pilih guru penyelaras..."
                                            }
                                        />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {loadingTeachers ? (
                                            <SelectItem
                                                key="loading-item"
                                                value="__loading__"
                                                disabled
                                            >
                                                Memuatkan...
                                            </SelectItem>
                                        ) : coordinatorTeachers.length === 0 ? (
                                            <SelectItem
                                                key="empty-item"
                                                value="__empty__"
                                                disabled
                                            >
                                                Tiada guru penyelaras dijumpai
                                            </SelectItem>
                                        ) : (
                                            coordinatorTeachers.map((t) => (
                                                <SelectItem
                                                    key={t.id}
                                                    value={t.id}
                                                >
                                                    {t.name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>

                                <p className="text-xs text-muted-foreground">
                                    Hanya guru dengan role{" "}
                                    <b>subject coordinator</b> dipaparkan.
                                </p>
                            </div>
                        </div>

                        <DialogFooter className="mt-6 flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setDetailsSubject(null)}
                            >
                                Tutup
                            </Button>

                            <Button
                                onClick={handleAppointCoordinator}
                                className="gap-2"
                            >
                                <UserCheck className="w-4 h-4" />
                                Lantik Penyelaras
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* EDIT DIALOG */}
                <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
                    <DialogContent className="rounded-lg border-border">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-semibold">
                                Kemas Kini Subjek
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Kemas kini maklumat subjek yang dipilih.
                            </DialogDescription>
                        </DialogHeader>

                        <form
                            onSubmit={handleEditSubject}
                            className="space-y-4 pt-4"
                        >
                            <div className="space-y-2">
                                <Label
                                    htmlFor="edit_subject_name"
                                    className="font-medium"
                                >
                                    Nama Subjek
                                </Label>
                                <Input
                                    id="edit_subject_name"
                                    name="subject_name"
                                    defaultValue={editing?.name}
                                    placeholder="Masukkan nama subjek"
                                    className="border-border focus:border-primary"
                                    required
                                />
                            </div>

                            <DialogFooter className="pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setEditing(null)}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading
                                        ? "Menyimpan..."
                                        : "Simpan Perubahan"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* DELETE DIALOG */}
                <Dialog
                    open={!!deleting}
                    onOpenChange={() => setDeleting(null)}
                >
                    <DialogContent className="rounded-lg border-border">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-semibold text-destructive flex items-center gap-2">
                                <Trash2 className="w-5 h-5" />
                                Padam Subjek
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Anda pasti ingin memadam subjek{" "}
                                <b className="text-foreground">
                                    {deleting?.name}
                                </b>
                                ?
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter className="pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setDeleting(null)}
                            >
                                Batal
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteSubject}
                                disabled={loading}
                            >
                                {loading ? "Memadam..." : "Ya, Padam Subjek"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
