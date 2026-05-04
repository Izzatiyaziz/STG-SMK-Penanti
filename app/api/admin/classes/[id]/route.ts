import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        const { id: classId } = await params; // ✅ IMPORTANT

        if (!classId) {
            return NextResponse.json(
                { error: "ID kelas tiada" },
                { status: 400 }
            );
        }

        // 1️⃣ Fetch class
        const { data: cls, error: classErr } = await supabase
            .from("stg_classes")
            .select("class_id, class_name, grade")
            .eq("class_id", classId)
            .single();

        if (classErr || !cls) {
            return NextResponse.json(
                { error: "Kelas tidak dijumpai" },
                { status: 404 }
            );
        }

        // 2️⃣ Fetch students
        const { data: students, error: studentErr } = await supabase
            .from("stg_students")
            .select("student_id, fullname, ic_number, status")
            .eq("class_id", classId);

        if (studentErr) {
            return NextResponse.json(
                { error: studentErr.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            class: {
                id: cls.class_id,
                name: cls.class_name,
                grade: cls.grade,
            },
            students: students ?? [],
        });
    } catch (err) {
        console.error("CLASS DETAIL API ERROR:", err);
        return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 });
    }
}
