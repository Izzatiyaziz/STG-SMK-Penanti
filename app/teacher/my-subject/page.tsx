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
import { AlertTriangle, Camera, ClipboardList, Send } from "lucide-react";
import {
  computeMarkSummary,
  getGradeTemplateForClass,
  type GradeTemplate,
} from "@/lib/marking-template";

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

type ClassSummary = {
  class: { id: string; name: string; grade: number | null };
  totals: {
    students: number;
    results: number;
    submitted: number;
    omr_scanned: number;
    approved: number;
    pending: number;
    rejected: number;
    average_total: number;
  };
};

function toIsoDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toNumber(value: unknown, fallback = 0) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
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
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [componentMarksByStudent, setComponentMarksByStudent] = useState<
    Record<string, Record<string, string>>
  >({});
  const [classSummary, setClassSummary] = useState<ClassSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

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

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId],
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
        if (matched) setSelectedAssignmentId(matched.id);
      } else if (assignmentList.length > 0) {
        setSelectedAssignmentId((current) => current || assignmentList[0].id);
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
      const [summaryRes, componentRes] = await Promise.all([
        fetch(
          `/api/teacher/class-summary?teacher_id=${session?.user_id}&class_id=${selectedAssignment.class_id}&subject_id=${selectedAssignment.subject_id}&exam_id=${selectedExamId}`,
          { cache: "no-store" },
        ),
        fetch(
          `/api/teacher/component-marks?class_id=${selectedAssignment.class_id}&subject_id=${selectedAssignment.subject_id}&exam_id=${selectedExamId}`,
          { cache: "no-store" },
        ),
      ]);

      const summaryJson = await summaryRes.json();
      const componentJson = await componentRes.json();
      setClassSummary(summaryRes.ok ? (summaryJson as ClassSummary) : null);

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
    } catch {
      setClassSummary(null);
      setComponentMarksByStudent({});
    }
  }

  useEffect(() => {
    if (!selectedAssignmentId) return;
    loadStudents();
  }, [selectedAssignmentId]);

  useEffect(() => {
    if (!selectedAssignment || !selectedExamId || !templateInfo.template || students.length === 0) return;
    loadComponentMarks();
  }, [selectedAssignment, selectedExamId, templateInfo.template, students.length]);

  function updateStudentComponent(studentId: string, componentKey: string, value: string) {
    setComponentMarksByStudent((current) => ({
      ...current,
      [studentId]: {
        ...(current[studentId] ?? {}),
        [componentKey]: value,
      },
    }));
  }

  async function handleSubmitMarks() {
    if (!session || !selectedAssignment || !selectedExamId || !templateInfo.template) return;
    if (isLate) {
      toast.error(`Tarikh akhir telah tamat (${templateInfo.deadline || "-"})`);
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

    setSubmitLoading(true);
    const toastId = toast.loading("Menghantar markah...");
    try {
      const marks = students.map((student) => ({
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
          marks,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.message ?? "Gagal menghantar markah", { id: toastId });
        return;
      }

      toast.success("Markah dihantar untuk semakan penyelaras", { id: toastId });
      await loadComponentMarks();
    } catch {
      toast.error("Ralat sistem", { id: toastId });
    } finally {
      setSubmitLoading(false);
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

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-1">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Pemarkahan Subjek</h1>
          </div>
          <p className="text-muted-foreground">
            Isi markah ikut template tingkatan. Jumlah akhir akan dinormalisasi ke peratus.
          </p>
        </div>

        <Card className="border border-border/50 shadow-lg">
          <CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
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
              <div className="text-sm text-muted-foreground">Subjek & Kelas</div>
              <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tugasan" />
                </SelectTrigger>
                <SelectContent>
                  {assignments.map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {assignment.subject_name} • {assignment.grade ?? "-"} {assignment.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Maklumat Template</div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {selectedAssignment?.grade && selectedAssignment.grade >= 4 ? "Form 4-5" : "Form 1-3"}
                </Badge>
                <Badge variant="outline">
                  Komponen: {templateInfo.template?.components.length ?? 0}
                </Badge>
                <Badge variant="outline">Deadline: {templateInfo.deadline || "-"}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {classSummary && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border border-border/50 shadow-lg">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">Purata Kelas</div>
                <div className="mt-2 text-2xl font-bold">{Math.round(classSummary.totals.average_total || 0)}%</div>
              </CardContent>
            </Card>
            <Card className="border border-border/50 shadow-lg">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">Bil. Pelajar</div>
                <div className="mt-2 text-2xl font-bold">{classSummary.totals.students}</div>
              </CardContent>
            </Card>
            <Card className="border border-border/50 shadow-lg">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">Kelulusan</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">Lulus: {classSummary.totals.approved}</Badge>
                  <Badge variant="outline">Menunggu: {classSummary.totals.pending}</Badge>
                  <Badge variant="outline">Tolak: {classSummary.totals.rejected}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {isLate && (
          <Card className="border border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <div className="font-semibold text-destructive">Lewat hantar markah</div>
                <div className="text-sm text-muted-foreground">
                  Deadline untuk subjek ini: <span className="font-medium text-foreground">{templateInfo.deadline || "-"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {templateInfo.template && (
          <Card className="border border-border bg-card shadow-md">
            <CardHeader>
              <CardTitle>
                Senarai Pelajar - {selectedAssignment?.grade ?? "-"} {selectedAssignment?.class_name ?? "-"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {templateInfo.template.components
                  .filter((component) => component.type === "omr")
                  .map((component) => (
                    <Button key={component.key} variant="outline" onClick={() => openOmrPage()}>
                      <Camera className="mr-2 h-4 w-4" />
                      OMR {component.label}
                    </Button>
                  ))}
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Nama Pelajar</TableHead>
                      {templateInfo.template.components.map((component) => (
                        <TableHead key={component.key} className="text-center">
                          {component.label}
                        </TableHead>
                      ))}
                      <TableHead className="text-center">Jumlah Mentah</TableHead>
                      <TableHead className="text-center">Peratus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const marksByKey = Object.fromEntries(
                        templateInfo.template!.components.map((component) => [
                          component.key,
                          toNumber(componentMarksByStudent[student.id]?.[component.key] ?? 0, 0),
                        ]),
                      );
                      const summary = computeMarkSummary(templateInfo.template!, marksByKey);

                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          {templateInfo.template!.components.map((component) => (
                            <TableCell key={component.key} className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={component.max_mark}
                                  className="h-9 w-24 text-center"
                                  value={componentMarksByStudent[student.id]?.[component.key] ?? ""}
                                  onChange={(event) =>
                                    updateStudentComponent(student.id, component.key, event.target.value)
                                  }
                                  placeholder={`0-${component.max_mark}`}
                                />
                                {component.type === "omr" && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 border-emerald-500 text-emerald-600"
                                    onClick={() => openOmrPage(student.id)}
                                  >
                                    <Camera className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-medium">
                            {summary.raw_total} / {summary.total_max}
                          </TableCell>
                          <TableCell className="text-center font-semibold">{summary.percentage}%</TableCell>
                        </TableRow>
                      );
                    })}

                    {!loading && students.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={(templateInfo.template.components.length || 0) + 3} className="py-16 text-center text-muted-foreground">
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

        <div className="flex justify-end">
          <Button
            onClick={handleSubmitMarks}
            disabled={submitLoading || !selectedAssignmentId || !selectedExamId || !templateInfo.template}
          >
            <Send className="mr-2 h-4 w-4" />
            {submitLoading ? "Menghantar..." : "Hantar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
