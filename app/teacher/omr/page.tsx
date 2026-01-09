"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
    Camera,
    RotateCw,
    Scan,
    Upload,
    ArrowLeft,
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

        // 🔥 ONLY SUBJECT TEACHER CAN ACCESS OMR
        if (
            parsed.userType !== "teacher" ||
            parsed.role !== "subject teacher"
        ) {
            toast.error("Anda tidak dibenarkan akses OMR");
            router.replace("/teacher/dashboard");
            return;
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
            } catch (err) {
                console.error(err);
                toast.error("Tidak dapat akses kamera");
                setIsCameraActive(false);
            }
        }

        startCamera();

        return () => {
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, []);

    /* ================= CAPTURE IMAGE ================= */
    function captureImage() {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = canvas.toDataURL("image/png");
        setCapturedImage(imageData);

        toast.success("Gambar OMR berjaya diambil");
    }

    /* ================= PROCESS OMR ================= */
    async function processOMR() {
        if (!capturedImage) return;

        setIsProcessing(true);

        try {
            // Simulate processing delay
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Here you would typically send to backend
            // const response = await fetch("/api/process-omr", {
            //     method: "POST",
            //     body: JSON.stringify({ image: capturedImage })
            // });

            toast.success("OMR berjaya diproses!");

            // Navigate to results page or show modal
            router.push("/teacher/omr/results");
        } catch (error) {
            toast.error("Gagal memproses OMR");
        } finally {
            setIsProcessing(false);
        }
    }

    /* ================= RESTART CAMERA ================= */
    function restartCamera() {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
        }

        async function restart() {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" },
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }

                setStream(mediaStream);
                setIsCameraActive(true);
            } catch (err) {
                console.error(err);
                toast.error("Tidak dapat memulakan kamera");
                setIsCameraActive(false);
            }
        }

        restart();
    }

    return (
        <div className="min-h-screen bg-linear-to-b from-background to-muted/20 p-4 md:p-6">
            {/* HEADER */}
            <div className="mb-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Scan className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold font-serif">
                            OMR Scanner
                        </h1>
                    </div>
                    <p className="text-muted-foreground max-w-2xl">
                        Gunakan kamera untuk mengimbas kertas OMR pelajar.
                        Pastikan kertas berada dalam bingkai dan pencahayaan
                        mencukupi untuk hasil terbaik.
                    </p>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* LEFT PANEL - CAMERA PREVIEW */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">
                                Pratonton Kamera
                            </h2>
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-3 h-3 rounded-full ${
                                        isCameraActive
                                            ? "bg-secondary animate-pulse"
                                            : "bg-destructive"
                                    }`}
                                />
                                <span className="text-sm text-muted-foreground">
                                    {isCameraActive
                                        ? "Kamera Aktif"
                                        : "Kamera Tidak Aktif"}
                                </span>
                            </div>
                        </div>

                        {/* CAMERA VIEW */}
                        <div className="relative rounded-xl overflow-hidden border-2 border-border bg-black">
                            {!capturedImage ? (
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full h-[500px] object-cover"
                                    />
                                    {/* SCAN FRAME GUIDES */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-2 border-secondary/50 rounded-lg shadow-lg" />
                                        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-2 border-dashed border-secondary/30 animate-pulse" />
                                    </div>
                                </>
                            ) : (
                                <div className="relative">
                                    <img
                                        src={capturedImage}
                                        alt="Captured OMR"
                                        className="w-full h-[500px] object-contain"
                                    />
                                    <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent pointer-events-none" />
                                </div>
                            )}

                            {/* CAMERA STATUS OVERLAY */}
                            {!isCameraActive && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                                    <div className="text-center space-y-4">
                                        <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
                                        <div>
                                            <p className="text-white font-semibold">
                                                Kamera Tidak Dapat Diakses
                                            </p>
                                            <p className="text-white/70 text-sm mt-1">
                                                Sila pastikan kamera dibenarkan
                                                dan cuba semula
                                            </p>
                                        </div>
                                        <Button
                                            onClick={restartCamera}
                                            variant="outline"
                                            className="border-white text-white"
                                        >
                                            <RotateCw className="w-4 h-4 mr-2" />
                                            Cuba Semula
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* CAPTURE GUIDELINES */}
                        {!capturedImage && (
                            <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
                                <h3 className="font-semibold mb-2 text-accent flex items-center gap-2">
                                    <Camera className="w-4 h-4" />
                                    Panduan Pengimbasan
                                </h3>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-accent" />
                                        Pastikan kertas dalam bingkai
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-accent" />
                                        Pencahayaan yang mencukupi
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-accent" />
                                        Kertas rata tanpa lipatan
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-accent" />
                                        Elakkan bayang pada kertas
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL - CONTROLS & INFO */}
                <div className="space-y-6">
                    {/* ACTION PANEL */}
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                        <h2 className="text-xl font-semibold mb-6">Kawalan</h2>

                        <div className="space-y-4">
                            {!capturedImage ? (
                                <Button
                                    onClick={captureImage}
                                    size="lg"
                                    className="w-full bg-primary hover:bg-primary/90 h-14 text-lg shadow-md"
                                    disabled={!isCameraActive}
                                >
                                    <Camera className="w-5 h-5 mr-2" />
                                    Ambil Gambar
                                </Button>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        <Button
                                            variant="secondary"
                                            onClick={() =>
                                                setCapturedImage(null)
                                            }
                                            size="lg"
                                            className="w-full h-14 bg-secondary/10 hover:bg-secondary/20 border border-secondary/20"
                                        >
                                            <RotateCw className="w-5 h-5 mr-2" />
                                            Ambil Semula
                                        </Button>

                                        <Button
                                            onClick={processOMR}
                                            size="lg"
                                            className="w-full h-14 bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-lg shadow-md"
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                                                    Memproses...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-5 h-5 mr-2" />
                                                    Proses OMR
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {/* PREVIEW INFO */}
                                    <div className="mt-6 p-4 bg-muted/20 rounded-lg">
                                        <h3 className="font-semibold mb-2">
                                            Pratonton Gambar
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Gambar telah berjaya diambil. Klik
                                            "Proses OMR" untuk menganalisis
                                            jawapan atau "Ambil Semula" untuk
                                            gambar baru.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* INFO PANEL */}
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                        <h2 className="text-xl font-semibold mb-4">
                            Maklumat OMR
                        </h2>
                        <div className="space-y-4">
                            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                                <h3 className="font-semibold text-primary">
                                    Status Imbasan
                                </h3>
                                <p className="text-sm mt-1">
                                    {capturedImage
                                        ? "✅ Gambar sedia diproses"
                                        : "📷 Sedia untuk mengambil gambar"}
                                </p>
                            </div>

                            <div className="p-3 bg-accent/5 rounded-lg border border-accent/10">
                                <h3 className="font-semibold text-accent">
                                    Nota Penting
                                </h3>
                                <ul className="text-sm mt-1 space-y-1">
                                    <li>
                                        • Pastikan semua jawapan kelihatan jelas
                                    </li>
                                    <li>
                                        • Kertas OMR perlu mengikut format
                                        standard
                                    </li>
                                    <li>
                                        • Hasil akan dipaparkan dalam 2-3 saat
                                    </li>
                                </ul>
                            </div>

                            <div className="p-3 bg-secondary/5 rounded-lg border border-secondary/10">
                                <h3 className="font-semibold text-secondary">
                                    Kelas Akses
                                </h3>
                                <p className="text-sm mt-1">
                                    Hanya Guru Subjek dibenarkan menggunakan
                                    fungsi ini.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* STATS PANEL */}
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                        <h2 className="text-xl font-semibold mb-4">
                            Statistik
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-muted/30 rounded-lg">
                                <div className="text-2xl font-bold text-primary">
                                    0
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Imbasan Hari Ini
                                </div>
                            </div>
                            <div className="text-center p-3 bg-muted/30 rounded-lg">
                                <div className="text-2xl font-bold text-secondary">
                                    0
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Imbasan Berjaya
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER NOTES */}
            <div className="mt-8 text-center text-sm text-muted-foreground">
                <p>
                    Sistem OMR Scanner v1.0 • Pastikan kertas dalam keadaan baik
                    sebelum imbasan • Sokongan Teknikal: IT Department
                </p>
            </div>

            {/* HIDDEN CANVAS */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
