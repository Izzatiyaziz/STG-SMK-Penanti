"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    BookOpen,
    CalendarDays,
    GraduationCap,
    IdCard,
    ShieldCheck,
    Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ProfileShell } from "@/components/profile/profile-shell";

type Session = {
    user_id: string;
    userType: "admin";
    role: string;
    session_id?: string | null;
};

export default function AdminProfilePage() {
    const router = useRouter();
    const [me, setMe] = useState<{ name: string; email?: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [session, setSession] = useState<Session | null>(null);
    const [sessionChecked, setSessionChecked] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem("stg_session");
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed?.userType !== "admin") return;
            setSession(parsed as Session);
        } catch {
            // ignore
        } finally {
            setSessionChecked(true);
        }
    }, []);

    useEffect(() => {
        if (!sessionChecked) return;
        if (!session) {
            router.replace("/login");
            return;
        }

        fetch("/api/auth/me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "admin", user_id: session.user_id }),
        })
            .then((r) => r.json())
            .then((data) => setMe({ name: data?.name ?? "Admin", email: data?.email }))
            .catch(() => setMe({ name: "Admin" }));
    }, [router, session, sessionChecked]);

    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault();

        if (!session) return;
        if (!currentPassword) {
            toast.error("Kata laluan semasa diperlukan");
            return;
        }
        if (!newPassword || newPassword.length < 8) {
            toast.error("Kata laluan baharu mesti sekurang-kurangnya 8 aksara");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Kata laluan tidak sepadan");
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Mengemas kini kata laluan...");

        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userType: "admin",
                    user_id: session.user_id,
                    current_password: currentPassword,
                    new_password: newPassword,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data?.message ?? "Gagal menukar kata laluan", {
                    id: toastId,
                });
                return;
            }

            toast.success("Kata laluan berjaya dikemaskini", { id: toastId });
            router.replace("/admin/dashboard");
        } catch (err) {
            console.error(err);
            toast.error("Ralat sistem", { id: toastId });
        } finally {
            setLoading(false);
        }
    }

    function handleCancelPassword() {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
    }

    return (
        <ProfileShell
            accountLabel="Akaun Admin"
            name={me?.name ?? "Admin"}
            email={me?.email}
            roleLabel="Pentadbir Sistem"
            note="Akaun ini mengurus data pengguna, peperiksaan, subjek, dan tetapan sistem sekolah. Pastikan kata laluan sentiasa kukuh dan tidak dikongsi."
            profileDetailsContent={
                <div className="space-y-5">
                    <section className="rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <IdCard className="h-4 w-4 text-primary" />
                            Butiran Pentadbir
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-border/60 bg-background px-4 py-3">
                                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                    ID Admin
                                </div>
                                <div className="mt-1 break-words font-semibold text-foreground">
                                    {session?.user_id ?? "-"}
                                </div>
                            </div>
                            <div className="rounded-xl border border-border/60 bg-background px-4 py-3">
                                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                    Status Akaun
                                </div>
                                <div className="mt-1">
                                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                        Aktif
                                    </Badge>
                                </div>
                            </div>
                            <div className="rounded-xl border border-border/60 bg-background px-4 py-3">
                                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                    Peranan
                                </div>
                                <div className="mt-1 font-semibold text-foreground">
                                    Pentadbir Sistem
                                </div>
                            </div>
                            <div className="rounded-xl border border-border/60 bg-background px-4 py-3">
                                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                    Tahap Akses
                                </div>
                                <div className="mt-1 font-semibold text-foreground">
                                    Penuh
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            Akses Sistem
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                            {[
                                { label: "Pengguna", icon: Users },
                                { label: "Kelas", icon: GraduationCap },
                                { label: "Subjek", icon: BookOpen },
                                { label: "Peperiksaan", icon: CalendarDays },
                            ].map((item) => {
                                const Icon = item.icon;

                                return (
                                    <div
                                        key={item.label}
                                        className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-3 py-3"
                                    >
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-semibold text-foreground">
                                            {item.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            }
            securityTitle="Tukar Kata Laluan"
            securityDescription="Gunakan kata laluan baharu yang kuat untuk memastikan akaun pentadbir kekal selamat."
            securityContent={
                <form onSubmit={handleChangePassword}>
                    <FieldGroup>
                        <Field>
                            <FieldLabel>Kata Laluan Semasa</FieldLabel>
                            <Input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                        </Field>
                        <Field>
                            <FieldLabel>Kata Laluan Baharu</FieldLabel>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </Field>
                        <Field>
                            <FieldLabel>Sahkan Kata Laluan Baharu</FieldLabel>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </Field>

                        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancelPassword}
                                disabled={loading}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Menyimpan..." : "Simpan"}
                            </Button>
                        </div>
                    </FieldGroup>
                </form>
            }
        />
    );
}
