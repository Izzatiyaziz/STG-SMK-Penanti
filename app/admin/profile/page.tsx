"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
            <div className="max-w-xl mx-auto space-y-6">
                <Card className="shadow-lg border border-border/50">
                    <CardHeader>
                        <CardTitle>Akaun Admin</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-muted-foreground">
                        <div>
                            <span className="font-medium text-foreground">
                                {me?.name ?? "Admin"}
                            </span>
                        </div>
                        {me?.email && <div>{me.email}</div>}
                    </CardContent>
                </Card>

                <Card className="shadow-lg border border-border/50">
                    <CardHeader>
                        <CardTitle>Tukar Kata Laluan</CardTitle>
                    </CardHeader>
                    <CardContent>
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

                                <div className="flex justify-end gap-3 pt-2">
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
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
