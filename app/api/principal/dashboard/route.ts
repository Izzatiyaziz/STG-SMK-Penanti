import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";
import { gradeFromTotal, gradeScaleForLevels } from "@/lib/grade-utils";

export const runtime = "nodejs";

type ResultRow = {
	result_id?: unknown;
	student_id?: unknown;
	subject_id?: unknown;
	exam_id?: unknown;
	total?: unknown;
	grade?: unknown;
	status?: unknown;
};
type SubjectRow = { subject_id?: unknown; subject_name?: unknown };
type ExamRow = { exam_id?: unknown; exam_name?: unknown; academic_year?: unknown };
type ClassRow = { class_id?: unknown; class_name?: unknown; grade?: unknown };
type StudentRow = { student_id?: unknown; fullname?: unknown; class_id?: unknown };
type TeacherRow = { teacher_id?: unknown; username?: unknown; fullname?: unknown };
type ClassTeacherRow = { class_id?: unknown; teacher_id?: unknown };
function toId(value: unknown) {
	return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function toNumber(value: unknown) {
	const n = typeof value === "number" ? value : Number(value);
	return Number.isFinite(n) ? n : 0;
}

function normalizeGrade(value: unknown, total: number, level: number) {
	const grade = toId(value).toUpperCase();
	const allowed = level >= 4
		? ["A+", "A", "A-", "B+", "B", "C+", "C", "D", "E", "G"]
		: ["A", "B", "C", "D", "E", "F"];
	return allowed.includes(grade) ? grade : gradeFromTotal(total, level);
}

function average(values: number[]) {
	return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function studentAverages(rows: Array<{ student_id: string; total: number }>) {
	const marksByStudent = new Map<string, number[]>();
	for (const row of rows) {
		if (!row.student_id) continue;
		const marks = marksByStudent.get(row.student_id) ?? [];
		marks.push(row.total);
		marksByStudent.set(row.student_id, marks);
	}

	return Array.from(marksByStudent.entries()).map(([student_id, marks]) => ({
		student_id,
		average: average(marks),
	}));
}

export async function GET(req: Request) {
	try {
		const guard = await requireApiRole("principal");
		if ("response" in guard) return guard.response;

		const { searchParams } = new URL(req.url);
		const subjectFilter = toId(searchParams.get("subject_id"));
		const examFilter = toId(searchParams.get("exam_id"));
		const gradeFilter = toId(searchParams.get("grade"));
		const classFilter = toId(searchParams.get("class_id"));

		const [
			{ data: subjects },
			{ data: exams },
			{ data: classes },
			{ data: results, error: resultErr },
			{ data: students },
			{ data: teachers },
			{ data: classTeachers },
		] = await Promise.all([
			supabase.from("stg_subjects").select("subject_id, subject_name").order("subject_name", { ascending: true }),
			supabase.from("stg_exams").select("exam_id, exam_name, academic_year").order("academic_year", { ascending: false }),
			supabase.from("stg_classes").select("class_id, class_name, grade").order("grade", { ascending: true }).order("class_name", { ascending: true }),
			supabase
				.from("stg_results")
				.select("result_id, student_id, subject_id, exam_id, total, grade, status")
				.eq("status", "approved")
				.not("total", "is", null),
			supabase.from("stg_students").select("student_id, fullname, class_id"),
			supabase.from("stg_teachers").select("teacher_id, username, fullname"),
			supabase.from("stg_class_teachers").select("class_id, teacher_id"),
		]);

		if (resultErr) {
			return NextResponse.json({ message: resultErr.message, data: null }, { status: 500 });
		}

		const subjectById = new Map<string, string>();
		for (const subject of (subjects ?? []) as SubjectRow[]) {
			const id = toId(subject.subject_id);
			if (id) subjectById.set(id, toId(subject.subject_name) || id);
		}

		const examById = new Map<string, { name: string; year: string }>();
		for (const exam of (exams ?? []) as ExamRow[]) {
			const id = toId(exam.exam_id);
			if (!id) continue;
			examById.set(id, {
				name: toId(exam.exam_name) || id,
				year: toId(exam.academic_year),
			});
		}

		const classById = new Map<string, { name: string; grade: number }>();
		for (const classRow of (classes ?? []) as ClassRow[]) {
			const id = toId(classRow.class_id);
			if (!id) continue;
			classById.set(id, {
				name: toId(classRow.class_name) || "-",
				grade: toNumber(classRow.grade),
			});
		}

		const teacherById = new Map<string, string>();
		for (const teacher of (teachers ?? []) as TeacherRow[]) {
			const id = toId(teacher.teacher_id);
			if (!id) continue;
			teacherById.set(id, toId(teacher.fullname) || toId(teacher.username) || id);
		}

		const classTeacherByClassId = new Map<string, string>();
		for (const row of (classTeachers ?? []) as ClassTeacherRow[]) {
			const classId = toId(row.class_id);
			const teacherId = toId(row.teacher_id);
			if (!classId || !teacherId) continue;
			classTeacherByClassId.set(classId, teacherById.get(teacherId) ?? "-");
		}

		const studentById = new Map<string, { name: string; classId: string }>();
		for (const student of (students ?? []) as StudentRow[]) {
			const id = toId(student.student_id);
			if (!id) continue;
			studentById.set(id, {
				name: toId(student.fullname) || id,
				classId: toId(student.class_id),
			});
		}

		const allRows = ((results ?? []) as ResultRow[]).map((row) => {
			const total = toNumber(row.total);
			const studentId = toId(row.student_id);
			const student = studentById.get(studentId);
			const classInfo = student?.classId ? classById.get(student.classId) : null;
			const subjectId = toId(row.subject_id);
			const examId = toId(row.exam_id);
			return {
				result_id: toId(row.result_id),
				student_id: studentId,
				student_name: student?.name ?? studentId,
				subject_id: subjectId,
				subject_name: subjectById.get(subjectId) ?? "-",
				exam_id: examId,
				exam_name: examById.get(examId)?.name ?? "-",
				exam_year: examById.get(examId)?.year ?? "",
				class_id: student?.classId ?? "",
				class_name: classInfo?.name ?? "-",
				grade_level: classInfo?.grade ?? 0,
				total,
				grade: normalizeGrade(row.grade, total, classInfo?.grade ?? 0),
			};
		});

		const approvedExamIds = new Set(allRows.map((row) => row.exam_id).filter(Boolean));
		const approvedExams = Array.from(examById.entries()).filter(([examId]) =>
			approvedExamIds.has(examId),
		);
		const hasSelectedGrade = Boolean(gradeFilter && gradeFilter !== "select-grade");
		const hasSelectedExam = Boolean(examFilter && examFilter !== "all");
		const filteredRows = hasSelectedGrade && hasSelectedExam ? allRows.filter((row) => {
			const subjectMatch = !subjectFilter || subjectFilter === "all" || row.subject_id === subjectFilter;
			const examMatch = !examFilter || examFilter === "all" || row.exam_id === examFilter;
			const gradeMatch = row.grade_level === Number(gradeFilter);
			const classMatch = !classFilter || classFilter === "all" || row.class_id === classFilter;
			return subjectMatch && examMatch && gradeMatch && classMatch;
		}) : [];

		const filteredStudentAverages = studentAverages(filteredRows);
		const averageMark = Math.round(average(filteredStudentAverages.map((row) => row.average)));
		const passRate = filteredStudentAverages.length
			? Math.round((filteredStudentAverages.filter((row) => row.average >= 40).length / filteredStudentAverages.length) * 100)
			: 0;

		const gradeDistribution = gradeScaleForLevels(
			filteredRows.map((row) => row.grade_level),
		).map((grade) => ({
			grade,
			value: filteredRows.filter((row) => row.grade === grade).length,
		}));

		const subjectGroups = new Map<string, { subject: string; marks: number[]; students: Set<string> }>();
		for (const row of filteredRows) {
			if (!row.subject_id) continue;
			const group = subjectGroups.get(row.subject_id) ?? {
				subject: row.subject_name,
				marks: [],
				students: new Set<string>(),
			};
			group.marks.push(row.total);
			group.students.add(row.student_id);
			subjectGroups.set(row.subject_id, group);
		}

		const subjectPerformance = Array.from(subjectGroups.entries())
			.map(([subject_id, group]) => ({
				subject_id,
				subject: group.subject,
				average: group.marks.length ? Math.round(group.marks.reduce((sum, mark) => sum + mark, 0) / group.marks.length) : 0,
				students: group.students.size,
			}))
			.sort((a, b) => b.average - a.average);

		const classGroups = new Map<string, { className: string; gradeLevel: number; rows: typeof filteredRows }>();
		for (const row of filteredRows) {
			if (!row.class_id) continue;
			const group = classGroups.get(row.class_id) ?? {
				className: row.class_name,
				gradeLevel: row.grade_level,
				rows: [],
			};
			group.rows.push(row);
			classGroups.set(row.class_id, group);
		}

		const classPerformance = Array.from(classGroups.entries())
			.map(([class_id, group]) => {
				const averages = studentAverages(group.rows);
				return {
					class_id,
					className: group.className,
					gradeLevel: group.gradeLevel,
					classTeacherName: classTeacherByClassId.get(class_id) ?? "-",
					average: Math.round(average(averages.map((row) => row.average))),
					results: averages.length,
				};
			})
			.sort((a, b) => a.gradeLevel - b.gradeLevel || a.className.localeCompare(b.className));

		const trendScopedRows = hasSelectedGrade ? allRows.filter((row) => {
			const subjectMatch = !subjectFilter || subjectFilter === "all" || row.subject_id === subjectFilter;
			const gradeMatch = row.grade_level === Number(gradeFilter);
			const classMatch = !classFilter || classFilter === "all" || row.class_id === classFilter;
			return subjectMatch && gradeMatch && classMatch;
		}) : [];
		const trend = approvedExams.map(([examId, exam]) => {
			const examStudentAverages = studentAverages(trendScopedRows.filter((row) => row.exam_id === examId));
			return {
				exam: exam.name,
				year: exam.year,
				average: Math.round(average(examStudentAverages.map((row) => row.average))),
			};
		});

		return NextResponse.json({
			data: {
				schoolStats: {
					totalStudents: ((students ?? []) as StudentRow[]).filter((student) => toId(student.student_id)).length,
					totalTeachers: ((teachers ?? []) as TeacherRow[]).filter((teacher) => toId(teacher.teacher_id)).length,
					totalCommunity:
						((students ?? []) as StudentRow[]).filter((student) => toId(student.student_id)).length +
						((teachers ?? []) as TeacherRow[]).filter((teacher) => toId(teacher.teacher_id)).length,
				},
				summary: {
					totalStudents: new Set(filteredRows.map((row) => row.student_id).filter(Boolean)).size,
					totalResults: filteredRows.length,
					averageMark,
					passRate,
					subjectsCovered: new Set(filteredRows.map((row) => row.subject_id).filter(Boolean)).size,
				},
				gradeDistribution,
				subjectPerformance,
				classPerformance,
				trend,
				filterOptions: {
					subjects: ((subjects ?? []) as SubjectRow[])
						.map((row) => ({ id: toId(row.subject_id), name: toId(row.subject_name) }))
						.filter((row) => row.id),
					exams: approvedExams.map(([id, exam]) => ({ id, name: exam.name, year: exam.year })),
					grades: Array.from(new Set(((classes ?? []) as ClassRow[]).map((row) => toNumber(row.grade)).filter(Boolean))).sort((a, b) => a - b),
					classes: ((classes ?? []) as ClassRow[]).map((row) => ({
						id: toId(row.class_id),
						name: toId(row.class_name),
						grade: toNumber(row.grade),
					})),
				},
			},
		});
	} catch (err) {
		console.error("GET principal dashboard FAILED:", err);
		return NextResponse.json({ message: "Ralat pelayan", data: null }, { status: 500 });
	}
}
