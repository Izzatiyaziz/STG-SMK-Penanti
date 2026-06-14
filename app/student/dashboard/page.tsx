"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  UserCheck,
  BarChart3,
  TrendingUp,
  FileText,
  ChartPie,
} from "lucide-react";
import {
  Cell,
  LineChart,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { HeaderLastUpdated } from "@/components/header-last-updated";

/* ================= TYPES ================= */

type SubjectResult = {
  subject: string;
  mark: number;
  grade: string;
};

type ReportCardPayload = {
  student: {
    examId: string;
    name: string;
    ic: string;
    className: string;
    exam: string;
    year: string;
    classTeacher: string;
  };
  exams: Array<{ id: string; name: string; year: string }>;
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

const GRADE_COLORS = ["#16a34a", "#2563eb", "#f59e0b", "#f97316", "#e11d48"];

function StatCard({
  title,
  value,
  subText,
  icon: Icon,
  tone,
}: {
  title: string;
  value: ReactNode;
  subText?: ReactNode;
  icon: LucideIcon;
  tone: "emerald" | "blue" | "violet";
}) {
  const toneClass = {
    emerald: "border-emerald-200 bg-emerald-100 text-emerald-700",
    blue: "border-blue-200 bg-blue-100 text-blue-700",
    violet: "border-violet-200 bg-violet-100 text-violet-700",
  }[tone];

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="mt-2 truncate text-2xl font-bold text-foreground">{value}</div>
          {subText ? <div className="mt-1 text-xs text-muted-foreground">{subText}</div> : null}
        </div>
        <div className={`shrink-0 rounded-xl border p-3 ${toneClass}`}>
          <Icon className="h-5 w-5" />
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
  const [selectedExamId, setSelectedExamId] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const [reportRes, trendRes] = await Promise.all([
          fetch(
            `/api/student/report-card${selectedExamId ? `?exam_id=${encodeURIComponent(selectedExamId)}` : ""}`,
            { cache: "no-store" },
          ),
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
        setSelectedExamId((current) => current || String(reportJson?.student?.examId ?? ""));

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
  }, [selectedExamId]);

  const gradeDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const subject of report?.results ?? []) {
      const grade = String(subject.grade || "-").toUpperCase();
      counts.set(grade, (counts.get(grade) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([grade, value]) => ({ grade, value }))
      .sort((a, b) => a.grade.localeCompare(b.grade));
  }, [report?.results]);

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
          <HeaderLastUpdated />
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
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-6">
                <div className="w-full max-w-md space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Peperiksaan</div>
                  <Select value={selectedExamId} onValueChange={setSelectedExamId} disabled={loading || !report.exams.length}>
                    <SelectTrigger className="h-11 border-border bg-background">
                      <SelectValue placeholder="Pilih peperiksaan" />
                    </SelectTrigger>
                    <SelectContent>
                      {report.exams.map((exam) => (
                        <SelectItem key={exam.id} value={exam.id}>
                          {exam.name} ({exam.year})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard title="Kelas" value={report.student.className || "-"} icon={GraduationCap} tone="emerald" />
              <StatCard title="Guru Kelas" value={report.student.classTeacher || "-"} icon={UserCheck} tone="blue" />
              <StatCard
                title="Purata"
                value={`${report.summary.percentage ?? 0}%`}
                subText={`Kedudukan ${report.summary.classRank || "-"}`}
                icon={BarChart3}
                tone="violet"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="overflow-hidden rounded-xl border-border bg-card shadow-md">
                <CardHeader className="border-b border-border px-6 py-5">
                  <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <ChartPie className="h-5 w-5 text-primary" />
                    Analisis Gred
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Taburan gred bagi keputusan peperiksaan terkini.</p>
                </CardHeader>
                <CardContent className="p-6">
                  {gradeDistribution.length ? (
                    <>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={gradeDistribution} dataKey="value" nameKey="grade" innerRadius={62} outerRadius={100} paddingAngle={4} label>
                            {gradeDistribution.map((item, index) => (
                              <Cell key={item.grade} fill={GRADE_COLORS[index % GRADE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {gradeDistribution.map((item, index) => (
                          <div key={item.grade} className="rounded-md border border-border bg-muted/20 p-2 text-center">
                            <div className="mx-auto mb-1 h-2 w-8 rounded-full" style={{ backgroundColor: GRADE_COLORS[index % GRADE_COLORS.length] }} />
                            <div className="font-bold">{item.grade}</div>
                            <div className="text-xs text-muted-foreground">{item.value} subjek</div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center text-sm text-muted-foreground">Tiada data gred untuk dipaparkan.</div>
                  )}
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-xl border-border bg-card shadow-md">
                <CardHeader className="border-b border-border px-6 py-5">
                  <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Trend Prestasi Akademik
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Perbandingan purata individu mengikut peperiksaan.</p>
                </CardHeader>
                <CardContent className="p-6">
                  {trend.length ? (
                    <ResponsiveContainer width="100%" height={340}>
                      <LineChart data={trend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="exam" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="average" name="Purata Individu" stroke="#2563eb" strokeWidth={3} dot={{ r: 5, fill: "#22c55e" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="py-12 text-center text-sm text-muted-foreground">Tiada data trend untuk dipaparkan.</div>
                  )}
                </CardContent>
              </Card>
            </div>

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
