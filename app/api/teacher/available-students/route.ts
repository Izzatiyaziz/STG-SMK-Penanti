import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const gradeRaw = searchParams.get("grade");
        const grade = gradeRaw ? String(gradeRaw).trim() : "";

        if (!grade) {
            return NextResponse.json([], { status: 200 });
        }

        // Available students = same level and not assigned to any class
        const { data, error } = await supabase
            .from("stg_students")
            .select("student_id, fullname, ic_number")
            .eq("level", grade)
            .is("class_id", null)
            .order("fullname", { ascending: true });

        if (error) {
            return NextResponse.json([], { status: 200 });
        }

        return NextResponse.json(
            (data ?? []).map((s: any) => ({
                id: s.student_id,
                name: s.fullname,
                identifier: s.ic_number,
            }))
        );
    } catch (err) {
        console.error("GET available-students FAILED:", err);
        return NextResponse.json([], { status: 200 });
    }
}

