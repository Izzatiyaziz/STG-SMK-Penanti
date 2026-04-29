import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const guard = await requireApiRole("teacher");
    if ("response" in guard) return guard.response;

    const { data, error } = await supabase
      .from("stg_exams")
      .select("exam_id, exam_name, academic_year")
      .order("academic_year", { ascending: false })
      .order("exam_name", { ascending: true })
      .limit(200);

    if (error) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    return NextResponse.json({
      data: (data ?? []).map((e: any) => ({
        id: e.exam_id,
        name: e.exam_name,
        year: e.academic_year,
      })),
    });
  } catch (err) {
    console.error("GET teacher exams FAILED:", err);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}

