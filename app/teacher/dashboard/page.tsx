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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	LayoutDashboard,
	AlertTriangle,
	BookOpen,
	Users,
	ClipboardList,
	Camera,
	FileText,
	Shield,
	Clock,
	Mail as MailIcon,
	Lightbulb,
	Loader2,
	RefreshCw,
	TrendingUp,
	Trophy,
} from "lucide-react";
import {
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
};

type Exam = {
	id: string;
	name: string;
	academic_year: string;
	subject_settings?: Record<string, SubjectSetting>;
};

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
			setTime(
				new Date().toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				}),
			);
		};

		update();
		const interval = window.setInterval(update, 60000);
		return () => window.clearInterval(interval);
	}, []);

	return <span className="font-medium text-primary">{time || "Memuatkan..."}</span>;
}

const PIE_COLORS = ["#16a34a", "#2563eb", "#f59e0b", "#e11d48"];
const GRADE_COLORS = ["#2563eb", "#22c55e", "#facc15", "#fb7185", "#ef4444"];

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
	if (!status) return "-";
	return status;
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

function translateInsight(insight?: string) {
	const text = String(insight ?? "").trim();
	if (!text) return "";

	// Pattern: "Most students perform well in X, but X shows the lowest average score."
	const m1 = text.match(/^Most students perform well in (.+), but \1 shows the lowest average score\.$/i);
	if (m1) {
		const subject = m1[1].trim();
		return `Kebanyakan pelajar berprestasi baik dalam ${subject}, namun ${subject} mempunyai purata markah paling rendah.`;
	}

	return text;
}

function EmptyText({ text }: { text: string }) {
	return <p className="text-sm text-muted-foreground py-6 text-center">{text}</p>;
}

