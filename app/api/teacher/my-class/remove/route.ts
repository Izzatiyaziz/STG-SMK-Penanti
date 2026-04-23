import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const studentId = String(searchParams.get("studentId") ?? "").trim();

        if (!studentId) {
            return NextResponse.json(
                { error: "studentId diperlukan" },
                { status: 400 }
            );
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

