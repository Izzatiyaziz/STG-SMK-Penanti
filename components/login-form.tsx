"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState<"student" | "teacher" | "admin">(
        "student"
    );
    const router = useRouter();

    async function handleSubmit(
        e: React.FormEvent<HTMLFormElement>,
        role: "student" | "teacher" | "admin"
    ) {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        const toastId = toast.loading("Logging in...");

        try {
            const formData = new FormData(e.currentTarget);

            let payload: any = { role };

            if (role === "student") {
                payload.ic_number = String(formData.get("ic_number") ?? "");
                payload.password = String(formData.get("password") ?? "");
            }

            if (role === "teacher") {
                payload.username = String(formData.get("username") ?? "");
                payload.password = String(formData.get("password") ?? "");
            }

            if (role === "admin") {
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
                toast.error(data.message || "Login failed", { id: toastId });
                return;
            }

            // ✅ SAVE SESSION (IMPORTANT)
            localStorage.setItem(
                "stg_session",
                JSON.stringify({
                    role: data.role,
                    user_id: data.user_id,
                })
            );

            toast.success("Login successful 🎉", { id: toastId });

            // ================= REDIRECT =================
            if (role === "admin") {
                router.push("/admin/dashboard");
            } else if (role === "student") {
                router.push("/student/dashboard");
            } else if (role === "teacher") {
                const roles: string[] = data.roles ?? [];

                if (roles.includes("principal")) {
                    router.push("/principal/dashboard");
                } else if (roles.includes("subject_coordinator")) {
                    router.push("/coordinator/dashboard");
                } else {
                    router.push("/teacher/dashboard");
                }
            }
        } catch (err) {
            console.error("LOGIN ERROR:", err);
            toast.error("Something went wrong. Please try again.", {
                id: toastId,
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Tabs
            defaultValue="student"
            className={cn("w-full", className)}
            onValueChange={(v) => setRole(v as any)}
        >
            <TabsList className="grid grid-cols-3 w-full min-h-12">
                <TabsTrigger value="student">Pelajar</TabsTrigger>
                <TabsTrigger value="teacher">Guru</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>

            {/* ================= STUDENT ================= */}
            <TabsContent value="student">
                <form onSubmit={(e) => handleSubmit(e, "student")} {...props}>
                    <FieldGroup>
                        <Field>
                            <FieldLabel>IC Nombor</FieldLabel>
                            <Input name="ic_number" required/>
                        </Field>
                        <Field>
                            <FieldLabel>Kata Laluan</FieldLabel>
                            <Input name="password" type="password" required />
                        </Field>
                        <Button type="submit" disabled={loading}>
                            Log Masuk sebagai Pelajar
                        </Button>
                    </FieldGroup>
                </form>
            </TabsContent>

            {/* ================= TEACHER ================= */}
            <TabsContent value="teacher">
                <form onSubmit={(e) => handleSubmit(e, "teacher")} {...props}>
                    <FieldGroup>
                        <Field>
                            <FieldLabel>ID Guru</FieldLabel>
                            <Input name="username" required />
                        </Field>

                        <Field>
                            <FieldLabel>Kata Laluan</FieldLabel>
                            <Input name="password" type="password" required />
                        </Field>

                        <Button type="submit" disabled={loading}>
                            Log Masuk sebagai Guru
                        </Button>
                    </FieldGroup>
                </form>
            </TabsContent>

            {/* ================= ADMIN ================= */}
            <TabsContent value="admin">
                <form onSubmit={(e) => handleSubmit(e, "admin")} {...props}>
                    <FieldGroup>
                        <Field>
                            <FieldLabel>ID Admin</FieldLabel>
                            <Input name="admin_id" required />
                        </Field>
                        <Field>
                            <FieldLabel>Kata Laluan</FieldLabel>
                            <Input name="password" type="password" required />
                        </Field>
                        <Button type="submit" disabled={loading}>
                            Log Masuk sebagai Admin
                        </Button>
                    </FieldGroup>
                </form>
            </TabsContent>
        </Tabs>
    );
}
