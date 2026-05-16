"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Sparkles,
  FileSpreadsheet,
  FileText,
  RefreshCw,
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

function translateStatus(status: string) {
  switch (String(status ?? "").toLowerCase().trim()) {
    case "approved":
      return "Diluluskan";
    case "pending":
      return "Menunggu";
    case "rejected":
      return "Ditolak";
    case "submitted":
      return "Dihantar";
    case "none":
      return "Tiada";
    case "mixed":
      return "Bercampur";
    default:
      return status || "-";
  }
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

const pieColors = ["#0f766e", "#0284c7", "#d97706", "#ea580c", "#be123c"];
const ALL_CLASSES_VALUE = "__all_classes__";
const ALL_SUBJECTS_VALUE = "__all_subjects__";

export default function TeacherReportPage() {
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

  const isAllClassesSelected = selectedAssignmentId === ALL_CLASSES_VALUE;
  const selectedGradeLabel = useMemo(() => {
    const effective = assignmentGradeFilter === "default-grade-1" ? "1" : assignmentGradeFilter;
    if (effective === "all") return "Semua tingkatan";
    const grade = Number(effective);
    return Number.isFinite(grade) ? `Tingkatan ${grade}` : "tingkatan ini";
  }, [assignmentGradeFilter]);
  const allClassesLabel = selectedGradeLabel === "Semua tingkatan" ? "Semua kelas" : `Semua kelas ${selectedGradeLabel}`;

  useEffect(() => {
    if (viewMode !== "subject_teacher") return;
    if (filteredAssignments.length === 0) {
      if (selectedAssignmentId) setSelectedAssignmentId("");
      return;
    }
    if (selectedAssignmentId === ALL_CLASSES_VALUE && filteredAssignments.length > 1) return;
    if (filteredAssignments.some((assignment) => assignment.id === selectedAssignmentId)) return;
    setSelectedAssignmentId(filteredAssignments.length > 1 ? ALL_CLASSES_VALUE : filteredAssignments[0].id);
  }, [filteredAssignments, selectedAssignmentId, viewMode]);

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
              : assignments.filter((a) => a.id === selectedAssignmentId);

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
          setSubjectSummary(selectedAssignmentId === ALL_CLASSES_VALUE ? null : summaries[0]);
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
    return assignments.find((a) => a.id === selectedAssignmentId) ?? null;
  }, [assignments, selectedAssignmentId]);

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
    return rows.sort((a, b) => b.total - a.total).slice(0, 3);
  }, [subjectSummaries]);

  const displayedTopStudents = useMemo<SubjectStudentDisplay[]>(() => {
    if (isAllClassesSelected) return subjectTopStudents;
    return (subjectSummary?.top_students ?? []).map((student) => ({
      ...student,
      class_name: selectedAssignment?.class_name,
      class_grade: selectedAssignment?.grade,
      class_label: selectedAssignment ? formatClassLabel(selectedAssignment.grade, selectedAssignment.class_name) : undefined,
      subject_name: selectedAssignment?.subject_name,
    }));
  }, [isAllClassesSelected, selectedAssignment, subjectSummary, subjectTopStudents]);

  const subjectStudentRows = useMemo<SubjectStudentDisplay[]>(() => {
    if (!isAllClassesSelected) {
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
  }, [isAllClassesSelected, selectedAssignment, subjectSummaries, subjectSummary]);

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
            : assignments.filter((a) => a.id === selectedAssignmentId);

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
        setSubjectSummary(selectedAssignmentId === ALL_CLASSES_VALUE ? null : summaries[0]);
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
                  ? { ...item, comment: String(json?.comment ?? item.comment) }
                  : item
              ),
            }
          : prev
      );

      if (studentSheetStudent?.student_id === student.student_id) {
        const next = String(json?.comment ?? studentSheetStudent.comment ?? "").trim();
        setStudentSheetStudent({ ...studentSheetStudent, comment: next });
        setStudentSheetComment(next);
      }

      toast.success(`Komen AI dijana untuk ${student.student_name}`);
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

      if (studentSheetStudent?.student_id === student.student_id) {
        setStudentSheetStudent({ ...studentSheetStudent, comment: trimmed });
        setStudentSheetComment(trimmed);
      }
      toast.success(`Komen manual disimpan untuk ${student.student_name}`);
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                {viewMode === "class_teacher" ? "Laporan Kelas" : "Analitik Subjek"}
              </h1>
            </div>
            <p className="max-w-3xl text-muted-foreground">
              {viewMode === "class_teacher"
                ? "Paparan ini menggunakan data sebenar daripada keputusan yang telah diluluskan, kad laporan kelas, dan komen guru. Gunakan ia untuk jana, semak, dan pantau kesiapsediaan laporan peperiksaan."
                : "Paparan ini memaparkan analitik untuk kelas dan subjek yang anda ajar, berdasarkan keputusan peperiksaan yang tersedia."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {false ? (
              <Card className="border-border/50 shadow-sm w-full">
                <CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-4">
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
                    <div className="text-sm font-medium text-muted-foreground">Kelas</div>
                    <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                      <SelectTrigger className="h-11 rounded-lg border-border bg-background">
                        <SelectValue placeholder="Pilih kelas" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg border-border">
                        {filteredAssignments.length > 1 ? (
                          <SelectItem value={ALL_CLASSES_VALUE}>
                            {allClassesLabel}
                          </SelectItem>
                        ) : null}
                        {filteredAssignments.map((assignment) => (
                          <SelectItem key={assignment.id} value={assignment.id}>
                            {formatClassLabel(assignment.grade, assignment.class_name)}
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

                  <div className="flex items-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAssignmentGradeFilter("default-grade-1");
                        setSelectedAssignmentId("");
                        setSelectedExamId("");
                      }}
                      className="h-11 w-full border-border shadow-xs md:w-auto"
                    >
                      Reset
                    </Button>
                    <Button
                      variant="outline"
                      onClick={refreshReport}
                      disabled={!selectedExamId || isLoading}
                      className="h-11 border-border shadow-xs"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Muat Semula
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {viewMode !== "subject_teacher" ? (
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

            {false ? (
              <Card className="border-border/50 shadow-sm">
                <CardContent className="flex min-w-[260px] items-center gap-3 p-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Kelas & Subjek
                    </p>
                    <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Pilih kelas & subjek" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignments.map((assignment) => (
                          <SelectItem key={assignment.id} value={assignment.id}>
                            {formatClassLabel(assignment.grade, assignment.class_name)}
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
              {viewMode === "class_teacher" ? (
                <Button onClick={generateReportCards} disabled={!selectedExamId || isGenerating}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {isGenerating ? "Menjana..." : "Jana Kad Laporan"}
                </Button>
              ) : null}
            </div>
              </>
            ) : null}
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
          <Card className="border-border/50 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <GraduationCap className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground">Peperiksaan</p>
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

        {viewMode === "class_teacher" ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
            <Card className="overflow-hidden rounded-lg border-border shadow-md">
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

            <Card className="overflow-hidden rounded-lg border-border shadow-md">
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
          <div className="space-y-6">
            <Card className="overflow-hidden rounded-lg border-border shadow-sm">
              <CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
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
                      <SelectItem value={ALL_SUBJECTS_VALUE}>Semua subjek</SelectItem>
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
                      {filteredAssignments.length > 1 ? (
                        <SelectItem value={ALL_CLASSES_VALUE}>
                          {allClassesLabel}
                        </SelectItem>
                      ) : null}
                      {filteredAssignments.map((assignment) => (
                        <SelectItem key={assignment.id} value={assignment.id}>
                          {formatClassLabel(assignment.grade, assignment.class_name)}
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

            {isAllClassesSelected ? (
              <Card className="overflow-hidden rounded-lg border-border shadow-md">
                <CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
                  <CardTitle>Perbandingan Prestasi Kelas</CardTitle>
                  <CardDescription>
                    Purata markah setiap kelas/subjek dalam tingkatan yang dipilih.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {subjectComparisonRows.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[320px] w-full">
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
                        <Bar dataKey="average_total" fill="var(--color-average_total)" radius={8} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                      Tiada data perbandingan untuk dipaparkan.
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="overflow-hidden rounded-lg border-border shadow-md">
                <CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
                  <CardTitle>Taburan Gred Subjek</CardTitle>
                  <CardDescription>Graf taburan gred untuk kelas & subjek yang dipilih.</CardDescription>
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

              <Card className="overflow-hidden rounded-lg border-border shadow-md">
                <CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
                  <CardTitle>Top 3 Pelajar (Subjek)</CardTitle>
                  <CardDescription>3 pelajar terbaik berdasarkan markah subjek yang diajar.</CardDescription>
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
                              {row.class_label} • {row.subject_name}
                            </div>
                          ) : null}
                          <div className="mt-1 text-xs text-muted-foreground">Status: {translateStatus(row.status)}</div>
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
            </div>

            <Card className="border-border/50 shadow-lg">
              <CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
                <CardTitle>Analisis Keputusan Pelajar (Kelas)</CardTitle>
                <CardDescription>
                  Senarai markah pelajar berdasarkan {isAllClassesSelected ? "semua kelas dalam tingkatan" : "kelas & subjek"} yang diajar.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="font-semibold text-foreground py-4">Pelajar</TableHead>
                      <TableHead className="font-semibold text-foreground py-4">Kelas/Subjek</TableHead>
                      <TableHead className="text-center font-semibold text-foreground py-4">Markah</TableHead>
                      <TableHead className="text-center font-semibold text-foreground py-4">Gred</TableHead>
                      <TableHead className="text-center font-semibold text-foreground py-4">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjectStudentRows.length > 0 ? (
                      subjectStudentRows
                        .slice()
                        .sort((a, b) => b.total - a.total)
                        .map((row) => (
                          <TableRow key={`${row.student_id}-${row.class_label ?? row.class_name ?? ""}-${row.subject_name ?? ""}`} className="hover:bg-muted/50 transition-colors border-b border-border last:border-0">
                            <TableCell className="py-4 font-medium">{row.student_name || "Pelajar"}</TableCell>
                            <TableCell className="py-4">
                              {row.class_label ? (
                                <div className="space-y-1">
                                  <div className="font-medium">{row.class_label}</div>
                                  <div className="text-xs text-muted-foreground">{row.subject_name}</div>
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="py-4 text-center font-medium">{formatAverage(row.total)}%</TableCell>
                            <TableCell className="py-4 text-center">
                              <Badge variant="outline" className={gradeColor(row.grade)}>
                                {row.grade || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4 text-center">{translateStatus(row.status)}</TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                          Tiada data keputusan untuk dipaparkan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {viewMode === "class_teacher" ? (
          <>
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
                  <TableHead className="text-right">Butiran</TableHead>
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
                          <Button variant="outline" size="sm" onClick={() => openStudentSheet(student)}>
                            Lihat
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Sheet
          open={studentSheetOpen}
          onOpenChange={(open) => {
            if (!open) closeStudentSheet();
          }}
        >
          <SheetContent side="right" className="w-full sm:max-w-2xl">
            <SheetHeader>
              <SheetTitle>{studentSheetStudent?.student_name ?? "Butiran Pelajar"}</SheetTitle>
              <SheetDescription>
                {studentSheetStudent?.position ? `Kedudukan #${studentSheetStudent.position}` : "Kedudukan: -"} ·{" "}
                {report?.class.name ? `Kelas: ${report.class.name}` : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-auto px-4 pb-2">
              <div className="space-y-4">
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Ringkasan</CardTitle>
                    <CardDescription>Purata dan bilangan subjek</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Purata</div>
                      <div className="font-semibold">
                        {formatAverage(Number(studentSheetStudent?.average_mark ?? 0))}%
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Bil. Subjek</div>
                      <div className="font-semibold">{studentSheetStudent?.subjects.length ?? 0}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Keputusan Subjek</CardTitle>
                    <CardDescription>Markah dan gred setiap subjek</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subjek</TableHead>
                          <TableHead className="text-center">Markah</TableHead>
                          <TableHead className="text-center">Gred</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(studentSheetStudent?.subjects ?? []).map((subject) => (
                          <TableRow
                            key={`${studentSheetStudent?.student_id ?? "s"}-${subject.subject_id}`}
                          >
                            <TableCell className="font-medium">{subject.name}</TableCell>
                            <TableCell className="text-center">{subject.mark}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={gradeColor(subject.grade)}>
                                {subject.grade}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Komen</CardTitle>
                    <CardDescription>Komen guru kelas untuk slip keputusan</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={studentSheetComment}
                      onChange={(e) => setStudentSheetComment(e.target.value)}
                      placeholder="Tulis komen ringkas..."
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
                          : "Jana Komen AI"}
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
                        {studentSheetStudent && commentLoadingByStudent[studentSheetStudent.student_id]
                          ? "Menyimpan..."
                          : "Simpan Komen"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={closeStudentSheet}>
                Tutup
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
          </>
        ) : null}
      </div>
    </div>
  );
}
