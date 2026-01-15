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
  CheckCircle,
  XCircle,
  ClipboardCheck,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

/* ================= DUMMY DATA (3 PENDING) ================= */

const submissions = [
  {
    id: 1,
    subject: "Matematik",
    className: "2 Ibnu Majah",
    teacher: "Encik Ali bin Abu",
    submittedAt: "12 Jan 2026",
    status: "Pending",
    marks: [
      { student: "Siti Aminah", objective: 35, subjective: 40 },
      { student: "Chong Wei Ling", objective: 38, subjective: 42 },
      { student: "Ravi Muthusamy", objective: 40, subjective: 45 },
    ],
  },
  {
    id: 2,
    subject: "Matematik",
    className: "2 Ibnu Sina",
    teacher: "Encik Tan Bon Hong",
    submittedAt: "12 Jan 2026",
    status: "Pending",
    marks: [
      { student: "Aisyah Nadia", objective: 36, subjective: 41 },
      { student: "Adam Firdaus", objective: 34, subjective: 38 },
    ],
  },
  {
    id: 3,
    subject: "Matematik",
    className: "2 Ibnu Khaldun",
    teacher: "Pn. Siti Yusmiza binti Abdullah",
    submittedAt: "13 Jan 2026",
    status: "Pending",
    marks: [
      { student: "Nur Hakimi", objective: 39, subjective: 44 },
      { student: "Aina Farhana", objective: 37, subjective: 40 },
      { student: "Daniel Amir", objective: 35, subjective: 39 },
    ],
  },
  {
    id: 4,
    subject: "Matematik",
    className: "3 Ibnu Arif",
    teacher: "Encik Tan Bon Hong",
    submittedAt: "13 Jan 2026",
    status: "Approved",
    marks: [
      { student: "Farhan Zikri", objective: 38, subjective: 42 },
      { student: "Nabila Sofea", objective: 36, subjective: 40 },
    ],
  },
  {
    id: 5,
    subject: "Matematik",
    className: "3 Ibnu Khaldun",
    teacher: "Pn. Siti Yusmiza binti Abdullah",
    submittedAt: "14 Jan 2026",
    status: "Rejected",
    marks: [
      { student: "Irfan Hakim", objective: 42, subjective: 45 }, // ❌ over
      { student: "Sofia Alya", objective: 38, subjective: 40 },
    ],
  },
];

/* ================= PAGE ================= */

export default function SubjectCoordinatorApprovalPage() {
  const [data, setData] = useState(submissions);
  const [selected, setSelected] = useState<any | null>(null);

  function handleApprove(id: number) {
    setData((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "Approved" } : s
      )
    );
    toast.success("Markah diluluskan");
    setSelected(null);
  }

  function handleReject(id: number) {
    setData((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "Rejected" } : s
      )
    );
    toast.error("Markah ditolak. Sila semak semula.");
    setSelected(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ================= HEADER ================= */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <ClipboardCheck className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Approval Markah Subjek
            </h1>
          </div>
          <p className="text-muted-foreground">
            Semakan markah objektif dan subjektif sebelum kelulusan
          </p>
        </div>

        {/* ================= SUBMISSION LIST ================= */}
        <Card className="shadow-lg border border-border/50">
          <CardHeader>
            <CardTitle>
              Senarai Hantaran Markah (Pending:{" "}
              {data.filter(d => d.status === "Pending").length})
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subjek</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Guru</TableHead>
                  <TableHead>Tarikh</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.subject}</TableCell>
                    <TableCell>{s.className}</TableCell>
                    <TableCell>{s.teacher}</TableCell>
                    <TableCell>{s.submittedAt}</TableCell>

                    <TableCell className="text-center">
                      {s.status === "Pending" && (
                        <Badge variant="outline" className="text-yellow-600">
                          Pending
                        </Badge>
                      )}
                      {s.status === "Approved" && (
                        <Badge className="bg-green-100 text-green-700">
                          Approved
                        </Badge>
                      )}
                      {s.status === "Rejected" && (
                        <Badge className="bg-red-100 text-red-700">
                          Rejected
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelected(s)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Lihat Markah
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ================= DETAIL VIEW ================= */}
        {selected && (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
              <CardTitle>
                Semakan Markah – {selected.className}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pelajar</TableHead>
                    <TableHead className="text-center">Objektif</TableHead>
                    <TableHead className="text-center">Subjektif</TableHead>
                    <TableHead className="text-center">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {selected.marks.map((m: any, i: number) => {
                    const total = m.objective + m.subjective;
                    const invalid = total > 100;

                    return (
                      <TableRow key={i} className={invalid ? "bg-red-50" : ""}>
                        <TableCell>{m.student}</TableCell>
                        <TableCell className="text-center">{m.objective}</TableCell>
                        <TableCell className="text-center">{m.subjective}</TableCell>
                        <TableCell className="text-center font-semibold">
                          {total}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selected.id)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button onClick={() => handleApprove(selected.id)}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
