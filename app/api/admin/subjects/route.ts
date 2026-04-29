import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";
export async function GET() {
	try {
		const guard = await requireApiRole("admin");
		if ("response" in guard) return guard.response;

		// 1️⃣ Fetch subjects
		const { data: subjects, error: subjectError } = await supabase
			.from("stg_subjects")
			.select("subject_id, subject_name")
			.order("subject_name", { ascending: true });

		if (subjectError) {
			console.error("SUBJECT FETCH ERROR:", subjectError);
			return NextResponse.json([], { status: 200 });
		}

		// 2️⃣ Fetch subject coordinators
		const { data: coordinators, error: coordError } = await supabase
			.from("stg_subject_coordinators")
			.select("subject_id, teacher_id");

		if (coordError) {
			console.error("COORDINATOR FETCH ERROR:", coordError);
			return NextResponse.json([], { status: 200 });
		}

		// 3️⃣ Fetch teachers
		const { data: teachers, error: teacherError } = await supabase
			.from("stg_teachers")
			.select("teacher_id, fullname");

		if (teacherError) {
			console.error("TEACHER FETCH ERROR:", teacherError);
			return NextResponse.json([], { status: 200 });
		}

		// 4️⃣ Build lookup maps (FAST + CLEAN)
		const coordinatorBySubject = new Map<string, { teacher_id: string }>();

		coordinators?.forEach((c: any) => {
			coordinatorBySubject.set(c.subject_id, c);
		});

		const teacherById = new Map<string, any>();
		teachers?.forEach((t: any) => {
			teacherById.set(t.teacher_id, t);
		});

		// 5️⃣ Merge everything
		const result = (subjects ?? []).map((s: any) => {
			const coordinator = coordinatorBySubject.get(s.subject_id);
			const teacher = coordinator ? teacherById.get(coordinator.teacher_id) : null;

			return {
				id: s.subject_id,
				name: s.subject_name,
				coordinator: teacher
					? {
							id: teacher.teacher_id,
							name: teacher.fullname,
						}
					: null,
			};
		});

		return NextResponse.json(result);
	} catch (err) {
		console.error("FETCH SUBJECTS ERROR:", err);
		return NextResponse.json([], { status: 200 });
	}
}

export async function POST(req: Request) {
	try {
		const guard = await requireApiRole("admin");
		if ("response" in guard) return guard.response;

		const body = await req.json();
		const { subject_name } = body;

		if (!subject_name) {
			return NextResponse.json(
				{ message: "Nama subject diperlukan" },
				{ status: 400 },
			);
		}

		const { error } = await supabase
			.from("stg_subjects")
			.insert({ subject_name });

		if (error) {
			console.error("ADD SUBJECT ERROR:", error);

			if (error.code === "23505") {
				return NextResponse.json({ message: "Subjek sudah ada" }, { status: 409 });
			}

			return NextResponse.json({ message: error.message }, { status: 500 });
		}

		return NextResponse.json(
			{ message: "Subjek berjaya ditambah" },
			{ status: 201 },
		);
	} catch {
		return NextResponse.json({ message: "Server error" }, { status: 500 });
	}
}

export async function PUT(req: Request) {
	try {
		const guard = await requireApiRole("admin");
		if ("response" in guard) return guard.response;

		const body = await req.json();
		const { subject_id, subject_name } = body;

		if (!subject_id || !subject_name) {
			return NextResponse.json(
				{ message: "Subject ID dan nama subjek diperlukan" },
				{ status: 400 },
			);
		}

		const { error } = await supabase
			.from("stg_subjects")
			.update({ subject_name })
			.eq("subject_id", subject_id);

		if (error) {
			console.error("UPDATE SUBJECT ERROR:", error);
			return NextResponse.json({ message: error.message }, { status: 500 });
		}

		return NextResponse.json({ message: "Subjek berjaya dikemas kini" });
	} catch {
		return NextResponse.json({ message: "Server error" }, { status: 500 });
	}
}

export async function DELETE(req: Request) {
	try {
		const guard = await requireApiRole("admin");
		if ("response" in guard) return guard.response;

		const { searchParams } = new URL(req.url);
		const subject_id = searchParams.get("id");

		if (!subject_id) {
			return NextResponse.json(
				{ message: "ID Subjek diperlukan" },
				{ status: 400 },
			);
		}

		const { error } = await supabase
			.from("stg_subjects")
			.delete()
			.eq("subject_id", subject_id);

		if (error) {
			console.error("DELETE SUBJECT ERROR:", error);
			return NextResponse.json({ message: error.message }, { status: 500 });
		}

		return NextResponse.json({ message: "Subjek berjaya dipadam" });
	} catch {
		return NextResponse.json({ message: "Server error" }, { status: 500 });
	}
}
