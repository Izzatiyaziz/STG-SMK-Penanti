"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
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
  ChartPie,
  Sparkles,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  GraduationCap,
  School,
  AlertCircle,
  Eye,
  Loader2,
  MessageSquareText,
  Printer,
  Users,
  Trophy,
  TrendingDown,
  Pencil,
  Filter,
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
  ic_number?: string;
  subjects: StudentSubject[];
  average_mark: number;
  position: number | null;
  class_total_students?: number;
  level_position?: number | null;
  level_total_students?: number;
  grade_summary?: string;
  average_grade_point?: number;
  decision?: string;
  class_teacher_name?: string;
  comment: string;
  has_report_card?: boolean;
};

type ReportPayload = {
  class: { id: string; name: string; grade: number | null };
  exam: { id: string; name: string; academic_year: string };
  students: StudentReport[];
};

type TeacherAssignment = {
  id: string;
  subject_id: string;
  subject_name: string;
  class_id: string;
  class_name: string;
  grade: number | null;
};

type SubjectClassSummary = {
  class: { id: string; name: string; grade: number | null };
  totals: {
    students: number;
    results: number;
    submitted: number;
    omr_scanned?: number;
    approved: number;
    pending: number;
    rejected: number;
    average_total: number;
  };
  grades: Array<{ grade: string; value: number }>;
  student_results?: Array<{
    student_id: string;
    student_name: string;
    total: number;
    grade: string;
    status: string;
  }>;
  top_students?: Array<{
    student_id: string;
    student_name: string;
    total: number;
    grade: string;
    status: string;
  }>;
};

type SubjectComparisonSummary = SubjectClassSummary & {
  assignment: TeacherAssignment;
};

type SubjectStudentResult = NonNullable<SubjectClassSummary["student_results"]>[number];
type SubjectStudentDisplay = SubjectStudentResult & {
  class_name?: string;
  class_grade?: number | null;
  class_label?: string;
  subject_name?: string;
};

