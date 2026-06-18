import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

type DbRow = Record<string, unknown>;

function toId(v: unknown) {
    return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function toNumber(v: unknown) {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
}

function average(arr: number[]) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function normalizeGrade(value: unknown, mark: number) {
    const grade = toId(value).toUpperCase();
    if (grade === "E") return "F";
    if (["A", "B", "C", "D", "F"].includes(grade)) return grade;
    if (mark >= 80) return "A";
    if (mark >= 65) return "B";
    if (mark >= 50) return "C";
    if (mark >= 40) return "D";
    return "F";
}

function gradePoint(grade: string) {
    switch (grade.toUpperCase()) {
        case "A":
            return 1;
        case "B":
            return 2;
        case "C":
            return 3;
        case "D":
            return 4;
        default:
            return 5;
    }
}

function gradeSummary(results: Array<{ grade: string }>) {
    const counts = new Map<string, number>();
    for (const row of results) {
        const grade = normalizeGrade(row.grade, 0);
        if (!grade) continue;
        counts.set(grade, (counts.get(grade) ?? 0) + 1);
    }

    return ["A", "B", "C", "D", "F"]
        .filter((grade) => (counts.get(grade) ?? 0) > 0)
        .map((grade) => `${counts.get(grade)}[${grade}]`)
        .join(" ");
}

function isFailingCoreSubject(subjectName: string, grade: string, mark: number) {
    const normalizedSubject = subjectName.toLowerCase();
    const normalizedGrade = normalizeGrade(grade, mark);
    const isCore = normalizedSubject.includes("bahasa melayu") || normalizedSubject.includes("sejarah");
    return isCore && (normalizedGrade === "F" || mark < 40);
}

function normalizeClassName(value: unknown) {
    return String(value ?? "")
        .trim()
        .replace(/^\s*[-–—]\s*/, "")
        .trim();
}

function formatClassLabel(classRow: { class_name?: unknown; grade?: unknown } | null | undefined) {
    const className = normalizeClassName(classRow?.class_name);
    const grade = toNumber(classRow?.grade);
    if (!className) return "";
    if (grade > 0) {
        const gradePrefix = String(grade);
        return new RegExp(`^${gradePrefix}\\b`).test(className) ? className : `${gradePrefix} ${className}`;
    }
    return className;
}

function isHiddenStudentReportExam(exam: DbRow) {
    return toId(exam.academic_year) === "2025";
}

export async function GET(req: Request) {
    try {
        const guard = await requireApiRole("student");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const exam_id = toId(searchParams.get("exam_id"));
        const student_id = guard.session.user_id;

        const { data: studentRow, error: studentErr } = await supabase
            .from("stg_students")
            .select("student_id, fullname, ic_number, class_id")
            .eq("student_id", student_id)
            .maybeSingle();

        if (studentErr) {
            return NextResponse.json({ message: studentErr.message }, { status: 500 });
        }
        if (!studentRow) {
            return NextResponse.json({ message: "Pelajar tidak ditemui" }, { status: 404 });
        }

        const classId = toId(studentRow.class_id);
        let availableCardsQuery = supabase
            .from("stg_report_cards")
            .select("exam_id, generated_date")
            .eq("student_id", student_id)
            .order("generated_date", { ascending: false });
        if (classId) {
            availableCardsQuery = (availableCardsQuery as typeof availableCardsQuery).eq("class_id", classId);
        }
        const { data: availableCards } = await availableCardsQuery;
        const availableExamIds = Array.from(
            new Set(
                (Array.isArray(availableCards) ? availableCards : [])
                    .map((row) => toId((row as DbRow).exam_id))
                    .filter(Boolean),
            ),
        );
        const { data: availableExamRows } = availableExamIds.length
            ? await supabase
                  .from("stg_exams")
                  .select("exam_id, exam_name, academic_year")
                  .in("exam_id", availableExamIds)
            : { data: [] as unknown[] };
        const visibleExamRows = (Array.isArray(availableExamRows) ? availableExamRows : [])
            .filter((row) => !isHiddenStudentReportExam(row as DbRow));
        const visibleExamIds = visibleExamRows
            .map((row) => toId((row as DbRow).exam_id))
            .filter(Boolean);

        if (exam_id && !visibleExamIds.includes(exam_id)) {
            return NextResponse.json({ message: "Slip keputusan tidak tersedia" }, { status: 404 });
        }
        if (visibleExamIds.length === 0) {
            return NextResponse.json({ message: "Slip keputusan belum dijana" }, { status: 404 });
        }

        let reportCardQuery = supabase
            .from("stg_report_cards")
            .select("report_card_id, class_id, teacher_id, exam_id, average_mark, class_position, ai_comment, generated_date")
            .eq("student_id", student_id)
            .in("exam_id", visibleExamIds)
            .order("generated_date", { ascending: false })
            .limit(1);

        if (classId) {
            reportCardQuery = (reportCardQuery as typeof reportCardQuery).eq("class_id", classId);
        }

        if (exam_id) {
            reportCardQuery = supabase
                .from("stg_report_cards")
                .select("report_card_id, class_id, teacher_id, exam_id, average_mark, class_position, ai_comment, generated_date")
                .eq("student_id", student_id)
                .eq("exam_id", exam_id)
                .limit(1);
            if (classId) {
                reportCardQuery = (reportCardQuery as typeof reportCardQuery).eq("class_id", classId);
            }
        }

        const { data: reportCards, error: cardErr } = await reportCardQuery;
        if (cardErr) {
            return NextResponse.json({ message: cardErr.message }, { status: 500 });
        }

        const reportCard = Array.isArray(reportCards) ? reportCards[0] : null;
        if (!reportCard) {
            return NextResponse.json({ message: "Slip keputusan belum dijana" }, { status: 404 });
        }

        const [{ data: classRow }, { data: teacherRow }, { data: examRow }, { data: results }] = await Promise.all([
            supabase
                .from("stg_classes")
                .select("class_id, class_name, grade")
                .eq("class_id", toId(reportCard.class_id))
                .maybeSingle(),
            supabase
                .from("stg_teachers")
                .select("teacher_id, fullname")
                .eq("teacher_id", toId(reportCard.teacher_id))
                .maybeSingle(),
            supabase
                .from("stg_exams")
                .select("exam_id, exam_name, academic_year")
                .eq("exam_id", toId(reportCard.exam_id))
                .maybeSingle(),
            supabase
                .from("stg_results")
                .select("subject_id, total, grade")
                .eq("student_id", student_id)
                .eq("exam_id", toId(reportCard.exam_id))
                .eq("status", "approved"),
        ]);

        const { count: totalStudents } = classId
            ? await supabase
                  .from("stg_students")
                  .select("student_id", { count: "exact", head: true })
                  .eq("class_id", classId)
                  .eq("status", "active")
            : { count: 0 };

        const classGrade = toNumber(classRow?.grade);
        const { data: levelClasses } = classGrade
            ? await supabase.from("stg_classes").select("class_id").eq("grade", classGrade)
            : { data: [] as unknown[] };
        const levelClassRows = Array.isArray(levelClasses) ? (levelClasses as DbRow[]) : [];
        const levelClassIds = Array.from(
            new Set(levelClassRows.map((row) => toId(row.class_id)).filter(Boolean))
        );
        const { data: levelStudents } = levelClassIds.length
            ? await supabase
                  .from("stg_students")
                  .select("student_id, class_id")
                  .in("class_id", levelClassIds)
            : { data: [] as unknown[] };
        const levelStudentRows = Array.isArray(levelStudents) ? (levelStudents as DbRow[]) : [];
        const levelStudentIds = Array.from(
            new Set(levelStudentRows.map((row) => toId(row.student_id)).filter(Boolean))
        );
        const { data: levelResults } = levelStudentIds.length
            ? await supabase
                  .from("stg_results")
                  .select("student_id, total, grade, status, subjective_id")
                  .eq("exam_id", toId(reportCard.exam_id))
                  .eq("status", "approved")
                  .not("subjective_id", "is", null)
                  .in("student_id", levelStudentIds)
            : { data: [] as unknown[] };

        const resultRows = Array.isArray(results) ? (results as DbRow[]) : [];
        const subjectIds = Array.from(new Set(resultRows.map((row) => toId(row.subject_id)).filter(Boolean)));
        const { data: subjects } = subjectIds.length
            ? await supabase.from("stg_subjects").select("subject_id, subject_name").in("subject_id", subjectIds)
            : { data: [] as unknown[] };

        const subjectNameById = new Map<string, string>();
        for (const subject of Array.isArray(subjects) ? subjects : []) {
            const id = toId((subject as { subject_id?: unknown }).subject_id);
            const name = String((subject as { subject_name?: unknown }).subject_name ?? "").trim();
            if (id) subjectNameById.set(id, name);
        }

        const subjectResults = resultRows
            .map((row) => ({
                subject: subjectNameById.get(toId(row.subject_id)) ?? "",
                mark: toNumber(row.total),
                grade: normalizeGrade(row.grade, toNumber(row.total)),
            }))
            .sort((a, b) => a.subject.localeCompare(b.subject));

        const totalMarks = subjectResults.reduce((sum, row) => sum + row.mark, 0);
        const position = toNumber(reportCard.class_position);
        const levelResultsByStudent = new Map<string, Array<{ total?: unknown }>>();
        for (const row of Array.isArray(levelResults) ? levelResults : []) {
            const sid = toId((row as { student_id?: unknown }).student_id);
            if (!sid) continue;
            if (!levelResultsByStudent.has(sid)) levelResultsByStudent.set(sid, []);
            levelResultsByStudent.get(sid)!.push(row as { total?: unknown });
        }
        const levelPositionByStudentId = new Map<string, number>();
        levelStudentIds
            .map((sid) => {
                const rows = levelResultsByStudent.get(sid) ?? [];
                return {
                    sid,
                    average: average(rows.map((row) => toNumber(row.total))),
                    hasResults: rows.length > 0,
                };
            })
            .filter((row) => row.hasResults)
            .sort((a, b) => b.average - a.average)
            .forEach((row, index) => levelPositionByStudentId.set(row.sid, index + 1));
        const levelPosition = levelPositionByStudentId.get(student_id) ?? null;
        const averageGradePoint = average(subjectResults.map((row) => gradePoint(row.grade)));
        const decision = subjectResults.some((subject) =>
            isFailingCoreSubject(subject.subject, subject.grade, subject.mark)
        )
            ? "GAGAL"
            : "LULUS";

        return NextResponse.json({
            success: true,
            student: {
                examId: toId(reportCard.exam_id),
                name: String(studentRow.fullname ?? ""),
                ic: String(studentRow.ic_number ?? ""),
                className: formatClassLabel(classRow as { class_name?: unknown; grade?: unknown } | null),
                exam: String(examRow?.exam_name ?? ""),
                year: String(examRow?.academic_year ?? ""),
                classTeacher: String(teacherRow?.fullname ?? ""),
            },
            exams: visibleExamRows
                .map((row) => ({
                    id: toId((row as DbRow).exam_id),
                    name: String((row as DbRow).exam_name ?? "").trim(),
                    year: String((row as DbRow).academic_year ?? "").trim(),
                }))
                .filter((row) => row.id)
                .sort((a, b) => `${b.year} ${b.name}`.localeCompare(`${a.year} ${a.name}`)),
            results: subjectResults,
            summary: {
                totalSubjects: subjectResults.length,
                totalMarks,
                totalStudents: totalStudents ?? 0,
                classRank: position
                    ? (totalStudents ?? 0) > 0
                        ? `${position} / ${totalStudents}`
                        : `${position}`
                    : "-",
                levelRank: levelPosition
                    ? levelStudentIds.length > 0
                        ? `${levelPosition} / ${levelStudentIds.length}`
                        : `${levelPosition}`
                    : "-",
                percentage: Number(toNumber(reportCard.average_mark).toFixed(1)),
                gradeSummary: gradeSummary(subjectResults),
                averageGradePoint: Number.isFinite(averageGradePoint)
                    ? Number(averageGradePoint.toFixed(2))
                    : 0,
                decision,
                comment: String(reportCard.ai_comment ?? "").trim(),
            },
        });
    } catch (err: unknown) {
        console.error("GET student report-card FAILED:", err);
        return NextResponse.json(
            { message: err instanceof Error ? err.message : "Ralat pelayan" },
            { status: 500 }
        );
    }
}
