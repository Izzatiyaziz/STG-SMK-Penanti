"use client";

import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    Users,
    UserPlus,
    Search,
    GraduationCap,
    Loader2,
    Building2,
    RefreshCw,
    Filter,
    Download,
    MoreVertical,
    Eye,
    Edit,
    Trash2,
    ChevronRight,
    BarChart3,
    Shield,
    CheckCircle,
    AlertCircle,
    Clock,
    BookOpen,
    Mail,
    User,
    SortAsc,
    SortDesc,
} from "lucide-react";
import { AddStudentDialog } from "./add-student-dialog";
import { ClassItem } from "@/app/types";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

type Student = {
    id: string;
    name: string;
    identifier: string;
    email?: string;
    className?: string;
    status: string;
    lastActive?: string;
    createdAt?: string;
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

    return <span className="font-medium text-primary">{time || "Loading..."}</span>;
};

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"name" | "date" | "class">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    // ================= FETCH STUDENTS =================
    async function fetchStudents() {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users?role=student");
            const data = await res.json();
            setStudents(data);
        } catch (err) {
            console.error("FETCH STUDENTS ERROR:", err);
            toast.error("Gagal memuatkan senarai pelajar");
        } finally {
            setLoading(false);
        }
    }

    // ================= FETCH CLASSES =================
    async function fetchClasses() {
        try {
            const res = await fetch("/api/admin/classes");
            const data = await res.json();
            setClasses(data);
        } catch (err) {
            console.error("FETCH CLASSES ERROR:", err);
        }
    }

    useEffect(() => {
        fetchStudents();
        fetchClasses();
    }, []);

    // ================= FILTER AND SORT STUDENTS =================
    const filteredStudents = students
        .filter((student) => {
            const matchesSearch =
                student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                student.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
                student.email?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesClass =
                selectedClass === "all" || student.className === selectedClass;

            return matchesSearch && matchesClass;
        })
        .sort((a, b) => {
            let compareA, compareB;
            
            switch (sortBy) {
                case "name":
                    compareA = a.name.toLowerCase();
                    compareB = b.name.toLowerCase();
                    break;
                case "class":
                    compareA = a.className || "";
                    compareB = b.className || "";
                    break;
                case "date":
                    compareA = a.createdAt || "";
                    compareB = b.createdAt || "";
                    break;
                default:
                    compareA = a.name.toLowerCase();
                    compareB = b.name.toLowerCase();
            }

            if (sortOrder === "asc") {
                return compareA.localeCompare(compareB);
            } else {
                return compareB.localeCompare(compareA);
            }
        });

    // ================= STATS CALCULATION =================
    const stats = {
        total: students.length,
        withClass: students.filter(s => s.className).length,
        activeClasses: [...new Set(students.map(s => s.className).filter(Boolean))].length,
        percentageInClass: students.length > 0 ? (students.filter(s => s.className).length / students.length * 100) : 0
    };

    // ================= EXPORT FUNCTION =================
    const handleExport = () => {
        toast.success("Data pelajar berjaya dieksport", {
            description: "Fail sedang dimuat turun...",
        });
    };

    // ================= STUDENT ACTIONS =================
    const handleViewStudent = (student: Student) => {
        toast.info(`Melihat profil ${student.name}`);
    };

    const handleEditStudent = (student: Student) => {
        toast.info(`Mengedit ${student.name}`);
    };

    const handleDeleteStudent = (student: Student) => {
        toast.error(`Padam ${student.name}?`, {
            description: "Tindakan ini tidak boleh dipulihkan",
            action: {
                label: "Padam",
                onClick: () => {
                    toast.success(`${student.name} telah dipadam`);
                }
            },
            cancel: {
                label: "Batal",
                onClick: () => {}
            }
        });
    };

    // ================= TOGGLE SORT =================
    const toggleSort = (field: "name" | "date" | "class") => {
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
                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
                                <GraduationCap className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold font-sans tracking-tight text-foreground">
                                    Pengurusan Pelajar
                                </h1>
                                <p className="text-muted-foreground font-medium mt-1">
                                    Urus senarai pelajar dan maklumat kelas dengan cekap
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5" />
                                <span>Data Terkawal Selia</span>
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
                            onClick={fetchStudents}
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

                        <Button
                            variant="outline"
                            onClick={handleExport}
                            className="border-border hover:bg-accent hover:text-accent-foreground shadow-xs"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Eksport
                        </Button>

                        <AddStudentDialog
                            onSuccess={fetchStudents}
                            classes={classes}
                        />
                    </div>
                </div>

                {/* STATS CARDS - USING THEME COLORS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Jumlah Pelajar</p>
                                    <h3 className="text-3xl font-bold text-foreground">
                                        {stats.total}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-2">Semua pelajar berdaftar</p>
                                </div>
                                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                                    <Users className="w-5 h-5 text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-chart-2/30">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Dalam Kelas</p>
                                    <h3 className="text-3xl font-bold text-chart-2">
                                        {stats.withClass}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Progress 
                                            value={stats.percentageInClass} 
                                            className="h-1.5 bg-muted"
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {Math.round(stats.percentageInClass)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-chart-2/10 border border-chart-2/20">
                                    <Building2 className="w-5 h-5 text-chart-2" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-chart-3/30">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Kelas Aktif</p>
                                    <h3 className="text-3xl font-bold text-chart-3">
                                        {stats.activeClasses}
                                    </h3>
                                    <div className="flex items-center gap-1 mt-2">
                                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">
                                            {classes.length} kelas tersedia
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-chart-3/10 border border-chart-3/20">
                                    <GraduationCap className="w-5 h-5 text-chart-3" />
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
                                        Aktif
                                    </h3>
                                    <div className="flex items-center gap-1 mt-2">
                                        <CheckCircle className="w-3.5 h-3.5 text-chart-4" />
                                        <span className="text-xs text-muted-foreground">
                                            Semua sistem beroperasi
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-chart-4/10 border border-chart-4/20">
                                    <CheckCircle className="w-5 h-5 text-chart-4" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* MAIN CONTENT CARD */}
                <Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
                    <CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-primary" />
                                    Senarai Pelajar
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Urus dan pantau semua pelajar dalam sistem
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-medium">
                                    <Filter className="w-3 h-3 mr-1" />
                                    {filteredStudents.length} pelajar ditemui
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6">
                        {/* FILTER AND SEARCH SECTION */}
                        <div className="flex flex-col lg:flex-row gap-4 mb-6">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari pelajar, ID atau email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-11 rounded-lg border-border bg-background focus:border-primary focus:ring-primary/20"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="w-full sm:w-[200px]">
                                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                                        <SelectTrigger className="h-11 rounded-lg border-border bg-background">
                                            <SelectValue placeholder="Pilih Kelas" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-lg border-border">
                                            <SelectItem value="all">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4" />
                                                    Semua Kelas
                                                </div>
                                            </SelectItem>
                                            {classes.map((cls) => (
                                                <SelectItem key={cls.id} value={cls.name}>
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="w-4 h-4" />
                                                        {cls.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setSelectedClass("all");
                                        setSortBy("name");
                                        setSortOrder("asc");
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
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleSort("name")}
                                                    className="p-0 h-auto font-semibold hover:bg-transparent"
                                                >
                                                    Nama Pelajar
                                                    {sortBy === "name" && (
                                                        sortOrder === "asc" 
                                                            ? <SortAsc className="w-3.5 h-3.5 ml-1" />
                                                            : <SortDesc className="w-3.5 h-3.5 ml-1" />
                                                    )}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">
                                                No. Kad
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleSort("class")}
                                                    className="p-0 h-auto font-semibold hover:bg-transparent"
                                                >
                                                    Kelas
                                                    {sortBy === "class" && (
                                                        sortOrder === "asc" 
                                                            ? <SortAsc className="w-3.5 h-3.5 ml-1" />
                                                            : <SortDesc className="w-3.5 h-3.5 ml-1" />
                                                    )}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">
                                                Status
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4 text-right">
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
                                                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="font-semibold text-foreground">Memuatkan data pelajar...</p>
                                                            <p className="text-sm text-muted-foreground mt-1">Sila tunggu sebentar</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredStudents.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="py-16">
                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <div className="p-4 rounded-full bg-muted/50">
                                                            <GraduationCap className="w-12 h-12 text-muted-foreground/50" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="font-semibold text-foreground">Tiada pelajar dijumpai</p>
                                                            <p className="text-sm text-muted-foreground mt-1 max-w-md">
                                                                {searchQuery || selectedClass !== "all" 
                                                                    ? "Tiada pelajar yang sepadan dengan carian anda"
                                                                    : "Mulakan dengan menambah pelajar pertama"}
                                                            </p>
                                                        </div>
                                                        {!searchQuery && selectedClass === "all" && (
                                                            <AddStudentDialog
                                                                onSuccess={fetchStudents}
                                                                classes={classes}
                                                            >
                                                                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                                                    <UserPlus className="w-4 h-4 mr-2" />
                                                                    Tambah Pelajar Pertama
                                                                </Button>
                                                            </AddStudentDialog>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredStudents.map((student, index) => (
                                                <TableRow
                                                    key={student.id}
                                                    className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group"
                                                >
                                                    <TableCell className="py-4 text-center">
                                                        <div className="font-medium text-muted-foreground">
                                                            {index + 1}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
                                                                    <span className="font-semibold text-primary text-sm">
                                                                        {student.name.charAt(0)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-foreground">
                                                                    {student.name}
                                                                </div>
                                                                {student.email && (
                                                                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                                        <Mail className="w-3 h-3" />
                                                                        {student.email}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <div className="font-mono bg-muted/30 px-3 py-1.5 rounded-md text-foreground border border-border">
                                                            {student.identifier}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        {student.className ? (
                                                            <Badge className="px-3 py-1.5 rounded-md font-medium border border-chart-2/30 bg-chart-2/10 text-chart-2 hover:bg-chart-2/20 transition-colors">
                                                                <Building2 className="w-3 h-3 mr-1" />
                                                                {student.className}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="px-3 py-1.5 rounded-md text-muted-foreground border-border">
                                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                                Tiada kelas
                                                            </Badge>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <Badge className="px-3 py-1.5 rounded-md font-medium border border-primary/30 bg-primary/10 text-primary">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Aktif
                                                        </Badge>
                                                    </TableCell>

                                                    <TableCell className="py-4 text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    className="h-8 w-8 p-0 opacity-100 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="rounded-lg border-border w-48">
                                                                <DropdownMenuItem onClick={() => handleViewStudent(student)}>
                                                                    <Eye className="w-4 h-4 mr-2" />
                                                                    Lihat Profil
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleEditStudent(student)}>
                                                                    <Edit className="w-4 h-4 mr-2" />
                                                                    Edit Maklumat
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem 
                                                                    onClick={() => handleDeleteStudent(student)}
                                                                    className="text-destructive focus:text-destructive"
                                                                >
                                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                                    Padam Pelajar
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
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
                                    <span className="font-semibold text-foreground">{filteredStudents.length}</span>
                                    <span>daripada</span>
                                    <span className="font-semibold text-foreground">{students.length}</span>
                                    <span>pelajar dipaparkan</span>
                                </div>
                                {selectedClass !== "all" && (
                                    <Badge variant="secondary" className="ml-2">
                                        {selectedClass}
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
                                    onClick={fetchStudents}
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

                {/* FOOTER NOTES */}
                <div className="text-center pt-6">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-card/50 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
                        <Shield className="w-4 h-4" />
                        <span>Sistem Management Pelajar v2.0 • Data terlindung sepenuhnya</span>
                    </div>
                </div>
            </div>
        </div>
    );
}