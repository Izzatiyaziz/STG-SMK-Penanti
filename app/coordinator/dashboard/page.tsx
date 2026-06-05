"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	addDaysToDateInputValue,
	formatMalaysiaDate,
	formatMalaysiaTime,
} from "@/lib/date-utils";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	BarChart3,
	CalendarDays,
	CheckCircle2,
	ClipboardList,
	Clock,
	Filter,
	BookOpen,
	FileText,
	GraduationCap,
	Loader2,
	Mail,
	RefreshCw,
	School,
	Settings,
	UserCog,
	Users,
} from "lucide-react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

type Session = {
	user_id: string;
	userType: "teacher";
	role: string;
};

type Subject = { id: string; name: string };
type Exam = {
	id: string;
	name: string;
	academic_year: string;
	subject_settings?: Record<string, unknown>;
};

type DashboardData = {
	coordinator: { id: string; name: string } | null;
	subject: { id: string; name: string } | null;
	exam: { id: string; name: string; academic_year: string } | null;
	subject_settings: Record<string, unknown>;
	summary: {
		totalClasses: number;
		totalTeachers: number;
		subjectPerformance: number;
		pendingSubmissions: number;
	};
	classSummaries: Array<{
		class_id: string;
		class_name: string;
		grade: number;
		teacher_id: string;
		teacher_name: string;
		total_students: number;
		submitted_count: number;
		results_count: number;
		average_total: number;
		status_counts: { pending: number; approved: number; rejected: number };
	}>;
	alerts: string[];
};

type SubjectResponse = {
	data?: { id?: unknown; name?: unknown }[];
};

type DashboardApiMessage = {
	message?: string;
};

type QuickAccessItem = {
	title: string;
	description: string;
	href: string;
	icon: typeof Users;
	accent: string;
};

function getTimeLabel() {
	return formatMalaysiaTime();
}

const LastUpdatedTime = () => {
	const [time, setTime] = useState(() => getTimeLabel());

	useEffect(() => {
		const interval = setInterval(() => {
			setTime(getTimeLabel());
		}, 60000);
		return () => clearInterval(interval);
	}, []);

	return <span className="font-medium text-primary">{time || "Memuatkan..."}</span>;
};

function addDays(dateValue: unknown, days: number) {
	return addDaysToDateInputValue(String(dateValue ?? "").trim(), days);
}

function getGradeDotColor(grade: number) {
	switch (grade) {
		case 1:
			return "bg-emerald-500";
		case 2:
			return "bg-blue-500";
		case 3:
			return "bg-amber-500";
		case 4:
			return "bg-purple-500";
		case 5:
			return "bg-rose-500";
		default:
			return "bg-gray-500";
	}
}

function getCoordinatorTaskBadge(row: DashboardData["classSummaries"][number]) {
	const pending = row.status_counts?.pending ?? 0;
	const approved = row.status_counts?.approved ?? 0;
	const rejected = row.status_counts?.rejected ?? 0;

	if (rejected > 0) {
		return {
			label: "Ditolak",
			className: "border-rose-200 bg-rose-100 text-rose-700",
		};
	}

	if (pending > 0) {
		return {
			label: "Menunggu",
			className: "border-violet-200 bg-violet-100 text-violet-700",
		};
	}

	if (approved > 0 && row.total_students > 0 && approved >= row.total_students) {
		return {
			label: "Diluluskan",
			className: "border-emerald-200 bg-emerald-100 text-emerald-700",
		};
	}

	if (row.submitted_count > 0) {
		return {
			label: "Menunggu",
			className: "border-violet-200 bg-violet-100 text-violet-700",
		};
	}

	return {
		label: "Draf",
		className: "border-yellow-200 bg-yellow-100 text-yellow-700",
	};
}

function buildApprovalHref(params: {
	subjectId: string;
	examId: string;
	classId: string;
	teacherId: string;
	grade: number;
}) {
	const searchParams = new URLSearchParams();
	searchParams.set("open", "1");
	searchParams.set("subject_id", params.subjectId);
	searchParams.set("exam_id", params.examId);
	searchParams.set("class_id", params.classId);
	searchParams.set("teacher_id", params.teacherId);
	searchParams.set("grade", String(params.grade));
	return `/coordinator/approvals?${searchParams.toString()}`;
}

