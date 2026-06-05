export function gradeFromTotal(total: number): string {
    if (total >= 80) return "A";
    if (total >= 65) return "B";
    if (total >= 50) return "C";
    if (total >= 40) return "D";
    return "E";
}
