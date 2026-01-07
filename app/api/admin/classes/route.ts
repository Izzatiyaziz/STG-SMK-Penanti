import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("stg_classes")
      .select("class_id, class_name");

    if (error) {
      console.error("CLASS FETCH ERROR:", error);
      return NextResponse.json([], { status: 200 });
    }

    const classes = (data ?? []).map((c) => ({
      id: c.class_id,
      name: c.class_name,
    }));

    return NextResponse.json(classes);
  } catch (error) {
    console.error("FETCH CLASSES ERROR:", error);
    return NextResponse.json([], { status: 200 });
  }
}
