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
import { AddTeacherDialog } from "./add-teacher-dialog";
import {
    Search,
    Users,
    Filter,
    Loader2,
    UserPlus,
    RefreshCw,
    Mail,
    Shield,
    BookOpen,
    Award,
    Clock,
    Download,
    Edit,
    Trash2,
    SortAsc,
    SortDesc,
    Building2,
    CheckCircle,
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
import { toast } from "sonner";
import { EditTeacherDialog } from "./edit-teacher-dialog";
import { formatMalaysiaTime } from "@/lib/date-utils";
import { exportTeachersPDF } from "@/lib/export-pdf";

type User = {
    id: string;
    name: string;
    identifier: string;
    roles: string[];
    email?: string;
    subjects?: string[];
    lastActive?: string;
    status?: "active" | "inactive";
};

// Client-side only time component
const getTimeLabel = () => formatMalaysiaTime();

const LastUpdatedTime = () => {
    const [time, setTime] = useState<string>(() => getTimeLabel());

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(getTimeLabel());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    return <span className="font-medium text-primary">{time || "Memuatkan..."}</span>;
};

export default function UsersPage() {
    const PAGE_SIZE = 10;
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<"active" | "inactive">("active");
    const [sortBy, setSortBy] = useState<"name" | "roles" | "date">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    async function fetchUsers() {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users?role=teacher");
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error("FETCH USERS ERROR:", err);
            toast.error("Gagal memuatkan senarai guru");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchUsers();
    }, []);

    // ================= FILTER AND SORT =================
    const filteredUsers = users
        .filter((user) => {
            const matchesSearch =
                user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesRole = filterRole === "all" || user.roles.includes(filterRole);
            const matchesStatus = (user.status ?? "active") === filterStatus;

            return matchesSearch && matchesRole && matchesStatus;
        })
        .sort((a, b) => {
            let compareA, compareB;
            
            switch (sortBy) {
                case "name":
                    compareA = a.name.toLowerCase();
                    compareB = b.name.toLowerCase();
                    break;
                case "roles":
                    compareA = a.roles[0]?.toLowerCase() ?? "";
                    compareB = b.roles[0]?.toLowerCase() ?? "";
                    break;

                case "date":
                    compareA = a.lastActive || "";
                    compareB = b.lastActive || "";
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

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterRole, filterStatus, sortBy, sortOrder]);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, filteredUsers.length]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return filteredUsers.slice(startIndex, startIndex + PAGE_SIZE);
    }, [currentPage, filteredUsers]);

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
        const activeUsers = users.filter((u) => (u.status ?? "active") === "active");
        const stats = {
        total: activeUsers.length,
        classTeachers: activeUsers.filter((u) => u.roles.includes("class teacher")).length,
        subjectTeachers: activeUsers.filter((u) => u.roles.includes("subject teacher")).length,
        coordinators: activeUsers.filter((u) => u.roles.includes("subject coordinator")).length,
        principals: activeUsers.filter((u) => u.roles.includes("principal")).length,
        active: activeUsers.length,
        inactive: users.filter((u) => u.status === "inactive").length,
        };

    // ================= ROLE COLORS =================
        const getRoleColor = (role: string) => {
        switch (role) {
            case "admin":
            return {
                bg: "bg-red-100",
                text: "text-red-700",
                border: "border-red-200",
                icon: <Shield className="w-3 h-3 mr-1" />,
            };

            case "principal":
            return {
                bg: "bg-yellow-100",
                text: "text-yellow-700",
                border: "border-yellow-200",
                icon: <CheckCircle className="w-3 h-3 mr-1" />,
            };

            case "class teacher":
            return {
                bg: "bg-blue-100",
                text: "text-blue-700",
                border: "border-blue-200",
                icon: <Building2 className="w-3 h-3 mr-1" />,
            };

            case "subject teacher":
            return {
                bg: "bg-emerald-100",
                text: "text-emerald-700",
                border: "border-emerald-200",
                icon: <BookOpen className="w-3 h-3 mr-1" />,
            };

            case "subject coordinator":
            return {
                bg: "bg-orange-100",
                text: "text-orange-700",
                border: "border-orange-200",
                icon: <Award className="w-3 h-3 mr-1" />,
            };

            // fallback teacher biasa (kalau ada)
            case "teacher":
            return {
                bg: "bg-slate-100",
                text: "text-slate-700",
                border: "border-slate-200",
                icon: <Users className="w-3 h-3 mr-1" />,
            };

            default:
            return {
                bg: "bg-gray-100",
                text: "text-gray-700",
                border: "border-gray-200",
                icon: <Users className="w-3 h-3 mr-1" />,
            };
        }
        };

    // ================= ACTIONS =================
    const handleExport = () => {
        if (filteredUsers.length === 0) {
            toast.error("Tiada data untuk dieksport");
            return;
        }
        const filterLabel =
            filterRole === "all"
                ? undefined
                : filterRole === "class teacher"
                    ? "Guru Kelas"
                    : filterRole === "subject teacher"
                        ? "Guru Subjek"
                        : filterRole === "subject coordinator"
                            ? "Panitia Subjek"
                            : filterRole === "principal"
                                ? "Pengetua"
                                : filterRole;
        exportTeachersPDF(filteredUsers, filterLabel);
        toast.success("PDF sedang dimuat turun...");
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setEditOpen(true);
    };

    const handleDeleteUser = (user: User) => {
        setSelectedUser(user);
        setDeleteOpen(true);
    };

    // ================= TOGGLE SORT =================
    const toggleSort = (field: "name" | "roles" | "date") => {
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
                                <Users className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    Pengurusan Guru
                                </h1>
                                <p className="text-muted-foreground font-medium mt-1">
                                    Mengurus maklumat guru dan kebenaran akses sistem dengan cekap
                                </p>
                            </div>
                        </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                  <div className="flex items-center gap-1">
                                                      <Clock className="w-3.5 h-3.5" />
                                                      <span>Kemas kini: <LastUpdatedTime /></span>
                                                  </div>
                                              </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={fetchUsers}
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

                        <AddTeacherDialog onSuccess={fetchUsers}>
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Tambah Guru
                            </Button>
                        </AddTeacherDialog>
                    </div>
                </div>

                {/* STATS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <Card
                        role="button"
                        tabIndex={0}
                        onClick={() => setFilterRole("all")}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setFilterRole("all");
                            }
                        }}
                        className={`border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-emerald-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                            filterRole === "all" ? "ring-2 ring-emerald-300 border-emerald-300" : ""
                        }`}
                    >
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Jumlah Guru</p>
                                    <h3 className="text-3xl font-bold text-emerald-600">
                                        {stats.total}
                                    </h3>
                                </div>
                                <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-200">
                                    <Users className="w-5 h-5 text-emerald-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        role="button"
                        tabIndex={0}
                        onClick={() => setFilterRole("class teacher")}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setFilterRole("class teacher");
                            }
                        }}
                        className={`border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                            filterRole === "class teacher" ? "ring-2 ring-blue-300 border-blue-300" : ""
                        }`}
                    >
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Guru Kelas</p>
                                    <h3 className="text-3xl font-bold text-blue-600">
                                        {stats.classTeachers}
                                    </h3>
                                </div>
                                <div className="p-3 rounded-xl bg-blue-100 border border-blue-200">
                                    <Building2 className="w-5 h-5 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        role="button"
                        tabIndex={0}
                        onClick={() => setFilterRole("subject coordinator")}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setFilterRole("subject coordinator");
                            }
                        }}
                        className={`border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-violet-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                            filterRole === "subject coordinator" ? "ring-2 ring-violet-300 border-violet-300" : ""
                        }`}
                    >
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Panitia Subjek</p>
                                    <h3 className="text-3xl font-bold text-violet-600">
                                        {stats.coordinators}
                                    </h3>
                                </div>
                                <div className="p-3 rounded-xl bg-violet-100 border border-violet-200">
                                    <Award className="w-5 h-5 text-violet-600" />
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
                                    Senarai Guru
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Urus dan pantau semua guru dalam sistem
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-medium">
                                    <Filter className="w-3 h-3 mr-1" />
                                    {filteredUsers.length} guru
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
                            placeholder="Cari guru (nama, no. staff atau e-mel)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 rounded-lg border-border bg-background focus:border-primary focus:ring-primary/20"
                            />
                        </div>

                        {/* ROLE FILTER + RESET */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="w-full sm:w-[220px]">
                            <Select value={filterRole} onValueChange={setFilterRole}>
                                <SelectTrigger className="h-11 rounded-lg border-border bg-background">
                                <SelectValue placeholder="Pilih Peranan" />
                                </SelectTrigger>

                                <SelectContent className="rounded-lg border-border">
                                <SelectItem value="all">
                                    <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Semua Jawatan
                                    </div>
                                </SelectItem>

                                <SelectItem value="principal">
                                    <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-yellow-600" />
                                    Pengetua
                                    </div>
                                </SelectItem>

                                <SelectItem value="class teacher">
                                    <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-blue-600" />
                                    Guru Kelas
                                    </div>
                                </SelectItem>

                                <SelectItem value="subject teacher">
                                    <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-emerald-600" />
                                    Guru Subjek
                                    </div>
                                </SelectItem>

                                <SelectItem value="subject coordinator">
                                    <div className="flex items-center gap-2">
                                    <Award className="w-4 h-4 text-orange-600" />
                                    Panitia Subjek
                                    </div>
                                </SelectItem>
                                </SelectContent>
                            </Select>
                            </div>

                            <div className="w-full sm:w-[170px]">
                            <Select
                                value={filterStatus}
                                onValueChange={(value) => setFilterStatus(value as "active" | "inactive")}
                            >
                                <SelectTrigger className="h-11 rounded-lg border-border bg-background">
                                <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg border-border">
                                <SelectItem value="active">Aktif</SelectItem>
                                <SelectItem value="inactive">Tidak Aktif</SelectItem>
                                </SelectContent>
                            </Select>
                            </div>

                            <Button
                            variant="outline"
                            onClick={() => {
                                setSearchQuery("");
                                setFilterRole("all");
                                setFilterStatus("active");
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
                                                    Nama Guru
                                                    {sortBy === "name" && (
                                                        sortOrder === "asc" 
                                                            ? <SortAsc className="w-3.5 h-3.5 ml-1" />
                                                            : <SortDesc className="w-3.5 h-3.5 ml-1" />
                                                    )}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">
                                                No. Staff
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">
                                                E-mel
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleSort("roles")}
                                                    className="p-0 h-auto font-semibold hover:bg-transparent"
                                                >
                                                    Jawatan
                                                    {sortBy === "roles" && (
                                                        sortOrder === "asc" 
                                                            ? <SortAsc className="w-3.5 h-3.5 ml-1" />
                                                            : <SortDesc className="w-3.5 h-3.5 ml-1" />
                                                    )}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">
                                                Status
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4 text-right pr-6">
                                                Tindakan
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="py-16">
                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <div className="relative">
                                                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="font-semibold text-foreground">Memuatkan data guru...</p>
                                                            <p className="text-sm text-muted-foreground mt-1">Sila tunggu sebentar</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredUsers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="py-16">
                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <div className="p-4 rounded-full bg-muted/50">
                                                            <Users className="w-12 h-12 text-muted-foreground/50" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="font-semibold text-foreground">Tiada guru dijumpai</p>
                                                            <p className="text-sm text-muted-foreground mt-1 max-w-md">
                                                                {searchQuery || filterRole !== "all" 
                                                                    ? "Tiada guru yang sepadan dengan carian anda"
                                                                    : "Mulakan dengan menambah guru pertama"}
                                                            </p>
                                                        </div>
                                                        {!searchQuery && filterRole === "all" && (
                                                            <AddTeacherDialog onSuccess={fetchUsers}>
                                                                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                                                    <UserPlus className="w-4 h-4 mr-2" />
                                                                    Tambah Guru Pertama
                                                                </Button>
                                                            </AddTeacherDialog>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                           paginatedUsers.map((user, index) => {
  return (
    <TableRow
      key={user.id}
      className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group"
    >
      {/* # Column (Clickable) */}
      <TableCell
        className="py-4 text-center cursor-pointer"
        onClick={() => handleEditUser(user)}
      >
        <div className="font-medium text-muted-foreground hover:text-primary transition-colors">
          {(currentPage - 1) * PAGE_SIZE + index + 1}
        </div>
      </TableCell>

      {/* Nama Guru (Clickable) */}
      <TableCell
        className="py-4 cursor-pointer"
        onClick={() => handleEditUser(user)}
      >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
                      <span className="font-semibold text-primary text-sm">
                {user.name.toUpperCase().charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground hover:text-primary transition-colors">
              {user.name.toUpperCase()}
                    </div>
                    {user.subjects && user.subjects.length > 0 && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <BookOpen className="w-3 h-3" />
                        {user.subjects.slice(0, 2).join(", ")}
                {user.subjects.length > 2 && "..."}
              </div>
            )}
          </div>
        </div>
      </TableCell>

      {/* No. Staff */}
      <TableCell className="py-4">
        <div className="font-mono bg-muted/30 px-3 py-1.5 rounded-md text-foreground border border-border">
          {user.identifier}
        </div>
      </TableCell>

      {/* E-mel */}
      <TableCell className="py-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {user.email ? (
            <>
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{user.email}</span>
            </>
          ) : (
            <span className="text-muted-foreground/70">-</span>
          )}
        </div>
      </TableCell>

      {/* Peranan */}
      <TableCell className="py-4">
        <div className="flex flex-col items-start gap-2">
          {user.roles.map((roles) => {
            const roleColors = getRoleColor(roles);

            return (
              <Badge
                key={roles}
                className={`px-3 py-1.5 rounded-md font-medium border
                  ${roleColors.bg}
                  ${roleColors.text}
                  ${roleColors.border}`}
              >
                {roleColors.icon}
                {roles === "subject teacher"
                  ? "Guru Subjek"
                  : roles === "class teacher"
                  ? "Guru Kelas"
                  : roles === "subject coordinator"
                  ? "Panitia Subjek"
                  : roles === "principal"
                  ? "Pengetua"
                  : roles}
              </Badge>
            );
          })}
        </div>
      </TableCell>

      {/* Status */}
      <TableCell className="py-4">
        {user.status === "inactive" ? (
          <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">
            Tidak Aktif
          </Badge>
        ) : (
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
            Aktif
          </Badge>
        )}
      </TableCell>

      {/* Tindakan */}
      <TableCell className="py-4 text-right pr-6">
        <div className="flex justify-end gap-2">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 text-blue-600"
            onClick={() => handleEditUser(user)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 text-rose-600"
            onClick={() => handleDeleteUser(user)}
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
                                        <span>Menunjukkan</span>
                                        <span className="font-semibold text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}
                                        {" - "}
                                        {Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} </span>
                                        <span>daripada</span>
                                        <span className="font-semibold text-foreground">{users.length}</span>
                                        <span>guru</span>
                                    </div>
                                    <Badge variant="outline" className="ml-2 border-emerald-300 bg-emerald-50 text-emerald-700">
                                        {stats.active} aktif
                                    </Badge>
                                    <Badge variant="outline" className="ml-1 border-slate-300 bg-slate-50 text-slate-700">
                                        {stats.inactive} tidak aktif
                                    </Badge>
                                    {filterRole !== "all" && (
                                        <Badge variant="secondary" className="ml-2">
                                            {filterRole === "class teacher" ? "Guru Kelas" :
                                             filterRole === "subject teacher" ? "Guru Subjek" :
                                             filterRole === "subject coordinator" ? "Panitia Subjek" :
                                             filterRole === "principal" ? "Pengetua" :
                                             filterRole === "teacher" ? "Guru" :
                                             filterRole === "admin" ? "Pentadbir" : filterRole}
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
                                        onClick={fetchUsers}
                                        disabled={loading}
                                        className="h-8"
                                    >
                                        {loading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                                        Muat Semula Data
                                    </Button>
                                </div>
                            </div>

                            {!loading && totalPages > 1 && (
                                <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
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
                    </div>
                </Card>

                <EditTeacherDialog
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    deleteOpen={deleteOpen}
                    onDeleteOpenChange={setDeleteOpen}
                    user={selectedUser}
                    onSuccess={fetchUsers}
                    />

            </div>
        </div>
    );
}
