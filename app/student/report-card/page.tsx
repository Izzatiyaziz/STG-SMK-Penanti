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

type SubjectResult = {
    subject: string;
    mark: number;
    grade: string;
};

export default function ReportCardPage() {
    // ================= DUMMY DATA =================
    const student = {
        name: "NUR IZZATI BINTI MOHD YAZIZ",
        ic: "030802-07-0308",
        className: "2 Ibnu Majah",
        exam: "Ujian Pertengahan Sesi Akademik (UPSA)",
        year: "2025",
        classTeacher: "PN. MARIA BINTI ISHAK",
    };

    const results: SubjectResult[] = [
        { subject: "Bahasa Inggeris", mark: 59, grade: "D" },
        { subject: "Bahasa Melayu", mark: 85, grade: "A" },
        { subject: "Geografi", mark: 70, grade: "B" },
        { subject: "Kemahiran Hidup 3 - PERT", mark: 55, grade: "D" },
        { subject: "Literasi Komputer", mark: 63, grade: "C" },
        { subject: "Matematik", mark: 43, grade: "E" },
        { subject: "Pendidikan Islam", mark: 95, grade: "A" },
        { subject: "Pendidikan Jasmani & Kesihatan", mark: 64, grade: "C" },
        { subject: "Pendidikan Seni Visual", mark: 75, grade: "B" },
        { subject: "Sejarah", mark: 90, grade: "A" },
        { subject: "Sivik & Kewarganegaraan", mark: 90, grade: "A" },
        { subject: "Sains", mark: 67, grade: "C" },
    ];

    const summary = {
        totalSubjects: 12,
        totalMarks: 450,
        classRank: "5 / 30",
        levelRank: "94 / 312",
        percentage: 70,
        gradeSummary: "4[A] 2[B] 3[C] 2[D] 1[E]",
        comment:
            "Murid ini menunjukkan prestasi yang sederhana. Perlu tingkatkan usaha dalam subjek Matematik.",
    };

    return (
        <div className="min-h-screen bg-muted/30 p-4 md:p-6">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* ================= HEADER ================= */}
                <Card className="border border-border shadow">
                    <CardContent className="p-6 text-center space-y-2">
                        <h1 className="text-xl font-bold">
                            SMK PENANTI GRADING SYSTEM
                        </h1>
                        <h2 className="text-lg font-semibold uppercase">
                            Slip Keputusan – {student.exam} {student.year}
                        </h2>
                    </CardContent>
                </Card>

                {/* ================= STUDENT INFO ================= */}
                <Card className="border border-border shadow">
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p><b>Nama</b> : {student.name}</p>
                            <p><b>No. KP</b> : {student.ic}</p>
                        </div>
                        <div>
                            <p><b>Tingkatan</b> : {student.className}</p>
                            <p><b>Peperiksaan</b> : {student.exam}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* ================= RESULT TABLE ================= */}
                <Card className="border border-border shadow">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">Bil</TableHead>
                                    <TableHead>Mata Pelajaran</TableHead>
                                    <TableHead className="w-24 text-center">
                                        Markah
                                    </TableHead>
                                    <TableHead className="w-24 text-center">
                                        Gred
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {results.map((r, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{i + 1}</TableCell>
                                        <TableCell>{r.subject}</TableCell>
                                        <TableCell className="text-center">
                                            {r.mark}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {r.grade}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* ================= SUMMARY ================= */}
                <Card className="border border-border shadow">
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <p><b>Bilangan Subjek</b> : {summary.totalSubjects}</p>
                            <p><b>Kedudukan Dalam Kelas</b> : {summary.classRank}</p>
                            <p><b>Kedudukan Dalam Tingkatan</b> : {summary.levelRank}</p>
                        </div>
                        <div className="space-y-1">
                            <p><b>Jumlah Markah</b> : {summary.totalMarks}</p>
                            <p><b>Peratus</b> : {summary.percentage}%</p>
                        </div>
                    </CardContent>
                </Card>

                {/* ================= COMMENT ================= */}
                <Card className="border border-border shadow">
                    <CardContent className="p-6 space-y-3 text-sm">
                        <p><b>Pencapaian Gred Keseluruhan</b> : {summary.gradeSummary}</p>
                        <p><b>Nama Guru Kelas</b> : {student.classTeacher}</p>
                        <p>
                            <b>Comment</b> :{" "}
                            <span className="italic">
                                {summary.comment}
                            </span>
                        </p>
                    </CardContent>
                </Card>

                {/* ================= ACTION ================= */}
                <div className="flex justify-end">
                    <Button>
                        Muat Turun PDF Slip Keputusan
                    </Button>
                </div>
            </div>
        </div>
    );
}
