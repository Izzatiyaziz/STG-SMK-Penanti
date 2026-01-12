"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Sparkles,
  CheckCircle,
  Users,
} from "lucide-react";
import { toast } from "sonner";

/* ================= DUMMY DATA ================= */

const classInfo = {
  className: "2 Ibnu Majah",
  totalStudents: 3,
};

const students = [
  {
    id: 1,
    name: "Siti Aminah",
    subjects: [
      { name: "English", mark: 78, grade: "B" },
      { name: "Bahasa Melayu", mark: 85, grade: "A" },
      { name: "Matematik", mark: 70, grade: "C" },
    ],
    average: 78,
    position: 3,
    aiComment: "",
  },
  {
    id: 2,
    name: "Chong Wei Ling",
    subjects: [
      { name: "English", mark: 88, grade: "A" },
      { name: "Bahasa Melayu", mark: 80, grade: "A" },
      { name: "Matematik", mark: 75, grade: "B" },
    ],
    average: 81,
    position: 2,
    aiComment: "",
  },
  {
    id: 3,
    name: "Ravi Muthusamy",
    subjects: [
      { name: "English", mark: 92, grade: "A" },
      { name: "Bahasa Melayu", mark: 78, grade: "B" },
      { name: "Matematik", mark: 85, grade: "A" },
    ],
    average: 85,
    position: 1,
    aiComment: "",
  },
];

function generateAIComment(student: any) {
  if (student.average >= 80) {
    return "Prestasi akademik adalah sangat baik. Pelajar menunjukkan kefahaman yang kukuh dalam kebanyakan subjek dan digalakkan untuk mengekalkan kecemerlangan ini.";
  }
  if (student.average >= 65) {
    return "Prestasi akademik adalah memuaskan. Pelajar menunjukkan potensi yang baik dan boleh meningkatkan pencapaian dengan usaha yang lebih konsisten.";
  }
  return "Prestasi akademik adalah sederhana. Pelajar disarankan untuk memberi tumpuan tambahan kepada subjek teras dan mendapatkan bimbingan lanjut.";
}

export default function ClassTeacherReportPage() {
  const [data, setData] = useState(students);
  const [isGenerating, setIsGenerating] = useState(false);

  /* ================= SINGLE AI ================= */

  function handleGenerateAI(id: number) {
    setData((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, aiComment: generateAIComment(s) }
          : s
      )
    );
  }

  /* ================= BULK AI ================= */

  function handleGenerateAllAI() {
    setIsGenerating(true);

    setTimeout(() => {
      setData((prev) =>
        prev.map((student) => ({
          ...student,
          aiComment: generateAIComment(student),
        }))
      );

      toast.success("AI comment berjaya dijana untuk semua pelajar");
      setIsGenerating(false);
    }, 1000);
  }

  /* ================= BULK REPORT ================= */

  function handleGenerateAllReports() {
    setIsGenerating(true);

    setTimeout(() => {
      toast.success(
        `Report card berjaya dijana untuk ${data.length} pelajar`
      );
      console.log("Generated report cards:", data);
      setIsGenerating(false);
    }, 1500);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ================= HEADER ================= */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Laporan Kelas
            </h1>
          </div>
          <p className="text-muted-foreground">
            Penjanaan slip keputusan pelajar berdasarkan markah yang telah diluluskan
          </p>
        </div>

        {/* ================= CLASS SUMMARY ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nama Kelas</p>
                <h3 className="text-xl font-semibold mt-2">
                  {classInfo.className}
                </h3>
              </div>
              <Users className="w-6 h-6 text-primary" />
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status Markah</p>
                <h3 className="text-lg font-semibold mt-2 text-green-600">
                  Diluluskan
                </h3>
              </div>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </CardContent>
          </Card>

        </div>

        {/* ================= BULK ACTION BUTTONS ================= */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleGenerateAllAI}
            disabled={isGenerating}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Jana AI Comment (Semua)
          </Button>

          <Button
            onClick={handleGenerateAllReports}
            disabled={isGenerating}
          >
            <FileText className="w-4 h-4 mr-2" />
            Jana Report Card (Semua)
          </Button>
        </div>

        {/* ================= STUDENT REPORT ================= */}
        {data.map((student) => (
          <Card
            key={student.id}
            className="shadow-lg border border-border/50"
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{student.name}</span>
                <Badge variant="secondary">
                  Kedudukan {student.position}
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subjek</TableHead>
                    <TableHead className="text-center">Markah</TableHead>
                    <TableHead className="text-center">Gred</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {student.subjects.map((sub, i) => (
                    <TableRow key={i}>
                      <TableCell>{sub.name}</TableCell>
                      <TableCell className="text-center">{sub.mark}</TableCell>
                      <TableCell className="text-center">{sub.grade}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <p className="text-sm text-muted-foreground">
                <b>Purata:</b> {student.average}%
              </p>

              <div className="p-4 rounded-lg bg-muted/30 border">
                <p className="text-sm italic">
                  {student.aiComment || "AI comment belum dijana."}
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleGenerateAI(student.id)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Jana AI Comment
                </Button>
              </div>

            </CardContent>
          </Card>
        ))}

      </div>
    </div>
  );
}
