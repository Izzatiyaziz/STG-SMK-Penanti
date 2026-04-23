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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSignature, Save, Settings2 } from "lucide-react";

type Session = {
    user_id: string;
    userType: "teacher";
    role: string;
};

type Exam = {
    id: string;
    name: string;
    academic_year: string;
    subject_settings?: Record<string, any>;
};

type Subject = { id: string; name: string };

export default function AnswerSchemesPage() {
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [subjectId, setSubjectId] = useState("");
    const [examId, setExamId] = useState("");

    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [objectiveQuestionsInput, setObjectiveQuestionsInput] = useState<string>("");
    const [objectiveMaxInput, setObjectiveMaxInput] = useState<string>("");
    const [subjectiveQuestionsInput, setSubjectiveQuestionsInput] = useState<string>("");
    const [subjectiveMaxInput, setSubjectiveMaxInput] = useState<string>("");
    const [deadlineInput, setDeadlineInput] = useState<string>("");

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
        if (role !== "subject coordinator") {
            toast.error("Hanya Penyelaras Subjek boleh akses halaman ini");
            router.replace("/teacher/dashboard");
        }
    }, [router, session]);

    const selectedExam = useMemo(() => {
        return exams.find((e) => e.id === examId) ?? null;
    }, [examId, exams]);

    const objectiveQuestions = useMemo(() => {
        if (!selectedExam || !subjectId) return 0;
        const settings = (selectedExam.subject_settings ?? {}) as Record<string, any>;
        return Number(settings?.[subjectId]?.objective_questions ?? 0);
    }, [selectedExam, subjectId]);

    const currentSubjectSettings = useMemo(() => {
        if (!selectedExam || !subjectId) return {} as Record<string, any>;
        const all = (selectedExam.subject_settings ?? {}) as Record<string, any>;
        const s = all?.[subjectId];
        return s && typeof s === "object" ? (s as Record<string, any>) : ({} as Record<string, any>);
    }, [selectedExam, subjectId]);

    async function loadOptions() {
        if (!session) return;
        setLoading(true);
        try {
            const [sRes, eRes] = await Promise.all([
                fetch(`/api/coordinator/subjects?teacher_id=${session.user_id}`, {
                    cache: "no-store",
                }),
                fetch("/api/admin/exams", { cache: "no-store" }),
            ]);

            const sJson = await sRes.json();
            const eJson = await eRes.json();

            setSubjects(sJson?.data ?? []);
            setExams(eJson ?? []);

            if ((sJson?.data ?? []).length > 0) setSubjectId(sJson.data[0].id);
            if ((eJson ?? []).length > 0) setExamId(eJson[0].id);
        } catch {
            setSubjects([]);
            setExams([]);
        } finally {
            setLoading(false);
        }
    }

    async function loadExistingSchema() {
        if (!examId || !subjectId) return;
        try {
            const res = await fetch(
                `/api/coordinator/answer-schemes?exam_id=${examId}&subject_id=${subjectId}`,
                { cache: "no-store" }
            );
            const json = await res.json();
            const map: Record<number, string> = {};
            for (const row of json?.data ?? []) {
                map[Number(row.question_no)] = String(row.correct_answer ?? "");
            }
            setAnswers(map);
        } catch {
            setAnswers({});
        }
    }

    useEffect(() => {
        if (!session) return;
        loadOptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.user_id]);

    useEffect(() => {
        loadExistingSchema();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examId, subjectId]);

    useEffect(() => {
        const oq = currentSubjectSettings?.objective_questions;
        const om = currentSubjectSettings?.objective_max;
        const sq = currentSubjectSettings?.subjective_questions;
        const sm = currentSubjectSettings?.subjective_max;
        const dl = currentSubjectSettings?.deadline;

        setObjectiveQuestionsInput(oq === undefined || oq === null ? "" : String(oq));
        setObjectiveMaxInput(om === undefined || om === null ? "" : String(om));
        setSubjectiveQuestionsInput(sq === undefined || sq === null ? "" : String(sq));
        setSubjectiveMaxInput(sm === undefined || sm === null ? "" : String(sm));
        setDeadlineInput(typeof dl === "string" ? dl : "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examId, subjectId, selectedExam?.subject_settings]);

    async function handleSaveSettings() {
        if (!session || !examId || !subjectId) return;

        const oq = objectiveQuestionsInput === "" ? null : Number(objectiveQuestionsInput);
        const om = objectiveMaxInput === "" ? null : Number(objectiveMaxInput);
        const sq = subjectiveQuestionsInput === "" ? null : Number(subjectiveQuestionsInput);
        const sm = subjectiveMaxInput === "" ? null : Number(subjectiveMaxInput);
        const deadline = deadlineInput.trim();

        if (oq !== null && (!Number.isFinite(oq) || oq < 0 || oq > 200)) {
            toast.error("Bil. soalan objektif tidak sah");
            return;
        }
        if (om !== null && (!Number.isFinite(om) || om < 0 || om > 200)) {
            toast.error("Markah maks objektif tidak sah");
            return;
        }
        if (sq !== null && (!Number.isFinite(sq) || sq < 0 || sq > 50)) {
            toast.error("Bil. soalan subjektif tidak sah");
            return;
        }
        if (sm !== null && (!Number.isFinite(sm) || sm < 0 || sm > 200)) {
            toast.error("Markah maks subjektif tidak sah");
            return;
        }
        if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
            toast.error("Format deadline mesti YYYY-MM-DD");
            return;
        }

        setSavingSettings(true);
        const toastId = toast.loading("Menyimpan settings...");
        try {
            const res = await fetch("/api/coordinator/exam-subject-settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    coordinator_teacher_id: session.user_id,
                    exam_id: examId,
                    subject_id: subjectId,
                    objective_questions: oq,
                    objective_max: om,
                    subjective_questions: sq,
                    subjective_max: sm,
                    deadline,
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                toast.error(json?.message ?? "Gagal simpan settings", { id: toastId });
                return;
            }

            toast.success("Settings disimpan", { id: toastId });

            const eRes = await fetch("/api/admin/exams", { cache: "no-store" });
            const eJson = await eRes.json();
            setExams(eJson ?? []);
        } catch {
            toast.error("Ralat sistem", { id: toastId });
        } finally {
            setSavingSettings(false);
        }
    }

    async function handleSave() {
        if (!examId || !subjectId) return;
        if (!objectiveQuestions) {
            toast.error(
                "Sila set bilangan soalan objektif dahulu (Admin > Exams > Settings untuk subjek ini)."
            );
            return;
        }

        const payload = Array.from({ length: objectiveQuestions }).map((_, i) => {
            const q = i + 1;
            return { question_no: q, correct_answer: answers[q] ?? "" };
        });

        const toastId = toast.loading("Menyimpan skema jawapan...");
        try {
            const res = await fetch("/api/coordinator/answer-schemes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ exam_id: examId, subject_id: subjectId, answers: payload }),
            });

            const json = await res.json();
            if (!res.ok) {
                toast.error(json?.message ?? "Gagal", { id: toastId });
                return;
            }

            toast.success("Skema jawapan berjaya disimpan", { id: toastId });
            loadExistingSchema();
        } catch {
            toast.error("Ralat sistem", { id: toastId });
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <FileSignature className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Skema Jawapan
                        </h1>
                        <p className="text-muted-foreground">
                            Tetapkan jawapan objektif untuk semakan OMR / pemarkahan.
                        </p>
                    </div>
                </div>

                <Card className="shadow-lg border border-border/50">
                    <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Peperiksaan</div>
                            <Select value={examId} onValueChange={setExamId}>
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
                            <div className="text-sm text-muted-foreground">Subjek</div>
                            <Select value={subjectId} onValueChange={setSubjectId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih subjek" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Bil. Soalan</div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                    {objectiveQuestions || 0}
                                </Badge>
                                {loading && (
                                    <span className="text-sm text-muted-foreground">
                                        Loading...
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-lg border border-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="w-5 h-5 text-primary" />
                            Settings Subjek (Peperiksaan)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Objektif (Bil.)</div>
                                <Input
                                    type="number"
                                    min={0}
                                    value={objectiveQuestionsInput}
                                    onChange={(e) => setObjectiveQuestionsInput(e.target.value)}
                                    placeholder="40"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Objektif (Markah)</div>
                                <Input
                                    type="number"
                                    min={0}
                                    value={objectiveMaxInput}
                                    onChange={(e) => setObjectiveMaxInput(e.target.value)}
                                    placeholder="40"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Subjektif (Bil.)</div>
                                <Input
                                    type="number"
                                    min={0}
                                    value={subjectiveQuestionsInput}
                                    onChange={(e) => setSubjectiveQuestionsInput(e.target.value)}
                                    placeholder="5"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Subjektif (Markah)</div>
                                <Input
                                    type="number"
                                    min={0}
                                    value={subjectiveMaxInput}
                                    onChange={(e) => setSubjectiveMaxInput(e.target.value)}
                                    placeholder="60"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Deadline (YYYY-MM-DD)</div>
                                <Input
                                    value={deadlineInput}
                                    onChange={(e) => setDeadlineInput(e.target.value)}
                                    placeholder="2026-04-30"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={handleSaveSettings}
                                disabled={loading || savingSettings || !examId || !subjectId}
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Simpan Settings
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-lg border border-border/50">
                    <CardHeader>
                        <CardTitle>Jawapan Objektif</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {!objectiveQuestions && (
                            <div className="text-sm text-muted-foreground">
                                Sila set bilangan soalan objektif dahulu di Settings Subjek (Peperiksaan).
                            </div>
                        )}

                        {objectiveQuestions > 0 && (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                                {Array.from({ length: objectiveQuestions }).map((_, i) => {
                                    const q = i + 1;
                                    return (
                                        <div key={q} className="space-y-1">
                                            <div className="text-xs text-muted-foreground">
                                                Q{q}
                                            </div>
                                            <Input
                                                value={answers[q] ?? ""}
                                                onChange={(e) =>
                                                    setAnswers((prev) => ({
                                                        ...prev,
                                                        [q]: e.target.value.toUpperCase(),
                                                    }))
                                                }
                                                placeholder="A"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button className="w-full sm:w-auto" onClick={handleSave} disabled={loading || !examId || !subjectId || !objectiveQuestions}>
                                <Save className="w-4 h-4 mr-2" />
                                Simpan Skema
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
