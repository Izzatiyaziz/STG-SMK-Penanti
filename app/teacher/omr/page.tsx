"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  CameraOff,
  RotateCw,
  Upload,
  Scan,
  AlertCircle,
  BookOpen,
  ClipboardList,
  ImageUp,
  Smartphone,
  UserRound,
} from "lucide-react";

type Assignment = {
  id: string;
  subject_id: string;
  subject_name: string;
  class_id: string;
  class_name: string;
  grade: number | null;
  omr_component_label?: string;
  omr_question_count?: number | null;
};

type Student = { id: string; name: string; identifier: string };
type Exam = { id: string; name: string; year: string };

type TemplateBundle = {
  template_width?: number;
  template_height?: number;
  answer_region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  template?: unknown;
  answer_key?: Record<string, string>;
};

const MAX_SPM_TEMPLATE_QUESTIONS = 80;

function buildSpmTemplateBundle(
  questionCount: number
): Required<Pick<TemplateBundle, "template_width" | "template_height" | "template" | "answer_region">> {
  const safeQuestionCount = Math.max(
    1,
    Math.min(MAX_SPM_TEMPLATE_QUESTIONS, Math.floor(questionCount || MAX_SPM_TEMPLATE_QUESTIONS))
  );
  const template_width = 955;
  const template_height = 1280;
  const optionX = [
    { A: 389, B: 429, C: 469, D: 508 },
    { A: 592, B: 633, C: 673, D: 713 },
    { A: 795, B: 835, C: 877, D: 917 },
  ] as const;
  const baseY = [320, 343, 366, 388, 410];
  const groupOffsets = [0, 156, 312, 468, 623, 778];
  const rowY = groupOffsets.flatMap((offset) => baseY.map((y) => y + offset));
  const radius = 11;

  const template = Object.fromEntries(
    Array.from({ length: safeQuestionCount }, (_, index) => {
      const questionNo = index + 1;
      const col = questionNo <= 30 ? 0 : questionNo <= 60 ? 1 : 2;
      const row =
        questionNo <= 30
          ? questionNo - 1
          : questionNo <= 60
            ? questionNo - 31
            : questionNo - 61;
      return [
        String(questionNo),
        {
          A: { x: optionX[col].A, y: rowY[row], r: radius },
          B: { x: optionX[col].B, y: rowY[row], r: radius },
          C: { x: optionX[col].C, y: rowY[row], r: radius },
          D: { x: optionX[col].D, y: rowY[row], r: radius },
        },
      ];
    })
  );

  return {
    template_width,
    template_height,
    answer_region: {
      x: 350,
      y: 300,
      width: 580,
      height: 900,
    },
    template,
  };
}

type TemplateMode = "auto-spm" | "custom" | "test";

function toId(v: unknown) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function readMarksContext() {
  try {
    const raw = localStorage.getItem("stg_marks_context");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      class_id?: string;
      subject_id?: string;
      exam_id?: string;
      student_id?: string;
    };
    return {
      class_id: toId(parsed.class_id),
      subject_id: toId(parsed.subject_id),
      exam_id: toId(parsed.exam_id),
      student_id: toId(parsed.student_id),
    };
  } catch {
    return null;
  }
}

