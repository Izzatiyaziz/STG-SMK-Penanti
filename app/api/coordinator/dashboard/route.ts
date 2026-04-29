import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

function toId(v: unknown) {
	return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function toNumber(v: unknown) {
	const n = typeof v === "number" ? v : Number(v);
	return Number.isFinite(n) ? n : 0;
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
		const teacher_id = toId(searchParams.get("teacher_id"));
		const subject_id = toId(searchParams.get("subject_id"));
		const exam_id = toId(searchParams.get("exam_id"));

		if (!teacher_id || !subject_id || !exam_id) {
			return NextResponse.json(
				{ message: "teacher_id, subject_id, exam_id diperlukan" },
				{ status: 400 },
			);
		}

		if (teacher_id !== guard.session.user_id) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 });
		}

		const ok = await isCoordinatorForSubject({
			coordinator_teacher_id: teacher_id,
			subject_id,
		});
		if (!ok) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 });
		}

		const [{ data: subject }, { data: exam }, { data: coordTeacher }] =
			await Promise.all([
				supabase
					.from("stg_subjects")
					.select("subject_id, subject_name")
					.eq("subject_id", subject_id)
					.single(),
				supabase
					.from("stg_exams")
					.select("exam_id, exam_name, academic_year, subject_settings")
					.eq("exam_id", exam_id)
					.single(),
				supabase
					.from("stg_teachers")
					.select("teacher_id, fullname")
					.eq("teacher_id", teacher_id)
					.single(),
			]);

		const subjectSettingsAll =
			exam?.subject_settings && typeof exam.subject_settings === "object"
				? (exam.subject_settings as Record<string, unknown>)
				: {};
		const subjectSettingsRaw = subjectSettingsAll[subject_id];
		const subjectSettings =
			subjectSettingsRaw && typeof subjectSettingsRaw === "object"
				? (subjectSettingsRaw as Record<string, unknown>)
				: {};

		const { data: assignments, error: aErr } = await supabase
			.from("stg_teacher_subject")
			.select("teacher_subject_id, teacher_id, class_id")
			.eq("subject_id", subject_id);

		if (aErr) {
			return NextResponse.json({ message: aErr.message }, { status: 500 });
		}

		const classIds = Array.from(
			new Set((assignments ?? []).map((a: any) => toId(a.class_id))),
		).filter(Boolean);
		const teacherIds = Array.from(
			new Set((assignments ?? []).map((a: any) => toId(a.teacher_id))),
		).filter(Boolean);

		const [{ data: classes }, { data: teachers }, { data: students }] =
			await Promise.all([
				classIds.length
					? supabase
							.from("stg_classes")
							.select("class_id, class_name, grade")
							.in("class_id", classIds)
					: { data: [] as unknown[] },
				teacherIds.length
					? supabase
							.from("stg_teachers")
							.select("teacher_id, fullname")
							.in("teacher_id", teacherIds)
					: { data: [] as unknown[] },
				classIds.length
					? supabase
							.from("stg_students")
							.select("student_id, fullname, class_id")
							.in("class_id", classIds)
					: { data: [] as unknown[] },
			]);

		const classById = new Map<
			string,
			{ id: string; name: string; grade: number }
		>();
		for (const c of Array.isArray(classes) ? classes : []) {
			if (!c || typeof c !== "object") continue;
			const id = toId((c as any).class_id);
			const name = String((c as any).class_name ?? "");
			const grade = Number((c as any).grade ?? 0);
			if (id)
				classById.set(id, { id, name, grade: Number.isFinite(grade) ? grade : 0 });
		}

		const teacherNameById = new Map<string, string>();
		for (const t of Array.isArray(teachers) ? teachers : []) {
			if (!t || typeof t !== "object") continue;
			const id = toId((t as any).teacher_id);
			const name = String((t as any).fullname ?? "");
			if (id) teacherNameById.set(id, name);
		}

		const studentsByClassId = new Map<
			string,
			Array<{ id: string; name: string }>
		>();
		for (const s of Array.isArray(students) ? students : []) {
			if (!s || typeof s !== "object") continue;
			const sid = toId((s as any).student_id);
			const cid = toId((s as any).class_id);
			const name = String((s as any).fullname ?? "");
			if (!sid || !cid) continue;
			if (!studentsByClassId.has(cid)) studentsByClassId.set(cid, []);
			studentsByClassId.get(cid)!.push({ id: sid, name });
		}

		const allStudentIds = Array.from(
			new Set(
				Array.from(studentsByClassId.values())
					.flat()
					.map((s) => s.id),
			),
		).filter(Boolean);

		const [{ data: subjectiveMarks }, { data: results }] = await Promise.all([
			allStudentIds.length && teacherIds.length
				? supabase
						.from("stg_subjective_marks")
						.select("subjective_id, teacher_id, student_id")
						.eq("subject_id", subject_id)
						.eq("exam_id", exam_id)
						.in("teacher_id", teacherIds)
						.in("student_id", allStudentIds)
				: { data: [] as unknown[] },
			allStudentIds.length
				? supabase
						.from("stg_results")
						.select("student_id, total, grade, status, subjective_id")
						.eq("subject_id", subject_id)
						.eq("exam_id", exam_id)
						.in("student_id", allStudentIds)
				: { data: [] as unknown[] },
		]);

		const subjectiveTeacherByStudentId = new Map<string, string>();
		for (const m of Array.isArray(subjectiveMarks) ? subjectiveMarks : []) {
			if (!m || typeof m !== "object") continue;
			const sid = toId((m as any).student_id);
			const tid = toId((m as any).teacher_id);
			if (sid && tid) subjectiveTeacherByStudentId.set(sid, tid);
		}

		const resultByStudentId = new Map<
			string,
			{ total: number; grade: string; status: string; hasSubjective: boolean }
		>();
		for (const r of Array.isArray(results) ? results : []) {
			if (!r || typeof r !== "object") continue;
			const sid = toId((r as any).student_id);
			if (!sid) continue;
			resultByStudentId.set(sid, {
				total: toNumber((r as any).total),
				grade: String((r as any).grade ?? ""),
				status: String((r as any).status ?? "pending"),
				hasSubjective: Boolean((r as any).subjective_id),
			});
		}

		const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
		const classSummaries = (assignments ?? [])
			.map((a: any) => {
				const class_id = toId(a.class_id);
				const assignedTeacherId = toId(a.teacher_id);
				const classInfo = classById.get(class_id);
				const studentsInClass = studentsByClassId.get(class_id) ?? [];
				const totalStudents = studentsInClass.length;

				let submittedCount = 0;
				let resultsCount = 0;
				let totalSum = 0;
				const statusCounts: Record<string, number> = {
					pending: 0,
					approved: 0,
					rejected: 0,
				};

				for (const s of studentsInClass) {
					const subjTeacher = subjectiveTeacherByStudentId.get(s.id) ?? "";
					if (subjTeacher && subjTeacher === assignedTeacherId) submittedCount += 1;

					const rr = resultByStudentId.get(s.id);
					if (rr?.hasSubjective) {
						resultsCount += 1;
						totalSum += rr.total;
						if (rr.grade && gradeCounts[rr.grade] !== undefined)
							gradeCounts[rr.grade] += 1;
						if (rr.status && statusCounts[rr.status] !== undefined)
							statusCounts[rr.status] += 1;
					}
				}

				const avg = resultsCount ? totalSum / resultsCount : 0;

				return {
					class_id,
					class_name: classInfo?.name ?? "",
					grade: classInfo?.grade ?? 0,
					teacher_id: assignedTeacherId,
					teacher_name: teacherNameById.get(assignedTeacherId) ?? "",
					total_students: totalStudents,
					submitted_count: submittedCount,
					results_count: resultsCount,
					average_total: avg,
					status_counts: statusCounts,
				};
			})
			.sort(
				(x, y) => x.grade - y.grade || x.class_name.localeCompare(y.class_name),
			);

		const totalClasses = classSummaries.length;
		const totalTeachers = new Set(
			classSummaries.map((c) => c.teacher_id).filter(Boolean),
		).size;
		const pendingSubmissions = classSummaries.filter(
			(c) => c.total_students > 0 && c.submitted_count < c.total_students,
		).length;
		const classAverages = classSummaries
			.map((c) => c.average_total)
			.filter((n) => Number.isFinite(n) && n > 0);
		const subjectPerformance = classAverages.length
			? classAverages.reduce((a, b) => a + b, 0) / classAverages.length
			: 0;

		const alerts: string[] = [];
		for (const c of classSummaries) {
			if (c.total_students > 0 && c.submitted_count === 0) {
				alerts.push(`${c.class_name}  Tiada markah dihantar`);
			} else if (c.total_students > 0 && c.submitted_count < c.total_students) {
				alerts.push(
					`${c.class_name}  Belum lengkap (${c.submitted_count}/${c.total_students})`,
				);
			}
			if (c.average_total > 0 && c.average_total < 50) {
				alerts.push(`${c.class_name}  Purata bawah 50%`);
			}
		}

		return NextResponse.json({
			coordinator: coordTeacher
				? { id: coordTeacher.teacher_id, name: coordTeacher.fullname }
				: null,
			subject: subject
				? { id: subject.subject_id, name: subject.subject_name }
				: null,
			exam: exam
				? {
						id: exam.exam_id,
						name: exam.exam_name,
						academic_year: exam.academic_year,
					}
				: null,
			subject_settings: subjectSettings,
			summary: {
				totalClasses,
				totalTeachers,
				subjectPerformance: Math.round(subjectPerformance),
				pendingSubmissions,
			},
			gradeDistribution: Object.entries(gradeCounts)
				.map(([grade, value]) => ({ grade, value }))
				.filter((g) => g.value > 0),
			classSummaries,
			alerts: alerts.slice(0, 6),
		});
	} catch (err) {
		console.error("GET coordinator dashboard FAILED:", err);
		return NextResponse.json({ message: "Server error" }, { status: 500 });
	}
}
