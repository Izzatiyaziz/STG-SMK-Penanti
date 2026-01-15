"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  ClipboardList,
  Users,
  BookOpen,
  Save,
  Send,
  Camera,
} from "lucide-react";

/* ================= DUMMY DATA ================= */

const subjects = ["English", "Bahasa Melayu"];
const classes = ["2 Ibnu Majah", "2 Ibnu Sina"];

const studentsData = [
  { id: 1, name: "Siti Aminah binti Wahab", omr: 35 },
  { id: 2, name: "Chong Wei Ling", omr: 35 },
  { id: 3, name: "Ravi Muthusamy a/l Pariami", omr: 35 },
  { id: 4, name: "Nurul Izzah binti Suhainizam", omr: 35 },
  { id: 5, name: "Lim Hock Seng", omr: 35 },
  { id: 6, name: "Nur Izzati binti Mohd Yaziz", omr: 35 },
  { id: 7, name: "Tan Boon Keong", omr: 35 },
  { id: 8, name: "Mariam binti Ahmad", omr: 35 },
  { id: 9, name: "Azlan bin Shah", omr: 35 },
];

export default function SubjectTeacherPage() {
  const router = useRouter();

  const [selectedSubject, setSelectedSubject] = useState("English");
  const [selectedClass, setSelectedClass] = useState("2 Ibnu Majah");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ================= HEADER ================= */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <ClipboardList className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Pemarkahan Subjek
            </h1>
          </div>
          <p className="text-muted-foreground">
            Guru Subjek • {selectedClass} • {selectedSubject}
          </p>
        </div>

        {/* ================= SUMMARY CARDS ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Subjek</p>
                <h3 className="font-semibold mt-2">{selectedSubject}</h3>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kelas</p>
                <h3 className="font-semibold mt-2">{selectedClass}</h3>
              </div>
              <div className="p-3 rounded-full bg-secondary/10">
                <Users className="w-6 h-6 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jumlah Pelajar</p>
                <h3 className="text-2xl font-bold mt-2 text-primary">
                  {studentsData.length}
                </h3>
              </div>
              <div className="p-3 rounded-full bg-accent/10">
                <Users className="w-6 h-6 text-accent" />
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ================= FILTER ================= */}
        <Card className="shadow-lg border border-border/50">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full md:w-60">
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

            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full md:w-60">
                <SelectValue placeholder="Pilih Kelas" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* ================= TABLE ================= */}
        <Card className="shadow-lg border border-border/50">
          <CardHeader>
            <CardTitle>
              Senarai Pelajar – {selectedClass}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Pelajar</TableHead>
                  <TableHead className="text-center">
                    Skor Objektif (OMR)
                  </TableHead>
                  <TableHead className="text-center">
                    Skor Subjektif
                  </TableHead>
                  <TableHead className="text-center">
                    Jumlah Markah
                  </TableHead>
                       <TableHead className="text-center">
                    Gred
                  </TableHead>
                  
                </TableRow>
              </TableHeader>

              <TableBody>
                {studentsData.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.name}
                    </TableCell>

                    {/* ===== OMR SCORE + CAMERA ICON ===== */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Badge variant="outline">
                          {student.omr}/40
                        </Badge>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Imbas OMR"
                          onClick={() =>
                            router.push(
                              `/teacher/omr?student=${student.id}&class=${selectedClass}&subject=${selectedSubject}`
                            )
                          }
                        >
                          <Camera className="h-4 w-4 text-primary" />
                        </Button>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        className="w-24 mx-auto text-center"
                        placeholder="0–60"
                      />
                    </TableCell>

                    <TableCell className="text-center text-muted-foreground">
                      —
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ================= ACTION ================= */}
        <div className="flex justify-end gap-3">
          <Button variant="outline">
            <Save className="w-4 h-4 mr-2" />
            Simpan Draf
          </Button>
          <Button>
            <Send className="w-4 h-4 mr-2" />
            Hantar
          </Button>
        </div>

      </div>
    </div>
  );
}
