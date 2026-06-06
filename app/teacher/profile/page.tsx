"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    BookOpen,
    Camera,
    ClipboardList,
    FileSignature,
    FileText,
    GraduationCap,
    IdCard,
    ListChecks,
    ShieldCheck,
    UserCheck,
    UserCog,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ProfileShell } from "@/components/profile/profile-shell";

type Session = {
    user_id: string;
    userType: "teacher";
    role: string;
    session_id?: string | null;
};

function formatTeacherRole(role?: string) {
    switch (String(role ?? "").toLowerCase().trim()) {
        case "class teacher":
            return "Guru Kelas";
        case "subject teacher":
            return "Guru Subjek";
        case "subject coordinator":
            return "Panitia Subjek";
        case "principal":
            return "Pengetua";
        default:
            return "Guru";
    }
}

function formatStaffId(staffId?: string, teacherId?: string) {
    const stored = String(staffId ?? "").trim();
    if (stored) return stored;

    const raw = String(teacherId ?? "").trim();
    if (!raw) return "-";
    if (/^(PNT|staff)[-_a-z0-9]*/i.test(raw)) return raw;

    const compact = raw.replace(/[^a-z0-9]/gi, "").toUpperCase();
    return compact ? `PNT-${compact.slice(-6)}` : "-";
}

export default function TeacherProfilePage() {
    const router = useRouter();
    const [forceFirstLogin, setForceFirstLogin] = useState(false);

    const [me, setMe] = useState<{ name: string; email?: string; teacher_id?: string; staff_id?: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [session, setSession] = useState<Session | null>(null);
    const [sessionChecked, setSessionChecked] = useState(false);

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            setForceFirstLogin(params.get("force") === "1");
        } catch {
            setForceFirstLogin(false);
        }

        try {
            const raw = localStorage.getItem("stg_session");
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed?.userType !== "teacher") return;
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
            body: JSON.stringify({ role: "teacher", user_id: session.user_id }),
        })
            .then((r) => r.json())
            .then((data) =>
                setMe({
                    name: data?.name ?? "Teacher",
                    email: data?.email,
                    teacher_id: data?.teacher_id,
                    staff_id: data?.staff_id,
                })
            )
            .catch(() => setMe({ name: "Teacher" }));
    }, [router, session, sessionChecked]);

    function handleCancelPassword() {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
    }

    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault();

        if (!session) return;
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
                    userType: "teacher",
                    user_id: session.user_id,
                    current_password: forceFirstLogin ? "" : currentPassword,
                    new_password: newPassword,
                    first_login: forceFirstLogin,
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
            router.replace("/teacher/dashboard");
        } catch (err) {
            console.error(err);
            toast.error("Ralat sistem", { id: toastId });
        } finally {
            setLoading(false);
        }
    }

    if (!sessionChecked) return null;
    if (!session) return null;

    const teacherRoleLabel = formatTeacherRole(session.role);
    const accessItems =
        String(session.role ?? "").toLowerCase().trim() === "subject coordinator"
            ? [
                  { label: "Dashboard", icon: UserCheck },
                  { label: "Pengurusan Guru", icon: UserCog },
                  { label: "Kelulusan Markah", icon: ListChecks },
                  { label: "Skema Jawapan", icon: FileSignature },
                  { label: "Laporan", icon: FileText },
              ]
            : [
                  { label: "Dashboard", icon: UserCheck },
                  { label: "Kelas", icon: GraduationCap },
                  { label: "Subjek", icon: BookOpen },
                  { label: "Pemarkahan", icon: ClipboardList },
                  { label: "Imbasan OMR", icon: Camera },
                  { label: "Laporan", icon: FileText },
              ];

    return (
        <ProfileShell
            accountLabel="Akaun Guru"
            name={me?.name ?? "Teacher"}
            email={me?.email}
            roleLabel={teacherRoleLabel}
            note={
                forceFirstLogin
                    ? "Anda sedang melengkapkan log masuk kali pertama. Sila tetapkan kata laluan baharu sebelum meneruskan penggunaan sistem."
                    : "Gunakan halaman ini untuk menyemak maklumat akaun dan memastikan keselamatan akses anda sentiasa terjaga."
            }
            profileDetailsContent={
                <div className="space-y-5">
                    <section className="rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <IdCard className="h-4 w-4 text-primary" />
                            Butiran Guru
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-border/60 bg-background px-4 py-3">
                                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                    ID Guru
                                </div>
                                <div className="mt-1 break-words font-semibold text-foreground">
                                    {formatStaffId(me?.staff_id, me?.teacher_id ?? session?.user_id)}
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
                            <div className="rounded-xl border border-border/60 bg-background px-4 py-3 sm:col-span-2 sm:mx-auto sm:w-[calc(50%-0.375rem)]">
                                <div className="text-center text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                    Jawatan
                                </div>
                                <div className="mt-1 text-center font-semibold text-foreground">
                                    {teacherRoleLabel}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            Akses Sistem
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {accessItems.map((item) => {
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
            securityTitle="Tetapan Kata Laluan"
            securityDescription={
                forceFirstLogin
                    ? "Tetapkan kata laluan baharu untuk mengaktifkan akaun guru anda."
                    : "Kemas kini kata laluan jika diperlukan untuk mengekalkan keselamatan akaun."
            }
            securityContent={
                <form onSubmit={handleChangePassword}>
                    <FieldGroup>
                        {!forceFirstLogin && (
                            <Field>
                                <FieldLabel>Kata Laluan Semasa</FieldLabel>
                                <Input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                />
                            </Field>
                        )}
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
