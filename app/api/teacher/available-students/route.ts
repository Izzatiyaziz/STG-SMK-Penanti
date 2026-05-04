import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

type StudentRow = {
    student_id: string;
    fullname: string | null;
    ic_number: string | null;
    level: string | number | null;
    enrollment_date: string | null;
};

export async function GET(req: Request) {
    try {
        const guard = await requireApiRole("class teacher");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const gradeRaw = searchParams.get("grade");
        const grade = gradeRaw ? String(gradeRaw).trim() : "";

        if (!grade) {
            return NextResponse.json([], { status: 200 });
        }

        // Available students = same level and not assigned to any class
        const { data, error } = await supabase
            .from("stg_students")
            .select("student_id, fullname, ic_number, level, enrollment_date")
            .eq("level", grade)
            .is("class_id", null)
            .order("fullname", { ascending: true });

        if (error) {
            return NextResponse.json([], { status: 200 });
        }

        return NextResponse.json(
            ((data ?? []) as StudentRow[]).map((s) => ({
                id: s.student_id,
                name: s.fullname,
                identifier: s.ic_number,
                level: s.level ? String(s.level) : null,
                enrollment_date: s.enrollment_date ?? null,
            }))
        );
    } catch (err) {
        console.error("GET available-students FAILED:", err);
        return NextResponse.json([], { status: 200 });
    }
}
