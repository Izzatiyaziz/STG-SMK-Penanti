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
import { AddTeacherDialog } from "./add-teacher-dialog";
import {
    Search,
    Users,
    Filter,
    MoreVertical,
    Loader2,
    UserPlus,
    RefreshCw,
    Mail,
    Shield,
    BookOpen,
    Award,
    ChevronRight,
    Clock,
    Download,
    Eye,
    Edit,
    Trash2,
    SortAsc,
    SortDesc,
    Building2,
    CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

type User = {
    id: string;
    name: string;
    identifier: string;
    role: string;
    email?: string;
    subjects?: string[];
    lastActive?: string;
    status?: "active" | "inactive";
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

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"name" | "role" | "date">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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

            const matchesRole = filterRole === "all" || user.role === filterRole;

            return matchesSearch && matchesRole;
        })
        .sort((a, b) => {
            let compareA, compareB;
            
            switch (sortBy) {
                case "name":
                    compareA = a.name.toLowerCase();
                    compareB = b.name.toLowerCase();
                    break;
                case "role":
                    compareA = a.role.toLowerCase();
                    compareB = b.role.toLowerCase();
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

    // ================= STATS =================
    const stats = {
        total: users.length,
        teachers: users.filter(u => u.role === "teacher").length,
        subjectTeachers: users.filter(u => u.role === "subject teacher").length,
        admins: users.filter(u => u.role === "admin").length,
        percentageActive: users.length > 0 ? 
            (users.filter(u => u.status === "active").length / users.length * 100) : 0
    };

    // ================= ROLE COLORS =================
    const getRoleColor = (role: string) => {
        switch (role) {
            case "admin":
                return {
                    bg: "bg-destructive/10",
                    text: "text-destructive",
                    border: "border-destructive/20",
                    icon: <Shield className="w-3 h-3 mr-1" />
                };
            case "teacher":
                return {
                    bg: "bg-primary/10",
                    text: "text-primary",
                    border: "border-primary/20",
                    icon: <Users className="w-3 h-3 mr-1" />
                };
            case "subject teacher":
                return {
                    bg: "bg-chart-3/10",
                    text: "text-chart-3",
                    border: "border-chart-3/20",
                    icon: <BookOpen className="w-3 h-3 mr-1" />
                };
            default:
                return {
                    bg: "bg-muted/50",
                    text: "text-muted-foreground",
                    border: "border-muted/30",
                    icon: <Users className="w-3 h-3 mr-1" />
                };
        }
    };

    // ================= ACTIONS =================
    const handleExport = () => {
        toast.success("Data guru berjaya dieksport", {
            description: "Fail sedang dimuat turun...",
        });
    };

    const handleViewUser = (user: User) => {
        toast.info(`Melihat profil ${user.name}`);
    };

    const handleEditUser = (user: User) => {
        toast.info(`Mengedit ${user.name}`);
    };

    const handleDeleteUser = (user: User) => {
        toast.error(`Padam ${user.name}?`, {
            description: "Tindakan ini tidak boleh dipulihkan",
            action: {
                label: "Padam",
                onClick: () => {
                    toast.success(`${user.name} telah dipadam`);
                }
            },
            cancel: {
                label: "Batal",
                onClick: () => {}
            }
        });
    };

    // ================= TOGGLE SORT =================
    const toggleSort = (field: "name" | "role" | "date") => {
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
                                <h1 className="text-3xl font-bold font-sans tracking-tight text-foreground">
                                    Pengurusan Guru
                                </h1>
                                <p className="text-muted-foreground font-medium mt-1">
                                    Urus senarai guru dan kebenaran akses sistem dengan cekap
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5" />
                                <span>Akses Terkawal Selia</span>
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
                            onClick={fetchUsers}
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

                        <AddTeacherDialog onSuccess={fetchUsers}>
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Tambah Guru
                            </Button>
                        </AddTeacherDialog>
                    </div>
                </div>

                {/* STATS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Jumlah Guru</p>
                                    <h3 className="text-3xl font-bold text-foreground">
                                        {stats.total}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Progress 
                                            value={stats.percentageActive} 
                                            className="h-1.5 bg-muted"
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {Math.round(stats.percentageActive)}% aktif
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                                    <Users className="w-5 h-5 text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Guru Kelas</p>
                                    <h3 className="text-3xl font-bold text-chart-2">
                                        {stats.teachers}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Bertanggungjawab mengurus kelas
                                    </p>
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
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Guru Subjek</p>
                                    <h3 className="text-3xl font-bold text-chart-3">
                                        {stats.subjectTeachers}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Mengajar subjek khusus
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-chart-3/10 border border-chart-3/20">
                                    <BookOpen className="w-5 h-5 text-chart-3" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:border-destructive/30">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Admin Sistem</p>
                                    <h3 className="text-3xl font-bold text-destructive">
                                        {stats.admins}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Akses penuh sistem
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                                    <Shield className="w-5 h-5 text-destructive" />
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
                                    {filteredUsers.length} guru ditemui
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
                                    placeholder="Cari guru, ID atau email..."
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
                                                    Nama Guru
                                                    {sortBy === "name" && (
                                                        sortOrder === "asc" 
                                                            ? <SortAsc className="w-3.5 h-3.5 ml-1" />
                                                            : <SortDesc className="w-3.5 h-3.5 ml-1" />
                                                    )}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">
                                                ID Pengenalan
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">
                                                Email
                                            </TableHead>
                                            <TableHead className="font-semibold text-foreground py-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleSort("role")}
                                                    className="p-0 h-auto font-semibold hover:bg-transparent"
                                                >
                                                    Peranan
                                                    {sortBy === "role" && (
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
                                                <TableCell colSpan={6} className="py-16">
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
                                                <TableCell colSpan={6} className="py-16">
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
                                            filteredUsers.map((user, index) => {
                                                const roleColors = getRoleColor(user.role);
                                                return (
                                                    <TableRow
                                                        key={user.id}
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
                                                                            {user.name.charAt(0)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-foreground">
                                                                        {user.name}
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

                                                        <TableCell className="py-4">
                                                            <div className="font-mono bg-muted/30 px-3 py-1.5 rounded-md text-foreground border border-border">
                                                                {user.identifier}
                                                            </div>
                                                        </TableCell>

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

                                                        <TableCell className="py-4">
                                                            <Badge 
                                                                className={`px-3 py-1.5 rounded-md font-medium border ${roleColors.bg} ${roleColors.text} ${roleColors.border} hover:${roleColors.bg.replace('10', '20')}`}
                                                            >
                                                                {roleColors.icon}
                                                                {user.role === "subject teacher"
                                                                    ? "Guru Subjek"
                                                                    : user.role === "teacher"
                                                                    ? "Guru Kelas"
                                                                    : user.role === "admin"
                                                                    ? "Admin"
                                                                    : user.role}
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
                                                                    <DropdownMenuItem onClick={() => handleViewUser(user)}>
                                                                        <Eye className="w-4 h-4 mr-2" />
                                                                        Lihat Profil
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                                                        <Edit className="w-4 h-4 mr-2" />
                                                                        Edit Maklumat
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem 
                                                                        onClick={() => handleDeleteUser(user)}
                                                                        className="text-destructive focus:text-destructive"
                                                                    >
                                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                                        Padam Guru
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
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
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <span className="font-semibold text-foreground">{filteredUsers.length}</span>
                                    <span>daripada</span>
                                    <span className="font-semibold text-foreground">{users.length}</span>
                                    <span>guru dipaparkan</span>
                                </div>
                                {filterRole !== "all" && (
                                    <Badge variant="secondary" className="ml-2">
                                        {filterRole === "subject teacher" ? "Guru Subjek" : 
                                         filterRole === "teacher" ? "Guru Kelas" : 
                                         filterRole === "admin" ? "Admin" : filterRole}
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
                        <span>Sistem Management Guru v2.0 • Akses terkawal sepenuhnya</span>
                    </div>
                </div>
            </div>
        </div>
    );
}