"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap,
  UserCheck,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { StudentDashboardData } from "@/app/types";

export default function StudentDashboardPage() {
  const [data, setData] = useState<StudentDashboardData | null>(null);

  useEffect(() => {
    setData({
      className: "2 Ibnu Majah",
      classTeacher: "Pn. Maria binti Ishak",
      average: 70,
      position: 5,
      totalStudents: 30,
    });
  }, []);

  if (!data) return null;

  /* ================= DUMMY GRAPH DATA ================= */
  const performanceData = [
    { exam: "UPSA", average: 65 },
    { exam: "Percubaan", average: 68 },
    { exam: "UASA", average: 72 },
    { exam: "Akhir Tahun", average: 75 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ================= HEADER ================= */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <GraduationCap className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Dashboard Pelajar
            </h1>
          </div>
          <p className="text-muted-foreground">
            Paparan ringkas prestasi dan maklumat akademik pelajar.
          </p>
        </div>

        {/* ================= CARD SECTION ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kelas</p>
                <h2 className="text-2xl font-bold mt-2">
                  {data.className}
                </h2>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Guru Kelas
                </p>
                <h2 className="text-lg font-semibold mt-2">
                  {data.classTeacher}
                </h2>
              </div>
              <div className="p-3 rounded-full bg-secondary/10">
                <UserCheck className="w-6 h-6 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Purata Semasa
                </p>
                <h2 className="text-3xl font-bold mt-2 text-accent">
                  {data.average}%
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Kedudukan {data.position} daripada{" "}
                  {data.totalStudents}
                </p>
              </div>
              <div className="p-3 rounded-full bg-accent/10">
                <BarChart3 className="w-6 h-6 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================= PERFORMANCE GRAPH ================= */}
        <Card className="shadow-lg border border-border/50">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-1">
              Trend Prestasi Akademik
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Perubahan purata markah pelajar bagi setiap peperiksaan.
            </p>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="exam" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="average"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
