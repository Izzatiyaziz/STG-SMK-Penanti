"use client";

import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Users,
  GraduationCap,
  BarChart3,
} from "lucide-react";

/* ================= DUMMY DATA ================= */

const classInfo = {
  className: "2 Ibnu Majah",
  totalStudents: 30,
};

const students = [
  { id: 1, name: "Siti Aminah", average: 82 },
  { id: 2, name: "Chong Wei Ling", average: 75 },
  { id: 3, name: "Ravi Muthusamy", average: 68 },
  { id: 4, name: "Nurul Izzah", average: 90 },
  { id: 5, name: "Lim Hock Seng", average: 55 },
  { id: 6, name: "Fatimah Zahra", average: 77 },
];

function getStatus(mark: number) {
  if (mark >= 80) return { label: "Cemerlang", variant: "default" };
  if (mark >= 60) return { label: "Sederhana", variant: "secondary" };
  return { label: "Perlu Bimbingan", variant: "destructive" };
}

export default function MyClassPage() {
  const [data, setData] = useState<typeof students>([]);

  useEffect(() => {
    // Dummy load
    setData(students);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ================= HEADER ================= */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Kelas Saya
            </h1>
          </div>
          <p className="text-muted-foreground">
            Senarai pelajar dan prestasi akademik kelas {classInfo.className}
          </p>
        </div>

        {/* ================= SUMMARY ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Nama Kelas
                </p>
                <h3 className="text-xl font-semibold mt-2">
                  {classInfo.className}
                </h3>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Jumlah Pelajar
                </p>
                <h3 className="text-2xl font-bold mt-2">
                  {classInfo.totalStudents}
                </h3>
              </div>
              <div className="p-3 rounded-full bg-accent/10">
                <BarChart3 className="w-6 h-6 text-accent" />
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ================= STUDENT TABLE ================= */}
        <Card className="shadow-lg border border-border/50">
          <CardHeader>
            <CardTitle>Senarai Pelajar</CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Pelajar</TableHead>
                  <TableHead className="text-center">
                    Purata Markah (%)
                  </TableHead>
                  <TableHead className="text-center">
                    Status Prestasi
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.map((student) => {
                  const status = getStatus(student.average);

                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>
                      <TableCell className="text-center">
                        {student.average}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={status.variant as any}>
                          {status.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
