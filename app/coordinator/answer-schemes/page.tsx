"use client";

import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileSignature,
  Filter,
  ListChecks,
  Pencil,
  RotateCcw,
  Save,
  ScanLine,
  Settings2,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  buildSubjectTemplatePreset,
  getPrimaryOmrComponent,
  getSubjectSettingsForTemplate,
  serializeTemplateForStorage,
  type GradeTemplate,
  type MarkComponent,
  type TemplateGroup,
} from "@/lib/marking-template";
import { getMalaysiaDateInputValue } from "@/lib/date-utils";
import { isLowerFormOnlySubject, isUpperFormOnlySubject } from "@/lib/subject-rules";
import { HeaderLastUpdated } from "@/components/header-last-updated";

type Session = {
  user_id: string;
  userType: "teacher";
  role: string;
};

type Exam = {
  id: string;
  name: string;
  academic_year: string;
  subject_settings?: Record<string, unknown>;
};

const HIDDEN_ANSWER_SCHEME_YEARS = new Set(["2025", "2027"]);

function isVisibleAnswerSchemeExam(exam: Exam) {
  return !HIDDEN_ANSWER_SCHEME_YEARS.has(exam.academic_year.trim());
}

type Subject = { id: string; name: string };

function isUpperOnlySubject(subjectName: string) {
  return isUpperFormOnlySubject(subjectName);
}

function isLowerOnlySubject(subjectName: string) {
  return isLowerFormOnlySubject(subjectName);
}

function normalizeSystemTemplate(template: GradeTemplate): GradeTemplate {
  return {
    ...template,
    components: template.components.map((component) => ({
      ...component,
      included_in_total: true,
      question_count:
        component.type === "omr"
          ? component.question_count ?? component.max_mark
          : undefined,
    })),
  };
}

function componentTypeMeta(type: MarkComponent["type"]) {
  return type === "omr"
    ? {
        label: "OMR",
        icon: ScanLine,
        badge: "border-sky-200 bg-sky-50 text-sky-700",
      }
    : {
        label: "Manual",
        icon: Pencil,
        badge: "border-violet-200 bg-violet-50 text-violet-700",
    };
}

function getAnswerGridColumns() {
  if (typeof window === "undefined") return 2;
  if (window.matchMedia("(min-width: 1280px)").matches) return 8;
  if (window.matchMedia("(min-width: 1024px)").matches) return 5;
  if (window.matchMedia("(min-width: 640px)").matches) return 4;
  return 2;
}

function clampNumber(value: unknown, min: number, max: number) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

