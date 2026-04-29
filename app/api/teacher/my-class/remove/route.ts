import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
    try {
        const guard = await requireApiRole("class teacher");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const studentId = String(searchParams.get("studentId") ?? "").trim();

        if (!studentId) {
            return NextResponse.json(
                { error: "studentId diperlukan" },
                { status: 400 }
            );
        }

        const { data: student, error: studentErr } = await supabase
            .from("stg_students")
            .select("class_id")
            .eq("student_id", studentId)
            .single();

        if (studentErr) {
            return NextResponse.json({ error: studentErr.message }, { status: 500 });
        }

        const classId = String(student?.class_id ?? "").trim();
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
            .update({ class_id: null })
            .eq("student_id", studentId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("DELETE my-class/remove FAILED:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
