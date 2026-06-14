type ExamSortValue = {
	name: string;
	year: string;
};

type DeadlineAssignment = {
	subject_id: string;
	grade: number | null;
};

type DeadlineExam = {
	subject_settings?: Record<string, unknown>;
};

export function isMarkingClosedForAssignment(
	exam: DeadlineExam,
	assignment: DeadlineAssignment,
) {
	const subjectSetting = exam.subject_settings?.[assignment.subject_id];
	if (!subjectSetting || typeof subjectSetting !== "object") return false;
	const record = subjectSetting as Record<string, unknown>;
	const closed =
		record.marking_closed && typeof record.marking_closed === "object"
			? (record.marking_closed as Record<string, unknown>)
			: {};
	const grade = Number(assignment.grade ?? 0);
	const gradeKey = grade > 0 ? `tingkatan-${grade}` : "";
	if (gradeKey && Object.prototype.hasOwnProperty.call(closed, gradeKey)) {
		return closed[gradeKey] === true;
	}
	const group = grade >= 4 ? "upper" : "lower";
	return closed[group] === true;
}

export function hasOpenMarkingForAssignments(
	exam: DeadlineExam,
	assignments: DeadlineAssignment[],
) {
	return assignments.some(
		(assignment) =>
			hasConfiguredDeadlineForAssignments(exam, [assignment]) &&
			!isMarkingClosedForAssignment(exam, assignment),
	);
}

function toDeadline(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

export function hasConfiguredDeadlineForAssignments(
	exam: DeadlineExam,
	assignments: DeadlineAssignment[],
) {
	const settings = exam.subject_settings ?? {};

	return assignments.some((assignment) => {
		const subjectSetting = settings[assignment.subject_id];
		if (!subjectSetting || typeof subjectSetting !== "object") return false;

		const record = subjectSetting as Record<string, unknown>;
		const deadlines =
			record.deadlines && typeof record.deadlines === "object"
				? (record.deadlines as Record<string, unknown>)
				: {};
		const group = Number(assignment.grade ?? 0) >= 4 ? "upper" : "lower";

		return Boolean(toDeadline(deadlines[group]) || toDeadline(record.deadline));
	});
}

function examSequence(name: string) {
	const normalized = name.trim().toLocaleLowerCase("ms");

	if (normalized.includes("pertengahan") || normalized.includes("upsa") || normalized.includes("mid")) {
		return 0;
	}

	if (normalized.includes("akhir") || normalized.includes("uasa") || normalized.includes("final")) {
		return 2;
	}

	return 1;
}

export function compareExamsChronologically(a: ExamSortValue, b: ExamSortValue) {
	const yearCompare = a.year.localeCompare(b.year, "ms", { numeric: true });
	if (yearCompare !== 0) return yearCompare;

	const sequenceCompare = examSequence(a.name) - examSequence(b.name);
	if (sequenceCompare !== 0) return sequenceCompare;

	return a.name.localeCompare(b.name, "ms", { sensitivity: "base", numeric: true });
}
