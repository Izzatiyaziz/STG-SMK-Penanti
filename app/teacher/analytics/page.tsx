"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClassTeacherAnalyticsDashboard } from "../dashboard/page";
import { TeacherReportContent } from "../report/page";

type Session = {
  user_id: string;
  userType: string;
  role: string;
};

export default function TeacherAnalyticsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("stg_session");
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed?.user_id || parsed?.userType !== "teacher") {
        router.replace("/login");
        return;
      }
      setSession(parsed);
    } finally {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;
  if (String(session?.role ?? "").toLowerCase().trim() === "class teacher") {
    return <ClassTeacherAnalyticsDashboard teacherId={session!.user_id} />;
  }

  return <TeacherReportContent activeReportPage="analitik" />;
}
