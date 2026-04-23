"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AlertTriangle, ClipboardList, FileSignature, ShieldCheck } from "lucide-react";

type Session = {
  user_id: string;
  userType: "teacher";
  role: string;
};

type Subject = { id: string; name: string };
type Exam = {
  id: string;
  name: string;
  academic_year: string;
  subject_settings?: Record<string, any>;
};

type DashboardData = {
  coordinator: { id: string; name: string } | null;
  subject: { id: string; name: string } | null;
  exam: { id: string; name: string; academic_year: string } | null;
  subject_settings: Record<string, any>;
  summary: {
    totalClasses: number;
    totalTeachers: number;
    subjectPerformance: number;
    pendingSubmissions: number;
  };
  gradeDistribution: Array<{ grade: string; value: number }>;
  classSummaries: Array<{
    class_id: string;
    class_name: string;
    grade: number;
    teacher_id: string;
    teacher_name: string;
    total_students: number;
    submitted_count: number;
    results_count: number;
    average_total: number;
    status_counts: { pending: number; approved: number; rejected: number };
  }>;
  alerts: string[];
};

const COLORS = ["#2563eb", "#22c55e", "#facc15", "#fb7185", "#a855f7"];

export default function SubjectCoordinatorDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [examId, setExamId] = useState("");

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("stg_session");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Session;
      if (parsed?.userType !== "teacher") return;

      const role = String(parsed.role ?? "").toLowerCase().trim();
      if (role !== "subject coordinator") {
        toast.error("Anda tidak dibenarkan akses dashboard penyelaras");
        router.replace("/teacher/dashboard");
        return;
      }

      setSession(parsed);
    } catch {
      // ignore
    } finally {
      setSessionReady(true);
    }
  }, [router]);

  useEffect(() => {
    if (!sessionReady) return;
    if (!localStorage.getItem("stg_session")) router.replace("/login");
  }, [router, sessionReady]);

  useEffect(() => {
    if (!session) return;

    const teacherId = session.user_id;
    let cancelled = false;

    async function loadOptions() {
      try {
        const [sRes, eRes] = await Promise.all([
          fetch(`/api/coordinator/subjects?teacher_id=${teacherId}`, {
            cache: "no-store",
          }),
          fetch("/api/admin/exams", { cache: "no-store" }),
        ]);

        const sJson = await sRes.json();
        const eJson = await eRes.json();

        const sList: Subject[] = (sJson?.data ?? [])
          .map((s: any) => ({ id: String(s.id ?? ""), name: String(s.name ?? "") }))
          .filter((s: Subject) => Boolean(s.id));

        const eList: Exam[] = (eJson ?? [])
          .map((e: any) => ({
            id: String(e.id ?? ""),
            name: String(e.name ?? ""),
            academic_year: String(e.academic_year ?? ""),
            subject_settings: e.subject_settings ?? {},
          }))
          .filter((e: Exam) => Boolean(e.id));

        if (cancelled) return;
        setSubjects(sList);
        setExams(eList);

        if (!subjectId && sList.length > 0) setSubjectId(sList[0].id);
        if (!examId && eList.length > 0) setExamId(eList[0].id);
      } catch {
        if (cancelled) return;
        setSubjects([]);
        setExams([]);
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user_id]);

  useEffect(() => {
    if (!session || !subjectId || !examId) return;

    const teacherId = session.user_id;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/coordinator/dashboard?teacher_id=${teacherId}&subject_id=${subjectId}&exam_id=${examId}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as DashboardData;
        if (!res.ok) {
          toast.error((json as any)?.message ?? "Gagal memuatkan dashboard");
          return;
        }
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [examId, session, subjectId]);

  const summary = data?.summary ?? {
    totalClasses: 0,
    totalTeachers: 0,
    subjectPerformance: 0,
    pendingSubmissions: 0,
  };

  const classPerformance = useMemo(() => {
    return (data?.classSummaries ?? []).map((c) => ({
      class: c.class_name,
      avg: Math.round(c.average_total || 0),
    }));
  }, [data?.classSummaries]);

  const gradeDistribution = data?.gradeDistribution ?? [];
  const alerts = data?.alerts ?? [];

  const rows = useMemo(() => {
    return (data?.classSummaries ?? []).map((c) => {
      const complete = c.total_students > 0 && c.submitted_count >= c.total_students;
      return {
        class: c.class_name,
        grade: c.grade,
        teacher: c.teacher_name || "—",
        students: c.total_students,
        submitted: c.submitted_count,
        complete,
        approved: c.status_counts?.approved ?? 0,
        pending: c.status_counts?.pending ?? 0,
        rejected: c.status_counts?.rejected ?? 0,
      };
    });
  }, [data?.classSummaries]);

  if (!sessionReady) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Dashboard Penyelaras Subjek{data?.subject?.name ? ` — ${data.subject.name}` : ""}
            </h1>
            <p className="text-muted-foreground">
              Pantau penghantaran markah, semak keputusan, dan lihat ringkasan prestasi.
            </p>
          </div>

          <div className="flex gap-2">
            <Link href="/coordinator/assignments">
              <Button variant="outline" size="sm">
                <ClipboardList className="w-4 h-4 mr-2" />
                Assign Guru
              </Button>
            </Link>
            <Link href="/coordinator/answer-schemes">
              <Button variant="outline" size="sm">
                <FileSignature className="w-4 h-4 mr-2" />
                Skema Jawapan
              </Button>
            </Link>
            <Link href="/coordinator/approvals">
              <Button size="sm">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Semak Markah
              </Button>
            </Link>
          </div>
        </div>

        <Card className="shadow-lg border border-border/50">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Peperiksaan</div>
              <Select value={examId} onValueChange={setExamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih peperiksaan" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.academic_year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Subjek</div>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih subjek" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Deadline</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{data?.subject_settings?.deadline || "—"}</Badge>
                {loading && <span className="text-sm text-muted-foreground">Loading...</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryCard title="Jumlah Kelas" value={summary.totalClasses} />
          <SummaryCard title="Guru Subjek" value={summary.totalTeachers} />
          <SummaryCard title="Prestasi Subjek" value={`${summary.subjectPerformance}%`} />
          <SummaryCard title="Pending Submissions" value={summary.pendingSubmissions} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
              <CardTitle>Purata Markah Mengikut Kelas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={classPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="class" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardHeader>
              <CardTitle>Taburan Gred</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    dataKey="value"
                    nameKey="grade"
                    outerRadius={90}
                    label
                  >
                    {gradeDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Amaran Terkini
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {alerts.map((a, i) => (
                <p key={i}>• {a}</p>
              ))}
              {!loading && alerts.length === 0 && (
                <p className="text-muted-foreground">Tiada amaran.</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardHeader>
              <CardTitle>Status Penghantaran (Kelas)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Guru</TableHead>
                    <TableHead className="text-center">Pelajar</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="font-medium">{r.class}</div>
                        <div className="text-xs text-muted-foreground">Tingkatan {r.grade}</div>
                      </TableCell>
                      <TableCell>{r.teacher}</TableCell>
                      <TableCell className="text-center">{r.students}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={r.complete ? "secondary" : "destructive"}>
                          {r.complete ? "Submitted" : `Pending (${r.submitted}/${r.students})`}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!loading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                        Tiada data.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <Card className="shadow-lg border border-border/50">
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <h3 className="text-2xl font-bold mt-2">{value}</h3>
      </CardContent>
    </Card>
  );
}
