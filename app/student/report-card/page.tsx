"use client";

import { useEffect, useState } from "react";
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
        percentage: number;
        gradeSummary: string;
        comment: string;
    };
};

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
                    <CardContent className="p-6 text-center space-y-2">
                        <h1 className="text-xl font-bold">SMK PENANTI GRADING SYSTEM</h1>
                        <h2 className="text-lg font-semibold uppercase">
                            Slip Keputusan {student?.exam ? `- ${student.exam} ${student.year}` : ""}
                        </h2>
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
                            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p><b>Nama</b> : {student?.name}</p>
                                    <p><b>No. KP</b> : {student?.ic}</p>
                                </div>
                                <div>
                                    <p><b>Tingkatan</b> : {student?.className}</p>
                                    <p><b>Peperiksaan</b> : {student?.exam}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-border shadow">
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">Bil</TableHead>
                                            <TableHead>Mata Pelajaran</TableHead>
                                            <TableHead className="w-24 text-center">Markah</TableHead>
                                            <TableHead className="w-24 text-center">Gred</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.map((r, i) => (
                                            <TableRow key={`${r.subject}-${i}`}>
                                                <TableCell>{i + 1}</TableCell>
                                                <TableCell>{r.subject}</TableCell>
                                                <TableCell className="text-center">{r.mark}</TableCell>
                                                <TableCell className="text-center">{r.grade}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card className="border border-border shadow">
                            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p><b>Bilangan Subjek</b> : {summary?.totalSubjects}</p>
                                    <p><b>Kedudukan Dalam Kelas</b> : {summary?.classRank}</p>
                                </div>
                                <div className="space-y-1">
                                    <p><b>Jumlah Markah</b> : {summary?.totalMarks}</p>
                                    <p><b>Peratus</b> : {summary?.percentage}%</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-border shadow">
                            <CardContent className="p-6 space-y-3 text-sm">
                                <p><b>Pencapaian Gred Keseluruhan</b> : {summary?.gradeSummary || "-"}</p>
                                <p><b>Nama Guru Kelas</b> : {student?.classTeacher || "-"}</p>
                                <p>
                                    <b>Komen</b> :{" "}
                                    <span className="italic">
                                        {summary?.comment || "Komen belum diisi."}
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
