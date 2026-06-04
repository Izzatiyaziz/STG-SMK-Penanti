function normalizeSubjectName(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isUpperFormOnlySubject(subjectName: unknown) {
  const name = normalizeSubjectName(subjectName);
  if (!name) return false;

  return (
    /\bbiologi\b/.test(name) ||
    /\bbio\b/.test(name) ||
    /\bkimia\b/.test(name) ||
    /\bfizik\b/.test(name) ||
    /\bperniagaan\b/.test(name) ||
    /\bakaun\b/.test(name) ||
    /\bperakaunan\b/.test(name) ||
    /\baddmath\b/.test(name) ||
    name.includes("pendidikan seni") ||
    name.includes("seni visual") ||
    name.includes("matematik tambahan") ||
    name.includes("additional mathematics")
  );
}

export function isLowerFormOnlySubject(subjectName: unknown) {
  const name = normalizeSubjectName(subjectName);
  if (!name) return false;

  return (
    name === "geografi" ||
    name === "geography" ||
    name === "reka bentuk dan teknologi" ||
    name === "rbt" ||
    name === "design and technology"
  );
}

export function isAllowedClassForSubject(subjectName: unknown, grade: unknown) {
  const gradeNumber = Number(grade);
  if (!Number.isFinite(gradeNumber)) return true;

  if (isLowerFormOnlySubject(subjectName)) return gradeNumber >= 1 && gradeNumber <= 3;
  if (isUpperFormOnlySubject(subjectName)) return gradeNumber >= 4 && gradeNumber <= 5;
  return true;
}
