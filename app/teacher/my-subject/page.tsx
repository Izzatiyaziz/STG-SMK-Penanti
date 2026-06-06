"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Camera, CheckCircle2, ClipboardList, Clock, Download, Eye, Filter, Save, Send, LayoutDashboard } from "lucide-react";
import {
  computeMarkSummary,
  getGradeTemplateForClass,
  type GradeTemplate,
} from "@/lib/marking-template";
import { formatMalaysiaDate, getMalaysiaDateInputValue } from "@/lib/date-utils";

type Session = {
  user_id: string;
  userType: "teacher";
  role: string;
};

type Assignment = {
  id: string;
  subject_id: string;
  subject_name: string;
  class_id: string;
  class_name: string;
  grade: number | null;
};

type Exam = {
  id: string;
  name: string;
  academic_year: string;
  subject_settings?: Record<string, unknown>;
};

type Student = {
  id: string;
  name: string;
  identifier: string;
};

type MarkStatus = {
  totalStudents: number;
  submittedCount: number;
  isComplete: boolean;
  approval: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    status: "none" | "pending" | "approved" | "rejected" | "mixed";
  };
};

const EMPTY_MARK_STATUS: MarkStatus = {
  totalStudents: 0,
  submittedCount: 0,
  isComplete: false,
  approval: {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    status: "none",
  },
};

function toIsoDateString(date: Date) {
  return getMalaysiaDateInputValue(date);
}

function formatDeadline(value: string) {
  return value ? formatMalaysiaDate(value) : "-";
}

function toNumber(value: unknown, fallback = 0) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function gradeFromPercentage(total: number) {
  if (total >= 80) return "A";
  if (total >= 65) return "B";
  if (total >= 50) return "C";
  if (total >= 40) return "D";
  return "E";
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function readMarksContext() {
  try {
    const raw = localStorage.getItem("stg_marks_context");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      class_id?: string;
      subject_id?: string;
      exam_id?: string;
    };
    return {
      class_id: String(parsed.class_id ?? "").trim(),
      subject_id: String(parsed.subject_id ?? "").trim(),
      exam_id: String(parsed.exam_id ?? "").trim(),
    };
  } catch {
    return null;
  }
}

