"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  UserCheck,
  BarChart3,
  TrendingUp,
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
import type { LucideIcon } from "lucide-react";

/* ================= TYPES ================= */

type SubjectResult = {
  subject: string;
  mark: number;
  grade: string;
};

type ReportCardPayload = {
  student: {
    name: string;
    ic: string;
    className: string;
    exam: string;
    year: string;
    classTeacher: string;
  };
  results: SubjectResult[];
  summary: {
    totalSubjects: number;
    totalMarks: number;
    totalStudents: number;
    classRank: string;
    percentage: number;
    gradeSummary: string;
    comment: string;
  };
};

type TrendPoint = { exam: string; average: number };

function gradeColor(grade: string) {
  switch (String(grade ?? "").trim().toUpperCase()) {
    case "A":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "B":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "C":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "D":
      return "bg-orange-100 text-orange-700 border-orange-200";
    default:
      return "bg-rose-100 text-rose-700 border-rose-200";
  }
}

function StatCard({
  title,
  value,
  subText,
  icon: Icon,
  variant,
}: {
  title: string;
  value: ReactNode;
  subText?: ReactNode;
  icon: LucideIcon;
  variant: "primary" | "chart2" | "chart3";
}) {
  const styles = {
    primary: {
      border: "hover:border-emerald-300",
      bg: "bg-emerald-100",
      iconBorder: "border-emerald-200",
      text: "text-emerald-600",
      valText: "text-emerald-600",
    },
    chart2: {
      border: "hover:border-blue-300",
      bg: "bg-blue-100",
      iconBorder: "border-blue-200",
      text: "text-blue-600",
      valText: "text-blue-600",
    },
    chart3: {
      border: "hover:border-violet-300",
      bg: "bg-violet-100",
      iconBorder: "border-violet-200",
      text: "text-violet-600",
      valText: "text-violet-600",
    },
  }[variant];

  return (
    <Card
      className={`border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 ${styles.border}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
            <div className={`truncate text-2xl font-bold ${styles.valText}`}>{value}</div>
            {subText ? <div className="mt-1 text-xs text-muted-foreground">{subText}</div> : null}
          </div>
          <div className={`shrink-0 p-3 rounded-xl ${styles.bg} border ${styles.iconBorder}`}>
            <Icon className={`w-5 h-5 ${styles.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StudentDashboardPage() {
  const [report, setReport] = useState<ReportCardPayload | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const [reportRes, trendRes] = await Promise.all([
          fetch("/api/student/report-card", { cache: "no-store" }),
          fetch("/api/student/performance-trend", { cache: "no-store" }),
        ]);

        const reportJson = await reportRes.json();
        if (!reportRes.ok) {
          setReport(null);
          setTrend([]);
          setError(reportJson?.message || "Gagal memuatkan dashboard pelajar");
          return;
        }
        setReport(reportJson);

        const trendJson = await trendRes.json().catch(() => null);
        if (trendRes.ok) {
          setTrend(Array.isArray(trendJson?.data) ? trendJson.data : []);
        } else {
          setTrend([]);
        }
      } catch {
        setReport(null);
        setTrend([]);
        setError("Gagal memuatkan dashboard pelajar");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const subjects = report?.results ?? [];
  const summary = report?.summary;
  const student = report?.student;
  const examLabel = [student?.exam, student?.year].filter(Boolean).join(" ").trim();

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

        {loading ? (
          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Memuatkan dashboard...
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : report ? (
          <>
            {/* ================= SUMMARY CARDS ================= */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="Kelas"
                value={student?.className || "-"}
                icon={GraduationCap}
                variant="primary"
              />
              <StatCard
                title="Guru Kelas"
                value={student?.classTeacher || "-"}
                icon={UserCheck}
                variant="chart2"
              />
              <StatCard
                title="Purata"
                value={`${summary?.percentage ?? 0}%`}
                subText={`Kedudukan ${summary?.classRank || "-"}`}
                icon={BarChart3}
                variant="chart3"
              />
            </div>

            {/* ================= TREND GRAPH ================= */}
            <Card className="shadow-lg border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Trend Prestasi Akademik</CardTitle>
                <CardDescription>Perbandingan purata markah mengikut peperiksaan.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                {trend.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="exam" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="average" name="Purata" strokeWidth={3} dot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-sm text-muted-foreground">Tiada data trend untuk dipaparkan.</div>
                )}
              </CardContent>
            </Card>

            {/* ================= SUBJECT TABLE ================= */}
            <Card className="shadow-lg border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Keputusan Subjek</CardTitle>
                <CardDescription>
                  Markah dan gred setiap subjek{examLabel ? ` untuk ${examLabel}` : ""}.
                </CardDescription>
              </CardHeader>
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
                    {subjects.length ? (
                      subjects.map((s, i) => (
                        <TableRow key={`${s.subject}-${i}`}>
                          <TableCell className="font-medium">{s.subject}</TableCell>
                          <TableCell className="text-center">{s.mark}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={gradeColor(s.grade)}>
                              {s.grade}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                          Tiada keputusan subjek untuk dipaparkan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* ================= AI INSIGHT ================= */}
            <Card className="shadow-lg border border-border/50">
              <CardContent className="p-6 space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Prestasi Akademik</h2>
                </div>
                <p className="text-sm">
                  <b>Ringkasan Gred:</b> {summary?.gradeSummary || "-"}
                </p>
                <p className="text-sm">
                  <b>Bilangan Subjek:</b> {summary?.totalSubjects ?? 0}
                </p>
                <p className="text-sm">
                  <b>Komen & Cadangan:</b>
                </p>
                <p className="text-sm italic text-muted-foreground">{summary?.comment || "Komen belum tersedia."}</p>
              </CardContent>
            </Card>

            {/* ================= ACTION ================= */}
            <div className="flex justify-end">
              <Link href="/student/report-card">
                <Button className="w-full sm:w-auto">
                  <FileText className="w-4 h-4 mr-2" />
                  Lihat Slip Keputusan
                </Button>
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
