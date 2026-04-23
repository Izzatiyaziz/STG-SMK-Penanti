import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const teacher_id = searchParams.get("teacher_id");
        const subject_id = searchParams.get("subject_id");
        const class_id = searchParams.get("class_id");

        let q = supabase
            .from("stg_teacher_subject")
            .select("teacher_subject_id, teacher_id, subject_id, class_id");

        if (teacher_id) q = q.eq("teacher_id", teacher_id);
        if (subject_id) q = q.eq("subject_id", subject_id);
        if (class_id) q = q.eq("class_id", class_id);

        const { data: rows, error } = await q;

        if (error) {
            return NextResponse.json(
                { message: error.message, data: [] },
                { status: 500 }
            );
        }

        const teacherIds = Array.from(
            new Set((rows ?? []).map((r) => r.teacher_id as string))
        ).filter(Boolean);
        const subjectIds = Array.from(
            new Set((rows ?? []).map((r) => r.subject_id as string))
        ).filter(Boolean);
        const classIds = Array.from(
            new Set((rows ?? []).map((r) => r.class_id as string))
        ).filter(Boolean);

        const [{ data: teachers }, { data: subjects }, { data: classes }] =
            await Promise.all([
                teacherIds.length
                    ? supabase
                          .from("stg_teachers")
                          .select("teacher_id, fullname")
                          .in("teacher_id", teacherIds)
                    : { data: [] as unknown[] },
                subjectIds.length
                    ? supabase
                          .from("stg_subjects")
                          .select("subject_id, subject_name")
                          .in("subject_id", subjectIds)
                    : { data: [] as unknown[] },
                classIds.length
                    ? supabase
                          .from("stg_classes")
                          .select("class_id, class_name, grade")
                          .in("class_id", classIds)
                    : { data: [] as unknown[] },
            ]);

        const teacherNameById = new Map<string, string>();
        for (const t of Array.isArray(teachers) ? teachers : []) {
            if (!t || typeof t !== "object") continue;
            const id = String((t as { teacher_id?: unknown }).teacher_id ?? "").trim();
            const name = String((t as { fullname?: unknown }).fullname ?? "").trim();
            if (id) teacherNameById.set(id, name);
        }

        const subjectNameById = new Map<string, string>();
        for (const s of Array.isArray(subjects) ? subjects : []) {
            if (!s || typeof s !== "object") continue;
            const id = String((s as { subject_id?: unknown }).subject_id ?? "").trim();
            const name = String((s as { subject_name?: unknown }).subject_name ?? "").trim();
            if (id) subjectNameById.set(id, name);
        }

        const classInfoById = new Map<string, { name: string; grade: number | null }>();
        for (const c of Array.isArray(classes) ? classes : []) {
            if (!c || typeof c !== "object") continue;
            const id = String((c as { class_id?: unknown }).class_id ?? "").trim();
            const name = String((c as { class_name?: unknown }).class_name ?? "").trim();
            const gradeRaw = (c as { grade?: unknown }).grade;
            const grade =
                gradeRaw === undefined || gradeRaw === null
                    ? null
                    : Number(gradeRaw);
            if (id) classInfoById.set(id, { name, grade: Number.isFinite(grade) ? grade : null });
        }

        const data = (rows ?? []).map((r) => {
            const teacherId = String(r.teacher_id ?? "");
            const subjectId = String(r.subject_id ?? "");
            const classId = String(r.class_id ?? "");
            const classInfo = classInfoById.get(classId);

            return {
                id: r.teacher_subject_id,
                teacher_id: r.teacher_id,
                teacher_name: teacherNameById.get(teacherId) ?? "",
                subject_id: r.subject_id,
                subject_name: subjectNameById.get(subjectId) ?? "",
                class_id: r.class_id,
                class_name: classInfo?.name ?? "",
                grade: classInfo?.grade ?? null,
            };
        });

        return NextResponse.json({ data });
    } catch (err) {
        console.error("TEACHER SUBJECT GET ERROR:", err);
        return NextResponse.json({ data: [] }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const teacher_id = String(body?.teacher_id ?? "").trim();
        const subject_id = String(body?.subject_id ?? "").trim();
        const class_id = String(body?.class_id ?? "").trim();

        if (!teacher_id || !subject_id || !class_id) {
            return NextResponse.json(
                { message: "teacher_id, subject_id, class_id diperlukan" },
                { status: 400 }
            );
        }

        // ✅ Enforce: one teacher can only be assigned as subject teacher ONCE
        const { data: existingRows, error: existingErr } = await supabase
            .from("stg_teacher_subject")
            .select("teacher_subject_id, teacher_id, subject_id, class_id")
            .eq("teacher_id", teacher_id)
            .limit(1);

        if (existingErr) {
            return NextResponse.json(
                { message: existingErr.message },
                { status: 500 }
            );
        }

        if (Array.isArray(existingRows) && existingRows.length > 0) {
            return NextResponse.json(
                {
                    message:
                        "Guru ini sudah diassign sebagai guru subjek. Sila padam assignment lama dahulu.",
                    existing: existingRows[0],
                },
                { status: 409 }
            );
        }

        const { data, error } = await supabase
            .from("stg_teacher_subject")
            .insert({ teacher_id, subject_id, class_id })
            .select("teacher_subject_id")
            .single();

        if (error) {
            return NextResponse.json(
                { message: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, id: data?.teacher_subject_id });
    } catch (err) {
        console.error("TEACHER SUBJECT POST ERROR:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = String(searchParams.get("id") ?? "").trim();

        if (!id) {
            return NextResponse.json(
                { message: "id diperlukan" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("stg_teacher_subject")
            .delete()
            .eq("teacher_subject_id", id);

        if (error) {
            return NextResponse.json(
                { message: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("TEACHER SUBJECT DELETE ERROR:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
