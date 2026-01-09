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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type User = {
    id: string;
    name: string;
    identifier: string;
    role: string;
    email?: string;
    subjects?: string[];
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState<string>("all");

    async function fetchUsers() {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users?role=teacher");
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error("FETCH USERS ERROR:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = filterRole === "all" || user.role === filterRole;

        return matchesSearch && matchesRole;
    });

    const getRoleColor = (role: string) => {
        switch (role) {
            case "admin":
                return "bg-destructive/10 text-destructive border-destructive/20";
            case "teacher":
                return "bg-primary/10 text-primary border-primary/20";
            case "subject teacher":
                return "bg-secondary/10 text-secondary border-secondary/20";
            default:
                return "bg-muted/50 text-muted-foreground border-muted/30";
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-b from-background to-muted/20 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <h1 className="text-3xl font-bold font-serif tracking-tight">
                                Guru Management
                            </h1>
                        </div>
                        <p className="text-muted-foreground">
                            Urus senarai guru dan kebenaran akses sistem
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={fetchUsers}
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

                        <AddTeacherDialog onSuccess={fetchUsers}>
                            <Button className="bg-linear-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/80 shadow-lg">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Tambah Guru
                            </Button>
                        </AddTeacherDialog>
                    </div>
                </div>

                {/* STATS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border border-border/50 bg-card shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Jumlah Guru
                                    </p>
                                    <h3 className="text-3xl font-bold mt-2">
                                        {users.length}
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
                                        Guru Subjek
                                    </p>
                                    <h3 className="text-3xl font-bold mt-2 text-secondary">
                                        {
                                            users.filter(
                                                (u) =>
                                                    u.role === "subject teacher"
                                            ).length
                                        }
                                    </h3>
                                </div>
                                <div className="p-3 rounded-full bg-secondary/10">
                                    <Users className="w-6 h-6 text-secondary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-border/50 bg-card shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Admin Sistem
                                    </p>
                                    <h3 className="text-3xl font-bold mt-2 text-destructive">
                                        {
                                            users.filter(
                                                (u) => u.role === "admin"
                                            ).length
                                        }
                                    </h3>
                                </div>
                                <div className="p-3 rounded-full bg-destructive/10">
                                    <Users className="w-6 h-6 text-destructive" />
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
                                    placeholder="Cari nama guru, ID atau email..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="pl-10 border-2 border-border/30 focus:border-primary/50 rounded-xl h-12"
                                />
                            </div>

                            {/* ROLE FILTER */}
                            <div className="flex gap-2">
                                <Button
                                    variant={
                                        filterRole === "all"
                                            ? "default"
                                            : "outline"
                                    }
                                    onClick={() => setFilterRole("all")}
                                    className="rounded-xl"
                                >
                                    Semua
                                </Button>
                                <Button
                                    variant={
                                        filterRole === "teacher"
                                            ? "default"
                                            : "outline"
                                    }
                                    onClick={() => setFilterRole("teacher")}
                                    className="rounded-xl"
                                >
                                    Guru
                                </Button>
                                <Button
                                    variant={
                                        filterRole === "subject teacher"
                                            ? "secondary"
                                            : "outline"
                                    }
                                    onClick={() =>
                                        setFilterRole("subject teacher")
                                    }
                                    className="rounded-xl"
                                >
                                    Guru Subjek
                                </Button>
                                <Button
                                    variant={
                                        filterRole === "admin"
                                            ? "destructive"
                                            : "outline"
                                    }
                                    onClick={() => setFilterRole("admin")}
                                    className="rounded-xl"
                                >
                                    Admin
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* TABLE SECTION */}
                <Card className="border-2 border-border/50 bg-card shadow-lg overflow-hidden">
                    <CardHeader className="border-b border-border/30 bg-linear-to-r from-card to-card/80">
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Senarai Guru ({filteredUsers.length})
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
                                            Nama Guru
                                        </TableHead>
                                        <TableHead className="font-semibold text-foreground py-4">
                                            ID Pengenalan
                                        </TableHead>
                                        <TableHead className="font-semibold text-foreground py-4">
                                            Email
                                        </TableHead>
                                        <TableHead className="font-semibold text-foreground py-4">
                                            Peranan
                                        </TableHead>
                                        <TableHead className="font-semibold text-foreground py-4 w-20">
                                            Tindakan
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
                                                        Memuatkan data...
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="py-12"
                                            >
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <Users className="w-12 h-12 text-muted-foreground/50" />
                                                    <div className="text-center">
                                                        <p className="font-semibold text-foreground">
                                                            Tiada guru dijumpai
                                                        </p>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {searchQuery
                                                                ? "Cuba ubah kata kunci carian"
                                                                : "Tambah guru baru untuk bermula"}
                                                        </p>
                                                    </div>
                                                    {!searchQuery && (
                                                        <AddTeacherDialog
                                                            onSuccess={
                                                                fetchUsers
                                                            }
                                                        >
                                                            <Button
                                                                size="sm"
                                                                className="mt-2"
                                                            >
                                                                <UserPlus className="w-4 h-4 mr-2" />
                                                                Tambah Guru
                                                                Pertama
                                                            </Button>
                                                        </AddTeacherDialog>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredUsers.map((user, index) => (
                                            <TableRow
                                                key={user.id}
                                                className="hover:bg-muted/20 border-b border-border/20 group transition-colors"
                                            >
                                                <TableCell className="py-4 text-center">
                                                    <div className="font-medium text-muted-foreground">
                                                        {index + 1}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                                                            <span className="font-semibold text-primary">
                                                                {user.name.charAt(
                                                                    0
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-foreground">
                                                                {user.name}
                                                            </div>
                                                            {user.subjects && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    {user.subjects.join(
                                                                        ", "
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="py-4">
                                                    <div className="font-mono bg-muted/30 px-3 py-1.5 rounded-lg inline-block">
                                                        {user.identifier}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="py-4">
                                                    <div className="text-muted-foreground">
                                                        {user.email || "-"}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="py-4">
                                                    <Badge
                                                        className={`px-3 py-1.5 rounded-lg font-medium border ${getRoleColor(
                                                            user.role
                                                        )}`}
                                                    >
                                                        {user.role ===
                                                        "subject teacher"
                                                            ? "Guru Subjek"
                                                            : user.role ===
                                                              "teacher"
                                                            ? "Guru"
                                                            : user.role ===
                                                              "admin"
                                                            ? "Admin"
                                                            : user.role}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell className="py-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>

                    {/* FOOTER */}
                    <div className="border-t border-border/30 bg-muted/10 px-6 py-3">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div>
                                Menunjukkan{" "}
                                <span className="font-semibold">
                                    {filteredUsers.length}
                                </span>{" "}
                                daripada{" "}
                                <span className="font-semibold">
                                    {users.length}
                                </span>{" "}
                                guru
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-xs">
                                    Terakhir dikemas kini:{" "}
                                    {new Date().toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* FOOTER NOTES */}
                <div className="text-center text-sm text-muted-foreground pt-4">
                    <p>
                        Sistem Management Guru v1.0 • Semua data disimpan dengan
                        selamat • Sokongan: Unit Teknologi Pendidikan
                    </p>
                </div>
            </div>
        </div>
    );
}
