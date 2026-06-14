import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SCHOOL_NAME = "SMK PENANTI";
const PRIMARY_COLOR: [number, number, number] = [67, 97, 238]; // indigo-blue
const HEADER_TEXT: [number, number, number] = [255, 255, 255];
const ALT_ROW: [number, number, number] = [246, 248, 255];
const BORDER: [number, number, number] = [210, 215, 230];

function addDocHeader(doc: jsPDF, title: string, subtitle?: string) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 40);
    doc.text(SCHOOL_NAME, 14, 18);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(title, 14, 26);

    if (subtitle) {
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 110, 130);
        doc.text(subtitle, 14, 32);
    }

    const now = new Date().toLocaleString("ms-MY", {
        timeZone: "Asia/Kuala_Lumpur",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(140, 150, 165);
    doc.text(`Dijana: ${now}`, doc.internal.pageSize.width - 14, 18, { align: "right" });

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.4);
    doc.line(14, 35, doc.internal.pageSize.width - 14, 35);
}

type Column = { header: string; dataKey: string };

export type ExportTableColumn = {
    header: string;
    dataKey: string;
};

type ExportTableOptions = {
    title: string;
    subtitle?: string;
    columns: ExportTableColumn[];
    rows: Record<string, string | number>[];
    fileName: string;
    orientation?: "portrait" | "landscape";
};

export function exportTablePDF({
    title,
    subtitle,
    columns,
    rows,
    fileName,
    orientation = "landscape",
}: ExportTableOptions) {
    const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(20, 20, 40);
    doc.text(title, 14, 16);

    let startY = 22;
    if (subtitle) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(80, 90, 110);
        const subtitleLines = doc.splitTextToSize(subtitle, doc.internal.pageSize.width - 28);
        doc.text(subtitleLines, 14, 23);
        startY = 27 + subtitleLines.length * 4;
    }

    autoTable(doc, {
        startY,
        columns,
        body: rows,
        theme: "striped",
        styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 3,
            textColor: [35, 40, 55],
            overflow: "linebreak",
        },
        headStyles: {
            fillColor: [59, 130, 246],
            textColor: [255, 255, 255],
            fontStyle: "bold",
        },
        alternateRowStyles: {
            fillColor: [242, 242, 242],
        },
        columnStyles: {
            0: { halign: "center", cellWidth: 12 },
        },
    });

    const pdfFileName = fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    doc.save(pdfFileName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-"));
}

function buildTable(
    doc: jsPDF,
    columns: Column[],
    rows: Record<string, string>[],
    startY = 40,
) {
    autoTable(doc, {
        startY,
        columns,
        body: rows,
        theme: "grid",
        styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
            lineColor: BORDER,
            lineWidth: 0.3,
            textColor: [30, 35, 50],
            overflow: "linebreak",
        },
        headStyles: {
            fillColor: PRIMARY_COLOR,
            textColor: HEADER_TEXT,
            fontStyle: "bold",
            fontSize: 9,
            halign: "left",
        },
        alternateRowStyles: {
            fillColor: ALT_ROW,
        },
        columnStyles: {
            0: { halign: "center", cellWidth: 12 },
        },
        didDrawPage: (data) => {
            const pageCount = (doc as jsPDF & { internal: { getNumberOfPages: () => number } })
                .internal.getNumberOfPages();
            const currentPage = data.pageNumber;
            doc.setFontSize(7.5);
            doc.setTextColor(160, 165, 175);
            doc.text(
                `Muka surat ${currentPage} daripada ${pageCount}`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 8,
                { align: "center" },
            );
        },
    });
}

/* ============================================================
   TEACHER EXPORT
   ============================================================ */

type TeacherRow = {
    id: string;
    name: string;
    identifier: string;
    roles: string[];
    email?: string;
};

function formatRole(role: string): string {
    switch (role.toLowerCase().trim()) {
        case "class teacher": return "Guru Kelas";
        case "subject teacher": return "Guru Subjek";
        case "subject coordinator": return "Panitia Subjek";
        case "principal": return "Pengetua";
        default: return role;
    }
}

export function exportTeachersPDF(
    teachers: TeacherRow[],
    filterLabel?: string,
) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const subtitle = filterLabel
        ? `Penapis: ${filterLabel} — ${teachers.length} rekod`
        : `Jumlah: ${teachers.length} guru`;

    addDocHeader(doc, "SENARAI GURU", subtitle);

    const columns: Column[] = [
        { header: "Bil.", dataKey: "no" },
        { header: "Nama Guru", dataKey: "name" },
        { header: "No. Staff", dataKey: "identifier" },
        { header: "E-mel", dataKey: "email" },
        { header: "Jawatan", dataKey: "roles" },
    ];

    const rows = teachers.map((t, i) => ({
        no: String(i + 1),
        name: t.name.toUpperCase(),
        identifier: t.identifier,
        email: t.email || "—",
        roles: t.roles.map(formatRole).join(", ") || "—",
    }));

    buildTable(doc, columns, rows);

    doc.save(`senarai-guru-${Date.now()}.pdf`);
}

/* ============================================================
   STUDENT EXPORT
   ============================================================ */

type StudentRow = {
    id: string;
    name: string;
    identifier: string;
    className: string;
    level: string | null;
    enrollment_date: string | null;
};

function formatDateShort(value: string | null): string {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleDateString("ms-MY", {
            timeZone: "Asia/Kuala_Lumpur",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    } catch {
        return value;
    }
}

export function exportStudentsPDF(
    students: StudentRow[],
    filterLabel?: string,
) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const subtitle = filterLabel
        ? `Penapis: ${filterLabel} — ${students.length} rekod`
        : `Jumlah: ${students.length} pelajar`;

    addDocHeader(doc, "SENARAI PELAJAR", subtitle);

    const columns: Column[] = [
        { header: "Bil.", dataKey: "no" },
        { header: "Nama Pelajar", dataKey: "name" },
        { header: "No. Kad Pengenalan", dataKey: "identifier" },
        { header: "Tingkatan", dataKey: "level" },
        { header: "Kelas", dataKey: "className" },
        { header: "Tarikh Daftar", dataKey: "enrollment_date" },
    ];

    const rows = students.map((s, i) => ({
        no: String(i + 1),
        name: s.name,
        identifier: s.identifier,
        level: s.level ? `Tingkatan ${s.level}` : "—",
        className: s.className || "Belum Tetap",
        enrollment_date: formatDateShort(s.enrollment_date),
    }));

    buildTable(doc, columns, rows);

    doc.save(`senarai-pelajar-${Date.now()}.pdf`);
}
