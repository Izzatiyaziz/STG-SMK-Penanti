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
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	BarChart3,
	BookOpen,
	ClipboardList,
	Clock,
	GraduationCap,
	RefreshCw,
	School,
	Trophy,
	TrendingUp,
	UserRound,
	Users,
	type LucideIcon,
} from "lucide-react";

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

type PrincipalData = {
	schoolStats: {
		totalStudents: number;
		totalTeachers: number;
		totalCommunity: number;
	};
	summary: {
		totalStudents: number;
		totalResults: number;
		averageMark: number;
		passRate: number;
		subjectsCovered: number;
	};
	gradeDistribution: Array<{ grade: string; value: number }>;
	subjectPerformance: Array<{ subject_id: string; subject: string; average: number; students: number }>;
	classPerformance: Array<{ class_id: string; className: string; gradeLevel: number; classTeacherName?: string; average: number; results: number }>;
	trend: Array<{ exam: string; year: string; average: number }>;
	filterOptions: {
		subjects: Array<{ id: string; name: string }>;
		exams: Array<{ id: string; name: string; year: string }>;
		grades: number[];
		classes: Array<{ id: string; name: string; grade: number }>;
	};
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

const barColors = ["#2563eb", "#14b8a6", "#f59e0b", "#a855f7", "#ef4444", "#22c55e"];

function chartLabel(row: { className: string; gradeLevel: number }) {
	return row.gradeLevel ? `${row.gradeLevel} ${row.className}` : row.className;
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
			return "bg-slate-500";
	}
}

