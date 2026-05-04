import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const guard = await requireApiRole("teacher");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const class_id = String(searchParams.get("class_id") ?? "").trim();

        if (!class_id) return NextResponse.json({ data: [] });

        const [{ data: classTeacher }, { data: subjectTeacher }] = await Promise.all([
            supabase
                .from("stg_class_teachers")
                .select("class_teacher_id")
                .eq("teacher_id", guard.session.user_id)
                .eq("class_id", class_id)
                .limit(1),
            supabase
                .from("stg_teacher_subject")
                .select("teacher_subject_id")
                .eq("teacher_id", guard.session.user_id)
                .eq("class_id", class_id)
                .limit(1),
        ]);

        if (
            (!Array.isArray(classTeacher) || classTeacher.length === 0) &&
            (!Array.isArray(subjectTeacher) || subjectTeacher.length === 0)
        ) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
        }

        const { data, error } = await supabase
            .from("stg_students")
            .select("student_id, fullname, ic_number")
            .eq("class_id", class_id)
            .order("fullname", { ascending: true });

        if (error) return NextResponse.json({ data: [] });

        return NextResponse.json({
            data: (data ?? []).map((s: any) => ({
                id: s.student_id,
                name: s.fullname,
                identifier: s.ic_number,
            })),
        });
    } catch (err) {
        console.error("GET teacher students FAILED:", err);
        return NextResponse.json({ data: [] });
    }
}
