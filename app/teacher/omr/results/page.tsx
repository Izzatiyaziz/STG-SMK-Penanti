"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ArrowLeft } from "lucide-react";

export default function OMRResultsPage() {
  const router = useRouter();

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="shadow-lg border border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Keputusan OMR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pemprosesan OMR berjaya. Halaman keputusan terperinci akan
              ditambah kemudian.
            </p>

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

