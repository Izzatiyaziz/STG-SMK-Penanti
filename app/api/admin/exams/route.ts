import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import supabaseAdmin from "@/lib/supabase-admin";
import { requireApiRole } from "@/lib/auth";
import { filterByActiveAcademicYear } from "@/lib/academic-year";

export const runtime = "nodejs";

type ExamRow = {
  exam_id: string;
  exam_name: string;
  academic_year: string;
  subject_settings?: unknown;
};

type OmrScanRow = {
  omr_scan_id?: unknown;
};

// ================= GET EXAMS =================
export async function GET() {
  try {
    const guard = await requireApiRole(["admin", "teacher"]);
    if ("response" in guard) return guard.response;

    const { data, error } = await supabase
      .from("stg_exams")
      .select("*")
      .order("academic_year", { ascending: false })
      .order("exam_name", { ascending: true });

    if (error) {
      console.error("EXAM FETCH ERROR:", error);
      return NextResponse.json([], { status: 200 });
    }

    const rows = (data ?? []) as ExamRow[];
    const visibleRows =
      guard.session.userType === "teacher"
        ? filterByActiveAcademicYear(rows, (exam) => exam.academic_year)
        : rows;

    const exams = visibleRows.map((e) => ({
      id: e.exam_id,
      name: e.exam_name,
      academic_year: e.academic_year,
      subject_settings: e.subject_settings ?? {},
    }));

    return NextResponse.json(exams);
  } catch (error) {
    console.error("FETCH EXAMS ERROR:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// ================= ADD EXAM =================
export async function POST(req: Request) {
  try {
    const guard = await requireApiRole("admin");
    if ("response" in guard) return guard.response;

    const body = await req.json();
    const { exam_name, academic_year } = body;

    if (!exam_name || !academic_year) {
      return NextResponse.json(
        { message: "Nama peperiksaan dan tahun akademik diperlukan" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("stg_exams")
      .insert({ exam_name, academic_year });

    if (error) {
      console.error("ADD EXAM ERROR:", error);

      if (error.code === "23505") {
        return NextResponse.json(
          { message: "Exam already exists for this academic year" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Exam added successfully" },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { message: "Ralat pelayan" },
      { status: 500 }
    );
  }
}

// ================= UPDATE EXAM =================
export async function PUT(req: Request) {
  try {
    const guard = await requireApiRole("admin");
    if ("response" in guard) return guard.response;

    const body = await req.json();
    const { exam_id, exam_name, academic_year, subject_settings } = body;

    if (!exam_id) {
      return NextResponse.json(
        { message: "Exam ID diperlukan" },
        { status: 400 }
      );
    }

    // Update settings only
    if (subject_settings !== undefined) {
      const { error } = await supabase
        .from("stg_exams")
        .update({ subject_settings })
        .eq("exam_id", exam_id);

      if (error) {
        console.error("UPDATE EXAM SETTINGS ERROR:", error);
        return NextResponse.json(
          {
            message:
              error.message ||
              "Gagal mengemas kini settings peperiksaan. Pastikan kolum `subject_settings` wujud di `stg_exams`.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: "Settings peperiksaan berjaya dikemas kini" });
    }

    if (!exam_name || !academic_year) {
      return NextResponse.json(
        { message: "Nama peperiksaan dan tahun akademik diperlukan" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("stg_exams")
      .update({ exam_name, academic_year })
      .eq("exam_id", exam_id);

    if (error) {
      console.error("UPDATE EXAM ERROR:", error);
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Exam updated successfully" });
  } catch {
    return NextResponse.json(
      { message: "Ralat pelayan" },
      { status: 500 }
    );
  }
}

// ================= DELETE EXAM =================
export async function DELETE(req: Request) {
  try {
    const guard = await requireApiRole("admin");
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const exam_id = searchParams.get("id");

    if (!exam_id) {
      return NextResponse.json(
        { message: "ID peperiksaan diperlukan" },
        { status: 400 }
      );
    }

    const [
      { count: reportCardCount },
      { count: resultCount },
      { count: subjectiveCount },
      { count: omrScanCount },
      { count: answerSchemeCount },
      { data: omrScans, error: omrScanFetchErr },
    ] = await Promise.all([
      supabaseAdmin
        .from("stg_report_cards")
        .select("report_card_id", { count: "exact", head: true })
        .eq("exam_id", exam_id),
      supabaseAdmin
        .from("stg_results")
        .select("result_id", { count: "exact", head: true })
        .eq("exam_id", exam_id),
      supabaseAdmin
        .from("stg_subjective_marks")
        .select("subjective_id", { count: "exact", head: true })
        .eq("exam_id", exam_id),
      supabaseAdmin
        .from("stg_omr_scans")
        .select("omr_scan_id", { count: "exact", head: true })
        .eq("exam_id", exam_id),
      supabaseAdmin
        .from("stg_answer_schema")
        .select("schema_id", { count: "exact", head: true })
        .eq("exam_id", exam_id),
      supabaseAdmin
        .from("stg_omr_scans")
        .select("omr_scan_id")
        .eq("exam_id", exam_id),
    ]);

    if (omrScanFetchErr) {
      console.error("FETCH OMR SCANS BEFORE EXAM DELETE ERROR:", omrScanFetchErr);
      return NextResponse.json(
        { message: omrScanFetchErr.message },
        { status: 500 }
      );
    }

    const omrScanIds = ((omrScans ?? []) as OmrScanRow[])
      .map((scan) => String(scan.omr_scan_id ?? "").trim())
      .filter(Boolean);

    if (omrScanIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("stg_omr_scan_answers")
        .delete()
        .in("omr_scan_id", omrScanIds);

      if (error) {
        console.error("DELETE OMR SCAN ANSWERS ERROR:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
      }
    }

    const relatedDeletes = [
      supabaseAdmin.from("stg_report_cards").delete().eq("exam_id", exam_id),
      supabaseAdmin.from("stg_results").delete().eq("exam_id", exam_id),
      supabaseAdmin.from("stg_omr_scans").delete().eq("exam_id", exam_id),
      supabaseAdmin.from("stg_subjective_marks").delete().eq("exam_id", exam_id),
      supabaseAdmin.from("stg_answer_schema").delete().eq("exam_id", exam_id),
    ];

    for (const deleteQuery of relatedDeletes) {
      const { error } = await deleteQuery;
      if (error) {
        console.error("DELETE RELATED EXAM DATA ERROR:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
      }
    }

    const { error } = await supabaseAdmin
      .from("stg_exams")
      .delete()
      .eq("exam_id", exam_id);

    if (error) {
      console.error("DELETE EXAM ERROR:", error);
      if (error.code === "23503") {
        return NextResponse.json(
          {
            message:
              "Peperiksaan ini tidak boleh dipadam kerana masih digunakan oleh data lain dalam sistem.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Peperiksaan dan data berkaitan berjaya dipadam",
      deleted: {
        report_cards: reportCardCount ?? 0,
        results: resultCount ?? 0,
        subjective_marks: subjectiveCount ?? 0,
        omr_scans: omrScanCount ?? 0,
        answer_schemes: answerSchemeCount ?? 0,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Ralat pelayan" },
      { status: 500 }
    );
  }
}