export default function AnswerSchemesPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [examId, setExamId] = useState("");
  const [gradeGroup, setGradeGroup] = useState<TemplateGroup>("lower");
  const [omrGrade, setOmrGrade] = useState("1");

  const [deadlines, setDeadlines] = useState<Record<TemplateGroup, string>>({
    lower: "",
    upper: "",
  });
  const [templates, setTemplates] = useState<Record<TemplateGroup, GradeTemplate>>({
    lower: buildSubjectTemplatePreset("", "lower"),
    upper: buildSubjectTemplatePreset("", "upper"),
  });
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

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
    if (role !== "subject coordinator") {
      toast.error("Hanya Penyelaras Subjek boleh akses halaman ini");
      router.replace("/teacher/dashboard");
    }
  }, [router, session]);

  const selectedExam = useMemo(() => exams.find((exam) => exam.id === examId) ?? null, [examId, exams]);
  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === subjectId) ?? null,
    [subjectId, subjects],
  );
  const subjectIsUpperOnly = isUpperOnlySubject(selectedSubject?.name ?? "");
  const subjectIsLowerOnly = isLowerOnlySubject(selectedSubject?.name ?? "");
  const activeGradeGroup: TemplateGroup = subjectIsUpperOnly ? "upper" : subjectIsLowerOnly ? "lower" : gradeGroup;
  const omrGradeOptions = useMemo(
    () => (activeGradeGroup === "upper" ? [4, 5] : [1, 2, 3]),
    [activeGradeGroup],
  );
  const activeOmrGrade = omrGradeOptions.includes(Number(omrGrade)) ? omrGrade : String(omrGradeOptions[0]);
  const activeOmrGradeGroup = `tingkatan-${activeOmrGrade}`;
  const activeTemplate = templates[activeGradeGroup];
  const deadlineInput = deadlines[activeGradeGroup];
  const presetTemplate = buildSubjectTemplatePreset(selectedSubject?.name ?? "", activeGradeGroup);
  const primaryOmrComponent = getPrimaryOmrComponent(activeTemplate);
  const primaryOmrIndex = activeTemplate.components.findIndex((component) => component.type === "omr");
  const primaryOmrLabel =
    primaryOmrComponent && primaryOmrIndex >= 0
      ? primaryOmrComponent.label || `Komponen ${primaryOmrIndex + 1}`
      : "";
  const answerQuestionCount = primaryOmrComponent?.question_count ?? primaryOmrComponent?.max_mark ?? 0;
  const manualComponents = activeTemplate.components.filter((component) => component.type === "manual");
  const omrComponents = activeTemplate.components.filter((component) => component.type === "omr");
  const inputModeLabel =
    omrComponents.length > 0
      ? [
          ...omrComponents.map(() => "OMR"),
          ...manualComponents.map(() => "Manual"),
        ].join(" + ")
      : "Manual sahaja";
  const answeredCount = useMemo(
    () =>
      Array.from({ length: answerQuestionCount }).filter((_, index) =>
        ["A", "B", "C", "D"].includes(String(answers[index + 1] ?? "").trim().toUpperCase()),
      ).length,
    [answerQuestionCount, answers],
  );
  async function loadOptions() {
    if (!session) return;
    setLoading(true);
    try {
      const [sRes, eRes] = await Promise.all([
        fetch(`/api/coordinator/subjects?teacher_id=${session.user_id}`, {
          cache: "no-store",
        }),
        fetch("/api/admin/exams", { cache: "no-store" }),
      ]);

      const sJson = await sRes.json();
      const eJson = await eRes.json();

      const subjectList = Array.isArray(sJson?.data) ? (sJson.data as Subject[]) : [];
      const examList: Exam[] = (Array.isArray(eJson) ? (eJson as Exam[]) : [])
        .filter(isVisibleAnswerSchemeExam);
      setSubjects(subjectList);
      setExams(examList);

      if (subjectList.length > 0) setSubjectId((current) => current || subjectList[0].id);
      setExamId((current) =>
        examList.some((exam) => exam.id === current)
          ? current
          : examList[0]?.id ?? "",
      );
    } catch {
      setSubjects([]);
      setExams([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    loadOptions();
  }, [session]);

  useEffect(() => {
    if (!selectedExam || !selectedSubject) return;
    const settings = getSubjectSettingsForTemplate(
      selectedExam.subject_settings as Record<string, unknown> | undefined,
      selectedSubject.id,
      selectedSubject.name,
    );
    setTemplates({
      lower: settings.grade_templates?.lower ?? buildSubjectTemplatePreset(selectedSubject.name, "lower"),
      upper: settings.grade_templates?.upper ?? buildSubjectTemplatePreset(selectedSubject.name, "upper"),
    });
    if (isUpperOnlySubject(selectedSubject.name)) {
      setGradeGroup("upper");
    } else if (isLowerOnlySubject(selectedSubject.name)) {
      setGradeGroup("lower");
    }
    setDeadlines({
      lower: settings.deadlines?.lower || settings.deadline || "",
      upper: settings.deadlines?.upper || settings.deadline || "",
    });
  }, [selectedExam, selectedSubject]);

  useEffect(() => {
    if (!omrGradeOptions.includes(Number(omrGrade))) {
      setOmrGrade(String(omrGradeOptions[0]));
    }
  }, [omrGrade, omrGradeOptions]);

  async function loadExistingSchema() {
    if (!examId || !subjectId) return;
    try {
      const res = await fetch(
        `/api/coordinator/answer-schemes?exam_id=${examId}&subject_id=${subjectId}&grade_group=${activeOmrGradeGroup}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      const map: Record<number, string> = {};
      for (const row of json?.data ?? []) {
        map[Number(row.question_no)] = String(row.correct_answer ?? "");
      }
      setAnswers(map);
    } catch {
      setAnswers({});
    }
  }

  useEffect(() => {
    loadExistingSchema();
  }, [examId, subjectId, activeOmrGradeGroup]);

  function updateActiveTemplate(updater: (template: GradeTemplate) => GradeTemplate) {
    setTemplates((current) => ({
      ...current,
      [activeGradeGroup]: updater(current[activeGradeGroup]),
    }));
  }

  function applyPreset(group: TemplateGroup) {
    const subjectName = selectedSubject?.name ?? "";
    setTemplates((current) => ({
      ...current,
      [group]: buildSubjectTemplatePreset(subjectName, group),
    }));
    toast.success(`Preset ${group === "lower" ? "Form 1-3" : "Form 4-5"} dimuatkan`);
  }

  async function handleSaveSettings() {
    if (!session || !examId || !subjectId) return;
    if (deadlineInput && !/^\d{4}-\d{2}-\d{2}$/.test(deadlineInput)) {
      toast.error("Format deadline mesti YYYY-MM-DD");
      return;
    }

    setSavingSettings(true);
    const toastId = toast.loading("Menyimpan template pemarkahan...");
    try {
      const res = await fetch("/api/coordinator/exam-subject-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coordinator_teacher_id: session.user_id,
          exam_id: examId,
          subject_id: subjectId,
          deadlines: {
            lower: deadlines.lower.trim(),
            upper: deadlines.upper.trim(),
          },
          grade_templates: {
            lower: serializeTemplateForStorage(normalizeSystemTemplate(templates.lower)),
            upper: serializeTemplateForStorage(normalizeSystemTemplate(templates.upper)),
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.message ?? "Gagal simpan template", { id: toastId });
        return;
      }

      if (json?.cancelled) {
        setAnswers({});
        toast.success("Skema dan tarikh akhir telah dibatalkan", { id: toastId });
      } else {
        toast.success("Template pemarkahan disimpan", { id: toastId });
      }
      await loadOptions();
    } catch {
      toast.error("Ralat sistem", { id: toastId });
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleSaveAnswers() {
    if (!examId || !subjectId) return;
    if (!primaryOmrComponent || answerQuestionCount <= 0) {
      toast.error("Template aktif tiada komponen OMR");
      return;
    }

    const missingQuestions = Array.from({ length: answerQuestionCount })
      .map((_, index) => index + 1)
      .filter((questionNo) => !["A", "B", "C", "D"].includes(String(answers[questionNo] ?? "").trim().toUpperCase()));

    if (missingQuestions.length > 0) {
      toast.error(`Lengkapkan jawapan untuk ${missingQuestions.length} soalan OMR dahulu`);
      return;
    }

    const payload = Array.from({ length: answerQuestionCount }).map((_, index) => {
      const questionNo = index + 1;
      return {
        question_no: questionNo,
        correct_answer: answers[questionNo] ?? "",
      };
    });

    const toastId = toast.loading("Menyimpan skema jawapan...");
    try {
      const res = await fetch("/api/coordinator/answer-schemes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: examId,
          subject_id: subjectId,
          grade_group: activeOmrGradeGroup,
          answers: payload,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.message ?? "Gagal", { id: toastId });
        return;
      }

      toast.success("Skema jawapan berjaya disimpan", { id: toastId });
      loadExistingSchema();
    } catch {
      toast.error("Ralat sistem", { id: toastId });
    }
  }

  function totalIncludedMax(template: GradeTemplate) {
    return template.components
      .filter((component) => component.included_in_total !== false)
      .reduce((sum, component) => sum + Number(component.max_mark || 0), 0);
  }

  function focusAnswerInput(questionNo: number) {
    const target = document.querySelector<HTMLInputElement>(
      `[data-answer-question="${questionNo}"]`,
    );
    target?.focus();
    target?.select();
  }

  function handleAnswerKeyDown(event: KeyboardEvent<HTMLInputElement>, questionNo: number) {
    const columns = getAnswerGridColumns();
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columns,
      ArrowUp: -columns,
    };
    const move = moves[event.key];
    if (!move) return;

    const nextQuestion = Math.min(
      answerQuestionCount,
      Math.max(1, questionNo + move),
    );
    if (nextQuestion === questionNo) return;

    event.preventDefault();
    focusAnswerInput(nextQuestion);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6 overflow-x-hidden">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-3">
              <FileSignature className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Skema Jawapan</h1>
              <p className="text-muted-foreground">
                Tetapkan struktur markah mengikut subjek, kertas, dan skema OMR bila diperlukan.
              </p>
              <HeaderLastUpdated />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="h-8 rounded-full border-violet-200 bg-violet-50 px-3 text-sm font-medium text-violet-700">
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              {manualComponents.length} manual
            </Badge>
            <Badge variant="outline" className="h-8 rounded-full border-sky-200 bg-sky-50 px-3 text-sm font-medium text-sky-700">
              <ScanLine className="mr-1.5 h-3.5 w-3.5" />
              {omrComponents.length} OMR
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <SchemeStatCard
            title="Jumlah markah"
            value={totalIncludedMax(activeTemplate)}
            icon={Settings2}
            variant="primary"
          />
          <SchemeStatCard
            title="Skema OMR"
            value={primaryOmrComponent ? `${answeredCount}/${answerQuestionCount}` : "Tidak perlu"}
            icon={ScanLine}
            variant="chart2"
          />
          <SchemeStatCard
            title="Mod input guru"
            value={inputModeLabel}
            icon={ClipboardCheck}
            variant="chart3"
          />
        </div>

                <Card className="border border-border/50 shadow-lg">
          <CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                Peperiksaan
              </div>
              <Select value={examId} onValueChange={setExamId}>
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
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                Subjek
              </div>
              <div className="flex h-10 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-xs">
                {selectedSubject?.name ?? "Subjek"}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ListChecks className="h-4 w-4" />
                Tingkatan
              </div>
              {subjectIsUpperOnly ? (
                <div className="flex h-10 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-xs">
                  Tingkatan 4-5
                </div>
              ) : subjectIsLowerOnly ? (
                <div className="flex h-10 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-xs">
                  Tingkatan 1-3
                </div>
              ) : (
                <Select value={gradeGroup} onValueChange={(value) => setGradeGroup(value as TemplateGroup)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lower">Tingkatan 1-3</SelectItem>
                    <SelectItem value="upper">Tingkatan 4-5</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

           <div className="space-y-2">
  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
    <CalendarDays className="h-4 w-4" />
    Tarikh akhir hantar
  </div>

  <Input
    type="date"
    value={deadlineInput}
    onChange={(event) =>
      setDeadlines((current) => ({
        ...current,
        [activeGradeGroup]: event.target.value,
      }))
    }
    min={getMalaysiaDateInputValue()}
  />
</div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 shadow-lg">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" />
                  Struktur Kertas {activeGradeGroup === "lower" ? "Tingkatan 1-3" : "Tingkatan 4-5"}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Markah setiap kertas telah dipreset mengikut subjek. Laraskan hanya jika peperiksaan ini menggunakan struktur berlainan.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => applyPreset(activeGradeGroup)}>
                <Wand2 className="mr-2 h-4 w-4" />
                Muat Preset Subjek
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeTemplate.components.map((component, index) => {
                const paperLabel = component.label || `Komponen ${index + 1}`;
                const presetComponent = presetTemplate.components[index];
                const maxAllowedMark = presetComponent?.max_mark ?? component.max_mark;
                return (
                <Card key={`${component.key}-${index}`} className="border-border/60 bg-card shadow-sm">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                      {(() => {
                        const meta = componentTypeMeta(component.type);
                        const Icon = meta.icon;
                        return (
                          <div className={`rounded-lg border p-2 ${meta.badge}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                        );
                      })()}
                      <div>
                        <div className="text-lg font-bold text-foreground">{paperLabel}</div>
                        <div className="text-sm text-muted-foreground">
                          {component.max_mark} markah
                          {component.type === "omr" && ` / ${component.question_count ?? component.max_mark} soalan`}
                        </div>
                      </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`h-8 rounded-full px-3 text-sm font-medium ${componentTypeMeta(component.type).badge}`}
                      >
                        {componentTypeMeta(component.type).label}
                      </Badge>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium text-muted-foreground">Markah</div>
                        <Input
                          type="number"
                          min={0}
                          max={maxAllowedMark}
                          value={component.max_mark}
                          onChange={(event) =>
                            updateActiveTemplate((template) => ({
                              ...template,
                              components: template.components.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      max_mark: clampNumber(event.target.value, 0, maxAllowedMark),
                                      question_count:
                                        item.type === "omr"
                                          ? clampNumber(event.target.value, 0, maxAllowedMark)
                                          : item.question_count,
                                    }
                                  : item,
                              ),
                            }))
                          }
                          placeholder="40"
                        />
                      </div>
                      {component.type === "omr" && (
                        <div className="space-y-1.5">
                          <div className="text-xs font-medium text-muted-foreground">Bil. soalan OMR</div>
                          <Input
                          type="number"
                          min={0}
                          max={maxAllowedMark}
                          value={component.question_count ?? ""}
                          onChange={(event) =>
                            updateActiveTemplate((template) => ({
                              ...template,
                              components: template.components.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      max_mark: clampNumber(event.target.value, 0, maxAllowedMark),
                                      question_count: event.target.value
                                        ? clampNumber(event.target.value, 0, maxAllowedMark)
                                        : undefined,
                                    }
                                  : item,
                              ),
                              }))
                            }
                            placeholder="40"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="h-8 rounded-full border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-700"
              >
                <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                Komponen: {activeTemplate.components.length}
              </Badge>
              <Badge
                variant="outline"
                className="h-8 rounded-full border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700"
              >
                <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                Jumlah: {totalIncludedMax(activeTemplate)}
              </Badge>
              <Badge
                variant="outline"
                className="h-8 rounded-full border-violet-200 bg-violet-50 px-3 text-sm font-medium text-violet-700"
              >
                <ScanLine className="mr-1.5 h-3.5 w-3.5" />
                OMR: {primaryOmrComponent ? primaryOmrLabel : "Tiada"}
              </Badge>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={loading || savingSettings || !examId || !subjectId}>
                <Save className="mr-2 h-4 w-4" />
                {deadlines.lower.trim() || deadlines.upper.trim() ? "Simpan Template" : "Batalkan Skema"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {primaryOmrComponent && (
          <Card className="border border-border/50 shadow-lg">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ScanLine className="h-5 w-5 text-primary" />
                    Skema Jawapan OMR
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Isi jawapan A, B, C atau D mengikut bilangan soalan objektif yang ditetapkan.
                  </p>
                </div>
                <Badge variant="outline" className="h-8 rounded-full border-sky-200 bg-sky-50 px-3 text-sm font-medium text-sky-700">
                  <Filter className="mr-1.5 h-3.5 w-3.5" />
                  {answeredCount}/{answerQuestionCount} lengkap
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="h-8 rounded-full px-3 text-sm font-medium">
                      {primaryOmrLabel}
                    </Badge>
                    <Badge variant="outline" className="h-8 rounded-full px-3 text-sm font-medium">
                      {answerQuestionCount} soalan
                    </Badge>
                    <Badge variant="outline" className="h-8 rounded-full px-3 text-sm font-medium">
                      Tingkatan {activeOmrGrade}
                    </Badge>
                  </div>
                  <div className="w-full sm:w-[190px]">
                    <Select value={activeOmrGrade} onValueChange={setOmrGrade}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Pilih tingkatan" />
                      </SelectTrigger>
                      <SelectContent>
                        {omrGradeOptions.map((grade) => (
                          <SelectItem key={grade} value={String(grade)}>
                            Tingkatan {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8">
                  {Array.from({ length: answerQuestionCount }).map((_, index) => {
                    const questionNo = index + 1;
                    return (
                      <div key={questionNo} className="rounded-md border border-border/60 bg-background p-2">
                        <div className="mb-1 text-xs font-medium text-muted-foreground">Q{questionNo}</div>
                        <Input
                          className="h-9 text-center font-semibold uppercase"
                          data-answer-question={questionNo}
                          value={answers[questionNo] ?? ""}
                          onChange={(event) =>
                            setAnswers((current) => ({
                              ...current,
                              [questionNo]: event.target.value.toUpperCase().replace(/[^ABCD]/g, "").slice(0, 1),
                            }))
                          }
                          onKeyDown={(event) => handleAnswerKeyDown(event, questionNo)}
                          maxLength={1}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAnswers({})}
                    disabled={answeredCount === 0}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset Jawapan
                  </Button>
                  <Button onClick={handleSaveAnswers} disabled={!examId || !subjectId || answeredCount !== answerQuestionCount}>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Skema OMR
                  </Button>
                </div>
              </>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function SchemeStatCard({
  title,
  value,
  icon: Icon,
  variant,
}: {
  title: string;
  value: string | number;
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
    <Card className={`border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md ${styles.border}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <h3 className={`break-words text-3xl font-bold leading-tight ${styles.valText}`}>
              {value}
            </h3>
          </div>
          <div className={`rounded-xl border p-3 ${styles.bg} ${styles.iconBorder}`}>
            <Icon className={`h-5 w-5 ${styles.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
