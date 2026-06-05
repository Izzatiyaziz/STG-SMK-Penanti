"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
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
import { FileText, Loader2, TrendingUp } from "lucide-react";
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
    case "A":  return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "B":  return "bg-sky-100 text-sky-700 border-sky-200";
    case "C":  return "bg-amber-100 text-amber-700 border-amber-200";
    case "D":  return "bg-orange-100 text-orange-700 border-orange-200";
    default:   return "bg-rose-100 text-rose-700 border-rose-200";
  }
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
        setTrend(trendRes.ok && Array.isArray(trendJson?.data) ? trendJson.data : []);
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

  const stats = [
    { label: "Kelas",              value: student?.className   || "—" },
    { label: "Guru Kelas",         value: student?.classTeacher || "—" },
    {
      label: "Purata Keseluruhan",
      value: summary ? `${summary.percentage}%` : "—",
      sub:   summary?.classRank ? `Kedudukan ${summary.classRank}` : undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-1 border-b border-border/40 pb-6">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">
          Pelajar
        </p>
        <h1 className="!text-[36px] font-black leading-tight text-foreground">
          Papan Pemuka
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paparan ringkas prestasi akademik dan keputusan peperiksaan.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Memuatkan dashboard...</span>
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : report ? (
        <>
          {/* STAT ROW — typographic, no icon boxes */}
          <div className="grid grid-cols-1 gap-px bg-border/40 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1.5 bg-card p-6">
                <span className="!text-[36px] font-black leading-none text-primary">
                  {stat.value}
                </span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                {stat.sub && (
                  <span className="text-xs text-muted-foreground/70">{stat.sub}</span>
                )}
              </div>
            ))}
          </div>

          {/* TREND CHART */}
          <div>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="font-semibold text-foreground">Trend Prestasi Akademik</h2>
              <span className="text-xs text-muted-foreground">
                Perbandingan purata markah mengikut peperiksaan
              </span>
            </div>
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-6">
                {trend.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="exam" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="average"
                        name="Purata"
                        strokeWidth={3}
                        dot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Tiada data trend untuk dipaparkan.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SUBJECT TABLE */}
          <div>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="font-semibold text-foreground">Keputusan Subjek</h2>
              {examLabel && (
                <span className="text-xs text-muted-foreground">{examLabel}</span>
              )}
            </div>
            <Card className="overflow-hidden border-border bg-card shadow-sm">
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
                        <TableCell
                          colSpan={3}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          Tiada keputusan subjek untuk dipaparkan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* ACADEMIC INSIGHT */}
          <div>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="font-semibold text-foreground">Prestasi Akademik</h2>
            </div>
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="space-y-2 p-6">
                <p className="text-sm">
                  <span className="font-semibold text-foreground">Ringkasan Gred: </span>
                  <span className="text-muted-foreground">{summary?.gradeSummary || "—"}</span>
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-foreground">Bilangan Subjek: </span>
                  <span className="text-muted-foreground">{summary?.totalSubjects ?? 0}</span>
                </p>
                <p className="text-sm font-semibold text-foreground">Komen &amp; Cadangan:</p>
                <p className="text-sm italic text-muted-foreground">
                  {summary?.comment || "Komen belum tersedia."}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="flex justify-end">
            <Link href="/student/report-card">
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                Lihat Slip Keputusan
              </Button>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
