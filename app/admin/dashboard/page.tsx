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
  ClipboardList,
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
    nama: "Ahmad bin Ali",
    role: "Pelajar",
    action: "Akses Keputusan Peperiksaan",
    date: "20/06/2025",
    time: "10:32 AM",
  },
  {
    id: 2,
    nama: "Aisyah binti Mohd",
    role: "Pelajar",
    action: "Muat Turun Slip Keputusan",
    date: "20/06/2025",
    time: "10:35 AM",
  },
  {
    id: 3,
    nama: "Ahmad bin Ali",
    role: "Guru",
    action: "Kemas Kini Markah Peperiksaan",
    date: "19/06/2025",
    time: "3:15 PM",
  },
  {
    id: 4,
    nama: "Zainal bin Abidin",
    role: "Pentadbir",
    action: "Menjana Laporan Peperiksaan",
    date: "18/06/2025",
    time: "9:05 AM",
  },
  {
    id: 5,
    nama: "Fauziah binti Rashid",
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

      {/* ================= LOG PENGGUNAAN SISTEM ================= */}
        <Card className="border border-border/50 shadow-lg overflow-hidden">
          {/* HEADER */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">
                Log Penggunaan Sistem
              </h2>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-background">
                <TableRow>
                  <TableHead className="w-14 text-center">No</TableHead>
                   <TableHead>Nama</TableHead>
                  <TableHead>Peranan</TableHead>
                  <TableHead>Aktiviti</TableHead>
                  <TableHead>Tarikh</TableHead>
                  <TableHead>Masa</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {usageLogs.map((log, index) => (
                  <TableRow
                    key={log.id}
                    className="odd:bg-muted/20 hover:bg-muted/40 transition"
                  >
                    <TableCell className="text-center font-medium">
                      {index + 1}
                    </TableCell>

                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {log.nama}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {log.role}
                      </span>
                    </TableCell>

                    <TableCell className="font-medium">
                      {log.action}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {log.date}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {log.time}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
