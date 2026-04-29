"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

function toNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function OMRResultsPage() {
  const router = useRouter();
  const [resultRaw, setResultRaw] = useState<any>(null);

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
          : "/teacher/dashboard"
      );
    }
  }, [router]);

  useEffect(() => {
    const stored = sessionStorage.getItem("stg_omr_last_result");
    if (!stored) return;
    try {
      setResultRaw(JSON.parse(stored));
    } catch {
      setResultRaw(null);
    }
  }, []);

  const summary = useMemo(() => {
    const total_questions = toNumber(resultRaw?.total_questions);
    const correct = toNumber(resultRaw?.correct);
    const wrong = toNumber(resultRaw?.wrong);
    const blank = toNumber(resultRaw?.blank);
    const ambiguous = toNumber(resultRaw?.ambiguous);
    const score_percent = toNumber(resultRaw?.score_percent);
    const omr_scan_id = typeof resultRaw?.omr_scan_id === "string" ? resultRaw.omr_scan_id : "";
    const warning = typeof resultRaw?.warning === "string" ? resultRaw.warning : "";
    const persisted = omr_scan_id.length > 0;
    const resultSaved = persisted && !warning.toLowerCase().includes("result table") && !warning.toLowerCase().includes("stg_results");

    const results = Array.isArray(resultRaw?.results) ? resultRaw.results : [];
    return {
      total_questions,
      correct,
      wrong,
      blank,
      ambiguous,
      score_percent,
      results,
      omr_scan_id,
      warning,
      persisted,
      resultSaved,
    };
  }, [resultRaw]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="shadow-lg border border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Keputusan OMR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {resultRaw ? (
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    Skor: {summary.score_percent.toFixed(2)}%
                  </Badge>
                  <Badge variant="outline">Betul: {summary.correct}</Badge>
                  <Badge variant="outline">Salah: {summary.wrong}</Badge>
                  <Badge variant="outline">Kosong: {summary.blank}</Badge>
                  <Badge variant="outline">Ambigu: {summary.ambiguous}</Badge>
                  {summary.persisted ? (
                    <Badge>OMR Scan Saved</Badge>
                  ) : (
                    <Badge variant="destructive">OMR Scan Not Saved</Badge>
                  )}
                  {summary.resultSaved ? (
                    <Badge>Saved to Result Table</Badge>
                  ) : (
                    <Badge variant="secondary">Result Table Not Confirmed</Badge>
                  )}
                </div>

                {summary.warning ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {summary.warning}
                  </div>
                ) : null}

                {summary.results.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>No</TableHead>
                          <TableHead className="text-center">Dikesan</TableHead>
                          <TableHead className="text-center">Skema</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Conf</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.results.map((r: any) => {
                          const status = String(r?.status ?? "");
                          return (
                            <TableRow key={String(r?.question_no ?? "")}>
                              <TableCell>{r?.question_no}</TableCell>
                              <TableCell className="text-center">
                                {r?.detected_option ?? "—"}
                              </TableCell>
                              <TableCell className="text-center">
                                {r?.expected_option ?? "—"}
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center gap-2">
                                  {status === "correct" ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : status === "wrong" ? (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  ) : (
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                  )}
                                  {status || "unknown"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {toNumber(r?.confidence).toFixed(2)}
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
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Tiada keputusan OMR dijumpai. Sila buat imbasan dahulu.
              </p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push("/teacher/omr")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke OMR
              </Button>
              <Button onClick={() => router.push("/teacher/dashboard")}>
                Ke Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
