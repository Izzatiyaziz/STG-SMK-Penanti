"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart3,
  Sparkles,
  Trophy,
  FileSpreadsheet,
  RefreshCw,
  MessageSquareText,
  GraduationCap,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Exam = { id: string; name: string; year: string };

type StudentSubject = {
  subject_id: string;
  name: string;
  mark: number;
  grade: string;
};

type StudentReport = {
  student_id: string;
  student_name: string;
  subjects: StudentSubject[];
  average_mark: number;
  position: number | null;
  comment: string;
};

type ReportPayload = {
  class: { id: string; name: string; grade: number | null };
  exam: { id: string; name: string; academic_year: string };
  students: StudentReport[];
};

function toId(v: unknown) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function formatAverage(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

function gradeColor(grade: string) {
  switch (grade) {
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

const chartConfig = {
  average_mark: {
    label: "Purata Markah",
    color: "var(--chart-1)",
  },
  students: {
    label: "Bil. Pelajar",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const pieColors = ["#0f766e", "#0284c7", "#d97706", "#ea580c", "#be123c"];

export default function TeacherReportPage() {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pageError, setPageError] = useState("");
  const [commentLoadingByStudent, setCommentLoadingByStudent] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const session = localStorage.getItem("stg_session");
    if (!session) {
      router.replace("/login");
      return;
    }

    const parsed = JSON.parse(session);
    const role = String(parsed.role ?? "").toLowerCase().trim();
    const nextTeacherId = toId(parsed.user_id ?? parsed.userId ?? parsed.id);
    const allowedRoles = new Set(["teacher", "subject teacher", "subject coordinator"]);

    if (parsed.userType !== "teacher" || !allowedRoles.has(role)) {
      toast.error("Anda tidak dibenarkan akses laporan");
      router.replace("/teacher/dashboard");
      return;
    }

    setTeacherId(nextTeacherId);
  }, [router]);

  useEffect(() => {
    async function loadExams() {
      if (!teacherId) return;
      try {
        const res = await fetch("/api/teacher/exams", { cache: "no-store" });
        const json = await res.json();
        const list: Exam[] = Array.isArray(json?.data) ? json.data : [];
        setExams(list);

        const stored = localStorage.getItem("stg_marks_context");
        let initialExamId = "";
        if (stored) {
          try {
            initialExamId = toId((JSON.parse(stored) as { exam_id?: string }).exam_id);
          } catch {
            initialExamId = "";
          }
        }

        if (initialExamId && list.some((exam) => exam.id === initialExamId)) {
          setSelectedExamId(initialExamId);
        } else if (list[0]?.id) {
          setSelectedExamId(list[0].id);
        }
      } catch {
        setExams([]);
      }
    }

    loadExams();
  }, [teacherId]);

  useEffect(() => {
    async function loadReport() {
      if (!teacherId || !selectedExamId) return;

      setIsLoading(true);
      setPageError("");
      try {
        const res = await fetch(
          `/api/teacher/report-cards/class?teacher_id=${encodeURIComponent(teacherId)}&exam_id=${encodeURIComponent(selectedExamId)}`,
          { cache: "no-store" }
        );
        const json = await res.json();

        if (!res.ok) {
          setReport(null);
          setPageError(json?.message || "Gagal memuatkan data laporan");
          return;
        }

        setReport({
          class: json?.class ?? { id: "", name: "", grade: null },
          exam: json?.exam ?? { id: selectedExamId, name: "", academic_year: "" },
          students: Array.isArray(json?.students) ? json.students : [],
        });
      } catch {
        setReport(null);
        setPageError("Gagal memuatkan data laporan");
      } finally {
        setIsLoading(false);
      }
    }

    loadReport();
  }, [teacherId, selectedExamId]);

  const summary = useMemo(() => {
    const students = report?.students ?? [];
    const totalStudents = students.length;
    const average =
      totalStudents > 0
        ? students.reduce((sum, student) => sum + Number(student.average_mark ?? 0), 0) / totalStudents
        : 0;
    const topStudent = [...students].sort(
      (a, b) => Number(b.average_mark ?? 0) - Number(a.average_mark ?? 0)
    )[0] ?? null;
    const commentCount = students.filter((student) => student.comment.trim().length > 0).length;

    const gradeMap = new Map<string, number>();
    for (const student of students) {
      for (const subject of student.subjects) {
        const key = String(subject.grade ?? "").trim().toUpperCase();
        if (!key) continue;
        gradeMap.set(key, (gradeMap.get(key) ?? 0) + 1);
      }
    }

    const gradeDistribution = Array.from(gradeMap.entries())
      .map(([grade, value]) => ({ grade, value }))
      .sort((a, b) => a.grade.localeCompare(b.grade));

    const chartRows = [...students]
      .sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999))
      .slice(0, 12)
      .map((student) => ({
        name: student.student_name,
        shortName: student.student_name.split(" ").slice(0, 2).join(" "),
        average_mark: Number(student.average_mark ?? 0),
      }));

    return {
      totalStudents,
      average,
      topStudent,
      commentCount,
      gradeDistribution,
      chartRows,
    };
  }, [report]);

  async function refreshReport() {
    if (!teacherId || !selectedExamId) return;
    setIsLoading(true);
    setPageError("");
    try {
      const res = await fetch(
        `/api/teacher/report-cards/class?teacher_id=${encodeURIComponent(teacherId)}&exam_id=${encodeURIComponent(selectedExamId)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) {
        setReport(null);
        setPageError(json?.message || "Gagal memuatkan data laporan");
        return;
      }
      setReport({
        class: json?.class ?? { id: "", name: "", grade: null },
        exam: json?.exam ?? { id: selectedExamId, name: "", academic_year: "" },
        students: Array.isArray(json?.students) ? json.students : [],
      });
    } catch {
      setReport(null);
      setPageError("Gagal memuatkan data laporan");
    } finally {
      setIsLoading(false);
    }
  }

  async function generateReportCards() {
    if (!teacherId || !selectedExamId) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/teacher/report-cards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_id: teacherId,
          exam_id: selectedExamId,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json?.message || "Gagal jana kad laporan");
        return;
      }

      setReport({
        class: json?.class ?? { id: "", name: "", grade: null },
        exam: json?.exam ?? { id: selectedExamId, name: "", academic_year: "" },
        students: Array.isArray(json?.students) ? json.students : [],
      });
      setPageError("");
      toast.success("Kad laporan berjaya dijana");
    } catch {
      toast.error("Gagal jana kad laporan");
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateAiComment(student: StudentReport) {
    if (!teacherId || !selectedExamId || !report?.class.id) return;

    setCommentLoadingByStudent((prev) => ({ ...prev, [student.student_id]: true }));
    try {
      const res = await fetch("/api/teacher/report-cards/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.student_id,
          class_id: report.class.id,
          teacher_id: teacherId,
          exam_id: selectedExamId,
          mode: "ai",
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json?.message || "Gagal jana komen AI");
        return;
      }

      setReport((prev) =>
        prev
          ? {
              ...prev,
              students: prev.students.map((item) =>
                item.student_id === student.student_id
                  ? { ...item, comment: String(json?.comment ?? item.comment) }
                  : item
              ),
            }
          : prev
      );

      toast.success(`Komen AI dijana untuk ${student.student_name}`);
    } catch {
      toast.error("Gagal jana komen AI");
    } finally {
      setCommentLoadingByStudent((prev) => ({ ...prev, [student.student_id]: false }));
    }
  }

  async function saveManualComment(student: StudentReport) {
    if (!teacherId || !selectedExamId || !report?.class.id) return;

    const nextComment = window.prompt("Masukkan komen guru kelas", student.comment ?? "");
    if (nextComment === null) return;
    const trimmed = nextComment.trim();
    if (!trimmed) {
      toast.error("Komen manual tidak boleh kosong");
      return;
    }

    setCommentLoadingByStudent((prev) => ({ ...prev, [student.student_id]: true }));
    try {
      const res = await fetch("/api/teacher/report-cards/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.student_id,
          class_id: report.class.id,
          teacher_id: teacherId,
          exam_id: selectedExamId,
          mode: "manual",
          comment: trimmed,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json?.message || "Gagal simpan komen manual");
        return;
      }

      setReport((prev) =>
        prev
          ? {
              ...prev,
              students: prev.students.map((item) =>
                item.student_id === student.student_id ? { ...item, comment: trimmed } : item
              ),
            }
          : prev
      );
      toast.success(`Komen manual disimpan untuk ${student.student_name}`);
    } catch {
      toast.error("Gagal simpan komen manual");
    } finally {
      setCommentLoadingByStudent((prev) => ({ ...prev, [student.student_id]: false }));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Laporan Kelas</h1>
            </div>
            <p className="max-w-3xl text-muted-foreground">
              Paparan ini menggunakan data sebenar daripada keputusan yang telah diluluskan,
              kad laporan kelas, dan komen guru. Gunakan ia untuk jana, semak, dan
              pantau kesiapsediaan laporan peperiksaan.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Card className="border-border/50 shadow-sm">
              <CardContent className="flex min-w-[240px] items-center gap-3 p-4">
                <GraduationCap className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Peperiksaan
                  </p>
                  <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Pilih peperiksaan" />
                    </SelectTrigger>
                    <SelectContent>
                      {exams.map((exam) => (
                        <SelectItem key={exam.id} value={exam.id}>
                          {exam.name} ({exam.year})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={refreshReport}
                disabled={!selectedExamId || isLoading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Muat Semula
              </Button>
              <Button onClick={generateReportCards} disabled={!selectedExamId || isGenerating}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {isGenerating ? "Menjana..." : "Jana Kad Laporan"}
              </Button>
            </div>
          </div>
        </div>

        {pageError ? (
          <Card className="border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="flex items-start gap-3 p-4 text-amber-800">
              <AlertCircle className="mt-0.5 h-5 w-5" />
              <div className="space-y-2">
                <p className="font-medium">{pageError}</p>
                <p className="text-sm">
                  Jika data belum wujud, jana kad laporan dahulu selepas semua keputusan
                  peperiksaan diluluskan.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/50 shadow-lg">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">Kelas</p>
                <h3 className="mt-2 text-xl font-semibold">
                  {report?.class.name || "Belum tersedia"}
                </h3>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-lg">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">Purata Kelas</p>
                <h3 className="mt-2 text-2xl font-bold text-primary">
                  {formatAverage(summary.average)}%
                </h3>
              </div>
              <div className="rounded-full bg-emerald-100 p-3">
                <BarChart3 className="h-6 w-6 text-emerald-700" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-lg">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">Pelajar Teratas</p>
                <h3 className="mt-2 font-semibold">
                  {summary.topStudent?.student_name || "Belum tersedia"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {summary.topStudent ? `${formatAverage(summary.topStudent.average_mark)}%` : "Tiada data"}
                </p>
              </div>
              <div className="rounded-full bg-amber-100 p-3">
                <Trophy className="h-6 w-6 text-amber-700" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-lg">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">Komen Lengkap</p>
                <h3 className="mt-2 text-2xl font-bold text-secondary">
                  {summary.commentCount}/{summary.totalStudents}
                </h3>
              </div>
              <div className="rounded-full bg-sky-100 p-3">
                <MessageSquareText className="h-6 w-6 text-sky-700" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Kedudukan Purata Pelajar</CardTitle>
              <CardDescription>
                12 pelajar teratas mengikut purata markah untuk peperiksaan semasa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[320px] w-full">
                <BarChart accessibilityLayer data={summary.chartRows}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tickMargin={10} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="average_mark" fill="var(--color-average_mark)" radius={8} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Taburan Gred Subjek</CardTitle>
              <CardDescription>
                Bilangan gred yang muncul merentas semua subjek dalam kad laporan kelas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.gradeDistribution.length > 0 ? (
                <>
                  <ChartContainer config={chartConfig} className="mx-auto h-[240px] w-full max-w-[320px]">
                    <PieChart>
                      <Pie
                        data={summary.gradeDistribution}
                        dataKey="value"
                        nameKey="grade"
                        innerRadius={60}
                        outerRadius={92}
                        paddingAngle={3}
                      >
                        {summary.gradeDistribution.map((entry, index) => (
                          <Cell key={entry.grade} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                  <div className="flex flex-wrap gap-2">
                    {summary.gradeDistribution.map((item, index) => (
                      <Badge
                        key={item.grade}
                        variant="outline"
                        className="border-transparent"
                        style={{
                          backgroundColor: `${pieColors[index % pieColors.length]}20`,
                          color: pieColors[index % pieColors.length],
                        }}
                      >
                        Gred {item.grade}: {item.value}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Tiada data gred untuk dipaparkan.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Senarai Kad Laporan Pelajar</CardTitle>
              <CardDescription>
                Kedudukan, purata, liputan subjek, dan status komen untuk setiap pelajar.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {report?.exam.name ? (
                <Badge variant="secondary">
                  {report.exam.name} {report.exam.academic_year ? `• ${report.exam.academic_year}` : ""}
                </Badge>
              ) : null}
              {report?.class.name ? <Badge variant="outline">{report.class.name}</Badge> : null}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Kedudukan</TableHead>
                  <TableHead>Pelajar</TableHead>
                  <TableHead className="text-center">Purata</TableHead>
                  <TableHead className="text-center">Subjek</TableHead>
                  <TableHead>Komen</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Memuatkan data laporan...
                    </TableCell>
                  </TableRow>
                ) : (report?.students ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Tiada kad laporan ditemui untuk peperiksaan ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  (report?.students ?? [])
                    .slice()
                    .sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999))
                    .map((student) => (
                      <TableRow key={student.student_id}>
                        <TableCell>
                          {student.position ? (
                            <Badge variant="outline">#{student.position}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{student.student_name}</div>
                            <div className="flex flex-wrap gap-1">
                              {student.subjects.slice(0, 4).map((subject) => (
                                <span
                                  key={`${student.student_id}-${subject.subject_id}`}
                                  className={`rounded-full border px-2 py-0.5 text-xs ${gradeColor(subject.grade)}`}
                                >
                                  {subject.name}: {subject.mark}
                                </span>
                              ))}
                              {student.subjects.length > 4 ? (
                                <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                                  +{student.subjects.length - 4} lagi
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {formatAverage(student.average_mark)}%
                        </TableCell>
                        <TableCell className="text-center">{student.subjects.length}</TableCell>
                        <TableCell className="max-w-[360px]">
                          {student.comment.trim() ? (
                            <p className="line-clamp-3 text-sm text-muted-foreground">
                              {student.comment}
                            </p>
                          ) : (
                            <span className="text-sm text-muted-foreground">Belum ada komen</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => saveManualComment(student)}
                              disabled={commentLoadingByStudent[student.student_id]}
                            >
                              {commentLoadingByStudent[student.student_id] ? "Menyimpan..." : "Komen Manual"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generateAiComment(student)}
                              disabled={commentLoadingByStudent[student.student_id]}
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              {commentLoadingByStudent[student.student_id] ? "Menjana..." : "Jana Komen AI"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