export default function OMRScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");
  const [imageSourceLabel, setImageSourceLabel] = useState<string>("");

  const [teacherId, setTeacherId] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [templateJson, setTemplateJson] = useState<string>("");
  const [templateMode, setTemplateMode] = useState<TemplateMode>("auto-spm");
  const [objectiveQuestionCount, setObjectiveQuestionCount] = useState<number>(MAX_SPM_TEMPLATE_QUESTIONS);
  const [isTemplateMetaLoading, setIsTemplateMetaLoading] = useState(false);
  const [templateMetaMessage, setTemplateMetaMessage] = useState<string>(
    "Pilih kelas, subjek, dan peperiksaan untuk jana template automatik."
  );
  const [minMarkThreshold, setMinMarkThreshold] = useState<string>("0.32");
  const [ambiguityGap, setAmbiguityGap] = useState<string>("0.08");
  const [searchRadius, setSearchRadius] = useState<string>("8");

  /* ================= ROLE GUARD ================= */
  useEffect(() => {
    const session = localStorage.getItem("stg_session");
    if (!session) {
      router.replace("/login");
      return;
    }

    const parsed = JSON.parse(session);
    setTeacherId(String(parsed.user_id ?? parsed.userId ?? parsed.id ?? "").trim());
    const role = String(parsed.role ?? "").toLowerCase().trim();
    const allowedRoles = new Set(["subject teacher", "subject coordinator"]);
    if (parsed.userType !== "teacher" || !allowedRoles.has(role)) {
      toast.error("Anda tidak dibenarkan akses OMR");
      router.replace(
        role === "subject coordinator"
          ? "/coordinator/dashboard"
          : "/teacher/dashboard"
      );
      return;
    }

  }, [router]);

  useEffect(() => {
    async function loadLookups() {
      const tid = teacherId.trim();
      if (!tid) return;

      try {
        const eRes = await fetch(`/api/teacher/exams`);
        const eJson = await eRes.json();
        const examList: Exam[] = Array.isArray(eJson?.data) ? eJson.data : [];
        const marksContext = readMarksContext();

        setExams(examList);

        if (marksContext?.exam_id && examList.some((e) => e.id === marksContext.exam_id)) {
          setSelectedExamId(marksContext.exam_id);
        }
      } catch {
        setAssignments([]);
        setExams([]);
      }
    }

    loadLookups();
  }, [teacherId]);

  useEffect(() => {
    async function loadOmrAssignments() {
      const tid = teacherId.trim();
      const examId = selectedExamId.trim();

      if (!tid || !examId) {
        setAssignments([]);
        setSelectedAssignmentId("");
        return;
      }

      try {
        const res = await fetch(
          `/api/teacher/omr/assignments?teacher_id=${encodeURIComponent(tid)}&exam_id=${encodeURIComponent(examId)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        const assignmentList: Assignment[] = Array.isArray(json?.data) ? json.data : [];
        const marksContext = readMarksContext();

        setAssignments(assignmentList);

        const contextAssignment = assignmentList.find(
          (assignment) =>
            assignment.class_id === marksContext?.class_id &&
            assignment.subject_id === marksContext?.subject_id
        );

        setSelectedAssignmentId((current) => {
          if (current && assignmentList.some((assignment) => assignment.id === current)) return current;
          return contextAssignment?.id ?? "";
        });
      } catch {
        setAssignments([]);
        setSelectedAssignmentId("");
      }
    }

    loadOmrAssignments();
  }, [teacherId, selectedExamId]);

  useEffect(() => {
    async function loadStudents() {
      const assignment = assignments.find((a) => a.id === selectedAssignmentId);
      const class_id = toId(assignment?.class_id);
      if (!class_id) {
        setStudents([]);
        setSelectedStudentId("");
        return;
      }

      try {
        const res = await fetch(`/api/teacher/students?class_id=${encodeURIComponent(class_id)}`);
        const json = await res.json();
        const studentList: Student[] = Array.isArray(json?.data) ? json.data : [];
        const marksContext = readMarksContext();
        setStudents(studentList);
        setSelectedStudentId(
          marksContext?.student_id && studentList.some((s) => s.id === marksContext.student_id)
            ? marksContext.student_id
            : ""
        );
      } catch {
        setStudents([]);
        setSelectedStudentId("");
      }
    }

    loadStudents();
  }, [assignments, selectedAssignmentId]);

  useEffect(() => {
    const assignment = assignments.find((a) => a.id === selectedAssignmentId);
    const subject_id = toId(assignment?.subject_id);
    const class_id = toId(assignment?.class_id);
    const exam_id = toId(selectedExamId);

    if (!teacherId || !subject_id || !class_id || !exam_id) {
      setIsTemplateMetaLoading(false);
      setObjectiveQuestionCount(MAX_SPM_TEMPLATE_QUESTIONS);
      setTemplateMetaMessage("Pilih kelas, subjek, dan peperiksaan untuk jana template automatik.");
      return;
    }

    let cancelled = false;

    async function loadTemplateMeta() {
      setIsTemplateMetaLoading(true);
      try {
        const res = await fetch(
          `/api/teacher/omr/template?exam_id=${encodeURIComponent(exam_id)}&subject_id=${encodeURIComponent(subject_id)}&class_id=${encodeURIComponent(class_id)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (cancelled) return;

        if (!res.ok || !json?.success) {
          setObjectiveQuestionCount(MAX_SPM_TEMPLATE_QUESTIONS);
          setTemplateMetaMessage(json?.message || "Gagal membaca skema jawapan.");
          return;
        }

        const nextCount = Math.max(
          1,
          Math.min(MAX_SPM_TEMPLATE_QUESTIONS, Number(json?.question_count) || MAX_SPM_TEMPLATE_QUESTIONS)
        );
        setObjectiveQuestionCount(nextCount);
        setTemplateMetaMessage(
          json?.has_answer_scheme
            ? `Template automatik ikut skema jawapan: ${nextCount} soalan objektif.`
            : `Skema jawapan belum lengkap. Template automatik sementara guna ${nextCount} soalan.`
        );
      } catch {
        if (cancelled) return;
        setObjectiveQuestionCount(MAX_SPM_TEMPLATE_QUESTIONS);
        setTemplateMetaMessage("Gagal membaca skema jawapan.");
      } finally {
        if (!cancelled) setIsTemplateMetaLoading(false);
      }
    }

    loadTemplateMeta();
    return () => {
      cancelled = true;
    };
  }, [assignments, selectedAssignmentId, selectedExamId, teacherId]);

  useEffect(() => {
    if (templateMode !== "auto-spm") return;
    setTemplateJson(JSON.stringify(buildSpmTemplateBundle(objectiveQuestionCount), null, 2));
  }, [objectiveQuestionCount, templateMode]);

  const stopCamera = useCallback((mediaStream?: MediaStream | null) => {
    const currentStream = mediaStream ?? streamRef.current;
    currentStream?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Browser ini tidak menyokong pratonton kamera. Guna butang Kamera Telefon.");
      setIsCameraActive(false);
      return;
    }

    stopCamera();
    setIsStartingCamera(true);
    setCameraError("");

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => undefined);
      }

      streamRef.current = mediaStream;
      setIsCameraActive(true);
    } catch (error) {
      console.error("OMR camera access failed:", error);
      setCameraError(
        "Kamera tidak dapat diakses. Benarkan permission kamera atau guna Kamera Telefon."
      );
      setIsCameraActive(false);
      toast.error("Tidak dapat akses kamera");
    } finally {
      setIsStartingCamera(false);
    }
  }, [stopCamera]);

  /* ================= START CAMERA ================= */
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  /* ================= CAPTURE ================= */
  function captureImage() {
    if (!videoRef.current || !canvasRef.current) {
      toast.error("Kamera belum bersedia");
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    if (!video.videoWidth || !video.videoHeight) {
      toast.error("Tunggu pratonton kamera muncul dahulu");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    setCapturedImage(canvas.toDataURL("image/png"));
    setImageSourceLabel("Diambil melalui pratonton kamera");
    stopCamera();
    toast.success("Gambar OMR berjaya diambil");
  }

  function handlePickImage() {
    fileInputRef.current?.click();
  }

  function handlePhoneCameraCapture() {
    cameraInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Sila pilih fail imej sahaja");
      e.currentTarget.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) {
        toast.error("Gagal membaca fail imej");
        return;
      }

      stopCamera();
      setCapturedImage(result);
      setImageSourceLabel(
        e.currentTarget === cameraInputRef.current
          ? "Diambil melalui kamera telefon"
          : "Dimuat naik daripada fail"
      );
      toast.success("Imej OMR berjaya dimuat naik");
    };
    reader.onerror = () => {
      toast.error("Gagal membaca fail imej");
    };
    reader.readAsDataURL(file);
    e.currentTarget.value = "";
  }

  /* ================= PROCESS ================= */
  async function processOMR() {
    if (!capturedImage) {
      toast.error("Sila ambil gambar atau muat naik imej terlebih dahulu");
      return;
    }

    const assignment = assignments.find((a) => a.id === selectedAssignmentId);
    const subject_id = toId(assignment?.subject_id);
    const class_id = toId(assignment?.class_id);
    const exam_id = toId(selectedExamId);
    const student_id = toId(selectedStudentId);

    if (!teacherId || !subject_id || !class_id || !exam_id) {
      toast.error("Sila pilih Kelas/Subjek dan Peperiksaan dahulu");
      return;
    }
    if (!student_id) {
      toast.error("Sila pilih Pelajar");
      return;
    }

    let template_width = 1400;
    let template_height = 2000;
    let answer_region: TemplateBundle["answer_region"] | undefined = undefined;
    let template: unknown = null;

    try {
      const parsed = (templateJson.trim()
        ? JSON.parse(templateJson)
        : buildSpmTemplateBundle(objectiveQuestionCount)) as TemplateBundle;
      template_width = Number(parsed?.template_width ?? 1400);
      template_height = Number(parsed?.template_height ?? 2000);
      answer_region = parsed?.answer_region;
      template = parsed?.template ?? parsed;
    } catch {
      toast.error("Template JSON tidak sah");
      return;
    }

    if (!template || typeof template !== "object") {
      toast.error("Template JSON mesti ada `template` atau peta soalan");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/teacher/omr/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_id: teacherId,
          student_id,
          subject_id,
          exam_id,
          class_id,
          image_base64: capturedImage,
          template_width,
          template_height,
          answer_region,
          template,
          min_mark_threshold: Number(minMarkThreshold) || 0.32,
          ambiguity_gap: Number(ambiguityGap) || 0.08,
          search_radius: Number(searchRadius) || 8,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.message || "Gagal memproses OMR");
        return;
      }

      localStorage.setItem(
        "stg_marks_context",
        JSON.stringify({
          class_id,
          subject_id,
          exam_id,
        })
      );
      sessionStorage.setItem("stg_omr_last_result", JSON.stringify(json));
      toast.success("OMR berjaya diproses!");
      router.push("/teacher/omr/results");
    } catch {
      toast.error("Gagal menghubungi server OMR");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ================= HEADER ================= */}
        <div>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Scan className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Pengimbas OMR
                </h1>
                <p className="text-muted-foreground mt-1 max-w-2xl">
                  Gunakan kamera atau muat naik imej kertas OMR pelajar. Template SPM
                  akan dijana ikut jumlah soalan objektif dalam skema jawapan.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {templateMode === "auto-spm"
                  ? "Auto Template SPM"
                  : templateMode === "test"
                    ? "Template Test"
                    : "Template Custom"}
              </Badge>
              <Badge variant="outline">{objectiveQuestionCount} Soalan</Badge>
            </div>
          </div>
        </div>

        {/* ================= CONTENT ================= */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* CAMERA */}
          <Card className="lg:col-span-2 shadow-lg border border-border/50">
            <CardHeader>
              <CardTitle>Pratonton Kamera</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="relative rounded-xl overflow-hidden border bg-black">
                {!capturedImage ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="h-[300px] w-full object-cover sm:h-[420px]"
                    />
                    {/* Sheet alignment guide */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div
                        className="border-2 border-dashed border-white/60 rounded-sm"
                        style={{ width: "72%", height: "88%" }}
                      >
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/60 px-2 py-0.5 text-[11px] text-white/80">
                          Letak kertas dalam bingkai
                        </div>
                        {/* Corner markers */}
                        {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos) => (
                          <span
                            key={pos}
                            className={`absolute ${pos} h-4 w-4 border-white`}
                            style={{
                              borderTopWidth: pos.includes("top") ? 3 : 0,
                              borderBottomWidth: pos.includes("bottom") ? 3 : 0,
                              borderLeftWidth: pos.includes("left") ? 3 : 0,
                              borderRightWidth: pos.includes("right") ? 3 : 0,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <Image
                    src={capturedImage}
                    alt="Pratonton kertas OMR yang telah diambil"
                    width={1280}
                    height={960}
                    unoptimized
                    className="h-[300px] w-full object-contain sm:h-[420px]"
                  />
                )}

                {!capturedImage && !isCameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="max-w-sm space-y-3 px-6 text-center">
                      <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                      <div className="space-y-1">
                        <p className="font-medium text-white">
                          Kamera langsung belum aktif
                        </p>
                        <p className="text-sm text-white/70">
                          {cameraError || "Tekan Buka Kamera atau guna Kamera Telefon untuk ambil gambar terus."}
                        </p>
                      </div>
                      <Button variant="outline" onClick={startCamera} disabled={isStartingCamera}>
                        <RotateCw className="w-4 h-4 mr-2" />
                        {isStartingCamera ? "Membuka..." : "Buka Kamera"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* ================= PANDUAN ================= */}
              {!capturedImage && (
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <h3 className="font-semibold mb-2 text-accent flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Panduan Pengimbasan
                  </h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <li>• Pastikan kertas dalam bingkai</li>
                    <li>• Pencahayaan mencukupi</li>
                    <li>• Kertas rata tanpa lipatan</li>
                    <li>• Elakkan bayang pada kertas</li>
                  </ul>
                </div>
              )}

            </CardContent>
          </Card>

          {/* RIGHT PANEL */}
          <div className="space-y-6">

            {/* DETAILS */}
            <Card className="overflow-hidden rounded-xl border-border bg-card shadow-md">
              <CardHeader className="border-b border-border px-6 py-5">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Butiran
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <div className={selectedExamId && assignments.length > 0 ? "space-y-2" : "hidden"}>
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Kelas & Subjek OMR
                  </Label>
                  <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                    <SelectTrigger className="h-11 rounded-lg border-border bg-background">
                      <SelectValue placeholder="Pilih kelas & subjek OMR" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 rounded-lg border-border">
                      {assignments.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                         {a.grade ?? "-"} {a.class_name} • {a.subject_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    Peperiksaan
                  </Label>
                  <Select
                    value={selectedExamId}
                    onValueChange={(value) => {
                      setSelectedExamId(value);
                      setSelectedAssignmentId("");
                      setSelectedStudentId("");
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-lg border-border bg-background">
                      <SelectValue placeholder="Pilih peperiksaan" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-border">
                      {exams.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} ({e.year})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <UserRound className="h-4 w-4 text-primary" />
                    Pelajar
                  </Label>
                  <Select
                    value={selectedStudentId}
                    onValueChange={setSelectedStudentId}
                    disabled={!selectedAssignmentId}
                  >
                    <SelectTrigger className="h-11 rounded-lg border-border bg-background">
                      <SelectValue placeholder="Pilih pelajar" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 rounded-lg border-border">
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.identifier})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Template JSON (Bundle)</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTemplateMode("auto-spm");
                          setTemplateJson(JSON.stringify(buildSpmTemplateBundle(objectiveQuestionCount), null, 2));
                          toast.success(`Template SPM ${objectiveQuestionCount} dimuatkan`);
                        }}
                      >
                        Auto SPM
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const res = await fetch("/omr-test-template-10q.json", {
                              cache: "no-store",
                            });
                            const txt = await res.text();
                            setTemplateMode("test");
                            setTemplateJson(txt);
                            toast.success("Template test dimuatkan");
                          } catch {
                            toast.error("Gagal memuatkan template test");
                          }
                        }}
                      >
                        Load Test Template
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={templateJson}
                    onChange={(e) => {
                      setTemplateMode("custom");
                      setTemplateJson(e.target.value);
                    }}
                    placeholder='{"template_width":955,"template_height":1280,"template":{"1":{"A":{"x":0,"y":0,"r":10},"B":...}}}'
                    className="min-h-[180px] font-mono text-xs"
                  />
                  <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                    <p>{isTemplateMetaLoading ? "Membaca skema jawapan..." : templateMetaMessage}</p>
                    <p>
                      Template auto hanya jana koordinat untuk soalan yang wujud dalam skema
                      jawapan semasa, hingga maksimum {MAX_SPM_TEMPLATE_QUESTIONS} soalan.
                    </p>
                    <p>
                      Kawasan bacaan dihadkan pada blok jawapan objektif sahaja. Tanda hitam
                      di bahagian lain kertas tidak patut mempengaruhi semakan OMR.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Min Threshold</Label>
                    <Input value={minMarkThreshold} onChange={(e) => setMinMarkThreshold(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ambiguity Gap</Label>
                    <Input value={ambiguityGap} onChange={(e) => setAmbiguityGap(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Search Radius</Label>
                    <Input value={searchRadius} onChange={(e) => setSearchRadius(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KAWALAN */}
            <Card className="shadow-lg border border-border/50">
              <CardHeader>
                <CardTitle>Kawalan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {!capturedImage ? (
                  <>
                    <Button
                      onClick={captureImage}
                      size="lg"
                      className="w-full"
                      disabled={!isCameraActive || isStartingCamera}
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Ambil Gambar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handlePhoneCameraCapture}
                      size="lg"
                      className="w-full"
                    >
                      <Smartphone className="w-5 h-5 mr-2" />
                      Kamera Telefon
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={isCameraActive ? () => stopCamera() : startCamera}
                      size="lg"
                      className="w-full"
                      disabled={isStartingCamera}
                    >
                      {isCameraActive ? (
                        <CameraOff className="w-5 h-5 mr-2" />
                      ) : (
                        <Camera className="w-5 h-5 mr-2" />
                      )}
                      {isStartingCamera
                        ? "Membuka Kamera..."
                        : isCameraActive
                          ? "Tutup Pratonton"
                          : "Buka Pratonton"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePickImage}
                      size="lg"
                      className="w-full"
                    >
                      <ImageUp className="w-5 h-5 mr-2" />
                      Muat Naik Imej
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCapturedImage(null);
                        setImageSourceLabel("");
                      }}
                      size="lg"
                      className="w-full"
                    >
                      <RotateCw className="w-5 h-5 mr-2" />
                      Ambil Semula
                    </Button>

                    <Button
                      onClick={processOMR}
                      size="lg"
                      className="w-full"
                      disabled={isProcessing}
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      {isProcessing ? "Memproses..." : "Proses OMR"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* INFO OMR */}
            <Card className="shadow-lg border border-border/50">
              <CardHeader>
                <CardTitle>Maklumat OMR</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  <b>Status Imbasan:</b>{" "}
                  {capturedImage
                    ? "Gambar sedia diproses"
                    : isCameraActive
                      ? "Pratonton kamera aktif"
                      : "Sedia untuk kamera telefon atau muat naik"}
                </p>
                {imageSourceLabel && (
                  <p>
                    <b>Sumber Imej:</b> {imageSourceLabel}
                  </p>
                )}
                <p>
                  <b>Kamera:</b>{" "}
                  {isStartingCamera
                    ? "Membuka kamera..."
                    : isCameraActive
                      ? "Aktif"
                      : "Tidak aktif"}
                </p>
                <p>
                  <b>Template Aktif:</b>{" "}
                  {templateMode === "auto-spm"
                    ? `SPM automatik (${objectiveQuestionCount} soalan)`
                    : templateMode === "test"
                      ? "Template test"
                      : "Template custom"}
                </p>
                <p>
                  • Pastikan semua jawapan jelas <br />
                  • Format OMR standard <br />
                  • Hasil dipaparkan dalam 2–3 saat
                </p>
                <p className="text-muted-foreground">
                  Akses khas untuk Guru Subjek dan Panitia Subjek.
                </p>
              </CardContent>
            </Card>

            {/* STATISTIK */}
            <Card className="shadow-lg border border-border/50">
              <CardHeader>
                <CardTitle>Statistik</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 text-center sm:grid-cols-2">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-primary">0</div>
                  <div className="text-xs text-muted-foreground">
                    Imbasan Hari Ini
                  </div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-secondary">0</div>
                  <div className="text-xs text-muted-foreground">
                    Imbasan Berjaya
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
