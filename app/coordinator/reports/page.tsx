"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMalaysiaTime } from "@/lib/date-utils";
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
	BarChart3,
	BookOpen,
	ChartPie,
	CheckCircle,
	ClipboardList,
	Clock,
	Download,
	GraduationCap,
	RefreshCw,
	School,
	TrendingDown,
	TrendingUp,
	Trophy,
	Users,
} from "lucide-react";

type Session = {
	user_id: string;
	userType: "teacher";
	role: string;
};

type StudentPerformance = {
	result_id: string;
	student_id: string;
	name: string;
	class_id: string;
	className: string;
	gradeLevel: number;
	mark: number;
	grade: string;
	status: string;
};

type ReportData = {
	subject: { id: string; name: string };
	summary: {
		totalStudents: number;
		averageMark: number;
		highestMark: number;
		lowestMark: number;
		passRate: number;
	};
	gradeDistribution: Array<{ grade: string; value: number }>;
	classPerformance: Array<{
		class_id: string;
		className: string;
		gradeLevel: number;
		average: number;
		students: number;
	}>;
	topStudents: StudentPerformance[];
	weakStudents: StudentPerformance[];
	trend: Array<{ exam: string; average: number; year: string }>;
	filterOptions: {
		grades: number[];
		classes: Array<{ id: string; name: string; grade: number }>;
		exams: Array<{ id: string; name: string; year: string }>;
	};
};

type ReportResponse = {
	data: ReportData | null;
	message?: string;
};

const gradeColors = ["#2563eb", "#22c55e", "#facc15", "#fb7185", "#ef4444"];
const barColors = ["#2563eb", "#14b8a6", "#f59e0b", "#a855f7", "#ef4444", "#22c55e"];

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

function getStoredSession() {
	if (typeof window === "undefined") return null;
	try {
		const raw = localStorage.getItem("stg_session");
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Session;
		return parsed?.userType === "teacher" ? parsed : null;
	} catch {
		return null;
	}
}


