import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
    try {
        const { data, error } = await supabase
            .from("stg_classes")
            .select("class_id, class_name, grade");

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
        const { class_name, grade } = body;

        if (!class_name) {
            return NextResponse.json(
                { message: "Class name is required" },
                { status: 400 }
            );
        }

        const { error } = await supabase.from("stg_classes").insert({
            class_name,
            grade: grade ?? 5, // ✅ default Tingkatan 5
        });

        if (error) {
            console.error("ADD CLASS ERROR:", error);

            if (error.code === "23505") {
                return NextResponse.json(
                    { message: "Class already exists" },
                    { status: 409 }
                );
            }

            return NextResponse.json(
                { message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: "Class added successfully" },
            { status: 201 }
        );
    } catch {
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { class_id, class_name } = body;

        if (!class_id || !class_name) {
            return NextResponse.json(
                { message: "Class ID and name are required" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("stg_classes")
            .update({ class_name })
            .eq("class_id", class_id);

        if (error) {
            console.error("UPDATE CLASS ERROR:", error);
            return NextResponse.json(
                { message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ message: "Class updated successfully" });
    } catch {
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const class_id = searchParams.get("id");

        if (!class_id) {
            return NextResponse.json(
                { message: "Class ID is required" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("stg_classes")
            .delete()
            .eq("class_id", class_id);

        if (error) {
            console.error("DELETE CLASS ERROR:", error);
            return NextResponse.json(
                { message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ message: "Class deleted successfully" });
    } catch {
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