export default function SubjectTeacherPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [componentMarksByStudent, setComponentMarksByStudent] = useState<
    Record<string, Record<string, string>>
  >({});
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [markStatus, setMarkStatus] = useState<MarkStatus>(EMPTY_MARK_STATUS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("stg_session");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.userType !== "teacher") return;
      setSession(parsed as Session);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    const role = String(session.role ?? "").toLowerCase().trim();
    if (role !== "subject teacher") {
      toast.error("Anda tidak dibenarkan akses pemarkahan subjek");
      router.replace("/teacher/dashboard");
    }
  }, [router, session]);

  const gradeOptions = useMemo(() => {
    const grades = new Set<number>();
    for (const assignment of assignments) {
      if (typeof assignment.grade === "number") grades.add(assignment.grade);
    }
    return Array.from(grades).sort((a, b) => a - b);
  }, [assignments]);

  const classOptions = useMemo(() => {
    const map = new Map<string, Pick<Assignment, "class_id" | "class_name" | "grade">>();
    for (const assignment of assignments) {
      if (selectedGrade && String(assignment.grade ?? "") !== selectedGrade) continue;
      if (!map.has(assignment.class_id)) {
        map.set(assignment.class_id, {
          class_id: assignment.class_id,
          class_name: assignment.class_name,
          grade: assignment.grade,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      `${a.grade ?? ""} ${a.class_name}`.localeCompare(`${b.grade ?? ""} ${b.class_name}`),
    );
  }, [assignments, selectedGrade]);

  const subjectOptions = useMemo(() => {
    const map = new Map<string, Pick<Assignment, "subject_id" | "subject_name">>();
    for (const assignment of assignments) {
      if (assignment.class_id !== selectedClassId) continue;
      if (!map.has(assignment.subject_id)) {
        map.set(assignment.subject_id, {
          subject_id: assignment.subject_id,
          subject_name: assignment.subject_name,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.subject_name.localeCompare(b.subject_name));
  }, [assignments, selectedClassId]);

  const selectedAssignment = useMemo(
    () =>
      assignments.find(
        (assignment) =>
          assignment.class_id === selectedClassId && assignment.subject_id === selectedSubjectId,
      ) ?? null,
    [assignments, selectedClassId, selectedSubjectId],
  );
  const selectedExam = useMemo(
    () => exams.find((exam) => exam.id === selectedExamId) ?? null,
    [exams, selectedExamId],
  );

  const templateInfo = useMemo(() => {
    if (!selectedAssignment || !selectedExam) {
      return {
        template: null as GradeTemplate | null,
        deadline: "",
      };
    }
    return getGradeTemplateForClass({
      subjectSettings: selectedExam.subject_settings as Record<string, unknown> | undefined,
      subjectId: selectedAssignment.subject_id,
      subjectName: selectedAssignment.subject_name,
      grade: selectedAssignment.grade,
    });
  }, [selectedAssignment, selectedExam]);

  const isLate = useMemo(() => {
    if (!templateInfo.deadline) return false;
    return toIsoDateString(new Date()) > templateInfo.deadline;
  }, [templateInfo.deadline]);

  const isApproved = markStatus.approval.status === "approved";
  const isRejected = markStatus.approval.status === "rejected";
  const isPendingApproval = markStatus.approval.status === "pending";

  const markCompletion = useMemo(() => {
    if (!templateInfo.template) {
      return {
        filled: 0,
        total: students.length,
      };
    }

    const filled = students.filter((student) => {
      return templateInfo.template!.components.every((component) => {
        const value = componentMarksByStudent[student.id]?.[component.key];
        return value !== undefined && String(value).trim() !== "";
      });
    }).length;

    return {
      filled,
      total: students.length,
    };
  }, [componentMarksByStudent, students, templateInfo.template]);

  async function loadAssignmentsAndExams() {
    if (!session) return;
    setLoading(true);
    try {
      const [assignmentRes, examRes] = await Promise.all([
        fetch(`/api/teacher/assignments?teacher_id=${session.user_id}`),
        fetch("/api/admin/exams", { cache: "no-store" }),
      ]);

      const assignmentJson = await assignmentRes.json();
      const examJson = await examRes.json();
      const assignmentList = Array.isArray(assignmentJson?.data) ? (assignmentJson.data as Assignment[]) : [];
      const examList = Array.isArray(examJson) ? (examJson as Exam[]) : [];
      const marksContext = readMarksContext();

      setAssignments(assignmentList);
      setExams(examList);

      if (marksContext?.exam_id && examList.some((exam) => exam.id === marksContext.exam_id)) {
        setSelectedExamId(marksContext.exam_id);
      } else if (examList.length > 0) {
        setSelectedExamId((current) => current || examList[0].id);
      }

      if (marksContext?.class_id && marksContext?.subject_id) {
        const matched = assignmentList.find(
          (assignment) =>
            assignment.class_id === marksContext.class_id &&
            assignment.subject_id === marksContext.subject_id,
        );
        if (matched) {
          setSelectedGrade(matched.grade == null ? "" : String(matched.grade));
          setSelectedClassId(matched.class_id);
          setSelectedSubjectId(matched.subject_id);
        } else if (assignmentList.length > 0) {
          setSelectedGrade((current) => current || (assignmentList[0].grade == null ? "" : String(assignmentList[0].grade)));
          setSelectedClassId((current) => current || assignmentList[0].class_id);
          setSelectedSubjectId((current) => current || assignmentList[0].subject_id);
        }
      } else if (assignmentList.length > 0) {
        setSelectedGrade((current) => current || (assignmentList[0].grade == null ? "" : String(assignmentList[0].grade)));
        setSelectedClassId((current) => current || assignmentList[0].class_id);
        setSelectedSubjectId((current) => current || assignmentList[0].subject_id);
      }
    } catch {
      toast.error("Gagal memuatkan data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    loadAssignmentsAndExams();
  }, [session]);

  useEffect(() => {
    if (!selectedGrade) return;
    if (classOptions.length === 0) {
      setSelectedClassId("");
      return;
    }
    if (!classOptions.some((classOption) => classOption.class_id === selectedClassId)) {
      setSelectedClassId(classOptions[0].class_id);
    }
  }, [classOptions, selectedClassId, selectedGrade]);

  useEffect(() => {
    if (!selectedClassId) return;
    if (subjectOptions.length === 0) {
      setSelectedSubjectId("");
      return;
    }
    if (!subjectOptions.some((subject) => subject.subject_id === selectedSubjectId)) {
      setSelectedSubjectId(subjectOptions[0].subject_id);
    }
  }, [selectedClassId, selectedSubjectId, subjectOptions]);

  async function loadStudents() {
    if (!selectedAssignment) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/students?class_id=${selectedAssignment.class_id}`);
      const json = await res.json();
      setStudents(Array.isArray(json?.data) ? (json.data as Student[]) : []);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadComponentMarks() {
    if (!selectedAssignment || !selectedExamId || !templateInfo.template) return;
    try {
      const [componentRes, statusRes] = await Promise.all([
        fetch(
          `/api/teacher/component-marks?class_id=${selectedAssignment.class_id}&subject_id=${selectedAssignment.subject_id}&exam_id=${selectedExamId}`,
          { cache: "no-store" },
        ),
        session
          ? fetch(
              `/api/teacher/marks/status?teacher_id=${session.user_id}&class_id=${selectedAssignment.class_id}&subject_id=${selectedAssignment.subject_id}&exam_id=${selectedExamId}`,
              { cache: "no-store" },
            )
          : Promise.resolve(null),
      ]);
      const componentJson = await componentRes.json();
      const statusJson = statusRes ? await statusRes.json() : null;

      const next: Record<string, Record<string, string>> = {};
      for (const student of students) {
        next[student.id] = {};
        for (const component of templateInfo.template.components) {
          const rawMark =
            componentJson?.data?.[student.id]?.[component.key]?.mark ??
            "";
          next[student.id][component.key] = rawMark === "" ? "" : String(rawMark);
        }
      }
      setComponentMarksByStudent(next);
      setMarkStatus(statusJson?.approval ? (statusJson as MarkStatus) : EMPTY_MARK_STATUS);
    } catch {
      setComponentMarksByStudent({});
      setMarkStatus(EMPTY_MARK_STATUS);
    }
  }

  useEffect(() => {
    if (!selectedAssignment) return;
    loadStudents();
  }, [selectedAssignment]);

  useEffect(() => {
    if (!selectedAssignment || !selectedExamId || !templateInfo.template || students.length === 0) return;
    loadComponentMarks();
  }, [selectedAssignment, selectedExamId, templateInfo.template, students.length]);

  function updateStudentComponent(
    studentId: string,
    componentKey: string,
    value: string,
    maxMark: number,
    componentLabel: string,
  ) {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;

    const numericValue = toNumber(value, 0);
    if (value !== "" && numericValue > maxMark) {
      toast.error(`Markah ${componentLabel} mesti ${maxMark} ke bawah`);
      return;
    }

    setComponentMarksByStudent((current) => ({
      ...current,
      [studentId]: {
        ...(current[studentId] ?? {}),
        [componentKey]: value,
      },
    }));
  }

  async function saveMarks(mode: "draft" | "submit") {
    if (!session || !selectedAssignment || !selectedExamId || !templateInfo.template) return;
    if (mode === "submit" && isLate) {
      toast.error(`Tarikh akhir telah tamat (${formatDeadline(templateInfo.deadline)})`);
      return;
    }
    const invalidEntry = students
      .flatMap((student) =>
        templateInfo.template!.components.map((component) => ({
          student,
          component,
          value: toNumber(componentMarksByStudent[student.id]?.[component.key] ?? 0, 0),
        })),
      )
      .find((entry) => entry.value < 0 || entry.value > entry.component.max_mark);

    if (invalidEntry) {
      toast.error(
        `Markah ${invalidEntry.component.label} untuk ${invalidEntry.student.name} mesti 0-${invalidEntry.component.max_mark}`,
      );
      return;
    }

    if (mode === "draft") setDraftLoading(true);
    else setSubmitLoading(true);
    const toastId = toast.loading(mode === "draft" ? "Menyimpan draf..." : "Menghantar markah...");
    try {
      const marks = students
        .filter((student) => {
          if (mode === "submit") return true;
          return templateInfo.template!.components.some((component) => {
            const value = componentMarksByStudent[student.id]?.[component.key];
            return value !== undefined && String(value).trim() !== "";
          });
        })
        .map((student) => ({
          student_id: student.id,
          components: Object.fromEntries(
            templateInfo.template!.components.map((component) => [
              component.key,
              toNumber(componentMarksByStudent[student.id]?.[component.key] ?? 0, 0),
            ]),
          ),
        }));

      const res = await fetch("/api/teacher/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_id: session.user_id,
          class_id: selectedAssignment.class_id,
          subject_id: selectedAssignment.subject_id,
          exam_id: selectedExamId,
          save_as_draft: mode === "draft",
          marks,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.message ?? (mode === "draft" ? "Gagal menyimpan draf" : "Gagal menghantar markah"), { id: toastId });
        return;
      }

      toast.success(mode === "draft" ? "Draf markah disimpan" : "Markah dihantar untuk semakan ketua panitia", { id: toastId });
      await loadComponentMarks();
    } catch {
      toast.error("Ralat sistem", { id: toastId });
    } finally {
      if (mode === "draft") setDraftLoading(false);
      else setSubmitLoading(false);
    }
  }

  function openOmrPage(studentId?: string) {
    if (!selectedAssignment || !selectedExamId) return;
    localStorage.setItem(
      "stg_marks_context",
      JSON.stringify({
        class_id: selectedAssignment.class_id,
        subject_id: selectedAssignment.subject_id,
        exam_id: selectedExamId,
        student_id: studentId ?? "",
      }),
    );
    router.push("/teacher/omr");
  }

  async function openOmrResult(studentId: string) {
    if (!selectedAssignment || !selectedExamId) return;

    const params = new URLSearchParams({
      student_id: studentId,
      class_id: selectedAssignment.class_id,
      subject_id: selectedAssignment.subject_id,
      exam_id: selectedExamId,
    });

    try {
      const res = await fetch(`/api/teacher/omr/result?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json?.message ?? "Gagal membuka keputusan OMR");
        return;
      }

      if (json?.source !== "omr") {
        toast.message(json?.message ?? "Guru ini mengisi markah objektif secara manual.");
        return;
      }

      sessionStorage.setItem("stg_omr_last_result", JSON.stringify(json));
      router.push("/teacher/omr/results");
    } catch {
      toast.error("Ralat membuka keputusan OMR");
    }
  }

  function exportApprovedMarks() {
    if (!isApproved || !selectedAssignment || !selectedExam || !templateInfo.template) return;

    const headers = [
      "Bil",
      "Nama Pelajar",
      ...templateInfo.template.components.map((component) => component.label),
      "Jumlah Markah",
      "Peratus",
      "Gred",
    ];
    const rows = students.map((student, index) => {
      const marksByKey = Object.fromEntries(
        templateInfo.template!.components.map((component) => [
          component.key,
          toNumber(componentMarksByStudent[student.id]?.[component.key] ?? 0, 0),
        ]),
      );
      const summary = computeMarkSummary(templateInfo.template!, marksByKey);
      return [
        index + 1,
        student.name,
        ...templateInfo.template!.components.map((component) => marksByKey[component.key] ?? 0),
        `${summary.raw_total}/${summary.total_max}`,
        `${summary.percentage}%`,
        gradeFromPercentage(summary.percentage),
      ];
    });

    const title = [
      "Senarai Markah Diluluskan",
      selectedExam.name,
      selectedAssignment.grade ? `Tingkatan ${selectedAssignment.grade}` : "",
      selectedAssignment.class_name,
      selectedAssignment.subject_name,
    ]
      .filter(Boolean)
      .join(" - ");
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      toast.error("Pop-up disekat. Sila benarkan pop-up untuk eksport PDF.");
      return;
    }

    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            @page { size: A4; margin: 16mm; }
            body { font-family: Arial, sans-serif; color: #0f172a; }
            h1 { font-size: 20px; margin: 0 0 6px; }
            .meta { color: #475569; font-size: 12px; margin-bottom: 18px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; }
            th { background: #f1f5f9; font-weight: 700; }
            td.name, th.name { text-align: left; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <div class="meta">Dieksport pada ${escapeHtml(formatMalaysiaDate(new Date()))}</div>
          <table>
            <thead>
              <tr>${headers.map((header, index) => `<th class="${index === 1 ? "name" : ""}">${escapeHtml(header)}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows
                .map((row) => `<tr>${row.map((cell, index) => `<td class="${index === 1 ? "name" : ""}">${escapeHtml(cell)}</td>`).join("")}</tr>`)
                .join("")}
            </tbody>
          </table>
        </body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
              <LayoutDashboard className="w-7 h-7 text-primary" />
            </div>
            <div>
               <h1 className="text-2xl font-bold text-foreground tracking-tight">
                 Pemarkahan Markah
               </h1>
               <p className="text-muted-foreground font-medium mt-1">
                 Mengurus markah pelajar untuk peperiksaan mengikut subjek dan kelas.
               </p>
         </div>
       </div>
    </div>

        <Card className="border border-border/50 shadow-lg">
          <CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Peperiksaan</div>
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih peperiksaan" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name} ({exam.academic_year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Tingkatan</div>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tingkatan" />
                </SelectTrigger>
                <SelectContent>
                  {gradeOptions.map((grade) => (
                    <SelectItem key={grade} value={String(grade)}>
                      Tingkatan {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Kelas</div>
              <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={!selectedGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {classOptions.map((classOption) => (
                    <SelectItem key={classOption.class_id} value={classOption.class_id}>
                      {classOption.grade ?? "-"} {classOption.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Subjek</div>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!selectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih subjek" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((subjectOption) => (
                    <SelectItem key={subjectOption.subject_id} value={subjectOption.subject_id}>
                      {subjectOption.subject_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLate && (
          <Card className="border border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <div className="font-semibold text-destructive">Lewat hantar markah</div>
                <div className="text-sm text-muted-foreground">
                  Tarikh akhir untuk subjek ini: <span className="font-medium text-foreground">{formatDeadline(templateInfo.deadline)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {templateInfo.template && markStatus.approval.status !== "none" && (
          <Card
            className={
              isApproved
                ? "border border-emerald-300 bg-emerald-50"
                : isRejected
                  ? "border border-destructive/30 bg-destructive/5"
                  : "border border-violet-200 bg-violet-50"
            }
          >
            <CardContent className="flex items-start gap-3 p-4">
              {isApproved ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
              ) : isRejected ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
              ) : (
                <Clock className="mt-0.5 h-5 w-5 text-violet-700" />
              )}
              <div>
                <div
                  className={
                    isApproved
                      ? "font-semibold text-emerald-800"
                      : isRejected
                        ? "font-semibold text-destructive"
                        : "font-semibold text-violet-800"
                  }
                >
                  {isApproved
                    ? "Markah telah diluluskan"
                    : isRejected
                      ? "Markah ditolak oleh Panitia Subjek"
                      : "Markah sedang menunggu kelulusan"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isApproved
                    ? "Guru Subjek boleh semak markah yang telah diluluskan sebelum kad laporan pelajar dijana."
                    : isRejected
                      ? "Semak semula markah pelajar yang kosong, tersilap, atau terlepas pandang. Kemas kini markah dan hantar semula kepada Panitia Subjek."
                      : "Markah telah dihantar dan sedang disemak oleh Panitia Subjek."}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {templateInfo.template && (
          <Card className="overflow-hidden border-border bg-card shadow-lg">
            <CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Senarai Pelajar 
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                   Kelas: {selectedAssignment?.grade ?? "-"} {selectedAssignment?.class_name ?? "-"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <Badge
                    variant="outline"
                    className={
                      isApproved
                        ? "w-fit border-emerald-300 bg-emerald-50 text-emerald-700"
                        : isRejected
                          ? "w-fit border-destructive/30 bg-destructive/5 text-destructive"
                          : isPendingApproval
                            ? "w-fit border-violet-200 bg-violet-100 text-violet-700"
                            : "w-fit border-yellow-200 bg-yellow-100 text-yellow-700"
                    }
                  >
                    {isApproved
                      ? "Diluluskan"
                      : isRejected
                        ? "Ditolak"
                        : isPendingApproval
                          ? "Menunggu Kelulusan"
                          : markStatus.approval.status === "mixed"
                            ? "Status Bercampur"
                            : "Draf"}
                  </Badge>
                  <Badge variant="outline" className="w-fit border-primary/30 bg-primary/5 text-primary font-medium">
                    <Filter className="mr-1 h-3 w-3" />
                    {markCompletion.filled}/{markCompletion.total} lengkap
                  </Badge>
                  {isApproved && (
                    <Button type="button" variant="outline" size="sm" onClick={exportApprovedMarks}>
                      <Download className="mr-2 h-4 w-4" />
                      Eksport
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="w-16 py-4 text-center font-semibold text-foreground">#</TableHead>
                      <TableHead className="py-4 font-semibold text-foreground">Nama Pelajar</TableHead>
                      {templateInfo.template.components.map((component) => (
                        <TableHead key={component.key} className="py-4 text-center font-semibold text-foreground">
                          {component.label}
                        </TableHead>
                      ))}
                      <TableHead className="py-4 text-center font-semibold text-foreground">Jumlah Markah</TableHead>
                      <TableHead className="py-4 text-center font-semibold text-foreground">Peratus</TableHead>
                      <TableHead className="py-4 text-center font-semibold text-foreground">Gred</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student, index) => {
                      const marksByKey = Object.fromEntries(
                        templateInfo.template!.components.map((component) => [
                          component.key,
                          toNumber(componentMarksByStudent[student.id]?.[component.key] ?? 0, 0),
                        ]),
                      );
                      const summary = computeMarkSummary(templateInfo.template!, marksByKey);

                      return (
                        <TableRow key={student.id} className="border-b border-border transition-colors hover:bg-muted/30">
                          <TableCell className="py-4 text-center text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="py-4 font-medium">{student.name}</TableCell>
                          {templateInfo.template!.components.map((component) => (
                            <TableCell key={component.key} className="py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={component.max_mark}
                                  disabled={isApproved}
                                  className="h-9 w-24 text-center"
                                  value={componentMarksByStudent[student.id]?.[component.key] ?? ""}
                                  onChange={(event) =>
                                    updateStudentComponent(
                                      student.id,
                                      component.key,
                                      event.target.value,
                                      component.max_mark,
                                      component.label,
                                    )
                                  }
                                  onKeyDown={(event) => {
                                    if (["e", "E", "+", "-"].includes(event.key)) event.preventDefault();
                                  }}
                                  placeholder={`0-${component.max_mark}`}
                                />
                                {component.type === "omr" && (
                                  <>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      disabled={isApproved}
                                      className="h-8 w-8 border-emerald-500 text-emerald-600"
                                      onClick={() => openOmrPage(student.id)}
                                      title="Imbas OMR"
                                      aria-label="Imbas OMR"
                                    >
                                      <Camera className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 border-blue-500 text-blue-600"
                                      onClick={() => openOmrResult(student.id)}
                                      title="Lihat keputusan OMR"
                                      aria-label="Lihat keputusan OMR"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          ))}
                          <TableCell className="py-4 text-center font-medium">
                            {summary.raw_total} / {summary.total_max}
                          </TableCell>
                          <TableCell className="py-4 text-center font-semibold">{summary.percentage}%</TableCell>
                          <TableCell className="py-4 text-center">
                            <Badge variant="outline" className={gradeFromPercentage(summary.percentage) === "E" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
                              {gradeFromPercentage(summary.percentage)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {!loading && students.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={(templateInfo.template.components.length || 0) + 5} className="py-16 text-center text-muted-foreground">
                          Tiada pelajar.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => saveMarks("draft")}
            disabled={draftLoading || submitLoading || isApproved || !selectedAssignment || !selectedExamId || !templateInfo.template}
          >
            <Save className="mr-2 h-4 w-4" />
            {draftLoading ? "Menyimpan..." : "Simpan Draf"}
          </Button>
          <Button
            onClick={() => saveMarks("submit")}
            disabled={submitLoading || draftLoading || isApproved || !selectedAssignment || !selectedExamId || !templateInfo.template}
          >
            <Send className="mr-2 h-4 w-4" />
            {submitLoading ? "Menghantar..." : "Hantar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
