export const LOWER_SECONDARY_GRADES = ["A", "B", "C", "D", "E", "F"] as const;
export const UPPER_SECONDARY_GRADES = ["A+", "A", "A-", "B+", "B", "C+", "C", "D", "E", "G"] as const;

export function gradeScaleForLevels(levels: Array<number | null | undefined>): string[] {
    const hasLower = levels.some((level) => Number(level ?? 0) < 4);
    const hasUpper = levels.some((level) => Number(level ?? 0) >= 4);
    if (hasLower && hasUpper) {
        return Array.from(new Set([...UPPER_SECONDARY_GRADES, ...LOWER_SECONDARY_GRADES]));
    }
    return hasUpper ? [...UPPER_SECONDARY_GRADES] : [...LOWER_SECONDARY_GRADES];
}

export function gradeFromTotal(total: number, level?: number | null): string {
    const mark = Math.max(0, Math.min(100, Number.isFinite(total) ? total : 0));

    if (Number(level ?? 0) >= 4) {
        if (mark >= 90) return "A+";
        if (mark >= 80) return "A";
        if (mark >= 75) return "A-";
        if (mark >= 70) return "B+";
        if (mark >= 65) return "B";
        if (mark >= 60) return "C+";
        if (mark >= 50) return "C";
        if (mark >= 45) return "D";
        if (mark >= 40) return "E";
        return "G";
    }

    if (mark >= 85) return "A";
    if (mark >= 70) return "B";
    if (mark >= 60) return "C";
    if (mark >= 50) return "D";
    if (mark >= 40) return "E";
    return "F";
}
