import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_CLASSES_PER_SUBJECT_TEACHER = 3;

function normalize(value: unknown) {
    return String(value ?? "").toLowerCase().trim();
}

function normalizeSubjectName(value: unknown) {
    return normalize(value).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function subjectClassStreams(subjectName: unknown) {
    const name = normalizeSubjectName(subjectName);

    if (/\bakaun\b/.test(name) || /\bperakaunan\b/.test(name)) {
        return ["ibnu khaldun"];
    }

    if (/\bbiologi\b/.test(name) || /\bkimia\b/.test(name) || /\bfizik\b/.test(name)) {
        return ["ibnu bajjah"];
    }

    if (/\bperniagaan\b/.test(name)) {
        return ["ibnu nafis"];
    }

    if (name.includes("pendidikan seni") || name.includes("seni visual")) {
        return ["ibnu nafis", "ibnu qayyum"];
    }

    if (name.includes("matematik tambahan") || name.includes("additional mathematics")) {
        return ["ibnu bajjah", "ibnu khaldun"];
    }

    return null;
}

function isAllowedClassForSubject(subjectName: unknown, grade: unknown, className: unknown) {
    const subject = normalizeSubjectName(subjectName);
    const gradeNumber = Number(grade);
    const normalizedClassName = normalizeSubjectName(className);

    if ((subject === "sains" || subject === "science") && (gradeNumber === 4 || gradeNumber === 5)) {
        return !normalizedClassName.includes("ibnu bajjah");
    }

    if (
        (subject === "reka bentuk dan teknologi" ||
            subject === "rbt" ||
            subject === "design and technology" ||
            subject === "geografi" ||
            subject === "geography") &&
        (gradeNumber === 4 || gradeNumber === 5)
    ) {
        return false;
    }

    const streams = subjectClassStreams(subjectName);
    if (!streams) return true;

    if (gradeNumber !== 4 && gradeNumber !== 5) return false;

    return streams.some((stream) => normalizedClassName.includes(stream));
}

type TeacherRoleRow = {
    teacher_id?: unknown;
};

type TeacherRow = {
    teacher_id: unknown;
    fullname?: unknown;
    status?: unknown;
};

type ClassRow = {
    class_id: unknown;
    class_name: unknown;
    grade: unknown;
};

type AssignmentRow = {
    teacher_subject_id: unknown;
    teacher_id: unknown;
    class_id: unknown;
    subject_id?: unknown;
};

type SubjectRow = {
    subject_id: unknown;
    subject_name?: unknown;
};

type ExistingAssignmentRow = {
    teacher_subject_id?: unknown;
    teacher_id?: unknown;
};

type TeacherSubjectLoad = {
    subject_id: string;
    subject_name: string;
    class_count: number;
    classes: string[];
};

async function getSubjectTeacherIds() {
    const { data: roleRow, error: roleErr } = await supabase
        .from("stg_roles")
        .select("role_id")
        .eq("role_name", "subject teacher")
        .single();

    if (roleErr || !roleRow?.role_id) return new Set<string>();

    const { data: roleRows, error: teacherRoleErr } = await supabase
        .from("stg_teacher_roles")
        .select("teacher_id")
        .eq("role_id", roleRow.role_id);

    if (teacherRoleErr) return new Set<string>();

    return new Set(
        ((roleRows ?? []) as TeacherRoleRow[])
            .map((row) => String(row.teacher_id ?? "").trim())
            .filter(Boolean)
    );
}

async function isCoordinatorForSubject(params: {
    coordinator_teacher_id: string;
    subject_id: string;
}) {
    const { coordinator_teacher_id, subject_id } = params;
    const { data, error } = await supabase
        .from("stg_subject_coordinators")
        .select("subject_coordinator_id")
        .eq("teacher_id", coordinator_teacher_id)
        .eq("subject_id", subject_id)
        .limit(1);

    if (error) return false;
    return Array.isArray(data) && data.length > 0;
}

export async function GET(req: Request) {
    try {
        const guard = await requireApiRole("subject coordinator");
        if ("response" in guard) return guard.response;

        const { searchParams } = new URL(req.url);
        const coordinator_teacher_id = String(
            searchParams.get("coordinator_teacher_id") ?? ""
        ).trim();
        const subject_id = String(searchParams.get("subject_id") ?? "").trim();

        if (!coordinator_teacher_id || !subject_id) {
            return NextResponse.json(
                { message: "coordinator_teacher_id dan subject_id diperlukan" },
                { status: 400 }
            );
        }

        if (coordinator_teacher_id !== guard.session.user_id) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
        }

        const ok = await isCoordinatorForSubject({
            coordinator_teacher_id,
            subject_id,
        });
        if (!ok) {
            return NextResponse.json(
                { message: "Akses ditolak" },
                { status: 403 }
            );
        }

        const [{ data: subject }, { data: coordinator }, { data: classes }, { data: teachers }, { data: assignments }, subjectTeacherIds] =
            await Promise.all([
                supabase
                    .from("stg_subjects")
                    .select("subject_id, subject_name")
                    .eq("subject_id", subject_id)
                    .single(),
                supabase
                    .from("stg_teachers")
                    .select("teacher_id, fullname")
                    .eq("teacher_id", coordinator_teacher_id)
                    .single(),
                supabase
                    .from("stg_classes")
                    .select("class_id, class_name, grade")
                    .order("grade", { ascending: true })
                    .order("class_name", { ascending: true }),
                supabase
                    .from("stg_teachers")
                    .select("teacher_id, fullname, status")
                    .order("fullname", { ascending: true }),
                supabase
                    .from("stg_teacher_subject")
                    .select("teacher_subject_id, teacher_id, class_id")
                    .eq("subject_id", subject_id),
                getSubjectTeacherIds(),
            ]);

        const subjectName = subject?.subject_name ?? "";
        const visibleClasses = ((classes ?? []) as ClassRow[]).filter((c) =>
            isAllowedClassForSubject(subjectName, c.grade, c.class_name)
        );
        const visibleClassIds = new Set(
            visibleClasses.map((c) => String(c.class_id ?? ""))
        );

        const activeTeachers = ((teachers ?? []) as TeacherRow[]).filter((t) => {
            const status = normalize(t?.status);
            return (
                (!status || status === "active") &&
                subjectTeacherIds.has(String(t.teacher_id ?? ""))
            );
        });
        const activeTeacherIds = activeTeachers
            .map((t) => String(t.teacher_id ?? "").trim())
            .filter(Boolean);

        const subjectLoadByTeacherId = new Map<string, TeacherSubjectLoad[]>();
        if (activeTeacherIds.length > 0) {
            const { data: teacherSubjectRows } = await supabase
                .from("stg_teacher_subject")
                .select("teacher_subject_id, teacher_id, subject_id, class_id")
                .in("teacher_id", activeTeacherIds);

            const allTeacherAssignments = (teacherSubjectRows ?? []) as AssignmentRow[];
            const assignedSubjectIds = Array.from(
                new Set(
                    allTeacherAssignments
                        .map((row) => String(row.subject_id ?? "").trim())
                        .filter(Boolean)
                )
            );
            const assignedClassIds = Array.from(
                new Set(
                    allTeacherAssignments
                        .map((row) => String(row.class_id ?? "").trim())
                        .filter(Boolean)
                )
            );

            const [{ data: assignedSubjects }, { data: assignedClasses }] =
                await Promise.all([
                    assignedSubjectIds.length > 0
                        ? supabase
                              .from("stg_subjects")
                              .select("subject_id, subject_name")
                              .in("subject_id", assignedSubjectIds)
                        : Promise.resolve({ data: [] as SubjectRow[] }),
                    assignedClassIds.length > 0
                        ? supabase
                              .from("stg_classes")
                              .select("class_id, class_name, grade")
                              .in("class_id", assignedClassIds)
                        : Promise.resolve({ data: [] as ClassRow[] }),
                ]);

            const subjectNameById = new Map(
                ((assignedSubjects ?? []) as SubjectRow[]).map((row) => [
                    String(row.subject_id ?? "").trim(),
                    String(row.subject_name ?? "").trim(),
                ])
            );
            const classLabelById = new Map(
                ((assignedClasses ?? []) as ClassRow[]).map((row) => [
                    String(row.class_id ?? "").trim(),
                    `${String(row.class_name ?? "").trim()} (T${String(row.grade ?? "").trim()})`,
                ])
            );
            const subjectLoadDraft = new Map<
                string,
                Map<string, { subject_id: string; subject_name: string; classes: Set<string> }>
            >();

            for (const row of allTeacherAssignments) {
                const teacherId = String(row.teacher_id ?? "").trim();
                const subjectId = String(row.subject_id ?? "").trim();
                if (!teacherId || !subjectId) continue;

                if (!subjectLoadDraft.has(teacherId)) {
                    subjectLoadDraft.set(teacherId, new Map());
                }
                const teacherLoad = subjectLoadDraft.get(teacherId)!;
                if (!teacherLoad.has(subjectId)) {
                    teacherLoad.set(subjectId, {
                        subject_id: subjectId,
                        subject_name: subjectNameById.get(subjectId) || subjectId,
                        classes: new Set(),
                    });
                }

                const classId = String(row.class_id ?? "").trim();
                const classLabel = classLabelById.get(classId);
                if (classLabel) teacherLoad.get(subjectId)!.classes.add(classLabel);
            }

            for (const [teacherId, subjectMap] of subjectLoadDraft) {
                subjectLoadByTeacherId.set(
                    teacherId,
                    Array.from(subjectMap.values())
                        .map((item) => {
                            const classes = Array.from(item.classes).sort((a, b) =>
                                a.localeCompare(b)
                            );
                            return {
                                subject_id: item.subject_id,
                                subject_name: item.subject_name,
                                class_count: classes.length,
                                classes,
                            };
                        })
                        .sort((a, b) => a.subject_name.localeCompare(b.subject_name))
                );
            }
        }

        return NextResponse.json({
            subject: subject
                ? { id: subject.subject_id, name: subject.subject_name }
                : null,
            coordinator: coordinator
                ? { id: coordinator.teacher_id, name: coordinator.fullname }
                : null,
            classes: visibleClasses.map((c) => ({
                id: c.class_id,
                name: c.class_name,
                grade: c.grade,
            })),
            teachers: activeTeachers.map((t) => ({
                id: t.teacher_id,
                name: t.fullname,
                subject_load:
                    subjectLoadByTeacherId.get(String(t.teacher_id ?? "").trim()) ?? [],
            })),
            assignments: ((assignments ?? []) as AssignmentRow[])
                .filter((a) => visibleClassIds.has(String(a.class_id ?? "")))
                .map((a) => ({
                    id: a.teacher_subject_id,
                    teacher_id: a.teacher_id,
                    class_id: a.class_id,
                })),
        });
    } catch (err) {
        console.error("GET coordinator teacher-subject FAILED:", err);
        return NextResponse.json(
            { message: "Ralat pelayan" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const guard = await requireApiRole("subject coordinator");
        if ("response" in guard) return guard.response;

        const body = await req.json();
        const coordinator_teacher_id = String(
            body?.coordinator_teacher_id ?? ""
        ).trim();
        const subject_id = String(body?.subject_id ?? "").trim();
        const class_id = String(body?.class_id ?? "").trim();
        const teacher_id = String(body?.teacher_id ?? "").trim(); // optional: empty => unassign

        if (!coordinator_teacher_id || !subject_id || !class_id) {
            return NextResponse.json(
                { message: "coordinator_teacher_id, subject_id, class_id diperlukan" },
                { status: 400 }
            );
        }

        if (coordinator_teacher_id !== guard.session.user_id) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
        }

        const ok = await isCoordinatorForSubject({
            coordinator_teacher_id,
            subject_id,
        });
        if (!ok) {
            return NextResponse.json(
                { message: "Akses ditolak" },
                { status: 403 }
            );
        }

        const [{ data: subject }, { data: classRow, error: classErr }] =
            await Promise.all([
                supabase
                    .from("stg_subjects")
                    .select("subject_id, subject_name")
                    .eq("subject_id", subject_id)
                    .single(),
                supabase
                    .from("stg_classes")
                    .select("class_id, class_name, grade")
                    .eq("class_id", class_id)
                    .single(),
            ]);

        if (classErr || !classRow) {
            return NextResponse.json(
                { message: "Kelas tidak dijumpai" },
                { status: 404 }
            );
        }

        if (!isAllowedClassForSubject(subject?.subject_name ?? "", classRow.grade, classRow.class_name)) {
            return NextResponse.json(
                {
                    message:
                        "Kelas ini tidak mengambil subjek tersebut.",
                },
                { status: 400 }
            );
        }

        // If unassign requested, remove any existing assignment(s) for this subject+class.
        if (!teacher_id) {
            const { error } = await supabase
                .from("stg_teacher_subject")
                .delete()
                .eq("subject_id", subject_id)
                .eq("class_id", class_id);

            if (error) {
                return NextResponse.json(
                    { message: error.message },
                    { status: 400 }
                );
            }

            return NextResponse.json({ success: true, action: "unassigned" });
        }

        // Ensure the target teacher exists.
        const { data: teacher, error: teacherErr } = await supabase
            .from("stg_teachers")
            .select("teacher_id, status")
            .eq("teacher_id", teacher_id)
            .single();

        if (teacherErr || !teacher) {
            return NextResponse.json(
                { message: "Guru tidak dijumpai" },
                { status: 404 }
            );
        }

        const subjectTeacherIds = await getSubjectTeacherIds();
        if (!subjectTeacherIds.has(String(teacher.teacher_id ?? ""))) {
            return NextResponse.json(
                { message: "Guru yang dipilih bukan Guru Subjek" },
                { status: 400 }
            );
        }

        const { data: existingRows } = await supabase
            .from("stg_teacher_subject")
            .select("teacher_subject_id, teacher_id")
            .eq("subject_id", subject_id)
            .eq("class_id", class_id)
            .limit(1);

        const existingAssignment = ((existingRows ?? []) as ExistingAssignmentRow[])[0] ?? null;
        const isSameTeacherForCurrentClass =
            String(existingAssignment?.teacher_id ?? "").trim() === teacher_id;

        if (!isSameTeacherForCurrentClass) {
            const { data: teacherAssignments, error: countErr } = await supabase
                .from("stg_teacher_subject")
                .select("teacher_subject_id")
                .eq("teacher_id", teacher_id);

            if (countErr) {
                return NextResponse.json(
                    { message: countErr.message },
                    { status: 400 }
                );
            }

            if ((teacherAssignments ?? []).length >= MAX_CLASSES_PER_SUBJECT_TEACHER) {
                return NextResponse.json(
                    {
                        message:
                            "Guru Subjek ini sudah mencapai had maksimum 3 kelas.",
                    },
                    { status: 400 }
                );
            }
        }

        // Replace any existing assignment for this subject+class (single-teacher-per-class-per-subject).
        const { error: delErr } = await supabase
            .from("stg_teacher_subject")
            .delete()
            .eq("subject_id", subject_id)
            .eq("class_id", class_id);

        if (delErr) {
            return NextResponse.json(
                { message: delErr.message },
                { status: 400 }
            );
        }

        const { data: inserted, error: insErr } = await supabase
            .from("stg_teacher_subject")
            .insert({ teacher_id, subject_id, class_id })
            .select("teacher_subject_id")
            .single();

        if (insErr) {
            return NextResponse.json(
                { message: insErr.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            id: inserted?.teacher_subject_id ?? null,
            action: "assigned",
        });
    } catch (err) {
        console.error("POST coordinator teacher-subject FAILED:", err);
        return NextResponse.json(
            { message: "Ralat pelayan" },
            { status: 500 }
        );
    }
}
