"use client";

import {
    BookOpenCheck,
    ClipboardList,
    GraduationCap,
    ScanLine,
    ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ModeToggle } from "@/components/mode-toggle";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

const portalFeatures = [
    {
        title: "Pemarkahan Berstruktur",
        description: "Urus markah objektif, subjektif, dan komponen peperiksaan.",
        icon: ClipboardList,
    },
    {
        title: "Sokongan OMR",
        description: "Imbas dan semak jawapan objektif menggunakan aliran kerja digital.",
        icon: ScanLine,
    },
    {
        title: "Laporan Akademik",
        description: "Jana slip keputusan dan ringkasan prestasi pelajar.",
        icon: BookOpenCheck,
    },
];

export default function LoginPage() {
    return (
        <main className="min-h-svh bg-background">
            <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
                <header className="animate-app-fade flex items-center justify-between gap-4">
                    <Link href="/" className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-card shadow-sm">
                            <Image
                                src="/img/smkp-logo.png"
                                alt="SMK Penanti"
                                width={28}
                                height={28}
                                priority
                            />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                                STG SMK Penanti
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                                Sistem Pemarkahan dan Laporan Akademik
                            </p>
                        </div>
                    </Link>
                    <ModeToggle />
                </header>

                <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-10">
                    <div className="hidden min-w-0 lg:block">
                        <div className="max-w-2xl space-y-8">
                            <div className="animate-app-enter space-y-5">
                                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1.5 text-sm font-medium text-primary shadow-sm">
                                    <ShieldCheck className="h-4 w-4" />
                                    Portal Akademik Sekolah
                                </div>
                                <div className="space-y-4">
                                    <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-normal text-foreground">
                                        Log masuk ke sistem pemarkahan SMK Penanti.
                                    </h1>
                                    <p className="max-w-xl text-base leading-7 text-muted-foreground">
                                        Satu ruang kerja untuk guru, pentadbir, pelajar,
                                        panitia subjek, dan pengetua mengurus data akademik
                                        dengan lebih tersusun.
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-3">
                                {portalFeatures.map((feature, index) => {
                                    const Icon = feature.icon;

                                    return (
                                        <Card
                                            key={feature.title}
                                            className={`animate-app-enter rounded-lg border-border/70 bg-card/80 py-0 shadow-sm backdrop-blur ${
                                                index === 1
                                                    ? "animate-delay-1"
                                                    : index === 2
                                                      ? "animate-delay-2"
                                                      : ""
                                            }`}
                                        >
                                            <CardContent className="flex items-start gap-4 p-4">
                                                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0 space-y-1">
                                                    <h2 className="font-semibold text-foreground">
                                                        {feature.title}
                                                    </h2>
                                                    <p className="text-sm leading-6 text-muted-foreground">
                                                        {feature.description}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            <div className="animate-app-enter animate-delay-3 grid max-w-xl grid-cols-3 gap-3">
                                <div className="rounded-lg border border-border/70 bg-card/70 p-4 shadow-sm">
                                    <p className="text-2xl font-bold text-primary">3</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Peranan utama
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border/70 bg-card/70 p-4 shadow-sm">
                                    <p className="text-2xl font-bold text-primary">OMR</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Semakan objektif
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border/70 bg-card/70 p-4 shadow-sm">
                                    <p className="text-2xl font-bold text-primary">PDF</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Slip keputusan
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex min-w-0 justify-center lg:justify-end">
                        <Card className="animate-app-enter animate-delay-1 w-full max-w-md rounded-lg border-border/80 bg-card/95 shadow-xl backdrop-blur">
                            <CardHeader className="space-y-5 text-center">
                                <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-sm">
                                    <Image
                                        src="/img/smkp-logo.png"
                                        alt="SMK Penanti"
                                        width={46}
                                        height={46}
                                        priority
                                    />
                                </div>
                                <div className="space-y-2">
                                    <CardTitle className="text-2xl font-bold tracking-normal">
                                        Log Masuk
                                    </CardTitle>
                                    <CardDescription className="mx-auto max-w-sm">
                                        Pilih peranan anda dan masukkan kelayakan untuk
                                        mengakses sistem.
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <LoginForm />
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <footer className="animate-app-fade flex flex-col items-center justify-between gap-2 border-t border-border/60 py-4 text-xs text-muted-foreground sm:flex-row">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        <span>SMK Penanti, Kubang Semang, Pulau Pinang</span>
                    </div>
                    <span>Sistem akademik dalaman sekolah</span>
                </footer>
            </div>
        </main>
    );
}
