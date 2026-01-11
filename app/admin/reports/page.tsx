"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, FileText } from "lucide-react";

/**
 * ===============================
 * DUMMY SYSTEM USAGE LOGS
 * ===============================
 */
const usageLogs = [
  {
    id: 1,
    role: "Pelajar",
    action: "Akses Keputusan Peperiksaan",
    date: "20/06/2025",
    time: "10:32 AM",
  },
  {
    id: 2,
    role: "Pelajar",
    action: "Muat Turun Slip Keputusan",
    date: "20/06/2025",
    time: "10:35 AM",
  },
  {
    id: 3,
    role: "Guru",
    action: "Kemas Kini Markah Peperiksaan",
    date: "19/06/2025",
    time: "3:15 PM",
  },
  {
    id: 4,
    role: "Pentadbir",
    action: "Menjana Laporan Peperiksaan",
    date: "18/06/2025",
    time: "9:05 AM",
  },
  {
    id: 5,
    role: "Pelajar",
    action: "Log Masuk Sistem",
    date: "18/06/2025",
    time: "8:40 AM",
  },
];

export default function AdminReportsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ================= HEADER ================= */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Log Penggunaan Sistem
            </h1>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            Paparan rekod aktiviti pengguna bagi tujuan pemantauan dan audit
            penggunaan sistem oleh pihak pentadbiran.
          </p>
        </div>

        {/* ================= LOG TABLE ================= */}
        <Card className="border border-border/50 shadow-lg">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">No</TableHead>
                  <TableHead>Peranan</TableHead>
                  <TableHead>Aktiviti</TableHead>
                  <TableHead>Tarikh</TableHead>
                  <TableHead>Masa</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {usageLogs.map((log, index) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-center">
                      {index + 1}
                    </TableCell>
                    <TableCell>{log.role}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.date}</TableCell>
                    <TableCell>{log.time}</TableCell>
                  </TableRow>
                ))}

                {usageLogs.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-10"
                    >
                      Tiada rekod penggunaan sistem dijumpai.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
