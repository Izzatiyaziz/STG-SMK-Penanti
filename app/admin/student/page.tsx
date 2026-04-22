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
    Search,
    GraduationCap,
    Loader2,
    Building2,
    RefreshCw,
    Filter,
    Download,
    BarChart3,
    Shield,
    CheckCircle,
    AlertCircle,
    Clock,
    SortAsc,
    SortDesc,
    Edit,
    Trash2,
    Save,
    X,
} from "lucide-react";
import { AddStudentDialog } from "./add-student-dialog";
import { ClassItem } from "@/app/types";
import { StudentPage } from "@/app/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

<<<<<<< HEAD
=======
/* ================= TYPES ================= */
type Student = {
    id: string;
    name: string;
    identifier: string;
    email?: string;
    classId?: string | null; // ✅
    className?: string; // optional (display)
    grade?: number; // optional (display)
};

>>>>>>> a3c1c78bc98c6976f363b0faa9dc0a93b21746ff
/* ================= LAST UPDATED TIME ================= */
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

    return <span className="font-medium text-primary">{time || "..."}</span>;
};

/* ================= AUTO CLASS COLOR ================= */
const CLASS_COLOR_PRESETS = [
    { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
    {
        bg: "bg-purple-100",
        text: "text-purple-700",
        border: "border-purple-200",
    },
    {
        bg: "bg-emerald-100",
        text: "text-emerald-700",
        border: "border-emerald-200",
    },
    {
        bg: "bg-orange-100",
        text: "text-orange-700",
        border: "border-orange-200",
    },
    { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
    { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
    {
        bg: "bg-indigo-100",
        text: "text-indigo-700",
        border: "border-indigo-200",
    },
    { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200" },
    { bg: "bg-lime-100", text: "text-lime-700", border: "border-lime-200" },
    { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
    { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
];

const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

const getClassColor = (className: string) => {
    const key = className.trim().toLowerCase();
    const index = hashString(key) % CLASS_COLOR_PRESETS.length;
    return CLASS_COLOR_PRESETS[index];
};

/* ================= AUTO DETECT FORM (TINGKATAN) FROM IC ================= */
const getBirthYearFromIC = (ic: string) => {
    if (!ic) return null;

    const clean = ic.replace(/[^0-9]/g, "");
    if (clean.length < 6) return null;

    const yy = parseInt(clean.slice(0, 2), 10);
    const currentYear = new Date().getFullYear();
    const currentYY = currentYear % 100;

    // rule: kalau YY <= currentYY => 20YY, else => 19YY
    const fullYear = yy <= currentYY ? 2000 + yy : 1900 + yy;
    return fullYear;
};

const estimateFormFromIC = (ic: string) => {
    const birthYear = getBirthYearFromIC(ic);
    if (!birthYear) return null;

    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;

    // Standard anggaran
    if (age === 13) return "Tingkatan 1";
    if (age === 14) return "Tingkatan 2";
    if (age === 15) return "Tingkatan 3";
    if (age === 16) return "Tingkatan 4";
    if (age === 17) return "Tingkatan 5";

    return "Tidak pasti";
};

export default function StudentsPage() {
<<<<<<< HEAD
  const [students, setStudents] = useState<StudentPage[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);
=======
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(false);
>>>>>>> a3c1c78bc98c6976f363b0faa9dc0a93b21746ff

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [selectedForm, setSelectedForm] = useState<string>("all");

    const [sortBy, setSortBy] = useState<"name" | "class" | "form">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

<<<<<<< HEAD
  // edit & delete
  const [editingStudent, setEditingStudent] = useState<StudentPage | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<StudentPage | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    identifier: "",
    className: "",
    level: "",           // Pastikan ini ada
    enrollment_date: "",
  });
=======
    // edit & delete
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [deletingStudent, setDeletingStudent] = useState<Student | null>(
        null
    );
    const [confirmDelete, setConfirmDelete] = useState(false);
>>>>>>> a3c1c78bc98c6976f363b0faa9dc0a93b21746ff

    const [editForm, setEditForm] = useState({
        name: "",
        identifier: "",
        classId: "none",
        email: "",
    });

    /* ================= FETCH STUDENTS ================= */
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

    /* ================= FETCH CLASSES ================= */
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

    /* ================= FILTER & SORT ================= */
    const filteredStudents = useMemo(() => {
        const list = students
            .filter((student) => {
                const matchesSearch =
                    student.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                    student.identifier
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                    student.email
                        ?.toLowerCase()
                        .includes(searchQuery.toLowerCase());

                const matchesClass =
                    selectedClass === "all" ||
                    student.classId === selectedClass;

                const studentForm =
                    estimateFormFromIC(student.identifier) || "Tidak pasti";
                const matchesForm =
                    selectedForm === "all" || studentForm === selectedForm;

                return matchesSearch && matchesClass && matchesForm;
            })
            .sort((a, b) => {
                let compareA = "";
                let compareB = "";

                if (sortBy === "name") {
                    compareA = a.name.toLowerCase();
                    compareB = b.name.toLowerCase();
                } else if (sortBy === "class") {
                    compareA = (a.className || "").toLowerCase();
                    compareB = (b.className || "").toLowerCase();
                } else if (sortBy === "form") {
                    compareA = (
                        estimateFormFromIC(a.identifier) || ""
                    ).toLowerCase();
                    compareB = (
                        estimateFormFromIC(b.identifier) || ""
                    ).toLowerCase();
                }

                if (sortOrder === "asc")
                    return compareA.localeCompare(compareB);
                return compareB.localeCompare(compareA);
            });

        return list;
    }, [students, searchQuery, selectedClass, selectedForm, sortBy, sortOrder]);

    /* ================= STATS ================= */
    const stats = useMemo(() => {
        const total = students.length;
        const withClass = students.filter((s) => s.className).length;

        const forms = students
            .map((s) => estimateFormFromIC(s.identifier))
            .filter(Boolean);
        const formCounts = {
            f1: forms.filter((f) => f === "Tingkatan 1").length,
            f2: forms.filter((f) => f === "Tingkatan 2").length,
            f3: forms.filter((f) => f === "Tingkatan 3").length,
            f4: forms.filter((f) => f === "Tingkatan 4").length,
            f5: forms.filter((f) => f === "Tingkatan 5").length,
        };

        return { total, withClass, ...formCounts };
    }, [students]);

    /* ================= EXPORT ================= */
    const handleExport = () => {
        toast.success("Data pelajar berjaya dieksport", {
            description: "Fail sedang dimuat turun...",
        });
    };

    /* ================= EDIT ================= */
    const handleEditClick = (student: Student) => {
        const cls = classes.find((c) => c.name === student.className);

        setEditingStudent(student);
        setEditForm({
            name: student.name,
            identifier: student.identifier,
            classId: cls?.id ?? "none",
            email: student.email || "",
        });
    };

<<<<<<< HEAD
  /* ================= EDIT ================= */
  const handleEditClick = (student: StudentPage) => {
    setEditingStudent(student);
    setEditForm({
      name: student.name,
      identifier: student.identifier,
      className: student.className || "",
      level: student.level || "",
      enrollment_date: student.enrollment_date || "",
    });
  };
=======
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;
>>>>>>> a3c1c78bc98c6976f363b0faa9dc0a93b21746ff

        const selectedClassObj = classes.find((c) => c.id === editForm.classId);

<<<<<<< HEAD
    setLoading(true);
    try {
        const res = await fetch(`/api/admin/students?id=${editingStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          identifier: editForm.identifier,
          className: editForm.className || null,
          level: editingStudent.level, 
          enrollment_date: editingStudent.enrollment_date
        }),
      });
=======
        setLoading(true);
        try {
            const res = await fetch(
                `/api/admin/users?id=${editingStudent.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: editForm.name,
                        identifier: editForm.identifier,
                        className: selectedClassObj?.name ?? null,
                        email: editForm.email || null,
                    }),
                }
            );
>>>>>>> a3c1c78bc98c6976f363b0faa9dc0a93b21746ff

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || "Gagal mengemas kini pelajar");
            }

            toast.success("Pelajar berjaya dikemas kini", {
                description: `Maklumat ${editForm.name} telah dikemas kini`,
            });

            setEditingStudent(null);
            fetchStudents();
        } catch (err: any) {
            toast.error(err.message || "Gagal mengemas kini pelajar");
        } finally {
            setLoading(false);
        }
    };

    /* ================= DELETE ================= */
    const handleDeleteStudent = async () => {
        if (!editingStudent) return;

        setLoading(true);
        try {
            await fetch(`/api/admin/users?id=${editingStudent.id}`, {
                method: "DELETE",
            });

<<<<<<< HEAD
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/?id=${deletingStudent.id}`, {
        method: "DELETE",
      });
=======
            toast.success("Pelajar berjaya dipadam");
            setEditingStudent(null);
            fetchStudents();
        } catch {
            toast.error("Gagal memadam pelajar");
        } finally {
            setLoading(false);
            setConfirmDelete(false);
        }
    };
>>>>>>> a3c1c78bc98c6976f363b0faa9dc0a93b21746ff

    /* ================= SORT TOGGLE ================= */
    const toggleSort = (field: "name" | "class" | "form") => {
        if (sortBy === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortOrder("asc");
        }
    };

<<<<<<< HEAD
      if (!res.ok) {
        throw new Error(data.message || "Gagal memadam pelajar");
      }
      toast.success("Pelajar berjaya dipadam", {
        description: `${deletingStudent.name} telah dipadam dari sistem`,
      });

      setDeletingStudent(null);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Gagal memadam pelajar");
    } finally {
      setLoading(false);
    }
  };

  /* ================= SORT TOGGLE ================= */
  const toggleSort = (field: "name" | "class" | "form") => {
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
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
                <GraduationCap className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Pengurusan Pelajar
                </h1>
                <p className="text-muted-foreground font-medium mt-1">
                  Urus senarai pelajar, kelas & tingkatan secara automatik
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
                <span>
                  Kemas kini: <LastUpdatedTime />
                </span>
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

            <AddStudentDialog onSuccess={fetchStudents} classes={classes} />
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Jumlah Pelajar
                  </p>
                  <h3 className="text-3xl font-bold text-foreground">{stats.total}</h3>
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
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Pelajar Ada Kelas
                  </p>
                  <h3 className="text-3xl font-bold text-chart-2">{stats.withClass}</h3>
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
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    T1/T2/T3/T4/T5
                  </p>
                  <h3 className="text-sm font-semibold text-foreground">
                    {stats.f1}/{stats.f2}/{stats.f3}/{stats.f4}/{stats.f5}
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-chart-3/10 border border-chart-3/20">
                  <BarChart3 className="w-5 h-5 text-chart-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MAIN CARD */}
        <Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
          <CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Filter className="w-5 h-5 text-primary" />
                  Senarai Pelajar
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Carian & penapisan berdasarkan kelas dan tingkatan
                </p>
              </div>

              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/5 text-primary font-medium"
              >
                <Filter className="w-3 h-3 mr-1" />
                {filteredStudents.length} pelajar ditemui
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* FILTERS */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              {/* SEARCH */}
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau IC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 rounded-lg border-border bg-background focus:border-primary focus:ring-primary/20"
                />
              </div>

              {/* CLASS FILTER */}
              <div className="w-full sm:w-[220px]">
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
=======
    return (
        <div className="min-h-screen bg-background p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
                                <GraduationCap className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground">
                                    Pengurusan Pelajar
                                </h1>
                                <p className="text-muted-foreground font-medium mt-1">
                                    Urus senarai pelajar, kelas & tingkatan
                                    secara automatik
                                </p>
                            </div>
>>>>>>> a3c1c78bc98c6976f363b0faa9dc0a93b21746ff
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5" />
                                <span>Data Terkawal Selia</span>
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

                {/* STATS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">
                                        Jumlah Pelajar
                                    </p>
                                    <h3 className="text-3xl font-bold text-foreground">
                                        {stats.total}
                                    </h3>
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
                                    <p className="text-sm font-medium text-muted-foreground mb-2">
                                        Pelajar Ada Kelas
                                    </p>
                                    <h3 className="text-3xl font-bold text-chart-2">
                                        {stats.withClass}
                                    </h3>
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
                                    <p className="text-sm font-medium text-muted-foreground mb-2">
                                        T1/T2/T3/T4/T5
                                    </p>
                                    <h3 className="text-sm font-semibold text-foreground">
                                        {stats.f1}/{stats.f2}/{stats.f3}/
                                        {stats.f4}/{stats.f5}
                                    </h3>
                                </div>
                                <div className="p-3 rounded-xl bg-chart-3/10 border border-chart-3/20">
                                    <BarChart3 className="w-5 h-5 text-chart-3" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* MAIN CARD */}
                <Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
                    <CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                                    <Filter className="w-5 h-5 text-primary" />
                                    Senarai Pelajar
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Carian & penapisan berdasarkan kelas dan
                                    tingkatan
                                </p>
                            </div>

                            <Badge
                                variant="outline"
                                className="border-primary/30 bg-primary/5 text-primary font-medium"
                            >
                                <Filter className="w-3 h-3 mr-1" />
                                {filteredStudents.length} pelajar ditemui
                            </Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6">
                        {/* FILTERS */}
                        <div className="flex flex-col lg:flex-row gap-4 mb-6">
                            {/* SEARCH */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari nama atau IC..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="pl-10 h-11 rounded-lg border-border bg-background focus:border-primary focus:ring-primary/20"
                                />
                            </div>

                            {/* CLASS FILTER */}
                            <div className="w-full sm:w-[220px]">
                                <Select
                                    value={selectedClass}
                                    onValueChange={setSelectedClass}
                                >
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
                                            <SelectItem
                                                key={cls.id}
                                                value={cls.name}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4" />
                                                    {cls.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* FORM FILTER */}
                            <div className="w-full sm:w-[220px]">
                                <Select
                                    value={selectedForm}
                                    onValueChange={setSelectedForm}
                                >
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

                                        <SelectItem value="Tingkatan 1">
                                            Tingkatan 1
                                        </SelectItem>
                                        <SelectItem value="Tingkatan 2">
                                            Tingkatan 2
                                        </SelectItem>
                                        <SelectItem value="Tingkatan 3">
                                            Tingkatan 3
                                        </SelectItem>
                                        <SelectItem value="Tingkatan 4">
                                            Tingkatan 4
                                        </SelectItem>
                                        <SelectItem value="Tingkatan 5">
                                            Tingkatan 5
                                        </SelectItem>
                                        <SelectItem value="Tidak pasti">
                                            Tidak pasti
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* RESET */}
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearchQuery("");
                                    setSelectedClass("all");
                                    setSelectedForm("all");
                                    setSortBy("name");
                                    setSortOrder("asc");
                                }}
                                className="h-11 rounded-lg border-border hover:bg-accent hover:text-accent-foreground"
                            >
                                Reset
                            </Button>
                        </div>

                        {/* TABLE */}
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
                                                    onClick={() =>
                                                        toggleSort("name")
                                                    }
                                                    className="p-0 h-auto font-semibold hover:bg-transparent"
                                                >
                                                    Nama Pelajar
                                                    {sortBy === "name" &&
                                                        (sortOrder === "asc" ? (
                                                            <SortAsc className="w-3.5 h-3.5 ml-1" />
                                                        ) : (
                                                            <SortDesc className="w-3.5 h-3.5 ml-1" />
                                                        ))}
                                                </Button>
                                            </TableHead>

                                            <TableHead className="font-semibold text-foreground py-4">
                                                No. Kad Pengenalan
                                            </TableHead>

                                            <TableHead className="font-semibold text-foreground py-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        toggleSort("form")
                                                    }
                                                    className="p-0 h-auto font-semibold hover:bg-transparent"
                                                >
                                                    Tingkatan
                                                    {sortBy === "form" &&
                                                        (sortOrder === "asc" ? (
                                                            <SortAsc className="w-3.5 h-3.5 ml-1" />
                                                        ) : (
                                                            <SortDesc className="w-3.5 h-3.5 ml-1" />
                                                        ))}
                                                </Button>
                                            </TableHead>

                                            <TableHead className="font-semibold text-foreground py-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        toggleSort("class")
                                                    }
                                                    className="p-0 h-auto font-semibold hover:bg-transparent"
                                                >
                                                    Kelas
                                                    {sortBy === "class" &&
                                                        (sortOrder === "asc" ? (
                                                            <SortAsc className="w-3.5 h-3.5 ml-1" />
                                                        ) : (
                                                            <SortDesc className="w-3.5 h-3.5 ml-1" />
                                                        ))}
                                                </Button>
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
                                                    colSpan={7}
                                                    className="py-16"
                                                >
                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                                        <div className="text-center">
                                                            <p className="font-semibold text-foreground">
                                                                Memuatkan data
                                                                pelajar...
                                                            </p>
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                Sila tunggu
                                                                sebentar
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredStudents.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={7}
                                                    className="py-16"
                                                >
                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <div className="p-4 rounded-full bg-muted/50">
                                                            <GraduationCap className="w-12 h-12 text-muted-foreground/50" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="font-semibold text-foreground">
                                                                Tiada pelajar
                                                                dijumpai
                                                            </p>
                                                            <p className="text-sm text-muted-foreground mt-1 max-w-md">
                                                                Tiada data
                                                                sepadan dengan
                                                                carian/penapisan
                                                                anda
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredStudents.map(
                                                (student, index) => {
                                                    const form =
                                                        estimateFormFromIC(
                                                            student.identifier
                                                        ) || "Tidak pasti";

                                                    return (
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
                                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
                                                                        <span className="font-semibold text-primary text-sm">
                                                                            {student.name.charAt(
                                                                                0
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleEditClick(
                                                                                student
                                                                            )
                                                                        }
                                                                        className="font-semibold text-foreground hover:underline text-left"
                                                                    >
                                                                        {
                                                                            student.name
                                                                        }
                                                                    </button>
                                                                </div>
                                                            </TableCell>

                                                            <TableCell className="py-4">
                                                                <div className="font-mono bg-muted/30 px-3 py-1.5 rounded-md text-foreground border border-border">
                                                                    {
                                                                        student.identifier
                                                                    }
                                                                </div>
                                                            </TableCell>

                                                            <TableCell className="py-4">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`px-3 py-1.5 rounded-md font-medium border ${
                                                                        form ===
                                                                        "Tidak pasti"
                                                                            ? "border-border text-muted-foreground"
                                                                            : "border-primary/30 text-primary bg-primary/5"
                                                                    }`}
                                                                >
                                                                    <GraduationCap className="w-3 h-3 mr-1" />
                                                                    {form}
                                                                </Badge>
                                                            </TableCell>

                                                            <TableCell className="py-4">
                                                                {student.className ? (
                                                                    <Badge
                                                                        className={`px-3 py-1.5 rounded-md font-medium border transition-colors
                                    ${getClassColor(student.className).bg}
                                    ${getClassColor(student.className).text}
                                    ${getClassColor(student.className).border}
                                  `}
                                                                    >
                                                                        <Building2 className="w-3 h-3 mr-1" />
                                                                        {
                                                                            student.className
                                                                        }
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="px-3 py-1.5 rounded-md text-muted-foreground border-border"
                                                                    >
                                                                        <AlertCircle className="w-3 h-3 mr-1" />
                                                                        Tiada
                                                                        kelas
                                                                    </Badge>
                                                                )}
                                                            </TableCell>

                                                            <TableCell className="py-4">
                                                                <Badge className="px-3 py-1.5 rounded-md font-medium border border-primary/30 bg-primary/10 text-primary">
                                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                                    Aktif
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                }
                                            )
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
                                <span className="font-semibold text-foreground">
                                    {filteredStudents.length}
                                </span>
                                <span>daripada</span>
                                <span className="font-semibold text-foreground">
                                    {students.length}
                                </span>
                                <span>pelajar dipaparkan</span>
                            </div>

                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>
                                    Kemas kini: <LastUpdatedTime />
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* ================= EDIT DIALOG ================= */}
                <Dialog
                    open={!!editingStudent}
                    onOpenChange={(open) => !open && setEditingStudent(null)}
                >
                    <DialogContent className="rounded-lg border-border sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                                <Edit className="w-5 h-5 text-primary" />
                                Edit Maklumat Pelajar
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Kemas kini maklumat pelajar yang dipilih.
                            </DialogDescription>
                        </DialogHeader>

                        <form
                            onSubmit={handleSaveEdit}
                            className="space-y-4 pt-2"
                        >
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="edit-name"
                                        className="font-medium"
                                    >
                                        Nama Pelajar
                                    </Label>
                                    <Input
                                        id="edit-name"
                                        value={editForm.name}
                                        onChange={(e) =>
                                            setEditForm({
                                                ...editForm,
                                                name: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="edit-identifier"
                                        className="font-medium"
                                    >
                                        No. Kad Pengenalan
                                    </Label>
                                    <Input
                                        id="edit-identifier"
                                        value={editForm.identifier}
                                        onChange={(e) =>
                                            setEditForm({
                                                ...editForm,
                                                identifier: e.target.value,
                                            })
                                        }
                                        required
                                        className="font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="edit-class"
                                        className="font-medium"
                                    >
                                        Kelas
                                    </Label>
                                    <Select
                                        value={editForm.classId}
                                        onValueChange={(value) =>
                                            setEditForm({
                                                ...editForm,
                                                classId: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih kelas (optional)" />
                                        </SelectTrigger>

                                        <SelectContent>
                                            <SelectItem value="none">
                                                Tiada kelas
                                            </SelectItem>

                                            {classes.map((cls) => (
                                                <SelectItem value={cls.id}>
                                                    Tingkatan {cls.grade} -{" "}
                                                    {cls.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {confirmDelete && (
                                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
                                    <p className="text-sm text-destructive font-medium mb-3">
                                        Anda pasti ingin memadam pelajar ini?
                                        Tindakan ini tidak boleh dibatalkan.
                                    </p>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                setConfirmDelete(false)
                                            }
                                        >
                                            Batal
                                        </Button>

                                        <Button
                                            variant="destructive"
                                            onClick={handleDeleteStudent}
                                            disabled={loading}
                                        >
                                            Ya, Padam
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <DialogFooter className="pt-6 flex justify-between">
                                {/* DELETE */}
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => setConfirmDelete(true)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Padam Pelajar
                                </Button>

                                {/* ACTION */}
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setEditingStudent(null)}
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Batal
                                    </Button>

                                    <Button type="submit" disabled={loading}>
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Simpan
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* FOOTER NOTES */}
                <div className="text-center pt-6">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-card/50 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
                        <Shield className="w-4 h-4" />
                        <span>
                            Sistem Pemarkahan Pelajar v2.0 • Data terlindung
                            sepenuhnya
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
