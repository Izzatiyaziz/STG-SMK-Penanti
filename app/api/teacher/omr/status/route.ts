import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/auth";
import supabaseAdmin from "@/lib/supabase-admin";
import { isMarkingClosedForAssignment } from "@/lib/exam-utils";

export const runtime = "nodejs";

function toId(value: unknown) {
	return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

export async function GET(req: Request) {
	try {
		const guard = await requireApiRole("teacher");
		if ("response" in guard) return guard.response;

		const { searchParams } = new URL(req.url);
		const classId = toId(searchParams.get("class_id"));
		const subjectId = toId(searchParams.get("subject_id"));
		const examId = toId(searchParams.get("exam_id"));
		if (!classId || !subjectId || !examId) {
			return NextResponse.json({ locked: false });
		}

		const { data: assignment } = await supabaseAdmin
			.from("stg_teacher_subject")
			.select("teacher_subject_id")
			.eq("teacher_id", guard.session.user_id)
			.eq("class_id", classId)
			.eq("subject_id", subjectId)
			.limit(1);
		if (!Array.isArray(assignment) || assignment.length === 0) {
			return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
		}

		const [{ data: classRow }, { data: examRow }] = await Promise.all([
			supabaseAdmin.from("stg_classes").select("grade").eq("class_id", classId).maybeSingle(),
			supabaseAdmin.from("stg_exams").select("subject_settings").eq("exam_id", examId).maybeSingle(),
		]);
		if (isMarkingClosedForAssignment(
			{ subject_settings: examRow?.subject_settings as Record<string, unknown> | undefined },
			{ subject_id: subjectId, grade: Number(classRow?.grade ?? 0) },
		)) {
			return NextResponse.json({
				locked: true,
				message: "Pemarkahan telah ditutup oleh panitia untuk peperiksaan ini.",
			});
		}

		const { data: students } = await supabaseAdmin
			.from("stg_students")
			.select("student_id")
			.eq("class_id", classId);
		const studentIds = (students ?? []).map((row) => toId(row.student_id)).filter(Boolean);
		if (studentIds.length === 0) return NextResponse.json({ locked: false });

		const { count, error } = await supabaseAdmin
			.from("stg_results")
			.select("result_id", { count: "exact", head: true })
			.eq("subject_id", subjectId)
			.eq("exam_id", examId)
			.eq("status", "approved")
			.in("student_id", studentIds);
		if (error) return NextResponse.json({ message: error.message }, { status: 500 });

		return NextResponse.json({
			locked: Number(count ?? 0) > 0,
			message: Number(count ?? 0) > 0
				? "Markah peperiksaan ini telah diluluskan. Imbasan OMR baharu tidak dibenarkan."
				: "",
		});
	} catch (error) {
		console.error("GET teacher/omr/status FAILED:", error);
		return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
	}
}
