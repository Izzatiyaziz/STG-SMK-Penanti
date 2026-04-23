"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  Activity,
  ShieldCheck,
  Clock
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { User } from "@/app/types";
import AdminSystemUsageTable, {
  type SystemUsageLogRow,
} from "@/components/admin/system-usage-table";
import SystemUsageChart from "../reports/system-usage-chart";

type SessionLog = SystemUsageLogRow;

const LastUpdatedTime = () => {
  const [time, setTime] = useState<string>("");
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);
  return <span className="font-medium text-primary">{time || "Loading..."}</span>;
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
        const sessionJson = await sessionRes.json();
        const list = Array.isArray(sessionJson)
          ? sessionJson
          : (sessionJson?.data ?? []);
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ================= HEADER ================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
                <Activity className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Dashboard Utama</h1>
                <p className="text-muted-foreground font-medium mt-1">Ringkasan statistik dan log aktiviti sistem terkini</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /><span>Sistem Dilindungi</span></div>
              <div className="w-1 h-1 rounded-full bg-muted" />
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Kemas kini: <LastUpdatedTime /></span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= STAT CARDS GAYA STUDENT PAGE ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <StatCard 
            title="Jumlah Pelajar" 
            value={students.length} 
            icon={GraduationCap} 
            variant="primary"
          />
          <StatCard 
            title="Jumlah Guru" 
            value={teachers.length} 
            icon={UserCheck} 
            variant="chart2"
          />
          <StatCard 
            title="Warga Sekolah" 
            value={students.length + teachers.length} 
            icon={Users} 
            variant="chart3"
          />
        </div>

        <SystemUsageChart />

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            Log Penggunaan Sistem (Terkini)
          </h2>
          <p className="text-sm text-muted-foreground">
            Paparan ringkas aktiviti pengguna untuk pemantauan pantas.
          </p>
        </div>

        <AdminSystemUsageTable
          logs={sessions}
          loading={loading}
          emptyText="Tiada rekod log ditemui."
        />
      </div>
    </div>
  );
}

// ✅ StatCard yang diubah suai mengikut gaya Student Page
function StatCard({
  title,
  value,
  icon: Icon,
  variant,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
  variant: "primary" | "chart2" | "chart3";
}) {
  const styles = {
    primary: {
      border: "hover:border-primary/30",
      bg: "bg-primary/10",
      iconBorder: "border-primary/20",
      text: "text-primary",
      valText: "text-foreground"
    },
    chart2: {
      border: "hover:border-chart-2/30",
      bg: "bg-chart-2/10",
      iconBorder: "border-chart-2/20",
      text: "text-chart-2",
      valText: "text-chart-2"
    },
    chart3: {
      border: "hover:border-chart-3/30",
      bg: "bg-chart-3/10",
      iconBorder: "border-chart-3/20",
      text: "text-chart-3",
      valText: "text-foreground"
    }
  }[variant];

  return (
    <Card className={`border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 ${styles.border}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {title}
            </p>
            <h3 className={`text-3xl font-bold ${styles.valText}`}>{value}</h3>
          </div>
          <div className={`p-3 rounded-xl ${styles.bg} border ${styles.iconBorder}`}>
            <Icon className={`w-5 h-5 ${styles.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
