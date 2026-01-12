"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  BookOpen,
  Users,
  TrendingUp,
} from "lucide-react";

/* ================= TYPES ================= */

type SubjectKey = "English" | "Bahasa Melayu";

type ReportRow = {
  class: string;
  average: number;
  grade: string;
};

/* ================= DUMMY DATA ================= */

const subjects: SubjectKey[] = ["English", "Bahasa Melayu"];

const reportData: Record<SubjectKey, ReportRow[]> = {
  English: [
    { class: "2 Ibnu Sina", average: 72, grade: "B" },
    { class: "2 Ibnu Majah", average: 65, grade: "C" },
    { class: "2 Ibnu Khaldun", average: 80, grade: "A" },
  ],
  "Bahasa Melayu": [
    { class: "2 Ibnu Sina", average: 78, grade: "B" },
    { class: "2 Ibnu Majah", average: 70, grade: "C" },
    { class: "2 Ibnu Khaldun", average: 85, grade: "A" },
  ],
};

export default function SubjectTeacherReportPage() {
  const [selectedSubject, setSelectedSubject] =
    useState<SubjectKey>("English");

  const data = reportData[selectedSubject];

  /* ================= CALCULATIONS ================= */

  const bestClass = data.reduce((a, b) =>
    a.average > b.average ? a : b
  );

  const worstClass = data.reduce((a, b) =>
    a.average < b.average ? a : b
  );

  const overallAverage =
    data.reduce((sum, d) => sum + d.average, 0) / data.length;

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
              Laporan Subjek
            </h1>
          </div>
          <p className="text-muted-foreground">
            Analisis prestasi subjek mengikut kelas yang diajar
          </p>
        </div>

        {/* ================= FILTER ================= */}
        <Card className="shadow-lg border border-border/50 w-full md:w-72">
          <CardContent className="p-4">
            <Select
              value={selectedSubject}
              onValueChange={(v) =>
                setSelectedSubject(v as SubjectKey)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Subjek" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* ================= SUMMARY ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Purata Keseluruhan
                </p>
                <h3 className="text-2xl font-bold mt-2 text-primary">
                  {overallAverage.toFixed(1)}%
                </h3>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Kelas Terbaik
                </p>
                <h3 className="font-semibold mt-2">
                  {bestClass.class}
                </h3>
              </div>
              <div className="p-3 rounded-full bg-accent/10">
                <Users className="w-6 h-6 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Subjek
                </p>
                <h3 className="font-semibold mt-2">
                  {selectedSubject}
                </h3>
              </div>
              <div className="p-3 rounded-full bg-secondary/10">
                <BookOpen className="w-6 h-6 text-secondary" />
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ================= BAR CHART ================= */}
        <Card className="shadow-lg border border-border/50">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-2">
              Perbandingan Purata Markah Mengikut Kelas
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Graf ini menunjukkan perbandingan prestasi antara kelas.
            </p>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="average" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ================= TABLE ================= */}
        <Card className="shadow-lg border border-border/50">
          <CardHeader>
            <CardTitle>Ringkasan Prestasi Kelas</CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kelas</TableHead>
                  <TableHead className="text-center">
                    Purata Markah (%)
                  </TableHead>
                  <TableHead className="text-center">
                    Gred Dominan
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.class}</TableCell>
                    <TableCell className="text-center">
                      {row.average}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.grade}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
