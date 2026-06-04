import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

type ClassRow = { class_id?: unknown; class_name?: unknown; grade?: unknown };
type StudentRow = { student_id?: unknown; class_id?: unknown };
type TeacherRow = { teacher_id?: unknown; username?: unknown; fullname?: unknown };
type TeacherRoleRow = {
	teacher_id?: unknown;
	stg_roles?: { role_name?: unknown } | Array<{ role_name?: unknown }> | null;
};
type ClassTeacherRow = { class_teacher_id?: unknown; class_id?: unknown; teacher_id?: unknown; created_at?: unknown };

function toId(value: unknown) {
	return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function toNumber(value: unknown) {
	const n = typeof value === "number" ? value : Number(value);
	return Number.isFinite(n) ? n : 0;
}

function nestedRoleName(value: TeacherRoleRow["stg_roles"]) {
	if (Array.isArray(value)) return toId(value[0]?.role_name);
	return toId(value?.role_name);
}

export async function GET() {
	try {
		const guard = await requireApiRole("principal");
		if ("response" in guard) return guard.response;

		const [
			{ data: classes, error: classError },
			{ data: students },
			{ data: teachers },
			{ data: teacherRoles },
			{ data: classTeachers },
		] = await Promise.all([
			supabase
				.from("stg_classes")
				.select("class_id, class_name, grade")
				.order("grade", { ascending: true })
				.order("class_name", { ascending: true }),
			supabase.from("stg_students").select("student_id, class_id"),
			supabase.from("stg_teachers").select("teacher_id, username, fullname"),
			supabase.from("stg_teacher_roles").select("teacher_id, stg_roles(role_name)"),
			supabase.from("stg_class_teachers").select("class_teacher_id, class_id, teacher_id, created_at"),
		]);

		if (classError) {
			return NextResponse.json({ message: classError.message }, { status: 500 });
		}

		const studentCountByClassId = new Map<string, number>();
		for (const student of (students ?? []) as StudentRow[]) {
			const classId = toId(student.class_id);
			if (!classId) continue;
			studentCountByClassId.set(classId, (studentCountByClassId.get(classId) ?? 0) + 1);
		}

		const teacherById = new Map<string, { id: string; name: string; identifier: string; roles: string[] }>();
		for (const teacher of (teachers ?? []) as TeacherRow[]) {
			const id = toId(teacher.teacher_id);
			if (!id) continue;
			teacherById.set(id, {
				id,
				name: toId(teacher.fullname) || id,
				identifier: toId(teacher.username) || id,
				roles: [],
			});
		}

		for (const row of (teacherRoles ?? []) as TeacherRoleRow[]) {
			const teacherId = toId(row.teacher_id);
			const roleName = nestedRoleName(row.stg_roles).toLowerCase();
			const teacher = teacherById.get(teacherId);
			if (teacher && roleName) teacher.roles.push(roleName);
		}

		const assignmentByClassId = new Map<string, ClassTeacherRow>();
		for (const assignment of (classTeachers ?? []) as ClassTeacherRow[]) {
			const classId = toId(assignment.class_id);
			if (classId) assignmentByClassId.set(classId, assignment);
		}

		const rows = ((classes ?? []) as ClassRow[]).map((classRow) => {
			const classId = toId(classRow.class_id);
			const assignment = assignmentByClassId.get(classId);
			const teacherId = toId(assignment?.teacher_id);
			const teacher = teacherById.get(teacherId);
			return {
				id: classId,
				name: toId(classRow.class_name) || "-",
				grade: toNumber(classRow.grade),
				studentCount: studentCountByClassId.get(classId) ?? 0,
				teacherId,
				teacherName: teacher?.name ?? "",
			};
		});

		const teacherOptions = Array.from(teacherById.values())
			.filter((teacher) => teacher.roles.includes("class teacher"))
			.sort((a, b) => a.name.localeCompare(b.name));

		return NextResponse.json({ rows, teachers: teacherOptions });
	} catch (err) {
		console.error("GET principal class teachers FAILED:", err);
		return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
	}
}
