import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/auth";
import supabaseAdmin from "@/lib/supabase-admin";

export const runtime = "nodejs";

function toId(value: unknown) {
	return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

export async function PATCH(req: Request) {
	try {
		const guard = await requireApiRole("subject coordinator");
		if ("response" in guard) return guard.response;
		const body = await req.json();
		const examId = toId(body?.exam_id);
		const subjectId = toId(body?.subject_id);
		const grade = Number(body?.grade);
		const gradeKey = Number.isInteger(grade) && grade >= 1 && grade <= 5 ? `tingkatan-${grade}` : "";
		const closed = body?.closed === true;
		if (!examId || !subjectId || !gradeKey) {
			return NextResponse.json({ message: "exam_id, subject_id dan tingkatan diperlukan" }, { status: 400 });
		}

		const { data: coordinator } = await supabaseAdmin
			.from("stg_subject_coordinators")
			.select("subject_coordinator_id")
			.eq("teacher_id", guard.session.user_id)
			.eq("subject_id", subjectId)
			.limit(1);
		if (!Array.isArray(coordinator) || coordinator.length === 0) {
			return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
		}

		if (closed) {
			const { data: assignments } = await supabaseAdmin
				.from("stg_teacher_subject")
				.select("teacher_id, class_id")
				.eq("subject_id", subjectId);
			const classIds = Array.from(new Set((assignments ?? []).map((row) => toId(row.class_id)).filter(Boolean)));
			const { data: classes } = classIds.length
				? await supabaseAdmin.from("stg_classes").select("class_id, grade").in("class_id", classIds)
				: { data: [] };
			const allowedClassIds = new Set(
				(classes ?? [])
					.filter((row) => Number(row.grade ?? 0) === grade)
					.map((row) => toId(row.class_id)),
			);
			const relevantAssignments = (assignments ?? []).filter((row) => allowedClassIds.has(toId(row.class_id)));
			const { data: students } = allowedClassIds.size
				? await supabaseAdmin.from("stg_students").select("student_id, class_id").in("class_id", Array.from(allowedClassIds))
				: { data: [] };
			const studentIds = (students ?? []).map((row) => toId(row.student_id)).filter(Boolean);
			const { data: submissions } = studentIds.length
				? await supabaseAdmin
					.from("stg_subjective_marks")
					.select("teacher_id, student_id")
					.eq("subject_id", subjectId)
					.eq("exam_id", examId)
					.in("student_id", studentIds)
				: { data: [] };
			const submittedPairs = new Set(
				(submissions ?? []).map((row) => `${toId(row.teacher_id)}:${toId(row.student_id)}`),
			);
			const studentsByClass = new Map<string, string[]>();
			for (const student of students ?? []) {
				const classId = toId(student.class_id);
				const list = studentsByClass.get(classId) ?? [];
				list.push(toId(student.student_id));
				studentsByClass.set(classId, list);
			}
			const allComplete =
				relevantAssignments.length > 0 &&
				relevantAssignments.every((assignment) => {
					const teacherId = toId(assignment.teacher_id);
					const classStudents = studentsByClass.get(toId(assignment.class_id)) ?? [];
					return classStudents.length > 0 &&
						classStudents.every((studentId) => submittedPairs.has(`${teacherId}:${studentId}`));
				});
			if (!allComplete) {
				return NextResponse.json(
					{ message: "Semua guru subjek perlu menghantar markah terlebih dahulu." },
					{ status: 409 },
				);
			}
		}

		const { data: exam, error } = await supabaseAdmin
			.from("stg_exams")
			.select("subject_settings")
			.eq("exam_id", examId)
			.single();
		if (error || !exam) return NextResponse.json({ message: "Peperiksaan tidak dijumpai" }, { status: 404 });

		const settings = exam.subject_settings && typeof exam.subject_settings === "object"
			? (exam.subject_settings as Record<string, unknown>)
			: {};
		const subjectRaw = settings[subjectId];
		const subject = subjectRaw && typeof subjectRaw === "object"
			? (subjectRaw as Record<string, unknown>)
			: {};
		const closedRaw = subject.marking_closed;
		const markingClosed = closedRaw && typeof closedRaw === "object"
			? { ...(closedRaw as Record<string, unknown>) }
			: {};
		markingClosed[gradeKey] = closed;

		const nextSettings = {
			...settings,
			[subjectId]: { ...subject, marking_closed: markingClosed },
		};
		const { error: updateError } = await supabaseAdmin
			.from("stg_exams")
			.update({ subject_settings: nextSettings })
			.eq("exam_id", examId);
		if (updateError) return NextResponse.json({ message: updateError.message }, { status: 500 });

		return NextResponse.json({ success: true, closed, grade });
	} catch (error) {
		console.error("PATCH coordinator marking-status FAILED:", error);
		return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
	}
}
