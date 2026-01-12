"use client";

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
import {
  BookOpen,
  Users,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";

/* ================= DUMMY DATA ================= */

const summary = {
  subjects: 2,
  classes: 3,
  pending: 2,
  completed: 1,
};

const assignments = [
  {
    subject: "English",
    class: "2 Ibnu Sina",
    status: "Belum Lengkap",
  },
  {
    subject: "English",
    class: "2 Ibnu Majah",
    status: "Belum Lengkap",
  },
  {
    subject: "Bahasa Melayu",
    class: "2 Ibnu Khaldun",
    status: "Selesai",
  },
];

export default function SubjectTeacherDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ================= HEADER ================= */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <LayoutDashboard className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Dashboard Guru Subjek
            </h1>
          </div>
          <p className="text-muted-foreground">
            Ringkasan subjek, kelas dan status pemarkahan
          </p>
        </div>

        {/* ================= SUMMARY CARDS ================= */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Subjek Diajar</p>
                <h3 className="text-2xl font-bold mt-2">
                  {summary.subjects}
                </h3>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jumlah Kelas</p>
                <h3 className="text-2xl font-bold mt-2">
                  {summary.classes}
                </h3>
              </div>
              <div className="p-3 rounded-full bg-secondary/10">
                <Users className="w-6 h-6 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Belum Dimarkah
                </p>
                <h3 className="text-2xl font-bold mt-2 text-destructive">
                  {summary.pending}
                </h3>
              </div>
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-border/50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Pemarkahan Siap
                </p>
                <h3 className="text-2xl font-bold mt-2 text-primary">
                  {summary.completed}
                </h3>
              </div>
              <div className="p-3 rounded-full bg-accent/10">
                <CheckCircle className="w-6 h-6 text-accent" />
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ================= ASSIGNMENT TABLE ================= */}
        <Card className="shadow-lg border border-border/50">
          <CardHeader>
            <CardTitle>Status Pemarkahan Subjek</CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subjek</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    Tindakan
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {assignments.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.subject}</TableCell>
                    <TableCell>{item.class}</TableCell>
                    <TableCell>
                      {item.status === "Selesai" ? (
                        <span className="text-green-600 font-medium">
                          Selesai
                        </span>
                      ) : (
                        <span className="text-destructive font-medium">
                          Belum Lengkap
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href="/teacher/my-subject">
                        <Button size="sm">
                          <ClipboardList className="w-4 h-4 mr-2" />
                          Masuk Markah
                        </Button>
                      </Link>
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
