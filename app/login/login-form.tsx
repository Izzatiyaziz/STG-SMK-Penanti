"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react"; // 🔥 Tambah import ikon ini

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState<"student" | "teacher" | "admin">("student");
    const [teacherRoles, setTeacherRoles] = useState<string[]>([]);
    const [selectedTeacherRole, setSelectedTeacherRole] = useState("");
    const router = useRouter();

    // ================= STATE TUKAR PASSWORD =================
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [tempData, setTempData] = useState<any>(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    // 🔥 STATE UNTUK TOGGLE MATA (Melihat Kata Laluan)
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // ================= STATE LUPA PASSWORD =================
    const [showForgotDialog, setShowForgotDialog] = useState(false);
    const [forgotRole, setForgotRole] = useState<"teacher" | "admin">("teacher");
    const [forgotIdentifier, setForgotIdentifier] = useState("");

    // ================= LOGIK SEMAKAN KATA LALUAN =================
    // 🔥 Tukar kepada sekurang-kurangnya 8 aksara (tiada had maksimum)
    const hasLength = newPassword.length >= 8; 
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
    
    const isPasswordStrong = hasLength && hasUpper && hasNumber && hasSymbol;

    async function handleSubmit(
        e: React.FormEvent<HTMLFormElement>,
        submitRole: "student" | "teacher" | "admin"
    ) {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        const toastId = toast.loading("Log masuk sedang diproses...");

        try {
            const formData = new FormData(e.currentTarget);
            let payload: any = { role: submitRole };

            if (submitRole === "student") {
                payload.ic_number = String(formData.get("ic_number") ?? "");
            }

            if (submitRole === "teacher") {
                payload.username = String(formData.get("username") ?? "");
                payload.password = String(formData.get("password") ?? "");
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
                        roles,
                        session_id: data.session_id ?? null,
                    });
                    setShowPasswordDialog(true);
                    toast.dismiss(toastId);
                    return;
                }

                proceedToDashboard(
                    data.user_id,
                    "teacher",
                    finalRole,
                    data.session_id ?? null,
                    toastId,
                    roles
                );
                return;
            }

            proceedToDashboard(
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

    function proceedToDashboard(
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
        if (toastId) toast.success("Log masuk berjaya 🎉", { id: toastId });
        
        if (userType === "admin") router.push("/admin/dashboard");
        else if (userType === "teacher") {
            const r = String(specificRole).toLowerCase().trim();
            if (r === "subject coordinator") router.push("/coordinator/dashboard");
            else router.push("/teacher/dashboard");
        }
        else router.push("/student/dashboard");
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
                    user_id: tempData.user_id,
                    current_password: "",
                    new_password: newPassword,
                    first_login: true,
                }),
            });

            if (!res.ok) throw new Error("Gagal mengemas kini kata laluan");

            setShowPasswordDialog(false);
            proceedToDashboard(
                tempData.user_id,
                "teacher",
                tempData.role,
                tempData.session_id ?? null,
                toastId,
                Array.isArray(tempData.roles) ? tempData.roles : undefined
            );

        } catch (error) {
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
                    identifier: forgotIdentifier 
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
        } catch (error) {
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
                    setRole(v as any);
                    setTeacherRoles([]);
                    setSelectedTeacherRole("");
                }}
            >
                <TabsList className="grid grid-cols-3 w-full min-h-12">
                    <TabsTrigger value="student">Pelajar</TabsTrigger>
                    <TabsTrigger value="teacher">Guru</TabsTrigger>
                    <TabsTrigger value="admin">Admin</TabsTrigger>
                </TabsList>

                {/* STUDENT CONTENT */}
                <TabsContent value="student">
                    <form onSubmit={(e) => handleSubmit(e, "student")} {...props}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>IC Nombor</FieldLabel>
                                <Input name="ic_number" placeholder="Contoh: 050101-01-1234" required />
                            </Field>
                            <Button type="submit" disabled={loading}>
                                Log Masuk sebagai Pelajar
                            </Button>
                        </FieldGroup>
                    </form>
                </TabsContent>

                {/* TEACHER CONTENT */}
                <TabsContent value="teacher">
                    <form onSubmit={(e) => handleSubmit(e, "teacher")} {...props}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>No. Staff</FieldLabel>
                                <Input name="username" required />
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
                                <Input name="password" type="password" required />
                            </Field>

                            {teacherRoles.length > 0 && (
                                <Field>
                                    <FieldLabel>Pilih Peranan</FieldLabel>
                                    <select
                                        className="w-full border rounded-md p-2 bg-background"
                                        value={selectedTeacherRole}
                                        onChange={(e) => setSelectedTeacherRole(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Pilih Peranan --</option>
                                        {teacherRoles.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </Field>
                            )}

                            <Button type="submit" disabled={loading}>
                                Log Masuk sebagai Guru
                            </Button>
                        </FieldGroup>
                    </form>
                </TabsContent>

                {/* ADMIN CONTENT */}
                <TabsContent value="admin">
                    <form onSubmit={(e) => handleSubmit(e, "admin")} {...props}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>ID Admin</FieldLabel>
                                <Input name="admin_id" required />
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
                                <Input name="password" type="password" required />
                            </Field>
                            <Button type="submit" disabled={loading}>
                                Log Masuk sebagai Admin
                            </Button>
                        </FieldGroup>
                    </form>
                </TabsContent>
            </Tabs>

            {/* ================= DIALOG TUKAR KATA LALUAN ================= */}
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
                                    {/* 🔥 Input Berbalut dengan Butang Mata */}
                                    <div className="relative">
                                        <Input 
                                            type={showNewPassword ? "text" : "password"} 
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required 
                                            placeholder="Minima 8 aksara"
                                            className="pr-10" // Beri ruang di sebelah kanan untuk ikon
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    
                                    {/* PAPARAN KEKUATAN KATA LALUAN */}
                                    {newPassword.length > 0 && (
                                        <div className="mt-2 text-xs p-3 rounded-lg border bg-muted/30">
                                            <p className={cn(
                                                "font-bold mb-2", 
                                                isPasswordStrong ? "text-green-500" : "text-red-500"
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
                                    {/* 🔥 Input Berbalut dengan Butang Mata */}
                                    <div className="relative">
                                        <Input 
                                            type={showConfirmPassword ? "text" : "password"} 
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required 
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </Field>

                                <div className="flex gap-3 mt-4">
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
                                        {loading ? "Menyimpan..." : "Simpan & Masuk"}
                                    </Button>
                                </div>
                            </FieldGroup>
                        </form>
                    </div>
                </div>
            )}

            {/* DIALOG LUPA KATA LALUAN (SEDIA ADA) */}
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
                                    />
                                </Field>
                                
                                <div className="flex gap-3 mt-4">
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
