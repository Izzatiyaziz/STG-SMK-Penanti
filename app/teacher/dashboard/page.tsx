"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	LayoutDashboard,
	BookOpen,
	Users,
	ClipboardList,
	Camera,
	FileText,
	GraduationCap,
	ArrowRight,
} from "lucide-react";

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

type Exam = {
	id: string;
	name: string;
	academic_year: string;
	subject_settings?: Record<string, any>;
};

type ClassTeacherResponse = {
	class: { id: string; name: string; grade: string } | null;
	students: Array<{ id: string; name: string; identifier: string }>;
};

function normalize(value: string) {
	return String(value ?? "")
		.toLowerCase()
		.trim();
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

export default function TeacherDashboardPage() {
	const router = useRouter();
	const [session, setSession] = useState<Session | null>(null);

	useEffect(() => {
		const s = readSession();
		if (!s) {
			router.replace("/login");
			return;
		}
		setSession(s);
	}, [router]);

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
	const [assignments, setAssignments] = useState<Assignment[]>([]);
	const [loading, setLoading] = useState(true);
	const [exams, setExams] = useState<Exam[]>([]);
	const [selectedExamId, setSelectedExamId] = useState<string>("");

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

	useEffect(() => {
		let cancelled = false;

		async function loadExams() {
			try {
				const res = await fetch("/api/admin/exams", { cache: "no-store" });
				const json = await res.json();
				const list: Exam[] = (json ?? [])
					.map((e: any) => ({
						id: String(e.id ?? ""),
						name: String(e.name ?? ""),
						academic_year: String(e.academic_year ?? ""),
						subject_settings: e.subject_settings ?? {},
					}))
					.filter((e: Exam) => Boolean(e.id));

				if (cancelled) return;
				setExams(list);
				if (!selectedExamId && list.length > 0) setSelectedExamId(list[0].id);
			} catch {
				if (!cancelled) setExams([]);
			}
		}

		loadExams();
		return () => {
			cancelled = true;
		};
	}, []);

	const selectedExam = useMemo(() => {
		return exams.find((e) => e.id === selectedExamId) ?? null;
	}, [exams, selectedExamId]);

	const deadlineBySubjectId = useMemo(() => {
		const all = (selectedExam?.subject_settings ?? {}) as Record<string, any>;
		const m = new Map<string, string>();
		for (const a of assignments) {
			const s = all?.[a.subject_id];
			const d =
				s && typeof s === "object" ? String((s as any).deadline ?? "").trim() : "";
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

	return (
		<div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				<div className="space-y-1">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-xl bg-primary/10">
							<LayoutDashboard className="w-6 h-6 text-primary" />
						</div>
						<h1 className="text-3xl font-bold tracking-tight">
							Dashboard Guru Subjek
						</h1>
					</div>
					<p className="text-muted-foreground">
						Ringkasan tugasan pemarkahan & pautan pantas
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<MetricCard title="Subjek Diajar" value={subjectCount} icon={BookOpen} />
					<MetricCard
						title="Jumlah Kelas"
						value={classCount}
						icon={Users}
						tone="secondary"
					/>
					<MetricCard
						title="Tugasan"
						value={assignments.length}
						icon={ClipboardList}
						tone="accent"
					/>
				</div>

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
						<div className="space-y-2 md:col-span-2">
							<div className="text-sm text-muted-foreground">Deadline</div>
							<div className="text-sm text-muted-foreground">
								Deadline ikut subjek akan dipaparkan dalam jadual tugasan.
							</div>
						</div>
					</CardContent>
				</Card>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<Card className="shadow-lg border border-border/50 lg:col-span-2">
						<CardHeader>
							<CardTitle>Tugasan Subjek</CardTitle>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Subjek</TableHead>
										<TableHead>Kelas</TableHead>
										<TableHead>Deadline</TableHead>
										<TableHead className="text-right">Tindakan</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{assignments.slice(0, 6).map((a) => (
										<TableRow key={a.id}>
											<TableCell className="font-medium">{a.subject_name}</TableCell>
											<TableCell>{a.class_name}</TableCell>
											<TableCell className="text-muted-foreground">
												{deadlineBySubjectId.get(a.subject_id) || "—"}
											</TableCell>
											<TableCell className="text-right">
												<Link href="/teacher/my-subject">
													<Button size="sm">
														<ClipboardList className="w-4 h-4 mr-2" />
														Masuk Markah
													</Button>
												</Link>
											</TableCell>
										</TableRow>
									))}

									{!loading && assignments.length === 0 && (
										<TableRow>
											<TableCell
												colSpan={3}
												className="text-center text-muted-foreground py-10"
											>
												Tiada tugasan.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>

					<Card className="shadow-lg border border-border/50">
						<CardHeader>
							<CardTitle>Pautan Pantas</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<QuickLink
								href="/teacher/my-subject"
								icon={ClipboardList}
								title="Masuk Markah"
								desc="Pemarkahan subjek & hantar untuk semakan"
							/>
							<QuickLink
								href="/teacher/omr"
								icon={Camera}
								title="Imbasan OMR"
								desc="Ambil gambar & proses OMR"
							/>
							<QuickLink
								href="/teacher/report"
								icon={FileText}
								title="Laporan"
								desc="Ringkasan keputusan peperiksaan"
							/>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

function ClassTeacherDashboard({ teacherId }: { teacherId: string }) {
	const router = useRouter();
	const [data, setData] = useState<ClassTeacherResponse | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			setLoading(true);
			try {
				const res = await fetch(
					`/api/teacher/class-teacher?teacher_id=${teacherId}`,
				);
				const json = (await res.json()) as ClassTeacherResponse;
				if (!cancelled) setData(json);
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
		if (data && data.class === null) {
			toast.error("Tiada kelas ditetapkan untuk Guru Kelas");
			router.replace("/teacher/my-class");
		}
	}, [data, loading, router]);

	const className = data?.class?.name ?? "";
	const grade = data?.class?.grade ?? "";
	const studentCount = data?.students?.length ?? 0;

	return (
		<div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				<div className="space-y-1">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-xl bg-primary/10">
							<LayoutDashboard className="w-6 h-6 text-primary" />
						</div>
						<h1 className="text-3xl font-bold tracking-tight">
							Dashboard Guru Kelas
						</h1>
					</div>
					<p className="text-muted-foreground">
						Ringkasan kelas & pengurusan pelajar
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<MetricCard title="Kelas" value={className} icon={Users} />
					<MetricCard
						title="Tingkatan"
						value={grade}
						icon={GraduationCap}
						tone="secondary"
					/>
					<MetricCard
						title="Bil. Pelajar"
						value={studentCount}
						icon={Users}
						tone="accent"
					/>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<Card className="shadow-lg border border-border/50 lg:col-span-2">
						<CardHeader>
							<CardTitle>Pelajar (Ringkas)</CardTitle>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Nama</TableHead>
										<TableHead>No. KP</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(data?.students ?? []).slice(0, 6).map((s) => (
										<TableRow key={s.id}>
											<TableCell className="font-medium">{s.name}</TableCell>
											<TableCell className="text-muted-foreground">
												{s.identifier}
											</TableCell>
										</TableRow>
									))}

									{!loading && (data?.students?.length ?? 0) === 0 && (
										<TableRow>
											<TableCell
												colSpan={2}
												className="text-center text-muted-foreground py-10"
											>
												Tiada pelajar.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>

					<Card className="shadow-lg border border-border/50">
						<CardHeader>
							<CardTitle>Pautan Pantas</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<QuickLink
								href="/teacher/my-class"
								icon={Users}
								title="Pelajar Kelas Saya"
								desc="Tambah/keluar pelajar & simpan comment report card"
							/>
							<QuickLink
								href="/teacher/reports"
								icon={FileText}
								title="Laporan"
								desc="Semak laporan dan ringkasan"
							/>
							<Button
								className="w-full justify-between"
								variant="outline"
								onClick={() => router.push("/teacher/my-class")}
							>
								Buka Pengurusan Kelas
								<ArrowRight className="w-4 h-4" />
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

function MetricCard({
	title,
	value,
	icon: Icon,
	tone = "primary",
}: {
	title: string;
	value: string | number;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	tone?: "primary" | "secondary" | "accent";
}) {
	const toneClass =
		tone === "secondary"
			? "bg-secondary/10 text-secondary"
			: tone === "accent"
				? "bg-accent/10 text-accent"
				: "bg-primary/10 text-primary";

	return (
		<Card className="shadow-lg border border-border/50">
			<CardContent className="p-6 flex items-center justify-between gap-4">
				<div className="min-w-0">
					<p className="text-sm text-muted-foreground">{title}</p>
					<h3 className="text-2xl font-bold mt-2 truncate">{value}</h3>
				</div>
				<div className={`p-3 rounded-full ${toneClass}`}>
					<Icon className="w-6 h-6" />
				</div>
			</CardContent>
		</Card>
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
