"use client";

import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import {
    UserPlus,
    Loader2,
    Mail,
    Phone,
    User,
    Lock,
    BookOpen,
} from "lucide-react";
import { RoleItem } from "@/app/types";
import { useEffect } from "react";

interface AddTeacherDialogProps {
    onSuccess: () => void;
    children?: ReactNode;
}

export function AddTeacherDialog({
    onSuccess,
    children,
}: AddTeacherDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [roles, setRoles] = useState<RoleItem[]>([]);
    const [role, setRole] = useState<string>(""); 

        useEffect(() => {
    if (!open) return;

    const fetchRoles = async () => {
        try {
        const res = await fetch("/api/admin/teacher");
        const data: RoleItem[] = await res.json();
        setRoles(data);
        } catch (err) {
        toast.error("Gagal memuatkan peranan guru");
        }
    };

    fetchRoles();
    }, [open]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!role) {
            toast.error("Sila pilih peranan guru");
            return;
        }

        setLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch("/api/admin/teacher", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: formData.get("username"),
                password: formData.get("password"),
                fullname: formData.get("fullname"),
                email: formData.get("email"),
                phone_number: formData.get("phone"),
                role_name: role,
            }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Gagal menambah guru");
                return;
            }

            toast.success("Guru berjaya ditambah");
            setOpen(false);
            onSuccess();
        } catch (error) {
            toast.error("Ralat rangkaian. Sila cuba lagi.");
        } finally {
            setLoading(false);
        }
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ? (
                    children
                ) : (
                    <Button className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/80 shadow-lg">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Tambah Guru
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[500px] rounded-2xl border-2 border-border/50 bg-card shadow-2xl">
                <DialogHeader className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <UserPlus className="w-6 h-6 text-primary" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                            Daftar Guru Baru
                        </DialogTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Isi maklumat guru untuk akses sistem
                    </p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* PERSONAL INFO SECTION */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-primary" />
                            <h3 className="font-semibold text-foreground">
                                Maklumat Peribadi
                            </h3>
                        </div>

                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="fullname"
                                    className="text-sm font-medium"
                                >
                                    Nama Penuh
                                </Label>
                                <Input
                                    id="fullname"
                                    name="fullname"
                                    placeholder="Contoh: Ahmad bin Abu"
                                    required
                                    className="rounded-xl border-2 border-border/30 focus:border-primary/50 h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="username"
                                    className="text-sm font-medium"
                                >
                                    ID Guru
                                </Label>
                                <Input
                                    id="username"
                                    name="username"
                                    placeholder="Contoh: GUR001"
                                    required
                                    className="rounded-xl border-2 border-border/30 focus:border-primary/50 h-11"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="email"
                                        className="text-sm font-medium"
                                    >
                                        <Mail className="w-3 h-3 inline mr-1" />
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="guru@penanti.edu.my"
                                        className="rounded-xl border-2 border-border/30 focus:border-primary/50 h-11"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="phone"
                                        className="text-sm font-medium"
                                    >
                                        <Phone className="w-3 h-3 inline mr-1" />
                                        Telefon
                                    </Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        placeholder="01X-XXXX XXX"
                                        className="rounded-xl border-2 border-border/30 focus:border-primary/50 h-11"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECURITY SECTION */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Lock className="w-4 h-4 text-secondary" />
                            <h3 className="font-semibold text-foreground">
                                Maklumat Keselamatan
                            </h3>
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="password"
                                className="text-sm font-medium"
                            >
                                Kata Laluan Awal
                            </Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Minimum 8 aksara"
                                required
                                className="rounded-xl border-2 border-border/30 focus:border-primary/50 h-11"
                            />
                        </div>
                    </div>

                    {/* ROLE SECTION */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-accent" />
                            <h3 className="font-semibold text-foreground">
                                Peranan Sistem
                            </h3>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                Jenis Guru
                            </Label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger className="w-full rounded-xl border-2 border-border/30 focus:border-primary/50 h-11">
                                    <SelectValue placeholder="Pilih peranan..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-border">
                                 {roles.map((r) => (
                                <SelectItem key={r.role_id} value={r.role_name}>
                                    {r.role_name === "Guru Kelas"
                                        ? "Guru Kelas"
                                        : r.role_name === "Guru Subjek"
                                        ? "Guru Subjek"
                                        : r.role_name === "Penyelaras Subjek"
                                        ? "Penyelaras Subjek"
                                        : r.role_name === "Pengetua"
                                        ? "Pengetua"
                                        : r.role_name}
                                </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="flex-1 rounded-xl border-2 border-border/30 h-11"
                            disabled={loading}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded-xl h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/80 shadow-lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Simpan Guru
                                </>
                            )}
                        </Button>
                    </div>

                    {/* FOOTER NOTE */}
                    <div className="pt-2 border-t border-border/20">
                        <p className="text-xs text-muted-foreground text-center">
                            Guru akan menerima email pengaktifan dan boleh tukar
                            kata laluan pada log masuk pertama.
                        </p>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
