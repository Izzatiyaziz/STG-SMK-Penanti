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
import { AlertTriangle, Camera, ClipboardList, Save, Send } from "lucide-react";

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
	fallback: number,
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
	studentId: string,
) {
	const value = objectiveMarksByStudentId[studentId];
	return Number.isFinite(value) ? value : null;
}

function getSubjectiveMark(
	subjectiveMarks: Record<string, string>,
	studentId: string,
) {
	const raw = subjectiveMarks[studentId] ?? "";
	if (raw === "") return 0;
	const value = Number(raw);
	return Number.isFinite(value) ? value : 0;
}

function getManualObjectiveMark(
	manualObjectiveMarks: Record<string, string>,
	studentId: string,
) {
	const raw = manualObjectiveMarks[studentId] ?? "";
	if (raw === "") return 0;
	const value = Number(raw);
	return Number.isFinite(value) ? value : 0;
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
		{},
	);
	const [objectiveMarksByStudentId, setObjectiveMarksByStudentId] = useState<
		Record<string, number>
	>({});
	const [manualObjectiveMarks, setManualObjectiveMarks] = useState<
		Record<string, string>
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
		const role = String(session.role ?? "")
			.toLowerCase()
			.trim();
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
						a.subject_id === marksContext.subject_id,
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
				`/api/teacher/students?class_id=${selectedAssignment.class_id}`,
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
				`/api/teacher/marks/status?teacher_id=${session.user_id}&class_id=${selectedAssignment.class_id}&subject_id=${selectedAssignment.subject_id}&exam_id=${selectedExamId}`,
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
				approval: {
					total: 0,
					pending: 0,
					approved: 0,
					rejected: 0,
					status: "none",
				},
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
				const [sumRes, objRes, subjRes] = await Promise.all([
					fetch(
						`/api/teacher/class-summary?teacher_id=${teacherId}&class_id=${classId}&subject_id=${subjectId}&exam_id=${selectedExamId}`,
						{ cache: "no-store" },
					),
					fetch(
						`/api/teacher/objective-marks?class_id=${classId}&subject_id=${subjectId}&exam_id=${selectedExamId}`,
						{ cache: "no-store" },
					),
					fetch(
						`/api/teacher/subjective-marks?class_id=${classId}&subject_id=${subjectId}&exam_id=${selectedExamId}`,
						{ cache: "no-store" },
					),
				]);

				const sumJson = await sumRes.json();
				const objJson = await objRes.json();
				const subjJson = await subjRes.json();

				if (!cancelled) {
					setClassSummary(sumRes.ok ? (sumJson as ClassSummary) : null);
					const objectiveMarks = objJson?.data ?? {};
					const subjectiveMarksData = subjJson?.data ?? {};
					setObjectiveMarksByStudentId(objectiveMarks);
					setManualObjectiveMarks(
						Object.fromEntries(
							Object.entries(objectiveMarks as Record<string, number>).map(
								([studentId, mark]) => [studentId, String(mark)],
							),
						),
					);
					setSubjectiveMarks(
						Object.fromEntries(
							Object.entries(subjectiveMarksData as Record<string, number>).map(
								([studentId, mark]) => [studentId, String(mark)],
							),
						),
					);
				}
			} catch {
				if (!cancelled) {
					setClassSummary(null);
					setObjectiveMarksByStudentId({});
					setManualObjectiveMarks({});
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
			const objectiveRaw = manualObjectiveMarks[s.id] ?? "";
			const objectiveVal = objectiveRaw === "" ? 0 : Number(objectiveRaw);
			return {
				student_id: s.id,
				subjective_mark: Number.isFinite(val) ? val : 0,
				objective_mark: Number.isFinite(objectiveVal) ? objectiveVal : 0,
			};
		});

		const invalid = payloadMarks.find(
			(m) => m.subjective_mark < 0 || m.subjective_mark > limits.subjectiveMax,
		);
		if (invalid) {
			toast.error(`Markah subjektif mesti 0–${limits.subjectiveMax}`);
			return;
		}

		const invalidObjective = payloadMarks.find(
			(m) => m.objective_mark < 0 || m.objective_mark > limits.objectiveMax,
		);
		if (invalidObjective) {
			toast.error(`Markah objektif mesti 0-${limits.objectiveMax}`);
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

	function openOmrPage(studentId?: string) {
		if (!selectedAssignment || !selectedExamId) return;
		localStorage.setItem(
			"stg_marks_context",
			JSON.stringify({
				class_id: selectedAssignment.class_id,
				subject_id: selectedAssignment.subject_id,
				exam_id: selectedExamId,
				student_id: studentId ?? "",
			}),
		);
		router.push("/teacher/omr");
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
								2) Masukkan markah subjektif secara manual, kemudian tekan <b>Hantar</b>
								.
							</div>
							<div className="flex flex-wrap gap-2 pt-2">
								<Button variant="outline" onClick={() => openOmrPage()}>
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
									{classSummary.totals.results}/{classSummary.totals.students} ada
									keputusan
								</div>
							</CardContent>
						</Card>
						<Card className="shadow-lg border border-border/50">
							<CardContent className="p-6">
								<div className="text-sm text-muted-foreground">Imbasan OMR</div>
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
										Diluluskan: {classSummary.totals.approved}
									</Badge>
									<Badge variant="outline">
										Menunggu: {classSummary.totals.pending}
									</Badge>
									<Badge variant="outline">
										Ditolak: {classSummary.totals.rejected}
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
							<Select
								value={selectedAssignmentId}
								onValueChange={setSelectedAssignmentId}
							>
								<SelectTrigger>
									<SelectValue placeholder="Pilih tugasan" />
								</SelectTrigger>
								<SelectContent>
									{assignments.map((a) => (
										<SelectItem key={a.id} value={a.id}>
											{a.subject_name} • {a.grade ?? "-"} {a.class_name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<div className="text-sm text-muted-foreground">Status Hantaran</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">
									{submission.submittedCount}/{submission.totalStudents} ditanda
								</Badge>
								{submission.isComplete ? (
									<Badge className="bg-green-100 text-green-700">Lengkap</Badge>
								) : (
									<Badge className="bg-yellow-100 text-yellow-700">Belum lengkap</Badge>
								)}
							</div>
							<div className="flex flex-wrap items-center gap-2 pt-1">
								<span className="text-xs text-muted-foreground">Kelulusan:</span>
								{submission.approval.status === "approved" ? (
									<Badge className="bg-green-100 text-green-700">Diluluskan</Badge>
								) : submission.approval.status === "rejected" ? (
									<Badge className="bg-red-100 text-red-700">Ditolak</Badge>
								) : submission.approval.status === "pending" ? (
									<Badge className="bg-yellow-100 text-yellow-700">Menunggu</Badge>
								) : submission.approval.status === "mixed" ? (
									<Badge variant="outline">Bercampur</Badge>
								) : (
									<Badge variant="outline">Belum dihantar</Badge>
								)}
								{submission.approval.total > 0 && (
									<Badge variant="outline">
										{submission.approval.approved}/{submission.approval.total} diluluskan
									</Badge>
								)}
							</div>
							<div className="text-xs text-muted-foreground">
								Had: Objektif {limits.objectiveMax} • Subjektif {limits.subjectiveMax}
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
					<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
						<div>
							<CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
								<ClipboardList className="w-5 h-5 text-primary" />
								Senarai Pelajar - {selectedAssignment?.grade ?? "-"}{" "}
								{selectedAssignment?.class_name ?? "-"}
							</CardTitle>
							<p className="text-sm text-muted-foreground mt-1">
								Masukkan markah subjektif dan imbas OMR untuk markah objektif
							</p>
						</div>
					</CardHeader>
					<CardContent className="p-6">
						<div className="divide-y md:hidden">
							{students.map((s) => {
								const objectiveMark = getObjectiveMark(objectiveMarksByStudentId, s.id);
								const manualObjectiveMark = getManualObjectiveMark(
									manualObjectiveMarks,
									s.id,
								);
								const subjectiveMark = getSubjectiveMark(subjectiveMarks, s.id);
								const totalMark = manualObjectiveMark + subjectiveMark;
								const totalMax = limits.objectiveMax + limits.subjectiveMax;
								const totalPercent =
									totalMax > 0 ? Math.round((totalMark / totalMax) * 100) : 0;
								return (
									<div key={s.id} className="space-y-4 p-4">
										<div className="space-y-1">
											<div className="font-medium text-foreground">{s.name}</div>
											<div className="text-xs text-muted-foreground">{s.identifier}</div>
										</div>
										<div className="grid grid-cols-2 gap-3">
											<div className="rounded-lg border border-border/60 bg-background/70 p-3">
												<div className="text-xs text-muted-foreground">Objektif</div>
												<div className="mt-2 flex items-center gap-2">
													<Input
														type="number"
														min={0}
														max={limits.objectiveMax}
														className="h-8 w-20 text-center"
														value={manualObjectiveMarks[s.id] ?? ""}
														onChange={(e) =>
															setManualObjectiveMarks((prev) => ({
																...prev,
																[s.id]: e.target.value,
															}))
														}
														placeholder={`0-${limits.objectiveMax}`}
														title={
															objectiveMark !== null
																? `Markah scan: ${objectiveMark}`
																: "Masukkan markah objektif manual"
														}
													/>
													<Button
														type="button"
														variant="outline"
														size="icon"
														className="h-8 w-8 border-emerald-500 bg-background text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
														onClick={() => openOmrPage(s.id)}
														disabled={!selectedAssignment || !selectedExamId}
														title="Imbas OMR"
														aria-label={`Imbas OMR untuk ${s.name}`}
													>
														<Camera className="h-4 w-4" />
													</Button>
												</div>
											</div>
											<div className="rounded-lg border border-border/60 bg-background/70 p-3">
												<div className="text-xs text-muted-foreground">Subjektif</div>
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
											<div className="rounded-lg border border-border/60 bg-background/70 p-3 col-span-2">
												<div className="text-xs text-muted-foreground">Jumlah Markah</div>
												<div className="mt-1 text-lg font-semibold">
													{totalMark} / {totalMax}
												</div>
											</div>
											<div className="rounded-lg border border-border/60 bg-background/70 p-3 col-span-2">
												<div className="text-xs text-muted-foreground">Peratus</div>
												<div className="mt-1 text-lg font-semibold">{totalPercent}%</div>
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

						<div className="hidden rounded-lg border border-border overflow-hidden md:block">
							<div className="overflow-x-auto">
								<Table>
									<TableHeader className="bg-muted/30">
										<TableRow className="hover:bg-transparent border-b border-border">
											<TableHead className="font-semibold text-foreground py-4">
												Nama Pelajar
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4 text-center">
												Objektif
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4 text-center">
												Subjektif
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4 text-center">
												Jumlah Markah
											</TableHead>
											<TableHead className="font-semibold text-foreground py-4 text-center pr-6">
												Peratus
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{students.map((s) => {
											const objectiveMark = getObjectiveMark(
												objectiveMarksByStudentId,
												s.id,
											);
											const manualObjectiveMark = getManualObjectiveMark(
												manualObjectiveMarks,
												s.id,
											);
											const subjectiveMark = getSubjectiveMark(subjectiveMarks, s.id);
											const totalMark = manualObjectiveMark + subjectiveMark;
											const totalMax = limits.objectiveMax + limits.subjectiveMax;
											const totalPercent =
												totalMax > 0 ? Math.round((totalMark / totalMax) * 100) : 0;

											return (
												<TableRow
													key={s.id}
													className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group"
												>
													<TableCell className="py-4 font-medium">{s.name}</TableCell>
													<TableCell className="py-4 text-center">
														<div className="flex items-center justify-center gap-2">
															<Input
																type="number"
																min={0}
																max={limits.objectiveMax}
																className="h-8 w-24 text-center"
																value={manualObjectiveMarks[s.id] ?? ""}
																onChange={(e) =>
																	setManualObjectiveMarks((prev) => ({
																		...prev,
																		[s.id]: e.target.value,
																	}))
																}
																placeholder={`0-${limits.objectiveMax}`}
																title={
																	objectiveMark !== null
																		? `Markah scan: ${objectiveMark}`
																		: "Masukkan markah objektif manual"
																}
															/>
															<Button
																type="button"
																variant="outline"
																size="icon"
																className="h-8 w-8 border-emerald-500 bg-background text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
																onClick={() => openOmrPage(s.id)}
																disabled={!selectedAssignment || !selectedExamId}
																title="Imbas OMR"
																aria-label={`Imbas OMR untuk ${s.name}`}
															>
																<Camera className="h-4 w-4" />
															</Button>
														</div>
													</TableCell>
													<TableCell className="py-4 text-center">
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
													<TableCell className="py-4 text-center font-medium">
														{totalMark} / {totalMax}
													</TableCell>
													<TableCell className="py-4 text-center font-medium pr-6">
														{totalPercent}%
													</TableCell>
												</TableRow>
											);
										})}

										{!loading && students.length === 0 && (
											<TableRow>
												<TableCell
													colSpan={5}
													className="text-center text-muted-foreground py-16"
												>
													Tiada pelajar.
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							</div>
						</div>
					</CardContent>
				</Card>

				<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
					<Button variant="outline" disabled>
						<Save className="w-4 h-4 mr-2" />
						Simpan Draf
					</Button>
					<Button
						onClick={handleSubmitMarks}
						disabled={submitLoading || !selectedAssignmentId || !selectedExamId}
					>
						<Send className="w-4 h-4 mr-2" />
						{submitLoading ? "Menghantar..." : "Hantar"}
					</Button>
				</div>
			</div>
		</div>
	);
}
