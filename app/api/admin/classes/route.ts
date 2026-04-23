import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const gradeRaw = searchParams.get("grade");
        const grade = gradeRaw ? Number(gradeRaw) : null;

        let q = supabase
            .from("stg_classes")
            .select("class_id, class_name, grade")
            .order("grade", { ascending: true })
            .order("class_name", { ascending: true });

        if (gradeRaw && Number.isFinite(grade)) {
            q = q.eq("grade", grade);
        }

        const { data, error } = await q;

        if (error) {
            console.error("CLASS FETCH ERROR:", error);
            return NextResponse.json([], { status: 200 });
        }

        const classes = (data ?? []).map((c) => ({
            id: c.class_id,
            name: c.class_name,
            grade: c.grade,
        }));

        return NextResponse.json(classes);
    } catch (error) {
        console.error("FETCH CLASSES ERROR:", error);
        return NextResponse.json([], { status: 200 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const class_name = String(body?.class_name ?? "").trim();
        const gradeRaw = body?.grade;
        const grade = Number(gradeRaw);

        if (!class_name || !Number.isFinite(grade)) {
            return NextResponse.json(
                { message: "Nama kelas dan tingkatan (grade) diperlukan" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("stg_classes")
            .insert({ class_name, grade });

        if (error) {
            console.error("ADD CLASS ERROR:", error);
            if (error.code === "23505") {
                return NextResponse.json(
                    { message: "Kelas sudah wujud" },
                    { status: 409 }
                );
            }
            return NextResponse.json({ message: error.message }, { status: 500 });
        }

        return NextResponse.json(
            { message: "Kelas berjaya ditambah" },
            { status: 201 }
        );
    } catch (err) {
        console.error("ADD CLASS ERROR:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const class_id = String(body?.class_id ?? "").trim();
        const class_name = String(body?.class_name ?? "").trim();
        const gradeRaw = body?.grade;
        const grade =
            gradeRaw === undefined || gradeRaw === null ? undefined : Number(gradeRaw);

        if (!class_id || !class_name) {
            return NextResponse.json(
                { message: "Class ID dan nama kelas diperlukan" },
                { status: 400 }
            );
        }

        const update: any = { class_name };
        if (grade !== undefined && Number.isFinite(grade)) update.grade = grade;

        const { error } = await supabase
            .from("stg_classes")
            .update(update)
            .eq("class_id", class_id);

        if (error) {
            console.error("UPDATE CLASS ERROR:", error);
            return NextResponse.json({ message: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: "Kelas berjaya dikemaskini" });
    } catch (err) {
        console.error("UPDATE CLASS ERROR:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const class_id = String(searchParams.get("id") ?? "").trim();

        if (!class_id) {
            return NextResponse.json(
                { message: "Class ID diperlukan" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("stg_classes")
            .delete()
            .eq("class_id", class_id);

        if (error) {
            console.error("DELETE CLASS ERROR:", error);
            return NextResponse.json({ message: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: "Kelas berjaya dipadam" });
    } catch (err) {
        console.error("DELETE CLASS ERROR:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

