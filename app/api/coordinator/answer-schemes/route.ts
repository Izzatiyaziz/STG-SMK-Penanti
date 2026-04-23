import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const exam_id = String(searchParams.get("exam_id") ?? "").trim();
        const subject_id = String(searchParams.get("subject_id") ?? "").trim();

        if (!exam_id || !subject_id) {
            return NextResponse.json({ data: [] });
        }

        const { data, error } = await supabase
            .from("stg_answer_schema")
            .select("schema_id, question_no, correct_answer")
            .eq("exam_id", exam_id)
            .eq("subject_id", subject_id)
            .order("question_no", { ascending: true });

        if (error) {
            return NextResponse.json({ data: [] });
        }

        return NextResponse.json({
            data: (data ?? []).map((r: any) => ({
                id: r.schema_id,
                question_no: r.question_no,
                correct_answer: r.correct_answer,
            })),
        });
    } catch (err) {
        console.error("GET answer schemes FAILED:", err);
        return NextResponse.json({ data: [] });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const exam_id = String(body?.exam_id ?? "").trim();
        const subject_id = String(body?.subject_id ?? "").trim();
        const answers = Array.isArray(body?.answers) ? body.answers : [];

        if (!exam_id || !subject_id || answers.length === 0) {
            return NextResponse.json(
                { message: "exam_id, subject_id, answers diperlukan" },
                { status: 400 }
            );
        }

        // Replace existing schema for this exam+subject
        await supabase
            .from("stg_answer_schema")
            .delete()
            .eq("exam_id", exam_id)
            .eq("subject_id", subject_id);

        const payload = answers
            .map((a: any) => ({
                exam_id,
                subject_id,
                question_no: Number(a?.question_no ?? 0),
                correct_answer: String(a?.correct_answer ?? "").trim(),
            }))
            .filter((a: any) => a.question_no > 0 && a.correct_answer);

        if (payload.length === 0) {
            return NextResponse.json(
                { message: "Tiada jawapan sah untuk disimpan" },
                { status: 400 }
            );
        }

        const { error } = await supabase.from("stg_answer_schema").insert(payload);

        if (error) {
            return NextResponse.json({ message: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("POST answer schemes FAILED:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

