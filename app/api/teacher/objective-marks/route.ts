import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

function toId(v: unknown) {
    return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function toNumber(v: unknown) {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const class_id = toId(searchParams.get("class_id"));
        const subject_id = toId(searchParams.get("subject_id"));
        const exam_id = toId(searchParams.get("exam_id"));

        if (!class_id || !subject_id || !exam_id) {
            return NextResponse.json({ data: {} }, { status: 200 });
        }

        const { data: students } = await supabase
            .from("stg_students")
            .select("student_id")
            .eq("class_id", class_id);

        const studentIds = (Array.isArray(students) ? students : [])
            .map((s: any) => toId(s?.student_id))
            .filter(Boolean);

        if (studentIds.length === 0) {
            return NextResponse.json({ data: {} }, { status: 200 });
        }

        const { data: scans, error } = await supabase
            .from("stg_omr_scans")
            .select("student_id, objective_total_mark, scan_date")
            .eq("subject_id", subject_id)
            .eq("exam_id", exam_id)
            .in("student_id", studentIds)
            .order("scan_date", { ascending: false })
            .limit(10000);

        if (error) {
            return NextResponse.json({ data: {} }, { status: 200 });
        }

        // Pick latest scan per student (because we ordered desc by scan_date).
        const out: Record<string, number> = {};
        for (const row of Array.isArray(scans) ? scans : []) {
            if (!row || typeof row !== "object") continue;
            const sid = toId((row as any).student_id);
            if (!sid) continue;
            if (out[sid] !== undefined) continue;
            out[sid] = toNumber((row as any).objective_total_mark);
        }

        return NextResponse.json({ data: out }, { status: 200 });
    } catch (err) {
        console.error("GET objective-marks FAILED:", err);
        return NextResponse.json({ data: {} }, { status: 200 });
    }
}

