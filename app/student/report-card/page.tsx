"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
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
        case "A":
            return "border-emerald-200 bg-emerald-100 text-emerald-700";
        case "B":
            return "border-sky-200 bg-sky-100 text-sky-700";
        case "C":
            return "border-amber-200 bg-amber-100 text-amber-700";
        case "D":
            return "border-orange-200 bg-orange-100 text-orange-700";
        default:
            return "border-rose-200 bg-rose-100 text-rose-700";
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

    return (
        <div className="min-h-screen bg-muted/30 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <Card className="border border-border shadow">
                    <CardContent className="space-y-3 p-6 text-center">
                        <Image
                            src="/img/smkp-logo.png"
                            alt="Logo sekolah"
                            width={72}
                            height={72}
                            className="mx-auto h-16 w-16 object-contain"
                        />
                        <div>
                            <h2 className="text-lg font-bold uppercase">SMK Penanti</h2>
                            <p className="font-semibold uppercase">
                                Slip Keputusan {student?.exam ? `- ${student.exam} ${student.year}` : ""}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {loading ? (
                    <Card className="border border-border shadow">
                        <CardContent className="p-6 text-sm text-muted-foreground">
                            Memuatkan slip keputusan...
                        </CardContent>
                    </Card>
                ) : error ? (
                    <Card className="border border-border shadow">
                        <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
                    </Card>
                ) : data ? (
                    <>
                        <Card className="border border-border shadow">
                            <CardContent className="grid grid-cols-1 gap-4 p-5 text-sm md:grid-cols-2">
                                <div className="space-y-1">
                                    <p><b>Nama</b>   : {student?.name}</p>
                                    <p><b>No. KP</b> : {student?.ic}</p>
                                </div>
                                <div className="space-y-1 md:text-right">
                                    <p><b>Kelas</b> : {student?.className}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden rounded-xl border-border bg-card shadow-md">
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow className="border-b border-border hover:bg-transparent">
                                                <TableHead className="w-16 py-4 text-center font-semibold text-foreground">Bil.</TableHead>
                                                <TableHead className="py-4 font-semibold text-foreground">Subjek</TableHead>
                                                <TableHead className="w-28 py-4 text-center font-semibold text-foreground">Markah</TableHead>
                                                <TableHead className="w-28 py-4 text-center font-semibold text-foreground">Gred</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.map((r, i) => (
                                                <TableRow
                                                    key={`${r.subject}-${i}`}
                                                    className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
                                                >
                                                    <TableCell className="py-4 text-center font-medium text-muted-foreground">{i + 1}</TableCell>
                                                    <TableCell className="py-4 font-semibold text-foreground">{r.subject}</TableCell>
                                                    <TableCell className="py-4 text-center font-semibold">{r.mark}</TableCell>
                                                    <TableCell className="py-4 text-center">
                                                        <Badge variant="outline" className={gradeColor(r.grade)}>
                                                            {r.grade}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-border shadow">
                            <CardContent className="grid grid-cols-1 gap-4 p-5 text-sm md:grid-cols-2">
                                <div className="space-y-1">
                                    <p><b>Bilangan Mata Pelajaran</b> : {summary?.totalSubjects}</p>
                                    <p><b>Kedudukan Dalam Kelas</b> : {summary?.classRank}</p>
                                    <p><b>Kedudukan Dalam Tingkatan</b> : {summary?.levelRank || "-"}</p>
                                    <p><b>Pencapaian Gred Keseluruhan</b> : {summary?.gradeSummary || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p><b>Jumlah Markah</b> : {summary?.totalMarks}</p>
                                    <p><b>Peratus</b> : {summary?.percentage}%</p>
                                    <p><b>Gred Purata Pelajar</b> : {summary?.averageGradePoint ?? "-"}</p>
                                    <p><b>Keputusan</b> : {summary?.decision || "-"}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-border shadow">
                            <CardContent className="p-5 text-sm">
                                <p><b>Nama Guru Kelas</b> : {student?.classTeacher || "-"}</p>
                                <p>
                                    <b>Ulasan Guru Kelas</b> :{" "}
                                    <span className="italic">
                                        {summary?.comment || "Ulasan belum diisi."}
                                    </span>
                                </p>
                            </CardContent>
                        </Card>
                    </>
                ) : null}

                <div className="flex justify-end">
                    <Button className="w-full sm:w-auto">Muat Turun PDF Slip Keputusan</Button>
                </div>
            </div>
        </div>
    );
}
