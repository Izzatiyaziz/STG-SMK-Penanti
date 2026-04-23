import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const class_id = String(searchParams.get("class_id") ?? "").trim();

        if (!class_id) return NextResponse.json({ data: [] });

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

