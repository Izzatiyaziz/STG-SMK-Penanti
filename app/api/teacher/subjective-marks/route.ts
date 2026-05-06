import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase-admin";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

function toId(v: unknown) {
    return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function toNumber(v: unknown) {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
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

        const { data: students } = await supabaseAdmin
            .from("stg_students")
            .select("student_id")
            .eq("class_id", class_id);

        const studentIds = (Array.isArray(students) ? students : [])
            .map((s: any) => toId(s?.student_id))
            .filter(Boolean);

        if (studentIds.length === 0) {
            return NextResponse.json({ data: {} }, { status: 200 });
        }

        const { data: marks, error } = await supabaseAdmin
            .from("stg_subjective_marks")
            .select("student_id, subjective_mark, input_date")
            .eq("teacher_id", guard.session.user_id)
            .eq("subject_id", subject_id)
            .eq("exam_id", exam_id)
            .in("student_id", studentIds)
            .order("input_date", { ascending: false })
            .limit(10000);

        if (error) {
            return NextResponse.json({ message: error.message }, { status: 500 });
        }

        const out: Record<string, number> = {};
        for (const row of Array.isArray(marks) ? marks : []) {
            if (!row || typeof row !== "object") continue;
            const sid = toId((row as any).student_id);
            if (!sid) continue;
            if (out[sid] !== undefined) continue;
            out[sid] = toNumber((row as any).subjective_mark);
        }

        return NextResponse.json({ data: out }, { status: 200 });
    } catch (err) {
        console.error("GET subjective-marks FAILED:", err);
        return NextResponse.json({ data: {} }, { status: 200 });
    }
}
