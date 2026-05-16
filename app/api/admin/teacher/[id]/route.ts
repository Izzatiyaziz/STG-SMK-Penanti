import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { requireApiRole } from "@/lib/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+?6?01)[0-9]-?\d{7,8}$/;

export async function PUT(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

        const { id: teacherId } = await context.params;
        const body = await req.json();
        const { fullname, email, phone_number, role, role_names } = body;

        const name = typeof fullname === "string" ? fullname.trim() : "";
        const roleNames = Array.isArray(role_names)
            ? role_names.map((item) => String(item).trim()).filter(Boolean)
            : role
                ? [String(role).trim()]
                : [];

        if (!teacherId || !name || roleNames.length === 0) {
            return NextResponse.json(
                { error: "Nama guru atau peranan tidak sah" },
                { status: 400 }
            );
        }

        if (email && !EMAIL_REGEX.test(String(email).trim())) {
            return NextResponse.json(
                { error: "Format e-mel tidak sah" },
                { status: 400 }
            );
        }

        if (phone_number && !PHONE_REGEX.test(String(phone_number).trim())) {
            return NextResponse.json(
                { error: "Format no. telefon tidak sah" },
                { status: 400 }
            );
        }

        const { error: updateErr } = await supabase
            .from("stg_teachers")
            .update({
                fullname: name,
                email: email?.trim() || null,
                phone_number: phone_number?.trim() || null,
            })
            .eq("teacher_id", teacherId);

        if (updateErr) throw updateErr;

        const { data: roleData, error: roleErr } = await supabase
            .from("stg_roles")
            .select("role_id")
            .in("role_name", roleNames);

        if (roleErr || !roleData || roleData.length !== roleNames.length) {
            return NextResponse.json(
                { error: "Role tidak wujud dalam sistem" },
                { status: 400 }
            );
        }

        await supabase
            .from("stg_teacher_roles")
            .delete()
            .eq("teacher_id", teacherId);

        const { error: insertErr } = await supabase
            .from("stg_teacher_roles")
            .insert(
                roleData.map((roleRow) => ({
                    teacher_id: teacherId,
                    role_id: roleRow.role_id,
                }))
            );

        if (insertErr) throw insertErr;

        return NextResponse.json(
            { message: "Guru berjaya dikemaskini" },
            { status: 200 }
        );
    } catch (err: unknown) {
        console.error("PUT TEACHER ERROR:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Ralat pelayan" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const guard = await requireApiRole("admin");
        if ("response" in guard) return guard.response;

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
    } catch (err: unknown) {
        console.error("DELETE TEACHER ERROR:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Ralat pelayan" },
            { status: 500 }
        );
    }
}
