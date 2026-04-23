import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const studentId = String(body?.studentId ?? "").trim();
        const classId = String(body?.classId ?? "").trim();

        if (!studentId || !classId) {
            return NextResponse.json(
                { error: "studentId dan classId diperlukan" },
                { status: 400 }
            );
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

