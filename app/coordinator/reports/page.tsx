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
	CheckCircle,
	Download,
	Filter,
	RefreshCw,
	Shield,
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
	classPerformance: Array<{ className: string; average: number; students: number }>;
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

export default function SubjectCoordinatorReportsPage() {
	const [session] = useState<Session | null>(() => getStoredSession());
	const [data, setData] = useState<ReportData | null>(null);
	const [loading, setLoading] = useState(false);
	const [gradeFilter, setGradeFilter] = useState("all");
	const [classFilter, setClassFilter] = useState("all");
	const [examFilter, setExamFilter] = useState("all");

	async function fetchReport() {
		if (!session?.user_id) return;

		setLoading(true);
		try {
			const params = new URLSearchParams({
				teacher_id: session.user_id,
				grade: gradeFilter,
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

	const gradeData = useMemo(() => data?.gradeDistribution ?? [], [data]);
	const subjectName = data?.subject?.name ?? "Mathematics";
	const hasReportShell = Boolean(data);
	const classOptions = useMemo(() => {
		const options = data?.filterOptions.classes ?? [];
		if (gradeFilter === "all") return options;
		return options.filter((option) => option.grade === Number(gradeFilter));
	}, [data?.filterOptions.classes, gradeFilter]);

	function handleGradeFilter(value: string) {
		setGradeFilter(value);
		setClassFilter("all");
	}

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
									Analisis pencapaian pelajar bagi subjek {subjectName}
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
							<div className="flex items-center gap-1">
								<Shield className="w-3.5 h-3.5" />
								<span>Hanya markah yang telah diluluskan oleh panitia subjek dipaparkan</span>
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<div className="inline-flex h-10 w-full items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground shadow-xs sm:w-auto sm:max-w-[260px]">
							<BookOpen className="h-4 w-4 shrink-0 text-primary" />
							<span className="truncate">{subjectName}</span>
						</div>
						<Badge variant="outline" className="h-10 border-emerald-200 bg-emerald-50 px-4 text-emerald-700">
							<CheckCircle className="w-4 h-4 mr-2" />
							Telah diluluskan
						</Badge>
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
									<SelectItem value="all">
										<div className="flex items-center gap-2">
											<Filter className="h-4 w-4" />
											Semua Tingkatan
										</div>
									</SelectItem>
									{(data?.filterOptions.grades ?? [1, 2, 3, 4, 5]).map((grade) => (
										<SelectItem key={grade} value={String(grade)}>
											Tingkatan {grade}
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
									<SelectItem value="all">Semua Kelas</SelectItem>
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
									<SelectItem value="all">Semua Peperiksaan</SelectItem>
									{(data?.filterOptions.exams ?? []).map((exam) => (
										<SelectItem key={exam.id} value={exam.id}>
											{exam.name} {exam.year ? `(${exam.year})` : ""}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex items-end">
							<Button
								variant="outline"
								onClick={() => {
									setGradeFilter("all");
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
							<ChartCard title="Analisis Gred" description="Taburan gred pelajar bagi subjek ini">
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
							>
								<ResponsiveContainer width="100%" height={300}>
									<BarChart data={data?.classPerformance ?? []}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="className" />
										<YAxis domain={[0, 100]} />
										<Tooltip />
										<Bar dataKey="average" radius={7}>
											{(data?.classPerformance ?? []).map((_, index) => (
												<Cell key={index} fill={barColors[index % barColors.length]} />
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							</ChartCard>
						</div>

						<ChartCard title="Trend Prestasi" description="Perubahan purata markah mengikut ujian">
							<ResponsiveContainer width="100%" height={280}>
								<LineChart data={data?.trend ?? []}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="exam" />
									<YAxis domain={[0, 100]} />
									<Tooltip />
									<Line type="monotone" dataKey="average" stroke="#2563eb" strokeWidth={3} dot={{ r: 5, fill: "#22c55e" }} />
								</LineChart>
							</ResponsiveContainer>
						</ChartCard>

						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<ReportTable title="Senarai Pelajar Cemerlang" description="Top 10 / Top 20 terbaik bagi subjek ini">
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
									{(data?.topStudents ?? []).slice(0, 20).map((student, index) => (
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
												<div className="text-xs text-muted-foreground">{student.student_id}</div>
											</TableCell>
											<TableCell className="py-4">{student.className}</TableCell>
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

							<ReportTable title="Senarai Pelajar Perlu Perhatian" description="Pelajar yang markah rendah atau gagal">
								<TableHeader className="bg-muted/30">
									<TableRow className="hover:bg-transparent border-b border-border">
										<TableHead className="font-semibold text-foreground py-4">Pelajar</TableHead>
										<TableHead className="font-semibold text-foreground py-4">Kelas</TableHead>
										<TableHead className="font-semibold text-foreground py-4 text-center">Markah</TableHead>
										<TableHead className="font-semibold text-foreground py-4 text-center pr-6">Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(data?.weakStudents ?? []).map((student) => (
										<TableRow key={student.result_id} className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group">
											<TableCell className="py-4">
												<div className="font-semibold text-foreground group-hover:text-primary transition-colors">
													{student.name}
												</div>
												<div className="text-xs text-muted-foreground">{student.student_id}</div>
											</TableCell>
											<TableCell className="py-4">{student.className}</TableCell>
											<TableCell className="py-4 text-center font-semibold text-rose-600">{student.mark}</TableCell>
											<TableCell className="py-4 text-center pr-6">
												<Badge className="border border-rose-200 bg-rose-100 text-rose-700">Intervention</Badge>
											</TableCell>
										</TableRow>
									))}
									{!loading && (data?.weakStudents.length ?? 0) === 0 && (
										<TableRow>
											<TableCell colSpan={4} className="py-16">
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

function MetricCard({
	title,
	value,
	icon: Icon,
}: {
	title: string;
	value: string | number;
	icon: typeof Users;
}) {
	return (
		<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
			<CardContent className="flex items-center justify-between p-5">
				<div>
					<p className="text-sm text-muted-foreground">{title}</p>
					<h3 className="mt-2 text-2xl font-bold text-foreground">{value}</h3>
				</div>
				<div className="rounded-xl bg-primary/10 p-3">
					<Icon className="h-5 w-5 text-primary" />
				</div>
			</CardContent>
		</Card>
	);
}

function ChartCard({
	title,
	description,
	children,
	className = "",
}: {
	title: string;
	description: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<Card className={`border-border bg-card shadow-md rounded-xl overflow-hidden ${className}`}>
			<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
				<CardTitle className="text-xl font-bold text-foreground">{title}</CardTitle>
				<p className="text-sm text-muted-foreground">{description}</p>
			</CardHeader>
			<CardContent className="p-6">{children}</CardContent>
		</Card>
	);
}

function ReportTable({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
			<CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
				<CardTitle className="text-xl font-bold text-foreground">{title}</CardTitle>
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