function toId(v: unknown) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function formatAverage(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

function formatClassLabel(grade: number | null | undefined, className: string) {
  const name = String(className ?? "").trim() || "-";
  return typeof grade === "number" && Number.isFinite(grade) ? `${grade} ${name}` : name;
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
  average_total: {
    label: "Purata Markah",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const gradeDisplayOrder = ["A", "B", "C", "D", "F"];
const gradeChartColors: Record<string, string> = {
  A: "#2563eb",
  B: "#22c55e",
  C: "#eab308",
  D: "#fb7185",
  F: "#ef4444",
};
const pieColors = gradeDisplayOrder.map((grade) => gradeChartColors[grade]);
const ALL_CLASSES_VALUE = "__all_classes__";
const ALL_SUBJECTS_VALUE = "__all_subjects__";

export function TeacherReportContent({
  activeReportPage,
}: {
  activeReportPage: "laporan" | "analitik";
}) {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState("");
  const [sessionRole, setSessionRole] = useState<string>("");
  const [isClassTeacher, setIsClassTeacher] = useState<boolean | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [assignmentGradeFilter, setAssignmentGradeFilter] = useState<string>("default-grade-1");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(ALL_SUBJECTS_VALUE);
  const [subjectSummary, setSubjectSummary] = useState<SubjectClassSummary | null>(null);
  const [subjectSummaries, setSubjectSummaries] = useState<SubjectComparisonSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pageError, setPageError] = useState("");
  const [commentLoadingByStudent, setCommentLoadingByStudent] = useState<Record<string, boolean>>({});
  const [studentSheetOpen, setStudentSheetOpen] = useState(false);
  const [studentSheetStudent, setStudentSheetStudent] = useState<StudentReport | null>(null);
  const [studentSheetComment, setStudentSheetComment] = useState("");
  const [reportCardPreviewStudent, setReportCardPreviewStudent] = useState<StudentReport | null>(null);

  const viewMode = isClassTeacher === true ? "class_teacher" : isClassTeacher === false ? "subject_teacher" : "loading";

  const assignmentGradeOptions = useMemo(() => {
    const set = new Set<number>([1]);
    for (const assignment of assignments) {
      if (typeof assignment.grade === "number" && Number.isFinite(assignment.grade)) set.add(assignment.grade);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [assignments]);

  const gradeFilteredAssignments = useMemo(() => {
    const effectiveAssignmentGradeFilter = assignmentGradeFilter === "default-grade-1" ? "1" : assignmentGradeFilter;
    if (effectiveAssignmentGradeFilter === "all") return assignments;
    const grade = Number(effectiveAssignmentGradeFilter);
    if (!Number.isFinite(grade)) return assignments;
    return assignments.filter((assignment) => assignment.grade === grade);
  }, [assignments, assignmentGradeFilter]);

  const subjectOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const assignment of gradeFilteredAssignments) {
      if (assignment.subject_id && assignment.subject_name) {
        byId.set(assignment.subject_id, assignment.subject_name);
      }
    }
    return Array.from(byId.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [gradeFilteredAssignments]);

  const filteredAssignments = useMemo(() => {
    if (selectedSubjectId === ALL_SUBJECTS_VALUE) return gradeFilteredAssignments;
    return gradeFilteredAssignments.filter((assignment) => assignment.subject_id === selectedSubjectId);
  }, [gradeFilteredAssignments, selectedSubjectId]);

  const classOptions = useMemo(() => {
    const byClassId = new Map<
      string,
      { id: string; name: string; grade: number | null; label: string }
    >();
    for (const assignment of filteredAssignments) {
      const classId = toId(assignment.class_id);
      if (!classId || byClassId.has(classId)) continue;
      byClassId.set(classId, {
        id: classId,
        name: assignment.class_name,
        grade: assignment.grade,
        label: formatClassLabel(assignment.grade, assignment.class_name),
      });
    }
    return Array.from(byClassId.values()).sort(
      (a, b) => Number(a.grade ?? 0) - Number(b.grade ?? 0) || a.name.localeCompare(b.name)
    );
  }, [filteredAssignments]);

  const isAllClassesSelected = selectedAssignmentId === ALL_CLASSES_VALUE;
  const allClassesLabel = "Semua kelas";

  useEffect(() => {
    if (viewMode !== "subject_teacher") return;
    if (classOptions.length === 0) {
      if (selectedAssignmentId) setSelectedAssignmentId("");
      return;
    }
    if (selectedAssignmentId === ALL_CLASSES_VALUE && classOptions.length > 1) return;
    if (classOptions.some((option) => option.id === selectedAssignmentId)) return;
    setSelectedAssignmentId(classOptions.length > 1 ? ALL_CLASSES_VALUE : classOptions[0].id);
  }, [classOptions, selectedAssignmentId, viewMode]);

  useEffect(() => {
    if (viewMode !== "subject_teacher") return;
    if (selectedSubjectId === ALL_SUBJECTS_VALUE) return;
    if (subjectOptions.some((subject) => subject.id === selectedSubjectId)) return;
    setSelectedSubjectId(ALL_SUBJECTS_VALUE);
  }, [selectedSubjectId, subjectOptions, viewMode]);

  useEffect(() => {
    const session = localStorage.getItem("stg_session");
    if (!session) {
      router.replace("/login");
      return;
    }

    const parsed = JSON.parse(session);
    const role = String(parsed.role ?? "").toLowerCase().trim();
    const nextTeacherId = toId(parsed.user_id ?? parsed.userId ?? parsed.id);
    const allowedRoles = new Set(["teacher", "class teacher", "subject teacher"]);

    if (parsed.userType !== "teacher" || !allowedRoles.has(role)) {
      toast.error("Anda tidak dibenarkan akses laporan");
      router.replace("/teacher/dashboard");
      return;
    }

    setSessionRole(role);
    setTeacherId(nextTeacherId);
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function checkClassTeacher() {
      if (!teacherId) return;
      if (sessionRole === "subject teacher") {
        setIsClassTeacher(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/teacher/class-teacher?teacher_id=${encodeURIComponent(teacherId)}`,
          { cache: "no-store" }
        );
        if (cancelled) return;
        setIsClassTeacher(res.ok);
      } catch {
        if (!cancelled) setIsClassTeacher(false);
      }
    }

    checkClassTeacher();
    return () => {
      cancelled = true;
    };
  }, [teacherId, sessionRole]);

  useEffect(() => {
    let cancelled = false;

    async function loadAssignments() {
      if (!teacherId) return;
      try {
        const res = await fetch(
          `/api/teacher/assignments?teacher_id=${encodeURIComponent(teacherId)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        const list: TeacherAssignment[] = Array.isArray(json?.data) ? json.data : [];
        if (cancelled) return;
        setAssignments(list);
      } catch {
        if (cancelled) return;
        setAssignments([]);
        setSelectedAssignmentId("");
      }
    }

    loadAssignments();
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

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

  const fetchSubjectSummary = useCallback(async (assignment: TeacherAssignment) => {
    const res = await fetch(
      `/api/teacher/class-summary?teacher_id=${encodeURIComponent(teacherId)}&class_id=${encodeURIComponent(assignment.class_id)}&subject_id=${encodeURIComponent(assignment.subject_id)}&exam_id=${encodeURIComponent(selectedExamId)}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.message || "Gagal memuatkan analitik subjek");
    }
    return { ...(json as SubjectClassSummary), assignment };
  }, [selectedExamId, teacherId]);

  useEffect(() => {
    async function loadReport() {
      if (!teacherId || !selectedExamId) return;
      if (isClassTeacher == null) return;

      setIsLoading(true);
      setPageError("");
      try {
        if (isClassTeacher) {
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

          setSubjectSummary(null);
          setSubjectSummaries([]);
          setReport({
            class: json?.class ?? { id: "", name: "", grade: null },
            exam: json?.exam ?? { id: selectedExamId, name: "", academic_year: "" },
            students: Array.isArray(json?.students) ? json.students : [],
          });
        } else {
          const assignmentsToLoad =
            selectedAssignmentId === ALL_CLASSES_VALUE
              ? filteredAssignments
              : filteredAssignments.filter((a) => a.class_id === selectedAssignmentId);

          if (assignmentsToLoad.length === 0) {
            setReport(null);
            setSubjectSummary(null);
            setSubjectSummaries([]);
            return;
          }

          const assignment = assignmentsToLoad[0];
          if (!assignment?.class_id || !assignment?.subject_id) {
            setReport(null);
            setSubjectSummary(null);
            setSubjectSummaries([]);
            return;
          }

          const summaries = await Promise.all(assignmentsToLoad.map(fetchSubjectSummary));

          setReport(null);
          setSubjectSummary(summaries.length === 1 ? summaries[0] : null);
          setSubjectSummaries(summaries);
        }
      } catch {
        setReport(null);
        setSubjectSummary(null);
        setSubjectSummaries([]);
        setPageError(isClassTeacher ? "Gagal memuatkan data laporan" : "Gagal memuatkan analitik subjek");
      } finally {
        setIsLoading(false);
      }
    }

    loadReport();
  }, [teacherId, selectedExamId, isClassTeacher, assignments, selectedAssignmentId, filteredAssignments, fetchSubjectSummary]);

  const selectedAssignment = useMemo(() => {
    return filteredAssignments.find((a) => a.class_id === selectedAssignmentId) ?? null;
  }, [filteredAssignments, selectedAssignmentId]);

  const summary = useMemo(() => {
    if (isClassTeacher) {
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
        totals: null as SubjectClassSummary["totals"] | null,
      };
    }

    const activeSubjectSummaries =
      subjectSummaries.length > 0
        ? subjectSummaries
        : subjectSummary && selectedAssignment
          ? [{ ...subjectSummary, assignment: selectedAssignment }]
          : [];
    const aggregateTotals = activeSubjectSummaries.reduce(
      (acc, item) => {
        const totals = item.totals;
        acc.students += totals.students;
        acc.results += totals.results;
        acc.submitted += totals.submitted;
        acc.omr_scanned += totals.omr_scanned ?? 0;
        acc.approved += totals.approved;
        acc.pending += totals.pending;
        acc.rejected += totals.rejected;
        acc.totalMarks += totals.average_total * totals.results;
        return acc;
      },
      {
        students: 0,
        results: 0,
        submitted: 0,
        omr_scanned: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        totalMarks: 0,
      }
    );
    const gradeMap = new Map<string, number>();
    for (const item of activeSubjectSummaries) {
      for (const row of item.grades ?? []) {
        gradeMap.set(row.grade, (gradeMap.get(row.grade) ?? 0) + row.value);
      }
    }
    const totals =
      activeSubjectSummaries.length > 0
        ? {
            students: aggregateTotals.students,
            results: aggregateTotals.results,
            submitted: aggregateTotals.submitted,
            omr_scanned: aggregateTotals.omr_scanned,
            approved: aggregateTotals.approved,
            pending: aggregateTotals.pending,
            rejected: aggregateTotals.rejected,
            average_total: aggregateTotals.results ? aggregateTotals.totalMarks / aggregateTotals.results : 0,
          }
        : null;
    return {
      totalStudents: totals?.students ?? 0,
      average: totals?.average_total ?? 0,
      topStudent: null,
      commentCount: 0,
      gradeDistribution:
        activeSubjectSummaries.length > 0
          ? Array.from(gradeMap.entries()).map(([grade, value]) => ({ grade, value }))
          : [],
      chartRows: [] as Array<{ name: string; shortName: string; average_mark: number }>,
      totals,
    };
  }, [isClassTeacher, report, selectedAssignment, subjectSummaries, subjectSummary]);

  const reportClassLabel = report
    ? formatClassLabel(report.class.grade, report.class.name)
    : "";

  const gradeSummaryRows = useMemo(() => {
    const countByGrade = new Map(
      summary.gradeDistribution.map((row) => [String(row.grade).toUpperCase(), row.value]),
    );
    return gradeDisplayOrder.map((grade) => ({
      grade,
      value: countByGrade.get(grade) ?? 0,
      color: gradeChartColors[grade],
    }));
  }, [summary.gradeDistribution]);

  const subjectComparisonRows = useMemo(() => {
    return subjectSummaries.map((item) => ({
      name: `${formatClassLabel(item.assignment.grade, item.assignment.class_name)} • ${item.assignment.subject_name}`,
      shortName: formatClassLabel(item.assignment.grade, item.assignment.class_name),
      subjectName: item.assignment.subject_name,
      students: item.totals.students,
      results: item.totals.results,
      average_total: Number(item.totals.average_total ?? 0),
    }));
  }, [subjectSummaries]);

  const subjectTopStudents = useMemo(() => {
    const rows: SubjectStudentDisplay[] = subjectSummaries.flatMap((item) =>
      (item.top_students ?? []).map((student) => ({
        ...student,
        class_name: item.assignment.class_name,
        class_grade: item.assignment.grade,
        class_label: formatClassLabel(item.assignment.grade, item.assignment.class_name),
        subject_name: item.assignment.subject_name,
      }))
    );
    return rows
      .filter((row) => String(row.status ?? "").toLowerCase() === "approved")
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [subjectSummaries]);
  const shouldShowCombinedSubjectRows = isAllClassesSelected || subjectSummaries.length > 1;

  const displayedTopStudents = useMemo<SubjectStudentDisplay[]>(() => {
    if (shouldShowCombinedSubjectRows) return subjectTopStudents;
    return (subjectSummary?.top_students ?? []).map((student) => ({
      ...student,
      class_name: selectedAssignment?.class_name,
      class_grade: selectedAssignment?.grade,
      class_label: selectedAssignment ? formatClassLabel(selectedAssignment.grade, selectedAssignment.class_name) : undefined,
      subject_name: selectedAssignment?.subject_name,
    })).filter((row) => String(row.status ?? "").toLowerCase() === "approved");
  }, [selectedAssignment, shouldShowCombinedSubjectRows, subjectSummary, subjectTopStudents]);

  const subjectStudentRows = useMemo<SubjectStudentDisplay[]>(() => {
    if (!shouldShowCombinedSubjectRows) {
      return (subjectSummary?.student_results ?? []).map((student) => ({
        ...student,
        class_name: selectedAssignment?.class_name,
        class_grade: selectedAssignment?.grade,
        class_label: selectedAssignment ? formatClassLabel(selectedAssignment.grade, selectedAssignment.class_name) : undefined,
        subject_name: selectedAssignment?.subject_name,
      }));
    }
    return subjectSummaries.flatMap((item) =>
      (item.student_results ?? []).map((student) => ({
        ...student,
        class_name: item.assignment.class_name,
        class_grade: item.assignment.grade,
        class_label: formatClassLabel(item.assignment.grade, item.assignment.class_name),
        subject_name: item.assignment.subject_name,
      }))
    );
  }, [selectedAssignment, shouldShowCombinedSubjectRows, subjectSummaries, subjectSummary]);

  const subjectWeakStudents = useMemo<SubjectStudentDisplay[]>(() => {
    return subjectStudentRows
      .filter((row) => Number.isFinite(Number(row.total)))
      .filter((row) => String(row.status ?? "").toLowerCase() === "approved")
      .slice()
      .sort((a, b) => Number(a.total ?? 0) - Number(b.total ?? 0))
      .slice(0, 3);
  }, [subjectStudentRows]);

  const selectedSubjectLabel = useMemo(() => {
    const taughtSubjectLabel =
      subjectOptions.length === 0
        ? "Subjek"
        : subjectOptions.length <= 2
          ? subjectOptions.map((subject) => subject.name).join(", ")
          : `${subjectOptions.slice(0, 2).map((subject) => subject.name).join(", ")} +${subjectOptions.length - 2} lagi`;
    if (selectedSubjectId === ALL_SUBJECTS_VALUE) {
      return taughtSubjectLabel;
    }
    return subjectOptions.find((subject) => subject.id === selectedSubjectId)?.name ?? "Subjek";
  }, [selectedSubjectId, subjectOptions]);

  async function refreshReport() {
    if (!teacherId || !selectedExamId) return;
    if (isClassTeacher == null) return;
    setIsLoading(true);
    setPageError("");
    try {
      if (isClassTeacher) {
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
        setSubjectSummary(null);
        setSubjectSummaries([]);
        setReport({
          class: json?.class ?? { id: "", name: "", grade: null },
          exam: json?.exam ?? { id: selectedExamId, name: "", academic_year: "" },
          students: Array.isArray(json?.students) ? json.students : [],
        });
      } else {
        const assignmentsToLoad =
          selectedAssignmentId === ALL_CLASSES_VALUE
            ? filteredAssignments
            : filteredAssignments.filter((a) => a.class_id === selectedAssignmentId);

        if (assignmentsToLoad.length === 0) {
          setReport(null);
          setSubjectSummary(null);
          setSubjectSummaries([]);
          return;
        }

        const assignment = assignmentsToLoad[0];
        if (!assignment?.class_id || !assignment?.subject_id) {
          setReport(null);
          setSubjectSummary(null);
          setSubjectSummaries([]);
          return;
        }

        const summaries = await Promise.all(assignmentsToLoad.map(fetchSubjectSummary));
        setReport(null);
        setSubjectSummary(summaries.length === 1 ? summaries[0] : null);
        setSubjectSummaries(summaries);
      }
    } catch {
      setReport(null);
      setSubjectSummary(null);
      setSubjectSummaries([]);
      setPageError(isClassTeacher ? "Gagal memuatkan data laporan" : "Gagal memuatkan analitik subjek");
    } finally {
      setIsLoading(false);
    }
  }

  async function generateReportCards() {
    if (!teacherId || !selectedExamId) return;
    if (!isClassTeacher) {
      toast.error("Hanya Guru Kelas boleh jana kad laporan");
      return;
    }
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
        students: Array.isArray(json?.students)
          ? json.students.map((student: StudentReport) => ({ ...student, has_report_card: true }))
          : [],
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
    if (!isClassTeacher) {
      toast.error("Hanya Guru Kelas boleh jana komen AI");
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
                  ? {
                      ...item,
                      comment: String(json?.comment ?? item.comment),
                      average_mark: Number(json?.average_mark ?? item.average_mark),
                      position: json?.class_position ?? item.position,
                      has_report_card: true,
                    }
                  : item
              ),
            }
          : prev
      );

      if (studentSheetStudent?.student_id === student.student_id) {
        const next = String(json?.comment ?? studentSheetStudent.comment ?? "").trim();
        setStudentSheetStudent({
          ...studentSheetStudent,
          comment: next,
          average_mark: Number(json?.average_mark ?? studentSheetStudent.average_mark),
          position: json?.class_position ?? studentSheetStudent.position,
          has_report_card: true,
        });
        setStudentSheetComment(next);
      }

      toast.success(`Ulasan AI dijana untuk ${student.student_name}`);
    } catch {
      toast.error("Gagal jana komen AI");
    } finally {
      setCommentLoadingByStudent((prev) => ({ ...prev, [student.student_id]: false }));
    }
  }

  async function saveManualComment(student: StudentReport, nextComment: string) {
    if (!teacherId || !selectedExamId || !report?.class.id) return;
    if (!isClassTeacher) {
      toast.error("Hanya Guru Kelas boleh kemaskini komen");
      return;
    }

    const trimmed = nextComment.trim();
    if (!trimmed) {
      toast.error("Ulasan manual tidak boleh kosong");
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
                item.student_id === student.student_id
                  ? {
                      ...item,
                      comment: trimmed,
                      average_mark: Number(json?.average_mark ?? item.average_mark),
                      position: json?.class_position ?? item.position,
                      has_report_card: true,
                    }
                  : item
              ),
            }
          : prev
      );

      if (studentSheetStudent?.student_id === student.student_id) {
        setStudentSheetStudent({
          ...studentSheetStudent,
          comment: trimmed,
          average_mark: Number(json?.average_mark ?? studentSheetStudent.average_mark),
          position: json?.class_position ?? studentSheetStudent.position,
          has_report_card: true,
        });
        setStudentSheetComment(trimmed);
      }
      toast.success(`Ulasan manual disimpan untuk ${student.student_name}`);
    } catch {
      toast.error("Gagal simpan komen manual");
    } finally {
      setCommentLoadingByStudent((prev) => ({ ...prev, [student.student_id]: false }));
    }
  }

  function openStudentSheet(student: StudentReport) {
    setStudentSheetStudent(student);
    setStudentSheetComment(student.comment ?? "");
    setStudentSheetOpen(true);
  }

  function closeStudentSheet() {
    setStudentSheetOpen(false);
    setStudentSheetStudent(null);
    setStudentSheetComment("");
  }

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8">

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-border/40 pb-6">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">Guru</p>
              <h1 className="!text-[36px] font-black leading-tight text-foreground">
                {activeReportPage === "analitik"
                  ? "Laporan Kelas"
                  : viewMode === "class_teacher"
                    ? "Kad Laporan Pelajar"
                    : "Laporan Subjek"}
              </h1>
              <p className="mt-1 font-medium text-muted-foreground">
                {activeReportPage === "analitik"
                  ? "Paparan graf dan analisis prestasi berdasarkan keputusan peperiksaan yang tersedia."
                  : viewMode === "class_teacher"
                    ? "Senarai pelajar kelas untuk semak markah diluluskan, isi ulasan, dan jana kad laporan."
                    : "Senarai markah pelajar berdasarkan kelas dan subjek yang anda ajar."}
              </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {viewMode === "subject_teacher" ? (
              <Button
                variant="outline"
                onClick={refreshReport}
                disabled={!selectedExamId || isLoading}
                className="h-10 border-border shadow-xs"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Muat Semula
              </Button>
            ) : (
              <>
              {viewMode !== "class_teacher" ? (
              <Card className="border-border/50 shadow-sm">
                <CardContent className="flex min-w-[240px] items-center gap-3 p-4">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Peperiksaan</p>
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
            ) : null}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={refreshReport}
                disabled={!selectedExamId || isLoading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Muat Semula
              </Button>
            </div>
              </>
            )}
          </div>
        </div>

        {pageError ? (
          <Card className="border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="flex items-start gap-3 p-4 text-amber-800">
              <AlertCircle className="mt-0.5 h-5 w-5" />
              <div className="space-y-2">
                <p className="font-medium">{pageError}</p>
                <p className="text-sm">
                  {viewMode === "class_teacher"
                    ? "Jika data belum wujud, jana kad laporan dahulu selepas semua keputusan peperiksaan diluluskan."
                    : "Pastikan keputusan peperiksaan untuk kelas/subjek ini sudah dibuat dan (jika perlu) diluluskan."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Ringkasan cards untuk subject_teacher dibuang (diminta) */}

        {viewMode === "class_teacher" ? (
          <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
            <CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-[auto_1fr] md:items-end">
              <GraduationCap className="mb-3 h-5 w-5 text-primary md:mb-3" />
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Peperiksaan</div>
                <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                  <SelectTrigger className="h-11 rounded-lg border-border bg-background">
                    <SelectValue placeholder="Pilih peperiksaan" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-border">
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
        ) : null}

        {viewMode === "class_teacher" && activeReportPage === "analitik" ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
            <Card className="overflow-hidden rounded-lg border-border shadow-sm">
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
                    <Bar dataKey="average_mark" name="Purata" fill="var(--color-average_mark)" radius={8} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-lg border-border shadow-sm">
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
        ) : viewMode === "subject_teacher" ? (
          <div className="space-y-8">
            <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
              <CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Tingkatan</div>
                  <Select value={assignmentGradeFilter} onValueChange={setAssignmentGradeFilter}>
                    <SelectTrigger className="h-11 rounded-lg border-border bg-background">
                      <SelectValue placeholder="Pilih tingkatan" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-border">
                      <SelectItem value="default-grade-1">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4" />
                          Tingkatan
                        </div>
                      </SelectItem>
                      {assignmentGradeOptions.map((grade) => (
                        <SelectItem key={grade} value={String(grade)}>
                          Tingkatan {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Subjek</div>
                  <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger className="h-11 rounded-lg border-border bg-background">
                      <SelectValue placeholder="Pilih subjek" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-border">
                      <SelectItem value={ALL_SUBJECTS_VALUE}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {selectedSubjectLabel}
                        </div>
                      </SelectItem>
                      {subjectOptions.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Kelas</div>
                  <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                    <SelectTrigger className="h-11 rounded-lg border-border bg-background">
                      <SelectValue placeholder="Pilih kelas" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-border">
                      {classOptions.length > 1 ? (
                        <SelectItem value={ALL_CLASSES_VALUE}>
                          <div className="flex items-center gap-2">
                            <School className="h-4 w-4" />
                            {allClassesLabel}
                          </div>
                        </SelectItem>
                      ) : null}
                      {classOptions.map((classItem) => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Jenis Peperiksaan</div>
                  <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                    <SelectTrigger className="h-11 rounded-lg border-border bg-background">
                      <SelectValue placeholder="Pilih peperiksaan" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-border">
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
            
            {(activeReportPage === "laporan" || viewMode === "subject_teacher") ? (
              <>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.35fr]">
              <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
                <CardHeader className="border-b border-border px-6 py-5">
                  <CardTitle className="flex items-center gap-2">
                    <ChartPie className="h-5 w-5 text-primary" />
                    Analisis Gred
                  </CardTitle>
                  <CardDescription>Taburan gred pelajar bagi subjek ini</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {summary.gradeDistribution.length > 0 ? (
                    <>
                      <ChartContainer config={chartConfig} className="mx-auto h-[300px] w-full max-w-[360px]">
                        <PieChart>
                          <Pie
                            data={gradeSummaryRows.filter((row) => row.value > 0)}
                            dataKey="value"
                            nameKey="grade"
                            innerRadius={70}
                            outerRadius={120}
                            paddingAngle={2}
                            labelLine
                            label={({ value }) => String(value ?? 0)}
                          >
                            {gradeSummaryRows.filter((row) => row.value > 0).map((entry) => (
                              <Cell key={entry.grade} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ChartContainer>
                      <div className="grid grid-cols-5 gap-2">
                        {gradeSummaryRows.map((item) => (
                          <div
                            key={item.grade}
                            className="rounded-md border border-border bg-background p-3 text-center"
                          >
                            <div
                              className="mx-auto mb-2 h-2 w-9 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <div className="text-sm font-bold text-foreground">{item.grade}</div>
                            <div className="text-sm text-muted-foreground">{item.value}</div>
                          </div>
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

              <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
                <CardHeader className="border-b border-border px-6 py-5">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Prestasi Mengikut Kelas
                  </CardTitle>
                  <CardDescription>
                    Perbandingan purata markah antara kelas yang anda ajar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {subjectComparisonRows.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[360px] w-full">
                      <BarChart accessibilityLayer data={subjectComparisonRows}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="shortName"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                          interval={0}
                          angle={-18}
                          textAnchor="end"
                          height={64}
                        />
                        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tickMargin={10} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="average_total" name="Purata" fill="var(--color-average_total)" radius={8} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                      Tiada data perbandingan untuk dipaparkan.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
                <CardHeader className="border-b border-border px-6 py-5">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Senarai Pelajar Cemerlang
                  </CardTitle>
                  <CardDescription>Top 3 pelajar terbaik bagi subjek ini.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {displayedTopStudents.length > 0 ? (
                    displayedTopStudents.map((row, idx) => (
                      <div key={`${row.student_id}-${idx}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/40">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">#{idx + 1}</Badge>
                            <span className="truncate font-medium">{row.student_name || "Pelajar"}</span>
                          </div>
                          {row.class_label ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {row.class_label}
                            </div>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{formatAverage(row.total)}%</div>
                          <Badge variant="outline" className={gradeColor(row.grade)}>
                            {row.grade || "-"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                      Tiada data pelajar untuk dipaparkan.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
                <CardHeader className="border-b border-border px-6 py-5">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-primary" />
                    Senarai Pelajar Perlu Perhatian
                  </CardTitle>
                  <CardDescription>Top 3 pelajar dengan markah terendah bagi filter semasa.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {subjectWeakStudents.length > 0 ? (
                    subjectWeakStudents.map((row, idx) => (
                      <div key={`${row.student_id}-${idx}-${row.class_label ?? ""}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/40">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">#{idx + 1}</Badge>
                            <span className="truncate font-medium">{row.student_name || "Pelajar"}</span>
                          </div>
                          {row.class_label ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {row.class_label}
                            </div>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-rose-600">{formatAverage(row.total)}%</div>
                          <Badge variant="outline" className={gradeColor(row.grade)}>
                            {row.grade || "-"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                      Tiada data pelajar perlu perhatian untuk dipaparkan.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
              </>
            ) : null}
          </div>
        ) : null}

        {viewMode === "class_teacher" && activeReportPage === "laporan" ? (
          <>
        <Card className="border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Senarai Pelajar
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Klik ikon mata untuk semak markah diluluskan, komen, dan submit kad laporan pelajar
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {report?.exam.name ? (
                  <Badge variant="secondary">
                    {report.exam.name} {report.exam.academic_year ? `• ${report.exam.academic_year}` : ""}
                  </Badge>
                ) : null}
                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-medium">
                  <Filter className="w-3 h-3 mr-1" />
                  {(report?.students ?? []).length} pelajar
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="font-semibold text-foreground py-4 w-16 text-center">
                        #
                      </TableHead>
                      <TableHead className="font-semibold text-foreground py-4 min-w-[240px]">
                        Pelajar
                      </TableHead>
                      <TableHead className="font-semibold text-foreground py-4 text-right pr-6">
                        Tindakan
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-16">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            <p className="font-semibold text-foreground">
                              Memuatkan data laporan...
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (report?.students ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-16">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <div className="p-4 rounded-full bg-muted/50">
                              <FileText className="w-12 h-12 text-muted-foreground/50" />
                            </div>
                            <p className="font-semibold text-foreground">
                              Tiada kad laporan ditemui untuk peperiksaan ini.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      (report?.students ?? [])
                        .slice()
                        .sort((a, b) => a.student_name.localeCompare(b.student_name))
                        .map((student, index) => (
                          <TableRow
                            key={student.student_id}
                            className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group"
                          >
                            <TableCell className="py-4 text-center">
                              {index + 1}
                            </TableCell>
                            <TableCell className="py-4">
                              <button
                                type="button"
                                className="flex items-center gap-3 text-left"
                                onClick={() => openStudentSheet(student)}
                              >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
                                  <span className="font-semibold text-primary text-sm">
                                    {student.student_name.charAt(0)}
                                  </span>
                                </div>
                                <span className="font-semibold hover:text-primary">
                                  {student.student_name}
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="py-4 text-right pr-6">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openStudentSheet(student)}
                                  className="h-8 w-8 text-primary"
                                  title="Lihat markah dan komen"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="default"
                                  onClick={() => setReportCardPreviewStudent(student)}
                                  disabled={!student.has_report_card}
                                  className="h-9 rounded-md px-4 text-sm font-semibold shadow-sm"
                                  title="Kad Laporan"
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Kad Laporan
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog
          open={studentSheetOpen}
          onOpenChange={(open) => {
            if (!open) closeStudentSheet();
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{studentSheetStudent?.student_name ?? "Butiran Pelajar"}</DialogTitle>
              <DialogDescription>
                {studentSheetStudent?.position ? `Kedudukan #${studentSheetStudent.position}` : "Kedudukan: -"} ·{" "}
                {reportClassLabel ? `Kelas: ${reportClassLabel}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto px-4 pb-2">
              <div className="space-y-4">

                <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
                  <CardHeader className="border-b border-border px-6 py-5">
                    <CardTitle className="flex items-center gap-2 text-base font-bold">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                      Keputusan Subjek
                    </CardTitle>
                    <CardDescription>Markah dan gred setiap subjek</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow className="border-b border-border hover:bg-transparent">
                            <TableHead className="w-16 py-4 text-center font-semibold text-foreground">Bil.</TableHead>
                            <TableHead className="py-4 font-semibold text-foreground">Subjek</TableHead>
                            <TableHead className="w-28 py-4 text-center font-semibold text-foreground">Markah</TableHead>
                            <TableHead className="w-28 py-4 text-center font-semibold text-foreground">Gred</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(studentSheetStudent?.subjects ?? []).map((subject, index) => (
                            <TableRow
                              key={`${studentSheetStudent?.student_id ?? "s"}-${subject.subject_id}`}
                              className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
                            >
                              <TableCell className="py-4 text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                              <TableCell className="py-4 font-semibold text-foreground">{subject.name}</TableCell>
                              <TableCell className="py-4 text-center font-semibold">{subject.mark}</TableCell>
                              <TableCell className="py-4 text-center">
                                <Badge variant="outline" className={gradeColor(subject.grade)}>
                                  {subject.grade}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
                  <CardHeader className="border-b border-border px-6 py-5">
                    <CardTitle className="flex items-center gap-2 text-base font-bold">
                      <MessageSquareText className="h-5 w-5 text-primary" />
                      Ulasan Guru Kelas
                    </CardTitle>
                    <CardDescription>Ulasan guru kelas untuk slip keputusan</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 p-6">
                    <Textarea
                      value={studentSheetComment}
                      onChange={(e) => setStudentSheetComment(e.target.value)}
                      placeholder="Tulis ulasan ringkas..."
                    />

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        variant="outline"
                        onClick={() => (studentSheetStudent ? generateAiComment(studentSheetStudent) : null)}
                        disabled={
                          !studentSheetStudent ||
                          commentLoadingByStudent[studentSheetStudent.student_id] ||
                          viewMode !== "class_teacher"
                        }
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {studentSheetStudent && commentLoadingByStudent[studentSheetStudent.student_id]
                          ? "Menjana..."
                          : "Jana Ulasan AI"}
                      </Button>
                      <Button
                        onClick={() =>
                          studentSheetStudent ? saveManualComment(studentSheetStudent, studentSheetComment) : null
                        }
                        disabled={
                          !studentSheetStudent ||
                          !studentSheetComment.trim() ||
                          commentLoadingByStudent[studentSheetStudent.student_id] ||
                          viewMode !== "class_teacher"
                        }
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        {studentSheetStudent && commentLoadingByStudent[studentSheetStudent.student_id]
                          ? "Menjana..."
                          : "Submit Ulasan"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button variant="outline" onClick={closeStudentSheet}>
                Tutup
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(reportCardPreviewStudent)}
          onOpenChange={(open) => {
            if (!open) setReportCardPreviewStudent(null);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Kad Laporan Pelajar
                  </DialogTitle>
                  <DialogDescription>
                    Paparan ini sama dengan slip keputusan yang dilihat oleh pelajar.
                  </DialogDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="h-10 rounded-lg border-border bg-background px-4 font-semibold shadow-xs hover:bg-accent hover:text-accent-foreground"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Eksport
                </Button>
              </div>
            </DialogHeader>

            {reportCardPreviewStudent ? (
              <div className="space-y-4">
                <Card className="border border-border shadow">
                  <CardContent className="space-y-3 p-6 text-center">
                    <Image
                      src="/img/smkp-logo.png"
                      alt="Logo sekolah"
                      width={72}
                      height={72}
                      className="mx-auto h-16 w-16 object-contain"
                    />
                    <div>
                      <h2 className="text-lg font-bold uppercase">SMK Penanti</h2>
                      <p className="font-semibold uppercase">
                        Slip Keputusan {report?.exam.name ? `- ${report.exam.name} ${report.exam.academic_year ?? ""}` : ""}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border shadow">
                  <CardContent className="grid grid-cols-1 gap-4 p-5 text-sm md:grid-cols-2">
                    <div className="space-y-1">
                      <p><b>Nama</b>   : {reportCardPreviewStudent.student_name}</p>
                      <p><b>No. KP</b> : {reportCardPreviewStudent.ic_number || "-"}</p>
                    </div>
                    <div className="space-y-1 md:text-right">
                      <p><b>Kelas</b> : {reportClassLabel || "-"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow className="border-b border-border hover:bg-transparent">
                            <TableHead className="w-16 py-4 text-center font-semibold text-foreground">Bil.</TableHead>
                            <TableHead className="py-4 font-semibold text-foreground">Subjek</TableHead>
                            <TableHead className="w-28 py-4 text-center font-semibold text-foreground">Markah</TableHead>
                            <TableHead className="w-28 py-4 text-center font-semibold text-foreground">Gred</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportCardPreviewStudent.subjects.map((subject, index) => (
                            <TableRow
                              key={`${reportCardPreviewStudent.student_id}-${subject.subject_id}`}
                              className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
                            >
                              <TableCell className="py-4 text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                              <TableCell className="py-4 font-semibold text-foreground">{subject.name}</TableCell>
                              <TableCell className="py-4 text-center font-semibold">{subject.mark}</TableCell>
                              <TableCell className="py-4 text-center">
                                <Badge variant="outline" className={gradeColor(subject.grade)}>
                                  {subject.grade}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border shadow">
                  <CardContent className="grid grid-cols-1 gap-4 p-5 text-sm md:grid-cols-2">
                    <div className="space-y-1">
                      <p><b>Bilangan Mata Pelajaran</b> : {reportCardPreviewStudent.subjects.length}</p>
                      <p>
                        <b>Kedudukan Dalam Kelas</b> :{" "}
                        {reportCardPreviewStudent.position
                          ? `${reportCardPreviewStudent.position}/${reportCardPreviewStudent.class_total_students ?? "-"}`
                          : "-"}
                      </p>
                      <p>
                        <b>Kedudukan Dalam Tingkatan</b> :{" "}
                        {reportCardPreviewStudent.level_position
                          ? `${reportCardPreviewStudent.level_position}/${reportCardPreviewStudent.level_total_students ?? "-"}`
                          : "-"}
                      </p>
                      <p><b>Pencapaian Gred Keseluruhan</b> : {reportCardPreviewStudent.grade_summary || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <p><b>Jumlah Markah</b> : {reportCardPreviewStudent.subjects.reduce((sum, subject) => sum + subject.mark, 0)}</p>
                      <p><b>Peratus</b> : {formatAverage(reportCardPreviewStudent.average_mark)}%</p>
                      <p><b>Gred Purata Pelajar</b> : {formatAverage(reportCardPreviewStudent.average_grade_point ?? 0)}</p>
                      <p><b>Keputusan</b> : {reportCardPreviewStudent.decision || "-"}</p>
                      
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border shadow">
                  <CardContent className="p-5 text-sm">
                    <p><b>Nama Guru Kelas</b> : {reportCardPreviewStudent.class_teacher_name || "-"}</p>
                    <p>
                      <b>Ulasan Guru Kelas</b> :{" "}
                      <span className="italic">
                        {reportCardPreviewStudent.comment || "Ulasan belum diisi."}
                      </span>
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
          </>
        ) : null}
    </div>
  );
}

export default function TeacherReportPage() {
  return <TeacherReportContent activeReportPage="laporan" />;
}
