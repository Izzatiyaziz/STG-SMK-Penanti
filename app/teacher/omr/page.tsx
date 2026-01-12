"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Camera,
  RotateCw,
  Upload,
  Scan,
  AlertCircle,
} from "lucide-react";

export default function OMRScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);

  /* ================= ROLE GUARD ================= */
  useEffect(() => {
    const session = localStorage.getItem("stg_session");
    if (!session) {
      router.replace("/login");
      return;
    }

    const parsed = JSON.parse(session);
    if (parsed.userType !== "teacher" || parsed.role !== "subject teacher") {
      toast.error("Anda tidak dibenarkan akses OMR");
      router.replace("/teacher/dashboard");
    }
  }, [router]);

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

  /* ================= PROCESS ================= */
  async function processOMR() {
    if (!capturedImage) return;
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 2000));
    toast.success("OMR berjaya diproses!");
    router.push("/teacher/omr/results");
    setIsProcessing(false);
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
            Gunakan kamera untuk mengimbas kertas OMR pelajar. Pastikan kertas
            berada dalam bingkai dan pencahayaan mencukupi untuk hasil terbaik.
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
                    className="w-full h-[420px] object-cover"
                  />
                ) : (
                  <img
                    src={capturedImage}
                    className="w-full h-[420px] object-contain"
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

            {/* KAWALAN */}
            <Card className="shadow-lg border border-border/50">
              <CardHeader>
                <CardTitle>Kawalan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!capturedImage ? (
                  <Button
                    onClick={captureImage}
                    size="lg"
                    className="w-full"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Ambil Gambar
                  </Button>
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
                  Akses khas untuk Guru Subjek sahaja.
                </p>
              </CardContent>
            </Card>

            {/* STATISTIK */}
            <Card className="shadow-lg border border-border/50">
              <CardHeader>
                <CardTitle>Statistik</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-center">
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
