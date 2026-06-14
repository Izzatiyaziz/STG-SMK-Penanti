"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { HeaderLastUpdated } from "@/components/header-last-updated";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, FileScan, Printer, XCircle, Loader2, HelpCircle, Save } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type OMRResultRow = {
  question_no?: number | string;
  detected_option?: string | null;
  expected_option?: string | null;
  status?: string | null;
};

type OMRResultPayload = {
  omr_scan_id?: string;
  total_questions?: number | string;
  correct?: number | string;
  wrong?: number | string;
  blank?: number | string;
  ambiguous?: number | string;
  warning?: string;
  student_name?: string;
  class_name?: string;
  class_grade?: number | string;
  results?: OMRResultRow[];
};

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getStatusMeta(status: string, detectedOption: string) {
  if (status === "ambiguous") {
    return { label: "Tidak Jelas", mark: 0, className: "border-amber-300 bg-amber-50 text-amber-800", icon: HelpCircle };
  }
  if (!detectedOption || status === "blank") {
    return { label: "Kosong", mark: 0, className: "border-slate-200 bg-slate-100 text-slate-700", icon: AlertTriangle };
  }
  if (status === "correct") {
    return { label: "Betul", mark: 1, className: "border-emerald-200 bg-emerald-100 text-emerald-700", icon: CheckCircle2 };
  }
  return { label: "Salah", mark: 0, className: "border-rose-200 bg-rose-100 text-rose-700", icon: XCircle };
}

function SummaryBadge({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <Badge variant="outline" className={className}>
      {label}: {value}
    </Badge>
  );
}

const OPTIONS = ["A", "B", "C", "D"] as const;

