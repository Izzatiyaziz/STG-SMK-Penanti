"use client";

import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Range = "3m" | "30d" | "7d";
type Point = { date: string; value: number };

export default function SystemUsageChart() {
	const [range, setRange] = useState<Range>("30d");
	const [chartData, setChartData] = useState<Point[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			setLoading(true);
			try {
				const res = await fetch(`/api/admin/system-usage?range=${range}`);
				const json = await res.json();
				if (!cancelled) setChartData(json?.data ?? []);
			} catch {
				if (!cancelled) setChartData([]);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [range]);

	return (
		<Card className="border border-border/50 shadow-lg">
			<CardContent className="p-4 sm:p-6 space-y-4">
				{/* HEADER - Responsive */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h2 className="text-base sm:text-lg font-semibold">Penggunaan Sistem</h2>
						<p className="text-xs sm:text-sm text-muted-foreground">
							Jumlah log masuk pengguna berdasarkan tempoh masa
						</p>
					</div>

					{/* Button Group - Responsive */}
					<div className="flex flex-wrap gap-2">
						<Button
							size="sm"
							variant={range === "3m" ? "default" : "outline"}
							onClick={() => setRange("3m")}
							className="text-xs sm:text-sm px-2 sm:px-3"
						>
							3 Bulan
						</Button>
						<Button
							size="sm"
							variant={range === "30d" ? "default" : "outline"}
							onClick={() => setRange("30d")}
							className="text-xs sm:text-sm px-2 sm:px-3"
						>
							30 Hari
						</Button>
						<Button
							size="sm"
							variant={range === "7d" ? "default" : "outline"}
							onClick={() => setRange("7d")}
							className="text-xs sm:text-sm px-2 sm:px-3"
						>
							7 Hari
						</Button>
					</div>
				</div>

				{/* CHART - Responsive with dynamic height */}
				<div className="w-full">
					{/* Adjust chart height based on screen size */}
					<div className="h-[250px] sm:h-[280px] md:h-[300px] lg:h-[320px]">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart
								data={chartData}
								margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
							>
								<defs>
									<linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
										<stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
									</linearGradient>
								</defs>

								<XAxis
									dataKey="date"
									tick={{ fontSize: 10, fill: "#6b7280" }}
									tickMargin={8}
									interval="preserveStartEnd"
									minTickGap={30}
								/>
								<YAxis
									tick={{ fontSize: 10, fill: "#6b7280" }}
									tickMargin={8}
									width={40}
								/>
								<Tooltip
									contentStyle={{
										fontSize: "12px",
										borderRadius: "8px",
										padding: "8px 12px",
									}}
								/>

								<Area
									type="monotone"
									dataKey="value"
									stroke="#6366f1"
									fill="url(#usageGradient)"
									strokeWidth={2}
									dot={false}
									activeDot={{ r: 4, strokeWidth: 1 }}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* Loading indicator */}
				{loading && (
					<div className="text-xs sm:text-sm text-muted-foreground text-center py-2">
						Memuatkan data...
					</div>
				)}

				{/* Empty state */}
				{!loading && chartData.length === 0 && (
					<div className="text-xs sm:text-sm text-muted-foreground text-center py-8">
						Tiada data untuk dipaparkan
					</div>
				)}
			</CardContent>
		</Card>
	);
}
