"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  History,
  LayoutDashboard,
  Zap,
  ZapOff,
} from "lucide-react";
import { useDocumentDetection } from "@/hooks/use-document-detection";
import { HeaderLastUpdated } from "@/components/header-last-updated";

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
  questionCount: number,
  profile: "upload" | "camera" = "upload"
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
  const baseY = profile === "camera" ? [411, 432, 453, 475, 496] : [411, 432, 453, 475, 496];
  const groupOffsets = profile === "camera" ? [0, 135, 270, 405, 540, 675] : [0, 135, 270, 405, 540, 675];
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
    answer_region: { x: 350, y: 300, width: 580, height: 900 },
    template,
  };
}

function buildAnswerRegionTemplateBundle(
  questionCount: number
): Required<Pick<TemplateBundle, "template_width" | "template_height" | "template" | "answer_region">> {
  const fullBundle = buildSpmTemplateBundle(questionCount, "camera");
  const region = fullBundle.answer_region;
  const scale = 800 / region.width;
  const template_width = 800;
  const template_height = Math.round(region.height * scale);
  const fullTemplate = fullBundle.template as Record<string, Record<"A" | "B" | "C" | "D", { x: number; y: number; r: number }>>;
  const template = Object.fromEntries(
    Object.entries(fullTemplate).map(([questionNo, options]) => [
      questionNo,
      Object.fromEntries(
        (["A", "B", "C", "D"] as const).map((option) => [
          option,
          {
            x: Math.round((options[option].x - region.x) * scale),
            y: Math.round((options[option].y - region.y) * scale),
            r: Math.round(options[option].r * scale),
          },
        ])
      ),
    ])
  );

  return {
    template_width,
    template_height,
    answer_region: { x: 0, y: 0, width: template_width, height: template_height },
    template,
  };
}

function buildAnswerGuideBubbles(questionCount: number) {
  const bundle = buildAnswerRegionTemplateBundle(questionCount);
  const template = bundle.template as Record<string, Record<"A" | "B" | "C" | "D", { x: number; y: number; r: number }>>;

  return Object.entries(template).flatMap(([questionNo, options]) =>
    (["A", "B", "C", "D"] as const).map((option) => ({
      key: `${questionNo}-${option}`,
      questionNo: Number(questionNo),
      option,
      left: (options[option].x / bundle.template_width) * 100,
      top: (options[option].y / bundle.template_height) * 100,
    }))
  );
}

type TemplateMode = "auto-spm" | "custom" | "test";

type ScanFlowState = "idle" | "warping" | "preview";
type ImageProcessingProfile = "upload" | "camera";
const MAX_OMR_IMAGE_DIMENSION = 1600;
const OMR_JPEG_QUALITY = 0.82;

function getCameraErrorMessage(error: unknown) {
  if (!window.isSecureContext) {
    return "Kamera memerlukan sambungan HTTPS yang selamat.";
  }
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Akses kamera disekat. Benarkan kamera dalam tetapan laman pelayar, kemudian cuba lagi.";
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "Tiada kamera ditemui pada peranti ini.";
    }
    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut dan cuba lagi.";
    }
  }
  return "Kamera tidak dapat diakses. Cuba semula atau guna Kamera Sistem.";
}

async function applyContinuousCameraFocus(mediaStream: MediaStream) {
  const [track] = mediaStream.getVideoTracks();
  if (!track) return;
  const capabilities = typeof track.getCapabilities === "function"
    ? track.getCapabilities() as MediaTrackCapabilities & {
      focusMode?: string[];
      exposureMode?: string[];
      whiteBalanceMode?: string[];
    }
    : null;
  const advanced: Array<Record<string, string>> = [];
  if (capabilities?.focusMode?.includes("continuous")) advanced.push({ focusMode: "continuous" });
  if (capabilities?.exposureMode?.includes("continuous")) advanced.push({ exposureMode: "continuous" });
  if (capabilities?.whiteBalanceMode?.includes("continuous")) advanced.push({ whiteBalanceMode: "continuous" });
  if (advanced.length === 0) return;

  try {
    await track.applyConstraints({ advanced } as MediaTrackConstraints);
  } catch {
    // Some mobile browsers expose capabilities but reject focus constraints.
  }
}

