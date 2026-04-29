"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { BarChart3, Trophy, TrendingDown, BookOpen } from "lucide-react";

/* ================= DUMMY DATA (APPROVED MARKS) ================= */

const subjectInfo = {
	subject: "Matematik",
};

const classPerformance = [
	{
		className: "2 Ibnu Sina",
		average: 72,
		dominantGrade: "B",
		students: 30,
	},
	{
		className: "2 Ibnu Majah",
		average: 65,
		dominantGrade: "C",
		students: 28,
	},
	{
		className: "2 Ibnu Khaldun",
		average: 80,
		dominantGrade: "A",
		students: 32,
	},
];

const chartConfig = {
	average: {
		label: "Purata Markah",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

/* ================= PAGE ================= */

export default function SubjectCoordinatorReportsPage() {
	const bestClass = classPerformance.reduce((a, b) =>
		a.average > b.average ? a : b,
	);

	const weakestClass = classPerformance.reduce((a, b) =>
		a.average < b.average ? a : b,
	);

	const overallAverage =
		classPerformance.reduce((sum, c) => sum + c.average, 0) /
		classPerformance.length;

	return (
		<div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* ================= HEADER ================= */}
				<div className="space-y-1">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-xl bg-primary/10">
							<BarChart3 className="w-6 h-6 text-primary" />
						</div>
						<h1 className="text-3xl font-bold tracking-tight">Laporan Subjek</h1>
					</div>
					<p className="text-muted-foreground">
						Analisis prestasi subjek berdasarkan markah yang telah diluluskan
					</p>
				</div>

				{/* ================= SUBJECT INFO ================= */}
				<Card className="shadow-lg border border-border/50">
					<CardContent className="p-6 flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground">Subjek</p>
							<h3 className="text-xl font-semibold mt-2">{subjectInfo.subject}</h3>
						</div>
						<BookOpen className="w-6 h-6 text-primary" />
					</CardContent>
				</Card>

				{/* ================= SUMMARY ================= */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<Card className="shadow-lg border border-border/50">
						<CardContent className="p-6 flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Purata Keseluruhan</p>
								<h3 className="text-2xl font-bold mt-2 text-primary">
									{overallAverage.toFixed(1)}%
								</h3>
							</div>
							<BarChart3 className="w-6 h-6 text-primary" />
						</CardContent>
					</Card>

					<Card className="shadow-lg border border-border/50">
						<CardContent className="p-6 flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Kelas Terbaik</p>
								<h3 className="font-semibold mt-2">{bestClass.className}</h3>
								<p className="text-xs text-muted-foreground">
									Purata {bestClass.average}%
								</p>
							</div>
							<Trophy className="w-6 h-6 text-green-600" />
						</CardContent>
					</Card>

					<Card className="shadow-lg border border-border/50">
						<CardContent className="p-6 flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Perlu Perhatian</p>
								<h3 className="font-semibold mt-2">{weakestClass.className}</h3>
								<p className="text-xs text-muted-foreground">
									Purata {weakestClass.average}%
								</p>
							</div>
							<TrendingDown className="w-6 h-6 text-red-600" />
						</CardContent>
					</Card>
				</div>

				{/* ================= BAR CHART ================= */}
				<Card className="shadow-lg border border-border/50">
					<CardContent className="p-6">
						<h2 className="text-xl font-semibold mb-2">
							Perbandingan Purata Markah Mengikut Kelas
						</h2>
						<p className="text-sm text-muted-foreground mb-4">
							Graf ini menunjukkan prestasi purata kelas bagi subjek{" "}
							{subjectInfo.subject}.
						</p>

						<ChartContainer
							config={chartConfig}
							className="aspect-auto h-[300px] w-full"
						>
							<BarChart accessibilityLayer data={classPerformance}>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="className"
									tickLine={false}
									axisLine={false}
									tickMargin={10}
								/>
								<YAxis
									domain={[0, 100]}
									tickLine={false}
									axisLine={false}
									tickMargin={10}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="average" fill="var(--color-average)" radius={6} />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>

				{/* ================= TABLE ================= */}
				<Card className="shadow-lg border border-border/50">
					<CardHeader>
						<CardTitle>Ringkasan Prestasi Kelas</CardTitle>
					</CardHeader>

					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Kelas</TableHead>
									<TableHead className="text-center">Purata Markah (%)</TableHead>
									<TableHead className="text-center">Gred Dominan</TableHead>
									<TableHead className="text-center">Bil. Pelajar</TableHead>
								</TableRow>
							</TableHeader>

							<TableBody>
								{classPerformance.map((row, i) => (
									<TableRow key={i}>
										<TableCell>{row.className}</TableCell>
										<TableCell className="text-center">{row.average}</TableCell>
										<TableCell className="text-center">
											<Badge variant="secondary">{row.dominantGrade}</Badge>
										</TableCell>
										<TableCell className="text-center">{row.students}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
