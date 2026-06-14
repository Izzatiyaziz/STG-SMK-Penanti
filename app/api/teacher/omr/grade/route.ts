import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabase-admin";
import { requireApiRole } from "@/lib/auth";
import {
    computeMarkSummary,
    getGradeTemplateForClass,
    getPrimaryOmrComponent,
} from "@/lib/marking-template";
import { gradeFromTotal } from "@/lib/grade-utils";
import { isMarkingClosedForAssignment } from "@/lib/exam-utils";

export const runtime = "nodejs";
export const maxDuration = 300;

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

        const { data: classStudents } = await supabaseAdmin
            .from("stg_students")
            .select("student_id")
            .eq("class_id", class_id);
        const classStudentIds = (classStudents ?? [])
            .map((row) => toId(row.student_id))
            .filter(Boolean);
        if (classStudentIds.length > 0) {
            const { count: approvedCount, error: approvedError } = await supabaseAdmin
                .from("stg_results")
                .select("result_id", { count: "exact", head: true })
                .eq("subject_id", subject_id)
                .eq("exam_id", exam_id)
                .eq("status", "approved")
                .in("student_id", classStudentIds);
            if (approvedError) {
                return NextResponse.json({ message: approvedError.message }, { status: 500 });
            }
            if (Number(approvedCount ?? 0) > 0) {
                return NextResponse.json(
                    { message: "Markah peperiksaan ini telah diluluskan. Imbasan OMR baharu tidak dibenarkan." },
                    { status: 409 },
                );
            }
        }

        const { data: classGradeRow } = await supabaseAdmin
            .from("stg_classes")
            .select("grade")
            .eq("class_id", class_id)
            .maybeSingle();
        const gradeNumber = Number(classGradeRow?.grade ?? 0);
        const gradeGroup = Number.isFinite(gradeNumber) && gradeNumber > 0 ? `tingkatan-${gradeNumber}` : "lower";
        const { data: closureExam } = await supabaseAdmin
            .from("stg_exams")
            .select("subject_settings")
            .eq("exam_id", exam_id)
            .maybeSingle();
        if (isMarkingClosedForAssignment(
            { subject_settings: closureExam?.subject_settings as Record<string, unknown> | undefined },
            { subject_id, grade: gradeNumber },
        )) {
            return NextResponse.json(
                { message: "Pemarkahan telah ditutup oleh panitia untuk peperiksaan ini." },
                { status: 409 },
            );
        }

        const { data: answerRows, error: answerErr } = await supabaseAdmin
            .from("stg_answer_schema")
            .select("question_no, correct_answer")
            .eq("exam_id", exam_id)
            .eq("subject_id", subject_id)
            .eq("grade_group", gradeGroup)
            .order("question_no", { ascending: true });

        if (answerErr) return NextResponse.json({ message: answerErr.message }, { status: 500 });
        if (!Array.isArray(answerRows) || answerRows.length === 0) {
            return NextResponse.json(
                { message: `Skema jawapan OMR Tingkatan ${gradeNumber || "-"} belum disediakan untuk exam + subject ini` },
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

        const omrServiceUrl = process.env.OMR_SERVICE_URL || "http://127.0.0.1:8000";
        if (Object.keys(filteredTemplate).length === 0) {
            return NextResponse.json(
                { message: "Template OMR tidak sepadan dengan skema jawapan semasa" },
                { status: 400 }
            );
        }

        let res: Response;
        try {
            res = await fetch(`${omrServiceUrl}/grade`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image_base64,
                    template_width,
                    template_height,
                    already_warped: body?.already_warped === true,
                    processing_profile: body?.processing_profile === "camera" ? "camera" : "upload",
                    answer_region,
                    template: filteredTemplate,
                    answer_key,
                    min_mark_threshold: body?.min_mark_threshold ?? 0.30,
                    ambiguity_gap: body?.ambiguity_gap ?? 0.06,
                    search_radius: body?.search_radius ?? 6,
                }),
                signal: AbortSignal.timeout(180_000),
            });
        } catch (serviceErr) {
            const detail =
                serviceErr instanceof Error ? serviceErr.message : String(serviceErr ?? "");
            return NextResponse.json(
                {
                    message: "Perkhidmatan OMR tidak dapat memproses imej",
                    detail,
                },
                { status: 502 },
            );
        }

        const responseText = await res.text();
        let json: Record<string, unknown> = {};
        try {
            json = responseText ? (JSON.parse(responseText) as Record<string, unknown>) : {};
        } catch {
            json = { detail: responseText };
        }
        if (!res.ok) {
            return NextResponse.json(
                {
                    message:
                        typeof json?.detail === "string"
                            ? json.detail
                            : `Perkhidmatan OMR gagal (${res.status})`,
                    detail: json,
                },
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

            const [{ data: examRow }, { data: classRow }, { data: subjectRow }] = await Promise.all([
                supabaseAdmin
                    .from("stg_exams")
                    .select("subject_settings")
                    .eq("exam_id", exam_id)
                    .maybeSingle(),
                supabaseAdmin.from("stg_classes").select("grade").eq("class_id", class_id).maybeSingle(),
                supabaseAdmin.from("stg_subjects").select("subject_name").eq("subject_id", subject_id).maybeSingle(),
            ]);

            const templateInfo = getGradeTemplateForClass({
                subjectSettings:
                    examRow &&
                    typeof examRow === "object" &&
                    "subject_settings" in examRow &&
                    examRow.subject_settings &&
                    typeof examRow.subject_settings === "object"
                        ? (examRow.subject_settings as Record<string, unknown>)
                        : {},
                subjectId: subject_id,
                subjectName: typeof subjectRow?.subject_name === "string" ? subjectRow.subject_name : "",
                grade: typeof classRow?.grade === "number" ? classRow.grade : Number(classRow?.grade ?? 0),
            });
            const primaryOmrComponent = getPrimaryOmrComponent(templateInfo.template);

            const objectiveMax = toNumber(primaryOmrComponent?.max_mark) || total_questions || 0;
            const objectiveQuestions =
                toNumber(primaryOmrComponent?.question_count) || total_questions || 0;

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
                const componentLabel = primaryOmrComponent?.label ?? "Objektif";
                const componentKey = primaryOmrComponent?.key ?? "objective";
                const { error: componentErr } = await supabaseAdmin
                    .from("stg_mark_components")
                    .upsert(
                        {
                            student_id,
                            subject_id,
                            exam_id,
                            class_id,
                            teacher_id,
                            component_key: componentKey,
                            component_label: componentLabel,
                            component_type: "omr",
                            mark: objective_total_mark,
                            max_mark: objectiveMax,
                            included_in_total: true,
                            question_count: primaryOmrComponent?.question_count ?? null,
                            group_name: templateInfo.group,
                            input_date: new Date().toISOString(),
                        },
                        { onConflict: "student_id,subject_id,exam_id,component_key" },
                    );
                if (componentErr) {
                    console.warn("Failed to save OMR component breakdown:", componentErr.message);
                    resultWarning =
                        "OMR scan saved, tetapi breakdown komponen gagal disimpan. Jalankan migration stg_mark_components.";
                }

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
                    const { data: componentRows } = await supabaseAdmin
                        .from("stg_mark_components")
                        .select("component_key, mark")
                        .eq("student_id", student_id)
                        .eq("subject_id", subject_id)
                        .eq("exam_id", exam_id);

                    const marksByKey: Record<string, number> = {};
                    for (const componentRow of Array.isArray(componentRows) ? componentRows : []) {
                        if (!componentRow || typeof componentRow !== "object") continue;
                        const key = toId((componentRow as { component_key?: unknown }).component_key);
                        if (!key) continue;
                        marksByKey[key] = toNumber((componentRow as { mark?: unknown }).mark);
                    }
                    marksByKey[componentKey] = objective_total_mark;

                    const total = computeMarkSummary(templateInfo.template, marksByKey).percentage;
                    const grade = gradeFromTotal(total, gradeNumber);

                    const resultPayload = {
                        student_id,
                        subject_id,
                        exam_id,
                        omr_scan_id,
                        subjective_id,
                        total,
                        grade,
                        status: "pending",
                    };
                    const { data: existingResult } = await supabaseAdmin
                        .from("stg_results")
                        .select("result_id")
                        .eq("student_id", student_id)
                        .eq("subject_id", subject_id)
                        .eq("exam_id", exam_id)
                        .limit(1)
                        .maybeSingle();

                    const { error: upsertResultErr } = existingResult?.result_id
                        ? await supabaseAdmin
                              .from("stg_results")
                              .update(resultPayload)
                              .eq("student_id", student_id)
                              .eq("subject_id", subject_id)
                              .eq("exam_id", exam_id)
                        : await supabaseAdmin.from("stg_results").insert(resultPayload);

                    if (upsertResultErr) {
                        console.warn("Failed to upsert result after OMR save:", upsertResultErr.message);
                        resultWarning = "OMR scan saved, but result table sync failed.";
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
    } catch (err: unknown) {
        console.error("POST teacher/omr/grade FAILED:", err);
        const message =
            err instanceof Error
                ? err.message
                : err && typeof err === "object" && "message" in err
                  ? String((err as { message?: unknown }).message ?? "Ralat pelayan")
                  : "Ralat pelayan";
        return NextResponse.json({ message }, { status: 500 });
    }
}
