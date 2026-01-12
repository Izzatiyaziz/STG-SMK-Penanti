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
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ClipboardList,
  UserCheck,
  Download,
  Crown,
} from "lucide-react";

/* ================= DUMMY DATA ================= */

const coordinatorInfo = {
  id: "T000",
  name: "Pn. Raudhatul binti Idris",
  subject: "Matematik",
  classes: ["5 Ibnu Sains", "4 Ibnu Maju"],
};

const teacherAssignments = [
  {
    id: coordinatorInfo.id,
    name: coordinatorInfo.name,
    classes: coordinatorInfo.classes,
    isCoordinator: true,
  },
  {
    id: "T001",
    name: "Encik Ali",
    classes: ["2 Ibnu Sina", "3 Ibnu Arif"],
  },
  {
    id: "T002",
    name: "Encik Siti",
    classes: ["4 Ibnu Maju", "5 Ibnu Sains"],
  },
  {
    id: "T003",
    name: "Encik Tan",
    classes: ["1 Ibnu Pintar", "2 Ibnu Pintar", "3 Ibnu Pintar"],
  },
];

export default function SubjectCoordinatorAssignmentsPage() {
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
              Senarai Teachers
            </h1>
          </div>
          <p className="text-muted-foreground">
            Senarai guru subjek dan kelas bagi Jabatan Matematik
          </p>
        </div>

        {/* ================= COORDINATOR INFO ================= */}
        <Card className="shadow-lg border border-border/50">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Subject Coordinator
              </p>
              <h3 className="text-xl font-semibold mt-2">
                {coordinatorInfo.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Subjek: {coordinatorInfo.subject}
              </p>
            </div>
            <UserCheck className="w-6 h-6 text-primary" />
          </CardContent>
        </Card>

        {/* ================= ASSIGNMENT TABLE ================= */}
        <Card className="shadow-lg border border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Senarai Guru Subjek & Kelas
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Guru</TableHead>
                  <TableHead>Nama Guru</TableHead>
                  <TableHead>Kelas Diassign</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {teacherAssignments.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-mono">
                      {teacher.id}
                    </TableCell>

                    <TableCell className="font-medium flex items-center gap-2">
                      {teacher.name}
                      {teacher.isCoordinator && (
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          <Crown className="w-3 h-3 mr-1" />
                          Coordinator
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {teacher.classes.map((cls, i) => (
                          <Badge key={i} variant="secondary">
                            {cls}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ================= ACTION ================= */}
        <div className="flex justify-end">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export in PDF
          </Button>
        </div>

      </div>
    </div>
  );
}