function normalizeSubjectName(value: unknown) {
	return String(value ?? "")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function isUpperFormOnlySubject(subjectName: unknown) {
	const name = normalizeSubjectName(subjectName);
	if (!name) return false;

	return (
		/\bbiologi\b/.test(name) ||
		/\bkimia\b/.test(name) ||
		/\bfizik\b/.test(name) ||
		/\bperniagaan\b/.test(name) ||
		/\bakaun\b/.test(name) ||
		/\bperakaunan\b/.test(name) ||
		name.includes("matematik tambahan") ||
		name.includes("additional mathematics")
	);
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

function formatStudentClass(student: Pick<StudentPerformance, "className" | "gradeLevel">) {
	return student.gradeLevel ? `${student.gradeLevel} ${student.className}` : student.className;
}

export default function SubjectCoordinatorReportsPage() {
	const [session] = useState<Session | null>(() => getStoredSession());
	const [data, setData] = useState<ReportData | null>(null);
	const [loading, setLoading] = useState(false);
	const [gradeFilter, setGradeFilter] = useState("default-grade-1");
	const [classFilter, setClassFilter] = useState("all");
	const [examFilter, setExamFilter] = useState("all");
	const subjectName = data?.subject?.name ?? "Mathematics";
	const isUpperFormSubject = isUpperFormOnlySubject(subjectName);
	const defaultFilterGrade = isUpperFormSubject ? "default-grade-4" : "default-grade-1";
	const defaultGradeNumber = isUpperFormSubject ? 4 : 1;

	async function fetchReport() {
		if (!session?.user_id) return;

		setLoading(true);
		const effectiveGradeFilter = gradeFilter.startsWith("default-grade-")
			? String(defaultGradeNumber)
			: gradeFilter;
		try {
			const params = new URLSearchParams({
				teacher_id: session.user_id,
				grade: effectiveGradeFilter,
				class_id: classFilter,
				exam_id: examFilter,
			});
			const res = await fetch(`/api/coordinator/reports?${params.toString()}`, {
				cache: "no-store",
			});
			const json = (await res.json()) as ReportResponse;
			if (!res.ok) {
				toast.error(json?.message ?? "Gagal memuatkan laporan");
				setData(null);
				return;
			}
			setData(json.data);
		} catch {
			toast.error("Ralat memuatkan laporan");
			setData(null);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		fetchReport();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [classFilter, examFilter, gradeFilter, session?.user_id]);

	useEffect(() => {
		if (!isUpperFormSubject || gradeFilter !== "default-grade-1") return;
		setGradeFilter("default-grade-4");
		setClassFilter("all");
	}, [gradeFilter, isUpperFormSubject]);

	const gradeData = useMemo(() => data?.gradeDistribution ?? [], [data]);
	const hasReportShell = Boolean(data);
	const classOptions = useMemo(() => {
		const options = data?.filterOptions.classes ?? [];
		const effectiveGradeFilter = gradeFilter.startsWith("default-grade-")
			? String(defaultGradeNumber)
			: gradeFilter;
		const filtered =
			effectiveGradeFilter === "all"
				? options
				: options.filter((option) => option.grade === Number(effectiveGradeFilter));

		return Array.from(new Map(filtered.map((option) => [option.id, option])).values())
			.sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));
	}, [data?.filterOptions.classes, defaultGradeNumber, gradeFilter]);

	useEffect(() => {
		if (classFilter === "all") return;
		if (classOptions.some((option) => option.id === classFilter)) return;
		setClassFilter("all");
	}, [classFilter, classOptions]);

	const gradeOptions = useMemo(() => {
		const grades = data?.filterOptions.grades ?? [1, 2, 3, 4, 5];
		return Array.from(new Set([defaultGradeNumber, ...grades]))
			.filter((grade) => Number.isFinite(Number(grade)))
			.filter((grade) => !isUpperFormSubject || Number(grade) >= 4)
			.sort((a, b) => Number(a) - Number(b));
	}, [data?.filterOptions.grades, defaultGradeNumber, isUpperFormSubject]);

	function handleGradeFilter(value: string) {
		setGradeFilter(value);
		setClassFilter("all");
	}

	const classPerformanceChartData = useMemo(() => {
		return (data?.classPerformance ?? []).map((row) => ({
			...row,
			classLabel: row.gradeLevel ? `${row.gradeLevel} ${row.className}` : row.className,
		}));
	}, [data?.classPerformance]);

	const trendChartData = useMemo(() => {
		return (data?.trend ?? []).map((row) => ({
			...row,
			examLabel: row.year ? `${row.exam} (${row.year})` : row.exam,
		}));
	}, [data?.trend]);

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
								<h1 className="text-xl font-bold text-foreground">Laporan Prestasi Pelajar</h1>
								<p className="text-muted-foreground font-medium mt-1">
									Analisis pencapaian pelajar bagi subjek {subjectName}. 
								</p>
							</div>
						</div>
							<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
							<div className="w-1 h-1 rounded-full bg-muted" />
							<div className="flex items-center gap-1">
								<Clock className="w-3.5 h-3.5" />
								<span>Kemas kini: <LastUpdatedTime /></span>
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<Badge
								variant="outline"
								className="flex h-11 items-center justify-center rounded-lg border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700"
							>
								<CheckCircle className="mr-2 h-4 w-4" />
								Telah diluluskan
							</Badge>
						<div className="inline-flex h-10 w-full items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground shadow-xs sm:w-auto sm:max-w-[260px]">
							<BookOpen className="h-4 w-4 shrink-0 text-primary" />
							<span className="truncate">{subjectName}</span>
						</div>
						<Button
							variant="outline"
							onClick={fetchReport}
							disabled={loading}
							className="border-border shadow-xs"
						>
							{loading ? (
								<RefreshCw className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<RefreshCw className="w-4 h-4 mr-2" />
							)}
							Muat Semula
						</Button>
						<Button
							variant="outline"
							onClick={() => window.print()}
							className="border-border hover:bg-accent hover:text-accent-foreground shadow-xs"
						>
							<Download className="w-4 h-4 mr-2" />
							Eksport
						</Button>
					</div>
				</div>

				<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
					<CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-4">
						<div className="space-y-2">
							<div className="text-sm font-medium text-muted-foreground">Tingkatan</div>
							<Select value={gradeFilter} onValueChange={handleGradeFilter}>
								<SelectTrigger className="h-11 rounded-lg border-border bg-background">
									<SelectValue placeholder="Pilih tingkatan" />
								</SelectTrigger>
								<SelectContent className="rounded-lg border-border">
									<SelectItem value={defaultFilterGrade}>
										<div className="flex items-center gap-2">
											<GraduationCap className="h-4 w-4" />
											Tingkatan
										</div>
									</SelectItem>
									{gradeOptions.map((grade) => (
										<SelectItem key={grade} value={String(grade)}>
											<div className="flex items-center gap-2">
												<div className={`h-2 w-2 rounded-full ${getGradeDotColor(grade)}`} />
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
									{classOptions.map((classItem) => (
										<SelectItem key={classItem.id} value={classItem.id}>
											{classItem.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<div className="text-sm font-medium text-muted-foreground">Jenis Peperiksaan</div>
							<Select value={examFilter} onValueChange={setExamFilter}>
								<SelectTrigger className="h-11 rounded-lg border-border bg-background">
									<SelectValue placeholder="Pilih peperiksaan" />
								</SelectTrigger>
								<SelectContent className="rounded-lg border-border">
									<SelectItem value="all">
										<div className="flex items-center gap-2">
											<ClipboardList className="h-4 w-4" />
											Semua Peperiksaan
										</div>
									</SelectItem>
									{(data?.filterOptions.exams ?? []).map((exam) => (
										<SelectItem key={exam.id} value={exam.id}>
											{exam.name} {exam.year ? `(${exam.year})` : ""}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
							<Button
								variant="outline"
								onClick={() => {
									setGradeFilter(defaultFilterGrade);
									setClassFilter("all");
									setExamFilter("all");
								}}
								className="h-11 w-full border-border shadow-xs md:w-auto"
							>
								Reset
							</Button>
						</div>
					</CardContent>
				</Card>

				{!loading && data && data.summary.totalStudents === 0 && (
					<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
						<CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
							<div className="rounded-full bg-muted/50 p-4">
								<CheckCircle className="h-10 w-10 text-muted-foreground/60" />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-foreground">Belum ada markah diluluskan</h2>
								<p className="mt-1 text-sm text-muted-foreground">
									Laporan akan dipaparkan selepas guru menghantar markah dan coordinator meluluskan rekod tersebut.
								</p>
							</div>
						</CardContent>
					</Card>
				)}

				{hasReportShell && (
					<>
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							<ChartCard title="Analisis Gred" description="Taburan gred pelajar bagi subjek ini" icon={ChartPie}>
								<ResponsiveContainer width="100%" height={300}>
									<PieChart>
										<Pie data={gradeData} dataKey="value" nameKey="grade" innerRadius={58} outerRadius={98} paddingAngle={4} label>
											{gradeData.map((_, index) => (
												<Cell key={index} fill={gradeColors[index % gradeColors.length]} />
											))}
										</Pie>
										<Tooltip />
									</PieChart>
								</ResponsiveContainer>
								<div className="mt-4 grid grid-cols-5 gap-2">
									{gradeData.map((item, index) => (
										<div key={item.grade} className="rounded-md border border-border bg-muted/20 p-2 text-center">
											<div className="mx-auto mb-1 h-2 w-8 rounded-full" style={{ backgroundColor: gradeColors[index % gradeColors.length] }} />
											<div className="text-sm font-bold">{item.grade}</div>
											<div className="text-xs text-muted-foreground">{item.value}</div>
										</div>
									))}
								</div>
							</ChartCard>

							<ChartCard
								title="Prestasi Mengikut Kelas"
								description={`Perbandingan pencapaian ${subjectName} antara kelas`}
								className="lg:col-span-2"
								icon={BarChart3}
							>
								<ResponsiveContainer width="100%" height={300}>
									<BarChart data={classPerformanceChartData}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="classLabel" />
										<YAxis domain={[0, 100]} />
										<Tooltip />
										<Bar dataKey="average" name="Purata" radius={7}>
											{classPerformanceChartData.map((_, index) => (
												<Cell key={index} fill={barColors[index % barColors.length]} />
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							</ChartCard>
						</div>

						<ChartCard title="Trend Prestasi" description="Perubahan purata markah mengikut ujian" icon={TrendingUp}>
							<ResponsiveContainer width="100%" height={280}>
								<LineChart data={trendChartData}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="examLabel" />
									<YAxis domain={[0, 100]} />
									<Tooltip />
									<Line type="monotone" dataKey="average" name="Purata" stroke="#2563eb" strokeWidth={3} dot={{ r: 5, fill: "#22c55e" }} />
								</LineChart>
							</ResponsiveContainer>
						</ChartCard>

						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<ReportTable
								title="Senarai Pelajar Cemerlang"
								description="Top 3 pelajar terbaik bagi subjek ini"
								icon={Trophy}
							>
								<TableHeader className="bg-muted/30">
									<TableRow className="hover:bg-transparent border-b border-border">
										<TableHead className="font-semibold text-foreground py-4 w-16 text-center">#</TableHead>
										<TableHead className="font-semibold text-foreground py-4">Pelajar</TableHead>
										<TableHead className="font-semibold text-foreground py-4">Kelas</TableHead>
										<TableHead className="font-semibold text-foreground py-4 text-center">Markah</TableHead>
										<TableHead className="font-semibold text-foreground py-4 text-center pr-6">Gred</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(data?.topStudents ?? []).slice(0, 3).map((student, index) => (
										<TableRow key={student.result_id} className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group">
											<TableCell className="py-4 text-center">
												<div className="font-medium text-muted-foreground group-hover:text-primary transition-colors">
													{index + 1}
												</div>
											</TableCell>
											<TableCell className="py-4">
												<div className="font-semibold text-foreground group-hover:text-primary transition-colors">
													{student.name}
												</div>
											</TableCell>
											<TableCell className="py-4">{formatStudentClass(student)}</TableCell>
											<TableCell className="py-4 text-center font-semibold">{student.mark}</TableCell>
											<TableCell className="py-4 text-center pr-6">
												<Badge variant="secondary">{student.grade}</Badge>
											</TableCell>
										</TableRow>
									))}
									{!loading && (data?.topStudents.length ?? 0) === 0 && (
										<TableRow>
											<TableCell colSpan={5} className="py-16">
												<TableEmpty title="Tiada pelajar cemerlang" description="Senarai akan dipaparkan selepas markah diluluskan." />
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</ReportTable>

							<ReportTable
								title="Senarai Pelajar Perlu Perhatian"
								description="Top 3 pelajar yang markah rendah atau gagal"
								icon={TrendingDown}
							>
								<TableHeader className="bg-muted/30">
									<TableRow className="hover:bg-transparent border-b border-border">
										<TableHead className="font-semibold text-foreground py-4 w-16 text-center">#</TableHead>
										<TableHead className="font-semibold text-foreground py-4">Pelajar</TableHead>
										<TableHead className="font-semibold text-foreground py-4">Kelas</TableHead>
										<TableHead className="font-semibold text-foreground py-4 text-center">Markah</TableHead>
										<TableHead className="font-semibold text-foreground py-4 text-center pr-6">Gred</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(data?.weakStudents ?? []).slice(0, 3).map((student, index) => (
										<TableRow key={student.result_id} className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group">
											<TableCell className="py-4 text-center">
												<div className="font-medium text-muted-foreground group-hover:text-primary transition-colors">
													{index + 1}
												</div>
											</TableCell>
											<TableCell className="py-4">
												<div className="font-semibold text-foreground group-hover:text-primary transition-colors">
													{student.name}
												</div>
											</TableCell>
											<TableCell className="py-4">{formatStudentClass(student)}</TableCell>
											<TableCell className="py-4 text-center font-semibold text-rose-600">{student.mark}</TableCell>
											<TableCell className="py-4 text-center pr-6">
												<Badge variant="destructive">{student.grade}</Badge>
											</TableCell>
										</TableRow>
									))}
									{!loading && (data?.weakStudents.length ?? 0) === 0 && (
										<TableRow>
											<TableCell colSpan={5} className="py-16">
												<TableEmpty title="Tiada pelajar perlu perhatian" description="Tiada pelajar gagal untuk subjek dan filter semasa." />
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</ReportTable>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

function ChartCard({
	title,
	description,
	children,
	className = "",
	icon: Icon,
}: {
	title: string;
	description: string;
	children: ReactNode;
	className?: string;
	icon?: typeof Users;
}) {
	return (
		<Card className={`border-border bg-card shadow-md rounded-xl overflow-hidden ${className}`}>
			<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
				<CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
					{Icon ? (
						<Icon className="h-5 w-5 text-primary" />
					) : null}
					{title}
				</CardTitle>
				<p className="text-sm text-muted-foreground">{description}</p>
			</CardHeader>
			<CardContent className="p-6">{children}</CardContent>
		</Card>
	);
}

function ReportTable({
	title,
	description,
	icon: Icon,
	children,
}: {
	title: string;
	description: string;
	icon?: typeof Users;
	children: ReactNode;
}) {
	return (
		<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
			<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
				<CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
					{Icon ? <Icon className="h-5 w-5 text-primary" /> : null}
					{title}
				</CardTitle>
				<p className="text-sm text-muted-foreground">{description}</p>
			</CardHeader>
			<CardContent className="p-0">
				<div className="p-6">
					<div className="rounded-lg border border-border overflow-hidden">
						<div className="overflow-x-auto">
							<Table>{children}</Table>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function TableEmpty({ title, description }: { title: string; description: string }) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 text-center">
			<div className="rounded-full bg-muted/50 p-4">
				<Users className="h-10 w-10 text-muted-foreground/50" />
			</div>
			<div>
				<p className="font-semibold text-foreground">{title}</p>
				<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			</div>
		</div>
	);
}
