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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Users,
  BookOpen,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";

/* ================= DUMMY DATA ================= */

const summary = {
  totalClasses: 3,
  totalTeachers: 4,
  subjectPerformance: 71,
  pendingSubmissions: 3,
};

const classPerformance = [
  { class: "2 Ibnu Sina", avg: 72 },
  { class: "2 Ibnu Majah", avg: 65 },
  { class: "2 Ibnu Khaldun", avg: 80 },
];

const gradeDistribution = [
  { grade: "A", value: 40 },
  { grade: "B", value: 35 },
  { grade: "C", value: 15 },
  { grade: "D", value: 5 },
  { grade: "E", value: 5 },
];

const alerts = [
  "2 Ibnu Majah – Purata markah bawah 50%",
  "2 kelas belum menghantar markah Matematik",
  "5 pelajar mendapat gred E (Matematik)",
];

const pendingSubmissions = [
  {
    class: "2 Ibnu Sina",
    teacher: "Cikgu Aminah",
    students: 30,
    status: "View",
  },
  {
    class: "2 Ibnu Majah",
    teacher: "Cikgu Hakim",
    students: 28,
    status: "View",
  },
  {
    class: "2 Ibnu Khaldun",
    teacher: "Cikgu Siti",
    students: 32,
    status: "Submitted",
  },
];

/* ================= COLORS ================= */
const COLORS = ["#2563eb", "#22c55e", "#facc15", "#fb7185", "#a855f7"];

/* ================= PAGE ================= */

export default function SubjectCoordinatorDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ================= HEADER ================= */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Subject Coordinator Dashboard – Mathematics
          </h1>
          <p className="text-muted-foreground">
            Pemantauan prestasi subjek Matematik mengikut kelas
          </p>
        </div>

        {/* ================= SUMMARY ================= */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryCard title="Jumlah Kelas" value={summary.totalClasses} />
          <SummaryCard title="Guru Subjek" value={summary.totalTeachers} />
          <SummaryCard
            title="Prestasi Subjek"
            value={`${summary.subjectPerformance}%`}
          />
          <SummaryCard
            title="Pending Submissions"
            value={summary.pendingSubmissions}
          />
        </div>

        {/* ================= GRAPHS ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* BAR CHART */}
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
              <CardTitle>Prestasi Matematik Mengikut Kelas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={classPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="class" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* PIE CHART */}
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
              <CardTitle>Taburan Gred Matematik</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    dataKey="value"
                    nameKey="grade"
                    outerRadius={90}
                    label
                  >
                    {gradeDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </div>

        {/* ================= ALERTS & PENDING ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ALERTS */}
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Amaran Terkini
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {alerts.map((a, i) => (
                <p key={i}>• {a}</p>
              ))}
            </CardContent>
          </Card>

          {/* PENDING TABLE */}
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
              <CardTitle>Butiran Hantaran Markah</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Guru</TableHead>
                    <TableHead className="text-center">
                      Bil. Pelajar
                    </TableHead>
                    <TableHead className="text-center">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingSubmissions.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.class}</TableCell>
                      <TableCell>{row.teacher}</TableCell>
                      <TableCell className="text-center">
                        {row.students}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            row.status === "View"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

/* ================= SUMMARY CARD ================= */

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <Card className="shadow-lg border border-border/50">
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <h3 className="text-2xl font-bold mt-2">{value}</h3>
      </CardContent>
    </Card>
  );
}
