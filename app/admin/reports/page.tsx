"use client";

import AdminSystemUsageTable, {
  type SystemUsageLogRow,
} from "@/components/admin/system-usage-table";
import { Activity } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ================= HEADER ================= */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Log Penggunaan Sistem
            </h1>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            Paparan rekod aktiviti pengguna bagi tujuan pemantauan dan audit
            penggunaan sistem oleh pihak pentadbiran.
          </p>
        </div>

        <SystemUsageChart />

        {/* ================= LOG TABLE ================= */}
        <AdminSystemUsageTable logs={logs} loading={loading} />

      </div>
    </div>
  );
}
