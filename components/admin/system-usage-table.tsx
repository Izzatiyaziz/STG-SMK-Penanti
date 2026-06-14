"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatMalaysiaDateTime } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Filter, ShieldAlert } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 10;

export type SystemUsageLogRow = {
  session_id: string;
  user_id: string;
  user_name?: string | null;
  role: string;
  action?: string | null;
  login_time: string;
  logout_time?: string | null;
  record_type?: "session" | "security";
  severity?: "low" | "medium" | "high" | "critical";
  status?: "success" | "detected" | "blocked";
  ip_address?: string | null;
  identifier?: string | null;
  endpoint?: string | null;
  details?: { reason?: string } | null;
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
  return formatMalaysiaDateTime(value);
}

function formatAction(action?: string | null) {
  const labels: Record<string, string> = {
    failed_login: "Login gagal",
    brute_force: "Brute force",
    password_reset_abuse: "Penyalahgunaan reset kata laluan",
    xss_attempt: "Cubaan XSS",
    filter_injection: "Cubaan filter injection",
    "Log Masuk": "Log masuk",
  };
  return labels[String(action ?? "")] ?? action ?? "Aktiviti sistem";
}

function statusBadge(log: SystemUsageLogRow) {
  if (log.status === "blocked") {
    return <Badge variant="destructive">Disekat</Badge>;
  }
  if (log.status === "detected") {
    return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">Dikesan</Badge>;
  }
  return <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">Berjaya</Badge>;
}

export default function AdminSystemUsageTable({
  logs,
  loading = false,
  emptyText = "Tiada rekod penggunaan sistem dijumpai.",
  className,
  title,
  description,
}: AdminSystemUsageTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedLogs = useMemo(
    () => logs.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE),
    [activePage, logs],
  );
  const paginationItems = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
    if (activePage <= 3) return [1, 2, 3, 4, "ellipsis", totalPages] as const;
    if (activePage >= totalPages - 2) {
      return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
    }
    return [1, "ellipsis-left", activePage - 1, activePage, activePage + 1, "ellipsis-right", totalPages] as const;
  }, [activePage, totalPages]);

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
                  <TableHead className="font-semibold text-foreground py-4">Pengguna / Sasaran</TableHead>
                  <TableHead className="font-semibold text-foreground py-4">Jawatan</TableHead>
                  <TableHead className="font-semibold text-foreground py-4">Aktiviti</TableHead>
                  <TableHead className="font-semibold text-foreground py-4">Alamat IP</TableHead>
                  <TableHead className="font-semibold text-foreground py-4">Status</TableHead>
                  <TableHead className="font-semibold text-foreground py-4">Masa</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedLogs.map((log, index) => (
                  <TableRow
                    key={log.session_id}
                    className={cn(
                      "hover:bg-muted/50 transition-colors border-b border-border last:border-0",
                      log.record_type === "security" && "bg-destructive/[0.035]"
                    )}
                  >
                    <TableCell className="py-4 text-center text-muted-foreground">
                      {(activePage - 1) * PAGE_SIZE + index + 1}
                    </TableCell>
                    <TableCell className="py-4 font-medium">
                      {log.user_name ?? log.user_id}
                    </TableCell>
                    <TableCell className="py-4">
                      {formatRoleLabel(log.role)}
                    </TableCell>
                    <TableCell className="py-4 min-w-52">
                      <div className="flex items-start gap-2">
                        {log.record_type === "security" && (
                          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                        )}
                        <div>
                          <p className="font-medium">{formatAction(log.action)}</p>
                          {log.details?.reason && (
                            <p className="mt-1 text-xs text-muted-foreground">{log.details.reason}</p>
                          )}
                          {log.endpoint && (
                            <p className="mt-1 font-mono text-xs text-muted-foreground">{log.endpoint}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 font-mono text-xs">
                      {log.ip_address ?? "-"}
                    </TableCell>
                    <TableCell className="py-4">
                      {statusBadge(log)}
                    </TableCell>
                    <TableCell className="py-4 font-mono text-sm whitespace-nowrap">
                      {formatDateTime(log.login_time)}
                    </TableCell>
                  </TableRow>
                ))}

                {!loading && logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-16">
                      {emptyText}
                    </TableCell>
                  </TableRow>
                )}

                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-16">
                      Memuatkan...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {!loading && logs.length > 0 && (
            <div className="border-t border-border bg-muted/20 px-6 py-4">
              <div className="flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
                <p className="text-muted-foreground">
                  Menunjukkan{" "}
                  <span className="font-semibold text-foreground">
                    {(activePage - 1) * PAGE_SIZE + 1} - {Math.min(activePage * PAGE_SIZE, logs.length)}
                  </span>{" "}
                  daripada <span className="font-semibold text-foreground">{logs.length}</span> rekod
                </p>
                {totalPages > 1 && (
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          className={activePage === 1 ? "pointer-events-none opacity-50" : undefined}
                          onClick={(event) => {
                            event.preventDefault();
                            setCurrentPage((page) => Math.max(1, page - 1));
                          }}
                        />
                      </PaginationItem>
                      {paginationItems.map((item, index) =>
                        typeof item === "number" ? (
                          <PaginationItem key={item}>
                            <PaginationLink
                              href="#"
                              isActive={item === activePage}
                              onClick={(event) => {
                                event.preventDefault();
                                setCurrentPage(item);
                              }}
                            >
                              {item}
                            </PaginationLink>
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={`${item}-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ),
                      )}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          className={activePage === totalPages ? "pointer-events-none opacity-50" : undefined}
                          onClick={(event) => {
                            event.preventDefault();
                            setCurrentPage((page) => Math.min(totalPages, page + 1));
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
