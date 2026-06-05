"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

type SubjectResult = {
    subject: string;
    mark: number;
    grade: string;
};

type ReportCardPayload = {
    student: {
        name: string;
        ic: string;
        className: string;
        exam: string;
        year: string;
        classTeacher: string;
    };
    results: SubjectResult[];
    summary: {
        totalSubjects: number;
        totalMarks: number;
        classRank: string;
        levelRank?: string;
        percentage: number;
        gradeSummary: string;
        averageGradePoint?: number;
        decision?: string;
        comment: string;
    };
};

function gradeColor(grade: string) {
    switch (String(grade ?? "").toUpperCase()) {
        case "A":  return "border-emerald-200 bg-emerald-100 text-emerald-700";
        case "B":  return "border-sky-200 bg-sky-100 text-sky-700";
        case "C":  return "border-amber-200 bg-amber-100 text-amber-700";
        case "D":  return "border-orange-200 bg-orange-100 text-orange-700";
        default:   return "border-rose-200 bg-rose-100 text-rose-700";
    }
}

export default function ReportCardPage() {
    const [data, setData] = useState<ReportCardPayload | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadReportCard() {
            setLoading(true);
            setError("");
            try {
                const res = await fetch("/api/student/report-card", { cache: "no-store" });
                const json = await res.json();
                if (!res.ok) {
                    setData(null);
                    setError(json?.message || "Gagal memuatkan slip keputusan");
                    return;
                }
                setData(json);
            } catch {
                setData(null);
                setError("Gagal memuatkan slip keputusan");
            } finally {
                setLoading(false);
            }
        }

        loadReportCard();
    }, []);

    const student = data?.student;
    const results = data?.results ?? [];
    const summary = data?.summary;
    const examLabel = [student?.exam, student?.year].filter(Boolean).join(" ").trim();

    return (
        <div className="flex flex-col gap-8 p-6 md:p-8">
            {/* PAGE HEADER */}
            <div className="flex flex-col gap-1 border-b border-border/40 pb-6">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">
                    Pelajar
                </p>
                <h1 className="!text-[36px] font-black leading-tight text-foreground">
                    Slip Keputusan
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Rekod rasmi keputusan peperiksaan pelajar.
                </p>
            </div>

            {/* SCHOOL HEADER CARD */}
            <Card className="border-border bg-card shadow-sm">
                <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                    <Image
                        src="/img/smkp-logo.png"
                        alt="Logo sekolah"
                        width={72}
                        height={72}
                        className="h-16 w-16 object-contain"
                    />
                    <div>
                        <h2 className="text-base font-bold uppercase tracking-wide">SMK Penanti</h2>
                        <p className="text-sm font-semibold uppercase text-muted-foreground">
                            Slip Keputusan{examLabel ? ` — ${examLabel}` : ""}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm">Memuatkan slip keputusan...</span>
                </div>
            ) : error ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                    {error}
                </div>
            ) : data ? (
                <>
                    {/* STUDENT INFO */}
                    <Card className="border-border bg-card shadow-sm">
                        <CardContent className="grid grid-cols-1 gap-4 p-6 text-sm md:grid-cols-2">
                            <div className="space-y-1.5">
                                <p>
                                    <span className="font-semibold text-foreground">Nama</span>
                                    <span className="mx-2 text-muted-foreground">:</span>
                                    {student?.name}
                                </p>
                                <p>
                                    <span className="font-semibold text-foreground">No. KP</span>
                                    <span className="mx-2 text-muted-foreground">:</span>
                                    {student?.ic}
                                </p>
                            </div>
                            <div className="space-y-1.5 md:text-right">
                                <p>
                                    <span className="font-semibold text-foreground">Kelas</span>
                                    <span className="mx-2 text-muted-foreground">:</span>
                                    {student?.className}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* RESULTS TABLE */}
                    <Card className="overflow-hidden border-border bg-card shadow-sm">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-14 text-center">Bil.</TableHead>
                                        <TableHead>Subjek</TableHead>
                                        <TableHead className="w-28 text-center">Markah</TableHead>
                                        <TableHead className="w-28 text-center">Gred</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.length ? (
                                        results.map((r, i) => (
                                            <TableRow key={`${r.subject}-${i}`}>
                                                <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                                                <TableCell className="font-medium">{r.subject}</TableCell>
                                                <TableCell className="text-center font-semibold">{r.mark}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className={gradeColor(r.grade)}>
                                                        {r.grade}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                                                Tiada keputusan untuk dipaparkan.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* SUMMARY */}
                    <Card className="border-border bg-card shadow-sm">
                        <CardContent className="grid grid-cols-1 gap-4 p-6 text-sm md:grid-cols-2">
                            <div className="space-y-1.5">
                                <p>
                                    <span className="font-semibold text-foreground">Bilangan Mata Pelajaran</span>
                                    <span className="mx-2 text-muted-foreground">:</span>
                                    {summary?.totalSubjects}
                                </p>
                                <p>
                                    <span className="font-semibold text-foreground">Kedudukan Dalam Kelas</span>
                                    <span className="mx-2 text-muted-foreground">:</span>
                                    {summary?.classRank}
                                </p>
                                <p>
                                    <span className="font-semibold text-foreground">Kedudukan Dalam Tingkatan</span>
                                    <span className="mx-2 text-muted-foreground">:</span>
                                    {summary?.levelRank || "—"}
                                </p>
                                <p>
                                    <span className="font-semibold text-foreground">Pencapaian Gred Keseluruhan</span>
                                    <span className="mx-2 text-muted-foreground">:</span>
                                    {summary?.gradeSummary || "—"}
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <p>
                                    <span className="font-semibold text-foreground">Jumlah Markah</span>
                                    <span className="mx-2 text-muted-foreground">:</span>
                                    {summary?.totalMarks}
                                </p>
                                <p>
                                    <span className="font-semibold text-foreground">Peratus</span>
                                    <span className="mx-2 text-muted-foreground">:</span>
                                    {summary?.percentage}%
                                </p>
                                <p>
                                    <span className="font-semibold text-foreground">Gred Purata Pelajar</span>
                                    <span className="mx-2 text-muted-foreground">:</span>
                                    {summary?.averageGradePoint ?? "—"}
                                </p>
                                <p>
                                    <span className="font-semibold text-foreground">Keputusan</span>
                                    <span className="mx-2 text-muted-foreground">:</span>
                                    {summary?.decision || "—"}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* TEACHER COMMENT */}
                    <Card className="border-border bg-card shadow-sm">
                        <CardContent className="space-y-1.5 p-6 text-sm">
                            <p>
                                <span className="font-semibold text-foreground">Nama Guru Kelas</span>
                                <span className="mx-2 text-muted-foreground">:</span>
                                {student?.classTeacher || "—"}
                            </p>
                            <p>
                                <span className="font-semibold text-foreground">Ulasan Guru Kelas</span>
                                <span className="mx-2 text-muted-foreground">:</span>
                                <span className="italic text-muted-foreground">
                                    {summary?.comment || "Ulasan belum diisi."}
                                </span>
                            </p>
                        </CardContent>
                    </Card>
                </>
            ) : null}

            <div className="flex justify-end">
                <Button>Muat Turun PDF Slip Keputusan</Button>
            </div>
        </div>
    );
}
