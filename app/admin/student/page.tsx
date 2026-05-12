"use client";

import { useEffect, useMemo, useState } from "react";
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
import { AddStudentDialog } from "./add-student-dialog";
import {
    Search,
    Users,
    Filter,
    Loader2,
    UserPlus,
    RefreshCw,
    Shield,
    Pencil,
    Bus,
    Clock,
    Download,
    Edit,
    Trash2,
    SortAsc,
    SortDesc,
    Backpack,
    GraduationCap,
    School,
    Calendar,
    X,
    AlertCircle,
    BookOpen,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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

const normalizeIcDigits = (value: string) => value.replace(/\D/g, "");

const formatIcNumber = (value: string) => {
    const digits = normalizeIcDigits(value);
    if (digits.length <= 6) return digits;
    if (digits.length <= 8) return `${digits.slice(0, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 12)}`;
};

// Helper: Detect Tingkatan from IC (based on age)
const detectLevelFromIC = (ic: string): string | null => {
    const digits = normalizeIcDigits(ic);
    if (digits.length < 12) return null;
    const yearPart = parseInt(digits.substring(0, 2));
    const currentYear = new Date().getFullYear();
    const fullYear = yearPart > (currentYear % 100) ? 1900 + yearPart : 2000 + yearPart;
    const age = currentYear - fullYear;
    
    if (age === 13) return "1";
    if (age === 14) return "2";
    if (age === 15) return "3";
    if (age === 16) return "4";
    if (age === 17) return "5";
    return null;
};

// Helper: Get age from IC for display
const getAgeFromIC = (ic: string): number | null => {
    const digits = normalizeIcDigits(ic);
    if (digits.length < 12) return null;
    const yearPart = parseInt(digits.substring(0, 2));
    const currentYear = new Date().getFullYear();
    const fullYear = yearPart > (currentYear % 100) ? 1900 + yearPart : 2000 + yearPart;
    return currentYear - fullYear;
};

// Format date to local string
const formatDate = (dateString: string | null): string => {
    if (!dateString) return "-";
    try {
        return new Date(dateString).toLocaleDateString('ms-MY', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return "-";
    }
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

export default function AdminStudentsPage() {
    const PAGE_SIZE = 10;
    const [classes, setClasses] = useState<ClassRow[]>([]);
    const [rows, setRows] = useState<StudentRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterLevel, setFilterLevel] = useState<string>("all");
    const [filterClassName, setFilterClassName] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"name" | "level" | "date">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [currentPage, setCurrentPage] = useState(1);

    // Edit dialog states
    const [editing, setEditing] = useState<StudentRow | null>(null);
    const [editName, setEditName] = useState("");
    const [editIc, setEditIc] = useState("");
    const [editLevel, setEditLevel] = useState<string>("");
    const [editOriginalLevel, setEditOriginalLevel] = useState<string>("");
    const [editDetectedLevel, setEditDetectedLevel] = useState<string | null>(null);
    const [editUserOverridden, setEditUserOverridden] = useState(false);
    const [editEnrollmentDate, setEditEnrollmentDate] = useState<string>("");
    const [confirmDelete, setConfirmDelete] = useState(false);

    async function fetchClasses() {
        try {
            const res = await fetch("/api/admin/classes");
            const data = await res.json();
            setClasses(data ?? []);
        } catch { setClasses([]); }
    }

    async function fetchStudents() {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/students");
            const json = await res.json();
            setRows(json?.data ?? []);
        } catch { setRows([]); }
        finally { setLoading(false); }
    }

    useEffect(() => {
        fetchClasses();
        fetchStudents();
    }, []);

    const classNameOptions = useMemo(() => {
        const uniqueNames = new Set<string>();
        for (const cls of classes) uniqueNames.add(cls.name);
        for (const student of rows) {
            if (student.className) uniqueNames.add(student.className);
        }
        return Array.from(uniqueNames).sort((a, b) => a.localeCompare(b));
    }, [classes, rows]);

    // ================= FILTER AND SORT =================
    const filteredStudents = rows
        .filter((s) => {
            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 s.identifier.includes(searchQuery);
            const matchesLevel = filterLevel === "all" || s.level?.toString() === filterLevel;
            const matchesClass =
                filterClassName === "all" ||
                (filterClassName === "__unassigned__"
                    ? !s.className
                    : s.className === filterClassName);
            return matchesSearch && matchesLevel && matchesClass;
        })
        .sort((a, b) => {
            let compareA, compareB;
            
            switch (sortBy) {
                case "name":
                    compareA = a.name.toLowerCase();
                    compareB = b.name.toLowerCase();
                    break;
                case "level":
                    compareA = parseInt(a.level || "0");
                    compareB = parseInt(b.level || "0");
                    break;
                case "date":
                    compareA = a.enrollment_date || "";
                    compareB = b.enrollment_date || "";
                    break;
                default:
                    compareA = a.name.toLowerCase();
                    compareB = b.name.toLowerCase();
            }

            if (sortOrder === "asc") {
                return compareA < compareB ? -1 : compareA > compareB ? 1 : 0;
            } else {
                return compareA > compareB ? -1 : compareA < compareB ? 1 : 0;
            }
        });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterLevel, filterClassName, sortBy, sortOrder]);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, filteredStudents.length]);

    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
    const paginatedStudents = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return filteredStudents.slice(startIndex, startIndex + PAGE_SIZE);
    }, [currentPage, filteredStudents]);

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

    // ================= STATS =================
    const stats = {
        total: rows.length,
        form1: rows.filter((s) => s.level === "1").length,
        form2: rows.filter((s) => s.level === "2").length,
        form3: rows.filter((s) => s.level === "3").length,
        form4: rows.filter((s) => s.level === "4").length,
        form5: rows.filter((s) => s.level === "5").length,
    };

    const handleLevelCardClick = (level: "1" | "2" | "3" | "4" | "5") => {
        setFilterLevel((prev) => (prev === level ? "all" : level));
    };

    // ================= LEVEL COLORS =================
    const getLevelColor = (level: string | null) => {
        switch (level) {
            case "1":
                return {
                    bg: "bg-emerald-100",
                    text: "text-emerald-700",
                    border: "border-emerald-200",
                };
            case "2":
                return {
                    bg: "bg-blue-100",
                    text: "text-blue-700",
                    border: "border-blue-200",
                };
            case "3":
                return {
                    bg: "bg-amber-100",
                    text: "text-amber-700",
                    border: "border-amber-200",
                };
            case "4":
                return {
                    bg: "bg-purple-100",
                    text: "text-purple-700",
                    border: "border-purple-200",
                };
            case "5":
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

    // ================= ACTIONS =================
    const handleExport = () => {
        toast.success("Data pelajar berjaya dieksport", {
            description: "Fail sedang dimuat turun...",
        });
    };


    function openEdit(s: StudentRow) {
        setEditing(s);
        setEditName(s.name);
        setEditIc(formatIcNumber(s.identifier));
        setEditLevel(s.level || "");
        setEditOriginalLevel(s.level || "");
        setEditEnrollmentDate(s.enrollment_date ? s.enrollment_date.split('T')[0] : "");
        
        const detected = detectLevelFromIC(s.identifier);
        setEditDetectedLevel(detected);
        setEditUserOverridden(s.level !== detected);
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
                    level: editLevel,
                    enrollment_date: editEnrollmentDate || null,
                }),
            });
            if (!res.ok) throw new Error();
            toast.success("Maklumat dikemaskini", { id: toastId });
            setEditing(null);
            fetchStudents();
        } catch { toast.error("Gagal menyimpan", { id: toastId }); }
    }

    async function handleDelete() {
        if (!editing) return;
        const toastId = toast.loading("Memadam...");
        try {
            const res = await fetch(`/api/admin/students?id=${editing.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            toast.success("Pelajar dipadam", { id: toastId });
            setConfirmDelete(false); 
            setEditing(null); 
            fetchStudents();
        } catch { toast.error("Ralat sistem", { id: toastId }); }
    }

    // ================= TOGGLE SORT =================
    const toggleSort = (field: "name" | "level" | "date") => {
        if (sortBy === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortOrder("asc");
        }
    };

    // Close edit dialog without saving
    const closeEditDialog = () => {
        setEditing(null);
        setEditName("");
        setEditIc("");
        setEditLevel("");
        setEditOriginalLevel("");
        setEditDetectedLevel(null);
        setEditUserOverridden(false);
        setEditEnrollmentDate("");
    };

    const cancelDeleteDialog = () => {
        setConfirmDelete(false);
        closeEditDialog();
    };

    const handleEditICChange = (ic: string) => {
        const formatted = formatIcNumber(ic);
        setEditIc(formatted);
        const detected = detectLevelFromIC(formatted);
        setEditDetectedLevel(detected);
        
        // Only auto-set level if:
        // 1. User hasn't manually overridden in this session
        // 2. There's a detected level
        // 3. Current level equals the ORIGINAL level (means user hasn't changed it yet in this edit session)
        if (!editUserOverridden && detected && editLevel === editOriginalLevel) {
            setEditLevel(detected);
        }
    };

    const handleEditLevelChange = (value: string) => {
        setEditLevel(value);
        setEditUserOverridden(true);
    };

    const resetEditToAuto = () => {
        if (editDetectedLevel) {
            setEditLevel(editDetectedLevel);
            setEditUserOverridden(false);
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
                                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    Pengurusan Pelajar
                                </h1>
                                <p className="text-muted-foreground font-medium mt-1">
                                    Mengurus pendaftaran pelajar dan maklumat berkaitan
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5" />
                                <span>Data Pelajar Terkawal</span>
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
                            Muat Semula
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleExport}
                            className="border-border hover:bg-accent hover:text-accent-foreground shadow-xs"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Eksport
                        </Button>

                        <AddStudentDialog onSuccess={fetchStudents} classes={classes}>
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Tambah Pelajar
                            </Button>
                        </AddStudentDialog>
                    </div>
                </div>

                {/* STATS CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                    <Card
                        role="button"
                        tabIndex={0}
                        onClick={() => handleLevelCardClick("1")}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleLevelCardClick("1");
                            }
                        }}
                        className={`border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-emerald-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${filterLevel === "1" ? "ring-2 ring-emerald-300 border-emerald-300" : ""}`}
                    >
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Tingkatan 1</p>
                                    <h3 className="text-3xl font-bold text-emerald-600">{stats.form1}</h3>
                                </div>
                                <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-200">
                                    <Bus className="w-5 h-5 text-emerald-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        role="button"
                        tabIndex={0}
                        onClick={() => handleLevelCardClick("2")}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleLevelCardClick("2");
                            }
                        }}
                        className={`border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${filterLevel === "2" ? "ring-2 ring-blue-300 border-blue-300" : ""}`}
                    >
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Tingkatan 2</p>
                                    <h3 className="text-3xl font-bold text-blue-600">{stats.form2}</h3>
                                </div>
                                <div className="p-3 rounded-xl bg-blue-100 border border-blue-200">
                                    <Backpack className="w-5 h-5 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        role="button"
                        tabIndex={0}
                        onClick={() => handleLevelCardClick("3")}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleLevelCardClick("3");
                            }
                        }}
                        className={`border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${filterLevel === "3" ? "ring-2 ring-amber-300 border-amber-300" : ""}`}
                    >
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Tingkatan 3</p>
                                    <h3 className="text-3xl font-bold text-amber-600">{stats.form3}</h3>
                                </div>
                                <div className="p-3 rounded-xl bg-amber-100 border border-amber-200">
                                    <GraduationCap className="w-5 h-5 text-amber-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        role="button"
                        tabIndex={0}
                        onClick={() => handleLevelCardClick("4")}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleLevelCardClick("4");
                            }
                        }}
                        className={`border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-purple-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${filterLevel === "4" ? "ring-2 ring-purple-300 border-purple-300" : ""}`}
                    >
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Tingkatan 4</p>
                                    <h3 className="text-3xl font-bold text-purple-600">{stats.form4}</h3>
                                </div>
                                <div className="p-3 rounded-xl bg-purple-100 border border-purple-200">
                                    <BookOpen className="w-5 h-5 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        role="button"
                        tabIndex={0}
                        onClick={() => handleLevelCardClick("5")}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleLevelCardClick("5");
                            }
                        }}
                        className={`border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-rose-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${filterLevel === "5" ? "ring-2 ring-rose-300 border-rose-300" : ""}`}
                    >
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Tingkatan 5</p>
                                    <h3 className="text-3xl font-bold text-rose-600">{stats.form5}</h3>
                                </div>
                                <div className="p-3 rounded-xl bg-rose-100 border border-rose-200">
                                    <Pencil className="w-5 h-5 text-rose-600" />
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
                                    <Filter className="w-5 h-5 text-primary" />
                                    Senarai Pelajar
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Urus dan pantau semua pelajar dalam sistem
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-medium">
                                    <Filter className="w-3 h-3 mr-1" />
                                    {filteredStudents.length} pelajar
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
                                    placeholder="Cari pelajar (nama atau no. IC)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-11 rounded-lg border-border bg-background focus:border-primary focus:ring-primary/20"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="w-full sm:w-[200px]">
                                    <Select value={filterLevel} onValueChange={setFilterLevel}>
                                        <SelectTrigger className="h-11 rounded-lg border-border bg-background">
                                            <SelectValue placeholder="Pilih Tingkatan" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-lg border-border">
                                            <SelectItem value="all">
                                                <div className="flex items-center gap-2">
                                                    <GraduationCap className="w-4 h-4" />
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

                                <div className="w-full sm:w-[180px]">
                                    <Select value={filterClassName} onValueChange={setFilterClassName}>
                                        <SelectTrigger className="h-11 rounded-lg border-border bg-background">
                                            <SelectValue placeholder="Pilih Kelas" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-lg border-border max-h-72 overflow-y-auto">
                                            <SelectItem value="all">
                                                <div className="flex items-center gap-2">
                                                    <School className="w-4 h-4" />
                                                    Semua Kelas
                                                </div>
                                            </SelectItem>
                                            {rows.some((s) => !s.className) && (
                                                <SelectItem value="__unassigned__">Tiada Kelas</SelectItem>
                                            )}
                                            {classNameOptions.map((name) => (
                                                <SelectItem key={name} value={name}>
                                                    {name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setFilterLevel("all");
                                        setFilterClassName("all");
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
                                            <TableHead className="font-semibold text-foreground py-4 w-16 text-center">#</TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">
                                                <Button variant="ghost" size="sm" onClick={() => toggleSort("name")} className="p-0 h-auto font-semibold hover:bg-transparent">
                                                    Nama Pelajar
                                                    {sortBy === "name" && (sortOrder === "asc" ? <SortAsc className="w-3.5 h-3.5 ml-1" /> : <SortDesc className="w-3.5 h-3.5 ml-1" />)}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">No. Kad Pengenalan</TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">Tingkatan</TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">Kelas</TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">
                                                <Button variant="ghost" size="sm" onClick={() => toggleSort("date")} className="p-0 h-auto font-semibold hover:bg-transparent">
                                                    Tarikh Daftar
                                                    {sortBy === "date" && (sortOrder === "asc" ? <SortAsc className="w-3.5 h-3.5 ml-1" /> : <SortDesc className="w-3.5 h-3.5 ml-1" />)}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4 text-right pr-6">Tindakan</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="py-16">
                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                                        <p className="font-semibold text-foreground">Memuatkan data pelajar...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredStudents.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="py-16">
                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <div className="p-4 rounded-full bg-muted/50">
                                                            <Users className="w-12 h-12 text-muted-foreground/50" />
                                                        </div>
                                                        <p className="font-semibold text-foreground">Tiada pelajar dijumpai</p>
                                                        {!searchQuery && filterLevel === "all" && filterClassName === "all" && (
                                                            <AddStudentDialog onSuccess={fetchStudents} classes={classes}>
                                                                <Button className="bg-primary">Tambah Pelajar Pertama</Button>
                                                            </AddStudentDialog>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedStudents.map((student, index) => {
                                                const levelColors = getLevelColor(student.level);
                                                const displayIndex = (currentPage - 1) * PAGE_SIZE + index + 1;
                                                const expectedLevel = detectLevelFromIC(student.identifier);
                                                const isPeralihan = expectedLevel && student.level !== expectedLevel;
                                                
                                                return (
                                                    <TableRow
                                                        key={student.id}
                                                        className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group"
                                                    >
                                                        <TableCell className="py-4 text-center cursor-pointer" onClick={() => openEdit(student)}>
                                                            {displayIndex}
                                                        </TableCell>
                                                        <TableCell className="py-4 cursor-pointer" onClick={() => openEdit(student)}>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
                                                                    <span className="font-semibold text-primary text-sm">{student.name.charAt(0)}</span>
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold">{student.name}</div>
                                                                    {isPeralihan && (
                                                                        <Badge className="mt-1 bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                                                                            Kelas Peralihan
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-4">
                                                            <span className="font-mono bg-muted/30 px-3 py-1.5 rounded-md text-sm">{student.identifier}</span>
                                                        </TableCell>
                                                        <TableCell className="py-4">
                                                            <Badge className={`px-3 py-1.5 ${levelColors.bg} ${levelColors.text} ${levelColors.border}`}>
                                                                Tingkatan {student.level || "—"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="py-4">
                                                            <div className="flex items-center gap-2">
                                                                <School className="w-4 h-4 text-muted-foreground" />
                                                                <span>{student.className || "Belum Tetap"}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-4">
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <Calendar className="w-4 h-4" />
                                                                <span>{formatDate(student.enrollment_date)}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-4 text-right pr-6">
                                                            <div className="flex justify-end gap-2">
                                                                <Button size="icon" variant="outline" className="h-8 w-8 text-blue-600" onClick={() => openEdit(student)}>
                                                                    <Edit className="w-4 h-4" />
                                                                </Button>
                                                                <Button size="icon" variant="outline" className="h-8 w-8 text-rose-600" onClick={() => { setEditing(student); setConfirmDelete(true); }}>
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
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-sm text-muted-foreground">
                                Menunjukkan{" "}
                                <span className="font-semibold text-foreground">
                                    {filteredStudents.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} –{" "}
                                    {filteredStudents.length === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, filteredStudents.length)}
                                </span>{" "}
                                daripada{" "}
                                <span className="font-semibold text-foreground">{filteredStudents.length}</span>{" "}
                                pelajar
                                {filterLevel !== "all" && <Badge variant="secondary" className="ml-2">Tingkatan {filterLevel}</Badge>}
                                {filterClassName !== "all" && (
                                    <Badge variant="secondary" className="ml-2">
                                        {filterClassName === "__unassigned__" ? "Tiada Kelas" : filterClassName}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">Kemas kini: <LastUpdatedTime /></span>
                                <Button variant="ghost" size="sm" onClick={fetchStudents} disabled={loading} className="font-semibold">
                                    {loading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                                    Muat Semula Data
                                </Button>
                            </div>
                        </div>
                        {!loading && totalPages > 1 && (
                            <div className="mt-4 border-t border-border/60 pt-4 flex justify-center">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined} />
                                        </PaginationItem>
                                        {paginationItems.map((item, idx) => (
                                            typeof item === "number" ? (
                                                <PaginationItem key={item}>
                                                    <PaginationLink href="#" isActive={currentPage === item} onClick={(e) => { e.preventDefault(); setCurrentPage(item); }}>{item}</PaginationLink>
                                                </PaginationItem>
                                            ) : (
                                                <PaginationItem key={`${item}-${idx}`}><PaginationEllipsis /></PaginationItem>
                                            )
                                        ))}
                                        <PaginationItem>
                                            <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined} />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </div>
                </Card>

                {/* FOOTER NOTES */}
                <div className="text-center pt-6">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-card/50 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
                        <Shield className="w-4 h-4" />
                        <span>Sistem Pemarkahan Pelajar v2.0 • Data pelajar terkawal sepenuhnya</span>
                    </div>
                </div>
            </div>

            {/* EDIT DIALOG */}
            <Dialog open={Boolean(editing) && !confirmDelete} onOpenChange={(open) => {
                if (!open) closeEditDialog();
            }}>
                <DialogContent className="sm:max-w-[500px]">
                    <button onClick={closeEditDialog} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
                        <X className="h-4 w-4" />
                    </button>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-bold">
                            <Edit className="w-5 h-5 text-primary" /> Kemaskini Pelajar
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                        <div className="space-y-2">
                            <Label>Nama Penuh</Label>
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-11" />
                        </div>

                        <div className="space-y-2">
                            <Label>No. Kad Pengenalan</Label>
                            <Input 
                                value={editIc} 
                                maxLength={14} 
                                onChange={(e) => handleEditICChange(e.target.value)} 
                                className="h-11 font-mono" 
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Tingkatan</Label>
                                {editUserOverridden && editDetectedLevel && (
                                    <Button type="button" variant="ghost" size="sm" onClick={resetEditToAuto} className="h-6 text-xs text-blue-600">
                                        <RefreshCw className="w-3 h-3 mr-1" />
                                        Reset ke Auto ({editDetectedLevel})
                                    </Button>
                                )}
                            </div>
                            <Select value={editLevel} onValueChange={handleEditLevelChange}>
                                <SelectTrigger className={`h-11 ${editDetectedLevel && editDetectedLevel !== editLevel ? "border-amber-400 bg-amber-50/50" : ""}`}>
                                    <SelectValue placeholder="Pilih Tingkatan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1,2,3,4,5].map(l => (
                                        <SelectItem key={l} value={l.toString()}>Tingkatan {l}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {editDetectedLevel && editDetectedLevel !== editLevel && editLevel && (
                                <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 p-2 rounded-md">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5" />
                                    <div className="text-amber-800">
                                        <span className="font-medium">Kelas Peralihan </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Tarikh Daftar</Label>
                            <Input type="date" value={editEnrollmentDate} onChange={(e) => setEditEnrollmentDate(e.target.value)} className="h-11" />
                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                            <p className="text-[11px] text-amber-700 italic">
                                <strong>Nota:</strong> Penetapan kelas hanya boleh dilakukan oleh Guru Kelas masing-masing.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeEditDialog}>Batal</Button>
                        <Button onClick={handleSaveEdit} className="bg-primary px-8">Simpan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DELETE CONFIRMATION */}
            <Dialog
                open={confirmDelete}
                onOpenChange={(open) => {
                    if (!open) cancelDeleteDialog();
                    else setConfirmDelete(true);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive font-bold">Padam Pelajar?</DialogTitle>
                    </DialogHeader>
                    <p>Padam rekod <strong>{editing?.name}</strong>? Tindakan ini kekal.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={cancelDeleteDialog}>Batal</Button>
                        <Button variant="destructive" onClick={handleDelete}>Ya, Padam</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
