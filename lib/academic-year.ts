export function getActiveAcademicYearFromValues(values: unknown[]) {
  const years = values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a, "ms", { numeric: true }));

  return years[0] ?? String(new Date().getFullYear());
}

export function filterByActiveAcademicYear<T>(
  rows: T[],
  getYear: (row: T) => unknown,
) {
  const activeYear = getActiveAcademicYearFromValues(rows.map(getYear));
  return rows.filter((row) => String(getYear(row) ?? "").trim() === activeYear);
}
