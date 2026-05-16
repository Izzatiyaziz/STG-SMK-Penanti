"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

export default function TeacherProfilePage() {
    const router = useRouter();
    const [forceFirstLogin, setForceFirstLogin] = useState(false);

    const [me, setMe] = useState<{ name: string; email?: string } | null>(null);
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
            .then((data) => setMe({ name: data?.name ?? "Teacher", email: data?.email }))
            .catch(() => setMe({ name: "Teacher" }));
    }, [router, session, sessionChecked]);

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

    return (
        <ProfileShell
            accountLabel="Akaun Guru"
            name={me?.name ?? "Teacher"}
            email={me?.email}
            roleLabel="Warga Pengajar"
            accentLabel="Status"
            accentValue={forceFirstLogin ? "Persediaan kali pertama" : "Aktif"}
            enableProfileColor
            profileColorStorageKey={`teacher-profile-color:${session?.user_id ?? "default"}`}
            note={
                forceFirstLogin
                    ? "Anda sedang melengkapkan log masuk kali pertama. Sila tetapkan kata laluan baharu sebelum meneruskan penggunaan sistem."
                    : "Gunakan halaman ini untuk menyemak maklumat akaun dan memastikan keselamatan akses anda sentiasa terjaga."
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
                                onClick={() => router.back()}
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
