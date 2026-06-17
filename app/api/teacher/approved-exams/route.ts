import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase-admin";
import { requireApiRole } from "@/lib/auth";
import { getActiveAcademicYearFromValues } from "@/lib/academic-year";

export const runtime = "nodejs";

function toId(value: unknown) {
    return typeof value === "string"
        ? value.trim()
        : value == null
          ? ""
          : String(value).trim();
}

export async function GET() {
    try {
        const guard = await requireApiRole("teacher");
        if ("response" in guard) return guard.response;

        const { data: subjectiveRows, error: subjectiveError } =
            await supabaseAdmin
                .from("stg_subjective_marks")
                .select("subjective_id")
                .eq("teacher_id", guard.session.user_id);

        if (subjectiveError) {
            return NextResponse.json(
                { message: subjectiveError.message, data: [] },
                { status: 500 }
            );
        }

        const subjectiveIds = (subjectiveRows ?? [])
            .map((row) => toId(row.subjective_id))
            .filter(Boolean);

        if (subjectiveIds.length === 0) {
            return NextResponse.json({ data: [] });
        }

        const { data: approvedResults, error: resultError } = await supabaseAdmin
            .from("stg_results")
            .select("exam_id")
            .eq("status", "approved")
            .in("subjective_id", subjectiveIds);

        if (resultError) {
            return NextResponse.json(
                { message: resultError.message, data: [] },
                { status: 500 }
            );
        }

        const examIds = Array.from(
            new Set(
                (approvedResults ?? [])
                    .map((row) => toId(row.exam_id))
                    .filter(Boolean)
            )
        );

        const { data: exams } = examIds.length
            ? await supabaseAdmin
                  .from("stg_exams")
                  .select("exam_id, academic_year")
                  .in("exam_id", examIds)
            : { data: [] };
        const examRows = Array.isArray(exams) ? exams : [];
        const activeAcademicYear = getActiveAcademicYearFromValues(
            examRows.map((exam) => exam.academic_year)
        );
        const activeExamIds = examRows
            .filter((exam) => toId(exam.academic_year) === activeAcademicYear)
            .map((exam) => toId(exam.exam_id))
            .filter(Boolean);

        return NextResponse.json({ data: activeExamIds });
    } catch (error) {
        console.error("GET teacher approved exams FAILED:", error);
        return NextResponse.json({ data: [] }, { status: 500 });
    }
}
