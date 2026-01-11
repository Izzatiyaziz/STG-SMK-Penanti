"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, Backpack, Plus, Search, RefreshCw, Loader2, Users, Building2, Filter, SortAsc, SortDesc, BookOpen, Shield, Clock } from "lucide-react";
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
import { ClassItem } from "@/app/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

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

    return <span className="font-medium text-primary">{time || "Loading..."}</span>;
};

export default function ClassesPage() {
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState<ClassItem | null>(null);
    const [deleting, setDeleting] = useState<ClassItem | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "studentCount">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [stats, setStats] = useState({
        totalClasses: 0,
        totalStudents: 0,
        averageStudents: 0,
        capacity: 75 // Simulated capacity percentage
    });

    // ================= FETCH CLASSES =================
    async function fetchClasses() {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/classes");
            const data = await res.json();
            setClasses(data);
            
            // Simulate fetching student count for each class
            const updatedClasses = await Promise.all(data.map(async (cls: ClassItem) => {
                try {
                    const studentRes = await fetch(`/api/admin/users?class=${cls.name}`);
                    const students = await studentRes.json();
                    return { ...cls, studentCount: students.length || 0 };
                } catch {
                    return { ...cls, studentCount: 0 };
                }
            }));
            
            setClasses(updatedClasses);
            updateStats(updatedClasses);
        } catch {
            toast.error("Gagal memuatkan senarai kelas");
        } finally {
            setLoading(false);
        }
    }

    // ================= UPDATE STATS =================
    const updateStats = (classData: any[]) => {
        const totalClasses = classData.length;
        const totalStudents = classData.reduce((sum, cls) => sum + (cls.studentCount || 0), 0);
        const averageStudents = totalClasses > 0 ? Math.round(totalStudents / totalClasses) : 0;
        
        setStats({
            totalClasses,
            totalStudents,
            averageStudents,
            capacity: totalStudents > 0 ? Math.min(100, Math.round((totalStudents / (totalClasses * 30)) * 100)) : 0
        });
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    // ================= FILTER AND SORT =================
    const filteredClasses = classes
        .filter((cls) => {
            return cls.name.toLowerCase().includes(searchQuery.toLowerCase());
        })
        .sort((a, b) => {
            let compareA, compareB;
            
            if (sortBy === "name") {
                compareA = a.name.toLowerCase();
                compareB = b.name.toLowerCase();
            } else {
                compareA = (a as any).studentCount || 0;
                compareB = (b as any).studentCount || 0;
            }

            if (sortOrder === "asc") {
                return compareA > compareB ? 1 : -1;
            } else {
                return compareA < compareB ? 1 : -1;
            }
        });

    // ================= ADD CLASS =================
    async function handleAddClass(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch("/api/admin/classes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    class_name: formData.get("class_name"),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Gagal menambah kelas");
                setLoading(false);
                return;
            }

            toast.success("Kelas berjaya ditambah", {
                description: `Kelas ${formData.get("class_name")} telah ditambah`
            });
            
            fetchClasses();
            (document.getElementById("close-add-dialog") as HTMLButtonElement)?.click();
        } catch {
            toast.error("Ralat sistem. Sila cuba lagi.");
        } finally {
            setLoading(false);
        }
    }

    // ================= EDIT CLASS =================
    async function handleEditClass(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!editing) return;

        setLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch("/api/admin/classes", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    class_id: editing.id,
                    class_name: formData.get("class_name"),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Gagal mengemas kini kelas");
                setLoading(false);
                return;
            }

            toast.success("Kelas berjaya dikemas kini", {
                description: `Kelas telah dikemas kini kepada ${formData.get("class_name")}`
            });
            
            setEditing(null);
            fetchClasses();
        } catch {
            toast.error("Ralat sistem. Sila cuba lagi.");
        } finally {
            setLoading(false);
        }
    }

    // ================= DELETE CLASS =================
    async function handleDeleteClass() {
        if (!deleting) return;

        setLoading(true);

        try {
            const res = await fetch(
                `/api/admin/classes?id=${deleting.id}`,
                { method: "DELETE" }
            );

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Gagal memadam kelas");
                setLoading(false);
                return;
            }

            toast.success("Kelas berjaya dipadam", {
                description: `Kelas ${deleting.name} telah dipadam`
            });
            
            setDeleting(null);
            fetchClasses();
        } catch {
            toast.error("Ralat sistem. Sila cuba lagi.");
        } finally {
            setLoading(false);
        }
    }

    // ================= TOGGLE SORT =================
    const toggleSort = (field: "name" | "studentCount") => {
        if (sortBy === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortOrder("asc");
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* ================= HEADER SECTION ================= */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
                                <Backpack className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold font-sans tracking-tight text-foreground">
                                    Pengurusan Kelas
                                </h1>
                                <p className="text-muted-foreground font-medium mt-1">
                                    Urus maklumat kelas dalam sistem pengurusan sekolah
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
                                <span>Kemas kini: <LastUpdatedTime /></span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={fetchClasses}
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

                        {/* ADD CLASS BUTTON */}
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Tambah Kelas
                                </Button>
                            </DialogTrigger>

                            <DialogContent className="rounded-lg border-border">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-semibold">Tambah Kelas Baharu</DialogTitle>
                                    <DialogDescription className="text-muted-foreground">
                                        Masukkan nama kelas untuk menambah kelas baharu dalam sistem.
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleAddClass} className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="class_name" className="font-medium">Nama Kelas</Label>
                                        <Input 
                                            id="class_name" 
                                            name="class_name" 
                                            placeholder="Contoh: 5 Amanah"
                                            className="border-border focus:border-primary"
                                            required 
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Gunakan format standard seperti "Tahun Kelas"
                                        </p>
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
                                            ) : "Simpan"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* ================= STATS CARDS ================= */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Jumlah Kelas</p>
                                    <h3 className="text-3xl font-bold text-foreground">
                                        {stats.totalClasses}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-2">Aktif dalam sistem</p>
                                </div>
                                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                                    <Building2 className="w-5 h-5 text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-chart-2/30">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Jumlah Pelajar</p>
                                    <h3 className="text-3xl font-bold text-chart-2">
                                        {stats.totalStudents}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-2">Dalam semua kelas</p>
                                </div>
                                <div className="p-3 rounded-xl bg-chart-2/10 border border-chart-2/20">
                                    <Users className="w-5 h-5 text-chart-2" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-chart-3/30">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Purata Pelajar</p>
                                    <h3 className="text-3xl font-bold text-chart-3">
                                        {stats.averageStudents}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Progress value={stats.capacity} className="h-1.5 bg-muted" />
                                        <span className="text-xs text-muted-foreground">
                                            {stats.capacity}% kapasiti
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-chart-3/10 border border-chart-3/20">
                                    <BookOpen className="w-5 h-5 text-chart-3" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-chart-4/30">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Status Sistem</p>
                                    <h3 className="text-3xl font-bold text-chart-4">
                                        Optimal
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Semua kelas beroperasi
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-chart-4/10 border border-chart-4/20">
                                    <Shield className="w-5 h-5 text-chart-4" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ================= MAIN CONTENT CARD ================= */}
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
                                    {filteredClasses.length} kelas ditemui
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6">
                        {/* SEARCH SECTION */}
                        <div className="mb-6">
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari kelas..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-11 rounded-lg border-border bg-background focus:border-primary focus:ring-primary/20"
                                />
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
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleSort("name")}
                                                    className="p-0 h-auto font-semibold hover:bg-transparent"
                                                >
                                                    Nama Kelas
                                                    {sortBy === "name" && (
                                                        sortOrder === "asc" 
                                                            ? <SortAsc className="w-3.5 h-3.5 ml-1" />
                                                            : <SortDesc className="w-3.5 h-3.5 ml-1" />
                                                    )}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleSort("studentCount")}
                                                    className="p-0 h-auto font-semibold hover:bg-transparent"
                                                >
                                                    Bilangan Pelajar
                                                    {sortBy === "studentCount" && (
                                                        sortOrder === "asc" 
                                                            ? <SortAsc className="w-3.5 h-3.5 ml-1" />
                                                            : <SortDesc className="w-3.5 h-3.5 ml-1" />
                                                    )}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4 text-right">
                                                Tindakan
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="py-16">
                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <div className="relative">
                                                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="font-semibold text-foreground">Memuatkan data kelas...</p>
                                                            <p className="text-sm text-muted-foreground mt-1">Sila tunggu sebentar</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredClasses.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="py-16">
                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <div className="p-4 rounded-full bg-muted/50">
                                                            <Backpack className="w-12 h-12 text-muted-foreground/50" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="font-semibold text-foreground">Tiada kelas dijumpai</p>
                                                            <p className="text-sm text-muted-foreground mt-1 max-w-md">
                                                                {searchQuery 
                                                                    ? "Tiada kelas yang sepadan dengan carian anda"
                                                                    : "Mulakan dengan menambah kelas pertama"}
                                                            </p>
                                                        </div>
                                                        {!searchQuery && (
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                                                        <Plus className="w-4 h-4 mr-2" />
                                                                        Tambah Kelas Pertama
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="rounded-lg border-border">
                                                                    {/* Same as Add Dialog */}
                                                                    <DialogHeader>
                                                                        <DialogTitle className="text-lg font-semibold">Tambah Kelas Pertama</DialogTitle>
                                                                        <DialogDescription className="text-muted-foreground">
                                                                            Mulakan dengan menambah kelas pertama dalam sistem.
                                                                        </DialogDescription>
                                                                    </DialogHeader>
                                                                    <form onSubmit={handleAddClass} className="space-y-4 pt-4">
                                                                        <div className="space-y-2">
                                                                            <Label htmlFor="class_name" className="font-medium">Nama Kelas</Label>
                                                                            <Input 
                                                                                id="class_name" 
                                                                                name="class_name" 
                                                                                placeholder="Contoh: 5 Amanah"
                                                                                className="border-border focus:border-primary"
                                                                                required 
                                                                            />
                                                                        </div>
                                                                        <DialogFooter className="pt-4">
                                                                            <Button type="submit" disabled={loading}>
                                                                                {loading ? "Menyimpan..." : "Simpan"}
                                                                            </Button>
                                                                        </DialogFooter>
                                                                    </form>
                                                                </DialogContent>
                                                            </Dialog>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredClasses.map((cls, index) => (
                                                <TableRow
                                                    key={cls.id}
                                                    className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group"
                                                >
                                                    <TableCell className="py-4 text-center">
                                                        <div className="font-medium text-muted-foreground">
                                                            {index + 1}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
                                                                <Building2 className="w-4 h-4 text-primary" />
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-foreground">
                                                                    {cls.name}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                    <BookOpen className="w-3 h-3" />
                                                                    Kelas Aktif
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-foreground font-semibold">
                                                                {(cls as any).studentCount || 0}
                                                            </div>
                                                            <div className="w-24">
                                                                <Progress 
                                                                    value={((cls as any).studentCount || 0) * 3.33} // Convert to percentage
                                                                    className="h-1.5 bg-muted"
                                                                />
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">
                                                                pelajar
                                                            </span>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setEditing(cls)}
                                                                className="border-border hover:bg-accent h-8 w-8 p-0"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => setDeleting(cls)}
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </CardContent>

                    {/* FOOTER */}
                    <div className="border-t border-border bg-muted/20 px-6 py-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <span className="font-semibold text-foreground">{filteredClasses.length}</span>
                                    <span>daripada</span>
                                    <span className="font-semibold text-foreground">{classes.length}</span>
                                    <span>kelas dipaparkan</span>
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
                                    onClick={fetchClasses}
                                    disabled={loading}
                                    className="h-8"
                                >
                                    {loading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                                    Refresh Data
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* ================= EDIT DIALOG ================= */}
                <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
                    <DialogContent className="rounded-lg border-border">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-semibold">Kemas Kini Kelas</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Kemas kini maklumat kelas yang dipilih.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleEditClass} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit_class_name" className="font-medium">Nama Kelas</Label>
                                <Input
                                    id="edit_class_name"
                                    name="class_name"
                                    defaultValue={editing?.name}
                                    placeholder="Masukkan nama kelas"
                                    className="border-border focus:border-primary"
                                    required
                                />
                            </div>

                            <DialogFooter className="pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setEditing(null)}
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
                                    ) : "Simpan Perubahan"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ================= DELETE DIALOG ================= */}
                <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
                    <DialogContent className="rounded-lg border-border">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-semibold text-destructive">Padam Kelas</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Anda pasti ingin memadam kelas <b className="text-foreground">{deleting?.name}</b>? 
                                Tindakan ini akan memadam semua data berkaitan dan tidak boleh dibatalkan.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4 mt-2">
                            <div className="flex items-center gap-2 text-destructive text-sm">
                                <Shield className="w-4 h-4" />
                                <span className="font-medium">Amaran: Tindakan ini muktamad</span>
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setDeleting(null)}
                                className="border-border hover:bg-accent"
                            >
                                Batal
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteClass}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Memadam...
                                    </>
                                ) : "Ya, Padam Kelas"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* FOOTER NOTES */}
                <div className="text-center pt-6">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-card/50 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
                        <Shield className="w-4 h-4" />
                        <span>Sistem Pengurusan Kelas v2.0 • Data terlindung sepenuhnya</span>
                    </div>
                </div>
            </div>
        </div>
    );
}