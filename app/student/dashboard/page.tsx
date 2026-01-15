"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  UserCheck,
  BarChart3,
  TrendingUp,
  ClipboardList,
  Percent,
  Trophy,
  FileText,
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
import Link from "next/link";

/* ================= TYPES ================= */

type SubjectResult = {
  subject: string;
  mark: number;
  grade: string;
};

export default function StudentDashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setData({
      className: "2 Ibnu Majah",
      classTeacher: "Pn. Maria binti Ishak",
      average: 75,
      position: 5,
      totalStudents: 30,
    });
  }, []);

  if (!data) return null;

  /* ================= DUMMY DATA ================= */

  const performanceData = [
    { exam: "UPSA", average: 65 },
    { exam: "Percubaan", average: 68 },
    { exam: "UASA", average: 72 },
    { exam: "Akhir Tahun", average: 75 },
  ];

  const summary = {
    exam: "UPSA 2025",
    average: 75,
    classRank: "5 / 30",
  };

  const subjects: SubjectResult[] = [
    { subject: "Bahasa Melayu", mark: 85, grade: "A" },
    { subject: "Bahasa Inggeris", mark: 59, grade: "D" },
    { subject: "Matematik", mark: 43, grade: "E" },
    { subject: "Pendidikan Islam", mark: 95, grade: "A" },
    { subject: "Sains", mark: 67, grade: "C" },
  ];

  const aiInsight = {
    strength: "Pendidikan Islam dan Bahasa Melayu",
    weakness: "Matematik",
    advice:
      "Prestasi keseluruhan adalah sederhana. Pelajar disarankan memberi tumpuan kepada subjek Matematik melalui latihan berterusan dan bimbingan tambahan.",
  };

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
            Paparan ringkas prestasi akademik dan keputusan peperiksaan.
          </p>
        </div>

        {/* ================= SUMMARY CARDS ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kelas</p>
                <h2 className="text-2xl font-bold mt-2">
                  {data.className}
                </h2>
              </div>
              <GraduationCap className="w-6 h-6 text-primary" />
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Guru Kelas</p>
                <h2 className="text-lg font-semibold mt-2">
                  {data.classTeacher}
                </h2>
              </div>
              <UserCheck className="w-6 h-6 text-secondary" />
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Purata</p>
                <h2 className="text-3xl font-bold mt-2 text-accent">
                  {data.average}%
                </h2>
                <p className="text-xs text-muted-foreground">
                  Kedudukan {data.position}/{data.totalStudents}
                </p>
              </div>
              <BarChart3 className="w-6 h-6 text-accent" />
            </CardContent>
          </Card>

        </div>

        {/* ================= TREND GRAPH ================= */}
        <Card className="shadow-lg border border-border/50">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Trend Prestasi Akademik
            </h2>

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

        {/* ================= SUBJECT TABLE ================= */}
        <Card className="shadow-lg border border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mata Pelajaran</TableHead>
                  <TableHead className="text-center">Markah</TableHead>
                  <TableHead className="text-center">Gred</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell>{s.subject}</TableCell>
                    <TableCell className="text-center">
                      {s.mark}
                    </TableCell>
                    <TableCell className="text-center">
                      {s.grade}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ================= AI INSIGHT ================= */}
        <Card className="shadow-lg border border-border/50">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">
                AI Performance Insight
              </h2>
            </div>
            <p><b>Kekuatan:</b> {aiInsight.strength}</p>
            <p><b>Perlu Penambahbaikan:</b> {aiInsight.weakness}</p>
            <p className="italic text-muted-foreground">
              {aiInsight.advice}
            </p>
          </CardContent>
        </Card>

                {/* ================= ACTION ================= */}
                <div className="flex justify-end">
                    <Link href="/student/report-card">
                        <Button>
                            <FileText className="w-4 h-4 mr-2" />
                            Lihat Slip Keputusan
                        </Button>
                    </Link>
                </div>
      </div>
    </div>
  );
}
