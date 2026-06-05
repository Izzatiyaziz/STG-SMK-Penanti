"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import Link from "next/link";
import PerformanceTrendChart from "./performance-trend-chart";

type SubjectResult = {
    subject: string;
    mark: number;
    grade: string;
};

function gradeColor(grade: string) {
    switch (String(grade ?? "").trim().toUpperCase()) {
        case "A":  return "bg-emerald-100 text-emerald-700 border-emerald-200";
        case "B":  return "bg-sky-100 text-sky-700 border-sky-200";
        case "C":  return "bg-amber-100 text-amber-700 border-amber-200";
        case "D":  return "bg-orange-100 text-orange-700 border-orange-200";
        default:   return "bg-rose-100 text-rose-700 border-rose-200";
    }
}

export default function MyResultsPage() {
    const summary = {
        exam: "UPSA 2025",
        average: 37.5,
        classRank: "5 / 30",
    };

    const subjects: SubjectResult[] = [
        { subject: "Bahasa Melayu", mark: 85, grade: "A" },
        { subject: "Bahasa Inggeris", mark: 59, grade: "D" },
        { subject: "Matematik", mark: 43, grade: "E" },
        { subject: "Pendidikan Islam", mark: 95, grade: "A" },
        { subject: "Sains", mark: 67, grade: "C" },
    ];

    const aiInsight = {
        strength: "Pendidikan Islam dan Bahasa Melayu",
        weakness: "Matematik",
        advice: "Prestasi keseluruhan adalah sederhana. Pelajar disarankan memberi tumpuan kepada subjek Matematik melalui latihan berterusan dan bimbingan tambahan.",
    };

    const stats = [
        { label: "Peperiksaan",     value: summary.exam },
        { label: "Purata Markah",   value: `${summary.average}%` },
        { label: "Kedudukan Kelas", value: summary.classRank },
    ];

    return (
        <div className="flex flex-col gap-8 p-6 md:p-8">
            {/* PAGE HEADER */}
            <div className="flex flex-col gap-1 border-b border-border/40 pb-6">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">
                    Pelajar
                </p>
                <h1 className="!text-[36px] font-black leading-tight text-foreground">
                    Keputusan Saya
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Paparan ringkas keputusan peperiksaan dan analisis prestasi.
                </p>
            </div>

            {/* STAT GRID */}
            <div className="grid grid-cols-1 gap-px bg-border/40 sm:grid-cols-3">
                {stats.map((stat) => (
                    <div key={stat.label} className="flex flex-col gap-1.5 bg-card p-6">
                        <span className="!text-[36px] font-black leading-none text-primary">
                            {stat.value}
                        </span>
                        <span className="text-sm text-muted-foreground">{stat.label}</span>
                    </div>
                ))}
            </div>

            {/* TREND CHART */}
            <div>
                <div className="mb-3 flex items-baseline gap-3">
                    <h2 className="font-semibold text-foreground">Trend Prestasi Akademik</h2>
                    <span className="text-xs text-muted-foreground">
                        Perbandingan peratus pencapaian bagi setiap peperiksaan
                    </span>
                </div>
                <Card className="border-border bg-card shadow-sm">
                    <CardContent className="p-6">
                        <PerformanceTrendChart />
                    </CardContent>
                </Card>
            </div>

            {/* SUBJECT TABLE */}
            <div>
                <div className="mb-3 flex items-baseline gap-3">
                    <h2 className="font-semibold text-foreground">Keputusan Subjek</h2>
                    <span className="text-xs text-muted-foreground">{summary.exam}</span>
                </div>
                <Card className="overflow-hidden border-border bg-card shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mata Pelajaran</TableHead>
                                    <TableHead className="text-center">Markah</TableHead>
                                    <TableHead className="text-center">Gred</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subjects.map((s, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{s.subject}</TableCell>
                                        <TableCell className="text-center">{s.mark}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={gradeColor(s.grade)}>
                                                {s.grade}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* AI INSIGHT */}
            <div>
                <div className="mb-3">
                    <h2 className="font-semibold text-foreground">Sorotan Prestasi AI</h2>
                </div>
                <Card className="border-border bg-card shadow-sm">
                    <CardContent className="space-y-2 p-6">
                        <p className="text-sm">
                            <span className="font-semibold text-foreground">Kekuatan: </span>
                            <span className="text-muted-foreground">{aiInsight.strength}</span>
                        </p>
                        <p className="text-sm">
                            <span className="font-semibold text-foreground">Perlu Penambahbaikan: </span>
                            <span className="text-muted-foreground">{aiInsight.weakness}</span>
                        </p>
                        <p className="text-sm italic text-muted-foreground">{aiInsight.advice}</p>
                    </CardContent>
                </Card>
            </div>

            {/* CTA */}
            <div className="flex justify-end">
                <Link href="/student/report-card">
                    <Button>
                        <FileText className="mr-2 h-4 w-4" />
                        Lihat Slip Keputusan
                    </Button>
                </Link>
            </div>
        </div>
    );
}
