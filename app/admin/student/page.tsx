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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
    Mail,
    Lock,
    User,
    Filter,
    Building2,
    RefreshCw,
} from "lucide-react";
import { AddStudentDialog } from "./add-student-dialog";

type Student = {
    id: string;
    name: string;
    identifier: string;
    email?: string;
    className?: string;
    status: string;
};

type ClassItem = {
    id: string;
    name: string;
};

// Client-side only time component
const LastUpdatedTime = () => {
    const [time, setTime] = useState<string>("");

    useEffect(() => {
        // This only runs on the client side
        setTime(new Date().toLocaleTimeString());
    }, []);

    return <span>{time || "Loading..."}</span>;
};

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedClass, setSelectedClass] = useState<string>("all");

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

    // ================= FILTER STUDENTS =================
    const filteredStudents = students.filter((student) => {
        const matchesSearch =
            student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.identifier
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesClass =
            selectedClass === "all" || student.className === selectedClass;

        return matchesSearch && matchesClass;
    });

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <GraduationCap className="w-6 h-6 text-primary" />
                            </div>
                            <h1 className="text-3xl font-bold font-serif tracking-tight">
                                Pengurusan Pelajar
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Urus senarai pelajar dan maklumat kelas
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={fetchStudents}
                            disabled={loading}
                            className="border-border hover:bg-muted/50"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Refresh
                        </Button>

                        <AddStudentDialog
                            onSuccess={fetchStudents}
                            classes={classes}
                        />
                    </div>
                </div>

                {/* STATS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border border-border/50 bg-card shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Jumlah Pelajar
                                    </p>
                                    <h3 className="text-3xl font-bold mt-2">
                                        {students.length}
                                    </h3>
                                </div>
                                <div className="p-3 rounded-full bg-primary/10">
                                    <Users className="w-6 h-6 text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-border/50 bg-card shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Dalam Kelas
                                    </p>
                                    <h3 className="text-3xl font-bold mt-2 text-secondary">
                                        {
                                            students.filter((s) => s.className)
                                                .length
                                        }
                                    </h3>
                                </div>
                                <div className="p-3 rounded-full bg-secondary/10">
                                    <Building2 className="w-6 h-6 text-secondary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-border/50 bg-card shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Kelas Aktif
                                    </p>
                                    <h3 className="text-3xl font-bold mt-2 text-accent">
                                        {
                                            [
                                                ...new Set(
                                                    students
                                                        .map((s) => s.className)
                                                        .filter(Boolean)
                                                ),
                                            ].length
                                        }
                                    </h3>
                                </div>
                                <div className="p-3 rounded-full bg-accent/10">
                                    <GraduationCap className="w-6 h-6 text-accent" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* FILTER AND SEARCH SECTION */}
                <Card className="border-2 border-border/50 bg-card shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* SEARCH INPUT */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari nama pelajar, ID atau email..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="pl-10 border-2 border-border/30 focus:border-primary/50 rounded-xl h-12"
                                />
                            </div>

                            {/* CLASS FILTER */}
                            <div className="flex gap-2">
                                <Button
                                    variant={
                                        selectedClass === "all"
                                            ? "default"
                                            : "outline"
                                    }
                                    onClick={() => setSelectedClass("all")}
                                    className="rounded-xl"
                                >
                                    Semua Kelas
                                </Button>
                                {classes.slice(0, 3).map((cls) => (
                                    <Button
                                        key={cls.id}
                                        variant={
                                            selectedClass === cls.name
                                                ? "secondary"
                                                : "outline"
                                        }
                                        onClick={() =>
                                            setSelectedClass(cls.name)
                                        }
                                        className="rounded-xl"
                                    >
                                        {cls.name}
                                    </Button>
                                ))}
                                {classes.length > 3 && (
                                    <Select
                                        value={selectedClass}
                                        onValueChange={setSelectedClass}
                                    >
                                        <SelectTrigger className="w-[120px] rounded-xl border-2 border-border/30">
                                            <SelectValue placeholder="Lain..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-2 border-border">
                                            {classes.slice(3).map((cls) => (
                                                <SelectItem
                                                    key={cls.id}
                                                    value={cls.name}
                                                >
                                                    {cls.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* TABLE SECTION */}
                <Card className="border-2 border-border/50 bg-card shadow-lg overflow-hidden">
                    <CardHeader className="border-b border-border/30 bg-gradient-to-r from-card to-card/80">
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Senarai Pelajar ({filteredStudents.length})
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="hover:bg-transparent border-b border-border/30">
                                        <TableHead className="font-semibold text-foreground py-4 w-20 text-center">
                                            No
                                        </TableHead>
                                        <TableHead className="font-semibold text-foreground py-4">
                                            Nama Pelajar
                                        </TableHead>
                                        <TableHead className="font-semibold text-foreground py-4">
                                            ID Pelajar
                                        </TableHead>
                                        <TableHead className="font-semibold text-foreground py-4">
                                            Email
                                        </TableHead>
                                        <TableHead className="font-semibold text-foreground py-4">
                                            Kelas
                                        </TableHead>
                                        <TableHead className="font-semibold text-foreground py-4">
                                            Status
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="py-12"
                                            >
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                                    <p className="text-muted-foreground">
                                                        Memuatkan data
                                                        pelajar...
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredStudents.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="py-12"
                                            >
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <GraduationCap className="w-12 h-12 text-muted-foreground/50" />
                                                    <div className="text-center">
                                                        <p className="font-semibold text-foreground">
                                                            Tiada pelajar
                                                            dijumpai
                                                        </p>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {searchQuery ||
                                                            selectedClass !==
                                                                "all"
                                                                ? "Cuba ubah carian atau penapis"
                                                                : "Tambah pelajar pertama untuk bermula"}
                                                        </p>
                                                    </div>
                                                    {!searchQuery &&
                                                        selectedClass ===
                                                            "all" && (
                                                            <AddStudentDialog
                                                                onSuccess={
                                                                    fetchStudents
                                                                }
                                                                classes={
                                                                    classes
                                                                }
                                                            >
                                                                <Button
                                                                    size="sm"
                                                                    className="mt-2"
                                                                >
                                                                    <UserPlus className="w-4 h-4 mr-2" />
                                                                    Tambah
                                                                    Pelajar
                                                                    Pertama
                                                                </Button>
                                                            </AddStudentDialog>
                                                        )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredStudents.map(
                                            (student, index) => (
                                                <TableRow
                                                    key={student.id}
                                                    className="hover:bg-muted/20 border-b border-border/20 group transition-colors"
                                                >
                                                    <TableCell className="py-4 text-center">
                                                        <div className="font-medium text-muted-foreground">
                                                            {index + 1}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                                                                <span className="font-semibold text-primary">
                                                                    {student.name.charAt(
                                                                        0
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-foreground">
                                                                    {
                                                                        student.name
                                                                    }
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <div className="font-mono bg-muted/30 px-3 py-1.5 rounded-lg inline-block">
                                                            {student.identifier}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <div className="text-muted-foreground">
                                                            {student.email ||
                                                                "-"}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        {student.className ? (
                                                            <Badge className="px-3 py-1.5 rounded-lg font-medium border border-secondary/20 bg-secondary/10 text-secondary">
                                                                {
                                                                    student.className
                                                                }
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-sm text-muted-foreground italic">
                                                                Tiada kelas
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="py-4">
                                                        <Badge className="px-3 py-1.5 rounded-lg font-medium border border-primary/20 bg-primary/10 text-primary">
                                                            Pelajar
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>

                    {/* FOOTER - FIXED HYDRATION ERROR */}
                    <div className="border-t border-border/30 bg-muted/10 px-6 py-3">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div>
                                Menunjukkan{" "}
                                <span className="font-semibold">
                                    {filteredStudents.length}
                                </span>{" "}
                                daripada{" "}
                                <span className="font-semibold">
                                    {students.length}
                                </span>{" "}
                                pelajar
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-xs">
                                    Terakhir dikemas kini: <LastUpdatedTime />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* FOOTER NOTES */}
                <div className="text-center text-sm text-muted-foreground pt-4">
                    <p>
                        Sistem Management Pelajar v1.0 • Semua data disimpan
                        dengan selamat • Sokongan: Unit Hal Ehwal Pelajar
                    </p>
                </div>
            </div>
        </div>
    );
}
