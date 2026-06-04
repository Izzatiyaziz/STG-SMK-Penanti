"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, XCircle } from "lucide-react";

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
  total_questions?: number | string;
  correct?: number | string;
  wrong?: number | string;
  blank?: number | string;
  warning?: string;
  results?: OMRResultRow[];
};

function toNumber(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getStatusMeta(status: string, detectedOption: string) {
  if (!detectedOption || status === "blank") {
    return {
      label: "Kosong",
      mark: 0,
      className: "border-slate-200 bg-slate-100 text-slate-700",
      icon: AlertTriangle,
    };
  }

  if (status === "correct") {
    return {
      label: "Betul",
      mark: 1,
      className: "border-emerald-200 bg-emerald-100 text-emerald-700",
      icon: CheckCircle2,
    };
  }

  return {
    label: "Salah",
    mark: 0,
    className: "border-rose-200 bg-rose-100 text-rose-700",
    icon: XCircle,
  };
}

function SummaryBadge({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <Badge variant="outline" className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${className}`}>
      {label}: {value}
    </Badge>
  );
}

export default function OMRResultsPage() {
  const router = useRouter();
  const [resultRaw] = useState<OMRResultPayload | null>(() => {
    if (typeof window === "undefined") return null;

    const stored = sessionStorage.getItem("stg_omr_last_result");
    if (!stored) return null;

    try {
      return JSON.parse(stored) as OMRResultPayload;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const raw = localStorage.getItem("stg_session");
    if (!raw) {
      router.replace("/login");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      router.replace("/login");
      return;
    }

    const session = parsed as { userType?: string; role?: string };
    const role = String(session.role ?? "").toLowerCase().trim();
    const allowedRoles = new Set(["subject teacher", "subject coordinator"]);

    if (session.userType !== "teacher" || !allowedRoles.has(role)) {
      toast.error("Anda tidak dibenarkan akses halaman ini");
      router.replace(
        role === "subject coordinator"
          ? "/coordinator/dashboard"
          : "/teacher/dashboard",
      );
    }
  }, [router]);

  const summary = useMemo(() => {
    const results = Array.isArray(resultRaw?.results) ? resultRaw.results : [];
    const totalMarks = results.reduce((total, row) => {
      const status = String(row.status ?? "").toLowerCase();
      const detectedOption = String(row.detected_option ?? "").trim();
      return total + getStatusMeta(status, detectedOption).mark;
    }, 0);
    const totalQuestions = toNumber(resultRaw?.total_questions) || results.length;

    return {
      correct: toNumber(resultRaw?.correct),
      wrong: toNumber(resultRaw?.wrong),
      blank: toNumber(resultRaw?.blank),
      totalMarks,
      totalQuestions,
      warning: typeof resultRaw?.warning === "string" ? resultRaw.warning : "",
      results,
    };
  }, [resultRaw]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden rounded-xl border-border bg-card shadow-md">
          <CardHeader className="border-b border-border px-6 py-5">
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Keputusan OMR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {resultRaw ? (
              <div className="mx-auto max-w-5xl space-y-4 text-sm">
                {summary.warning ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {summary.warning}
                  </div>
                ) : null}

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
                          const status = String(row.status ?? "").toLowerCase();
                          const detectedOption = String(row.detected_option ?? "").trim();
                          const expectedOption = String(row.expected_option ?? "").trim();
                          const statusMeta = getStatusMeta(status, detectedOption);
                          const StatusIcon = statusMeta.icon;

                          return (
                            <TableRow
                              key={String(row.question_no ?? "")}
                              className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
                            >
                              <TableCell className="py-4 text-center font-medium text-muted-foreground">
                                {row.question_no}
                              </TableCell>
                              <TableCell className="py-4 text-center font-semibold text-foreground">
                                {detectedOption || "-"}
                              </TableCell>
                              <TableCell className="py-4 text-center font-semibold text-foreground">
                                {expectedOption || "-"}
                              </TableCell>
                              <TableCell className="py-4 text-center">
                                <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold ${statusMeta.className}`}>
                                  <StatusIcon className="h-4 w-4" />
                                  {statusMeta.label}
                                </span>
                              </TableCell>
                              <TableCell className="py-4 text-center font-semibold text-foreground">
                                {statusMeta.mark}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Tiada data keputusan dijumpai (result belum disimpan dalam sessionStorage).
                  </p>
                )}

                <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <SummaryBadge
                      label="Betul"
                      value={summary.correct}
                      className="border-emerald-200 bg-emerald-100 text-emerald-700"
                    />
                    <SummaryBadge
                      label="Salah"
                      value={summary.wrong}
                      className="border-rose-200 bg-rose-100 text-rose-700"
                    />
                    <SummaryBadge
                      label="Kosong"
                      value={summary.blank}
                      className="border-slate-200 bg-slate-100 text-slate-700"
                    />
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-5 py-3 text-right shadow-xs">
                    <div className="text-xs font-medium text-muted-foreground">Jumlah Markah</div>
                    <div className="text-2xl font-bold text-primary">
                      {summary.totalMarks}/{summary.totalQuestions}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Tiada keputusan OMR dijumpai. Sila buat imbasan dahulu.
              </p>
            )}

            <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => router.push("/teacher/omr")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Kembali ke OMR
                </Button>
                <Button onClick={() => router.push("/teacher/my-subject")}>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Pemarkahan Markah
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
