import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";
import { isAllowedClassForSubject } from "@/lib/subject-rules";

export const runtime = "nodejs";

type TeacherSubjectRow = {
    teacher_subject_id: string;
    subject_id: string;
    class_id: string;
};

type SubjectRow = {
    subject_id: string;
    subject_name: string;
};

type ClassRow = {
    class_id: string;
    class_name: string;
    grade: number | null;
};

export async function GET(req: Request) {
    try {
        const guard = await requireApiRole("teacher");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const teacher_id = String(searchParams.get("teacher_id") ?? "").trim();

        if (!teacher_id) {
            return NextResponse.json({ data: [] }, { status: 200 });
        }
        if (teacher_id !== guard.session.user_id) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
        }

        const { data: rows, error } = await supabase
            .from("stg_teacher_subject")
            .select("teacher_subject_id, subject_id, class_id")
            .eq("teacher_id", teacher_id);

        if (error) {
            return NextResponse.json({ data: [] }, { status: 200 });
        }

        const assignments = (Array.isArray(rows) ? rows : []) as TeacherSubjectRow[];
        const subjectIds = Array.from(new Set(assignments.map((r) => r.subject_id).filter(Boolean)));
        const classIds = Array.from(new Set(assignments.map((r) => r.class_id).filter(Boolean)));

        const [{ data: subjects }, { data: classes }] = await Promise.all([
            subjectIds.length
                ? supabase
                      .from("stg_subjects")
                      .select("subject_id, subject_name")
                      .in("subject_id", subjectIds)
                : { data: [] as SubjectRow[] },
            classIds.length
                ? supabase
                      .from("stg_classes")
                      .select("class_id, class_name, grade")
                      .in("class_id", classIds)
                : { data: [] as ClassRow[] },
        ]);

        const subjectById = new Map(
            ((subjects ?? []) as SubjectRow[]).map((s) => [s.subject_id, s])
        );
        const classById = new Map(
            ((classes ?? []) as ClassRow[]).map((c) => [c.class_id, c])
        );

        const data = assignments.map((r) => {
            const s = subjectById.get(r.subject_id);
            const c = classById.get(r.class_id);
            if (!isAllowedClassForSubject(s?.subject_name ?? "", c?.grade)) return null;

            return {
                id: r.teacher_subject_id,
                subject_id: r.subject_id,
                subject_name: s?.subject_name ?? "",
                class_id: r.class_id,
                class_name: c?.class_name ?? "",
                grade: c?.grade ?? null,
            };
        }).filter(Boolean);

        return NextResponse.json({ data });
    } catch (err) {
        console.error("GET teacher assignments FAILED:", err);
        return NextResponse.json({ data: [] }, { status: 200 });
    }
}
