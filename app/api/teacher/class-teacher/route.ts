import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Di Next.js 16, cookies() mesti di-await
    const cookieStore = await cookies();

    // Inisialisasi Supabase Server Client (Cara baru SSR)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    // Ambil data daripada frontend
    const { class_id, teacher_id } = await request.json();

    if (!class_id || !teacher_id) {
      return NextResponse.json(
        { error: "Maklumat kelas atau guru tidak lengkap." },
        { status: 400 }
      );
    }

    // Kemaskini table 'classes'. 
    // Pastikan nama column dalam DB anda adalah 'teacher_id'
    const { error } = await supabase
      .from("classes")
      .update({ teacher_id: teacher_id })
      .eq("id", class_id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Lantikan guru kelas berjaya! ✅" },
      { status: 200 }
    );

  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: "Ralat dalaman server." },
      { status: 500 }
    );
  }
}