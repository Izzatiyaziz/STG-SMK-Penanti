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
import { Button } from "@/components/ui/button";
import {
    BarChart3,
    TrendingUp,
    FileText,
    ClipboardList,
    Percent,
    Trophy,
} from "lucide-react";
import Link from "next/link";
import PerformanceTrendChart from "./performance-trend-chart";

type SubjectResult = {
    subject: string;
    mark: number;
    grade: string;
};

export default function MyResultsPage() {
    // ================= DUMMY DATA =================
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

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* ================= HEADER ================= */}
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <BarChart3 className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Keputusan Saya
                        </h1>
                    </div>
                    <p className="text-muted-foreground">
                        Paparan ringkas keputusan peperiksaan dan analisis
                        prestasi.
                    </p>
                </div>

                {/* ================= SUMMARY CARDS (DENGAN ICON) ================= */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Peperiksaan */}
                    <Card className="shadow-lg border border-border/50">
                        <CardContent className="flex items-center justify-between gap-4 p-6">
                            <div className="min-w-0">
                                <p className="text-sm text-muted-foreground">
                                    Peperiksaan
                                </p>
                                <h3 className="font-semibold mt-2">
                                    {summary.exam}
                                </h3>
                            </div>
                            <div className="p-3 rounded-full bg-primary/10">
                                <ClipboardList className="w-6 h-6 text-primary" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Purata Markah */}
                    <Card className="shadow-lg border border-border/50">
                        <CardContent className="flex items-center justify-between gap-4 p-6">
                            <div className="min-w-0">
                                <p className="text-sm text-muted-foreground">
                                    Purata Markah
                                </p>
                                <h3 className="text-2xl font-bold mt-2 text-primary">
                                    {summary.average}%
                                </h3>
                            </div>
                            <div className="p-3 rounded-full bg-secondary/10">
                                <Percent className="w-6 h-6 text-secondary" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Kedudukan Kelas */}
                    <Card className="shadow-lg border border-border/50">
                        <CardContent className="flex items-center justify-between gap-4 p-6">
                            <div className="min-w-0">
                                <p className="text-sm text-muted-foreground">
                                    Kedudukan Kelas
                                </p>
                                <h3 className="text-xl font-semibold mt-2">
                                    {summary.classRank}
                                </h3>
                            </div>
                            <div className="p-3 rounded-full bg-accent/10">
                                <Trophy className="w-6 h-6 text-accent" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ================= TREND GRAPH ================= */}
                <Card className="shadow-lg border border-border/50">
                    <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-1">
                            Trend Prestasi Akademik
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Perbandingan peratus pencapaian bagi setiap
                            peperiksaan.
                        </p>
                        <PerformanceTrendChart />
                    </CardContent>
                </Card>

                {/* ================= SUBJECT TABLE ================= */}
                <Card className="shadow-lg border border-border/50">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mata Pelajaran</TableHead>
                                    <TableHead className="text-center">
                                        Markah
                                    </TableHead>
                                    <TableHead className="text-center">
                                        Gred
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subjects.map((s, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{s.subject}</TableCell>
                                        <TableCell className="text-center">
                                            {s.mark}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {s.grade}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* ================= AI INSIGHT ================= */}
                <Card className="shadow-lg border border-border/50">
                    <CardContent className="p-6 space-y-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-semibold">
                                AI Performance Insight
                            </h2>
                        </div>
                        <p className="text-sm">
                            <b>Kekuatan:</b> {aiInsight.strength}
                        </p>
                        <p className="text-sm">
                            <b>Perlu Penambahbaikan:</b> {aiInsight.weakness}
                        </p>
                        <p className="text-sm italic text-muted-foreground">
                            {aiInsight.advice}
                        </p>
                    </CardContent>
                </Card>

                {/* ================= ACTION ================= */}
                <div className="flex justify-end">
                    <Link href="/student/report-card">
                        <Button className="w-full sm:w-auto">
                            <FileText className="w-4 h-4 mr-2" />
                            Lihat Slip Keputusan
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
