import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";
import { compareExamsChronologically } from "@/lib/exam-utils";

export const runtime = "nodejs";

type StudentRow = { student_id?: unknown; fullname?: unknown };
type ResultRow = {
	student_id?: unknown;
	subject_id?: unknown;
	exam_id?: unknown;
	total?: unknown;
	grade?: unknown;
};
type SubjectRow = { subject_id?: unknown; subject_name?: unknown };
type ExamRow = { exam_id?: unknown; exam_name?: unknown; academic_year?: unknown };

function toId(value: unknown) {
	return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function toNumber(value: unknown) {
	const n = typeof value === "number" ? value : Number(value);
	return Number.isFinite(n) ? n : 0;
}

function round(value: number) {
	return Math.round(value * 10) / 10;
}

function average(values: number[]) {
	return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function normalizeGrade(value: unknown, total: number) {
	const grade = toId(value).toUpperCase();
	if (grade === "E") return "E";
	if (["A", "B", "C", "D", "E"].includes(grade)) return grade;
	if (total >= 80) return "A";
	if (total >= 65) return "B";
	if (total >= 50) return "C";
	if (total >= 40) return "D";
	return "E";
}

function category(mark: number) {
	if (mark >= 80) return "Excellent";
	if (mark >= 65) return "Good";
	if (mark >= 50) return "Average";
	return "Weak";
}

export async function GET(req: Request) {
	try {
		const guard = await requireApiRole("teacher");
		if ("response" in guard) return guard.response;

		const { searchParams } = new URL(req.url);
		const teacherId = toId(searchParams.get("teacher_id"));
		if (!teacherId || teacherId !== guard.session.user_id) {
			return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
		}

		const { data: assignment, error: assignmentErr } = await supabase
			.from("stg_class_teachers")
			.select("class_id")
			.eq("teacher_id", teacherId)
			.maybeSingle();

		if (assignmentErr) {
			return NextResponse.json({ message: assignmentErr.message }, { status: 500 });
		}

		const classId = toId(assignment?.class_id);
		if (!classId) {
			return NextResponse.json({ message: "Guru ini bukan Guru Kelas", data: null }, { status: 403 });
		}

		const [{ data: classInfo }, { data: students }, { data: teacher }] = await Promise.all([
			supabase
				.from("stg_classes")
				.select("class_id, class_name, grade")
				.eq("class_id", classId)
				.maybeSingle(),
			supabase
				.from("stg_students")
				.select("student_id, fullname")
				.eq("class_id", classId)
				.order("fullname", { ascending: true }),
			supabase
				.from("stg_teachers")
				.select("teacher_id, fullname, email")
				.eq("teacher_id", teacherId)
				.maybeSingle(),
		]);

		const studentRows = (students ?? []) as StudentRow[];
		const studentIds = studentRows.map((student) => toId(student.student_id)).filter(Boolean);
		const studentNameById = new Map(
			studentRows.map((student) => [
				toId(student.student_id),
				toId(student.fullname) || toId(student.student_id),
			]),
		);

		if (studentIds.length === 0) {
			return NextResponse.json({
				data: {
					class: {
						id: classId,
						name: classInfo?.class_name ?? "",
						grade: classInfo?.grade ?? null,
					},
					teacher: {
						id: teacherId,
						name: teacher?.fullname ?? "",
						email: teacher?.email ?? "",
					},
					totalStudents: 0,
					exams: [],
					trend: [],
					examSummaries: {},
				},
			});
		}

		const { data: results, error: resultErr } = await supabase
			.from("stg_results")
			.select("student_id, subject_id, exam_id, total, grade")
			.eq("status", "approved")
			.in("student_id", studentIds);

		if (resultErr) {
			return NextResponse.json({ message: resultErr.message, data: null }, { status: 500 });
		}

		const resultRows = (results ?? []) as ResultRow[];
		const subjectIds = Array.from(new Set(resultRows.map((row) => toId(row.subject_id)).filter(Boolean)));
		const examIds = Array.from(new Set(resultRows.map((row) => toId(row.exam_id)).filter(Boolean)));

		const [{ data: subjects }, { data: exams }] = await Promise.all([
			subjectIds.length
				? supabase.from("stg_subjects").select("subject_id, subject_name").in("subject_id", subjectIds)
				: { data: [] as SubjectRow[] },
			examIds.length
				? supabase.from("stg_exams").select("exam_id, exam_name, academic_year").in("exam_id", examIds)
				: { data: [] as ExamRow[] },
		]);

		const subjectNameById = new Map<string, string>();
		for (const subject of (subjects ?? []) as SubjectRow[]) {
			const id = toId(subject.subject_id);
			if (!id) continue;
			subjectNameById.set(id, toId(subject.subject_name) || id);
		}

		const examById = new Map<string, { id: string; name: string; academic_year: string }>();
		for (const exam of (exams ?? []) as ExamRow[]) {
			const id = toId(exam.exam_id);
			if (!id) continue;
			if (toId(exam.academic_year) === "2025") continue;
			examById.set(id, {
				id,
				name: toId(exam.exam_name) || id,
				academic_year: toId(exam.academic_year),
			});
		}

		const marksByExamStudent = new Map<string, Map<string, number[]>>();
		const marksByExamSubject = new Map<string, Map<string, number[]>>();
		const gradeCountsByExam = new Map<string, Record<string, number>>();
		const failedSubjectsByExamStudent = new Map<string, Map<string, number>>();

		for (const result of resultRows) {
			const examId = toId(result.exam_id);
			const studentId = toId(result.student_id);
			const subjectId = toId(result.subject_id);
			const total = toNumber(result.total);
			if (!examId || !studentId || !subjectId) continue;
			if (!examById.has(examId)) continue;

			if (!marksByExamStudent.has(examId)) marksByExamStudent.set(examId, new Map());
			const studentMap = marksByExamStudent.get(examId)!;
			if (!studentMap.has(studentId)) studentMap.set(studentId, []);
			studentMap.get(studentId)!.push(total);

			if (!marksByExamSubject.has(examId)) marksByExamSubject.set(examId, new Map());
			const subjectMap = marksByExamSubject.get(examId)!;
			if (!subjectMap.has(subjectId)) subjectMap.set(subjectId, []);
			subjectMap.get(subjectId)!.push(total);

			if (!gradeCountsByExam.has(examId)) {
				gradeCountsByExam.set(examId, { A: 0, B: 0, C: 0, D: 0, E: 0 });
			}
			gradeCountsByExam.get(examId)![normalizeGrade(result.grade, total)] += 1;

			if (total < 40) {
				if (!failedSubjectsByExamStudent.has(examId)) failedSubjectsByExamStudent.set(examId, new Map());
				const failedMap = failedSubjectsByExamStudent.get(examId)!;
				failedMap.set(studentId, (failedMap.get(studentId) ?? 0) + 1);
			}
		}

		const examList = Array.from(examById.values()).sort((a, b) => {
			const yearCompare = b.academic_year.localeCompare(a.academic_year);
			return yearCompare || a.name.localeCompare(b.name);
		});

		const averageByExamStudent = new Map<string, Map<string, number>>();
		for (const [examId, studentMap] of marksByExamStudent) {
			const out = new Map<string, number>();
			for (const [studentId, marks] of studentMap) {
				out.set(studentId, average(marks));
			}
			averageByExamStudent.set(examId, out);
		}

		const trend = examList
			.map((exam) => {
				const studentAverages = Array.from(averageByExamStudent.get(exam.id)?.values() ?? []);
				return {
					exam_id: exam.id,
					exam: exam.academic_year ? `${exam.name} (${exam.academic_year})` : exam.name,
					average: round(average(studentAverages)),
					academic_year: exam.academic_year,
				};
			})
			.sort((a, b) =>
				compareExamsChronologically(
					{ name: a.exam, year: a.academic_year },
					{ name: b.exam, year: b.academic_year },
				),
			);

		const examSummaries: Record<string, unknown> = {};
		for (const exam of examList) {
			const studentAverageMap = averageByExamStudent.get(exam.id) ?? new Map();
			const studentAverages = Array.from(studentAverageMap.entries()).map(([studentId, mark]) => ({
				student_id: studentId,
				name: studentNameById.get(studentId) ?? studentId,
				average: round(mark),
				failedSubjects: failedSubjectsByExamStudent.get(exam.id)?.get(studentId) ?? 0,
			}));

			const previousExam = trend
				.filter((item) => item.exam_id !== exam.id)
				.find((item) => item.academic_year <= exam.academic_year);
			const previousMap = previousExam ? averageByExamStudent.get(previousExam.exam_id) : undefined;

			const topStudents = [...studentAverages]
				.sort((a, b) => b.average - a.average)
				.slice(0, 3);

			const studentsNeedAttention = studentAverages
				.map((student) => {
					const previous = previousMap?.get(student.student_id);
					const declining = typeof previous === "number" && student.average + 5 < previous;
					const status =
						student.average < 35 || student.failedSubjects >= 2
							? "Critical"
							: student.average < 40
								? "Weak"
								: declining || student.average < 50
									? "Monitor"
									: "";
					return { ...student, status, declining };
				})
				.filter((student) => student.status)
				.sort((a, b) => a.average - b.average)
				.slice(0, 8);

			const categoryCounts = { Excellent: 0, Good: 0, Average: 0, Weak: 0 };
			for (const student of studentAverages) categoryCounts[category(student.average)] += 1;
			const totalCategorized = studentAverages.length || 1;
			const categoryBreakdown = Object.entries(categoryCounts).map(([name, count]) => ({
				name,
				value: count,
				percent: Math.round((count / totalCategorized) * 100),
			}));

			const subjectPerformance = Array.from(marksByExamSubject.get(exam.id)?.entries() ?? [])
				.map(([subjectId, marks]) => ({
					subject_id: subjectId,
					subject: subjectNameById.get(subjectId) ?? subjectId,
					average: round(average(marks)),
				}))
				.sort((a, b) => a.average - b.average);

			const strongest = [...subjectPerformance].sort((a, b) => b.average - a.average)[0];
			const weakest = subjectPerformance[0];
			const weakCount = studentAverages.filter((student) => student.average < 40).length;
			const insightParts = [];
			if (strongest && weakest) {
				insightParts.push(
					`Most students perform well in ${strongest.subject}, but ${weakest.subject} shows the lowest average score.`,
				);
			}
			if (weakCount > 0) {
				insightParts.push(`${weakCount} students scored below 40% and require additional academic support.`);
			}
			if (studentsNeedAttention.some((student) => student.declining)) {
				insightParts.push("Some students show a declining performance trend and should be monitored.");
			}

			examSummaries[exam.id] = {
				topStudents,
				studentsNeedAttention,
				categoryBreakdown,
				subjectPerformance,
				gradeDistribution: Object.entries(gradeCountsByExam.get(exam.id) ?? { A: 0, B: 0, C: 0, D: 0, E: 0 }).map(
					([grade, value]) => ({ grade, value }),
				),
				classAverage: round(average(studentAverages.map((student) => student.average))),
				insight: insightParts.length ? insightParts.join(" ") : "Belum ada data keputusan diluluskan.",
			};
		}

		return NextResponse.json({
			data: {
				class: {
					id: classId,
					name: classInfo?.class_name ?? "",
					grade: classInfo?.grade ?? null,
				},
				teacher: {
					id: teacherId,
					name: teacher?.fullname ?? "",
					email: teacher?.email ?? "",
				},
				totalStudents: studentIds.length,
				exams: examList,
				trend,
				examSummaries,
			},
		});
	} catch (err) {
		console.error("GET teacher class-dashboard FAILED:", err);
		return NextResponse.json({ message: "Ralat pelayan", data: null }, { status: 500 });
	}
}
