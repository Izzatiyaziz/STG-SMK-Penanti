"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
  RotateCw,
  Upload,
  Scan,
  AlertCircle,
} from "lucide-react";

type Assignment = {
  id: string;
  subject_id: string;
  subject_name: string;
  class_id: string;
  class_name: string;
  grade: number | null;
};

type Student = { id: string; name: string; identifier: string };
type Exam = { id: string; name: string; year: string };

type TemplateBundle = {
  template_width?: number;
  template_height?: number;
  template?: unknown;
};

function toId(v: unknown) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

export default function OMRScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);

  const [teacherId, setTeacherId] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [templateJson, setTemplateJson] = useState<string>("");
  const [minMarkThreshold, setMinMarkThreshold] = useState<string>("0.36");
  const [ambiguityGap, setAmbiguityGap] = useState<string>("0.10");

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
        const [aRes, eRes] = await Promise.all([
          fetch(`/api/teacher/assignments?teacher_id=${encodeURIComponent(tid)}`),
          fetch(`/api/teacher/exams`),
        ]);

        const aJson = await aRes.json();
        const eJson = await eRes.json();

        setAssignments(Array.isArray(aJson?.data) ? aJson.data : []);
        setExams(Array.isArray(eJson?.data) ? eJson.data : []);
      } catch {
        setAssignments([]);
        setExams([]);
      }
    }

    loadLookups();
  }, [teacherId]);

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
        setStudents(Array.isArray(json?.data) ? json.data : []);
        setSelectedStudentId("");
      } catch {
        setStudents([]);
        setSelectedStudentId("");
      }
    }

    loadStudents();
  }, [assignments, selectedAssignmentId]);

  /* ================= START CAMERA ================= */
  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setStream(mediaStream);
        setIsCameraActive(true);
      } catch {
        toast.error("Tidak dapat akses kamera");
        setIsCameraActive(false);
      }
    }

    startCamera();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  /* ================= CAPTURE ================= */
  function captureImage() {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    setCapturedImage(canvas.toDataURL("image/png"));
    toast.success("Gambar OMR berjaya diambil");
  }

  function handlePickImage() {
    fileInputRef.current?.click();
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

      stream?.getTracks().forEach((t) => t.stop());
      setStream(null);
      setIsCameraActive(false);
      setCapturedImage(result);
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
    let template: unknown = null;

    if (!templateJson.trim()) {
      toast.error("Sila tampal Template JSON (bundle) dahulu");
      return;
    }

    try {
      const parsed = JSON.parse(templateJson) as TemplateBundle;
      template_width = Number(parsed?.template_width ?? 1400);
      template_height = Number(parsed?.template_height ?? 2000);
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
          template,
          min_mark_threshold: Number(minMarkThreshold) || 0.36,
          ambiguity_gap: Number(ambiguityGap) || 0.1,
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

  /* ================= RESTART ================= */
  function restartCamera() {
    stream?.getTracks().forEach((t) => t.stop());
    location.reload();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ================= HEADER ================= */}
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Scan className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              OMR Scanner
            </h1>
          </div>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Gunakan kamera atau muat naik imej kertas OMR pelajar. Pastikan
            kertas berada dalam bingkai dan pencahayaan mencukupi untuk hasil terbaik.
          </p>
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
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="h-[300px] w-full object-cover sm:h-[420px]"
                  />
                ) : (
                  <img
                    src={capturedImage}
                    className="h-[300px] w-full object-contain sm:h-[420px]"
                  />
                )}

                {!isCameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="text-center space-y-3">
                      <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                      <p className="text-white">
                        Kamera tidak dapat diakses
                      </p>
                      <Button variant="outline" onClick={restartCamera}>
                        <RotateCw className="w-4 h-4 mr-2" />
                        Cuba Semula
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
            <Card className="shadow-lg border border-border/50">
              <CardHeader>
                <CardTitle>Butiran</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Kelas & Subjek</Label>
                  <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kelas & subjek" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignments.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.class_name} • {a.subject_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Peperiksaan</Label>
                  <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih peperiksaan" />
                    </SelectTrigger>
                    <SelectContent>
                      {exams.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} ({e.year})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Pelajar</Label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pelajar" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Textarea
                    value={templateJson}
                    onChange={(e) => setTemplateJson(e.target.value)}
                    placeholder='{"template_width":1400,"template_height":2000,"template":{"1":{"A":{"x":0,"y":0,"r":10},"B":...}}}'
                    className="min-h-[140px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Min Threshold</Label>
                    <Input value={minMarkThreshold} onChange={(e) => setMinMarkThreshold(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ambiguity Gap</Label>
                    <Input value={ambiguityGap} onChange={(e) => setAmbiguityGap(e.target.value)} />
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

                {!capturedImage ? (
                  <>
                    <Button
                      onClick={captureImage}
                      size="lg"
                      className="w-full"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Ambil Gambar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePickImage}
                      size="lg"
                      className="w-full"
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      Muat Naik Imej
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setCapturedImage(null)}
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
                    : "Sedia untuk mengambil gambar"}
                </p>
                <p>
                  • Pastikan semua jawapan jelas <br />
                  • Format OMR standard <br />
                  • Hasil dipaparkan dalam 2–3 saat
                </p>
                <p className="text-muted-foreground">
                  Akses khas untuk Guru Subjek dan Penyelaras Subjek.
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

        <p className="text-center text-sm text-muted-foreground">
          Sistem OMR Scanner v1.0 • Khas untuk Guru Subjek
        </p>

      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