export default function PrincipalDashboardPage() {
	const [data, setData] = useState<PrincipalData | null>(null);
	const [loading, setLoading] = useState(false);
	const [subjectFilter, setSubjectFilter] = useState("all");
	const [examFilter, setExamFilter] = useState("all");
	const [gradeFilter, setGradeFilter] = useState("1");
	const [classFilter, setClassFilter] = useState("all");

	async function fetchDashboard() {
		setLoading(true);
		try {
			const params = new URLSearchParams({
				subject_id: subjectFilter,
				exam_id: examFilter,
				grade: gradeFilter,
				class_id: classFilter,
			});
			const res = await fetch(`/api/principal/dashboard?${params.toString()}`, {
				cache: "no-store",
			});
			const json = await res.json();
			if (!res.ok) {
				toast.error(json?.message ?? "Gagal memuatkan dashboard pengetua");
				setData(null);
				return;
			}
			setData(json.data);
		} catch {
			toast.error("Ralat memuatkan dashboard pengetua");
			setData(null);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		fetchDashboard();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [subjectFilter, examFilter, gradeFilter, classFilter]);

	const classOptions = useMemo(() => {
		const options = (data?.filterOptions.classes ?? []).filter((option) => option.grade === Number(gradeFilter));
		const uniqueByName = new Map<string, { id: string; name: string; grade: number }>();
		for (const option of options) {
			const key = option.name.toLowerCase();
			if (!uniqueByName.has(key)) uniqueByName.set(key, option);
		}
		return Array.from(uniqueByName.values());
	}, [data?.filterOptions.classes, gradeFilter]);

	useEffect(() => {
		if (classFilter === "all") return;
		if (classOptions.some((option) => option.id === classFilter)) return;
		setClassFilter("all");
	}, [classFilter, classOptions]);

	const subjectChartData = data?.subjectPerformance ?? [];
	const classChartData = (data?.classPerformance ?? []).map((row) => ({
		...row,
		classLabel: chartLabel(row),
	}));
	const trendChartData = (data?.trend ?? []).map((row) => ({
		...row,
		examLabel: row.year ? `${row.exam} (${row.year})` : row.exam,
	}));
	const topClassRows = [...(data?.classPerformance ?? [])]
		.sort((a, b) => b.average - a.average || b.results - a.results)
		.slice(0, 3);

	return (
		<div className="min-h-screen bg-background p-4 md:p-6">
			<div className="mx-auto max-w-7xl space-y-8">
				<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div className="space-y-3">
						<div className="flex items-center gap-4">
							<div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 shadow-sm">
								<BarChart3 className="h-7 w-7 text-primary" />
							</div>
							<div>
								<h1 className="text-xl font-bold text-foreground">Selamat Datang, Pengetua Sekolah</h1>
								<p className="mt-1 font-medium text-muted-foreground">
									Ringkasan statistik dan log aktiviti sistem terkini
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
							<div className="flex items-center gap-1">
								<Clock className="h-3.5 w-3.5" />
								<span>Kemas kini: <LastUpdatedTime /></span>
							</div>
						</div>
					</div>
					<Button
						variant="outline"
						onClick={fetchDashboard}
						disabled={loading}
						className="h-10 rounded-lg border-border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground"
					>
						<RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
						Muat Semula
					</Button>
				</div>

				<div className="grid grid-cols-1 gap-5 md:grid-cols-3">
					<SummaryCard
						title="Jumlah Pelajar"
						value={data?.schoolStats.totalStudents ?? 0}
						icon={GraduationCap}
						tone="emerald"
					/>
					<SummaryCard
						title="Jumlah Guru"
						value={data?.schoolStats.totalTeachers ?? 0}
						icon={UserRound}
						tone="blue"
					/>
					<SummaryCard
						title="Warga Sekolah"
						value={data?.schoolStats.totalCommunity ?? 0}
						icon={Users}
						tone="violet"
					/>
				</div>

				<Card className="overflow-hidden rounded-xl border-border bg-card shadow-md">
					<CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-5">
						<div className="space-y-2">
							<div className="text-sm font-medium text-muted-foreground">Tingkatan</div>
							<Select
								value={gradeFilter}
								onValueChange={(value) => {
									setGradeFilter(value);
									setClassFilter("all");
								}}
							>
								<SelectTrigger className="h-11 rounded-lg border-border bg-background">
									<SelectValue placeholder="Pilih tingkatan" />
								</SelectTrigger>
								<SelectContent className="rounded-lg border-border">
									{(data?.filterOptions.grades ?? []).map((grade) => (
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
								<SelectContent className="max-h-72 overflow-y-auto rounded-lg border-border">
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

						<div className="space-y-2">
							<div className="text-sm font-medium text-muted-foreground">Subjek</div>
							<Select value={subjectFilter} onValueChange={setSubjectFilter}>
								<SelectTrigger className="h-11 rounded-lg border-border bg-background">
									<SelectValue placeholder="Pilih subjek" />
								</SelectTrigger>
								<SelectContent className="max-h-72 overflow-y-auto rounded-lg border-border">
									<SelectItem value="all">
										<div className="flex items-center gap-2">
											<BookOpen className="h-4 w-4" />
											Semua Subjek
										</div>
									</SelectItem>
									{(data?.filterOptions.subjects ?? []).map((subject) => (
										<SelectItem key={subject.id} value={subject.id}>
											{subject.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex items-end">
							<Button
								variant="outline"
								className="h-11 rounded-lg border-border hover:bg-accent hover:text-accent-foreground"
								onClick={() => {
									setSubjectFilter("all");
									setExamFilter("all");
									setGradeFilter("1");
									setClassFilter("all");
								}}
							>
								Reset
							</Button>
						</div>
						
					</CardContent>
				</Card>

				<div className="grid gap-6 lg:grid-cols-2">
					<ChartCard title="Prestasi Subjek" description="Purata markah bagi setiap subjek" icon={BookOpen}>
						<ResponsiveContainer width="100%" height={280}>
							<BarChart data={subjectChartData}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="subject" interval={0} angle={-18} textAnchor="end" height={72} />
								<YAxis domain={[0, 100]} />
								<Tooltip />
								<Bar dataKey="average" name="Purata" radius={7}>
									{subjectChartData.map((_, index) => (
										<Cell key={index} fill={barColors[index % barColors.length]} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</ChartCard>
					<ChartCard title="Prestasi Kelas" description="Purata markah mengikut kelas" icon={School}>
						<ResponsiveContainer width="100%" height={280}>
							<BarChart data={classChartData}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="classLabel" />
								<YAxis domain={[0, 100]} />
								<Tooltip />
								<Bar dataKey="average" name="Purata" radius={7} fill="#14b8a6" />
							</BarChart>
						</ResponsiveContainer>
					</ChartCard>

					<ChartCard title="Trend Peperiksaan" description="Perubahan purata keputusan mengikut peperiksaan" icon={TrendingUp}>
						<ResponsiveContainer width="100%" height={280}>
							<LineChart data={trendChartData}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="examLabel" />
								<YAxis domain={[0, 100]} />
								<Tooltip />
								<Line type="monotone" dataKey="average" name="Purata" stroke="#2563eb" strokeWidth={3} dot={{ r: 5, fill: "#f59e0b" }} />
							</LineChart>
						</ResponsiveContainer>
					</ChartCard>
					<TopClassesTable rows={topClassRows} />
				</div>
			</div>
		</div>
	);
}

function SummaryCard({
	title,
	value,
	icon: Icon,
	tone,
}: {
	title: string;
	value: string | number;
	icon: typeof GraduationCap;
	tone: "emerald" | "blue" | "violet";
}) {
	const toneClasses = {
		emerald: {
			value: "text-emerald-600",
			icon: "border-emerald-200 bg-emerald-100 text-emerald-700",
		},
		blue: {
			value: "text-blue-600",
			icon: "border-blue-200 bg-blue-100 text-blue-700",
		},
		violet: {
			value: "text-violet-600",
			icon: "border-violet-200 bg-violet-100 text-violet-700",
		},
	}[tone];

	return (
		<Card className="border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md">
			<CardContent className="p-5">
				<div className="flex items-start justify-between">
					<div>
						<p className="mb-2 text-sm font-medium text-muted-foreground">{title}</p>
						<h3 className={`text-3xl font-bold ${toneClasses.value}`}>{value}</h3>
					</div>
					<div className={`rounded-xl border p-3 ${toneClasses.icon}`}>
						<Icon className="h-5 w-5" />
					</div>
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
	icon: Icon,
}: {
	title: string;
	description: string;
	children: ReactNode;
	className?: string;
	icon?: LucideIcon;
}) {
	return (
		<Card className={`overflow-hidden rounded-xl border-border bg-card shadow-md ${className}`}>
			<CardHeader className="border-b border-border px-6 py-5">
				<CardTitle className="flex items-center gap-2 text-xl font-bold">
					{Icon ? <Icon className="h-5 w-5 text-primary" /> : null}
					{title}
				</CardTitle>
				<p className="text-sm text-muted-foreground">{description}</p>
			</CardHeader>
			<CardContent className="p-6">{children}</CardContent>
		</Card>
	);
}

function TopClassesTable({
	rows,
}: {
	rows: Array<{ class_id: string; className: string; gradeLevel: number; classTeacherName?: string; average: number; results: number }>;
}) {
	return (
		<Card className="h-full overflow-hidden rounded-xl border-border bg-card shadow-md">
			<CardHeader className="border-b border-border px-6 py-5">
				<CardTitle className="flex items-center gap-2 text-xl font-bold">
					<Trophy className="h-5 w-5 text-primary" />
					Kelas Cemerlang
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					Top 3 kelas berdasarkan purata semua subjek untuk filter semasa.
				</p>
			</CardHeader>
			<CardContent className="p-0">
				<div className="overflow-x-auto">
					<Table>
								<TableHeader className="bg-muted/30">
									<TableRow className="border-b border-border hover:bg-transparent">
										<TableHead className="w-20 py-4 text-center font-semibold text-foreground">#</TableHead>
										<TableHead className="py-4 font-semibold text-foreground">Tingkatan</TableHead>
										<TableHead className="py-4 font-semibold text-foreground">Kelas</TableHead>
										<TableHead className="py-4 font-semibold text-foreground">Guru Kelas</TableHead>
										<TableHead className="py-4 text-center font-semibold text-foreground">Purata Kelas</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.length === 0 ? (
										<TableRow>
											<TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
												Tiada kelas cemerlang untuk filter semasa.
											</TableCell>
										</TableRow>
									) : (
										rows.map((row, index) => (
											<TableRow
												key={row.class_id}
												className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
											>
												<TableCell className="py-4 text-center">
													<Badge variant="secondary" className="h-7 w-7 justify-center rounded-full p-0">
														{index + 1}
													</Badge>
												</TableCell>
												<TableCell className="py-4 font-semibold text-foreground">
													Tingkatan {row.gradeLevel}
												</TableCell>
												<TableCell className="py-4 font-semibold text-foreground">{row.className}</TableCell>
												<TableCell className="py-4 font-medium text-foreground">{row.classTeacherName ?? "-"}</TableCell>
												<TableCell className="py-4 text-center">
													<span className="font-bold text-emerald-600">{row.average}%</span>
												</TableCell>
											</TableRow>
										))
									)}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}
