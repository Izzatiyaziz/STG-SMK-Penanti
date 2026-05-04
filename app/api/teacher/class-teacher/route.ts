import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

type StudentRow = {
    student_id: string;
    fullname: string | null;
    ic_number: string | null;
    level: string | number | null;
    enrollment_date: string | null;
};

// GET: fetch class assigned to this class teacher + current students
export async function GET(req: Request) {
    try {
        const guard = await requireApiRole("teacher");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const teacher_id = String(searchParams.get("teacher_id") ?? "").trim();

        if (!teacher_id) {
            return NextResponse.json(
                { error: "teacher_id diperlukan" },
                { status: 400 }
            );
        }
        if (teacher_id !== guard.session.user_id) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
        }

        const { data: assignment, error: aErr } = await supabase
            .from("stg_class_teachers")
            .select("class_id")
            .eq("teacher_id", teacher_id)
            .maybeSingle();

        if (aErr) {
            return NextResponse.json({ error: aErr.message }, { status: 500 });
        }

        if (!assignment?.class_id) {
            return NextResponse.json(
                { error: "Guru ini belum dilantik sebagai guru kelas" },
                { status: 404 }
            );
        }

        const { data: cls } = await supabase
            .from("stg_classes")
            .select("class_id, class_name, grade")
            .eq("class_id", assignment.class_id)
            .single();

        const { data: students, error: sErr } = await supabase
            .from("stg_students")
            .select("student_id, fullname, ic_number, level, enrollment_date")
            .eq("class_id", assignment.class_id)
            .order("fullname", { ascending: true });

        if (sErr) {
            return NextResponse.json({ error: sErr.message }, { status: 500 });
        }

        return NextResponse.json({
            class: cls
                ? { id: cls.class_id, name: cls.class_name, grade: String(cls.grade) }
                : { id: assignment.class_id, name: "", grade: "" },
            students: ((students ?? []) as StudentRow[]).map((s) => ({
                id: s.student_id,
                name: s.fullname,
                identifier: s.ic_number,
                level: s.level ? String(s.level) : null,
                enrollment_date: s.enrollment_date ?? null,
            })),
        });
    } catch (err) {
        console.error("GET teacher/class-teacher FAILED:", err);
        return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 });
    }
}

// POST: upsert class teacher assignment (same logic as admin)
export async function POST(req: Request) {
    try {
        const guard = await requireApiRole("teacher");
        if ("response" in guard) return guard.response;

        const body = await req.json();
        const class_id = String(body?.class_id ?? "").trim();
        const teacher_id = String(body?.teacher_id ?? "").trim();

        if (!class_id || !teacher_id) {
            return NextResponse.json(
                { error: "class_id dan teacher_id diperlukan" },
                { status: 400 }
            );
        }

        const { data: existingRow, error: existingErr } = await supabase
            .from("stg_class_teachers")
            .select("class_teacher_id, class_id, teacher_id")
            .eq("class_id", class_id)
            .maybeSingle();

        if (existingErr) {
            return NextResponse.json(
                { error: existingErr.message },
                { status: 500 }
            );
        }

        if (existingRow) {
            const { data: updatedRow, error: updateErr } = await supabase
                .from("stg_class_teachers")
                .update({ teacher_id })
                .eq("class_id", class_id)
                .select("class_teacher_id, class_id, teacher_id, created_at")
                .single();

            if (updateErr) {
                return NextResponse.json(
                    { error: updateErr.message },
                    { status: 500 }
                );
            }

            return NextResponse.json(
                {
                    success: true,
                    message: "Guru kelas berjaya dikemaskini",
                    assignment: updatedRow,
                },
                { status: 200 }
            );
        }

        const { data: insertedRow, error: insertErr } = await supabase
            .from("stg_class_teachers")
            .insert({ class_id, teacher_id })
            .select("class_teacher_id, class_id, teacher_id, created_at")
            .single();

        if (insertErr) {
            return NextResponse.json(
                { error: insertErr.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "Guru kelas berjaya dilantik",
                assignment: insertedRow,
            },
            { status: 201 }
        );
    } catch (err) {
        console.error("POST teacher/class-teacher FAILED:", err);
        return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 });
    }
}
