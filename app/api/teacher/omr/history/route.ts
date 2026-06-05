import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import supabaseAdmin from "@/lib/supabase-admin";

export const runtime = "nodejs";

type ScanRow = {
  omr_scan_id: string;
  objective_total_mark: number | null;
  scan_date: string;
  student_id: string;
  subject_id: string;
  exam_id: string;
  stg_students: { name: string; identifier: string; class_id: string; stg_classes: { class_name: string; grade: number } };
  stg_subjects: { subject_name: string };
  stg_exams: { exam_name: string; year: string };
};

function toId(v: unknown) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

export async function GET(req: Request) {
  try {
    const guard = await requireApiRole("teacher");
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const exam_id = toId(searchParams.get("exam_id"));
    const class_id = toId(searchParams.get("class_id"));
    const subject_id = toId(searchParams.get("subject_id"));

    // Get teacher's allowed class+subject combinations
    const { data: assignments, error: assignErr } = await supabaseAdmin
      .from("stg_teacher_subject")
      .select("class_id, subject_id")
      .eq("teacher_id", guard.session.user_id);

    if (assignErr) return NextResponse.json({ message: assignErr.message }, { status: 500 });
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const allowedSubjectIds = [...new Set(assignments.map((a) => String(a.subject_id)))];

    let query = supabaseAdmin
      .from("stg_omr_scans")
      .select(
        `omr_scan_id, objective_total_mark, scan_date,
         student_id, subject_id, exam_id,
         stg_students!inner(name, identifier, class_id,
           stg_classes!inner(class_name, grade)),
         stg_subjects!inner(subject_name),
         stg_exams!inner(exam_name, year)`
      )
      .in("subject_id", allowedSubjectIds)
      .order("scan_date", { ascending: false })
      .limit(200);

    if (exam_id) query = query.eq("exam_id", exam_id);
    if (subject_id) query = query.eq("subject_id", subject_id);

    const { data: scans, error: scansErr } = await query;
    if (scansErr) return NextResponse.json({ message: scansErr.message }, { status: 500 });

    const rows = (Array.isArray(scans) ? scans : []) as unknown as ScanRow[];

    const data = rows
      .filter((row) => {
        const studentClassId = String(row.stg_students?.class_id ?? "");
        const rowSubjectId = String(row.subject_id ?? "");
        const allowed = assignments.some(
          (a) => String(a.class_id) === studentClassId && String(a.subject_id) === rowSubjectId
        );
        if (!allowed) return false;
        if (class_id && studentClassId !== class_id) return false;
        return true;
      })
      .map((row) => ({
        omr_scan_id: String(row.omr_scan_id),
        student_id: String(row.student_id),
        student_name: String(row.stg_students?.name ?? ""),
        student_identifier: String(row.stg_students?.identifier ?? ""),
        class_id: String(row.stg_students?.class_id ?? ""),
        class_name: String(row.stg_students?.stg_classes?.class_name ?? ""),
        grade: Number(row.stg_students?.stg_classes?.grade ?? 0),
        subject_id: String(row.subject_id),
        subject_name: String(row.stg_subjects?.subject_name ?? ""),
        exam_id: String(row.exam_id),
        exam_name: [row.stg_exams?.exam_name, row.stg_exams?.year].filter(Boolean).join(" "),
        scan_date: String(row.scan_date),
        objective_total_mark: row.objective_total_mark != null ? Number(row.objective_total_mark) : null,
      }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET teacher/omr/history FAILED:", err);
    return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
  }
}
