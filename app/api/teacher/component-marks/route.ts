import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase-admin";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

function toId(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function toNumber(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export async function GET(req: Request) {
  try {
    const guard = await requireApiRole("teacher");
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const class_id = toId(searchParams.get("class_id"));
    const subject_id = toId(searchParams.get("subject_id"));
    const exam_id = toId(searchParams.get("exam_id"));

    if (!class_id || !subject_id || !exam_id) {
      return NextResponse.json({ data: {} }, { status: 200 });
    }

    const { data: assignment, error: assignmentErr } = await supabaseAdmin
      .from("stg_teacher_subject")
      .select("teacher_subject_id")
      .eq("teacher_id", guard.session.user_id)
      .eq("class_id", class_id)
      .eq("subject_id", subject_id)
      .limit(1);

    if (assignmentErr) {
      return NextResponse.json({ message: assignmentErr.message }, { status: 500 });
    }
    if (!Array.isArray(assignment) || assignment.length === 0) {
      return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
    }

    const { data: componentRows, error } = await supabaseAdmin
      .from("stg_mark_components")
      .select(
        "student_id, component_key, component_label, component_type, mark, max_mark, included_in_total, question_count, group_name",
      )
      .eq("class_id", class_id)
      .eq("subject_id", subject_id)
      .eq("exam_id", exam_id)
      .eq("teacher_id", guard.session.user_id);

    if (error) {
      return NextResponse.json({ data: {}, message: error.message }, { status: 200 });
    }

    const out: Record<
      string,
      Record<
        string,
        {
          mark: number;
          label: string;
          type: string;
          max_mark: number;
          included_in_total: boolean;
          question_count: number | null;
          group_name: string;
        }
      >
    > = {};

    for (const row of Array.isArray(componentRows) ? componentRows : []) {
      if (!row || typeof row !== "object") continue;
      const studentId = toId((row as { student_id?: unknown }).student_id);
      const componentKey = toId((row as { component_key?: unknown }).component_key);
      if (!studentId || !componentKey) continue;
      if (!out[studentId]) out[studentId] = {};
      out[studentId][componentKey] = {
        mark: toNumber((row as { mark?: unknown }).mark),
        label: toId((row as { component_label?: unknown }).component_label),
        type: toId((row as { component_type?: unknown }).component_type),
        max_mark: toNumber((row as { max_mark?: unknown }).max_mark),
        included_in_total: Boolean((row as { included_in_total?: unknown }).included_in_total),
        question_count: toNumber((row as { question_count?: unknown }).question_count) || null,
        group_name: toId((row as { group_name?: unknown }).group_name),
      };
    }

    return NextResponse.json({ data: out }, { status: 200 });
  } catch (err) {
    console.error("GET component-marks FAILED:", err);
    return NextResponse.json({ data: {} }, { status: 200 });
  }
}
