import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export async function PUT(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: teacherId } = await context.params;

        const body = await req.json();
        const { fullname, email, role } = body;

        const name = typeof fullname === "string" ? fullname.trim() : "";

        if (!teacherId || !name) {
            return NextResponse.json(
                { error: "Nama guru tidak sah" },
                { status: 400 }
            );
        }

        // 1️⃣ Update teacher
        const { error: updateErr } = await supabase
            .from("stg_teachers")
            .update({
                fullname: name,
                email: email?.trim() || null,
            })
            .eq("teacher_id", teacherId);

        if (updateErr) throw updateErr;

        // 2️⃣ Get role_id
        const { data: roleData, error: roleErr } = await supabase
            .from("stg_roles")
            .select("role_id")
            .eq("role_name", role)
            .single();

        if (roleErr || !roleData) {
            return NextResponse.json(
                { error: "Role tidak wujud dalam sistem" },
                { status: 400 }
            );
        }

        // 3️⃣ Reset roles
        await supabase
            .from("stg_teacher_roles")
            .delete()
            .eq("teacher_id", teacherId);

        // 4️⃣ Insert new role
        const { error: insertErr } = await supabase
            .from("stg_teacher_roles")
            .insert({
                teacher_id: teacherId,
                role_id: roleData.role_id,
            });

        if (insertErr) throw insertErr;

        return NextResponse.json(
            { message: "Guru berjaya dikemaskini" },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("PUT TEACHER ERROR:", err);
        return NextResponse.json(
            { error: err.message || "Server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: teacherId } = await context.params;
        if (!teacherId) {
            return NextResponse.json(
                { error: "teacher_id tiada" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("stg_teachers")
            .delete()
            .eq("teacher_id", teacherId);

        if (error) throw error;

        return NextResponse.json(
            { message: "Guru berjaya dipadam" },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("DELETE TEACHER ERROR:", err);
        return NextResponse.json(
            { error: err.message || "Server error" },
            { status: 500 }
        );
    }
}