async function optimizeOmrImage(imageDataUrl: string) {
  const image = document.createElement("img");
  image.decoding = "async";
  image.src = imageDataUrl;
  await image.decode();

  const scale = Math.min(1, MAX_OMR_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas tidak tersedia");
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", OMR_JPEG_QUALITY);
}

function drawVideoRegionToCanvas(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  videoRect: DOMRect,
  targetRect: DOMRect
) {
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  if (!videoWidth || !videoHeight) return false;

  const displayWidth = videoRect.width;
  const displayHeight = videoRect.height;
  const videoAspect = videoWidth / videoHeight;
  const displayAspect = displayWidth / displayHeight;

  let scale = displayWidth / videoWidth;
  let renderedWidth = displayWidth;
  let renderedHeight = videoHeight * scale;
  let offsetX = 0;
  let offsetY = (displayHeight - renderedHeight) / 2;

  if (videoAspect > displayAspect) {
    scale = displayHeight / videoHeight;
    renderedWidth = videoWidth * scale;
    renderedHeight = displayHeight;
    offsetX = (displayWidth - renderedWidth) / 2;
    offsetY = 0;
  }

  const targetX = targetRect.left - videoRect.left;
  const targetY = targetRect.top - videoRect.top;
  const sourceX = Math.max(0, Math.round((targetX - offsetX) / scale));
  const sourceY = Math.max(0, Math.round((targetY - offsetY) / scale));
  const sourceWidth = Math.min(videoWidth - sourceX, Math.round(targetRect.width / scale));
  const sourceHeight = Math.min(videoHeight - sourceY, Math.round(targetRect.height / scale));

  if (sourceWidth <= 0 || sourceHeight <= 0) return false;

  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const context = canvas.getContext("2d");
  if (!context) return false;
  context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
  return true;
}

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
  const cameraViewportRef = useRef<HTMLDivElement>(null);
  const answerGuideRef = useRef<HTMLDivElement>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");
  const [imageSourceLabel, setImageSourceLabel] = useState<string>("");
  const [imageProcessingProfile, setImageProcessingProfile] = useState<ImageProcessingProfile>("camera");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"scan" | "upload">("upload");
  const [isMobileScanDevice, setIsMobileScanDevice] = useState(false);
  const [desktopScanMessage, setDesktopScanMessage] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [scanFlowState, setScanFlowState] = useState<ScanFlowState>("idle");
  const [warpedImage, setWarpedImage] = useState<string | null>(null);
  const [cornersFound, setCornersFound] = useState(false);
  const [capturedImageIsWarped, setCapturedImageIsWarped] = useState(false);
  const [capturedAnswerRegionOnly, setCapturedAnswerRegionOnly] = useState(false);
  const [autoCapture, setAutoCapture] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("stg_omr_autocapture") !== "false";
  });
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const captureInProgressRef = useRef(false);

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
  const answerGuideBubbles = useMemo(
    () => buildAnswerGuideBubbles(objectiveQuestionCount),
    [objectiveQuestionCount]
  );
  const [isTemplateMetaLoading, setIsTemplateMetaLoading] = useState(false);
  const [isApprovalLocked, setIsApprovalLocked] = useState(false);
  const [approvalLockMessage, setApprovalLockMessage] = useState("");
  const [templateMetaMessage, setTemplateMetaMessage] = useState<string>(
    "Pilih kelas, subjek, dan peperiksaan untuk jana template automatik."
  );
  const [minMarkThreshold, setMinMarkThreshold] = useState<string>("0.30");
  const [ambiguityGap, setAmbiguityGap] = useState<string>("0.06");
  const [searchRadius, setSearchRadius] = useState<string>("14");

  /* ================= ROLE GUARD ================= */
  useEffect(() => {
    const session = localStorage.getItem("stg_session");
    if (!session) { router.replace("/login"); return; }
    const parsed = JSON.parse(session);
    setTeacherId(String(parsed.user_id ?? parsed.userId ?? parsed.id ?? "").trim());
    const role = String(parsed.role ?? "").toLowerCase().trim();
    const allowedRoles = new Set(["subject teacher", "subject coordinator"]);
    if (parsed.userType !== "teacher" || !allowedRoles.has(role)) {
      toast.error("Anda tidak dibenarkan akses OMR");
      router.replace(role === "subject coordinator" ? "/coordinator/dashboard" : "/teacher/dashboard");
      return;
    }
  }, [router]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncDeviceMode = () => {
      const isMobile = mediaQuery.matches;
      setIsMobileScanDevice(isMobile);
      setActiveTab((current) => {
        if (isMobile && current === "upload") return "scan";
        if (!isMobile && current === "scan") return "upload";
        return current;
      });
      if (isMobile) setDesktopScanMessage(false);
    };

    syncDeviceMode();
    mediaQuery.addEventListener("change", syncDeviceMode);
    return () => mediaQuery.removeEventListener("change", syncDeviceMode);
  }, []);

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
      if (!tid || !examId) { setAssignments([]); setSelectedAssignmentId(""); return; }
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
          (a) => a.class_id === marksContext?.class_id && a.subject_id === marksContext?.subject_id
        );
        setSelectedAssignmentId((current) => {
          if (current && assignmentList.some((a) => a.id === current)) return current;
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
      if (!class_id) { setStudents([]); setSelectedStudentId(""); return; }
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
        setStudents([]); setSelectedStudentId("");
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
        const nextCount = Math.max(1, Math.min(MAX_SPM_TEMPLATE_QUESTIONS, Number(json?.question_count) || MAX_SPM_TEMPLATE_QUESTIONS));
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
    return () => { cancelled = true; };
  }, [assignments, selectedAssignmentId, selectedExamId, teacherId]);

  useEffect(() => {
    const assignment = assignments.find((item) => item.id === selectedAssignmentId);
    const classId = toId(assignment?.class_id);
    const subjectId = toId(assignment?.subject_id);
    const examId = toId(selectedExamId);
    if (!classId || !subjectId || !examId) {
      setIsApprovalLocked(false);
      setApprovalLockMessage("");
      return;
    }

    let cancelled = false;
    fetch(`/api/teacher/omr/status?class_id=${encodeURIComponent(classId)}&subject_id=${encodeURIComponent(subjectId)}&exam_id=${encodeURIComponent(examId)}`, {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((json) => {
        if (cancelled) return;
        setIsApprovalLocked(Boolean(json?.locked));
        setApprovalLockMessage(String(json?.message ?? ""));
      })
      .catch(() => {
        if (cancelled) return;
        setIsApprovalLocked(false);
        setApprovalLockMessage("");
      });
    return () => {
      cancelled = true;
    };
  }, [assignments, selectedAssignmentId, selectedExamId]);

  useEffect(() => {
    if (templateMode !== "auto-spm") return;
    setTemplateJson(JSON.stringify(buildSpmTemplateBundle(objectiveQuestionCount), null, 2));
  }, [objectiveQuestionCount, templateMode]);

  const stopCamera = useCallback((mediaStream?: MediaStream | null) => {
    const currentStream = mediaStream ?? streamRef.current;
    currentStream?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
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
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => undefined);
      }
      await applyContinuousCameraFocus(mediaStream);
      streamRef.current = mediaStream;
      setIsCameraActive(true);
    } catch (error) {
      console.error("OMR camera access failed:", error);
      const message = getCameraErrorMessage(error);
      setCameraError(message);
      setIsCameraActive(false);
      toast.error(message);
    } finally {
      setIsStartingCamera(false);
    }
  }, [stopCamera]);

  const refocusCamera = useCallback(async () => {
    const mediaStream = streamRef.current;
    if (!mediaStream) return;
    await applyContinuousCameraFocus(mediaStream);
    toast.message("Cuba fokus semula. Jarakkan kamera sedikit jika imej masih kabur.");
  }, []);

  useEffect(() => {
    if (activeTab === "scan" && isMobileScanDevice) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };
  }, [activeTab, isMobileScanDevice, startCamera, stopCamera]);

  async function callWarp(imageBase64: string): Promise<{ warped: string; cornersFound: boolean }> {
    try {
      const res = await fetch("/api/teacher/omr/warp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: imageBase64 }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        return { warped: imageBase64, cornersFound: false };
      }
      return { warped: json.warped_image_base64, cornersFound: !!json.corners_found };
    } catch {
      return { warped: imageBase64, cornersFound: false };
    }
  }

  const handleCaptureAndWarp = useCallback(async (rawImage: string, label: string, profile: ImageProcessingProfile) => {
    if (captureInProgressRef.current) return;
    captureInProgressRef.current = true;
    try {
      const optimizedImage = await optimizeOmrImage(rawImage);
      setCapturedImage(optimizedImage);
      setCapturedImageIsWarped(false);
      setCapturedAnswerRegionOnly(false);
      setImageSourceLabel(label);
      setImageProcessingProfile(profile);
      stopCamera();
      setScanFlowState("warping");
      const { warped, cornersFound: cf } = await callWarp(optimizedImage);
      setWarpedImage(warped);
      setCornersFound(cf);
      setScanFlowState("preview");
    } catch {
      toast.error("Gagal memproses imej");
      setScanFlowState("idle");
      setCapturedImage(null);
      setCapturedAnswerRegionOnly(false);
      startCamera();
    } finally {
      captureInProgressRef.current = false;
    }
  }, [stopCamera, startCamera]);

  const handleAnswerRegionCapture = useCallback(async (rawImage: string, label: string) => {
    if (captureInProgressRef.current) return;
    captureInProgressRef.current = true;
    try {
      const optimizedImage = await optimizeOmrImage(rawImage);
      setCapturedImage(optimizedImage);
      setCapturedImageIsWarped(true);
      setCapturedAnswerRegionOnly(true);
      setWarpedImage(null);
      setCornersFound(false);
      setImageSourceLabel(label);
      setImageProcessingProfile("camera");
      stopCamera();
      setScanFlowState("idle");
    } catch {
      toast.error("Gagal memproses imej jawapan");
      setScanFlowState("idle");
      setCapturedImage(null);
      setCapturedAnswerRegionOnly(false);
      startCamera();
    } finally {
      captureInProgressRef.current = false;
    }
  }, [stopCamera, startCamera]);

  function confirmWarp() {
    if (!warpedImage) return;
    setCapturedImage(warpedImage);
    setCapturedImageIsWarped(cornersFound);
    setCapturedAnswerRegionOnly(false);
    setScanFlowState("idle");
  }

  function retakeCapture() {
    setScanFlowState("idle");
    setCapturedImage(null);
    setCapturedImageIsWarped(false);
    setCapturedAnswerRegionOnly(false);
    setWarpedImage(null);
    captureInProgressRef.current = false;
    startCamera();
  }

  function toggleAutoCapture() {
    setAutoCapture((prev) => {
      const next = !prev;
      localStorage.setItem("stg_omr_autocapture", String(next));
      return next;
    });
  }

  const onStableCapture = useCallback(() => {
    if (!autoCapture || captureInProgressRef.current) return;
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;
    if (answerGuideRef.current) {
      const ok = drawVideoRegionToCanvas(
        video,
        canvas,
        video.getBoundingClientRect(),
        answerGuideRef.current.getBoundingClientRect()
      );
      if (!ok) return;
      const raw = canvas.toDataURL("image/png");
      void handleAnswerRegionCapture(raw, "Diambil automatik dari zon jawapan");
      return;
    }
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const raw = canvas.toDataURL("image/png");
    void handleCaptureAndWarp(raw, "Diambil automatik — kertas dikesan", "camera");
  }, [autoCapture, handleAnswerRegionCapture, handleCaptureAndWarp]);

  const { detectionState } = useDocumentDetection({
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    overlayCanvasRef: overlayCanvasRef as React.RefObject<HTMLCanvasElement>,
    enabled: isCameraActive && activeTab === "scan" && !capturedImage && scanFlowState === "idle",
    onStable: onStableCapture,
  });

  function captureImage() {
    if (!videoRef.current || !canvasRef.current) { toast.error("Kamera belum bersedia"); return; }
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");
    if (!video.videoWidth || !video.videoHeight) { toast.error("Tunggu pratonton kamera muncul dahulu"); return; }
    if (answerGuideRef.current) {
      const ok = drawVideoRegionToCanvas(
        video,
        canvas,
        video.getBoundingClientRect(),
        answerGuideRef.current.getBoundingClientRect()
      );
      if (!ok) { toast.error("Zon jawapan belum dapat dikesan pada paparan"); return; }
      const raw = canvas.toDataURL("image/png");
      void handleAnswerRegionCapture(raw, "Diambil dari zon jawapan");
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const raw = canvas.toDataURL("image/png");
    void handleCaptureAndWarp(raw, "Diambil melalui pratonton kamera", "camera");
  }

  function handlePickImage() { fileInputRef.current?.click(); }
  function handlePhoneCameraCapture() {
    cameraInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Sila pilih fail imej sahaja"); e.currentTarget.value = ""; return; }
    const isCameraFile = e.currentTarget === cameraInputRef.current;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) { toast.error("Gagal membaca fail imej"); return; }
      stopCamera();
      void handleCaptureAndWarp(
        result,
        isCameraFile ? "Diambil melalui kamera telefon" : "Dimuat naik daripada fail",
        isCameraFile ? "camera" : "upload"
      );
    };
    reader.onerror = () => { toast.error("Gagal membaca fail imej"); };
    reader.readAsDataURL(file);
    e.currentTarget.value = "";
  }

  async function processOMR() {
    if (isApprovalLocked) {
      toast.error(approvalLockMessage || "Markah telah diluluskan. Imbasan OMR tidak dibenarkan.");
      return;
    }
    if (!capturedImage) { toast.error("Sila ambil gambar atau muat naik imej terlebih dahulu"); return; }
    const assignment = assignments.find((a) => a.id === selectedAssignmentId);
    const subject_id = toId(assignment?.subject_id);
    const class_id = toId(assignment?.class_id);
    const exam_id = toId(selectedExamId);
    const student_id = toId(selectedStudentId);
    if (!teacherId || !subject_id || !class_id || !exam_id) { toast.error("Sila pilih Kelas/Subjek dan Peperiksaan dahulu"); return; }
    if (!student_id) { toast.error("Sila pilih Pelajar"); return; }

    let template_width = 1400, template_height = 2000;
    let answer_region: TemplateBundle["answer_region"] | undefined = undefined;
    let template: unknown = null;
    try {
      const parsed = (
        capturedAnswerRegionOnly
          ? buildAnswerRegionTemplateBundle(objectiveQuestionCount)
          : templateMode === "auto-spm"
          ? buildSpmTemplateBundle(objectiveQuestionCount, imageProcessingProfile)
          : templateJson.trim()
            ? JSON.parse(templateJson)
            : buildSpmTemplateBundle(objectiveQuestionCount, imageProcessingProfile)
      ) as TemplateBundle;
      template_width = Number(parsed?.template_width ?? 1400);
      template_height = Number(parsed?.template_height ?? 2000);
      answer_region = parsed?.answer_region;
      template = parsed?.template ?? parsed;
    } catch {
      toast.error("Template JSON tidak sah");
      return;
    }
    if (!template || typeof template !== "object") { toast.error("Template JSON mesti ada `template` atau peta soalan"); return; }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/teacher/omr/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_id: teacherId, student_id, subject_id, exam_id, class_id,
          image_base64: capturedImage, template_width, template_height, answer_region, template,
          already_warped: capturedImageIsWarped || capturedAnswerRegionOnly,
          processing_profile: imageProcessingProfile,
          min_mark_threshold: Number(minMarkThreshold) || 0.30,
          ambiguity_gap: Number(ambiguityGap) || 0.06,
          search_radius: Number(searchRadius) || 6,
        }),
      });
      const responseText = await res.text();
      let json: Record<string, unknown> = {};
      try {
        json = responseText ? JSON.parse(responseText) as Record<string, unknown> : {};
      } catch {
        json = {};
      }
      if (!res.ok || !json?.success) {
        const detail = typeof json?.detail === "string"
          ? json.detail
          : json?.detail && typeof json.detail === "object" && "detail" in json.detail
            ? String((json.detail as { detail?: unknown }).detail ?? "")
            : "";
        const message = typeof json?.message === "string" ? json.message : `Gagal memproses OMR (${res.status})`;
        toast.error(detail ? `${message}: ${detail}` : message);
        return;
      }
      localStorage.setItem("stg_marks_context", JSON.stringify({ class_id, subject_id, exam_id, student_id }));
      sessionStorage.setItem("stg_omr_last_result", JSON.stringify(json));
      toast.success("OMR berjaya diproses!");
      const params = new URLSearchParams({ student_id, subject_id, class_id, exam_id });
      router.push(`/teacher/omr/results?${params.toString()}`);
    } catch (error) {
      console.error("OMR request failed:", error);
      toast.error("Permintaan OMR gagal. Semak sambungan dan cuba lagi.");
    } finally {
      setIsProcessing(false);
    }
  }

  const readyToProcess = !!(selectedExamId && selectedAssignmentId && selectedStudentId && capturedImage && !isApprovalLocked);

  /* ================= SHARED DETAILS FORM ================= */
  const DetailsForm = () => (
    <div className="space-y-4 px-4 pb-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4 text-primary" />
          Peperiksaan
        </Label>
        <Select value={selectedExamId} onValueChange={(v) => { setSelectedExamId(v); setSelectedAssignmentId(""); setSelectedStudentId(""); }}>
          <SelectTrigger className="h-11 rounded-lg border-border bg-background">
            <SelectValue placeholder="Pilih peperiksaan" />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-border">
            {exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.year})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isApprovalLocked ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{approvalLockMessage || "Markah peperiksaan ini telah diluluskan. Imbasan OMR baharu tidak dibenarkan."}</span>
        </div>
      ) : null}

      {selectedExamId && assignments.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            Kelas &amp; Subjek OMR
          </Label>
          <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
            <SelectTrigger className="h-11 rounded-lg border-border bg-background">
              <SelectValue placeholder="Pilih kelas & subjek OMR" />
            </SelectTrigger>
            <SelectContent className="max-h-72 rounded-lg border-border">
              {assignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.grade ?? "-"} {a.class_name} • {a.subject_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserRound className="h-4 w-4 text-primary" />
          Pelajar
        </Label>
        <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={!selectedAssignmentId}>
          <SelectTrigger className="h-11 rounded-lg border-border bg-background">
            <SelectValue placeholder="Pilih pelajar" />
          </SelectTrigger>
          <SelectContent className="max-h-72 rounded-lg border-border">
            {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.identifier})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Template status */}
      <div className="rounded-lg border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-1.5">
          {isTemplateMetaLoading ? (
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-primary" />
          )}
          <span>{isTemplateMetaLoading ? "Membaca skema jawapan..." : templateMetaMessage}</span>
        </div>
        <div className="flex gap-2 flex-wrap mt-1">
          <Badge variant="secondary" className="text-[10px]">
            {templateMode === "auto-spm" ? "Auto Template SPM" : templateMode === "test" ? "Template Test" : "Template Custom"}
          </Badge>
          <Badge variant="outline" className="text-[10px]">{objectiveQuestionCount} Soalan</Badge>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-0 p-0 md:gap-8 md:p-6 md:p-8">
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      {/* Page header — hidden on mobile to save space */}
      <div className="hidden items-center justify-between gap-4 md:flex">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-3 shadow-sm">
            <LayoutDashboard className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Pengimbas OMR</h1>
            <p className="mt-1 font-medium text-muted-foreground">
              Muat naik imej kertas OMR pelajar. Fungsi kamera Imbas tersedia melalui telefon.
            </p>
            <HeaderLastUpdated />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/teacher/omr/history")} className="shrink-0 gap-1.5">
          <History className="h-4 w-4" />
          Sejarah Imbasan
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const nextTab = value as "scan" | "upload";
          if (nextTab === "scan" && !isMobileScanDevice) {
            setDesktopScanMessage(true);
            setActiveTab("upload");
            return;
          }
          setDesktopScanMessage(false);
          setActiveTab(nextTab);
        }}
        className="flex flex-col gap-0 md:gap-6"
      >

        {/* Tab bar — sticky on mobile */}
        <div className="sticky top-0 z-10 bg-background border-b border-border/40 px-4 py-2 md:static md:bg-transparent md:border-none md:p-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              {/* Mobile title */}
              <h1 className="text-lg font-black text-foreground md:hidden">Pengimbas OMR</h1>
              <HeaderLastUpdated className="mt-1 md:hidden" />
            </div>
            <TabsList className="h-9 rounded-lg">
              <TabsTrigger value="scan" className="gap-1.5 px-3 text-xs">
                <Camera className="h-3.5 w-3.5" />
                Imbas
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-1.5 px-3 text-xs">
                <ImageUp className="h-3.5 w-3.5" />
                Muat Naik
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {desktopScanMessage && (
          <div className="mx-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 md:mx-0 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Fungsi Imbas hanya tersedia pada telefon</p>
              <p className="mt-1 text-xs opacity-80">
                Buka halaman ini melalui telefon untuk menggunakan kamera. Pada laptop, sila gunakan pilihan Muat Naik.
              </p>
            </div>
          </div>
        )}

        {/* ========== SCAN TAB ========== */}
        <TabsContent value="scan" className="mt-0 flex flex-col gap-0 md:gap-6 md:grid md:grid-cols-3">

          {/* Camera panel — full width on mobile, 2/3 on desktop */}
          <div className="md:col-span-2 flex flex-col">

            {/* Camera viewport */}
            <div ref={cameraViewportRef} className="relative bg-black overflow-hidden md:rounded-xl md:border md:border-border/50">
              {!capturedImage ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    onClick={refocusCamera}
                    className="w-full object-cover"
                    style={{ height: "min(70dvh, 520px)" }}
                  />

                  {/* Detection overlay canvas */}
                  <canvas
                    ref={overlayCanvasRef}
                    className="pointer-events-none absolute inset-0 w-full h-full"
                  />

                  {/* Auto-capture toggle */}
                  {isCameraActive && (
                    <button
                      onClick={toggleAutoCapture}
                      className={`absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow backdrop-blur-sm transition-colors ${
                        autoCapture
                          ? "bg-green-500/80 text-white"
                          : "bg-black/50 text-white/70"
                      }`}
                    >
                      {autoCapture ? <Zap className="h-3 w-3" /> : <ZapOff className="h-3 w-3" />}
                      {autoCapture ? "Auto" : "Manual"}
                    </button>
                  )}

                  {/* Detection state indicator */}
                  {isCameraActive && (
                    <div
                      className={`absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white shadow transition-colors ${
                        detectionState === "stable" ? "bg-green-600/90" : "bg-amber-500/90"
                      }`}
                    >
                      {detectionState === "stable" ? "Kedudukan sesuai, boleh tangkap" : "Selaraskan kertas dalam penanda"}
                    </div>
                  )}

                  {/* Alignment guide */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 py-12">
                    <div
                      ref={answerGuideRef}
                      className={`relative h-full max-h-[88%] aspect-[580/900] border transition-colors ${
                        detectionState === "stable"
                          ? "border-green-400/90 bg-green-400/5"
                          : "border-white/55 bg-black/5"
                      }`}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-t-md bg-black/70 px-3 py-1 text-[10px] font-semibold tracking-wide text-white">
                        ZON JAWAPAN
                      </div>
                      {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos) => (
                        <span
                          key={pos}
                          className={`absolute ${pos} h-8 w-8 ${
                            detectionState === "stable" ? "border-green-400" : "border-white"
                          }`}
                          style={{
                            borderTopWidth: pos.includes("top") ? 4 : 0,
                            borderBottomWidth: pos.includes("bottom") ? 4 : 0,
                            borderLeftWidth: pos.includes("left") ? 4 : 0,
                            borderRightWidth: pos.includes("right") ? 4 : 0,
                          }}
                        />
                      ))}
                      <div className="absolute inset-0 rounded-sm border border-sky-300/80 bg-sky-400/5">
                        <span className="absolute left-1/2 top-2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-black/60 px-2 py-0.5 text-[9px] font-medium text-sky-100">
                          Padankan bulatan jawapan
                        </span>
                      </div>
                      <div className="absolute inset-0">
                        {answerGuideBubbles.map((bubble) => {
                          const isFirstOption = bubble.option === "A";
                          const showQuestionNo = isFirstOption && (bubble.questionNo === 1 || bubble.questionNo % 5 === 0);
                          return (
                            <span
                              key={bubble.key}
                              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border ${
                                detectionState === "stable"
                                  ? "border-green-300/95 bg-green-300/15"
                                  : "border-sky-200/85 bg-sky-300/10"
                              }`}
                              style={{
                                left: `${bubble.left}%`,
                                top: `${bubble.top}%`,
                                width: "clamp(5px, 1.6vw, 11px)",
                                height: "clamp(5px, 1.6vw, 11px)",
                              }}
                            >
                              {showQuestionNo && (
                                <span className="absolute right-full top-1/2 mr-1 -translate-y-1/2 rounded bg-black/55 px-1 text-[7px] font-semibold leading-3 text-white/90">
                                  {bubble.questionNo}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                      <div className="absolute inset-x-3 bottom-3 rounded bg-black/60 px-2 py-1 text-center text-[9px] text-white/90">
                        Pastikan semua bulatan masuk dalam kotak. Ketik preview untuk fokus semula.
                      </div>
                    </div>
                  </div>

                  {/* Camera inactive overlay */}
                  {!isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/85">
                      <div className="max-w-xs space-y-4 px-6 text-center">
                        {isStartingCamera ? (
                          <>
                            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                            <p className="text-sm font-medium text-white">Membuka kamera...</p>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
                            <div className="space-y-1">
                              <p className="font-semibold text-white">Kamera tidak aktif</p>
                              <p className="text-xs text-white/60">{cameraError || "Benarkan permission kamera untuk teruskan."}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button size="sm" onClick={startCamera} disabled={isStartingCamera}>
                                <Camera className="mr-2 h-4 w-4" />
                                Buka Kamera
                              </Button>
                              <Button variant="outline" size="sm" onClick={handlePhoneCameraCapture} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                                <Smartphone className="mr-2 h-4 w-4" />
                                Kamera Sistem
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bottom capture bar (only when camera active) */}
                  {isCameraActive && (
                    <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-6 pb-6 pt-10 bg-gradient-to-t from-black/70 to-transparent">
                      <button
                        onClick={handlePhoneCameraCapture}
                        className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
                        title="Buka kamera sistem tanpa penanda"
                      >
                        <Smartphone className="h-6 w-6" />
                        <span className="text-[10px]">Tanpa penanda</span>
                      </button>

                      {/* Main capture button */}
                      <button
                        onClick={captureImage}
                        disabled={!isCameraActive}
                        className="h-16 w-16 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl hover:bg-white/30 active:scale-95 transition-all disabled:opacity-50"
                        title="Ambil gambar"
                      >
                        <div className="h-10 w-10 rounded-full bg-white" />
                      </button>

                      <button
                        onClick={() => stopCamera()}
                        className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
                        title="Tutup kamera"
                      >
                        <CameraOff className="h-6 w-6" />
                        <span className="text-[10px]">Tutup</span>
                      </button>
                    </div>
                  )}
                </>
              ) : scanFlowState === "warping" ? (
                <div
                  className="flex flex-col items-center justify-center gap-3 bg-black"
                  style={{ minHeight: "min(70dvh, 520px)" }}
                >
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm font-medium text-white">Membetulkan perspektif...</p>
                </div>
              ) : scanFlowState === "preview" ? (
                <div className="relative" style={{ minHeight: "min(70dvh, 520px)" }}>
                  <Image
                    src={warpedImage ?? capturedImage ?? ""}
                    alt="Pratonton kertas OMR — perspektif dibetulkan"
                    width={955}
                    height={1280}
                    unoptimized
                    className="w-full object-contain bg-black"
                    style={{ maxHeight: "min(70dvh, 520px)" }}
                  />
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow backdrop-blur-sm bg-black/60">
                    {cornersFound ? "Perspektif dibetulkan — sahkan?" : "Sudut tidak dikesan — guna imej asal"}
                  </div>
                  <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-3 pb-5 pt-10 bg-gradient-to-t from-black/70 to-transparent">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                      onClick={retakeCapture}
                    >
                      <RotateCw className="mr-1.5 h-4 w-4" />
                      Ambil Semula
                    </Button>
                    <Button size="sm" onClick={confirmWarp} className="gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Guna Imej Ini
                    </Button>
                  </div>
                </div>
              ) : (
                /* Confirmed captured image view */
                <div className="relative" style={{ minHeight: "min(70dvh, 520px)" }}>
                  <Image
                    src={capturedImage}
                    alt="Pratonton kertas OMR"
                    width={1280}
                    height={960}
                    unoptimized
                    className="w-full object-contain"
                    style={{ maxHeight: "min(70dvh, 520px)" }}
                  />
                  {/* Captured overlay actions */}
                  <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-3 pb-5 pt-10 bg-gradient-to-t from-black/70 to-transparent">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                      onClick={() => { setCapturedImage(null); setImageSourceLabel(""); startCamera(); }}
                    >
                      <RotateCw className="mr-1.5 h-4 w-4" />
                      Ambil Semula
                    </Button>
                    <Button
                      size="sm"
                      onClick={processOMR}
                      disabled={isProcessing || !readyToProcess || isApprovalLocked}
                      className="gap-1.5"
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
                      {isProcessing ? "Memproses..." : "Proses OMR"}
                    </Button>
                  </div>
                  {!readyToProcess && !isProcessing && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500/90 px-3 py-1 text-[11px] font-medium text-white shadow">
                      Lengkapkan butiran di bawah
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scan guide — below camera, hidden if image captured */}
            {!capturedImage && isCameraActive && (
              <div className="hidden md:flex items-start gap-3 px-1 pt-3 text-sm text-muted-foreground">
                <Camera className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  Kamera dalam paparan ini ialah kamera telefon dengan penanda aktif. Gunakan butang tangkap bulat di tengah selepas status bertukar hijau.
                </span>
              </div>
            )}
          </div>

          {/* Right panel — details + advanced */}
          <div className="flex flex-col gap-0 md:gap-4">

            {/* Collapsible details */}
            <div className="border-t border-border/40 md:border-none">
              <button
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground md:hidden"
                onClick={() => setDetailsOpen((v) => !v)}
              >
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Butiran Imbasan
                  {readyToProcess && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </span>
                {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              <div className={detailsOpen ? "block" : "hidden md:block"}>
                {/* Desktop card wrapper */}
                <Card className="hidden md:block shadow-sm border border-border/50 rounded-xl overflow-hidden">
                  <CardHeader className="border-b border-border px-6 py-4">
                    <CardTitle className="flex items-center gap-2 text-base font-bold">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      Butiran Imbasan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <DetailsForm />
                  </CardContent>
                </Card>
                {/* Mobile — no card wrapper */}
                <div className="md:hidden">
                  <DetailsForm />
                </div>
              </div>
            </div>

            {/* Process button (mobile sticky at bottom when image captured) */}
            {capturedImage && (
              <div className="md:hidden sticky bottom-0 z-10 border-t border-border/40 bg-background/95 backdrop-blur px-4 py-3">
                <Button
                  onClick={processOMR}
                  disabled={isProcessing || !readyToProcess || isApprovalLocked}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Scan className="h-5 w-5" />}
                  {isProcessing ? "Memproses OMR..." : "Proses OMR"}
                </Button>
                {!readyToProcess && (
                  <p className="mt-1.5 text-center text-xs text-muted-foreground">Lengkapkan butiran di atas dahulu</p>
                )}
              </div>
            )}

            {/* Advanced settings — collapsible */}
            <div className="border-t border-border/40 md:border-none">
              <button
                className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                onClick={() => setAdvancedOpen((v) => !v)}
              >
                <span>Tetapan Lanjutan</span>
                {advancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {advancedOpen && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Min Threshold</Label>
                      <Input value={minMarkThreshold} onChange={(e) => setMinMarkThreshold(e.target.value)} className="h-9 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ambiguity Gap</Label>
                      <Input value={ambiguityGap} onChange={(e) => setAmbiguityGap(e.target.value)} className="h-9 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Search Radius</Label>
                      <Input value={searchRadius} onChange={(e) => setSearchRadius(e.target.value)} className="h-9 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Template JSON</Label>
                      <div className="flex gap-1.5">
                        <Button
                          type="button" variant="outline" size="sm" className="h-7 text-[11px] px-2"
                          onClick={() => {
                            setTemplateMode("auto-spm");
                            setTemplateJson(JSON.stringify(buildSpmTemplateBundle(objectiveQuestionCount), null, 2));
                            toast.success(`Template SPM ${objectiveQuestionCount} dimuatkan`);
                          }}
                        >Auto SPM</Button>
                        <Button
                          type="button" variant="outline" size="sm" className="h-7 text-[11px] px-2"
                          onClick={async () => {
                            try {
                              const res = await fetch("/omr-test-template-10q.json", { cache: "no-store" });
                              const txt = await res.text();
                              setTemplateMode("test");
                              setTemplateJson(txt);
                              toast.success("Template test dimuatkan");
                            } catch {
                              toast.error("Gagal memuatkan template test");
                            }
                          }}
                        >Test</Button>
                      </div>
                    </div>
                    <Textarea
                      value={templateJson}
                      onChange={(e) => { setTemplateMode("custom"); setTemplateJson(e.target.value); }}
                      placeholder='{"template_width":955,"template_height":1280,...}'
                      className="min-h-[120px] font-mono text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
        </TabsContent>

        {/* ========== UPLOAD TAB ========== */}
        <TabsContent value="upload" className="mt-0 md:grid md:grid-cols-3 md:gap-6">

          {/* Upload zone */}
          <div className="md:col-span-2">
            <div className="m-4 md:m-0">
              {!capturedImage ? (
                <div
                  className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border bg-card px-6 py-16 text-center hover:border-primary/40 transition-colors cursor-pointer"
                  onClick={handlePickImage}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">Muat naik imej OMR</p>
                    <p className="text-sm text-muted-foreground">Ketik untuk pilih fail imej daripada peranti</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, JPEG — sehingga 20MB</p>
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" size="sm" className="gap-2">
                      <ImageUp className="h-4 w-4" />
                      Pilih Fail
                    </Button>
                  </div>
                </div>
              ) : (
                <Card className="shadow-sm border border-border/50 rounded-xl overflow-hidden">
                  <CardHeader className="border-b border-border px-6 py-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Imej Sedia Diproses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <Image
                      src={capturedImage}
                      alt="Pratonton kertas OMR"
                      width={1280}
                      height={960}
                      unoptimized
                      className="w-full rounded-lg object-contain max-h-[400px] bg-black"
                    />
                    {imageSourceLabel && (
                      <p className="text-xs text-muted-foreground text-center">{imageSourceLabel}</p>
                    )}
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => { setCapturedImage(null); setImageSourceLabel(""); setWarpedImage(null); setScanFlowState("idle"); captureInProgressRef.current = false; }}>
                        <RotateCw className="h-4 w-4" />
                        Ganti Imej
                      </Button>
                      <Button className="flex-1 gap-2" onClick={processOMR} disabled={isProcessing || !readyToProcess || isApprovalLocked}>
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
                        {isProcessing ? "Memproses..." : "Proses OMR"}
                      </Button>
                    </div>
                    {!readyToProcess && (
                      <p className="text-center text-xs text-amber-600">Lengkapkan butiran di sebelah kanan dahulu</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Upload details panel */}
          <div className="px-4 pb-4 md:p-0">
            <Card className="shadow-sm border border-border/50 rounded-xl overflow-hidden">
              <CardHeader className="border-b border-border px-6 py-4">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Butiran
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DetailsForm />
              </CardContent>
            </Card>
          </div>

        </TabsContent>
      </Tabs>
    </div>
  );
}
