"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Activity,
	BarChart3,
	Bell,
	CalendarDays,
	CheckCircle2,
	ClipboardList,
	Clock,
	FileText,
	Mail,
	RefreshCw,
	Settings,
	Shield,
	UserCog,
	Users,
} from "lucide-react";

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
	return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
	const raw = String(dateValue ?? "").trim();
	if (!raw) return "-";
	const date = new Date(raw);
	if (Number.isNaN(date.getTime())) return raw;
	date.setDate(date.getDate() + days);
	return date.toISOString().slice(0, 10);
}

export default function SubjectCoordinatorDashboard() {
	const router = useRouter();
	const [session, setSession] = useState<Session | null>(null);
	const [sessionReady, setSessionReady] = useState(false);
	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [exams, setExams] = useState<Exam[]>([]);
	const [subjectId, setSubjectId] = useState("");
	const [examId, setExamId] = useState("");
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
	const pendingSubmissions = data?.summary.pendingSubmissions ?? 0;
	const missingTeacherProfiles = (data?.classSummaries ?? []).filter(
		(row) => !row.teacher_name,
	).length;
	const totalTeachers = data?.summary.totalTeachers ?? 0;
	const totalClasses = data?.summary.totalClasses ?? 0;

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
			title: "Tetapan Subjek",
			description: "Urus skema pemarkahan dan tetapan",
			href: "/coordinator/answer-schemes",
			icon: Settings,
			accent: "bg-purple-100 text-purple-700 border-purple-200",
		},
	];

	const notifications = [
		`${pendingSubmissions} hantaran markah menunggu kelulusan`,
		`${missingTeacherProfiles} profil guru perlu dikemas kini`,
		deadline && deadline !== "-"
			? `Tarikh akhir hantar markah: ${String(deadline)}`
			: "Tarikh akhir hantar markah belum ditetapkan",
	];

	const recentActivity = useMemo(() => {
		const approvedClass = (data?.classSummaries ?? []).find(
			(row) => (row.status_counts?.approved ?? 0) > 0,
		);
		const assignedTeacher = (data?.classSummaries ?? []).find((row) => row.teacher_name);

		return [
			approvedClass
				? `Markah diluluskan untuk kelas ${approvedClass.class_name}`
				: "Belum ada markah diluluskan",
			assignedTeacher
				? `Guru dilantik: ${assignedTeacher.teacher_name}`
				: "Lantikan guru masih menunggu",
			deadline && deadline !== "-"
				? "Tarikh akhir skema pemarkahan dikemas kini"
				: "Tetapan subjek menunggu tarikh akhir",
		];
	}, [data?.classSummaries, deadline]);

	const importantDates = [
		{ label: "Tarikh akhir hantar", value: String(deadline ?? "-") },
		{ label: "Tarikh akhir kelulusan", value: addDays(deadline, 3) },
		{ label: "Tempoh peperiksaan", value: selectedExam?.name ?? "-" },
		{ label: "Tarikh keluar keputusan", value: addDays(deadline, 7) },
	];

	if (!sessionReady) return null;

	return (
		<div className="min-h-screen bg-background p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-8">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div className="space-y-3">
						<div className="flex items-center gap-4">
							<div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
								<BarChart3 className="w-7 h-7 text-primary" />
							</div>
							<div>
								<h2 className="text-2xl font-bold text-foreground">
									Selamat Datang, Ketua Panitia Subjek {subjectName}
								</h2>
								<p className="text-muted-foreground font-medium mt-1">
									Mengurus guru subjek, semak kelulusan markah dan pantau kemas kini sistem
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
							<div className="flex items-center gap-1">
								<Shield className="w-3.5 h-3.5" />
								<span>Data Dashboard Terkawal</span>
							</div>
							<div className="w-1 h-1 rounded-full bg-muted" />
							<div className="flex items-center gap-1">
								<Clock className="w-3.5 h-3.5" />
								<span>Kemas kini: <LastUpdatedTime /></span>
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Button
							variant="outline"
							onClick={fetchDashboard}
							disabled={loading || !subjectId || !examId}
							className="border-border hover:bg-accent hover:text-accent-foreground shadow-xs"
						>
							{loading ? (
								<RefreshCw className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<RefreshCw className="w-4 h-4 mr-2" />
							)}
							Muat Semula
						</Button>
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
							<CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
								<div className="space-y-2">
									<div className="text-sm font-medium text-muted-foreground">Peperiksaan</div>
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
									<div className="text-sm font-medium text-muted-foreground">Subjek</div>
									<div className="inline-flex h-11 w-full items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground shadow-xs">
										<ClipboardList className="h-4 w-4 shrink-0 text-primary" />
										<span className="truncate">{subjectName}</span>
									</div>
								</div>

								<div className="space-y-2">
									<div className="text-sm font-medium text-muted-foreground">Tarikh Akhir</div>
									<div className="flex h-11 items-center gap-2">
										<Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
											{String(deadline ?? "-")}
										</Badge>
										{loading && <RefreshCw className="w-4 h-4 animate-spin text-primary" />}
									</div>
								</div>
							</CardContent>
						</Card>

						<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
							<PanelCard title="Notifikasi" icon={Bell}>
								<div className="space-y-3">
									{notifications.map((notification, index) => (
										<div
											key={`${notification}-${index}`}
											className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-foreground"
										>
											{notification}
										</div>
									))}
								</div>
							</PanelCard>

							<PanelCard title="Aktiviti Terkini" icon={Activity}>
								<div className="space-y-3">
									{recentActivity.map((activity, index) => (
										<div key={`${activity}-${index}`} className="flex gap-3 text-sm">
											<div className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
											<div>
												<p className="font-medium text-foreground">{activity}</p>
												<p className="text-xs text-muted-foreground">Kemas kini terkini</p>
											</div>
										</div>
									))}
								</div>
							</PanelCard>
						</div>
					</div>

					<div className="space-y-6">
						<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
							<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
								<CardTitle className="text-xl font-bold text-foreground">
									Maklumat Penyelaras
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
		</div>
	);
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="rounded-lg border border-border bg-muted/20 p-4">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="mt-1 text-xl font-bold text-foreground">{value}</p>
		</div>
	);
}

function PanelCard({
	title,
	icon: Icon,
	children,
}: {
	title: string;
	icon: typeof Bell;
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