export default function SubjectCoordinatorDashboard() {
	const router = useRouter();
	const [session, setSession] = useState<Session | null>(null);
	const [sessionReady, setSessionReady] = useState(false);
	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [exams, setExams] = useState<Exam[]>([]);
	const [subjectId, setSubjectId] = useState("");
	const [examId, setExamId] = useState("");
	const [gradeFilter, setGradeFilter] = useState("default-grade-1");
	const [classFilter, setClassFilter] = useState("all");
	const [teacherFilter, setTeacherFilter] = useState("all");
	const [data, setData] = useState<DashboardData | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		try {
			const raw = localStorage.getItem("stg_session");
			if (!raw) return;
			const parsed = JSON.parse(raw) as Session;
			if (parsed?.userType !== "teacher") return;

			const role = String(parsed.role ?? "").toLowerCase().trim();
			if (role !== "subject coordinator") {
				toast.error("Anda tidak dibenarkan akses dashboard penyelaras");
				router.replace("/teacher/dashboard");
				return;
			}

			setSession(parsed);
		} catch {
			// ignore
		} finally {
			setSessionReady(true);
		}
	}, [router]);

	useEffect(() => {
		if (!sessionReady) return;
		if (!localStorage.getItem("stg_session")) router.replace("/login");
	}, [router, sessionReady]);

	useEffect(() => {
		if (!session) return;

		const teacherId = session.user_id;
		let cancelled = false;

		async function loadOptions() {
			try {
				const [sRes, eRes] = await Promise.all([
					fetch(`/api/coordinator/subjects?teacher_id=${teacherId}`, {
						cache: "no-store",
					}),
					fetch("/api/admin/exams", { cache: "no-store" }),
				]);

				const sJson = (await sRes.json()) as SubjectResponse;
				const eJson = await eRes.json();

				const sList: Subject[] = (sJson?.data ?? [])
					.map((s) => ({
						id: String(s.id ?? ""),
						name: String(s.name ?? ""),
					}))
					.filter((s) => Boolean(s.id));

				const eList: Exam[] = (Array.isArray(eJson) ? eJson : [])
					.map((entry: unknown) => {
						const e = entry as {
							id?: unknown;
							name?: unknown;
							academic_year?: unknown;
							subject_settings?: unknown;
						};
						return {
							id: String(e.id ?? ""),
							name: String(e.name ?? ""),
							academic_year: String(e.academic_year ?? ""),
							subject_settings:
								e.subject_settings && typeof e.subject_settings === "object"
									? (e.subject_settings as Record<string, unknown>)
									: {},
						};
					})
					.filter((e) => Boolean(e.id));

				if (cancelled) return;
				setSubjects(sList);
				setExams(eList);
				if (!subjectId && sList.length > 0) setSubjectId(sList[0].id);
				if (!examId && eList.length > 0) setExamId(eList[0].id);
			} catch {
				if (cancelled) return;
				setSubjects([]);
				setExams([]);
			}
		}

		loadOptions();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session?.user_id]);

	async function fetchDashboard() {
		if (!session || !subjectId || !examId) return;

		setLoading(true);
		try {
			const res = await fetch(
				`/api/coordinator/dashboard?teacher_id=${session.user_id}&subject_id=${subjectId}&exam_id=${examId}`,
				{ cache: "no-store" },
			);
			const json = (await res.json()) as DashboardData & DashboardApiMessage;
			if (!res.ok) {
				toast.error(json?.message ?? "Gagal memuatkan dashboard");
				return;
			}
			setData(json);
		} catch {
			setData(null);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		fetchDashboard();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [examId, session, subjectId]);

	const subjectName = data?.subject?.name ?? subjects[0]?.name ?? "Matematik";
	const coordinatorName = data?.coordinator?.name ?? "Penyelaras Matematik";
	const selectedExam = data?.exam ?? exams.find((exam) => exam.id === examId) ?? null;
	const deadline = data?.subject_settings?.deadline ?? "-";
	const classSummaries = useMemo(
		() => data?.classSummaries ?? [],
		[data?.classSummaries],
	);
	const effectiveGradeFilter = gradeFilter === "default-grade-1" ? "1" : gradeFilter;

	const gradeOptions = useMemo(() => {
		return Array.from(
			new Set(
				["1", ...classSummaries
					.map((row) => String(row.grade || "").trim())
					.filter(Boolean)],
			),
		).sort((a, b) => Number(a) - Number(b));
	}, [classSummaries]);

	const classOptions = useMemo(() => {
		const options = new Map<string, string>();
		for (const row of classSummaries.filter((item) => String(item.grade) === effectiveGradeFilter)) {
			const label = `${row.grade || ""} ${row.class_name || ""}`.trim();
			if (label) options.set(row.class_id || label, label);
		}
		return Array.from(options.entries()).sort((a, b) => a[1].localeCompare(b[1]));
	}, [classSummaries, effectiveGradeFilter]);

	const teacherOptions = useMemo(() => {
		const options = new Map<string, string>();
		for (const row of classSummaries.filter((item) => item.submitted_count > 0)) {
			if (row.teacher_name) options.set(row.teacher_id || row.teacher_name, row.teacher_name);
		}
		return Array.from(options.entries()).sort((a, b) => a[1].localeCompare(b[1]));
	}, [classSummaries]);

	useEffect(() => {
		if (classFilter === "all") return;
		if (classOptions.some(([value]) => value === classFilter)) return;
		setClassFilter("all");
	}, [classFilter, classOptions]);

	useEffect(() => {
		if (teacherFilter === "all") return;
		if (teacherOptions.some(([value]) => value === teacherFilter)) return;
		setTeacherFilter("all");
	}, [teacherFilter, teacherOptions]);

	const filteredClassSummaries = useMemo(() => {
		return classSummaries.filter((row) => {
			if (row.submitted_count <= 0) return false;
			if (String(row.grade) !== effectiveGradeFilter) return false;
			if (classFilter !== "all" && (row.class_id || `${row.grade} ${row.class_name}`.trim()) !== classFilter) {
				return false;
			}
			if (teacherFilter !== "all" && (row.teacher_id || row.teacher_name) !== teacherFilter) {
				return false;
			}
			return true;
		});
	}, [classFilter, classSummaries, effectiveGradeFilter, teacherFilter]);

	const quickAccess: QuickAccessItem[] = [
		{
			title: "Pengurusan Guru",
			description: "Tambah atau kemas kini maklumat guru",
			href: "/coordinator/assignments",
			icon: UserCog,
			accent: "bg-blue-100 text-blue-700 border-blue-200",
		},
		{
			title: "Kelulusan Markah",
			description: "Semak dan luluskan markah yang dihantar",
			href: "/coordinator/approvals",
			icon: CheckCircle2,
			accent: "bg-emerald-100 text-emerald-700 border-emerald-200",
		},
		{
			title: "Laporan",
			description: "Lihat laporan prestasi subjek",
			href: "/coordinator/reports",
			icon: FileText,
			accent: "bg-amber-100 text-amber-700 border-amber-200",
		},
		{
			title: "Skema Jawapan",
			description: "Urus skema pemarkahan",
			href: "/coordinator/answer-schemes",
			icon: Settings,
			accent: "bg-purple-100 text-purple-700 border-purple-200",
		},
	];

	const importantDates = [
		{ label: "Tarikh akhir hantar", value: formatMalaysiaDate(deadline) },
		{ label: "Tarikh akhir kelulusan", value: formatMalaysiaDate(addDays(deadline, 3)) },
		{
			label: "Jenis peperiksaan",
			value: selectedExam
				? `${selectedExam.name}${selectedExam.academic_year ? ` (${selectedExam.academic_year})` : ""}`
				: "-",
		},
	];

	if (!sessionReady) return null;

	return (
		<div className="flex flex-col gap-8 p-6 md:p-8">
			<div className="flex flex-col gap-1 border-b border-border/40 pb-6">
				<p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">
					Panitia Subjek
				</p>
				<div className="flex items-end justify-between">
					<div>
						<h1 className="!text-[36px] font-black leading-tight text-foreground">
							Papan Pemuka
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Kemas kini: <LastUpdatedTime />
						</p>
					</div>
					<div className="flex items-center gap-3">
						<div className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-xs">
							<BookOpen className="h-4 w-4 shrink-0 text-primary" />
							<span className="truncate max-w-[180px]">{subjectName}</span>
						</div>
						<Button
							variant="outline"
							onClick={fetchDashboard}
							disabled={loading || !subjectId || !examId}
							className="shadow-xs"
						>
							<RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
							Muat Semula
						</Button>
					</div>
				</div>
			</div>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
					<div className="space-y-6">
						<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
							<CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
								<div className="space-y-2">
									<div className="text-sm font-medium text-muted-foreground">Tingkatan</div>
									<Select value={gradeFilter} onValueChange={setGradeFilter}>
										<SelectTrigger className="h-11 rounded-lg border-border bg-background">
											<SelectValue placeholder="Pilih tingkatan" />
										</SelectTrigger>
										<SelectContent className="rounded-lg border-border">
											<SelectItem value="default-grade-1">
												<div className="flex items-center gap-2">
													<GraduationCap className="h-4 w-4" />
													Tingkatan
												</div>
											</SelectItem>
											{gradeOptions.map((grade) => (
												<SelectItem key={grade} value={grade}>
													<div className="flex items-center gap-2">
														<div className={`h-2 w-2 rounded-full ${getGradeDotColor(Number(grade))}`} />
														Tingkatan {grade}
													</div>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<div className="text-sm font-medium text-muted-foreground">Kelas</div>
									<Select value={classFilter} onValueChange={setClassFilter}>
										<SelectTrigger className="h-11 rounded-lg border-border bg-background">
											<SelectValue placeholder="Pilih kelas" />
										</SelectTrigger>
										<SelectContent className="rounded-lg border-border">
											<SelectItem value="all">
												<div className="flex items-center gap-2">
													<School className="h-4 w-4" />
													Semua Kelas
												</div>
											</SelectItem>
											{classOptions.map(([value, label]) => (
												<SelectItem key={value} value={value}>
													{label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<div className="text-sm font-medium text-muted-foreground">Jenis Peperiksaan</div>
									<Select value={examId} onValueChange={setExamId}>
										<SelectTrigger className="h-11 rounded-lg border-border bg-background">
											<SelectValue placeholder="Pilih peperiksaan" />
										</SelectTrigger>
										<SelectContent className="rounded-lg border-border">
											{exams.map((exam) => (
												<SelectItem key={exam.id} value={exam.id}>
													{exam.name} ({exam.academic_year})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<div className="text-sm font-medium text-muted-foreground">Guru Subjek</div>
									<Select value={teacherFilter} onValueChange={setTeacherFilter}>
										<SelectTrigger className="h-11 rounded-lg border-border bg-background">
											<SelectValue placeholder="Pilih guru" />
										</SelectTrigger>
										<SelectContent className="rounded-lg border-border">
											<SelectItem value="all">
												Semua Guru
											</SelectItem>
											{teacherOptions.map(([value, label]) => (
												<SelectItem key={value} value={value}>
													{label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</CardContent>
						</Card>

						<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
							<CardHeader className="border-b border-border bg-card px-6 py-5">
								<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
									<div>
										<CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
											<ClipboardList className="h-5 w-5 text-primary" />
											Tugasan Guru Subjek
										</CardTitle>
										<p className="mt-1 text-sm font-medium text-muted-foreground">
											Senarai guru subjek mengikut kelas untuk semakan markah
										</p>
									</div>
									<div className="flex flex-col items-start gap-1">
										<span className="text-sm font-semibold text-muted-foreground">
											Tarikh Akhir:
										</span>
										<div className="flex flex-wrap items-center gap-3">
											<Badge
												variant="outline"
												className="h-8 rounded-full border-primary/30 bg-primary/5 px-3 text-sm font-medium text-primary"
											>
												{formatMalaysiaDate(deadline)}
											</Badge>
											<Badge
												variant="outline"
												className="h-8 rounded-full border-primary/30 bg-primary/5 px-3 text-sm font-medium text-primary"
											>
												<Filter className="mr-1.5 h-3.5 w-3.5" />
												{filteredClassSummaries.length} tugasan
											</Badge>
										</div>
									</div>
								</div>
							</CardHeader>
							<CardContent className="p-6">
								<div className="overflow-hidden rounded-lg border border-border">
									<div className="overflow-x-auto">
										<Table>
											<TableHeader className="bg-muted/30">
												<TableRow className="border-b border-border hover:bg-transparent">
													<TableHead className="w-12 py-4 text-center font-semibold text-foreground">
														#
													</TableHead>
													<TableHead className="py-4 font-semibold text-foreground">
														Guru Subjek
													</TableHead>
													<TableHead className="py-4 font-semibold text-foreground">
														Kelas
													</TableHead>
													<TableHead className="py-4 font-semibold text-foreground">
														Status
													</TableHead>
													<TableHead className="py-4 pr-6 text-right font-semibold text-foreground">
														Tindakan
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{loading && !data ? (
													<TableRow>
														<TableCell colSpan={5} className="py-16">
															<div className="flex flex-col items-center justify-center gap-4">
																<Loader2 className="h-10 w-10 animate-spin text-primary" />
																<div className="text-center">
																	<p className="font-semibold text-foreground">
																		Memuatkan tugasan guru subjek...
																	</p>
																	<p className="mt-1 text-sm text-muted-foreground">
																		Sila tunggu sebentar
																	</p>
																</div>
															</div>
														</TableCell>
													</TableRow>
												) : filteredClassSummaries.length === 0 ? (
													<TableRow>
														<TableCell colSpan={5} className="py-16">
															<div className="flex flex-col items-center justify-center gap-4">
																<div className="rounded-full bg-muted/50 p-4">
																	<ClipboardList className="h-12 w-12 text-muted-foreground/50" />
																</div>
																<div className="text-center">
																	<p className="font-semibold text-foreground">
																		Tiada tugasan dijumpai
																	</p>
																	<p className="mt-1 max-w-md text-sm text-muted-foreground">
																		Tugasan guru subjek akan dipaparkan selepas data tersedia.
																	</p>
																</div>
															</div>
														</TableCell>
													</TableRow>
												) : (
													filteredClassSummaries.map((row, index) => {
														const badge = getCoordinatorTaskBadge(row);
														const classLabel = `${row.grade || "-"} ${row.class_name || ""}`.trim();

														return (
															<TableRow
																key={`${row.teacher_id}-${row.class_id}`}
																className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
															>
																<TableCell className="py-4 text-center">
																	<div className="font-medium text-muted-foreground">
																		{index + 1}
																	</div>
																</TableCell>
																<TableCell className="py-4">
																	<div className="flex items-center gap-3">
																		<div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-primary/10 shadow-xs">
																			<Users className="h-4 w-4 text-primary" />
																		</div>
																		<div className="min-w-0">
																			<div className="truncate font-semibold text-foreground">
																				{row.teacher_name || "Belum dilantik"}
																			</div>
																		</div>
																	</div>
																</TableCell>
																<TableCell className="py-4">
																	<div className="flex items-center gap-2">
																		<Users className="h-4 w-4 text-muted-foreground" />
																		<span className="font-medium text-foreground">
																			{classLabel || "-"}
																		</span>
																	</div>
																</TableCell>
																<TableCell className="py-4">
																	<Badge
																		variant="outline"
																		className={`h-8 rounded-full px-3 text-sm font-medium leading-none ${badge.className}`}
																	>
																		{badge.label}
																	</Badge>
																</TableCell>
																<TableCell className="py-4 pr-6 text-right">
																	<Button size="sm" className="h-9 rounded-md px-4 font-semibold" asChild>
																		<Link
																			href={buildApprovalHref({
																				subjectId,
																				examId,
																				classId: row.class_id,
																				teacherId: row.teacher_id,
																				grade: row.grade,
																			})}
																		>
																			<ClipboardList className="mr-2 h-4 w-4" />
																			Semak Markah
																		</Link>
																	</Button>
																</TableCell>
															</TableRow>
														);
													})
												)}
											</TableBody>
										</Table>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					<div className="space-y-6">
						<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
							<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
								<CardTitle className="text-xl font-bold text-foreground">
									Maklumat Panitia Subjek
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4 p-6">
								<ProfileRow label="Nama" value={coordinatorName} />
								<ProfileRow label="Subjek" value={subjectName} />
								<ProfileRow label="E-mel" value="Belum tersedia" icon={Mail} />
								<ProfileRow label="Sesi akademik" value={selectedExam?.academic_year ?? "-"} />
							</CardContent>
						</Card>

						<PanelCard title="Tarikh Penting" icon={CalendarDays}>
							<div className="space-y-3">
								{importantDates.map((date) => (
									<div
										key={date.label}
										className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3"
									>
										<span className="text-sm text-muted-foreground">{date.label}</span>
										<span className="text-sm font-semibold text-foreground text-right">{date.value}</span>
									</div>
								))}
							</div>
						</PanelCard>
					</div>
				</div>
		</div>
	);
}

function PanelCard({
	title,
	icon: Icon,
	children,
}: {
	title: string;
	icon: typeof CalendarDays;
	children: React.ReactNode;
}) {
	return (
		<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
			<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
				<CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
					<Icon className="h-5 w-5 text-primary" />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent className="p-6">{children}</CardContent>
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
	icon?: typeof Mail;
}) {
	return (
		<div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
			<p className="flex items-center gap-2 text-xs text-muted-foreground">
				{Icon ? <Icon className="h-3.5 w-3.5" /> : null}
				{label}
			</p>
			<p className="mt-1 font-semibold text-foreground">{value}</p>
		</div>
	);
}
