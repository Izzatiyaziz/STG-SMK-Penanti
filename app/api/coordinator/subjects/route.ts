import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const guard = await requireApiRole("subject coordinator");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const teacher_id = String(searchParams.get("teacher_id") ?? "").trim();

        if (!teacher_id) return NextResponse.json({ data: [] });
        if (teacher_id !== guard.session.user_id) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
        }

        const { data: rows, error } = await supabase
            .from("stg_subject_coordinators")
            .select("subject_id")
            .eq("teacher_id", teacher_id);

        if (error) return NextResponse.json({ data: [] });

        const subjectIds = (rows ?? [])
            .map((r: any) => r.subject_id as string)
            .filter(Boolean);

        if (subjectIds.length === 0) return NextResponse.json({ data: [] });

        const { data: subjects } = await supabase
            .from("stg_subjects")
            .select("subject_id, subject_name")
            .in("subject_id", subjectIds)
            .order("subject_name", { ascending: true });

        return NextResponse.json({
            data: (subjects ?? []).map((s: any) => ({
                id: s.subject_id,
                name: s.subject_name,
            })),
        });
    } catch (err) {
        console.error("GET coordinator subjects FAILED:", err);
        return NextResponse.json({ data: [] });
    }
}
