import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase-admin";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

type OMRTemplateMap = Record<
    string,
    {
        A: { x: number; y: number; r?: number };
        B: { x: number; y: number; r?: number };
        C: { x: number; y: number; r?: number };
        D: { x: number; y: number; r?: number };
    }
>;
type AnswerRegion = { x: number; y: number; width: number; height: number };

type ExamSubjectSettings = Record<string, { objective_max?: number; objective_questions?: number }>;
type ScanInsertRow = { omr_scan_id?: unknown } | null;
type OMRServiceResultRow = {
    question_no?: unknown;
    detected_option?: unknown;
    expected_option?: unknown;
    status?: unknown;
    confidence?: unknown;
    ratios?: unknown;
};
type SubjectiveRow = { subjective_id?: unknown; subjective_mark?: unknown } | null;
type ExistingResultRow = { result_id?: unknown } | null;

function toId(v: unknown) {
    return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function toNumber(v: unknown) {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
}

function normalizeOption(v: unknown) {
    const upper = String(v ?? "").trim().toUpperCase();
    return ["A", "B", "C", "D"].includes(upper) ? upper : "";
}

function gradeFromTotal(total: number) {
    if (total >= 80) return "A";
    if (total >= 65) return "B";
    if (total >= 50) return "C";
    if (total >= 40) return "D";
    return "E";
}

export async function POST(req: Request) {
    try {
        const guard = await requireApiRole("teacher");
        if ("response" in guard) return guard.response;

        const body = await req.json();
        const teacher_id = toId(body?.teacher_id);
        const student_id = toId(body?.student_id);
        const subject_id = toId(body?.subject_id);
        const exam_id = toId(body?.exam_id);
        const class_id = toId(body?.class_id);
        const image_base64 = String(body?.image_base64 ?? "").trim();
        const template = (body?.template ?? {}) as OMRTemplateMap;
        const template_width = Number(body?.template_width ?? 1400);
        const template_height = Number(body?.template_height ?? 2000);
        const answer_region = body?.answer_region as AnswerRegion | undefined;

        if (teacher_id !== guard.session.user_id) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
        }

        if (!teacher_id || !subject_id || !exam_id || !class_id || !image_base64) {
            return NextResponse.json(
                { message: "teacher_id, subject_id, exam_id, class_id, image_base64 diperlukan" },
                { status: 400 }
            );
        }

        if (!template || Object.keys(template).length === 0) {
            return NextResponse.json({ message: "template diperlukan" }, { status: 400 });
        }

        const { data: assignment, error: assignErr } = await supabaseAdmin
            .from("stg_teacher_subject")
            .select("teacher_subject_id")
            .eq("teacher_id", teacher_id)
            .eq("subject_id", subject_id)
            .eq("class_id", class_id)
            .limit(1);

        if (assignErr) return NextResponse.json({ message: assignErr.message }, { status: 500 });
        if (!Array.isArray(assignment) || assignment.length === 0) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
        }

        const { data: answerRows, error: answerErr } = await supabaseAdmin
            .from("stg_answer_schema")
            .select("question_no, correct_answer")
            .eq("exam_id", exam_id)
            .eq("subject_id", subject_id)
            .order("question_no", { ascending: true });

        if (answerErr) return NextResponse.json({ message: answerErr.message }, { status: 500 });
        if (!Array.isArray(answerRows) || answerRows.length === 0) {
            return NextResponse.json(
                { message: "Skema jawapan belum disediakan untuk exam + subject ini" },
                { status: 400 }
            );
        }

        const validAnswerRows = answerRows.filter((row: { question_no: number; correct_answer: string }) => (
            toNumber(row.question_no) > 0 && normalizeOption(row.correct_answer) !== ""
        ));

        const answer_key = Object.fromEntries(
            validAnswerRows.map((row: { question_no: number; correct_answer: string }) => [
                String(row.question_no),
                normalizeOption(row.correct_answer),
            ])
        );
        if (validAnswerRows.length === 0) {
            return NextResponse.json(
                { message: "Skema jawapan objektif tidak sah atau belum lengkap" },
                { status: 400 }
            );
        }
        const allowedQuestionIds = new Set(Object.keys(answer_key));
        const filteredTemplate = Object.fromEntries(
            Object.entries(template).filter(([questionId]) => allowedQuestionIds.has(questionId))
        ) as OMRTemplateMap;

        const omrServiceUrl = process.env.OMR_SERVICE_URL || "http://127.0.0.1:8001";
        if (Object.keys(filteredTemplate).length === 0) {
            return NextResponse.json(
                { message: "Template OMR tidak sepadan dengan skema jawapan semasa" },
                { status: 400 }
            );
        }

        const res = await fetch(`${omrServiceUrl}/grade`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                image_base64,
                template_width,
                template_height,
                answer_region,
                template: filteredTemplate,
                answer_key,
                min_mark_threshold: body?.min_mark_threshold ?? 0.55,
                ambiguity_gap: body?.ambiguity_gap ?? 0.12,
            }),
        });

        const json = await res.json();
        if (!res.ok) {
            return NextResponse.json(
                { message: json?.detail || "OMR service error", detail: json },
                { status: res.status }
            );
        }

        // Optional persistence: if caller provides student_id, store scan + per-question answers.
        // This keeps existing clients working (they can omit student_id to "preview" results only).
        let persisted: { omr_scan_id: string } | null = null;
        let resultWarning: string | null = null;
        if (student_id) {
            const correct = toNumber(json?.correct);
            const total_questions = toNumber(json?.total_questions);

            // Determine objective_max from stg_exams.subject_settings (fallback to total_questions).
            const { data: examRow } = await supabaseAdmin
                .from("stg_exams")
                .select("subject_settings")
                .eq("exam_id", exam_id)
                .maybeSingle();

            const subjectSettings =
                examRow &&
                typeof examRow === "object" &&
                "subject_settings" in examRow &&
                examRow.subject_settings &&
                typeof examRow.subject_settings === "object"
                    ? (examRow.subject_settings as ExamSubjectSettings)
                    : {};

            const settingsForSubject =
                subjectSettings && typeof subjectSettings === "object" ? subjectSettings[subject_id] ?? null : null;

            const objectiveMax = toNumber(settingsForSubject?.objective_max) || total_questions || 0;
            const objectiveQuestions = toNumber(settingsForSubject?.objective_questions) || total_questions || 0;

            const objective_total_mark =
                objectiveQuestions > 0 ? Math.round((correct / objectiveQuestions) * objectiveMax) : 0;

            const { data: scanRow, error: scanErr } = await supabaseAdmin
                .from("stg_omr_scans")
                .insert({
                    student_id,
                    subject_id,
                    exam_id,
                    objective_total_mark,
                    scan_date: new Date().toISOString(),
                })
                .select("omr_scan_id")
                .single();

            if (scanErr) {
                // Common in Supabase when RLS blocks anon inserts. Don't fail grading;
                // return results and surface a warning so user can fix DB policies later.
                console.warn("Failed to save OMR scan (continuing without persistence):", scanErr.message);
                return NextResponse.json({
                    success: true,
                    ...json,
                    persisted: false,
                    warning: "OMR graded but scan was not saved (check Supabase RLS/policies).",
                    scan_error: scanErr.message,
                });
            }

            const omr_scan_id = toId((scanRow as ScanInsertRow)?.omr_scan_id);
            persisted = omr_scan_id ? { omr_scan_id } : null;

            const results = Array.isArray(json?.results) ? (json.results as OMRServiceResultRow[]) : [];
            if (omr_scan_id && results.length > 0) {
                const answerRows = results.map((r: OMRServiceResultRow) => ({
                    omr_scan_id,
                    question_no: toNumber(r?.question_no),
                    detected_option: r?.detected_option ?? null,
                    expected_option: r?.expected_option ?? null,
                    status: String(r?.status ?? "unknown"),
                    confidence: toNumber(r?.confidence),
                    ratios: r?.ratios ?? null,
                }));

                const { error: answersErr } = await supabaseAdmin.from("stg_omr_scan_answers").insert(answerRows);
                if (answersErr) {
                    // Keep the scan row, but don't fail the whole request (scan mark is the key thing).
                    console.warn("Saved scan but failed to save answers:", answersErr.message);
                }
            }

            if (omr_scan_id) {
                const { data: subjectiveRow, error: subjectiveErr } = await supabaseAdmin
                    .from("stg_subjective_marks")
                    .select("subjective_id, subjective_mark")
                    .eq("student_id", student_id)
                    .eq("subject_id", subject_id)
                    .eq("exam_id", exam_id)
                    .order("input_date", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (subjectiveErr) {
                    console.warn("Failed to load subjective mark while saving OMR result:", subjectiveErr.message);
                    resultWarning = "OMR scan saved, but failed to read subjective mark for result sync.";
                } else {
                    const subjective_id = toId((subjectiveRow as SubjectiveRow)?.subjective_id) || null;
                    const subjective_mark = toNumber((subjectiveRow as SubjectiveRow)?.subjective_mark);
                    const total = objective_total_mark + subjective_mark;
                    const grade = gradeFromTotal(total);

                    const { data: existingResult, error: existingResultErr } = await supabaseAdmin
                        .from("stg_results")
                        .select("result_id")
                        .eq("student_id", student_id)
                        .eq("subject_id", subject_id)
                        .eq("exam_id", exam_id)
                        .maybeSingle();

                    if (existingResultErr) {
                        console.warn("Failed to lookup existing result while saving OMR result:", existingResultErr.message);
                        resultWarning = "OMR scan saved, but failed to sync stg_results.";
                    } else if ((existingResult as ExistingResultRow)?.result_id) {
                        const { error: updateResultErr } = await supabaseAdmin
                            .from("stg_results")
                            .update({
                                omr_scan_id,
                                subjective_id,
                                total,
                                grade,
                                status: "pending",
                            })
                            .eq("result_id", (existingResult as ExistingResultRow)?.result_id);

                        if (updateResultErr) {
                            console.warn("Failed to update result after OMR save:", updateResultErr.message);
                            resultWarning = "OMR scan saved, but result table update failed.";
                        }
                    } else {
                        const { error: insertResultErr } = await supabaseAdmin.from("stg_results").insert({
                            student_id,
                            subject_id,
                            exam_id,
                            omr_scan_id,
                            subjective_id,
                            total,
                            grade,
                            status: "pending",
                        });

                        if (insertResultErr) {
                            console.warn("Failed to insert result after OMR save:", insertResultErr.message);
                            resultWarning = "OMR scan saved, but result table insert failed.";
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            ...json,
            ...(persisted ?? {}),
            ...(resultWarning ? { warning: resultWarning } : {}),
        });
    } catch (err) {
        console.error("POST teacher/omr/grade FAILED:", err);
        return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
    }
}
