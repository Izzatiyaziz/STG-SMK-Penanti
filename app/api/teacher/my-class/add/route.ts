import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const guard = await requireApiRole("class teacher");
        if ("response" in guard) return guard.response;

        const body = await req.json();
        const studentId = String(body?.studentId ?? "").trim();
        const classId = String(body?.classId ?? "").trim();

        if (!studentId || !classId) {
            return NextResponse.json(
                { error: "studentId dan classId diperlukan" },
                { status: 400 }
            );
        }

        const { data: assignment, error: assignmentErr } = await supabase
            .from("stg_class_teachers")
            .select("class_teacher_id")
            .eq("teacher_id", guard.session.user_id)
            .eq("class_id", classId)
            .limit(1);

        if (assignmentErr) {
            return NextResponse.json({ error: assignmentErr.message }, { status: 500 });
        }
        if (!Array.isArray(assignment) || assignment.length === 0) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { error } = await supabase
            .from("stg_students")
            .update({ class_id: classId })
            .eq("student_id", studentId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("POST my-class/add FAILED:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
