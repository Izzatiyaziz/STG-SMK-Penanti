"use client";

import AdminSystemUsageTable, {
	type SystemUsageLogRow,
} from "@/components/admin/system-usage-table";
import { useEffect, useState } from "react";
import SystemUsageChart from "./system-usage-chart";

export default function AdminReportsPage() {
	const [logs, setLogs] = useState<SystemUsageLogRow[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			setLoading(true);
			try {
				const res = await fetch("/api/admin/sessions?limit=100");
				const json = await res.json();
				if (!cancelled) setLogs(json?.data ?? []);
			} catch {
				if (!cancelled) setLogs([]);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<div className="flex flex-col gap-8 p-6 md:p-8">
			<div className="flex flex-col gap-1 border-b border-border/40 pb-6">
				<p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">
					Pentadbiran
				</p>
				<h1 className="!text-[36px] font-black leading-tight text-foreground">
					Laporan
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Rekod aktiviti pengguna untuk pemantauan dan audit.
				</p>
			</div>

			<div>
				<div className="mb-3 flex items-baseline gap-3">
					<h2 className="font-semibold text-foreground">Penggunaan Sistem</h2>
					<span className="text-xs text-muted-foreground">
						Log masuk pengguna mengikut masa
					</span>
				</div>
				<SystemUsageChart />
			</div>

			<div>
				<div className="mb-3 flex items-baseline gap-3">
					<h2 className="font-semibold text-foreground">Log Aktiviti</h2>
					<span className="text-xs text-muted-foreground">100 rekod terkini</span>
				</div>
				<AdminSystemUsageTable logs={logs} loading={loading} />
			</div>
		</div>
	);
}
