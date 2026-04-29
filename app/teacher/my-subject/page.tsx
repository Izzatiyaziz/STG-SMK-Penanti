"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ClipboardList, Save, Send } from "lucide-react";

type Session = {
    user_id: string;
    userType: "teacher";
    role: string;
};

type Assignment = {
    id: string;
    subject_id: string;
    subject_name: string;
    class_id: string;
    class_name: string;
    grade: number | null;
};

type Exam = {
    id: string;
    name: string;
    academic_year: string;
    subject_settings?: Record<string, unknown>;
};

type Student = {
    id: string;
    name: string;
    identifier: string;
};

type ClassSummary = {
    class: { id: string; name: string; grade: number | null };
    totals: {
        students: number;
        results: number;
        submitted: number;
        omr_scanned: number;
        approved: number;
        pending: number;
        rejected: number;
        average_total: number;
    };
    grades: Array<{ grade: string; value: number }>;
};

function toIsoDateString(d: Date) {
    return d.toISOString().slice(0, 10);
}

function readNumber(
    obj: Record<string, unknown>,
    key: string,
    fallback: number
) {
    const raw = obj[key];
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : fallback;
}

function readString(obj: Record<string, unknown>, key: string, fallback = "") {
    const raw = obj[key];
    return typeof raw === "string" ? raw : raw == null ? fallback : String(raw);
}

function getObjectiveMark(
    objectiveMarksByStudentId: Record<string, number>,
    studentId: string
) {
    const value = objectiveMarksByStudentId[studentId];
    return Number.isFinite(value) ? value : null;
}

