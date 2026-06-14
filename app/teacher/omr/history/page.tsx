"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Eye, ClipboardList, History, Loader2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { HeaderLastUpdated } from "@/components/header-last-updated";

type ScanRow = {
  omr_scan_id: string;
  student_id: string;
  student_name: string;
  student_identifier: string;
  class_id: string;
  class_name: string;
  grade: number;
  subject_id: string;
  subject_name: string;
  exam_id: string;
  exam_name: string;
  scan_date: string;
  objective_total_mark: number | null;
};

type Exam = {
  id: string;
  name: string;
  year: string;
};
type Assignment = {
  id: string;
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  grade: number | null;
};

const ALLOWED_ROLES = new Set(["subject teacher", "subject coordinator"]);
const PAGE_SIZE = 10;

export default function OMRHistoryPage() {
  const router = useRouter();
  const [teacherId] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const session = JSON.parse(localStorage.getItem("stg_session") ?? "null") as {
        user_id?: string; userId?: string; id?: string;
        userType?: string; role?: string;
      } | null;
      const role = String(session?.role ?? "").toLowerCase().trim();
      return session?.userType === "teacher" && ALLOWED_ROLES.has(role)
        ? String(session.user_id ?? session.userId ?? session.id ?? "").trim()
        : "";
    } catch {
      return "";
    }
  });
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filterExamId, setFilterExamId] = useState("all");
  const [filterAssignmentId, setFilterAssignmentId] = useState("all");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const raw = localStorage.getItem("stg_session");
    if (!raw) { router.replace("/login"); return; }
    try {
      const session = JSON.parse(raw) as {
        user_id?: string; userId?: string; id?: string;
        userType?: string; role?: string;
      };
      const role = String(session.role ?? "").toLowerCase().trim();
      if (session.userType !== "teacher" || !ALLOWED_ROLES.has(role)) {
        toast.error("Anda tidak dibenarkan akses halaman ini");
        router.replace("/teacher/dashboard");
        return;
      }
    } catch { router.replace("/login"); }
  }, [router]);

  useEffect(() => {
    if (!teacherId) return;
    Promise.all([
      fetch("/api/teacher/exams", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch(`/api/teacher/omr/assignments?teacher_id=${encodeURIComponent(teacherId)}&exam_id=all`)
        .then((r) => r.json())
        .catch(() => ({ data: [] })),
    ]).then(([eJson, aJson]) => {
      const assignmentList = Array.isArray(aJson?.data) ? (aJson.data as Assignment[]) : [];
      const examList = Array.isArray(eJson?.data) ? (eJson.data as Exam[]) : [];
      setExams(examList);
      setAssignments(assignmentList);
    });
  }, [teacherId]);

  const selectedAssignment = useMemo(
    () => assignments.find((a) => a.id === filterAssignmentId),
    [assignments, filterAssignmentId]
  );
  const totalPages = Math.max(1, Math.ceil(scans.length / PAGE_SIZE));
  const paginatedScans = useMemo(
    () => scans.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, scans],
  );
  const paginationItems = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, "ellipsis", totalPages] as const;
    if (currentPage >= totalPages - 2) {
      return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
    }
    return [1, "ellipsis-left", currentPage - 1, currentPage, currentPage + 1, "ellipsis-right", totalPages] as const;
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!teacherId) return;
    async function loadHistory() {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterExamId !== "all") params.set("exam_id", filterExamId);
      if (selectedAssignment?.class_id) params.set("class_id", selectedAssignment.class_id);
      if (selectedAssignment?.subject_id) params.set("subject_id", selectedAssignment.subject_id);

      try {
        const response = await fetch(`/api/teacher/omr/history?${params.toString()}`);
        const json = await response.json();
        if (!response.ok) throw new Error(json?.message || "Gagal memuatkan sejarah imbasan");
        setScans(Array.isArray(json?.data) ? json.data : []);
      } catch {
        toast.error("Gagal memuatkan sejarah imbasan");
        setScans([]);
      } finally {
        setLoading(false);
      }
    }
    void loadHistory();
  }, [teacherId, filterExamId, selectedAssignment]);

  function viewResult(scan: ScanRow) {
    const params = new URLSearchParams({
      student_id: scan.student_id,
      class_id: scan.class_id,
      subject_id: scan.subject_id,
      exam_id: scan.exam_id,
    });
    router.push(`/teacher/omr/results?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 shadow-sm">
          <History className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sejarah Imbasan OMR</h1>
          <p className="mt-1 font-medium text-muted-foreground">Semua imbasan OMR yang telah dijalankan.</p>
          <HeaderLastUpdated />
        </div>
      </div>

      <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
              <ClipboardList className="h-5 w-5 text-primary" />
              Rekod Imbasan
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={filterExamId} onValueChange={(value) => { setFilterExamId(value); setCurrentPage(1); }}>
                <SelectTrigger className="h-9 w-48 text-sm">
                  <SelectValue placeholder="Semua Peperiksaan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Peperiksaan</SelectItem>
                  {exams.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.year})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterAssignmentId} onValueChange={(value) => { setFilterAssignmentId(value); setCurrentPage(1); }}>
                <SelectTrigger className="h-9 w-52 text-sm">
                  <SelectValue placeholder="Semua Kelas/Subjek" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas/Subjek</SelectItem>
                  {assignments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.grade ?? "-"} {a.class_name} • {a.subject_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : scans.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Tiada rekod imbasan dijumpai.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="w-14 py-4 text-center font-semibold text-foreground">#</TableHead>
                    <TableHead className="py-4 font-semibold text-foreground">Pelajar</TableHead>
                    <TableHead className="py-4 font-semibold text-foreground">Kelas</TableHead>
                    <TableHead className="py-4 font-semibold text-foreground">Subjek</TableHead>
                    <TableHead className="py-4 font-semibold text-foreground">Peperiksaan</TableHead>
                    <TableHead className="py-4 text-center font-semibold text-foreground">Markah</TableHead>
                    <TableHead className="py-4 font-semibold text-foreground">Tarikh</TableHead>
                    <TableHead className="py-4 text-center font-semibold text-foreground">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedScans.map((scan, index) => (
                    <TableRow key={scan.omr_scan_id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <TableCell className="py-3 text-center text-muted-foreground">
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="font-semibold text-foreground">{scan.student_name}</div>
                        <div className="text-xs text-muted-foreground">{scan.student_identifier}</div>
                      </TableCell>
                      <TableCell className="py-3 text-sm text-foreground">
                        {scan.grade} {scan.class_name}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-foreground">{scan.subject_name}</TableCell>
                      <TableCell className="py-3 text-sm text-foreground">{scan.exam_name}</TableCell>
                      <TableCell className="py-3 text-center font-bold text-primary">
                        {scan.objective_total_mark ?? "-"}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground">
                        {(() => {
                          try { return format(new Date(scan.scan_date), "dd/MM/yyyy HH:mm"); }
                          catch { return scan.scan_date; }
                        })()}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => viewResult(scan)} className="gap-1.5 h-8 text-xs">
                            <Eye className="h-3.5 w-3.5" />
                            Lihat
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t border-border bg-muted/20 px-6 py-4">
                <div className="flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
                  <div className="text-muted-foreground">
                    Menunjukkan{" "}
                    <span className="font-semibold text-foreground">
                      {scans.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} -{" "}
                      {Math.min(currentPage * PAGE_SIZE, scans.length)}
                    </span>{" "}
                    daripada <span className="font-semibold text-foreground">{scans.length}</span> imbasan OMR
                  </div>
                  {totalPages > 1 ? (
                    <Pagination className="mx-0 w-auto">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
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
                                isActive={item === currentPage}
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
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                            onClick={(event) => {
                              event.preventDefault();
                              setCurrentPage((page) => Math.min(totalPages, page + 1));
                            }}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <Button variant="outline" onClick={() => router.push("/teacher/omr")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke OMR
        </Button>
      </div>
    </div>
  );
}
