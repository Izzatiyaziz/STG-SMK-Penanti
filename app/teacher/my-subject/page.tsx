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
import { AlertTriangle, Camera, CheckCircle2, ClipboardList, Clock, Download, Eye, Filter, MessageSquareWarning, Save, Send, LayoutDashboard } from "lucide-react";
import {
  computeMarkSummary,
  getGradeTemplateForClass,
  type GradeTemplate,
} from "@/lib/marking-template";
import { gradeFromTotal } from "@/lib/grade-utils";
import { formatMalaysiaDate, getMalaysiaDateInputValue } from "@/lib/date-utils";
import { exportTablePDF } from "@/lib/export-pdf";
import { hasOpenMarkingForAssignments, isMarkingClosedForAssignment } from "@/lib/exam-utils";
import { HeaderLastUpdated } from "@/components/header-last-updated";

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
    rejectionReason?: string;
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

function consumeMarksEntryContext() {
  try {
    const raw = sessionStorage.getItem("stg_marks_entry_context");
    sessionStorage.removeItem("stg_marks_entry_context");
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      class_id?: unknown;
      subject_id?: unknown;
      exam_id?: unknown;
      view_only?: unknown;
    };
    return {
      class_id: String(parsed.class_id ?? "").trim(),
      subject_id: String(parsed.subject_id ?? "").trim(),
      exam_id: String(parsed.exam_id ?? "").trim(),
      view_only: parsed.view_only === true,
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
  const [approvedExamIds, setApprovedExamIds] = useState<string[]>([]);
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
  const [viewOnly, setViewOnly] = useState(false);

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
  const filtersComplete = Boolean(
    selectedExamId && selectedGrade && selectedClassId && selectedSubjectId,
  );
  const deadlineExams = useMemo(
    () => exams.filter((exam) => hasOpenMarkingForAssignments(exam, assignments)),
    [assignments, exams],
  );
  const visibleExams = useMemo(
    () =>
      viewOnly
        ? exams.filter((exam) => approvedExamIds.includes(exam.id))
        : deadlineExams,
    [approvedExamIds, deadlineExams, exams, viewOnly],
  );

  useEffect(() => {
    if (!selectedExamId) return;
    if (visibleExams.some((exam) => exam.id === selectedExamId)) return;
    setSelectedExamId("");
  }, [selectedExamId, visibleExams]);

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
  const isReadOnly = viewOnly || Boolean(
    selectedAssignment &&
    selectedExam &&
    isMarkingClosedForAssignment(selectedExam, selectedAssignment),
  );

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
      const [assignmentRes, examRes, approvedExamRes] = await Promise.all([
        fetch(`/api/teacher/assignments?teacher_id=${session.user_id}`),
        fetch("/api/admin/exams", { cache: "no-store" }),
        fetch("/api/teacher/approved-exams", { cache: "no-store" }),
      ]);

      const assignmentJson = await assignmentRes.json();
      const examJson = await examRes.json();
      const approvedExamJson = await approvedExamRes.json();
      const assignmentList = Array.isArray(assignmentJson?.data) ? (assignmentJson.data as Assignment[]) : [];
      const examList = Array.isArray(examJson) ? (examJson as Exam[]) : [];
      const approvedIds = Array.isArray(approvedExamJson?.data)
        ? approvedExamJson.data.map((id: unknown) => String(id))
        : [];
      setAssignments(assignmentList);
      setExams(examList);
      setApprovedExamIds(approvedIds);

      const entryContext = consumeMarksEntryContext();
      if (entryContext) {
        const assignment = assignmentList.find(
          (item) =>
            item.class_id === entryContext.class_id &&
            item.subject_id === entryContext.subject_id,
        );
        const exam = examList.find((item) => item.id === entryContext.exam_id);

        if (
          assignment &&
          exam &&
          ((!entryContext.view_only && hasOpenMarkingForAssignments(exam, [assignment])) ||
            (entryContext.view_only && approvedIds.includes(exam.id)))
        ) {
          setViewOnly(entryContext.view_only);
          setSelectedExamId(exam.id);
          setSelectedGrade(assignment.grade == null ? "" : String(assignment.grade));
          setSelectedClassId(assignment.class_id);
          setSelectedSubjectId(assignment.subject_id);
        }
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
    if (!classOptions.some((classOption) => classOption.class_id === selectedClassId)) setSelectedClassId("");
  }, [classOptions, selectedClassId, selectedGrade]);

  useEffect(() => {
    if (!selectedClassId) return;
    if (subjectOptions.length === 0) {
      setSelectedSubjectId("");
      return;
    }
    if (!subjectOptions.some((subject) => subject.subject_id === selectedSubjectId)) setSelectedSubjectId("");
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
    if (!filtersComplete || !selectedAssignment) return;
    loadStudents();
  }, [filtersComplete, selectedAssignment]);

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
    if (isReadOnly) {
      toast.error("Pemarkahan telah ditutup oleh Panitia Subjek");
      return;
    }
    if (!session || !selectedAssignment || !selectedExamId || !templateInfo.template) return;
    const invalidEntry = students
      .flatMap((student) =>
        templateInfo.template!.components.map((component) => ({
          student,
          component,
          rawValue: componentMarksByStudent[student.id]?.[component.key],
        })),
      )
      .find((entry) => {
        if (entry.rawValue === undefined || String(entry.rawValue).trim() === "") return false;
        const value = toNumber(entry.rawValue, 0);
        return value < 0 || value > entry.component.max_mark;
      });

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
          if (mode === "draft") return true;
          return templateInfo.template!.components.every((component) => {
            const value = componentMarksByStudent[student.id]?.[component.key];
            return value !== undefined && String(value).trim() !== "";
          });
        })
        .map((student) => ({
          student_id: student.id,
          components: Object.fromEntries(
            templateInfo.template!.components.map((component) => [
              component.key,
              componentMarksByStudent[student.id]?.[component.key] === undefined ||
              String(componentMarksByStudent[student.id]?.[component.key]).trim() === ""
                ? null
                : toNumber(componentMarksByStudent[student.id]?.[component.key], 0),
            ]),
          ),
        }));

      if (mode === "submit" && marks.length === 0) {
        toast.error("Tiada markah pelajar yang lengkap untuk dihantar");
        return;
      }

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

      const lateDays = Number(json?.late_days ?? 0);
      toast.success(
        mode === "draft"
          ? "Draf markah disimpan"
          : lateDays > 0
            ? `Markah dihantar lewat ${lateDays} hari untuk semakan Panitia Subjek`
            : "Markah dihantar untuk semakan Panitia Subjek",
        { id: toastId },
      );
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

    localStorage.setItem(
      "stg_marks_context",
      JSON.stringify({
        class_id: selectedAssignment.class_id,
        subject_id: selectedAssignment.subject_id,
        exam_id: selectedExamId,
        student_id: studentId,
      }),
    );
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
      router.push(`/teacher/omr/results?${params.toString()}`);
    } catch {
      toast.error("Ralat membuka keputusan OMR");
    }
  }

  function exportApprovedMarks() {
    if (!isApproved || !selectedAssignment || !selectedExam || !templateInfo.template) return;

    const rows = students.map((student, index) => {
      const marksByKey = Object.fromEntries(
        templateInfo.template!.components.map((component) => [
          component.key,
          toNumber(componentMarksByStudent[student.id]?.[component.key] ?? 0, 0),
        ]),
      );
      const summary = computeMarkSummary(templateInfo.template!, marksByKey);
      return {
        no: index + 1,
        student: student.name,
        ...Object.fromEntries(
          templateInfo.template!.components.map((component) => [
            component.key,
            marksByKey[component.key] ?? "-",
          ]),
        ),
        total: `${summary.raw_total}/${summary.total_max}`,
        percentage: `${summary.percentage}%`,
        grade: gradeFromTotal(summary.percentage, selectedAssignment.grade),
      };
    });

    exportTablePDF({
      title: "Senarai Markah Diluluskan",
      subtitle: `${selectedExam.name} (${selectedExam.academic_year}) | Tingkatan ${selectedAssignment.grade ?? "-"} ${selectedAssignment.class_name} | ${selectedAssignment.subject_name}`,
      fileName: `markah-${selectedAssignment.subject_name}-${selectedAssignment.class_name}.pdf`,
      columns: [
        { header: "Bil.", dataKey: "no" },
        { header: "Nama Pelajar", dataKey: "student" },
        ...templateInfo.template.components.map((component) => ({
          header: component.label,
          dataKey: component.key,
        })),
        { header: "Jumlah Markah", dataKey: "total" },
        { header: "Peratus", dataKey: "percentage" },
        { header: "Gred", dataKey: "grade" },
      ],
      rows,
    });
    toast.success("PDF markah berjaya dieksport");
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
                 {isReadOnly ? "Markah Diluluskan" : "Pemarkahan Markah"}
               </h1>
               <p className="text-muted-foreground font-medium mt-1">
                 {isReadOnly
                   ? "Markah pelajar yang telah diluluskan oleh Panitia Subjek."
                   : "Mengurus markah pelajar untuk peperiksaan mengikut subjek dan kelas."}
               </p>
               <HeaderLastUpdated />
         </div>
       </div>
    </div>

        <Card className="border border-border/50 shadow-lg">
          <CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Peperiksaan</div>
              <Select
                value={selectedExamId}
                onValueChange={(value) => {
                  setSelectedExamId(value);
                  setComponentMarksByStudent({});
                  setMarkStatus(EMPTY_MARK_STATUS);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih peperiksaan" />
                </SelectTrigger>
                <SelectContent>
                  {visibleExams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name} ({exam.academic_year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Tingkatan</div>
              <Select
                value={selectedGrade}
                onValueChange={(value) => {
                  setSelectedGrade(value);
                  setSelectedClassId("");
                  setSelectedSubjectId("");
                  setStudents([]);
                  setComponentMarksByStudent({});
                  setMarkStatus(EMPTY_MARK_STATUS);
                }}
              >
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
              <Select
                value={selectedClassId}
                onValueChange={(value) => {
                  setSelectedClassId(value);
                  setSelectedSubjectId("");
                  setStudents([]);
                  setComponentMarksByStudent({});
                  setMarkStatus(EMPTY_MARK_STATUS);
                }}
                disabled={!selectedGrade}
              >
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
              <Select
                value={selectedSubjectId}
                onValueChange={(value) => {
                  setSelectedSubjectId(value);
                  setStudents([]);
                  setComponentMarksByStudent({});
                  setMarkStatus(EMPTY_MARK_STATUS);
                }}
                disabled={!selectedClassId}
              >
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

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full xl:w-auto"
                onClick={() => {
                  setSelectedExamId("");
                  setSelectedGrade("");
                  setSelectedClassId("");
                  setSelectedSubjectId("");
                  setStudents([]);
                  setComponentMarksByStudent({});
                  setMarkStatus(EMPTY_MARK_STATUS);
                }}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {!filtersComplete && (
          <Card className="border-dashed border-border bg-card/60 shadow-none">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Filter className="h-8 w-8 text-muted-foreground/60" />
              <p className="font-semibold text-foreground">Pilih maklumat tertentu untuk memaparkan markah</p>
              <p className="text-sm text-muted-foreground">
                Pilih peperiksaan, tingkatan, kelas dan subjek terlebih dahulu.
              </p>
            </CardContent>
          </Card>
        )}

        {filtersComplete && isLate && !isApproved && (
          <Card className="border border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950">
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

        {filtersComplete && templateInfo.template && markStatus.approval.status !== "none" && !isApproved && (
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
              <div className="min-w-0 flex-1">
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
                      ? "Semak sebab penolakan, betulkan markah pelajar, kemudian hantar semula kepada Panitia Subjek."
                      : "Markah telah dihantar dan sedang disemak oleh Panitia Subjek."}
                </div>
                {isRejected && (
                  <div className="mt-3 rounded-lg border border-destructive/25 bg-background/80 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                      <MessageSquareWarning className="h-4 w-4 shrink-0" />
                      Sebab Penolakan daripada Panitia Subjek
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {markStatus.approval.rejectionReason ||
                        "Tiada sebab penolakan diberikan. Sila hubungi Panitia Subjek."}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {filtersComplete && templateInfo.template && (
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
                      const hasAnyMark = templateInfo.template!.components.some((component) => {
                        const value = componentMarksByStudent[student.id]?.[component.key];
                        return value !== undefined && String(value).trim() !== "";
                      });
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
                                  disabled={isApproved || isReadOnly}
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
                                      disabled={isApproved || isReadOnly}
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
                            {hasAnyMark ? `${summary.raw_total} / ${summary.total_max}` : "-"}
                          </TableCell>
                          <TableCell className="py-4 text-center font-semibold">{hasAnyMark ? `${summary.percentage}%` : "-"}</TableCell>
                          <TableCell className="py-4 text-center">
                            {hasAnyMark ? (
                              <Badge variant="outline" className={["F", "G"].includes(gradeFromTotal(summary.percentage, selectedAssignment?.grade)) ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
                                {gradeFromTotal(summary.percentage, selectedAssignment?.grade)}
                              </Badge>
                            ) : "-"}
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

        {filtersComplete && templateInfo.template && !isReadOnly && (
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
        )}
      </div>
    </div>
  );
}
