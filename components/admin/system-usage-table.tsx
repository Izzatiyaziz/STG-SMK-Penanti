"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
};

export default function AdminSystemUsageTable({
  logs,
  loading = false,
  emptyText = "Tiada rekod penggunaan sistem dijumpai.",
  className,
}: AdminSystemUsageTableProps) {
  return (
    <Card className={cn("border border-border/50 shadow-lg", className)}>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">No</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Peranan</TableHead>
                <TableHead>Aktiviti</TableHead>
                <TableHead>Tarikh</TableHead>
                <TableHead>Masa</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {logs.map((log, index) => {
                const dt = new Date(log.login_time);
                const date = dt.toLocaleDateString("ms-MY");
                const time = dt.toLocaleTimeString("ms-MY", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <TableRow key={log.session_id}>
                    <TableCell className="text-center">{index + 1}</TableCell>
                    <TableCell>{log.user_name ?? log.user_id}</TableCell>
                    <TableCell>{log.role}</TableCell>
                    <TableCell>{log.action ?? "Log Masuk"}</TableCell>
                    <TableCell>{date}</TableCell>
                    <TableCell>{time}</TableCell>
                  </TableRow>
                );
              })}

              {!loading && logs.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-10"
                  >
                    {emptyText}
                  </TableCell>
                </TableRow>
              )}

              {loading && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-10"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

