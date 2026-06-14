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

function buildCompetitionRanks(rows: Array<{ sid: string; average: number; hasResults: boolean }>) {
    const ranks = new Map<string, number>();
    let previousAverage: number | null = null;
    let previousRank = 0;
    rows
        .filter((row) => row.hasResults)
        .sort((a, b) => b.average - a.average || a.sid.localeCompare(b.sid))
        .forEach((row, index) => {
            const rank = previousAverage !== null && Math.abs(row.average - previousAverage) < 0.0001
                ? previousRank
                : index + 1;
            ranks.set(row.sid, rank);
            previousAverage = row.average;
            previousRank = rank;
        });
    return ranks;
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

function gradeSummary(rows: Array<{ grade: string }>) {
    const counts = new Map<string, number>();
    for (const row of rows) {
        const grade = normalizeGrade(row.grade, 0);
        counts.set(grade, (counts.get(grade) ?? 0) + 1);
    }
    return ["A", "B", "C", "D", "F"]
        .map((grade) => {
            const count = counts.get(grade) ?? 0;
            return count ? `${count}[${grade}]` : "";
        })
        .filter(Boolean)
        .join(" ");
}

function isFailingCoreSubject(subjectName: string, grade: string, mark: number) {
    const normalizedSubject = subjectName.toLowerCase();
    const normalizedGrade = normalizeGrade(grade, mark);
    const isCore = normalizedSubject.includes("bahasa melayu") || normalizedSubject.includes("sejarah");
    return isCore && (normalizedGrade === "F" || mark < 40);
}

export async function GET(req: Request) {
    try {
        const guard = await requireApiRole("teacher");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const teacher_id = toId(searchParams.get("teacher_id"));
        const exam_id = toId(searchParams.get("exam_id"));

        if (!teacher_id || !exam_id) {
            return NextResponse.json(
                { message: "teacher_id dan exam_id diperlukan" },
                { status: 400 }
            );
        }

        if (teacher_id !== guard.session.user_id) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
        }

        const { data: ct, error: ctErr } = await supabase
            .from("stg_class_teachers")
            .select("class_id")
            .eq("teacher_id", teacher_id)
            .maybeSingle();

        if (ctErr) {
            return NextResponse.json({ message: ctErr.message }, { status: 500 });
        }

        const class_id = toId(ct?.class_id);
        if (!class_id) {
            return NextResponse.json(
                { message: "Guru ini bukan Guru Kelas" },
                { status: 403 }
            );
        }

        const [{ data: classInfo }, { data: exam }, { data: cards }, { data: classStudents }, { data: teacherInfo }] = await Promise.all([
            supabase
                .from("stg_classes")
                .select("class_id, class_name, grade")
                .eq("class_id", class_id)
                .maybeSingle(),
            supabase
                .from("stg_exams")
                .select("exam_id, exam_name, academic_year")
                .eq("exam_id", exam_id)
                .maybeSingle(),
            supabase
                .from("stg_report_cards")
                .select("student_id, average_mark, class_position, ai_comment")
                .eq("class_id", class_id)
                .eq("exam_id", exam_id),
            supabase
                .from("stg_students")
                .select("student_id, fullname, ic_number")
                .eq("class_id", class_id),
            supabase
                .from("stg_teachers")
                .select("teacher_id, fullname")
                .eq("teacher_id", teacher_id)
                .maybeSingle(),
        ]);

        const studentIds = Array.from(
            new Set((classStudents ?? []).map((s: DbRow) => toId(s.student_id)).filter(Boolean))
        );

        const [{ data: results }] = await Promise.all([
            studentIds.length
                ? supabase
                      .from("stg_results")
                      .select("student_id, subject_id, total, grade, status, subjective_id")
                      .eq("exam_id", exam_id)
                      .eq("status", "approved")
                      .in("student_id", studentIds)
                : { data: [] as unknown[] },
        ]);

        const classGrade = toNumber(classInfo?.grade);
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
                  .eq("exam_id", exam_id)
                  .eq("status", "approved")
                  .in("student_id", levelStudentIds)
            : { data: [] as unknown[] };

        const resultRows = Array.isArray(results) ? (results as DbRow[]) : [];
        const subjectIds = Array.from(
            new Set(resultRows.map((r) => toId(r.subject_id)).filter(Boolean))
        );
        const { data: subjects } = subjectIds.length
            ? await supabase
                  .from("stg_subjects")
                  .select("subject_id, subject_name")
                  .in("subject_id", subjectIds)
            : { data: [] as unknown[] };

        const subjectNameById = new Map<string, string>();
        for (const s of Array.isArray(subjects) ? subjects : []) {
            if (!s || typeof s !== "object") continue;
            const row = s as DbRow;
            subjectNameById.set(toId(row.subject_id), String(row.subject_name ?? "").trim());
        }

        const studentNameById = new Map<string, string>();
        const studentIcById = new Map<string, string>();
        for (const s of Array.isArray(classStudents) ? classStudents : []) {
            if (!s || typeof s !== "object") continue;
            const row = s as DbRow;
            studentNameById.set(toId(row.student_id), String(row.fullname ?? "").trim());
            studentIcById.set(toId(row.student_id), String(row.ic_number ?? "").trim());
        }

        const cardByStudentId = new Map<string, DbRow>();
        for (const card of Array.isArray(cards) ? cards : []) {
            if (!card || typeof card !== "object") continue;
            const row = card as DbRow;
            const sid = toId(row.student_id);
            if (sid) cardByStudentId.set(sid, row);
        }

        const resultsByStudent = new Map<string, DbRow[]>();
        for (const r of resultRows) {
            if (!r || typeof r !== "object") continue;
            const row = r as DbRow;
            const sid = toId(row.student_id);
            if (!sid) continue;
            if (!resultsByStudent.has(sid)) resultsByStudent.set(sid, []);
            resultsByStudent.get(sid)!.push(row);
        }

        const averages = studentIds.map((sid) => {
            const rs = resultsByStudent.get(sid) ?? [];
            return {
                sid,
                average: average(rs.map((r) => toNumber(r.total))),
                hasResults: rs.length > 0,
            };
        });
        const positionByStudentId = buildCompetitionRanks(averages);

        const levelResultsByStudent = new Map<string, DbRow[]>();
        for (const r of Array.isArray(levelResults) ? (levelResults as DbRow[]) : []) {
            if (!r || typeof r !== "object") continue;
            const sid = toId(r.student_id);
            if (!sid) continue;
            if (!levelResultsByStudent.has(sid)) levelResultsByStudent.set(sid, []);
            levelResultsByStudent.get(sid)!.push(r);
        }

        const levelPositionByStudentId = buildCompetitionRanks(levelStudentIds
            .map((sid) => {
                const rs = levelResultsByStudent.get(sid) ?? [];
                return {
                    sid,
                    average: average(rs.map((r) => toNumber(r.total))),
                    hasResults: rs.length > 0,
                };
            }),
        );

        const out = studentIds.map((sid) => {
            const c = cardByStudentId.get(sid);
            const rs = (resultsByStudent.get(sid) ?? []).map((r) => {
                const subjectId = toId(r.subject_id);
                const mark = toNumber(r.total);
                return {
                    subject_id: subjectId,
                    name: subjectNameById.get(subjectId) ?? "",
                    mark,
                    grade: normalizeGrade(r.grade, mark),
                };
            }).sort((a, b) => a.name.localeCompare(b.name));

            const avg = c?.average_mark == null ? average(rs.map((x) => x.mark)) : toNumber(c.average_mark);
            const points = rs.map((x) => gradePoint(x.grade));
            const averageGradePoint = average(points);
            const decision = rs.some((subject) => isFailingCoreSubject(subject.name, subject.grade, subject.mark))
                ? "GAGAL"
                : "LULUS";

            return {
                student_id: sid,
                student_name: studentNameById.get(sid) ?? "",
                ic_number: studentIcById.get(sid) ?? "",
                subjects: rs,
                average_mark: avg,
                position: c?.class_position ?? positionByStudentId.get(sid) ?? null,
                class_total_students: studentIds.length,
                level_position: levelPositionByStudentId.get(sid) ?? null,
                level_total_students: levelStudentIds.length,
                grade_summary: gradeSummary(rs),
                average_grade_point: Number.isFinite(averageGradePoint) ? Number(averageGradePoint.toFixed(2)) : 0,
                decision,
                class_teacher_name: String(teacherInfo?.fullname ?? "").trim(),
                comment: String(c?.ai_comment ?? ""),
                has_report_card: Boolean(c),
            };
        }).sort((a, b) => a.student_name.localeCompare(b.student_name));

        return NextResponse.json({
            class: {
                id: class_id,
                name: classInfo?.class_name ?? "",
                grade: classInfo?.grade ?? null,
            },
            exam: exam
                ? { id: exam.exam_id, name: exam.exam_name, academic_year: exam.academic_year }
                : { id: exam_id, name: "", academic_year: "" },
            students: out,
        });
    } catch (err) {
        console.error("GET report-cards class FAILED:", err);
        return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
    }
}