function getAssignmentStatusBadge(status?: AssignmentStatus) {
	if (!status || status.submittedCount === 0 || !status.isComplete) {
		return {
			label: "Draf",
			className: "border-yellow-200 bg-yellow-100 text-yellow-700",
		};
	}

	if (status.approval.status === "approved") {
		return {
			label: "Selesai",
			className: "border-emerald-200 bg-emerald-100 text-emerald-700",
		};
	}

	if (status.approval.status === "rejected") {
		return {
			label: "Perlu Pembetulan",
			className: "border-rose-200 bg-rose-100 text-rose-700",
		};
	}

	if (status.approval.status === "pending" || status.approval.status === "mixed") {
		return {
			label: "Dalam Semakan",
			className: "border-blue-200 bg-blue-100 text-blue-700",
		};
	}

	return {
		label: "Dihantar",
		className: "border-sky-200 bg-sky-100 text-sky-700",
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

function SubjectTeacherDashboard({ teacherId }: { teacherId: string }) {
	const router = useRouter();
	const [assignments, setAssignments] = useState<Assignment[]>([]);
	const [assignmentStatuses, setAssignmentStatuses] = useState<Record<string, AssignmentStatus>>({});
	const [loading, setLoading] = useState(true);
	const [exams, setExams] = useState<Exam[]>([]);
	const [selectedExamId, setSelectedExamId] = useState<string>("");
	const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
	const [teacherInfo, setTeacherInfo] = useState<{ name: string; email: string } | null>(null);

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
				setSelectedExamId((current) => current || list[0]?.id || "");
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

	const deadlineBySubjectId = useMemo(() => {
		const all = selectedExam?.subject_settings ?? {};
		const m = new Map<string, string>();
		for (const a of assignments) {
			const s = all?.[a.subject_id];
			const d = String(s?.deadline ?? "").trim();
			if (d) m.set(a.subject_id, d);
		}
		return m;
	}, [assignments, selectedExam?.subject_settings]);

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
				const deadline = deadlineBySubjectId.get(a.subject_id) || "";
				const deadlineDate = toLocalDate(deadline);
				if (!deadlineDate) return null;

				const status = assignmentStatuses[a.id];
				const isApproved = status?.approval?.status === "approved";
				if (isApproved) return null;

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
	}, [assignmentStatuses, deadlineBySubjectId, filteredAssignments, selectedExamId]);

	function openMarks(assignment: Assignment) {
		localStorage.setItem(
			"stg_marks_context",
			JSON.stringify({
				class_id: assignment.class_id,
				subject_id: assignment.subject_id,
				exam_id: selectedExamId,
			}),
		);
		router.push("/teacher/my-subject");
	}

	return (
		<div className="min-h-screen bg-background p-4 md:p-6">
			<div className="w-full max-w-none space-y-8">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div className="space-y-3">
						<div className="flex items-center gap-4">
							<div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
								<LayoutDashboard className="w-7 h-7 text-primary" />
							</div>
							<div>
								<h1 className="text-2xl font-bold text-foreground tracking-tight">
									Dashboard Guru Subjek
								</h1>
								<p className="text-muted-foreground font-medium mt-1">
									Ringkasan tugasan pemarkahan, kelas diajar dan tarikh akhir hantar markah
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
							<div className="flex items-center gap-1">
								<Shield className="w-3.5 h-3.5" />
								<span>Data Tugasan Terkawal</span>
							</div>
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
											{exams.map((e) => (
												<SelectItem key={e.id} value={e.id}>
													{e.name} ({e.academic_year})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<div className="text-sm font-medium text-muted-foreground">Subjek Diajar</div>
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
																{deadlineBySubjectId.get(a.subject_id) || "-"}
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
																<ClipboardList className="w-4 h-4 mr-2" />
																Masuk Markah
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
									<div className="flex items-center gap-2">
										<Clock className="w-4 h-4" />
										<span>
											Kemas kini: <LastUpdatedTime />
										</span>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={refreshAssignments}
										disabled={loading}
										className="h-8"
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
																{item.deadline}
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

function ClassTeacherDashboard({ teacherId }: { teacherId: string }) {
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
	const teacherName = data?.teacher?.name || "Belum tersedia";
	const teacherEmail = data?.teacher?.email || "Belum tersedia";
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
									Dashboard Guru Kelas
								</h1>
								<p className="text-muted-foreground font-medium mt-1">
									Tingkatan {grade || "-"} | Guru Kelas:{" "}
									<span className="text-primary font-bold">
										{className || "Belum ditetapkan"}
									</span>
								</p>
								{selectedExam && (
									<p className="text-xs text-muted-foreground mt-1">
										{selectedExam.name} ({selectedExam.academic_year})
									</p>
								)}
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
							<div className="flex items-center gap-1">
								<Shield className="w-3.5 h-3.5" />
								<span>Data Kelas Terkawal</span>
							</div>
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
						<Button onClick={() => router.push("/teacher/my-class")}>
							<Users className="w-4 h-4 mr-2" />
							Pengurusan Kelas
						</Button>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
					<DashboardStatCard
						label="Jumlah Pelajar"
						value={data?.totalStudents ?? 0}
						icon={Users}
						tone="primary"
					/>
					<DashboardStatCard
						label="Purata Kelas"
						value={`${classAverage}%`}
						icon={TrendingUp}
						tone="emerald"
					/>
					<DashboardStatCard
						label="Perlu Perhatian"
						value={attentionCount}
						icon={AlertTriangle}
						tone="blue"
					/>
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
										Dashboard akan dipaparkan selepas markah subjek diluluskan.
									</p>
								</CardContent>
							</Card>
						) : (
							<>
								<div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
									<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
										<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
											<CardTitle>Analisis Gred</CardTitle>
											<p className="text-sm text-muted-foreground">
												Taburan gred pelajar bagi kelas ini
											</p>
										</CardHeader>
										<CardContent className="p-6">
											<ResponsiveContainer width="100%" height={260}>
												<PieChart>
													<Pie
														data={summary.gradeDistribution}
														dataKey="value"
														nameKey="grade"
														innerRadius={58}
														outerRadius={96}
														paddingAngle={4}
														label
													>
														{summary.gradeDistribution.map((_, index) => (
															<Cell key={index} fill={GRADE_COLORS[index % GRADE_COLORS.length]} />
														))}
													</Pie>
													<Tooltip />
												</PieChart>
											</ResponsiveContainer>
											<div className="mt-4 grid grid-cols-5 gap-2">
												{summary.gradeDistribution.map((item, index) => (
													<div
														key={item.grade}
														className="rounded-md border border-border bg-muted/20 p-2 text-center"
													>
														<div
															className="mx-auto mb-1 h-2 w-8 rounded-full"
															style={{ backgroundColor: GRADE_COLORS[index % GRADE_COLORS.length] }}
														/>
														<div className="text-sm font-bold">{item.grade}</div>
														<div className="text-xs text-muted-foreground">{item.value}</div>
													</div>
												))}
											</div>
										</CardContent>
									</Card>

									<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
										<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
											<CardTitle>Trend Prestasi</CardTitle>
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
														stroke="#2563eb"
														strokeWidth={3}
														dot={{ r: 5, fill: "#22c55e" }}
													/>
												</LineChart>
											</ResponsiveContainer>
										</CardContent>
									</Card>
								</div>

								<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
									<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
								<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
									<CardTitle className="flex items-center gap-2">
										<Trophy className="w-5 h-5 text-primary" />
										3 Pelajar Terbaik Kelas 
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									{summary.topStudents.length === 0 ? (
										<EmptyText text="Tiada data pelajar." />
									) : (
										summary.topStudents.map((student, index) => (
											<div
												key={student.student_id}
												className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3"
											>
												<div className="flex items-center gap-3">
													<div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
														{["1", "2", "3"][index]}
													</div>
													<div>
														<p className="font-semibold">{student.name}</p>
														<p className="text-xs text-muted-foreground">
															Peratus keseluruhan
														</p>
													</div>
												</div>
												<p className="text-lg font-bold">{student.average}%</p>
											</div>
										))
									)}
								</CardContent>
							</Card>

							<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden xl:col-span-2">
								<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
									<CardTitle>Perbandingan Prestasi Subjek</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4 p-6">
									{summary.subjectPerformance.length === 0 ? (
										<EmptyText text="Tiada data subjek." />
									) : (
										summary.subjectPerformance.map((subject) => (
											<div key={subject.subject_id} className="space-y-2">
												<div className="flex items-center justify-between text-sm">
													<span className="font-medium">{subject.subject}</span>
													<span className="font-semibold">{subject.average}%</span>
												</div>
												<div className="h-2 rounded-full bg-muted overflow-hidden">
													<div
														className="h-full rounded-full bg-primary"
														style={{ width: `${Math.min(subject.average, 100)}%` }}
													/>
												</div>
											</div>
										))
									)}
								</CardContent>
							</Card>
						</div>

						<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
							<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
								<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
									<CardTitle className="flex items-center gap-2">
										<AlertTriangle className="w-5 h-5 text-primary" />
										Pelajar Perlu Perhatian
									</CardTitle>
								</CardHeader>
								<CardContent className="p-6">
									<div className="rounded-lg border border-border overflow-hidden">
										<div className="overflow-x-auto">
											<Table>
												<TableHeader className="bg-muted/30">
													<TableRow className="hover:bg-transparent border-b border-border">
														<TableHead className="font-semibold text-foreground py-4">
															Pelajar
														</TableHead>
														<TableHead className="font-semibold text-foreground py-4">
															Peratus Keseluruhan
														</TableHead>
														<TableHead className="font-semibold text-foreground py-4">
															Status
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{summary.studentsNeedAttention.length === 0 ? (
														<TableRow>
															<TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
																Tiada pelajar dalam kategori perhatian.
															</TableCell>
														</TableRow>
													) : (
														summary.studentsNeedAttention.map((student) => (
															<TableRow key={student.student_id} className="hover:bg-muted/20">
																<TableCell className="font-medium whitespace-nowrap">
																	{student.name}
																</TableCell>
																<TableCell className="whitespace-nowrap">
																	{student.average}%
																</TableCell>
																<TableCell className="whitespace-nowrap">
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
									</div>
								</CardContent>
							</Card>
							<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
								<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
									<CardTitle>Pecahan Kategori Prestasi</CardTitle>
								</CardHeader>
								<CardContent className="grid gap-4 md:grid-cols-[240px_1fr] md:items-center">
									<div className="h-60">
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Tooltip />
												<Pie
													data={categoryBreakdownDisplay}
													dataKey="percent"
													nameKey="name"
													innerRadius={52}
													outerRadius={86}
													paddingAngle={3}
												>
													{categoryBreakdownDisplay.map((entry, index) => (
														<Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
													))}
												</Pie>
											</PieChart>
										</ResponsiveContainer>
									</div>
									<div className="space-y-2">
										{categoryBreakdownDisplay.map((item, index) => (
											<div key={item.name} className="flex items-center justify-between text-sm">
												<div className="flex items-center gap-2">
													<span
														className="h-3 w-3 rounded-full"
														style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
													/>
													<span>{item.name}</span>
												</div>
												<span className="font-semibold">{item.percent}%</span>
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						</div>

						<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
							<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
								<CardTitle className="flex items-center gap-2">
									<Lightbulb className="w-5 h-5 text-primary" />
									Analisis Kelas
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm leading-6 text-muted-foreground">
									{translateInsight(summary.insight)}
								</p>
							</CardContent>
						</Card>
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

function QuickLink({
	href,
	icon: Icon,
	title,
	desc,
}: {
	href: string;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	title: string;
	desc: string;
}) {
	return (
		<Link href={href} className="block">
			<div className="rounded-lg border border-border/60 p-3 hover:bg-muted/30 transition-colors">
				<div className="flex items-start gap-3">
					<div className="mt-0.5 p-2 rounded-md bg-primary/10">
						<Icon className="w-4 h-4 text-primary" />
					</div>
					<div className="min-w-0">
						<div className="font-semibold leading-tight">{title}</div>
						<div className="text-xs text-muted-foreground mt-1">{desc}</div>
					</div>
				</div>
			</div>
		</Link>
	);
}