export default function SubjectTeacherPage() {
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);

    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);

    const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
    const [selectedExamId, setSelectedExamId] = useState("");
    const [students, setStudents] = useState<Student[]>([]);
    const [subjectiveMarks, setSubjectiveMarks] = useState<Record<string, string>>(
        {}
    );
    const [objectiveMarksByStudentId, setObjectiveMarksByStudentId] = useState<
        Record<string, number>
    >({});
    const [classSummary, setClassSummary] = useState<ClassSummary | null>(null);

    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    const [submission, setSubmission] = useState<{
        totalStudents: number;
        submittedCount: number;
        isComplete: boolean;
        approval: {
            total: number;
            pending: number;
            approved: number;
            rejected: number;
            status: "none" | "pending" | "approved" | "rejected" | "mixed";
        };
    }>({
        totalStudents: 0,
        submittedCount: 0,
        isComplete: false,
        approval: { total: 0, pending: 0, approved: 0, rejected: 0, status: "none" },
    });

    function readMarksContext() {
        try {
            const raw = localStorage.getItem("stg_marks_context");
            if (!raw) return null;
            const parsed = JSON.parse(raw) as {
                class_id?: string;
                subject_id?: string;
                exam_id?: string;
            };
            return {
                class_id: String(parsed.class_id ?? "").trim(),
                subject_id: String(parsed.subject_id ?? "").trim(),
                exam_id: String(parsed.exam_id ?? "").trim(),
            };
        } catch {
            return null;
        }
    }

    useEffect(() => {
        try {
            const raw = localStorage.getItem("stg_session");
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed?.userType !== "teacher") return;
            setSession(parsed as Session);
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        if (!session) return;
        const role = String(session.role ?? "").toLowerCase().trim();
        if (role !== "subject teacher") {
            toast.error("Anda tidak dibenarkan akses pemarkahan subjek");
            router.replace("/teacher/dashboard");
        }
    }, [router, session]);

    const selectedAssignment = useMemo(() => {
        return assignments.find((a) => a.id === selectedAssignmentId) ?? null;
    }, [assignments, selectedAssignmentId]);

    const selectedExam = useMemo(() => {
        return exams.find((e) => e.id === selectedExamId) ?? null;
    }, [exams, selectedExamId]);

    const limits = useMemo(() => {
        const subjectId = selectedAssignment?.subject_id;
        const settings = (selectedExam?.subject_settings ?? {}) as Record<
            string,
            unknown
        >;
        const subjectSettingRaw = subjectId ? settings[subjectId] : null;
        const s =
            subjectSettingRaw && typeof subjectSettingRaw === "object"
                ? (subjectSettingRaw as Record<string, unknown>)
                : {};

        const objectiveQuestions = readNumber(s, "objective_questions", 40);
        const objectiveMax = readNumber(s, "objective_max", objectiveQuestions);
        const subjectiveMax = readNumber(s, "subjective_max", 60);
        const deadline = readString(s, "deadline", "");

        return { objectiveQuestions, objectiveMax, subjectiveMax, deadline };
    }, [selectedAssignment?.subject_id, selectedExam?.subject_settings]);

    const isLate = useMemo(() => {
        if (!limits.deadline) return false;
        const today = toIsoDateString(new Date());
        return today > limits.deadline;
    }, [limits.deadline]);

    async function loadAssignmentsAndExams() {
        if (!session) return;
        setLoading(true);
        try {
            const [aRes, eRes] = await Promise.all([
                fetch(`/api/teacher/assignments?teacher_id=${session.user_id}`),
                fetch("/api/admin/exams", { cache: "no-store" }),
            ]);

            const aJson = await aRes.json();
            const eJson = await eRes.json();

            setAssignments(aJson?.data ?? []);
            // /api/admin/exams can return either an array or a wrapper like { data: [...] }.
            const examsList: Exam[] = Array.isArray(eJson)
                ? eJson
                : Array.isArray((eJson as { data?: unknown })?.data)
                  ? ((eJson as { data: Exam[] }).data ?? [])
                  : [];
            setExams(examsList);

            const marksContext = readMarksContext();

            if (marksContext?.exam_id) {
                const matchedExam = examsList.find((e) => e.id === marksContext.exam_id);
                if (matchedExam) {
                    setSelectedExamId(matchedExam.id);
                } else if (!selectedExamId && examsList.length > 0) {
                    setSelectedExamId(examsList[0].id);
                }
            } else if (!selectedExamId && examsList.length > 0) {
                setSelectedExamId(examsList[0].id);
            }

            if (marksContext?.class_id && marksContext?.subject_id) {
                const matchedAssignment = (aJson?.data ?? []).find(
                    (a: Assignment) =>
                        a.class_id === marksContext.class_id &&
                        a.subject_id === marksContext.subject_id
                );

                if (matchedAssignment) {
                    setSelectedAssignmentId(matchedAssignment.id);
                }
            }
        } catch {
            toast.error("Gagal memuatkan data");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!session) return;
        loadAssignmentsAndExams();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.user_id, selectedExamId]);

    async function loadStudents() {
        if (!selectedAssignment) return;
        setLoading(true);
        try {
            const res = await fetch(
                `/api/teacher/students?class_id=${selectedAssignment.class_id}`
            );
            const json = await res.json();
            const list = json?.data ?? [];
            setStudents(list);
            setSubjectiveMarks({});
        } catch {
            setStudents([]);
        } finally {
            setLoading(false);
        }
    }

    async function loadSubmissionStatus() {
        if (!session || !selectedAssignment || !selectedExamId) return;
        try {
            const res = await fetch(
                `/api/teacher/marks/status?teacher_id=${session.user_id}&class_id=${selectedAssignment.class_id}&subject_id=${selectedAssignment.subject_id}&exam_id=${selectedExamId}`
            );
            const json = await res.json();
            setSubmission({
                totalStudents: Number(json?.totalStudents ?? 0),
                submittedCount: Number(json?.submittedCount ?? 0),
                isComplete: Boolean(json?.isComplete),
                approval: {
                    total: Number(json?.approval?.total ?? 0),
                    pending: Number(json?.approval?.pending ?? 0),
                    approved: Number(json?.approval?.approved ?? 0),
                    rejected: Number(json?.approval?.rejected ?? 0),
                    status: String(json?.approval?.status ?? "none") as
                        | "none"
                        | "pending"
                        | "approved"
                        | "rejected"
                        | "mixed",
                },
            });
        } catch {
            setSubmission({
                totalStudents: 0,
                submittedCount: 0,
                isComplete: false,
                approval: { total: 0, pending: 0, approved: 0, rejected: 0, status: "none" },
            });
        }
    }

    useEffect(() => {
        if (!selectedAssignmentId) return;
        loadStudents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAssignmentId]);

    useEffect(() => {
        loadSubmissionStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.user_id, selectedAssignmentId, selectedExamId]);

    useEffect(() => {
        if (!session || !selectedAssignment || !selectedExamId) return;

        const teacherId = session.user_id;
        const classId = selectedAssignment.class_id;
        const subjectId = selectedAssignment.subject_id;
        let cancelled = false;

        async function loadSummaryAndObjective() {
            try {
                const [sumRes, objRes] = await Promise.all([
                    fetch(
                        `/api/teacher/class-summary?teacher_id=${teacherId}&class_id=${classId}&subject_id=${subjectId}&exam_id=${selectedExamId}`,
                        { cache: "no-store" }
                    ),
                    fetch(
                        `/api/teacher/objective-marks?class_id=${classId}&subject_id=${subjectId}&exam_id=${selectedExamId}`,
                        { cache: "no-store" }
                    ),
                ]);

                const sumJson = await sumRes.json();
                const objJson = await objRes.json();

                if (!cancelled) {
                    setClassSummary(sumRes.ok ? (sumJson as ClassSummary) : null);
                    setObjectiveMarksByStudentId(objJson?.data ?? {});
                }
            } catch {
                if (!cancelled) {
                    setClassSummary(null);
                    setObjectiveMarksByStudentId({});
                }
            }
        }

        loadSummaryAndObjective();
        return () => {
            cancelled = true;
        };
    }, [selectedAssignment, selectedExamId, session]);

    async function handleSubmitMarks() {
        if (!session || !selectedAssignment || !selectedExamId) return;
        if (!limits.subjectiveMax && limits.subjectiveMax !== 0) {
            toast.error("Sila set limit peperiksaan dahulu (Admin > Exams > Settings)");
            return;
        }
        if (isLate && !submission.isComplete) {
            toast.error(`Tarikh akhir telah tamat (${limits.deadline || "—"})`);
            return;
        }

        const payloadMarks = students.map((s) => {
            const raw = subjectiveMarks[s.id] ?? "";
            const val = raw === "" ? 0 : Number(raw);
            return { student_id: s.id, subjective_mark: Number.isFinite(val) ? val : 0 };
        });

        const invalid = payloadMarks.find(
            (m) => m.subjective_mark < 0 || m.subjective_mark > limits.subjectiveMax
        );
        if (invalid) {
            toast.error(`Markah subjektif mesti 0–${limits.subjectiveMax}`);
            return;
        }

        setSubmitLoading(true);
        const toastId = toast.loading("Menghantar markah...");
        try {
            const res = await fetch("/api/teacher/marks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    teacher_id: session.user_id,
                    class_id: selectedAssignment.class_id,
                    subject_id: selectedAssignment.subject_id,
                    exam_id: selectedExamId,
                    marks: payloadMarks,
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                toast.error(json?.message ?? "Gagal menghantar markah", { id: toastId });
                return;
            }

            toast.success("Markah dihantar untuk semakan penyelaras", { id: toastId });
            loadSubmissionStatus();
        } catch {
            toast.error("Ralat sistem", { id: toastId });
        } finally {
            setSubmitLoading(false);
        }
    }

    if (!session) return null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="space-y-1">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <ClipboardList className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                            Pemarkahan Subjek
                        </h1>
                    </div>
                    <p className="text-muted-foreground">
                        Hantar markah untuk semakan Penyelaras Subjek.
                    </p>
                </div>

                {selectedAssignment && selectedExamId && (
                    <Card className="shadow-lg border border-border/50">
                        <CardHeader>
                            <CardTitle>Langkah Pemarkahan</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                            <div>1) Scan OMR untuk markah objektif (kamera).</div>
                            <div className="text-xs text-muted-foreground">
                                Objektif (auto):{" "}
                                <span className="font-medium text-foreground">
                                    {Object.keys(objectiveMarksByStudentId).length}/
                                    {submission.totalStudents}
                                </span>{" "}
                                pelajar ada markah objektif.
                            </div>
                            <div>
                                2) Masukkan markah subjektif secara manual, kemudian tekan{" "}
                                <b>Hantar</b>.
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => router.push("/teacher/omr")}
                                >
                                    Buka OMR
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {classSummary && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                        <Card className="shadow-lg border border-border/50">
                            <CardContent className="p-6">
                                <div className="text-sm text-muted-foreground">
                                    Purata Markah (Kelas)
                                </div>
                                <div className="text-2xl font-bold mt-2">
                                    {Math.round(classSummary.totals.average_total || 0)}%
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                    {classSummary.totals.results}/{classSummary.totals.students} ada keputusan
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="shadow-lg border border-border/50">
                            <CardContent className="p-6">
                                <div className="text-sm text-muted-foreground">OMR Scan</div>
                                <div className="text-2xl font-bold mt-2">
                                    {classSummary.totals.omr_scanned}/{classSummary.totals.students}
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                    Bilangan pelajar ada markah objektif (scan)
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="shadow-lg border border-border/50">
                            <CardContent className="p-6">
                                <div className="text-sm text-muted-foreground">
                                    Kelulusan (Penyelaras)
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <Badge variant="outline">
                                        Approved: {classSummary.totals.approved}
                                    </Badge>
                                    <Badge variant="outline">
                                        Pending: {classSummary.totals.pending}
                                    </Badge>
                                    <Badge variant="outline">
                                        Rejected: {classSummary.totals.rejected}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {selectedExam && selectedAssignment && isLate && !submission.isComplete && (
                    <Card className="border border-destructive/30 bg-destructive/5">
                        <CardContent className="p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                            <div className="space-y-1">
                                <div className="font-semibold text-destructive">
                                    Lewat hantar markah
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Deadline untuk subjek ini:{" "}
                                    <span className="font-medium text-foreground">
                                        {limits.deadline || "—"}
                                    </span>
                                    . Sila hantar secepat mungkin.
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="shadow-lg border border-border/50">
                    <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Peperiksaan</div>
                            <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih peperiksaan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {exams.map((e) => (
                                        <SelectItem key={e.id} value={e.id}>
                                            {e.name} ({e.academic_year})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Subjek & Kelas</div>
                            <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih assignment" />
                                </SelectTrigger>
                                <SelectContent>
                                    {assignments.map((a) => (
                                        <SelectItem key={a.id} value={a.id}>
                                            {a.subject_name} • T{a.grade ?? "-"} {a.class_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Status Hantaran</div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">
                                    {submission.submittedCount}/{submission.totalStudents} marked
                                </Badge>
                                {submission.isComplete ? (
                                    <Badge className="bg-green-100 text-green-700">Lengkap</Badge>
                                ) : (
                                    <Badge className="bg-yellow-100 text-yellow-700">Belum lengkap</Badge>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="text-xs text-muted-foreground">
                                    Kelulusan:
                                </span>
                                {submission.approval.status === "approved" ? (
                                    <Badge className="bg-green-100 text-green-700">
                                        Approved
                                    </Badge>
                                ) : submission.approval.status === "rejected" ? (
                                    <Badge className="bg-red-100 text-red-700">
                                        Rejected
                                    </Badge>
                                ) : submission.approval.status === "pending" ? (
                                    <Badge className="bg-yellow-100 text-yellow-700">
                                        Pending
                                    </Badge>
                                ) : submission.approval.status === "mixed" ? (
                                    <Badge variant="outline">Mixed</Badge>
                                ) : (
                                    <Badge variant="outline">Belum dihantar</Badge>
                                )}
                                {submission.approval.total > 0 && (
                                    <Badge variant="outline">
                                        {submission.approval.approved}/
                                        {submission.approval.total} approved
                                    </Badge>
                                )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Limit: Objektif {limits.objectiveMax} • Subjektif {limits.subjectiveMax}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-lg border border-border/50">
                    <CardHeader>
                        <CardTitle>
                            Senarai Pelajar — {selectedAssignment?.class_name ?? "—"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y md:hidden">
                            {students.map((s) => {
                                const objectiveMark = getObjectiveMark(
                                    objectiveMarksByStudentId,
                                    s.id
                                );
                                return (
                                    <div key={s.id} className="space-y-4 p-4">
                                        <div className="space-y-1">
                                            <div className="font-medium text-foreground">{s.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {s.identifier}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                                                <div className="text-xs text-muted-foreground">
                                                    Objektif
                                                </div>
                                                <div className="mt-1 text-lg font-semibold">
                                                    {objectiveMark ?? "-"}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                                                <div className="text-xs text-muted-foreground">
                                                    Subjektif
                                                </div>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={limits.subjectiveMax}
                                                    className="mt-2 text-center"
                                                    value={subjectiveMarks[s.id] ?? ""}
                                                    onChange={(e) =>
                                                        setSubjectiveMarks((prev) => ({
                                                            ...prev,
                                                            [s.id]: e.target.value,
                                                        }))
                                                    }
                                                    placeholder={`0-${limits.subjectiveMax}`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {!loading && students.length === 0 && (
                                <div className="py-10 text-center text-muted-foreground">
                                    Tiada pelajar.
                                </div>
                            )}
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama Pelajar</TableHead>
                                        <TableHead className="text-center">Objektif</TableHead>
                                        <TableHead className="text-center">Subjektif</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map((s) => (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-medium">
                                                {s.name}
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground">
                                                {getObjectiveMark(objectiveMarksByStudentId, s.id) ?? "-"}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={limits.subjectiveMax}
                                                    className="w-28 mx-auto text-center"
                                                    value={subjectiveMarks[s.id] ?? ""}
                                                    onChange={(e) =>
                                                        setSubjectiveMarks((prev) => ({
                                                            ...prev,
                                                            [s.id]: e.target.value,
                                                        }))
                                                    }
                                                    placeholder={`0-${limits.subjectiveMax}`}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {!loading && students.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={3}
                                                className="text-center text-muted-foreground py-10"
                                            >
                                                Tiada pelajar.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button variant="outline" disabled>
                        <Save className="w-4 h-4 mr-2" />
                        Simpan Draf
                    </Button>
                    <Button onClick={handleSubmitMarks} disabled={submitLoading || !selectedAssignmentId || !selectedExamId}>
                        <Send className="w-4 h-4 mr-2" />
                        {submitLoading ? "Menghantar..." : "Hantar"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
