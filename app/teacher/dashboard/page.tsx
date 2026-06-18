"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
	LayoutDashboard,
	AlertTriangle,
	BarChart3,
	BookOpen,
	ChartPie,
	Users,
	ClipboardList,
	FileText,
	FileSpreadsheet,
	Filter,
	Clock,
	Eye,
	Mail as MailIcon,
	Loader2,
	MessageSquareText,
	Pencil,
	RefreshCw,
	School,
	Sparkles,
	TrendingUp,
	Trophy,
} from "lucide-react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { formatMalaysiaDate, formatMalaysiaTime } from "@/lib/date-utils";
import { hasConfiguredDeadlineForAssignments, isMarkingClosedForAssignment } from "@/lib/exam-utils";
import { getDeadlineForGrade } from "@/lib/marking-template";

type TeacherRole = "class teacher" | "subject teacher" | "subject coordinator";

type Session = {
	user_id: string;
	userType: "teacher";
	role: string;
	roles?: string[];
};

type Assignment = {
	id: string;
	subject_id: string;
	subject_name: string;
	class_id: string;
	class_name: string;
	grade: number | null;
};

type AssignmentStatus = {
	totalStudents: number;
	submittedCount: number;
	isComplete: boolean;
	approval: {
		status: "none" | "pending" | "approved" | "rejected" | "mixed";
	};
};

type SubjectSetting = {
	deadline?: string;
	deadlines?: {
		lower?: string;
		upper?: string;
	};
	marking_closed?: Record<string, boolean>;
};

type Exam = {
	id: string;
	name: string;
	academic_year: string;
	subject_settings?: Record<string, SubjectSetting>;
};

function isHiddenSubjectTeacherExam(exam: Exam) {
	return (
		exam.academic_year.trim() === "2025" &&
		exam.name.trim().toLowerCase() === "peperiksaan akhir tahun"
	);
}

type DashboardStudent = {
	student_id: string;
	name: string;
	average: number;
	failedSubjects?: number;
	status?: string;
	declining?: boolean;
};

type ClassDashboardSummary = {
	topStudents: DashboardStudent[];
	studentsNeedAttention: DashboardStudent[];
	categoryBreakdown: Array<{ name: string; value: number; percent: number }>;
	subjectPerformance: Array<{ subject_id: string; subject: string; average: number }>;
	gradeDistribution: Array<{ grade: string; value: number }>;
	classAverage: number;
	insight: string;
};

type ClassDashboardData = {
	class: { id: string; name: string; grade: string | number | null };
	teacher: { id: string; name: string; email: string };
	totalStudents: number;
	exams: Array<{ id: string; name: string; academic_year: string }>;
	trend: Array<{ exam_id: string; exam: string; average: number; academic_year: string }>;
	examSummaries: Record<string, ClassDashboardSummary>;
};

type ClassStudentReport = {
	student_id: string;
	student_name: string;
	subjects: Array<{ subject_id: string; name: string; mark: number; grade: string }>;
	average_mark: number;
	position: number | null;
	comment: string;
	has_report_card?: boolean;
};

const STUDENT_PAGE_SIZE = 10;

function normalize(value: string) {
	return String(value ?? "")
		.toLowerCase()
		.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSession(): Session | null {
	try {
		const raw = localStorage.getItem("stg_session");
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed?.user_id || parsed?.userType !== "teacher") return null;
		return parsed as Session;
	} catch {
		return null;
	}
}

function resolveRole(session: Session): TeacherRole | null {
	const role = normalize(session.role);
	if (role === "class teacher") return "class teacher";
	if (role === "subject teacher") return "subject teacher";
	if (role === "subject coordinator") return "subject coordinator";
	return null;
}

function LastUpdatedTime() {
	const [time, setTime] = useState("");

	useEffect(() => {
		const update = () => {
			setTime(formatMalaysiaTime());
		};

		update();
		const interval = window.setInterval(update, 60000);
		return () => window.clearInterval(interval);
	}, []);

	return <span className="font-medium text-primary">{time || "Memuatkan..."}</span>;
}

function formatDeadline(value: string) {
	return value ? formatMalaysiaDate(value) : "-";
}

const PIE_COLORS = ["#16a34a", "#2563eb", "#f59e0b", "#e11d48"];

function statusClass(status?: string) {
	if (status === "Critical") {
		return "bg-rose-100 text-rose-700 border-rose-200";
	}
	if (status === "Weak") {
		return "bg-amber-100 text-amber-700 border-amber-200";
	}
	return "bg-blue-100 text-blue-700 border-blue-200";
}

function statusLabel(status?: string) {
	if (status === "Critical") return "Kritikal";
	if (status === "Weak") return "Lemah";
	if (status === "Monitor") return "Perlu Dipantau";
	if (!status) return "-";
	return status;
}

function gradeColor(grade: string) {
	switch (String(grade ?? "").toUpperCase()) {
		case "A":
			return "border-emerald-200 bg-emerald-100 text-emerald-700";
		case "B":
			return "border-sky-200 bg-sky-100 text-sky-700";
		case "C":
			return "border-amber-200 bg-amber-100 text-amber-700";
		case "D":
			return "border-orange-200 bg-orange-100 text-orange-700";
		default:
			return "border-rose-200 bg-rose-100 text-rose-700";
	}
}

function categoryLabel(name?: string) {
	const key = String(name ?? "").trim();
	if (key === "Excellent") return "Cemerlang";
	if (key === "Good") return "Baik";
	if (key === "Average") return "Sederhana";
	if (key === "Weak") return "Lemah";
	if (key === "Critical") return "Kritikal";
	return key || "-";
}

function EmptyText({ text }: { text: string }) {
	return <p className="text-sm text-muted-foreground py-6 text-center">{text}</p>;
}

function getAssignmentStatusBadge(status?: AssignmentStatus) {
	if (!status) {
		return {
			label: "Draf",
			className: "border-yellow-200 bg-yellow-100 text-yellow-700",
		};
	}

	if (status.approval.status === "approved" && status.isComplete) {
		return {
			label: "Selesai",
			className: "border-emerald-200 bg-emerald-100 text-emerald-700",
		};
	}

	if (status.approval.status === "rejected") {
		return {
			label: "Ditolak",
			className: "border-rose-200 bg-rose-100 text-rose-700",
		};
	}

	if (status.approval.status === "pending" || status.approval.status === "mixed") {
		return {
			label: "Menunggu",
			className: "border-violet-200 bg-violet-100 text-violet-700",
		};
	}

	if (!status || status.submittedCount === 0 || !status.isComplete) {
		return {
			label: "Draf",
			className: "border-yellow-200 bg-yellow-100 text-yellow-700",
		};
	}

	return {
		label: "Menunggu",
		className: "border-violet-200 bg-violet-100 text-violet-700",
	};
}

export default function TeacherDashboardPage() {
	const router = useRouter();
	const [session] = useState<Session | null>(() => readSession());

	useEffect(() => {
		if (!session) {
			router.replace("/login");
		}
	}, [router, session]);

	const role = session ? resolveRole(session) : null;

	useEffect(() => {
		if (!role) return;
		if (role === "subject coordinator") {
			router.replace("/coordinator/dashboard");
		}
	}, [role, router]);

	if (!session || !role) return null;
	if (role === "subject coordinator") return null;

	if (role === "class teacher") {
		return <ClassTeacherDashboard teacherId={session.user_id} />;
	}

	return <SubjectTeacherDashboard teacherId={session.user_id} />;
}

