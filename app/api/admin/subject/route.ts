import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("stg_subjects")
      .select("subject_id, subject_name");

    if (error) {
      console.error("SUBJECT FETCH ERROR:", error);
      return NextResponse.json([], { status: 200 });
    }

    const subjects = (data ?? []).map((s) => ({
      id: s.subject_id,
      name: s.subject_name,
    }));

    return NextResponse.json(subjects);
  } catch (error) {
    console.error("FETCH SUBJECTS ERROR:", error);
    return NextResponse.json([], { status: 200 });
  }
}
