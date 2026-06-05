"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { User } from "@/app/types";
import AdminSystemUsageTable, {
	type SystemUsageLogRow,
} from "@/components/admin/system-usage-table";
import SystemUsageChart from "../reports/system-usage-chart";
import { formatMalaysiaTime } from "@/lib/date-utils";
import { Skeleton } from "@/components/ui/skeleton";

type SessionLog = SystemUsageLogRow;

const LastUpdatedTime = () => {
	const [time, setTime] = useState<string>("");
	useEffect(() => {
		const update = () => setTime(formatMalaysiaTime());
		update();
		const interval = setInterval(update, 60000);
		return () => clearInterval(interval);
	}, []);
	return <span className="text-foreground">{time || "—"}</span>;
};

export default function AdminDashboardPage() {
	const [students, setStudents] = useState<User[]>([]);
	const [teachers, setTeachers] = useState<User[]>([]);
	const [sessions, setSessions] = useState<SessionLog[]>([]);
	const [loading, setLoading] = useState(false);

	async function fetchDashboardData() {
		setLoading(true);
		try {
			const [studentRes, teacherRes, sessionRes] = await Promise.all([
				fetch("/api/admin/users?role=student"),
				fetch("/api/admin/users?role=teacher"),
				fetch("/api/admin/sessions?limit=10"),
			]);
			if (studentRes.ok) setStudents(await studentRes.json());
			if (teacherRes.ok) setTeachers(await teacherRes.json());
			if (sessionRes.ok) {
				const json = await sessionRes.json();
				const list = Array.isArray(json) ? json : (json?.data ?? []);
				setSessions(Array.isArray(list) ? list : []);
			}
		} catch {
			toast.error("Gagal memuatkan data dashboard");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		fetchDashboardData();
	}, []);

	const stats = [
		{
			label: "Jumlah Pelajar",
			value: students.length,
			href: "/admin/student",
		},
		{
			label: "Jumlah Guru",
			value: teachers.length,
			href: "/admin/teacher",
		},
		{
			label: "Warga Sekolah",
			value: students.length + teachers.length,
			href: undefined,
		},
	];

	return (
		<div className="flex flex-col gap-8 p-6 md:p-8">
			{/* PAGE HEADER */}
			<div className="flex flex-col gap-1 border-b border-border/40 pb-6">
				<p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">
					Pentadbiran
				</p>
				<h1 className="!text-[36px] font-black leading-tight text-foreground">
					Papan Pemuka
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Dikemas kini pada <LastUpdatedTime />
				</p>
			</div>

			{/* STAT ROW — typographic, no icon boxes */}
			<div className="grid grid-cols-1 gap-px bg-border/40 sm:grid-cols-3">
				{stats.map((stat) => {
					const inner = (
						<div className="flex flex-col gap-1.5 bg-card p-6">
							<span className="!text-[42px] font-black leading-none text-primary">
								{loading ? (
							<Skeleton className="h-10 w-20 mb-1" />
						) : stat.value}
							</span>
							<span className="text-sm text-muted-foreground">{stat.label}</span>
						</div>
					);
					return stat.href ? (
						<Link
							key={stat.label}
							href={stat.href}
							className="transition-opacity hover:opacity-80"
						>
							{inner}
						</Link>
					) : (
						<div key={stat.label}>{inner}</div>
					);
				})}
			</div>

			{/* CHART */}
			<div>
				<div className="mb-3 flex items-baseline gap-3">
					<h2 className="font-semibold text-foreground">Penggunaan Sistem</h2>
					<span className="text-xs text-muted-foreground">
						Log masuk pengguna mengikut masa
					</span>
				</div>
				<SystemUsageChart />
			</div>

			{/* ACTIVITY LOG */}
			<div>
				<div className="mb-3 flex items-baseline gap-3">
					<h2 className="font-semibold text-foreground">Log Aktiviti</h2>
					<span className="text-xs text-muted-foreground">10 rekod terkini</span>
				</div>
				<AdminSystemUsageTable
					logs={sessions}
					loading={loading}
					emptyText="Tiada rekod log ditemui."
					title=""
					description=""
				/>
			</div>
		</div>
	);
}