export function SubjectTeacherDashboard({ teacherId }: { teacherId: string }) {
	const router = useRouter();
	const [assignments, setAssignments] = useState<Assignment[]>([]);
	const [assignmentStatuses, setAssignmentStatuses] = useState<Record<string, AssignmentStatus>>({});
	const [loading, setLoading] = useState(true);
	const [exams, setExams] = useState<Exam[]>([]);
	const [selectedExamId, setSelectedExamId] = useState<string>("");
	const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
	const [teacherInfo, setTeacherInfo] = useState<{ name: string; email: string } | null>(null);
	const [deadlineDialogOpen, setDeadlineDialogOpen] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			setLoading(true);
			try {
				const res = await fetch(`/api/teacher/assignments?teacher_id=${teacherId}`);
				const json = await res.json();
				if (!cancelled) {
					setAssignments(Array.isArray(json?.data) ? (json.data as Assignment[]) : []);
				}
			} catch {
				if (!cancelled) setAssignments([]);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [teacherId]);

	async function refreshAssignments() {
		setLoading(true);
		try {
			const res = await fetch(`/api/teacher/assignments?teacher_id=${teacherId}`, {
				cache: "no-store",
			});
			const json = await res.json();
			setAssignments(Array.isArray(json?.data) ? (json.data as Assignment[]) : []);
		} catch {
			setAssignments([]);
			toast.error("Gagal memuatkan tugasan subjek");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		let cancelled = false;

		async function loadTeacherInfo() {
			try {
				const res = await fetch("/api/auth/me", { method: "POST" });
				if (!res.ok) return;
				const json: unknown = await res.json();
				if (!isRecord(json)) return;
				const name = String(json.name ?? "").trim();
				const email = String(json.email ?? "").trim();
				if (!cancelled && name) setTeacherInfo({ name, email });
			} catch {
				// ignore
			}
		}

		async function loadExams() {
			try {
				const res = await fetch("/api/admin/exams", { cache: "no-store" });
				const json: unknown = await res.json();
				const list: Exam[] = (Array.isArray(json) ? json : [])
					.map((e) => {
						const row = isRecord(e) ? e : {};
						const subjectSettings = isRecord(row.subject_settings)
							? Object.fromEntries(
									Object.entries(row.subject_settings).map(([subjectId, setting]) => {
										const record = isRecord(setting) ? setting : {};
										return [
											subjectId,
											{
												deadline:
													typeof record.deadline === "string"
														? record.deadline
														: undefined,
												deadlines: isRecord(record.deadlines)
													? {
															lower:
																typeof record.deadlines.lower === "string"
																	? record.deadlines.lower
																	: undefined,
															upper:
																typeof record.deadlines.upper === "string"
																	? record.deadlines.upper
																	: undefined,
														}
													: undefined,
												marking_closed: isRecord(record.marking_closed)
													? Object.fromEntries(
															Object.entries(record.marking_closed).map(([key, value]) => [
																key,
																value === true,
															]),
														)
													: undefined,
											},
										];
									}),
								)
							: {};

						return {
							id: String(row.id ?? ""),
							name: String(row.name ?? ""),
							academic_year: String(row.academic_year ?? ""),
							subject_settings: subjectSettings,
						};
					})
					.filter((e: Exam) => Boolean(e.id));

				if (cancelled) return;
				setExams(list);
			} catch {
				if (!cancelled) setExams([]);
			}
		}

		loadTeacherInfo();
		loadExams();
		return () => {
			cancelled = true;
		};
	}, []);

	const deadlineExams = useMemo(
		() =>
			exams.filter(
				(exam) =>
					!isHiddenSubjectTeacherExam(exam) &&
					hasConfiguredDeadlineForAssignments(exam, assignments),
			),
		[assignments, exams],
	);

	useEffect(() => {
		if (!selectedExamId) return;
		if (deadlineExams.some((exam) => exam.id === selectedExamId)) return;
		setSelectedExamId("");
	}, [deadlineExams, selectedExamId]);

	useEffect(() => {
		if (!selectedExamId || assignments.length === 0) {
			setAssignmentStatuses({});
			return;
		}

		let cancelled = false;

		async function loadStatuses() {
			const entries = await Promise.all(
				assignments.map(async (assignment) => {
					try {
						const res = await fetch(
							`/api/teacher/marks/status?teacher_id=${teacherId}&class_id=${assignment.class_id}&subject_id=${assignment.subject_id}&exam_id=${selectedExamId}`,
							{ cache: "no-store" },
						);
						const json = await res.json();
						return [
							assignment.id,
							{
								totalStudents: Number(json?.totalStudents ?? 0),
								submittedCount: Number(json?.submittedCount ?? 0),
								isComplete: Boolean(json?.isComplete),
								approval: {
									status: String(json?.approval?.status ?? "none") as AssignmentStatus["approval"]["status"],
								},
							},
						] as const;
					} catch {
						return null;
					}
				}),
			);

			if (cancelled) return;
			setAssignmentStatuses(
				Object.fromEntries(entries.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))),
			);
		}

		loadStatuses();

		return () => {
			cancelled = true;
		};
	}, [assignments, selectedExamId, teacherId]);

	useEffect(() => {
		if (selectedSubjectId === "all") return;
		if (assignments.some((assignment) => assignment.subject_id === selectedSubjectId)) return;
		setSelectedSubjectId("all");
	}, [assignments, selectedSubjectId]);

	const selectedExam = useMemo(() => {
		return exams.find((e) => e.id === selectedExamId) ?? null;
	}, [exams, selectedExamId]);

	const deadlineByAssignmentId = useMemo(() => {
		const all = selectedExam?.subject_settings ?? {};
		const m = new Map<string, string>();
		for (const a of assignments) {
			const s = all?.[a.subject_id];
			const d = getDeadlineForGrade(s, a.grade);
			if (d) m.set(a.id, d);
		}
		return m;
	}, [assignments, selectedExam?.subject_settings]);
	const markingClosedByAssignmentId = useMemo(() => {
		const closed = new Map<string, boolean>();
		if (!selectedExam) return closed;
		for (const assignment of assignments) {
			closed.set(assignment.id, isMarkingClosedForAssignment(selectedExam, assignment));
		}
		return closed;
	}, [assignments, selectedExam]);

	const subjectCount = useMemo(() => {
		return new Set(assignments.map((a) => a.subject_id)).size;
	}, [assignments]);

	const classCount = useMemo(() => {
		return new Set(assignments.map((a) => a.class_id)).size;
	}, [assignments]);

	const subjectSummary = useMemo(() => {
		const names = Array.from(new Set(assignments.map((a) => a.subject_name).filter(Boolean)));
		if (names.length === 0) return "Belum ada subjek";
		if (names.length <= 2) return names.join(", ");
		return `${names.slice(0, 2).join(", ")} +${names.length - 2} lagi`;
	}, [assignments]);
	const subjectWelcomeTitle =
		subjectSummary === "Belum ada subjek"
			? "Selamat Datang, Guru Subjek"
			: `Selamat Datang, Guru Subjek ${subjectSummary}`;

	const subjectOptions = useMemo(() => {
		const byId = new Map<string, string>();
		for (const assignment of assignments) {
			if (assignment.subject_id && assignment.subject_name) {
				byId.set(assignment.subject_id, assignment.subject_name);
			}
		}
		return Array.from(byId.entries())
			.map(([id, name]) => ({ id, name }))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [assignments]);

	const filteredAssignments = useMemo(() => {
		if (selectedSubjectId === "all") return assignments;
		return assignments.filter((assignment) => assignment.subject_id === selectedSubjectId);
	}, [assignments, selectedSubjectId]);

	const reminders = useMemo(() => {
		if (!selectedExamId) return [];

		const toLocalDate = (dateString: string) => {
			const normalized = String(dateString ?? "").trim();
			if (!normalized) return null;
			const dt = new Date(`${normalized}T00:00:00`);
			return Number.isNaN(dt.getTime()) ? null : dt;
		};

		const startOfToday = new Date();
		startOfToday.setHours(0, 0, 0, 0);

		const items = filteredAssignments
			.map((a) => {
				const deadline = deadlineByAssignmentId.get(a.id) || "";
				const deadlineDate = toLocalDate(deadline);
				if (!deadlineDate) return null;

				const status = assignmentStatuses[a.id];
				if (!status || status.isComplete) return null;

				const diffMs = deadlineDate.getTime() - startOfToday.getTime();
				const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

				return {
					id: a.id,
					subject: a.subject_name,
					classLabel: `${a.grade ?? "-"} ${a.class_name}`.trim(),
					deadline,
					daysLeft,
				};
			})
			.filter((x): x is NonNullable<typeof x> => Boolean(x))
			.filter((x) => x.daysLeft <= 7)
			.sort((a, b) => a.daysLeft - b.daysLeft);

		return items;
	}, [assignmentStatuses, deadlineByAssignmentId, filteredAssignments, selectedExamId]);

	useEffect(() => {
		if (reminders.length === 0 || !selectedExamId) return;

		try {
			const rawSession = localStorage.getItem("stg_session");
			const parsedSession = rawSession ? JSON.parse(rawSession) : null;
			const sessionKey = String(parsedSession?.session_id || teacherId);
			const reminderKey = `stg_deadline_reminder_shown:${sessionKey}`;
			if (sessionStorage.getItem(reminderKey)) return;
			sessionStorage.setItem(reminderKey, "1");
			setDeadlineDialogOpen(true);
		} catch {
			setDeadlineDialogOpen(true);
		}
	}, [reminders, selectedExamId, teacherId]);

	function openMarks(assignment: Assignment) {
		const viewOnly = markingClosedByAssignmentId.get(assignment.id) === true;
		sessionStorage.setItem(
			"stg_marks_entry_context",
			JSON.stringify({
				class_id: assignment.class_id,
				subject_id: assignment.subject_id,
				exam_id: selectedExamId,
				view_only: viewOnly,
			}),
		);
		router.push("/teacher/my-subject");
	}

	return (
		<div className="min-h-screen bg-background p-4 md:p-6">
			<Dialog open={deadlineDialogOpen} onOpenChange={setDeadlineDialogOpen}>
				<DialogContent className="sm:max-w-xl">
					<DialogHeader>
						<div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
							<AlertTriangle className="h-5 w-5" />
						</div>
						<DialogTitle>
							{reminders.some((item) => item.daysLeft < 0)
								? "Tugasan markah telah lewat"
								: "Tarikh akhir penghantaran semakin hampir"}
						</DialogTitle>
						<DialogDescription>
							Sila lengkapkan dan hantar markah secepat mungkin. Kelewatan berterusan boleh menyebabkan tindakan diambil oleh Guru Panitia Subjek.
						</DialogDescription>
					</DialogHeader>

					<div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
						{reminders.map((item) => {
							const overdue = item.daysLeft < 0;
							const timing =
								overdue
									? `Lewat ${Math.abs(item.daysLeft)} hari`
									: item.daysLeft === 0
										? "Tarikh akhir hari ini"
										: `${item.daysLeft} hari lagi`;

							return (
								<div
									key={item.id}
									className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3"
								>
									<div className="min-w-0">
										<p className="truncate font-semibold text-foreground">
											{item.subject}, {item.classLabel}
										</p>
										<p className="mt-0.5 text-sm text-muted-foreground">
											Tarikh akhir: {formatDeadline(item.deadline)}
										</p>
									</div>
									<Badge
										variant="outline"
										className={
											overdue
												? "border-rose-200 bg-rose-100 text-rose-700"
												: "border-amber-200 bg-amber-100 text-amber-700"
										}
									>
										{timing}
									</Badge>
								</div>
							);
						})}
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setDeadlineDialogOpen(false)}>
							Tutup
						</Button>
						<Button
							onClick={() => {
								const firstReminder = reminders[0];
								const assignment = assignments.find((item) => item.id === firstReminder?.id);
								if (assignment) openMarks(assignment);
								setDeadlineDialogOpen(false);
							}}
						>
							<ClipboardList className="mr-2 h-4 w-4" />
							Masuk Markah Sekarang
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div className="w-full max-w-none space-y-8">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div className="space-y-3">
						<div className="flex items-center gap-4">
							<div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
								<LayoutDashboard className="w-7 h-7 text-primary" />
							</div>
							<div>
								<h1 className="text-2xl font-bold text-foreground tracking-tight">
									{subjectWelcomeTitle}
								</h1>
								<p className="text-muted-foreground font-medium mt-1">
									Ringkasan tugasan pemarkahan, kelas diajar dan tarikh akhir hantar markah
								</p>
							</div>
						</div>
						<div className="flex items-center gap-4 text-muted-foreground">
							<div className="w-1 h-1 rounded-full bg-muted" />
							<div className="flex items-center gap-1">
								<Clock className="w-3.5 h-3.5" />
								<span>
									Kemas kini: <LastUpdatedTime />
								</span>
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Button
							variant="outline"
							onClick={refreshAssignments}
							disabled={loading}
							className="border-border hover:bg-accent hover:text-accent-foreground shadow-xs"
						>
							{loading ? (
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<RefreshCw className="w-4 h-4 mr-2" />
							)}
							Muat Semula
						</Button>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
					<DashboardStatCard
						label="Subjek Diajar"
						value={subjectCount}
						icon={BookOpen}
						tone="primary"
					/>
					<DashboardStatCard
						label="Jumlah Kelas"
						value={classCount}
						icon={Users}
						tone="emerald"
					/>
					<DashboardStatCard
						label="Tugasan"
						value={assignments.length}
						icon={ClipboardList}
						tone="blue"
					/>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
					<div className="space-y-6 lg:col-span-2">
						<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
							<CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
								<div className="space-y-2">
									<div className="text-sm font-medium text-muted-foreground">Peperiksaan</div>
									<Select value={selectedExamId} onValueChange={setSelectedExamId}>
										<SelectTrigger className="h-11 rounded-lg border-border bg-background">
											<SelectValue placeholder="Pilih peperiksaan" />
										</SelectTrigger>
										<SelectContent className="rounded-lg border-border">
											{deadlineExams.map((e) => (
												<SelectItem key={e.id} value={e.id}>
													{e.name} ({e.academic_year})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<div className="text-sm font-medium text-muted-foreground">Subjek</div>
									<Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
										<SelectTrigger className="h-11 rounded-lg border-border bg-background">
											<SelectValue placeholder="Pilih subjek" />
										</SelectTrigger>
										<SelectContent className="rounded-lg border-border">
											<SelectItem value="all">
												<div className="flex items-center gap-2">
													<BookOpen className="h-4 w-4" />
													Semua subjek
												</div>
											</SelectItem>
											{subjectOptions.map((subject) => (
												<SelectItem key={subject.id} value={subject.id}>
													{subject.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</CardContent>
						</Card>

						<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
						<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
							<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
								<div>
									<CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
										<ClipboardList className="w-5 h-5 text-primary" />
										Tugasan Subjek
									</CardTitle>
									<p className="text-sm text-muted-foreground mt-1">
										Senarai kelas dan subjek untuk kemasukan markah
									</p>
								</div>
								<Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-medium">
								<Filter className="w-5 h-5 text-primary" />
									{filteredAssignments.length} tugasan
								</Badge>
							</div>
						</CardHeader>
						<CardContent className="p-6">
							<div className="rounded-lg border border-border overflow-hidden">
								<div className="overflow-x-auto">
									<Table>
										<TableHeader className="bg-muted/30">
											<TableRow className="hover:bg-transparent border-b border-border">
												<TableHead className="font-semibold text-foreground py-4 w-16 text-center">
													#
												</TableHead>
												<TableHead className="font-semibold text-foreground py-4">
													Subjek
												</TableHead>
												<TableHead className="font-semibold text-foreground py-4">
													Kelas
												</TableHead>
												<TableHead className="font-semibold text-foreground py-4">
													Tarikh Akhir
												</TableHead>
												<TableHead className="font-semibold text-foreground py-4">
													Status
												</TableHead>
												<TableHead className="font-semibold text-foreground py-4 text-right pr-6">
													Tindakan
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{loading ? (
												<TableRow>
													<TableCell colSpan={6} className="py-16">
														<div className="flex flex-col items-center justify-center gap-4">
															<Loader2 className="w-10 h-10 animate-spin text-primary" />
															<div className="text-center">
																<p className="font-semibold text-foreground">
																	Memuatkan tugasan subjek...
																</p>
																<p className="text-sm text-muted-foreground mt-1">
																	Sila tunggu sebentar
																</p>
															</div>
														</div>
													</TableCell>
												</TableRow>
											) : assignments.length === 0 ? (
												<TableRow>
													<TableCell colSpan={6} className="py-16">
														<div className="flex flex-col items-center justify-center gap-4">
															<div className="p-4 rounded-full bg-muted/50">
																<ClipboardList className="w-12 h-12 text-muted-foreground/50" />
															</div>
															<div className="text-center">
																<p className="font-semibold text-foreground">
																	Tiada tugasan dijumpai
																</p>
																<p className="text-sm text-muted-foreground mt-1 max-w-md">
																	Tugasan kelas dan subjek akan dipaparkan selepas ditetapkan oleh penyelaras.
																</p>
															</div>
														</div>
													</TableCell>
												</TableRow>
											) : filteredAssignments.length === 0 ? (
												<TableRow>
													<TableCell colSpan={6} className="py-16">
														<div className="flex flex-col items-center justify-center gap-4">
															<div className="p-4 rounded-full bg-muted/50">
																<BookOpen className="w-12 h-12 text-muted-foreground/50" />
															</div>
															<div className="text-center">
																<p className="font-semibold text-foreground">
																	Tiada tugasan untuk subjek ini
																</p>
																<p className="text-sm text-muted-foreground mt-1 max-w-md">
																	Pilih subjek lain atau semak semula tugasan yang telah ditetapkan.
																</p>
															</div>
														</div>
													</TableCell>
												</TableRow>
											) : (
												filteredAssignments.map((a, index) => (
													<TableRow
														key={a.id}
														className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group"
													>
														<TableCell className="py-4 text-center">
															<div className="font-medium text-muted-foreground">
																{index + 1}
															</div>
														</TableCell>
														<TableCell className="py-4">
															<div className="flex items-center gap-3">
																<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
																	<BookOpen className="w-4 h-4 text-primary" />
																</div>
																<div>
																	<div className="font-semibold text-foreground">
																		{a.subject_name}
																	</div>
																</div>
															</div>
														</TableCell>
														<TableCell className="py-4">
															<div className="flex items-center gap-2">
																<Users className="w-4 h-4 text-muted-foreground" />
																<span className="font-medium text-foreground">
																	{a.grade ?? "-"} {a.class_name}
																</span>
															</div>
														</TableCell>
														<TableCell className="py-4">
															<Badge variant="outline" className="border-border bg-muted/30 text-foreground">
																{formatDeadline(deadlineByAssignmentId.get(a.id) || "")}
															</Badge>
														</TableCell>
														<TableCell className="py-4">
															{(() => {
																const badge = getAssignmentStatusBadge(assignmentStatuses[a.id]);
																return (
																	<Badge variant="outline" className={badge.className}>
																		{badge.label}
																	</Badge>
																);
															})()}
														</TableCell>
														<TableCell className="py-4 text-right pr-6">
															<Button
																size="sm"
																onClick={() => openMarks(a)}
																disabled={!selectedExamId}
															>
																{markingClosedByAssignmentId.get(a.id) ? (
																	<Eye className="w-4 h-4 mr-2" />
																) : (
																	<ClipboardList className="w-4 h-4 mr-2" />
																)}
																{markingClosedByAssignmentId.get(a.id) ? "Lihat Markah" : "Masuk Markah"}
															</Button>
														</TableCell>
													</TableRow>
												))
											)}
										</TableBody>
									</Table>
								</div>
							</div>
						</CardContent>
						<div className="border-t border-border bg-muted/20 px-6 py-4">
							<div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
								<div className="text-muted-foreground">
									<span className="font-semibold text-foreground">
										{filteredAssignments.length}
									</span>{" "}
									tugasan subjek dipaparkan
								</div>
								<div className="flex items-center gap-4 text-muted-foreground">
									<div className="flex items-center gap-1">
										<Clock className="w-3.5 h-3.5" />
										<span>
											Kemas kini: <LastUpdatedTime />
										</span>
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={refreshAssignments}
										disabled={loading}
										className="border-border shadow-xs hover:bg-accent hover:text-accent-foreground"
									>
										{loading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
										Muat Semula Data
									</Button>
								</div>
							</div>
						</div>
					</Card>
					</div>

					<div className="space-y-6">
						<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden h-fit">
							<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
								<CardTitle className="text-xl font-bold text-foreground">
									Maklumat Guru Subjek
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4 p-6">
								<ProfileRow label="Nama" value={teacherInfo?.name || "Belum tersedia"} />
								<ProfileRow label="Subjek" value={subjectSummary || "Belum tersedia"} />
								<ProfileRow label="E-mel" value={teacherInfo?.email || "Belum tersedia"} icon={MailIcon} />
								<ProfileRow label="Sesi akademik" value={String(new Date().getFullYear())} />
							</CardContent>
						</Card>

						<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden h-fit">
							<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
								<CardTitle className="text-xl font-bold text-foreground">
									Peringatan
								</CardTitle>
								<p className="text-sm text-muted-foreground mt-1">
									Tugasan yang hampir tarikh akhir (7 hari dan ke bawah)
								</p>
							</CardHeader>
							<CardContent className="space-y-3 p-6">
								{!selectedExamId ? (
									<div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
										Sila pilih peperiksaan untuk lihat peringatan tarikh akhir.
									</div>
								) : reminders.length === 0 ? (
									<div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
										Tiada peringatan buat masa ini.
									</div>
								) : (
									reminders.slice(0, 6).map((item) => {
										const urgencyClass =
											item.daysLeft < 0
												? "border-rose-200 bg-rose-50 text-rose-700"
												: item.daysLeft <= 1
													? "border-rose-200 bg-rose-50 text-rose-700"
													: item.daysLeft <= 3
														? "border-amber-200 bg-amber-50 text-amber-700"
														: "border-blue-200 bg-blue-50 text-blue-700";

										const daysText =
											item.daysLeft < 0
												? `Lewat ${Math.abs(item.daysLeft)} hari`
												: item.daysLeft === 0
													? "Hari ini"
													: `Dalam ${item.daysLeft} hari`;

										return (
											<div
												key={item.id}
												className="rounded-lg border border-border/60 p-4 bg-background"
											>
												<div className="flex items-start justify-between gap-3">
													<div className="min-w-0">
														<div className="font-semibold text-foreground truncate">
															{item.subject}
														</div>
														<div className="text-xs text-muted-foreground mt-1 truncate">
															{item.classLabel}
														</div>
														<div className="mt-3 flex items-center gap-2">
															<Badge variant="outline" className={urgencyClass}>
																{formatDeadline(item.deadline)}
															</Badge>
															<span className="text-xs text-muted-foreground">{daysText}</span>
														</div>
													</div>
													<Button
														size="sm"
														onClick={() => {
															const a = assignments.find((x) => x.id === item.id);
															if (a) openMarks(a);
														}}
														disabled={!selectedExamId}
														className="shrink-0"
													>
														Masuk Markah
													</Button>
												</div>
											</div>
										);
									})
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);

}

export function ClassTeacherDashboard({ teacherId }: { teacherId: string }) {
	const router = useRouter();
	const [data, setData] = useState<ClassDashboardData | null>(null);
	const [students, setStudents] = useState<ClassStudentReport[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedExamId, setSelectedExamId] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedStudent, setSelectedStudent] = useState<ClassStudentReport | null>(null);
	const [selectedStudentComment, setSelectedStudentComment] = useState("");
	const [commentLoading, setCommentLoading] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			setLoading(true);
			try {
				const res = await fetch(`/api/teacher/class-dashboard?teacher_id=${teacherId}`, { cache: "no-store" });
				const json = await res.json();
				const payload = (json?.data ?? null) as ClassDashboardData | null;
				if (!cancelled) {
					setData(payload);
					setSelectedExamId((current) => current || payload?.exams?.[0]?.id || "");
				}
			} catch {
				if (!cancelled) setData(null);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [teacherId, refreshKey]);

	useEffect(() => {
		if (!selectedExamId) {
			setStudents([]);
			return;
		}

		let cancelled = false;
		async function loadStudents() {
			try {
				const res = await fetch(
					`/api/teacher/report-cards/class?teacher_id=${encodeURIComponent(teacherId)}&exam_id=${encodeURIComponent(selectedExamId)}`,
					{ cache: "no-store" },
				);
				const json = await res.json();
				if (!cancelled) {
					setStudents(Array.isArray(json?.students) ? json.students : []);
					setCurrentPage(1);
				}
			} catch {
				if (!cancelled) setStudents([]);
			}
		}

		loadStudents();
		return () => {
			cancelled = true;
		};
	}, [selectedExamId, teacherId, refreshKey]);

	useEffect(() => {
		if (loading) return;
		if (data === null) {
			toast.error("Tiada kelas ditetapkan untuk Guru Kelas");
			router.replace("/teacher/my-class");
		}
	}, [data, loading, router]);

	const selectedExam = data?.exams.find((exam) => exam.id === selectedExamId) ?? null;
	const summary = selectedExamId ? data?.examSummaries?.[selectedExamId] : null;
	const className = data?.class?.name ?? "";
	const grade = data?.class?.grade ? String(data.class.grade) : "";
	const paginatedStudents = students.slice((currentPage - 1) * STUDENT_PAGE_SIZE, currentPage * STUDENT_PAGE_SIZE);
	const classLabel = grade ? `${grade} ${className}` : className || "Belum tersedia";
	const quickAccess = [
		{
			title: "Pengurusan Pelajar",
			description: "Tambah atau kemas kini maklumat pelajar kelas",
			href: "/teacher/my-class",
			icon: Users,
			accent: "bg-blue-100 text-blue-700 border-blue-200",
		},
		{
			title: "Kad Laporan",
			description: "Jana dan kemas kini kad laporan pelajar",
			href: "/teacher/report",
			icon: FileText,
			accent: "bg-emerald-100 text-emerald-700 border-emerald-200",
		},
		{
			title: "Laporan",
			description: "Lihat laporan prestasi kelas",
			href: "/teacher/analytics",
			icon: BarChart3,
			accent: "bg-amber-100 text-amber-700 border-amber-200",
		},
	];

	function openStudentMarks(student: ClassStudentReport) {
		setSelectedStudent(student);
		setSelectedStudentComment(student.comment ?? "");
	}

	function updateSelectedStudent(next: Partial<ClassStudentReport>) {
		if (!selectedStudent) return;
		const updated = { ...selectedStudent, ...next };
		setSelectedStudent(updated);
		setStudents((prev) =>
			prev.map((student) => (student.student_id === updated.student_id ? { ...student, ...next } : student)),
		);
	}

	async function generateAiComment() {
		if (!selectedStudent || !selectedExamId || !data?.class.id) return;
		setCommentLoading(true);
		try {
			const res = await fetch("/api/teacher/report-cards/comment", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					student_id: selectedStudent.student_id,
					class_id: data.class.id,
					teacher_id: teacherId,
					exam_id: selectedExamId,
					mode: "ai",
				}),
			});
			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.message || "Gagal jana ulasan AI");
				return;
			}
			const comment = String(json?.comment ?? "").trim();
			setSelectedStudentComment(comment);
			updateSelectedStudent({
				comment,
				average_mark: Number(json?.average_mark ?? selectedStudent.average_mark),
				position: json?.class_position ?? selectedStudent.position,
				has_report_card: true,
			});
			toast.success(`Ulasan AI dijana untuk ${selectedStudent.student_name}`);
		} catch {
			toast.error("Gagal jana ulasan AI");
		} finally {
			setCommentLoading(false);
		}
	}

	async function saveManualComment() {
		if (!selectedStudent || !selectedExamId || !data?.class.id) return;
		const trimmed = selectedStudentComment.trim();
		if (!trimmed) {
			toast.error("Ulasan manual tidak boleh kosong");
			return;
		}
		setCommentLoading(true);
		try {
			const res = await fetch("/api/teacher/report-cards/comment", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					student_id: selectedStudent.student_id,
					class_id: data.class.id,
					teacher_id: teacherId,
					exam_id: selectedExamId,
					mode: "manual",
					comment: trimmed,
				}),
			});
			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.message || "Gagal simpan ulasan manual");
				return;
			}
			updateSelectedStudent({
				comment: trimmed,
				average_mark: Number(json?.average_mark ?? selectedStudent.average_mark),
				position: json?.class_position ?? selectedStudent.position,
				has_report_card: true,
			});
			toast.success(`Ulasan manual disimpan untuk ${selectedStudent.student_name}`);
		} catch {
			toast.error("Gagal simpan ulasan manual");
		} finally {
			setCommentLoading(false);
		}
	}

	return (
		<div className="min-h-screen bg-background p-4 md:p-6">
			<div className="w-full max-w-none space-y-8">
				<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
					<div className="space-y-3">
						<div className="flex items-center gap-4">
							<div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
								<LayoutDashboard className="w-7 h-7 text-primary" />
							</div>
							<div>
								<h1 className="text-2xl font-bold text-foreground tracking-tight">
									Selamat Datang, Guru Kelas {classLabel}
								</h1>
								<p className="text-muted-foreground font-medium mt-1">
									Ringkasan kelas, pelajar terbaik, dan senarai pelajar untuk semakan markah.
								</p>
							</div>
						</div>
						<div className="flex items-center gap-4 text-muted-foreground">
							<div className="w-1 h-1 rounded-full bg-muted" />
							<div className="flex items-center gap-1">
								<Clock className="w-3.5 h-3.5" />
								<span>
									Kemas kini: <LastUpdatedTime />
								</span>
							</div>
						</div>
					</div>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<div className="inline-flex h-10 w-full items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground shadow-xs sm:w-auto sm:max-w-[260px]">
							<School className="h-4 w-4 shrink-0 text-primary" />
							<span className="truncate">{classLabel}</span>
						</div>
						<Button
							variant="outline"
							onClick={() => setRefreshKey((value) => value + 1)}
							disabled={loading}
							className="border-border shadow-xs hover:bg-accent hover:text-accent-foreground"
						>
							{loading ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<RefreshCw className="mr-2 h-4 w-4" />
							)}
							Muat Semula
						</Button>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
					{quickAccess.map((item) => (
						<Link key={item.title} href={item.href} className="group">
							<Card className="h-full border-border bg-card shadow-md rounded-xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg">
								<CardContent className="flex items-start gap-4 p-6">
									<div className={`rounded-xl border p-3 ${item.accent}`}>
										<item.icon className="h-6 w-6" />
									</div>
									<div className="min-w-0">
										<h3 className="text-lg font-bold text-foreground group-hover:text-primary">
											{item.title}
										</h3>
										<p className="mt-1 text-sm text-muted-foreground">
											{item.description}
										</p>
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
					<div className="space-y-6 lg:col-span-2">
						<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
							<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
								<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
									<div>
										<CardTitle className="flex items-center gap-2 text-xl font-bold">
											<Users className="h-5 w-5 text-primary" />
											Senarai Pelajar
										</CardTitle>
										<p className="text-sm text-muted-foreground mt-1">Markah pelajar yang sudah diluluskan.</p>
									</div>
									<Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
									<Filter className="mr-1.5 h-3.5 w-3.5" />
										{students.length} pelajar
									</Badge>
								</div>
							</CardHeader>
							<CardContent className="p-6">
								<div className="rounded-lg border border-border overflow-hidden">
									<div className="overflow-x-auto">
										<Table>
											<TableHeader className="bg-muted/30">
												<TableRow className="border-b border-border hover:bg-transparent">
													<TableHead className="w-12 py-4 text-center font-semibold text-foreground">#</TableHead>
													<TableHead className="py-4 font-semibold text-foreground">Pelajar</TableHead>
													<TableHead className="py-4 pr-6 text-right font-semibold text-foreground">Tindakan</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{loading ? (
													<TableRow>
														<TableCell colSpan={5} className="py-16">
															<div className="flex flex-col items-center justify-center gap-4">
																<Loader2 className="h-10 w-10 animate-spin text-primary" />
																<p className="font-semibold text-foreground">Memuatkan senarai pelajar...</p>
															</div>
														</TableCell>
													</TableRow>
												) : paginatedStudents.length === 0 ? (
													<TableRow>
														<TableCell colSpan={5} className="py-16">
															<div className="flex flex-col items-center justify-center gap-3">
																<div className="rounded-full bg-muted/50 p-4">
																	<Users className="h-10 w-10 text-muted-foreground/60" />
																</div>
																<p className="font-semibold text-foreground">Tiada pelajar untuk dipaparkan.</p>
															</div>
														</TableCell>
													</TableRow>
												) : (
													paginatedStudents.map((student, index) => (
														<TableRow
															key={student.student_id}
															className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
														>
															<TableCell className="py-4 text-center text-muted-foreground">
																{(currentPage - 1) * STUDENT_PAGE_SIZE + index + 1}
															</TableCell>
															<TableCell className="py-4">
																<div className="flex items-center gap-3">
																	<div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
																		<span className="text-sm font-bold text-primary">
																			{student.student_name.charAt(0)}
																		</span>
																	</div>
																	<div>
																		<div className="font-semibold text-foreground">{student.student_name}</div>
																	</div>
																</div>
															</TableCell>
															<TableCell className="py-4 pr-6 text-right">
																<Button size="sm" variant="outline" onClick={() => openStudentMarks(student)}>
																	<FileText className="mr-2 h-4 w-4" />
																	Lihat Markah
																</Button>
															</TableCell>
														</TableRow>
													))
												)}
											</TableBody>
										</Table>
									</div>
								</div>
							</CardContent>
							<div className="border-t border-border bg-muted/20 px-6 py-4">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<p className="text-sm text-muted-foreground">
										Menunjukkan{" "}
										<span className="font-semibold text-foreground">
											{students.length === 0 ? 0 : (currentPage - 1) * STUDENT_PAGE_SIZE + 1}-
											{students.length === 0 ? 0 : Math.min(currentPage * STUDENT_PAGE_SIZE, students.length)}
										</span>{" "}
										daripada <span className="font-semibold text-foreground">{students.length}</span> pelajar
									</p>
								</div>
							</div>
						</Card>
					</div>

					<div className="space-y-6">
						<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
							<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
								<CardTitle className="text-xl font-bold">Maklumat Guru Kelas</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4 p-6">
								<ProfileRow label="Nama" value={data?.teacher?.name || "Belum tersedia"} />
								<ProfileRow label="E-mel" value={data?.teacher?.email || "Belum tersedia"} icon={MailIcon} />
								<ProfileRow label="Kelas" value={classLabel} />
								<ProfileRow label="Peperiksaan" value={selectedExam ? `${selectedExam.name} (${selectedExam.academic_year})` : "Belum dipilih"} />
							</CardContent>
						</Card>

						<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
							<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
								<CardTitle className="flex items-center gap-2 text-xl font-bold">
									<Trophy className="h-5 w-5 text-primary" />
									Top 3 Pelajar Terbaik
								</CardTitle>
								<p className="text-sm text-muted-foreground">
									{selectedExam ? `${selectedExam.name} (${selectedExam.academic_year})` : "Pilih peperiksaan"}
								</p>
							</CardHeader>
							<CardContent className="space-y-3 p-6">
								{loading ? (
									<div className="py-8 text-center text-sm text-muted-foreground">Memuatkan data...</div>
								) : (summary?.topStudents ?? []).length === 0 ? (
									<div className="py-8 text-center text-sm text-muted-foreground">Tiada data pelajar.</div>
								) : (
									(summary?.topStudents ?? []).map((student, index) => (
										<div
											key={student.student_id}
											className="rounded-lg border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
										>
											<div className="flex items-center justify-between gap-3">
												<div className="min-w-0">
													<Badge variant="secondary">#{index + 1}</Badge>
													<p className="mt-2 truncate font-semibold text-foreground">{student.name}</p>
													<p className="text-xs text-muted-foreground">Purata keseluruhan</p>
												</div>
												<p className="shrink-0 text-xl font-bold text-primary">{student.average}%</p>
											</div>
										</div>
									))
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			<Dialog
				open={Boolean(selectedStudent)}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedStudent(null);
						setSelectedStudentComment("");
					}
				}}
			>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
					<DialogHeader>
						<DialogTitle>{selectedStudent?.student_name ?? "Markah Pelajar"}</DialogTitle>
						<DialogDescription>
							{selectedStudent?.position ? `Kedudukan #${selectedStudent.position}` : "Kedudukan: -"} ·{" "}
							{classLabel ? `Kelas: ${classLabel}` : ""}
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 px-1 pb-2">
						<Card className="overflow-hidden rounded-xl border-border bg-card shadow-md">
							<CardHeader className="border-b border-border px-6 py-5">
								<CardTitle className="flex items-center gap-2 text-base font-bold">
									<FileSpreadsheet className="h-5 w-5 text-primary" />
									Keputusan Subjek
								</CardTitle>
								<DialogDescription>Markah dan gred setiap subjek</DialogDescription>
							</CardHeader>
							<CardContent className="p-0">
								<div className="overflow-x-auto">
									<Table>
										<TableHeader className="bg-muted/30">
											<TableRow className="border-b border-border hover:bg-transparent">
												<TableHead className="w-16 py-4 text-center font-semibold text-foreground">Bil.</TableHead>
												<TableHead className="py-4 font-semibold text-foreground">Subjek</TableHead>
												<TableHead className="w-28 py-4 text-center font-semibold text-foreground">Markah</TableHead>
												<TableHead className="w-28 py-4 text-center font-semibold text-foreground">Gred</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{(selectedStudent?.subjects ?? []).map((subject, index) => (
												<TableRow
													key={`${selectedStudent?.student_id ?? "s"}-${subject.subject_id}`}
													className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
												>
													<TableCell className="py-4 text-center font-medium text-muted-foreground">{index + 1}</TableCell>
													<TableCell className="py-4 font-semibold text-foreground">{subject.name}</TableCell>
													<TableCell className="py-4 text-center font-semibold">{subject.mark}</TableCell>
													<TableCell className="py-4 text-center">
														<Badge variant="outline" className={gradeColor(subject.grade)}>
															{subject.grade}
														</Badge>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</CardContent>
						</Card>

						<Card className="overflow-hidden rounded-xl border-border bg-card shadow-md">
							<CardHeader className="border-b border-border px-6 py-5">
								<CardTitle className="flex items-center gap-2 text-base font-bold">
									<MessageSquareText className="h-5 w-5 text-primary" />
									Ulasan Guru Kelas
								</CardTitle>
								<DialogDescription>Ulasan guru kelas untuk slip keputusan</DialogDescription>
							</CardHeader>
							<CardContent className="space-y-3 p-6">
								<Textarea
									value={selectedStudentComment}
									onChange={(event) => setSelectedStudentComment(event.target.value)}
									placeholder="Tulis ulasan ringkas..."
									className="min-h-28"
								/>
								<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
									<Button
										variant="outline"
										onClick={generateAiComment}
										disabled={!selectedStudent || commentLoading}
										className="border-border shadow-xs hover:bg-accent hover:text-accent-foreground"
									>
										<Sparkles className="mr-2 h-4 w-4" />
										{commentLoading ? "Menjana..." : "Jana Ulasan AI"}
									</Button>
									<Button
										onClick={saveManualComment}
										disabled={!selectedStudent || !selectedStudentComment.trim() || commentLoading}
										className="shadow-sm"
									>
										<Pencil className="mr-2 h-4 w-4" />
										{commentLoading ? "Menyimpan..." : "Submit Ulasan"}
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export function ClassTeacherAnalyticsDashboard({ teacherId }: { teacherId: string }) {
	const router = useRouter();
	const [data, setData] = useState<ClassDashboardData | null>(null);
	const [loading, setLoading] = useState(true);
	const [selectedExamId, setSelectedExamId] = useState("");

	useEffect(() => {
		let cancelled = false;

		async function load() {
			setLoading(true);
			try {
				const res = await fetch(
					`/api/teacher/class-dashboard?teacher_id=${teacherId}`,
					{ cache: "no-store" },
				);
				const json = await res.json();
				const payload = (json?.data ?? null) as ClassDashboardData | null;
				if (!cancelled) {
					setData(payload);
					setSelectedExamId((current) => current || payload?.exams?.[0]?.id || "");
				}
			} catch {
				if (!cancelled) setData(null);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [teacherId]);

	useEffect(() => {
		if (loading) return;
		if (data === null) {
			toast.error("Tiada kelas ditetapkan untuk Guru Kelas");
			router.replace("/teacher/my-class");
		}
	}, [data, loading, router]);

	const className = data?.class?.name ?? "";
	const grade = data?.class?.grade ? String(data.class.grade) : "";
	const selectedExam = data?.exams.find((exam) => exam.id === selectedExamId) ?? null;
	const summary = selectedExamId ? data?.examSummaries?.[selectedExamId] : null;
	const classAverage = summary?.classAverage ?? 0;
	const attentionCount = summary?.studentsNeedAttention?.length ?? 0;
	const categoryBreakdownDisplay = useMemo(() => {
		return (summary?.categoryBreakdown ?? []).map((item) => ({
			...item,
			name: categoryLabel(item.name),
		}));
	}, [summary?.categoryBreakdown]);
	const subjectPerformanceSummary = useMemo(() => {
		const rows = summary?.subjectPerformance ?? [];
		if (rows.length === 0) return "Tiada keputusan subjek untuk diringkaskan.";
		const sorted = [...rows].sort((a, b) => b.average - a.average);
		const strongest = sorted[0];
		const weakest = sorted[sorted.length - 1];
		return `${strongest.subject} mencatat purata tertinggi ${strongest.average}%. ${weakest.subject} mencatat purata terendah ${weakest.average}%. Purata keseluruhan kelas ialah ${classAverage}%.`;
	}, [classAverage, summary?.subjectPerformance]);

	return (
		<div className="min-h-screen bg-background p-4 md:p-6">
			<div className="w-full max-w-none space-y-8">
				<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
					<div className="space-y-3">
						<div className="flex items-center gap-4">
							<BarChart3 className="h-7 w-7 shrink-0 text-primary" />
							<div>
								<h1 className="text-2xl font-bold text-foreground tracking-tight">
									Laporan Kelas
								</h1>
								<p className="text-muted-foreground font-medium mt-1">
									Analisis prestasi akademik bagi kelas{" "}
									<span className="text-primary font-bold">
										Tingkatan {grade || "-"} {className || "Belum ditetapkan"}
									</span>
								</p>
								{selectedExam && (
									<p className="text-xs text-muted-foreground mt-1">
										{selectedExam.name} ({selectedExam.academic_year})
									</p>
								)}
							</div>
						</div>
						<div className="flex items-center gap-4 text-muted-foreground">
							<div className="w-1 h-1 rounded-full bg-muted" />
							<div className="flex items-center gap-1">
								<Clock className="w-3.5 h-3.5" />
								<span>
									Kemas kini: <LastUpdatedTime />
								</span>
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Select value={selectedExamId} onValueChange={setSelectedExamId}>
							<SelectTrigger className="w-full sm:w-auto h-11 rounded-lg border-border bg-background">
								<SelectValue placeholder="Pilih peperiksaan" />
							</SelectTrigger>
							<SelectContent>
								{data?.exams.map((exam) => (
									<SelectItem key={exam.id} value={exam.id}>
										{exam.name} ({exam.academic_year})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-6">
					<div className="space-y-6">
						{loading ? (
							<Card className="border-border bg-card shadow-lg">
								<CardContent className="py-20 text-center">
									<Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
									<p className="text-sm text-muted-foreground mt-4">
										Memuatkan prestasi kelas...
									</p>
								</CardContent>
							</Card>
						) : !summary ? (
							<Card className="border-border bg-card shadow-lg">
								<CardContent className="py-16 text-center">
									<p className="font-semibold">Tiada data keputusan diluluskan lagi.</p>
									<p className="text-sm text-muted-foreground mt-1">
										Laporan akan dipaparkan selepas markah subjek diluluskan.
									</p>
								</CardContent>
							</Card>
						) : (
							<>
								<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
									<DashboardStatCard
										label="Purata Kelas"
										value={`${classAverage}%`}
										icon={BarChart3}
										tone="primary"
									/>
									<DashboardStatCard
										label="Pelajar Perlu Perhatian"
										value={attentionCount}
										icon={AlertTriangle}
										tone="blue"
									/>
									<DashboardStatCard
										label="Jumlah Pelajar"
										value={data?.totalStudents ?? 0}
										icon={Users}
										tone="emerald"
									/>
								</div>

								<div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
									<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
										<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
											<CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
												<ChartPie className="h-5 w-5 text-primary" />
												Pecahan Kategori Prestasi
											</CardTitle>
											<p className="text-sm text-muted-foreground">
												Kuantiti dan peratus pelajar mengikut tahap prestasi
											</p>
										</CardHeader>
										<CardContent className="p-6">
											<ResponsiveContainer width="100%" height={260}>
												<PieChart>
													<Pie
														data={categoryBreakdownDisplay}
														dataKey="value"
														nameKey="name"
														innerRadius={58}
														outerRadius={96}
														paddingAngle={4}
														label={({ percent }) => `${percent ?? 0}%`}
													>
														{categoryBreakdownDisplay.map((item, index) => (
															<Cell key={item.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
														))}
													</Pie>
													<Tooltip />
												</PieChart>
											</ResponsiveContainer>
											<div className="mt-4 grid grid-cols-2 gap-2">
												{categoryBreakdownDisplay.map((item, index) => (
													<div
														key={item.name}
														className="rounded-md border border-border bg-muted/20 p-2 text-center"
													>
														<div
															className="mx-auto mb-1 h-2 w-8 rounded-full"
															style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
														/>
														<div className="text-sm font-bold">{item.name}</div>
														<div className="text-xs text-muted-foreground">
															{item.value} pelajar ({item.percent}%)
														</div>
													</div>
												))}
											</div>
										</CardContent>
									</Card>

									<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
										<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
											<CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
												<TrendingUp className="h-5 w-5 text-primary" />
												Trend Prestasi
											</CardTitle>
											<p className="text-sm text-muted-foreground">
												Perubahan purata markah mengikut ujian
											</p>
										</CardHeader>
										<CardContent className="p-6">
											<ResponsiveContainer width="100%" height={300}>
												<LineChart data={data?.trend ?? []}>
													<CartesianGrid strokeDasharray="3 3" />
													<XAxis dataKey="exam" />
													<YAxis domain={[0, 100]} />
													<Tooltip />
													<Line
														type="monotone"
														dataKey="average"
														name="Purata"
														stroke="#2563eb"
														strokeWidth={3}
														dot={{ r: 5, fill: "#22c55e" }}
													/>
												</LineChart>
											</ResponsiveContainer>
										</CardContent>
									</Card>
								</div>

								<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
								<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
									<CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
										<BarChart3 className="h-5 w-5 text-primary" />
										Perbandingan Prestasi Subjek
									</CardTitle>
									<p className="text-sm text-muted-foreground">Purata markah setiap subjek bagi kelas ini.</p>
								</CardHeader>
								<CardContent className="space-y-4 p-6">
									{summary.subjectPerformance.length === 0 ? (
										<EmptyText text="Tiada data subjek." />
									) : (
										<ResponsiveContainer width="100%" height={340}>
											<BarChart data={summary.subjectPerformance}>
												<CartesianGrid vertical={false} strokeDasharray="3 3" />
												<XAxis dataKey="subject" tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={72} />
												<YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
												<Tooltip />
												<Bar dataKey="average" name="Purata" fill="#2563eb" radius={[6, 6, 0, 0]} />
											</BarChart>
										</ResponsiveContainer>
									)}
									<div className="rounded-lg bg-muted/40 px-4 py-3 text-sm leading-relaxed text-foreground">
										<span className="font-semibold">Ringkasan Prestasi: </span>
										{subjectPerformanceSummary}
									</div>
								</CardContent>
							</Card>

						<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
							<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
								<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
									<CardTitle className="flex items-center gap-2">
										<Trophy className="w-5 h-5 text-primary" />
										Senarai Pelajar Cemerlang
									</CardTitle>
									<p className="text-sm text-muted-foreground">Top 3 pelajar terbaik bagi kelas ini.</p>
								</CardHeader>
								<CardContent className="p-6">
									<div className="rounded-lg border border-border overflow-hidden">
										<div className="overflow-x-auto">
											<Table>
												<TableHeader className="bg-muted/30">
													<TableRow className="hover:bg-transparent border-b border-border">
														<TableHead className="w-14 py-4 text-center font-semibold text-foreground">#</TableHead>
														<TableHead className="font-semibold text-foreground py-4">
															Pelajar
														</TableHead>
														<TableHead className="py-4 text-center font-semibold text-foreground">Purata</TableHead>
														<TableHead className="py-4 text-center font-semibold text-foreground">Kedudukan</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{summary.topStudents.length === 0 ? (
														<TableRow>
															<TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
																Tiada data pelajar.
															</TableCell>
														</TableRow>
													) : (
														summary.topStudents.map((student, index) => (
															<TableRow key={student.student_id} className="hover:bg-muted/20">
																<TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
																<TableCell className="font-semibold">{student.name}</TableCell>
																<TableCell className="text-center font-semibold">{student.average}%</TableCell>
																<TableCell className="text-center">{index + 1}</TableCell>
															</TableRow>
														))
													)}
												</TableBody>
											</Table>
										</div>
									</div>
								</CardContent>
							</Card>
							<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
								<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
									<CardTitle className="flex items-center gap-2">
										<AlertTriangle className="w-5 h-5 text-primary" />
										Senarai Pelajar Perlu Perhatian
									</CardTitle>
									<p className="text-sm text-muted-foreground">Pelajar yang memerlukan sokongan lanjut.</p>
								</CardHeader>
								<CardContent className="p-6">
									<div className="rounded-lg border border-border overflow-hidden">
										<Table>
											<TableHeader className="bg-muted/30">
												<TableRow className="hover:bg-transparent border-b border-border">
													<TableHead className="w-14 py-4 text-center font-semibold text-foreground">#</TableHead>
													<TableHead className="py-4 font-semibold text-foreground">Pelajar</TableHead>
													<TableHead className="py-4 text-center font-semibold text-foreground">Purata</TableHead>
													<TableHead className="py-4 text-center font-semibold text-foreground">Status</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{summary.studentsNeedAttention.length === 0 ? (
													<TableRow>
														<TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
															Tiada pelajar dalam kategori perhatian.
														</TableCell>
													</TableRow>
												) : (
													summary.studentsNeedAttention.map((student, index) => (
														<TableRow key={student.student_id} className="hover:bg-muted/20">
															<TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
															<TableCell className="font-semibold">{student.name}</TableCell>
															<TableCell className="text-center font-semibold text-rose-600">{student.average}%</TableCell>
															<TableCell className="text-center">
																<Badge variant="outline" className={statusClass(student.status)}>
																	{statusLabel(student.status)}
																</Badge>
															</TableCell>
														</TableRow>
													))
												)}
											</TableBody>
										</Table>
									</div>
								</CardContent>
							</Card>
						</div>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function DashboardStatCard({
	label,
	value,
	icon: Icon,
	tone,
}: {
	label: string;
	value: string | number;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	tone: "primary" | "emerald" | "blue";
}) {
	const toneClass =
		tone === "emerald"
			? "text-emerald-600 bg-emerald-100 border-emerald-200"
			: tone === "blue"
				? "text-blue-600 bg-blue-100 border-blue-200"
				: "text-primary bg-primary/10 border-primary/20";

	return (
		<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
			<CardContent className="flex items-center justify-between p-5">
				<div className="min-w-0 pr-4">
					<p className="text-sm text-muted-foreground">{label}</p>
					<h3 className="mt-2 text-2xl font-bold text-foreground truncate">
						{value}
					</h3>
				</div>
				<div className={`rounded-xl border p-3 ${toneClass}`}>
					<Icon className="w-5 h-5" />
				</div>
			</CardContent>
		</Card>
	);
}

function ProfileRow({
	label,
	value,
	icon: Icon,
}: {
	label: string;
	value: string | number;
	icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
	return (
		<div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
			<p className="flex items-center gap-2 text-sm text-muted-foreground">
				{Icon ? <Icon className="h-4 w-4" /> : null}
				{label}
			</p>
			<p className="mt-1 font-semibold text-foreground">{value}</p>
		</div>
	);
}

