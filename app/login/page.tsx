"use client";

import { LoginForm } from "@/components/login-form";
import { ModeToggle } from "@/components/mode-toggle";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function LoginPage() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            {/* ================= LEFT PANEL ================= */}
            <div className="relative hidden lg:flex flex-col justify-between bg-[#1f3a6f] p-10 text-white">
                {/* Overlay image */}
                <Image
                    src="https://images4.alphacoders.com/134/thumb-1920-1348334.jpg"
                    alt="Background"
                    fill
                    className="object-cover opacity-20"
                    priority
                />

                {/* Content */}
                <div className="relative z-10 w-full top-50">
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
                                SMK Penanti test
                            </h1>
                            <p className="text-sm opacity-80">
                                Student Grading System
                            </p>
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold mb-4">Selamat Datang</h2>
                    <p className="text-sm leading-relaxed opacity-90 mb-8">
                        Sistem pengurusan pemarkahan pelajar yang komprehensif
                        untuk SMK Penanti, Kubang Semang, Pulau Pinang.
                        Memudahkan proses pemarkahan dan penjanaan laporan.
                    </p>

                    <ul className="space-y-4 text-sm">
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-300" />
                            <div>
                                <p className="font-medium">
                                    Mobile OMR Scanning
                                </p>
                                <p className="opacity-80">
                                    Scan answer sheets using your mobile device
                                </p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-300" />
                            <div>
                                <p className="font-medium">
                                    AI Automated Reports
                                </p>
                                <p className="opacity-80">
                                    Generate insightful academic reports
                                    automatically
                                </p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-300" />
                            <div>
                                <p className="font-medium">
                                    Grade Verification
                                </p>
                                <p className="opacity-80">
                                    Built-in workflow for grade accuracy
                                </p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>

            {/* ================= RIGHT PANEL ================= */}
            <div className="flex flex-col gap-4 p-6 md:p-10">
                {/* Top bar */}
                <div className="flex justify-between items-center">
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
                    <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
                        <div className="mb-6 text-center">
                            <h1 className="text-2xl font-bold">Log Masuk</h1>
                            <p className="text-sm text-muted-foreground">
                                Enter your credentials to access the system
                            </p>
                        </div>

                        <LoginForm />
                    </div>
                </div>
            </div>
        </div>
    );
}
