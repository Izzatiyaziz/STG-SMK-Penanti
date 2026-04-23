"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ClipboardCheck, Eye, XCircle } from "lucide-react";

type Session = {
    user_id: string;
    userType: "teacher";
    role: string;
};

type Submission = {
    id: string;
    subject: string;
    subject_id: string;
    class_id: string | null;
    className: string;
    teacher_id: string | null;
    teacher: string;
    exam_id: string;
    examName: string;
    academic_year: string;
    status: "pending" | "approved" | "rejected";
    submittedAt: string | null;
    marks: Array<{
        result_id: string;
        student: string;
        student_id: string;
        objective: number;
        subjective: number;
        total: number;
        grade: string;
    }>;
};

export default function SubjectCoordinatorApprovalPage() {
    const router = useRouter();
    const [data, setData] = useState<Submission[]>([]);
    const [selected, setSelected] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<Session | null>(null);
    const [sessionReady, setSessionReady] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem("stg_session");
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed?.userType !== "teacher") return;
            setSession(parsed as Session);
        } catch {
            // ignore
        } finally {
            setSessionReady(true);
        }
    }, []);

    useEffect(() => {
        if (!sessionReady) return;

        if (!session) {
            router.replace("/login");
            return;
        }

        const teacherId = session.user_id;

        // Only subject coordinator should access
        if (String(session.role).toLowerCase().trim() !== "subject coordinator") {
            toast.error("Anda tidak dibenarkan akses halaman ini");
            router.replace("/teacher/dashboard");
            return;
        }

        let cancelled = false;

        async function load() {
            setLoading(true);
            try {
                const res = await fetch(
                    `/api/coordinator/approvals?teacher_id=${teacherId}&status=all`
                );
                const json = await res.json();
                if (!cancelled) setData(json?.data ?? []);
            } catch {
                if (!cancelled) setData([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [router, session, sessionReady]);

    async function handleAction(
        submission: Submission,
        action: "approve" | "reject"
    ) {
        if (!submission.class_id) {
            toast.error("Kelas tidak dijumpai untuk hantaran ini");
            return;
        }

        const toastId = toast.loading(
            action === "approve" ? "Meluluskan..." : "Menolak..."
        );

        try {
            const res = await fetch("/api/coordinator/approvals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    subject_id: submission.subject_id,
                    class_id: submission.class_id,
                    exam_id: submission.exam_id,
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                toast.error(json?.message ?? "Gagal", { id: toastId });
                return;
            }

            toast.success(action === "approve" ? "Diluluskan" : "Ditolak", {
                id: toastId,
            });

            setSelected(null);
            // optimistic update
            setData((prev) =>
                prev.map((s) =>
                    s.id === submission.id
                        ? { ...s, status: action === "approve" ? "approved" : "rejected" }
                        : s
                )
            );
        } catch {
            toast.error("Ralat sistem", { id: toastId });
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <ClipboardCheck className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Semakan & Kelulusan Markah
                        </h1>
                    </div>
                    <p className="text-muted-foreground">
                        Semak markah yang dihantar oleh Guru Subjek sebelum diluluskan.
                    </p>
                </div>

                <Card className="shadow-lg border border-border/50">
                    <CardHeader>
                        <CardTitle>
                            Senarai Hantaran (Pending:{" "}
                            {data.filter((d) => d.status === "pending").length})
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subjek</TableHead>
                                    <TableHead>Kelas</TableHead>
                                    <TableHead>Peperiksaan</TableHead>
                                    <TableHead>Guru</TableHead>
                                    <TableHead>Tarikh</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Tindakan</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {data.map((s) => {
                                    const submittedAt = s.submittedAt
                                        ? new Date(s.submittedAt).toLocaleString("ms-MY")
                                        : "—";

                                    return (
                                        <TableRow key={s.id}>
                                            <TableCell>{s.subject}</TableCell>
                                            <TableCell>{s.className || "—"}</TableCell>
                                            <TableCell>
                                                {s.examName ? `${s.examName} (${s.academic_year})` : "—"}
                                            </TableCell>
                                            <TableCell>{s.teacher || "—"}</TableCell>
                                            <TableCell>{submittedAt}</TableCell>
                                            <TableCell className="text-center">
                                                {s.status === "pending" && (
                                                    <Badge variant="outline" className="text-yellow-600">
                                                        Pending
                                                    </Badge>
                                                )}
                                                {s.status === "approved" && (
                                                    <Badge className="bg-green-100 text-green-700">
                                                        Approved
                                                    </Badge>
                                                )}
                                                {s.status === "rejected" && (
                                                    <Badge className="bg-red-100 text-red-700">
                                                        Rejected
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setSelected(s)}
                                                >
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    Lihat
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}

                                {!loading && data.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="text-center text-muted-foreground py-10"
                                        >
                                            Tiada rekod.
                                        </TableCell>
                                    </TableRow>
                                )}

                                {loading && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="text-center text-muted-foreground py-10"
                                        >
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {selected && (
                    <Card className="shadow-lg border border-border/50">
                        <CardHeader>
                            <CardTitle>
                                Semakan Markah — {selected.className || "—"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Pelajar</TableHead>
                                        <TableHead className="text-center">Objektif</TableHead>
                                        <TableHead className="text-center">Subjektif</TableHead>
                                        <TableHead className="text-center">Jumlah</TableHead>
                                        <TableHead className="text-center">Gred</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selected.marks.map((m) => {
                                        const total = Number(m.objective) + Number(m.subjective);
                                        const invalid = total > 100;
                                        return (
                                            <TableRow
                                                key={m.result_id}
                                                className={invalid ? "bg-red-50" : ""}
                                            >
                                                <TableCell>{m.student}</TableCell>
                                                <TableCell className="text-center">
                                                    {m.objective}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {m.subjective}
                                                </TableCell>
                                                <TableCell className="text-center font-semibold">
                                                    {total}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {m.grade}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    variant="destructive"
                                    onClick={() => handleAction(selected, "reject")}
                                    disabled={selected.status !== "pending"}
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                </Button>
                                <Button
                                    onClick={() => handleAction(selected, "approve")}
                                    disabled={selected.status !== "pending"}
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
