"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
    AlertCircle,
    Edit,
    Filter,
    Loader2,
    Mail,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    ShieldOff,
    Trash2,
    UserPlus,
    Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { HeaderLastUpdated } from "@/components/header-last-updated";

type AdminRow = {
    admin_id: string;
    username?: string | null;
    fullname: string;
    email?: string | null;
    status?: "active" | "inactive" | null;
    created_at?: string | null;
    is_first_login?: boolean | null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeSpaces(value: string) {
    return value.replace(/\s+/g, " ").trim();
}

function getNextAdminId(admins: AdminRow[]) {
    const nextNumber =
        admins.reduce((highest, admin) => {
            const match = /^ADM(\d+)$/i.exec(admin.admin_id ?? "");
            if (!match) return highest;
            return Math.max(highest, Number(match[1]));
        }, 1) + 1;

    return `ADM${String(nextNumber).padStart(3, "0")}`;
}

function statusBadge(status?: string | null) {
    if (status === "inactive") {
        return (
            <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">
                Tidak aktif
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
            Aktif
        </Badge>
    );
}

export default function AdminManagementPage() {
    const [admins, setAdmins] = useState<AdminRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [open, setOpen] = useState(false);
    const [adminId, setAdminId] = useState("");
    const [fullname, setFullname] = useState("");
    const [fullnameTouched, setFullnameTouched] = useState(false);
    const [email, setEmail] = useState("");
    const [emailTouched, setEmailTouched] = useState(false);
    const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
    const [editFullname, setEditFullname] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [deletingAdmin, setDeletingAdmin] = useState<AdminRow | null>(null);
    const [currentAdminId, setCurrentAdminId] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const activeCount = useMemo(
        () => admins.filter((admin) => admin.status !== "inactive").length,
        [admins]
    );
    const inactiveCount = admins.length - activeCount;
    const editingAdmin = useMemo(
        () => admins.find((admin) => admin.admin_id === editingAdminId) ?? null,
        [admins, editingAdminId]
    );

    const filteredAdmins = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return admins;

        return admins.filter((admin) => {
            return (
                admin.fullname?.toLowerCase().includes(query) ||
                admin.admin_id?.toLowerCase().includes(query) ||
                admin.email?.toLowerCase().includes(query)
            );
        });
    }, [admins, searchQuery]);

    const fullnameError =
        fullnameTouched && !fullname.trim() ? "Nama penuh wajib diisi." : "";
    const emailError =
        emailTouched && !email.trim()
            ? "E-mel wajib diisi."
            : emailTouched && email.trim() && !EMAIL_REGEX.test(email.trim())
              ? "Format e-mel tidak sah. Contoh: admin@penanti.edu.my"
              : "";

    useEffect(() => {
        try {
            const parsed = JSON.parse(localStorage.getItem("stg_session") ?? "null");
            setCurrentAdminId(String(parsed?.user_id ?? ""));
        } catch {
            setCurrentAdminId("");
        }

        loadAdmins();
    }, []);

    async function loadAdmins() {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/admins", { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data?.message || "Gagal memuatkan senarai admin");
                return;
            }
            const rows = Array.isArray(data?.data) ? data.data : [];
            setAdmins(rows);
            setAdminId(getNextAdminId(rows));
        } catch {
            toast.error("Ralat rangkaian semasa memuatkan admin");
        } finally {
            setLoading(false);
        }
    }

    function resetCreateForm() {
        setAdminId(getNextAdminId(admins));
        setFullname("");
        setFullnameTouched(false);
        setEmail("");
        setEmailTouched(false);
    }

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setFullnameTouched(true);
        setEmailTouched(true);

        const trimmedName = normalizeSpaces(fullname).toUpperCase();
        const trimmedEmail = email.trim();

        if (!trimmedName || !EMAIL_REGEX.test(trimmedEmail)) {
            return;
        }

        setSaving(true);
        const toastId = toast.loading("Menambah admin...");

        try {
            const res = await fetch("/api/admin/admins", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullname: trimmedName,
                    email: trimmedEmail,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                toast.error(data?.message || "Gagal menambah admin", { id: toastId });
                return;
            }

            toast.success(data?.message || "Admin berjaya ditambah", { id: toastId });
            setOpen(false);
            resetCreateForm();
            await loadAdmins();
        } catch {
            toast.error("Ralat rangkaian. Sila cuba lagi.", { id: toastId });
        } finally {
            setSaving(false);
        }
    }

    function startEdit(admin: AdminRow) {
        setEditingAdminId(admin.admin_id);
        setEditFullname(admin.fullname ?? "");
        setEditEmail(admin.email ?? "");
    }

    async function patchAdmin(payload: Record<string, string>) {
        setSaving(true);
        const toastId = toast.loading("Menyimpan perubahan...");

        try {
            const res = await fetch("/api/admin/admins", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!res.ok) {
                toast.error(data?.message || "Gagal mengemas kini admin", { id: toastId });
                return false;
            }

            toast.success(data?.message || "Admin berjaya dikemas kini", { id: toastId });
            await loadAdmins();
            return true;
        } catch {
            toast.error("Ralat rangkaian. Sila cuba lagi.", { id: toastId });
            return false;
        } finally {
            setSaving(false);
        }
    }

    async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!editingAdminId) return;

        const nextName = normalizeSpaces(editFullname).toUpperCase();
        const nextEmail = editEmail.trim();

        if (!nextName || !EMAIL_REGEX.test(nextEmail)) {
            toast.error("Nama penuh dan e-mel yang sah diperlukan");
            return;
        }

        const ok = await patchAdmin({
            admin_id: editingAdminId,
            fullname: nextName,
            email: nextEmail,
        });

        if (ok) setEditingAdminId(null);
    }

    async function toggleStatus(admin: AdminRow) {
        const nextStatus = admin.status === "inactive" ? "active" : "inactive";
        await patchAdmin({
            admin_id: admin.admin_id,
            status: nextStatus,
        });
    }

    async function deleteAdmin() {
        if (!deletingAdmin) return;

        setSaving(true);
        const toastId = toast.loading("Memadam admin...");

        try {
            const res = await fetch(`/api/admin/admins?admin_id=${encodeURIComponent(deletingAdmin.admin_id)}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (!res.ok) {
                toast.error(data?.message || "Gagal padam admin", { id: toastId });
                return;
            }

            toast.success(data?.message || "Admin berjaya dipadam", { id: toastId });
            setDeletingAdmin(null);
            await loadAdmins();
        } catch {
            toast.error("Ralat rangkaian. Sila cuba lagi.", { id: toastId });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-6">
            <div className="mx-auto max-w-7xl space-y-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 shadow-sm">
                                <ShieldCheck className="h-7 w-7 text-primary" />
                            </div>
                            <div>
                                <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
                                    Pengurusan Admin
                                </h1>
                                <p className="mt-1 font-medium text-muted-foreground">
                                    Mengurus akaun pentadbir dan serahan akses sistem.
                                </p>
                            </div>
                        </div>
                        <HeaderLastUpdated />
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={loadAdmins}
                            disabled={loading}
                            className="border-border shadow-xs hover:bg-accent hover:text-accent-foreground"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Muat Semula
                        </Button>

                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                                    onClick={resetCreateForm}
                                >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Tambah Admin
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-2xl border-2 border-border/50 bg-card shadow-2xl sm:max-w-[500px]">
                                <DialogHeader className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-xl bg-primary/10 p-2">
                                            <UserPlus className="h-6 w-6 text-primary" />
                                        </div>
                                        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
                                            Daftar Admin Baru
                                        </DialogTitle>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Admin baru akan menerima ID Admin dan kata laluan sementara melalui e-mel.
                                    </p>
                                </DialogHeader>

                                <form onSubmit={handleCreate} noValidate className="space-y-5">
                                    <div className="rounded-xl bg-muted p-4">
                                        <Label className="text-xs">ID Admin</Label>
                                        <div className="font-mono font-bold text-primary">
                                            {adminId || "ADM002"}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 text-primary" />
                                            <h3 className="font-semibold text-foreground">Maklumat Admin</h3>
                                        </div>

                                        <div className="grid gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="fullname" className="flex items-center gap-1 text-sm font-medium">
                                                    Nama Penuh <span className="text-red-500">*</span>
                                                </Label>
                                                <Input
                                                    id="fullname"
                                                    value={fullname}
                                                    onChange={(event) => {
                                                        setFullnameTouched(true);
                                                        setFullname(event.target.value.toUpperCase());
                                                    }}
                                                    onBlur={() => setFullnameTouched(true)}
                                                    placeholder="Contoh: NUR AISYAH BINTI ALI"
                                                    aria-invalid={Boolean(fullnameError)}
                                                    className={fullnameError ? "h-11 rounded-xl border-2 border-red-400" : "h-11 rounded-xl border-2 border-border/30"}
                                                    required
                                                />
                                                {fullnameError && (
                                                    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
                                                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                                                        <span>{fullnameError}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="email" className="flex items-center gap-1 text-sm font-medium">
                                                    E-mel <span className="text-red-500">*</span>
                                                </Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    inputMode="email"
                                                    value={email}
                                                    onChange={(event) => {
                                                        setEmailTouched(true);
                                                        setEmail(event.target.value);
                                                    }}
                                                    onBlur={() => setEmailTouched(true)}
                                                    placeholder="admin@penanti.edu.my"
                                                    aria-invalid={Boolean(emailError)}
                                                    className={emailError ? "h-11 rounded-xl border-2 border-red-400" : "h-11 rounded-xl border-2 border-border/30"}
                                                    required
                                                />
                                                {emailError && (
                                                    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
                                                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                                                        <span>{emailError}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-border/20 pt-2">
                                        <p className="text-center text-xs text-muted-foreground">
                                            Admin baru perlu menukar kata laluan semasa log masuk pertama.
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setOpen(false)}
                                            className="h-11 flex-1 rounded-xl border-2 border-border/30"
                                            disabled={saving}
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={saving || Boolean(fullnameError || emailError)}
                                            className="h-11 flex-1 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                                        >
                                            {saving ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Menyimpan...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Simpan Admin
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <Card className="border-border bg-card shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="mb-2 text-sm font-medium text-muted-foreground">Jumlah Admin</p>
                                    <h3 className="text-3xl font-bold text-primary">{admins.length}</h3>
                                </div>
                                <div className="rounded-xl border border-primary/20 bg-primary/10 p-3">
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-border bg-card shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="mb-2 text-sm font-medium text-muted-foreground">Admin Aktif</p>
                                    <h3 className="text-3xl font-bold text-emerald-600">{activeCount}</h3>
                                </div>
                                <div className="rounded-xl border border-emerald-200 bg-emerald-100 p-3">
                                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-border bg-card shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="mb-2 text-sm font-medium text-muted-foreground">Tidak Aktif</p>
                                    <h3 className="text-3xl font-bold text-slate-600">{inactiveCount}</h3>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
                                    <ShieldOff className="h-5 w-5 text-slate-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="overflow-hidden rounded-xl border-border bg-card shadow-md">
                    <CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
                                    <ShieldCheck className="h-5 w-5 text-primary" />
                                    Senarai Admin
                                </CardTitle>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Urus akaun pentadbir yang boleh mengakses sistem.
                                </p>
                            </div>
                            <Badge variant="outline" className="border-primary/30 bg-primary/5 font-medium text-primary">
                                <Filter className="mr-1 h-3 w-3" />
                                {filteredAdmins.length} admin
                            </Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6">
                        <div className="mb-5">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="Cari nama, ID admin atau e-mel..."
                                    className="h-11 rounded-lg border-border pl-10"
                                />
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-border">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="border-b border-border hover:bg-transparent">
                                            <TableHead className="w-16 py-4 text-center font-semibold text-foreground">#</TableHead>
                                            <TableHead className="py-4 font-semibold text-foreground">Nama</TableHead>
                                            <TableHead className="py-4 font-semibold text-foreground">ID Admin</TableHead>
                                            <TableHead className="py-4 font-semibold text-foreground">E-mel</TableHead>
                                            <TableHead className="py-4 font-semibold text-foreground">Status</TableHead>
                                            <TableHead className="py-4 pr-6 text-right font-semibold text-foreground">Tindakan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="py-16">
                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                                        <div className="text-center">
                                                            <p className="font-semibold text-foreground">Memuatkan data admin...</p>
                                                            <p className="mt-1 text-sm text-muted-foreground">Sila tunggu sebentar</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredAdmins.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="py-16">
                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <div className="rounded-full bg-muted/50 p-4">
                                                            <ShieldCheck className="h-12 w-12 text-muted-foreground/50" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="font-semibold text-foreground">Tiada admin dijumpai</p>
                                                            <p className="mt-1 max-w-md text-sm text-muted-foreground">
                                                                {searchQuery ? "Tiada admin yang sepadan dengan carian anda" : "Mulakan dengan menambah admin baharu"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredAdmins.map((admin, index) => (
                                                <TableRow
                                                    key={admin.admin_id}
                                                    className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
                                                >
                                                    <TableCell className="py-4 text-center font-medium text-muted-foreground">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="font-semibold text-foreground">
                                                            {admin.fullname}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="inline-flex rounded-md border border-border bg-muted/30 px-3 py-1.5 font-mono text-foreground">
                                                            {admin.admin_id}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        {admin.email ? (
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                                                <span className="truncate">{admin.email}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground/70">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-4">{statusBadge(admin.status)}</TableCell>
                                                    <TableCell className="py-4 pr-6 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                className="h-8 w-8 text-blue-600"
                                                                onClick={() => startEdit(admin)}
                                                                disabled={saving}
                                                                aria-label={`Edit admin ${admin.admin_id}`}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                className="h-8 w-8 text-rose-600"
                                                                onClick={() => setDeletingAdmin(admin)}
                                                                disabled={
                                                                    saving ||
                                                                    admin.admin_id === currentAdminId ||
                                                                    (admin.status !== "inactive" && activeCount <= 1)
                                                                }
                                                                aria-label={`Padam admin ${admin.admin_id}`}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
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
                </Card>

                <Dialog open={Boolean(editingAdminId)} onOpenChange={(value) => !value && setEditingAdminId(null)}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 font-bold">
                                <Edit className="h-5 w-5 text-primary" />
                                Kemaskini Admin
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleEdit} className="space-y-5 py-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Nama Admin</Label>
                                <Input
                                    id="edit_fullname"
                                    value={editFullname}
                                    onChange={(event) => setEditFullname(event.target.value.toUpperCase())}
                                    placeholder="Contoh: ADMIN SEKOLAH"
                                    className="h-11"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">ID Admin</Label>
                                <Input
                                    value={editingAdminId ?? ""}
                                    disabled
                                    className="h-11 font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit_email" className="text-sm font-medium">E-mel</Label>
                                <Input
                                    id="edit_email"
                                    value={editEmail}
                                    onChange={(event) => setEditEmail(event.target.value)}
                                    placeholder="Contoh: admin@penanti.edu.my"
                                    type="text"
                                    inputMode="email"
                                    title="Masukkan format e-mel yang sah"
                                    aria-invalid={Boolean(editEmail.trim() && !EMAIL_REGEX.test(editEmail.trim()))}
                                    className={editEmail.trim() && !EMAIL_REGEX.test(editEmail.trim()) ? "h-11 border-red-400" : "h-11"}
                                    required
                                />
                                {editEmail.trim() && !EMAIL_REGEX.test(editEmail.trim()) && (
                                    <p className="text-xs font-medium text-red-600">
                                        Format e-mel tidak sah. Contoh: admin@penanti.edu.my
                                    </p>
                                )}
                            </div>

                            <div className="flex w-full flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-between">
                                <Button
                                    type="button"
                                    variant={editingAdmin?.status === "inactive" ? "outline" : "destructive"}
                                    onClick={() => editingAdmin && toggleStatus(editingAdmin)}
                                    disabled={
                                        saving ||
                                        !editingAdmin ||
                                        editingAdmin.admin_id === currentAdminId ||
                                        (editingAdmin.status !== "inactive" && activeCount <= 1)
                                    }
                                >
                                    {editingAdmin?.status === "inactive" ? "Aktifkan" : "Tidak Aktif"}
                                </Button>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setEditingAdminId(null)}
                                        disabled={saving}
                                    >
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={saving}>
                                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {saving ? "Menyimpan..." : "Simpan"}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={Boolean(deletingAdmin)} onOpenChange={(value) => !value && setDeletingAdmin(null)}>
                    <DialogContent className="sm:max-w-[460px]">
                        <DialogHeader>
                            <DialogTitle className="text-destructive font-bold">Padam Admin?</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                            Akaun <span className="font-semibold text-foreground">{deletingAdmin?.fullname}</span> akan dipadam daripada senarai admin.
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setDeletingAdmin(null)} disabled={saving}>
                                Batal
                            </Button>
                            <Button variant="destructive" onClick={deleteAdmin} disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {saving ? "Memadam..." : "Ya, Padam"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
