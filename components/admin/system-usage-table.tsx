"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Filter } from "lucide-react";

export type SystemUsageLogRow = {
  session_id: string;
  user_id: string;
  user_name?: string | null;
  role: string;
  action?: string | null;
  login_time: string;
  logout_time?: string | null;
};

type AdminSystemUsageTableProps = {
  logs: SystemUsageLogRow[];
  loading?: boolean;
  emptyText?: string;
  className?: string;
  title?: string;
  description?: string;
};

function formatRoleLabel(role?: string | null) {
  switch (String(role ?? "").toLowerCase().trim()) {
    case "admin":
      return "Pentadbir";
    case "student":
      return "Pelajar";
    case "principal":
      return "Pengetua";
    case "class teacher":
      return "Guru Kelas";
    case "subject teacher":
      return "Guru Subjek";
    case "subject coordinator":
      return "Panitia Subjek";
    case "teacher":
      return "Guru";
    default:
      return "Jawatan belum ditetapkan";
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("ms-MY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function AdminSystemUsageTable({
  logs,
  loading = false,
  emptyText = "Tiada rekod penggunaan sistem dijumpai.",
  className,
  title,
  description,
}: AdminSystemUsageTableProps) {
  return (
    <Card className={cn("border-border bg-card shadow-md rounded-xl overflow-hidden", className)}>
      {(title || description) && (
        <CardHeader className="border-b border-border bg-gradient-to-r from-card to-card/80 px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              {title && (
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Filter className="w-5 h-5 text-primary" />
                  {title}
                </CardTitle>
              )}
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-primary font-medium">
                <Filter className="w-3 h-3" />
                {logs.length} rekod
              </div>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className={cn(title || description ? "p-6" : "p-0")}>
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="font-semibold text-foreground py-4 w-16 text-center">#</TableHead>
                  <TableHead className="font-semibold text-foreground py-4">Nama</TableHead>
                  <TableHead className="font-semibold text-foreground py-4">Jawatan</TableHead>
                  <TableHead className="font-semibold text-foreground py-4">Log Masuk</TableHead>
                  <TableHead className="font-semibold text-foreground py-4">Log Keluar</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {logs.map((log, index) => (
                  <TableRow
                    key={log.session_id}
                    className="hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                  >
                    <TableCell className="py-4 text-center text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="py-4 font-medium">
                      {log.user_name ?? log.user_id}
                    </TableCell>
                    <TableCell className="py-4">
                      {formatRoleLabel(log.role)}
                    </TableCell>
                    <TableCell className="py-4 font-mono text-sm">
                      {formatDateTime(log.login_time)}
                    </TableCell>
                    <TableCell className="py-4 font-mono text-sm">
                      {formatDateTime(log.logout_time)}
                    </TableCell>
                  </TableRow>
                ))}

                {!loading && logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-16">
                      {emptyText}
                    </TableCell>
                  </TableRow>
                )}

                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-16">
                      Memuatkan...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

