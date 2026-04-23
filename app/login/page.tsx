"use client";

import { ModeToggle } from "@/components/mode-toggle";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            {/* ================= LEFT PANEL ================= */}
            <div className="relative hidden overflow-hidden lg:flex flex-col justify-between bg-[#1f3a6f] p-10 text-white">
                {/* Overlay image */}
                <Image
                    src="https://images4.alphacoders.com/134/thumb-1920-1348334.jpg" 
                    alt="Background"
                    fill
                    className="object-cover opacity-20"
                    priority
                />

                {/* Content */}
                <div className="relative z-10 flex w-full flex-1 flex-col justify-center">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                            <Image
                                src="/img/smkp-logo.png"
                                alt="SMK Penanti"
                                width={28}
                                height={28}
                            />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">
                                SMK Penanti
                            </h1>
                            <p className="text-sm opacity-80">
                                Sistem Pemarkahan Pelajar
                            </p>
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold mb-4">Selamat Datang!</h2>
                    <p className="text-sm leading-relaxed opacity-90 mb-8">
                        Sistem Pemarkahan Pelajar untuk SMK Penanti, Kubang Semang, Pulau Pinang 
                        yang menyokong proses pemarkahan berstruktur dan penjanaan laporan akademik.
                    </p>

                    <ul className="space-y-4 text-sm">
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-300" />
                            <div>
                                <p className="font-medium">
                                    Pengimbasan OMR Berasaskan Peranti Mudah Alih
                                </p>
                                <p className="opacity-80">
                                    Mengimbas kertas jawapan objektif menggunakan peranti mudah alih
                                </p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-300" />
                            <div>
                                <p className="font-medium">
                                    Penjanaan Laporan Akademik Secara Automatik
                                </p>
                                <p className="opacity-80">
                                    Menjana laporan prestasi akademik pelajar berdasarkan data penilaian yang direkodkan
                                </p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-300" />
                            <div>
                                <p className="font-medium">
                                    Aliran Kerja Pengesahan Markah
                                </p>
                                <p className="opacity-80">
                                    Proses pengesahan terbina untuk memastikan ketepatan dan konsistensi pemarkahan
                                </p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>

            {/* ================= RIGHT PANEL ================= */}
            <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6 md:p-10">
                {/* Top bar */}
                <div className="flex items-center justify-between gap-3">
                    <Link
                        href="/"
                        className="flex items-center gap-2 font-medium"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Image
                                src="/img/smkp-logo.png"
                                alt="STG Logo"
                                width={22}
                                height={22}
                            />
                        </div>
                        STG
                    </Link>
                    <ModeToggle />
                </div>

                {/* Login card */}
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-sm rounded-xl border bg-card p-5 shadow-sm sm:p-6">
                        <div className="mb-6 text-center">
                            <h1 className="text-2xl font-bold">Log Masuk</h1>
                            <p className="text-sm text-muted-foreground">
                                Masukkan kelayakan anda untuk mengakses sistem
                            </p>
                        </div>

                        <LoginForm />
                    </div>
                </div>
            </div>
        </div>
    );
}
