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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSignature, Plus, Save, Settings2, Trash2, Wand2 } from "lucide-react";
import {
  buildSubjectTemplatePreset,
  getPrimaryOmrComponent,
  getSubjectSettingsForTemplate,
  serializeTemplateForStorage,
  type GradeTemplate,
  type MarkComponent,
  type TemplateGroup,
} from "@/lib/marking-template";

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

type Subject = { id: string; name: string };

function createBlankComponent(index: number): MarkComponent {
  return {
    key: `component_${index + 1}`,
    label: `Komponen ${index + 1}`,
    type: "manual",
    max_mark: 0,
    included_in_total: true,
  };
}

export default function AnswerSchemesPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [examId, setExamId] = useState("");
  const [gradeGroup, setGradeGroup] = useState<TemplateGroup>("lower");

  const [deadlineInput, setDeadlineInput] = useState<string>("");
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
  const activeTemplate = templates[gradeGroup];
  const primaryOmrComponent = getPrimaryOmrComponent(activeTemplate);
  const answerQuestionCount = primaryOmrComponent?.question_count ?? primaryOmrComponent?.max_mark ?? 0;

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
      const examList: Exam[] = Array.isArray(eJson) ? eJson : [];
      setSubjects(subjectList);
      setExams(examList);

      if (subjectList.length > 0) setSubjectId((current) => current || subjectList[0].id);
      if (examList.length > 0) setExamId((current) => current || examList[0].id);
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
    setDeadlineInput(typeof settings.deadline === "string" ? settings.deadline : "");
  }, [selectedExam, selectedSubject]);

  async function loadExistingSchema() {
    if (!examId || !subjectId) return;
    try {
      const res = await fetch(
        `/api/coordinator/answer-schemes?exam_id=${examId}&subject_id=${subjectId}&grade_group=${gradeGroup}`,
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
  }, [examId, subjectId, gradeGroup]);

  function updateActiveTemplate(updater: (template: GradeTemplate) => GradeTemplate) {
    setTemplates((current) => ({
      ...current,
      [gradeGroup]: updater(current[gradeGroup]),
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
          deadline: deadlineInput.trim(),
          grade_templates: {
            lower: serializeTemplateForStorage(templates.lower),
            upper: serializeTemplateForStorage(templates.upper),
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.message ?? "Gagal simpan template", { id: toastId });
        return;
      }

      toast.success("Template pemarkahan disimpan", { id: toastId });
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
          grade_group: gradeGroup,
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6 overflow-x-hidden">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2">
            <FileSignature className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Template Pemarkahan</h1>
            <p className="text-muted-foreground">
              Urus template `Form 1-3` dan `Form 4-5` untuk setiap subjek dan peperiksaan.
            </p>
          </div>
        </div>

        <Card className="border border-border/50 shadow-lg">
          <CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Peperiksaan</div>
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
              <div className="text-sm text-muted-foreground">Subjek</div>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih subjek" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Template Aktif</div>
              <Select value={gradeGroup} onValueChange={(value) => setGradeGroup(value as TemplateGroup)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lower">Form 1-3</SelectItem>
                  <SelectItem value="upper">Form 4-5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Deadline</div>
              <Input value={deadlineInput} onChange={(event) => setDeadlineInput(event.target.value)} placeholder="2026-05-31" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Struktur Komponen {gradeGroup === "lower" ? "Form 1-3" : "Form 4-5"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => applyPreset(gradeGroup)}>
                <Wand2 className="mr-2 h-4 w-4" />
                Muat Preset
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  updateActiveTemplate((template) => ({
                    ...template,
                    components: [...template.components, createBlankComponent(template.components.length)],
                  }))
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Tambah Komponen
              </Button>
            </div>

            <div className="grid gap-3">
              {activeTemplate.components.map((component, index) => (
                <div key={`${component.key}-${index}`} className="grid gap-3 rounded-lg border border-border/60 p-4 lg:grid-cols-[1.1fr_1.2fr_0.8fr_0.8fr_0.9fr_0.9fr_auto]">
                  <Input
                    value={component.key}
                    onChange={(event) =>
                      updateActiveTemplate((template) => ({
                        ...template,
                        components: template.components.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, key: event.target.value } : item,
                        ),
                      }))
                    }
                    placeholder="key"
                  />
                  <Input
                    value={component.label}
                    onChange={(event) =>
                      updateActiveTemplate((template) => ({
                        ...template,
                        components: template.components.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, label: event.target.value } : item,
                        ),
                      }))
                    }
                    placeholder="Label"
                  />
                  <Select
                    value={component.type}
                    onValueChange={(value) =>
                      updateActiveTemplate((template) => ({
                        ...template,
                        components: template.components.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, type: value as "manual" | "omr" } : item,
                        ),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="omr">OMR</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    value={component.max_mark}
                    onChange={(event) =>
                      updateActiveTemplate((template) => ({
                        ...template,
                        components: template.components.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, max_mark: Number(event.target.value) || 0 } : item,
                        ),
                      }))
                    }
                    placeholder="Markah"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={component.question_count ?? ""}
                    onChange={(event) =>
                      updateActiveTemplate((template) => ({
                        ...template,
                        components: template.components.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                question_count: event.target.value ? Number(event.target.value) || 0 : undefined,
                              }
                            : item,
                        ),
                      }))
                    }
                    placeholder="Bil. soalan"
                  />
                  <Select
                    value={component.included_in_total === false ? "exclude" : "include"}
                    onValueChange={(value) =>
                      updateActiveTemplate((template) => ({
                        ...template,
                        components: template.components.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, included_in_total: value !== "exclude" }
                            : item,
                        ),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="include">Masuk jumlah</SelectItem>
                      <SelectItem value="exclude">Tak masuk jumlah</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      updateActiveTemplate((template) => ({
                        ...template,
                        components: template.components.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Komponen: {activeTemplate.components.length}</Badge>
              <Badge variant="outline">Jumlah dikira: {totalIncludedMax(activeTemplate)}</Badge>
              <Badge variant="outline">OMR aktif: {primaryOmrComponent ? primaryOmrComponent.label : "Tiada"}</Badge>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={loading || savingSettings || !examId || !subjectId}>
                <Save className="mr-2 h-4 w-4" />
                Simpan Template
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle>Skema Jawapan OMR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!primaryOmrComponent && (
              <div className="text-sm text-muted-foreground">
                Template aktif tiada komponen OMR. Skema jawapan tidak diperlukan.
              </div>
            )}

            {primaryOmrComponent && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{primaryOmrComponent.label}</Badge>
                  <Badge variant="outline">{answerQuestionCount} soalan</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {Array.from({ length: answerQuestionCount }).map((_, index) => {
                    const questionNo = index + 1;
                    return (
                      <div key={questionNo} className="space-y-1">
                        <div className="text-xs text-muted-foreground">Q{questionNo}</div>
                        <Input
                          value={answers[questionNo] ?? ""}
                          onChange={(event) =>
                            setAnswers((current) => ({
                              ...current,
                              [questionNo]: event.target.value.toUpperCase().replace(/[^ABCD]/g, "").slice(0, 1),
                            }))
                          }
                          maxLength={1}
                          placeholder="A"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveAnswers} disabled={!examId || !subjectId}>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Skema OMR
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