export default function OMRResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resultRaw, setResultRaw] = useState<OMRResultPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Context IDs needed for review API
  const student_id = searchParams.get("student_id") ?? "";
  const class_id = searchParams.get("class_id") ?? "";
  const subject_id = searchParams.get("subject_id") ?? "";
  const exam_id = searchParams.get("exam_id") ?? "";

  useEffect(() => {
    const raw = localStorage.getItem("stg_session");
    if (!raw) { router.replace("/login"); return; }
    try {
      const session = JSON.parse(raw) as { userType?: string; role?: string };
      const role = String(session.role ?? "").toLowerCase().trim();
      if (session.userType !== "teacher" || !new Set(["subject teacher", "subject coordinator"]).has(role)) {
        toast.error("Anda tidak dibenarkan akses halaman ini");
        router.replace(role === "subject coordinator" ? "/coordinator/dashboard" : "/teacher/dashboard");
        return;
      }
    } catch { router.replace("/login"); return; }

    if (student_id && class_id && subject_id && exam_id) {
      const params = new URLSearchParams({ student_id, class_id, subject_id, exam_id });
      fetch(`/api/teacher/omr/result?${params.toString()}`)
        .then((r) => r.json())
        .then((json) => {
          if (json?.success) setResultRaw(json as OMRResultPayload);
          else {
            const stored = sessionStorage.getItem("stg_omr_last_result");
            setResultRaw(stored ? JSON.parse(stored) as OMRResultPayload : null);
          }
        })
        .catch(() => {
          const stored = sessionStorage.getItem("stg_omr_last_result");
          setResultRaw(stored ? JSON.parse(stored) as OMRResultPayload : null);
        })
        .finally(() => setLoading(false));
    } else {
      const stored = sessionStorage.getItem("stg_omr_last_result");
      setResultRaw(stored ? JSON.parse(stored) as OMRResultPayload : null);
      setLoading(false);
    }
  }, [router, student_id, class_id, subject_id, exam_id]);

  const summary = useMemo(() => {
    const results = Array.isArray(resultRaw?.results) ? resultRaw!.results : [];
    const needsReviewCount = results.filter((r) => {
      const s = String(r.status ?? "").toLowerCase();
      return s === "ambiguous" || s === "blank";
    }).length;
    const totalMarks = results.reduce((total, row) => {
      const qno = toNumber(row.question_no);
      const status = String(row.status ?? "").toLowerCase();
      const detected = overrides[qno] ?? String(row.detected_option ?? "").trim();
      const needsReview = status === "ambiguous" || status === "blank";
      const effectiveStatus =
        needsReview && overrides[qno]
          ? (overrides[qno] === String(row.expected_option ?? "").trim().toUpperCase() ? "correct" : "wrong")
          : status;
      return total + getStatusMeta(effectiveStatus, detected).mark;
    }, 0);
    return {
      correct: toNumber(resultRaw?.correct),
      wrong: toNumber(resultRaw?.wrong),
      blank: toNumber(resultRaw?.blank),
      needsReviewCount,
      totalMarks,
      totalQuestions: toNumber(resultRaw?.total_questions) || results.length,
      warning: typeof resultRaw?.warning === "string" ? resultRaw.warning : "",
      results,
      omrScanId: resultRaw?.omr_scan_id ?? "",
    };
  }, [resultRaw, overrides]);

  const pendingReview = summary.results.filter((r) => {
    const s = String(r.status ?? "").toLowerCase();
    return (s === "ambiguous" || s === "blank") && !overrides[toNumber(r.question_no)];
  }).length;

  async function saveReview() {
    if (!summary.omrScanId) {
      toast.error("ID imbasan tidak dijumpai — sila semak semula dari halaman OMR");
      return;
    }
    let reviewContext = { student_id, subject_id, exam_id, class_id };
    if (!reviewContext.student_id || !reviewContext.subject_id || !reviewContext.exam_id || !reviewContext.class_id) {
      try {
        const stored = JSON.parse(localStorage.getItem("stg_marks_context") ?? "{}") as Partial<typeof reviewContext>;
        reviewContext = {
          student_id: reviewContext.student_id || String(stored.student_id ?? "").trim(),
          subject_id: reviewContext.subject_id || String(stored.subject_id ?? "").trim(),
          exam_id: reviewContext.exam_id || String(stored.exam_id ?? "").trim(),
          class_id: reviewContext.class_id || String(stored.class_id ?? "").trim(),
        };
      } catch {
        // The validation below handles invalid stored context.
      }
    }
    if (!reviewContext.student_id || !reviewContext.subject_id || !reviewContext.exam_id || !reviewContext.class_id) {
      toast.error("Maklumat pelajar tidak lengkap");
      return;
    }
    setIsSaving(true);
    try {
      const overrideList = Object.entries(overrides).map(([q, opt]) => ({
        question_no: Number(q),
        selected_option: opt,
      }));
      const res = await fetch("/api/teacher/omr/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          omr_scan_id: summary.omrScanId,
          ...reviewContext,
          overrides: overrideList,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.message || "Gagal menyimpan semakan");
        return;
      }
      toast.success("Semakan berjaya disimpan!");
      // Refresh result from DB
      const params = new URLSearchParams(reviewContext);
      const refreshed = await fetch(`/api/teacher/omr/result?${params.toString()}`).then((r) => r.json());
      if (refreshed?.success) {
        setResultRaw(refreshed as OMRResultPayload);
        setOverrides({});
      }
    } catch {
      toast.error("Gagal menghubungi server");
    } finally {
      setIsSaving(false);
    }
  }

  function goToMarksEntry() {
    let marksContext = { class_id, subject_id, exam_id };
    if (!marksContext.class_id || !marksContext.subject_id || !marksContext.exam_id) {
      try {
        const stored = JSON.parse(localStorage.getItem("stg_marks_context") ?? "{}") as Partial<typeof marksContext>;
        marksContext = {
          class_id: marksContext.class_id || String(stored.class_id ?? "").trim(),
          subject_id: marksContext.subject_id || String(stored.subject_id ?? "").trim(),
          exam_id: marksContext.exam_id || String(stored.exam_id ?? "").trim(),
        };
      } catch {
        // The marks page will show empty filters if no valid context is available.
      }
    }

    if (marksContext.class_id && marksContext.subject_id && marksContext.exam_id) {
      sessionStorage.setItem(
        "stg_marks_entry_context",
        JSON.stringify({
          ...marksContext,
          view_only: true,
        }),
      );
    }
    router.push("/teacher/my-subject");
  }

  function exportPDF() {
    const doc = new jsPDF();
    const studentName = String(resultRaw?.student_name ?? "").trim() || "-";
    const classLabel = [
      String(resultRaw?.class_grade ?? "").trim(),
      String(resultRaw?.class_name ?? "").trim(),
    ].filter(Boolean).join(" ") || "-";
    doc.setFontSize(14);
    doc.text("Keputusan OMR", 14, 16);
    doc.setFontSize(10);
    doc.text(`Nama Pelajar: ${studentName}`, 14, 24);
    doc.text(`Kelas: ${classLabel}`, 14, 30);
    doc.text(
      `Betul: ${summary.correct}  Salah: ${summary.wrong}  Kosong: ${summary.blank}  Jumlah: ${summary.totalMarks}/${summary.totalQuestions}`,
      14,
      36
    );
    autoTable(doc, {
      startY: 42,
      head: [["No.", "Jawapan Pelajar", "Skema", "Status", "Markah"]],
      body: summary.results.map((row) => {
        const qno = toNumber(row.question_no);
        const status = String(row.status ?? "").toLowerCase();
        const detected = overrides[qno] ?? String(row.detected_option ?? "").trim();
        const needsReview = status === "ambiguous" || status === "blank";
        const effectiveStatus =
          needsReview && overrides[qno]
            ? (overrides[qno] === String(row.expected_option ?? "").trim().toUpperCase() ? "correct" : "wrong")
            : status;
        const meta = getStatusMeta(effectiveStatus, detected);
        return [String(row.question_no ?? ""), detected || "-", String(row.expected_option ?? "").trim() || "-", meta.label, meta.mark];
      }),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save(`OMR_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuatkan keputusan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
          <FileScan className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Keputusan OMR</h1>
          <p className="mt-1 font-medium text-muted-foreground">
            Semak jawapan, status pengesanan, dan markah OMR pelajar.
          </p>
          <HeaderLastUpdated />
        </div>
      </div>

      <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border px-6 py-5">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Keputusan OMR
            </CardTitle>
            {summary.needsReviewCount > 0 && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" />
                {pendingReview > 0
                  ? `${pendingReview} soalan perlu disemak`
                  : "Semua soalan telah disemak"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {resultRaw ? (
            <div className="mx-auto max-w-5xl space-y-4 text-sm">
              {summary.warning && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {summary.warning}
                </div>
              )}

              {summary.needsReviewCount > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="font-semibold">Terdapat {summary.needsReviewCount} soalan perlu semakan manual</p>
                  <p className="mt-0.5 text-amber-700">
                    Soalan bertanda <strong>Tidak Jelas</strong> atau <strong>Kosong</strong> — klik A/B/C/D untuk pilih jawapan, kemudian klik Simpan Semakan.
                  </p>
                </div>
              )}

              {summary.results.length > 0 ? (
                <div className="mx-auto overflow-hidden rounded-lg border border-border">
                  <Table className="w-full table-fixed">
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="w-[10%] py-4 text-center font-semibold text-foreground">#</TableHead>
                        <TableHead className="w-[25%] py-4 text-center font-semibold text-foreground">Jawapan Pelajar</TableHead>
                        <TableHead className="w-[20%] py-4 text-center font-semibold text-foreground">Skema</TableHead>
                        <TableHead className="w-[25%] py-4 text-center font-semibold text-foreground">Status</TableHead>
                        <TableHead className="w-[20%] py-4 text-center font-semibold text-foreground">Markah</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.results.map((row) => {
                        const qno = toNumber(row.question_no);
                        const status = String(row.status ?? "").toLowerCase();
                        const needsReview = status === "ambiguous" || status === "blank";
                        const override = overrides[qno];
                        const detected = override ?? String(row.detected_option ?? "").trim();
                        const expected = String(row.expected_option ?? "").trim().toUpperCase();
                        const effectiveStatus = needsReview && override
                          ? (override === expected ? "correct" : "wrong")
                          : status;
                        const meta = getStatusMeta(effectiveStatus, detected);
                        const StatusIcon = meta.icon;
                        return (
                          <TableRow
                            key={String(row.question_no ?? "")}
                            className={`border-b border-border transition-colors last:border-0 hover:bg-muted/50 ${needsReview && !override ? "bg-amber-50/40" : ""}`}
                          >
                            <TableCell className="py-4 text-center font-medium text-muted-foreground">{row.question_no}</TableCell>
                            <TableCell className="py-4 text-center">
                              {needsReview ? (
                                <div className="flex items-center justify-center gap-1">
                                  {OPTIONS.map((opt) => (
                                    <button
                                      key={opt}
                                      onClick={() => setOverrides((prev) => ({ ...prev, [qno]: opt }))}
                                      className={`h-7 w-7 rounded-md border text-xs font-bold transition-colors ${
                                        override === opt
                                          ? "border-primary bg-primary text-primary-foreground"
                                          : "border-border bg-background text-foreground hover:border-primary hover:bg-primary/10"
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="font-semibold text-foreground">{detected || "-"}</span>
                              )}
                            </TableCell>
                            <TableCell className="py-4 text-center font-semibold text-foreground">{expected || "-"}</TableCell>
                            <TableCell className="py-4 text-center">
                              <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold ${meta.className}`}>
                                <StatusIcon className="h-4 w-4" />
                                {meta.label}
                              </span>
                            </TableCell>
                            <TableCell className="py-4 text-center font-semibold text-foreground">{meta.mark}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground">Tiada data keputusan dijumpai.</p>
              )}

              <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <SummaryBadge label="Betul" value={summary.correct} className="border-emerald-200 bg-emerald-100 text-emerald-700" />
                  <SummaryBadge label="Salah" value={summary.wrong} className="border-rose-200 bg-rose-100 text-rose-700" />
                  <SummaryBadge label="Kosong" value={summary.blank} className="border-slate-200 bg-slate-100 text-slate-700" />
                  {summary.needsReviewCount > 0 && (
                    <SummaryBadge label="Perlu Semak" value={summary.needsReviewCount} className="border-amber-300 bg-amber-50 text-amber-800" />
                  )}
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-5 py-3 text-right shadow-xs">
                  <div className="text-xs font-medium text-muted-foreground">Jumlah Markah</div>
                  <div className="text-2xl font-bold text-primary">{summary.totalMarks}/{summary.totalQuestions}</div>
                </div>
              </div>

              <div className="flex gap-3 print:hidden">
                {Object.keys(overrides).length > 0 && (
                  <Button
                    onClick={saveReview}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Simpan Semakan ({Object.keys(overrides).length} dipilih)
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tiada keputusan OMR dijumpai. Sila buat imbasan dahulu.
            </p>
          )}

          <div className="mx-auto flex max-w-5xl items-center gap-3 overflow-x-auto print:hidden">
              <Button variant="outline" className="shrink-0" onClick={() => router.push("/teacher/omr")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke OMR
              </Button>
              <Button variant="outline" className="shrink-0" onClick={goToMarksEntry}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Pemarkahan Markah
              </Button>
              <Button variant="outline" className="shrink-0" onClick={exportPDF}>
                <Printer className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
