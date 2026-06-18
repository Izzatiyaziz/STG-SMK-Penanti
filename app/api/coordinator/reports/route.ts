import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";
import { isAllowedClassForSubject } from "@/lib/subject-rules";
import { gradeFromTotal, gradeScaleForLevels } from "@/lib/grade-utils";
import { compareExamsChronologically } from "@/lib/exam-utils";

export const runtime = "nodejs";

type SubjectRow = { subject_id?: unknown; subject_name?: unknown };
type ResultRow = {
	result_id?: unknown;
	student_id?: unknown;
	exam_id?: unknown;
	total?: unknown;
	grade?: unknown;
	status?: unknown;
};
type AssignmentRow = { class_id?: unknown };
type StudentRow = { student_id?: unknown; fullname?: unknown; class_id?: unknown };
type ClassRow = { class_id?: unknown; class_name?: unknown; grade?: unknown };
type ExamRow = { exam_id?: unknown; exam_name?: unknown; academic_year?: unknown };

function toId(value: unknown) {
	return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function toNumber(value: unknown) {
	const n = typeof value === "number" ? value : Number(value);
	return Number.isFinite(n) ? n : 0;
}

function isHiddenCoordinatorExam(exam: ExamRow) {
	return (
		toId(exam.academic_year) === "2025" &&
		toId(exam.exam_name).toLowerCase() === "peperiksaan akhir tahun"
	);
}

function normalizeGrade(value: unknown, total: number, level: number) {
	const grade = toId(value).toUpperCase();
	const allowed = level >= 4
		? ["A+", "A", "A-", "B+", "B", "C+", "C", "D", "E", "G"]
		: ["A", "B", "C", "D", "E", "F"];
	return allowed.includes(grade) ? grade : gradeFromTotal(total, level);
}

async function getCoordinatorSubjectIds(teacherId: string) {
	const { data, error } = await supabase
		.from("stg_subject_coordinators")
		.select("subject_id")
		.eq("teacher_id", teacherId);

	if (error) return [];
	return (data ?? []).map((row: { subject_id?: unknown }) => toId(row.subject_id)).filter(Boolean);
}

export async function GET(req: Request) {
	try {
		const guard = await requireApiRole("subject coordinator");
		if ("response" in guard) return guard.response;

		const { searchParams } = new URL(req.url);
		const teacherId = toId(searchParams.get("teacher_id"));
		const gradeFilter = toId(searchParams.get("grade"));
		const classIdFilter = toId(searchParams.get("class_id"));
		const examIdFilter = toId(searchParams.get("exam_id"));
		if (!teacherId || teacherId !== guard.session.user_id) {
			return NextResponse.json({ message: "Akses ditolak" }, { status: 403 });
		}

		const coordinatorSubjectIds = await getCoordinatorSubjectIds(teacherId);
		if (coordinatorSubjectIds.length === 0) {
			return NextResponse.json({ message: "Tiada subjek seliaan", data: null }, { status: 404 });
		}

		const { data: subjects } = await supabase
			.from("stg_subjects")
			.select("subject_id, subject_name")
			.in("subject_id", coordinatorSubjectIds);

		const subjectList = (subjects ?? []) as SubjectRow[];
		const mathSubject =
			subjectList.find((subject) => {
				const name = toId(subject.subject_name).toLowerCase();
				return name.includes("math") || name.includes("matematik");
			}) ?? subjectList[0];

		const subjectId = toId(mathSubject?.subject_id);
		const subjectName = toId(mathSubject?.subject_name);

		if (!subjectId) {
			return NextResponse.json({ message: "Subjek seliaan tidak dijumpai", data: null }, { status: 404 });
		}

		const [{ data: results, error: resultErr }, { data: assignments }] =
			await Promise.all([
				supabase
					.from("stg_results")
					.select("result_id, student_id, exam_id, total, grade, status")
					.eq("subject_id", subjectId)
					.eq("status", "approved")
					.not("total", "is", null),
				supabase
					.from("stg_teacher_subject")
					.select("class_id")
					.eq("subject_id", subjectId),
			]);

		if (resultErr) {
			return NextResponse.json({ message: resultErr.message, data: null }, { status: 500 });
		}

		const resultRows = (results ?? []) as ResultRow[];
		const assignedClassIds = Array.from(
			new Set(((assignments ?? []) as AssignmentRow[]).map((row) => toId(row.class_id)).filter(Boolean)),
		);
		const studentIds = Array.from(new Set(resultRows.map((row) => toId(row.student_id)).filter(Boolean)));
		const examIds = Array.from(new Set(resultRows.map((row) => toId(row.exam_id)).filter(Boolean)));

		const [{ data: students }, { data: classes }, { data: exams }] = await Promise.all([
			studentIds.length
				? supabase.from("stg_students").select("student_id, fullname, class_id").in("student_id", studentIds)
				: { data: [] as StudentRow[] },
			supabase.from("stg_classes").select("class_id, class_name, grade"),
			examIds.length
				? supabase.from("stg_exams").select("exam_id, exam_name, academic_year").in("exam_id", examIds)
				: { data: [] as ExamRow[] },
		]);

		const studentById = new Map<string, { name: string; classId: string }>();
		for (const student of (students ?? []) as StudentRow[]) {
			const id = toId(student.student_id);
			if (!id) continue;
			studentById.set(id, {
				name: toId(student.fullname) || id,
				classId: toId(student.class_id),
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

		const examById = new Map<string, { name: string; year: string }>();
		for (const exam of (exams ?? []) as ExamRow[]) {
			const id = toId(exam.exam_id);
			if (!id) continue;
			if (isHiddenCoordinatorExam(exam)) continue;
			examById.set(id, {
				name: toId(exam.exam_name) || id,
				year: toId(exam.academic_year),
			});
		}

		const studentPerformanceAll = resultRows.filter((row) => examById.has(toId(row.exam_id))).map((row) => {
			const studentId = toId(row.student_id);
			const total = toNumber(row.total);
			const student = studentById.get(studentId);
			const classInfo = student?.classId ? classById.get(student.classId) : null;
			return {
				result_id: toId(row.result_id),
				student_id: studentId,
				exam_id: toId(row.exam_id),
				name: student?.name ?? studentId,
				class_id: student?.classId ?? "",
				className: classInfo?.name ?? "-",
				gradeLevel: classInfo?.grade ?? 0,
				mark: total,
				grade: normalizeGrade(row.grade, total, classInfo?.grade ?? 0),
				status: toId(row.status),
			};
		});

		const assignedClassOptions = assignedClassIds
			.map((classId) => {
				const classInfo = classById.get(classId);
				if (!classInfo) return null;
				if (!isAllowedClassForSubject(subjectName, classInfo.grade)) return null;
				return { id: classId, name: classInfo.name, grade: classInfo.grade };
			})
			.filter((row): row is { id: string; name: string; grade: number } => Boolean(row))
			.sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));

		const filterOptions = {
			grades: Array.from(
				new Set([
					...studentPerformanceAll.map((row) => row.gradeLevel).filter(Boolean),
					...assignedClassOptions.map((row) => row.grade).filter(Boolean),
				]),
			).sort((a, b) => a - b),
			classes: assignedClassOptions.length > 0 ? assignedClassOptions : Array.from(
				new Map(
					studentPerformanceAll
						.filter((row) => row.class_id)
						.map((row) => [
							row.class_id,
							{
								id: row.class_id,
								name: row.className,
								grade: row.gradeLevel,
							},
						]),
				).values(),
			).sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name)),
			exams: Array.from(examById.entries())
				.map(([id, exam]) => ({ id, name: exam.name, year: exam.year }))
				.sort((a, b) => a.name.localeCompare(b.name)),
		};

		const studentPerformance = studentPerformanceAll.filter((row) => {
			const gradeMatch = !gradeFilter || gradeFilter === "all" || row.gradeLevel === Number(gradeFilter);
			const classMatch = !classIdFilter || classIdFilter === "all" || row.class_id === classIdFilter;
			const examMatch = !examIdFilter || examIdFilter === "all" || row.exam_id === examIdFilter;
			return gradeMatch && classMatch && examMatch;
		});
		const trendResultIds = new Set(
			studentPerformanceAll
				.filter((row) => {
					const gradeMatch = !gradeFilter || gradeFilter === "all" || row.gradeLevel === Number(gradeFilter);
					const classMatch = !classIdFilter || classIdFilter === "all" || row.class_id === classIdFilter;
					return gradeMatch && classMatch;
				})
				.map((row) => row.result_id),
		);

		const marks = studentPerformance.map((row) => row.mark);
		const totalStudents = new Set(studentPerformance.map((row) => row.student_id)).size;
		const averageMark = marks.length
			? Math.round(marks.reduce((sum, mark) => sum + mark, 0) / marks.length)
			: 0;
		const highestMark = marks.length ? Math.max(...marks) : 0;
		const lowestMark = marks.length ? Math.min(...marks) : 0;
		const passCount = studentPerformance.filter((row) => row.mark >= 40).length;
		const passRate = studentPerformance.length
			? Math.round((passCount / studentPerformance.length) * 100)
			: 0;

		const gradeDistribution = gradeScaleForLevels(
			studentPerformance.map((row) => row.gradeLevel),
		).map((grade) => ({
			grade,
			value: studentPerformance.filter((row) => row.grade === grade).length,
		}));

		const classGroups = new Map<string, { className: string; gradeLevel: number; marks: number[] }>();
		for (const row of studentPerformance) {
			const classId = toId(row.class_id);
			if (!classId) continue;
			const existing = classGroups.get(classId);
			if (!existing) {
				classGroups.set(classId, {
					className: row.className,
					gradeLevel: row.gradeLevel,
					marks: [row.mark],
				});
				continue;
			}
			existing.marks.push(row.mark);
		}

		const performanceByClass = new Map(
			Array.from(classGroups.entries()).map(([classId, group]) => [
				classId,
				{
					class_id: classId,
					className: group.className,
					gradeLevel: group.gradeLevel,
					average: group.marks.length
						? Math.round(group.marks.reduce((sum, mark) => sum + mark, 0) / group.marks.length)
						: 0,
					students: group.marks.length,
				},
			]),
		);
		const classPerformanceBase = filterOptions.classes.filter((classItem) => {
			const gradeMatch = !gradeFilter || gradeFilter === "all" || classItem.grade === Number(gradeFilter);
			const classMatch = !classIdFilter || classIdFilter === "all" || classItem.id === classIdFilter;
			return gradeMatch && classMatch;
		});
		const classPerformance = classPerformanceBase.length > 0
			? classPerformanceBase.map((classItem) => (
				performanceByClass.get(classItem.id) ?? {
					class_id: classItem.id,
					className: classItem.name,
					gradeLevel: classItem.grade,
					average: 0,
					students: 0,
				}
			))
			: Array.from(performanceByClass.values());

		const trend = Array.from(examById.entries())
			.map(([examId, exam]) => {
				const examMarks = resultRows
					.filter((row) => toId(row.exam_id) === examId && trendResultIds.has(toId(row.result_id)))
					.map((row) => toNumber(row.total));
				return {
					exam: exam.name,
					average: examMarks.length
						? Math.round(examMarks.reduce((sum, mark) => sum + mark, 0) / examMarks.length)
						: 0,
					year: exam.year,
				};
			})
			.sort((a, b) =>
				compareExamsChronologically(
					{ name: a.exam, year: a.year },
					{ name: b.exam, year: b.year },
				),
			);

		const topStudents = [...studentPerformance]
			.sort((a, b) => b.mark - a.mark)
			.slice(0, 20);
		const weakStudents = [...studentPerformance]
			.sort((a, b) => a.mark - b.mark);

		return NextResponse.json({
			data: {
				subject: { id: subjectId, name: subjectName },
				summary: {
					totalStudents,
					averageMark,
					highestMark,
					lowestMark,
					passRate,
				},
				gradeDistribution,
				classPerformance,
				topStudents,
				weakStudents,
				trend,
				filterOptions,
			},
		});
	} catch (err) {
		console.error("GET coordinator reports FAILED:", err);
		return NextResponse.json({ message: "Ralat pelayan", data: null }, { status: 500 });
	}
}
