"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, GraduationCap, Loader2, Shield, User } from "lucide-react";

type LoginRole = "student" | "teacher" | "admin";
type LoginPayload = {
    role: LoginRole;
    ic_number?: string;
    username?: string;
    password?: string;
    selected_teacher_role?: string | null;
    admin_id?: string;
};
type PasswordChangeSession = {
    user_id: string;
    role: string;
    session_id?: string | null;
    roles?: string[];
};

const TEACHER_ROLE_LABELS: Record<string, string> = {
    principal: "Pengetua",
    "class teacher": "Guru Kelas",
    "subject teacher": "Guru Subjek",
    "subject coordinator": "Panitia Subjek",
};

function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={show ? "Sembunyikan kata laluan" : "Tunjukkan kata laluan"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 rounded-sm"
        >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
    );
}

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const [loading, setLoading] = useState(false);
    const [, setRole] = useState<LoginRole>("student");
    const [teacherRoles, setTeacherRoles] = useState<string[]>([]);
    const [selectedTeacherRole, setSelectedTeacherRole] = useState("");
    const router = useRouter();

    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [tempData, setTempData] = useState<PasswordChangeSession | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showTeacherPassword, setShowTeacherPassword] = useState(false);
    const [showAdminPassword, setShowAdminPassword] = useState(false);

    const [showForgotDialog, setShowForgotDialog] = useState(false);
    const [forgotRole, setForgotRole] = useState<"teacher" | "admin">("teacher");
    const [forgotIdentifier, setForgotIdentifier] = useState("");

    const hasLength = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
    const isPasswordStrong = hasLength && hasUpper && hasNumber && hasSymbol;

    async function handleSubmit(
        e: React.FormEvent<HTMLFormElement>,
        submitRole: LoginRole
    ) {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        const toastId = toast.loading("Log masuk sedang diproses...");

        try {
            const formData = new FormData(e.currentTarget);
            const payload: LoginPayload = { role: submitRole };

            if (submitRole === "student") {
                payload.ic_number = String(formData.get("ic_number") ?? "");
            }

            if (submitRole === "teacher") {
                payload.username = String(formData.get("username") ?? "");
                payload.password = String(formData.get("password") ?? "");
                payload.selected_teacher_role = selectedTeacherRole || null;
            }

            if (submitRole === "admin") {
                payload.admin_id = String(formData.get("admin_id") ?? "");
                payload.password = String(formData.get("password") ?? "");
            }

            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Log masuk gagal", { id: toastId });
                return;
            }

            if (submitRole === "teacher") {
                const roles: string[] = data.roles ?? [];

                if (roles.length > 1 && !selectedTeacherRole) {
                    setTeacherRoles(roles);
                    toast.info("Sila pilih peranan guru dahulu", { id: toastId });
                    return;
                }

                const finalRole = selectedTeacherRole || roles[0] || "subject teacher";

                if (data.must_change_password) {
                    setTempData({
                        user_id: data.user_id,
                        role: finalRole,
                        session_id: data.session_id ?? null,
                        roles,
                    });
                    setShowPasswordDialog(true);
                    toast.dismiss(toastId);
                    return;
                }

                await proceedToDashboard(
                    data.user_id,
                    "teacher",
                    finalRole,
                    data.session_id ?? null,
                    toastId,
                    roles
                );
                return;
            }

            await proceedToDashboard(
                data.user_id,
                submitRole,
                submitRole,
                data.session_id ?? null,
                toastId
            );

        } catch (err) {
            console.error("LOGIN ERROR:", err);
            toast.error("Ralat sistem. Sila cuba lagi.", { id: toastId });
        } finally {
            if (!showPasswordDialog) setLoading(false);
        }
    }

    async function proceedToDashboard(
        userId: string,
        userType: string,
        specificRole: string,
        sessionId?: string | null,
        toastId?: string | number,
        roles?: string[]
    ) {
        localStorage.setItem(
            "stg_session",
            JSON.stringify({
                userType: userType,
                role: String(specificRole).toLowerCase().trim(),
                roles: Array.isArray(roles)
                    ? roles.map((r) => String(r).toLowerCase().trim())
                    : undefined,
                user_id: userId,
                session_id: sessionId ?? null,
            })
        );
        if (toastId) toast.success("Log masuk berjaya!", { id: toastId });

        if (userType === "admin") router.push("/admin/dashboard");
        else if (userType === "teacher") {
            const r = String(specificRole).toLowerCase().trim();
            if (r === "principal") router.push("/principal/dashboard");
            else if (r === "subject coordinator") router.push("/coordinator/dashboard");
            else router.push("/teacher/dashboard");
        } else router.push("/student/dashboard");
    }

    async function handlePasswordChange(e: React.FormEvent) {
        e.preventDefault();

        if (!isPasswordStrong) {
            toast.error("Sila pastikan kata laluan memenuhi semua kriteria yang ditetapkan.");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Kata laluan tidak sepadan. Sila semak semula.");
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
                    user_id: tempData?.user_id,
                    current_password: "",
                    new_password: newPassword,
                    first_login: true,
                }),
            });

            if (!res.ok) throw new Error("Gagal mengemas kini kata laluan");

            setShowPasswordDialog(false);
            await proceedToDashboard(
                tempData?.user_id ?? "",
                "teacher",
                tempData?.role ?? "subject teacher",
                tempData?.session_id ?? null,
                toastId,
                Array.isArray(tempData?.roles) ? tempData.roles : undefined
            );

        } catch {
            toast.error("Gagal menukar kata laluan. Sila cuba lagi.", { id: toastId });
        } finally {
            setLoading(false);
        }
    }

    async function handleForgotPassword(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading("Memproses permintaan anda...");

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role: forgotRole,
                    identifier: forgotIdentifier,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Gagal memproses permintaan", { id: toastId });
                return;
            }

            toast.success("Kata laluan sementara telah dihantar ke e-mel anda.", { id: toastId });
            setShowForgotDialog(false);
            setForgotIdentifier("");
        } catch {
            toast.error("Ralat pelayan. Sila cuba lagi.", { id: toastId });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="relative">
            <Tabs
                defaultValue="student"
                className={cn("w-full", className)}
                onValueChange={(v) => {
                    setRole(v as LoginRole);
                    setTeacherRoles([]);
                    setSelectedTeacherRole("");
                }}
            >
                <TabsList className="grid grid-cols-3 w-full h-11">
                    <TabsTrigger value="student" className="flex items-center gap-1.5">
                        <User size={14} />
                        Pelajar
                    </TabsTrigger>
                    <TabsTrigger value="teacher" className="flex items-center gap-1.5">
                        <GraduationCap size={14} />
                        Guru
                    </TabsTrigger>
                    <TabsTrigger value="admin" className="flex items-center gap-1.5">
                        <Shield size={14} />
                        Admin
                    </TabsTrigger>
                </TabsList>

                {/* STUDENT TAB */}
                <TabsContent value="student">
                    <form onSubmit={(e) => handleSubmit(e, "student")} {...props}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>No. IC</FieldLabel>
                                <Input
                                    name="ic_number"
                                    placeholder="050101-01-1234"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    required
                                />
                                <FieldDescription className="text-xs">
                                    Masukkan nombor IC — contoh: 050101-01-1234
                                </FieldDescription>
                            </Field>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 size={15} className="animate-spin" />}
                                {loading ? "Sedang log masuk..." : "Log Masuk sebagai Pelajar"}
                            </Button>
                        </FieldGroup>
                    </form>
                </TabsContent>

                {/* TEACHER TAB */}
                <TabsContent value="teacher">
                    <form onSubmit={(e) => handleSubmit(e, "teacher")} {...props}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>No. Staff</FieldLabel>
                                <Input name="username" autoComplete="username" required />
                            </Field>
                            <Field>
                                <div className="flex justify-between items-center w-full">
                                    <FieldLabel>Kata Laluan</FieldLabel>
                                    <button
                                        type="button"
                                        onClick={() => { setForgotRole("teacher"); setShowForgotDialog(true); }}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Lupa Kata Laluan?
                                    </button>
                                </div>
                                <div className="relative">
                                    <Input
                                        name="password"
                                        type={showTeacherPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        required
                                        className="pr-10"
                                    />
                                    <PasswordToggle
                                        show={showTeacherPassword}
                                        onToggle={() => setShowTeacherPassword((v) => !v)}
                                    />
                                </div>
                            </Field>

                            {teacherRoles.length > 0 && (
                                <Field>
                                    <FieldLabel>Pilih Jawatan</FieldLabel>
                                    <Select
                                        value={selectedTeacherRole}
                                        onValueChange={setSelectedTeacherRole}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="-- Pilih Jawatan --" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teacherRoles.map((r) => (
                                                <SelectItem key={r} value={r}>
                                                    {TEACHER_ROLE_LABELS[r] ?? r}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 size={15} className="animate-spin" />}
                                {loading ? "Sedang log masuk..." : "Log Masuk sebagai Guru"}
                            </Button>
                        </FieldGroup>
                    </form>
                </TabsContent>

                {/* ADMIN TAB */}
                <TabsContent value="admin">
                    <form onSubmit={(e) => handleSubmit(e, "admin")} {...props}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>ID Admin</FieldLabel>
                                <Input name="admin_id" autoComplete="username" required />
                            </Field>
                            <Field>
                                <div className="flex justify-between items-center w-full">
                                    <FieldLabel>Kata Laluan</FieldLabel>
                                    <button
                                        type="button"
                                        onClick={() => { setForgotRole("admin"); setShowForgotDialog(true); }}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Lupa Kata Laluan?
                                    </button>
                                </div>
                                <div className="relative">
                                    <Input
                                        name="password"
                                        type={showAdminPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        required
                                        className="pr-10"
                                    />
                                    <PasswordToggle
                                        show={showAdminPassword}
                                        onToggle={() => setShowAdminPassword((v) => !v)}
                                    />
                                </div>
                            </Field>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 size={15} className="animate-spin" />}
                                {loading ? "Sedang log masuk..." : "Log Masuk sebagai Admin"}
                            </Button>
                        </FieldGroup>
                    </form>
                </TabsContent>
            </Tabs>

            {/* PASSWORD CHANGE DIALOG */}
            {showPasswordDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-background w-full max-w-md p-6 rounded-xl border shadow-2xl">
                        <h2 className="text-xl font-bold mb-2">Tukar Kata Laluan</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Ini adalah log masuk pertama anda. Sila tukar kata laluan sementara anda.
                        </p>

                        <form onSubmit={handlePasswordChange}>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel>Kata Laluan Baharu</FieldLabel>
                                    <div className="relative">
                                        <Input
                                            type={showNewPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            placeholder="Minima 8 aksara"
                                            className="pr-10"
                                        />
                                        <PasswordToggle
                                            show={showNewPassword}
                                            onToggle={() => setShowNewPassword((v) => !v)}
                                        />
                                    </div>

                                    {newPassword.length > 0 && (
                                        <div className="mt-2 text-xs p-3 rounded-lg border bg-muted/30">
                                            <p className={cn(
                                                "font-bold mb-2",
                                                isPasswordStrong ? "text-green-500" : "text-amber-500"
                                            )}>
                                                Kekuatan: {isPasswordStrong ? "Kuat" : "Lemah"}
                                            </p>
                                            <ul className="space-y-1 text-muted-foreground">
                                                <li className={hasLength ? "text-green-500 font-medium" : ""}>
                                                    {hasLength ? "✓" : "○"} Sekurang-kurangnya 8 aksara
                                                </li>
                                                <li className={hasUpper ? "text-green-500 font-medium" : ""}>
                                                    {hasUpper ? "✓" : "○"} Sekurang-kurangnya 1 huruf besar
                                                </li>
                                                <li className={hasNumber ? "text-green-500 font-medium" : ""}>
                                                    {hasNumber ? "✓" : "○"} Sekurang-kurangnya 1 nombor
                                                </li>
                                                <li className={hasSymbol ? "text-green-500 font-medium" : ""}>
                                                    {hasSymbol ? "✓" : "○"} Sekurang-kurangnya 1 simbol (@, !, #, dll)
                                                </li>
                                            </ul>
                                        </div>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel>Sahkan Kata Laluan Baharu</FieldLabel>
                                    <div className="relative">
                                        <Input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="pr-10"
                                        />
                                        <PasswordToggle
                                            show={showConfirmPassword}
                                            onToggle={() => setShowConfirmPassword((v) => !v)}
                                        />
                                    </div>
                                    {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                                        <p className="text-xs text-destructive mt-1">Kata laluan tidak sepadan</p>
                                    )}
                                </Field>

                                <div className="flex gap-3 mt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => {
                                            setShowPasswordDialog(false);
                                            setLoading(false);
                                            setNewPassword("");
                                            setConfirmPassword("");
                                        }}
                                    >
                                        Batal
                                    </Button>
                                    <Button type="submit" className="flex-1" disabled={loading || !isPasswordStrong}>
                                        {loading && <Loader2 size={15} className="animate-spin" />}
                                        {loading ? "Menyimpan..." : "Simpan & Masuk"}
                                    </Button>
                                </div>
                            </FieldGroup>
                        </form>
                    </div>
                </div>
            )}

            {/* FORGOT PASSWORD DIALOG */}
            {showForgotDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-background w-full max-w-md p-6 rounded-xl border shadow-2xl">
                        <h2 className="text-xl font-bold mb-2">Lupa Kata Laluan?</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            Masukkan ID {forgotRole === "teacher" ? "Guru" : "Admin"} anda. Sistem akan menetapkan semula kata laluan anda dan menghantarnya ke e-mel yang didaftarkan.
                        </p>

                        <form onSubmit={handleForgotPassword}>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel>ID {forgotRole === "teacher" ? "Guru" : "Admin"}</FieldLabel>
                                    <Input
                                        type="text"
                                        value={forgotIdentifier}
                                        onChange={(e) => setForgotIdentifier(e.target.value)}
                                        required
                                        placeholder={`Masukkan ID ${forgotRole === "teacher" ? "Guru" : "Admin"}`}
                                        autoComplete="username"
                                    />
                                </Field>

                                <div className="flex gap-3 mt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => {
                                            setShowForgotDialog(false);
                                            setForgotIdentifier("");
                                        }}
                                        disabled={loading}
                                    >
                                        Batal
                                    </Button>
                                    <Button type="submit" className="flex-1" disabled={loading}>
                                        {loading && <Loader2 size={15} className="animate-spin" />}
                                        {loading ? "Memproses..." : "Hantar E-mel"}
                                    </Button>
                                </div>
                            </FieldGroup>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
