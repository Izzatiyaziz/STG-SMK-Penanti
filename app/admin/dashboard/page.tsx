"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  GraduationCap,
  UserCheck,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { User } from "@/app/types";

/* ===============================
   DUMMY DATA – PENGGUNAAN SISTEM
================================ */
const data3Months = [
  { date: "Apr 6", value: 120 },
  { date: "Apr 13", value: 160 },
  { date: "Apr 21", value: 140 },
  { date: "Apr 29", value: 190 },
  { date: "May 6", value: 240 },
  { date: "May 13", value: 220 },
  { date: "May 21", value: 170 },
  { date: "May 29", value: 230 },
  { date: "Jun 5", value: 250 },
  { date: "Jun 12", value: 270 },
  { date: "Jun 20", value: 290 },
  { date: "Jun 30", value: 260 },
];

const data30Days = data3Months.slice(-6);
const data7Days = data3Months.slice(-3);

/* ===============================
   DUMMY LOG PENGGUNAAN SISTEM
================================ */
const usageLogs = [
  {
    id: 1,
    role: "Pelajar",
    action: "Akses Keputusan Peperiksaan",
    date: "20/06/2025",
    time: "10:32 AM",
  },
  {
    id: 2,
    role: "Pelajar",
    action: "Muat Turun Slip Keputusan",
    date: "20/06/2025",
    time: "10:35 AM",
  },
  {
    id: 3,
    role: "Guru",
    action: "Kemas Kini Markah Peperiksaan",
    date: "19/06/2025",
    time: "3:15 PM",
  },
  {
    id: 4,
    role: "Pentadbir",
    action: "Menjana Laporan Peperiksaan",
    date: "18/06/2025",
    time: "9:05 AM",
  },
  {
    id: 5,
    role: "Pelajar",
    action: "Log Masuk Sistem",
    date: "18/06/2025",
    time: "8:40 AM",
  },
];

export default function AdminDashboardPage() {
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<"3m" | "30d" | "7d">("3m");

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const [studentRes, teacherRes] = await Promise.all([
        fetch("/api/admin/users?role=student"),
        fetch("/api/admin/users?role=teacher"),
      ]);

      setStudents(await studentRes.json());
      setTeachers(await teacherRes.json());
    } catch (error) {
      toast.error("Gagal memuatkan data dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const chartData =
    range === "7d" ? data7Days : range === "30d" ? data30Days : data3Months;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ================= HEADER ================= */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground">
            Pemantauan statistik dan penggunaan sistem sekolah.
          </p>
        </div>

        {/* ================= STAT CARDS ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Jumlah Pelajar" value={students.length} icon={GraduationCap} />
          <StatCard title="Jumlah Guru" value={teachers.length} icon={UserCheck} />
          <StatCard
            title="Jumlah Warga Sekolah"
            value={students.length + teachers.length}
            icon={Users}
          />
        </div>

        {/* ================= GRAF PENGGUNAAN SISTEM ================= */}
        <Card className="border border-border/50 shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Penggunaan Sistem
              </h2>

              <div className="flex gap-2">
                <Button size="sm" variant={range === "3m" ? "default" : "outline"} onClick={() => setRange("3m")}>
                  Last 3 months
                </Button>
                <Button size="sm" variant={range === "30d" ? "default" : "outline"} onClick={() => setRange("30d")}>
                  Last 30 days
                </Button>
                <Button size="sm" variant={range === "7d" ? "default" : "outline"} onClick={() => setRange("7d")}>
                  Last 7 days
                </Button>
              </div>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#6366f1"
                    fill="url(#usageGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ================= LOG PENGGUNAAN SISTEM ================= */}
        <Card className="border border-border/50 shadow-lg">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">No</TableHead>
                  <TableHead>Peranan</TableHead>
                  <TableHead>Aktiviti</TableHead>
                  <TableHead>Tarikh</TableHead>
                  <TableHead>Masa</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {usageLogs.map((log, index) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-center">{index + 1}</TableCell>
                    <TableCell>{log.role}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.date}</TableCell>
                    <TableCell>{log.time}</TableCell>
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

/* ===============================
   REUSABLE STAT CARD
================================ */
function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <Card className="shadow-lg border border-border/50">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <h2 className="text-3xl font-bold mt-2">{value}</h2>
        </div>
        <div className="p-3 rounded-full bg-primary/10">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}
