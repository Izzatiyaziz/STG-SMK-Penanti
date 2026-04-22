"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  ClipboardList, 
  Activity,
  ShieldCheck,
  Clock,
  Loader2,
  Building2,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { User } from "@/app/types";
import { Badge } from "@/components/ui/badge";

interface SessionLog {
  session_id: string;
  user_id: string;
  user_name: string;
  role: string;
  action: string;
  login_time: string;
  logout_time: string | null;
}

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
        fetch("/api/admin/sessions"),
      ]);

      if (studentRes.ok) setStudents(await studentRes.json());
      if (teacherRes.ok) setTeachers(await teacherRes.json());
      if (sessionRes.ok) setSessions(await sessionRes.json());
      
    } catch (error) {
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

        {/* ================= TABLE LOG SISTEM ================= */}
        <Card className="border-border bg-card shadow-md rounded-xl overflow-hidden">
          <CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  Log Penggunaan Sistem
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Memantau aktiviti log masuk dan log keluar pengguna</p>
              </div>
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-medium">
                {sessions.length} Sesi Terkumpul
              </Badge>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="font-semibold text-foreground py-4 w-16 text-center">#</TableHead>
                  <TableHead className="font-semibold text-foreground">ID Pengguna</TableHead>
                  <TableHead className="font-semibold text-foreground">Peranan</TableHead>
                  <TableHead className="font-semibold text-foreground">Aktiviti</TableHead>
                  <TableHead className="font-semibold text-foreground">Waktu Log Masuk</TableHead>
                  <TableHead className="font-semibold text-foreground text-right pr-6">Status / Log Keluar</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary inline" />
                    </TableCell>
                  </TableRow>
                ) : sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                      Tiada rekod log ditemui.
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((log, index) => {
                    const loginDate = new Date(log.login_time);
                    const formattedLogin = `${loginDate.toLocaleDateString("ms-MY")} ${loginDate.toLocaleTimeString("ms-MY", { hour: '2-digit', minute: '2-digit' })}`;
                    
                    return (
                      <TableRow key={log.session_id} className="hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0">
                        <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-bold text-foreground uppercase">{log.user_id}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-medium capitalize">
                            {log.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 font-medium">{log.action}</TableCell>
                        <TableCell className="text-muted-foreground tabular-nums text-sm">{formattedLogin}</TableCell>
                        <TableCell className="text-right pr-6 tabular-nums text-sm">
                          {log.logout_time ? (
                            <span className="text-muted-foreground">
                              {new Date(log.logout_time).toLocaleDateString("ms-MY")} {new Date(log.logout_time).toLocaleTimeString("ms-MY", { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 animate-pulse">
                              Sedang Aktif
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ✅ StatCard yang diubah suai mengikut gaya Student Page
function StatCard({ title, value, icon: Icon, variant }: { title: string, value: number, icon: any, variant: 'primary' | 'chart2' | 'chart3' }) {
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