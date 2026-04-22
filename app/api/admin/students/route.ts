import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
<<<<<<< HEAD
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const { data: student, error } = await supabase
        .from("stg_students")
        .select("*")
        .or(`id.eq.${id},student_id.eq.${id}`)
        .single();

      if (error || !student) {
        return NextResponse.json({ success: false, message: "Pelajar tidak dijumpai" }, { status: 404 });
      }
      return NextResponse.json(student);
    }

    const { data: students, error: fetchError } = await supabase
      .from("stg_students")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) throw fetchError;
    return NextResponse.json(students);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
=======
    console.log("API: GET /api/admin/students called");

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        console.log("API: Request ID:", id);

        // Jika mahu single student
        if (id) {
            console.log("API: Fetching single student");

            // Simple query tanpa complex logic
            const { data: student, error } = await supabase
                .from("stg_students")
                .select("*")
                .eq("id", id)
                .single();

            if (error) {
                console.log("API: Student not found by id, trying student_id");
                // Try dengan student_id
                const { data: student2, error: error2 } = await supabase
                    .from("stg_students")
                    .select("*")
                    .eq("student_id", id)
                    .single();

                if (error2) {
                    console.log("API: Student not found at all");
                    return NextResponse.json(
                        {
                            success: false,
                            message: "Student not found",
                            id: id,
                        },
                        { status: 404 }
                    );
                }

                // Format response untuk student2
                const response = {
                    success: true,
                    data: {
                        id: student2.student_id,
                        name: student2.fullname,
                        identifier: student2.ic_number,
                        class_id: student2.class_id,
                        className: "", // Will be filled if needed
                        status: student2.status || "active",
                        created_at: student2.created_at,
                    },
                };

                console.log(
                    "API: Returning student data (found by student_id)"
                );
                return NextResponse.json(response);
            }

            // Format response untuk student
            const response = {
                success: true,
                data: {
                    id: student.id,
                    name: student.fullname,
                    identifier: student.ic_number,
                    class_id: student.class_id,
                    className: "", // Will be filled if needed
                    status: student.status || "active",
                    created_at: student.created_at,
                },
            };

            console.log("API: Returning student data (found by id)");
            return NextResponse.json(response);
        }

        // Get all students - SIMPLE VERSION
        console.log("API: Fetching all students");

        const { data: students, error } = await supabase
            .from("stg_students")
            .select("*")
            .order("fullname", { ascending: true });

        if (error) {
            console.error("API: Error fetching students:", error);
            return NextResponse.json({
                success: true,
                data: [],
                message: "No students found",
            });
        }

        console.log(`API: Found ${students?.length || 0} students`);

        // Get classes untuk mapping
        const classMap: Record<string, string> = {};
        try {
            const { data: classes } = await supabase
                .from("stg_classes")
                .select("id, name");

            if (classes) {
                classes.forEach((cls) => {
                    classMap[cls.id] = cls.name;
                });
                console.log(`API: Loaded ${classes.length} classes`);
            }
        } catch (classError) {
            console.log("API: Could not load classes, using empty map");
        }

        // Simple format students
        const formattedStudents =
            students?.map((student) => ({
                id: student.id || student.student_id || "unknown",
                name: student.fullname || "",
                identifier: student.ic_number || "",
                class_id: student.class_id,
                className: student.class_id
                    ? classMap[student.class_id] || ""
                    : "",
                status: student.status || "active",
                created_at: student.created_at,
            })) || [];

        console.log("API: Successfully formatted students");

        const response = {
            success: true,
            data: formattedStudents,
            count: formattedStudents.length,
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error("API: Unhandled error in GET:", error);
        console.error("API: Error stack:", error.stack);

        // Return minimal error response
        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
                error: error.message || "Unknown error",
            },
            { status: 500 }
        );
    }
>>>>>>> a3c1c78bc98c6976f363b0faa9dc0a93b21746ff
}

export async function POST(req: Request) {
<<<<<<< HEAD
  try {
    const body = await req.json();
    const { ic_number, fullname, class_id, enrollment_date, level } = body;
    
    if (!ic_number || !fullname || !level) {
      return NextResponse.json({ success: false, message: "Nama, IC, dan Tingkatan wajib diisi." }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from("stg_students")
      .insert([{
        ic_number,
        fullname,
        level: String(level), 
        enrollment_date: enrollment_date || new Date().toISOString().split('T')[0],
        class_id: class_id || null, 
        status: "active",
      }])
      .select()
      .single();
    
    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ success: false, message: "Gagal simpan ke database", error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
=======
    console.log("API: POST /api/admin/students called");

    try {
        const body = await req.json();
        console.log("API: Request body:", body);

        const { ic_number, fullname, class_id } = body;

        if (!ic_number || !fullname) {
            return NextResponse.json(
                {
                    success: false,
                    message: "IC number and full name required",
                },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("stg_students")
            .insert({
                ic_number,
                fullname,
                class_id: class_id || null,
                status: "active",
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error("API: Create error:", error);
            return NextResponse.json(
                {
                    success: false,
                    message: "Failed to create student",
                    error: error.message,
                },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Student created successfully",
            data: {
                id: data.id || data.student_id,
                name: data.fullname,
            },
        });
    } catch (error: any) {
        console.error("API: Unhandled error in POST:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Server error",
                error: error.message,
            },
            { status: 500 }
        );
    }
>>>>>>> a3c1c78bc98c6976f363b0faa9dc0a93b21746ff
}

export async function PUT(req: Request) {
<<<<<<< HEAD
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ message: "ID diperlukan" }, { status: 400 });

    const body = await req.json();
    const { name, identifier, level, enrollment_date, className } = body;

    // Cari class_id berdasarkan nama kelas jika perlu
    let class_id = null;
    if (className && className !== "none") {
        const { data: classData } = await supabase.from("stg_classes").select("id").eq("name", className).single();
        if (classData) class_id = classData.id;
    }

    const { error: updateError } = await supabase
      .from("stg_students")
      .update({
        fullname: name,
        ic_number: identifier,
        level: level,
        enrollment_date: enrollment_date,
        class_id: class_id,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (updateError) throw updateError;
    return NextResponse.json({ success: true, message: "Berjaya dikemaskini" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
=======
    console.log("API: PUT /api/admin/students called");

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        console.log("API: Update ID:", id);

        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Student ID required",
                },
                { status: 400 }
            );
        }

        const body = await req.json();
        console.log("API: Update body:", body);

        const { name: fullname, identifier: ic_number, className } = body;

        if (!fullname || !ic_number) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Name and IC number required",
                },
                { status: 400 }
            );
        }

        // Find student
        const { data: student, error: findError } = await supabase
            .from("stg_students")
            .select("*")
            .or(`id.eq.${id},student_id.eq.${id}`)
            .single();

        if (findError || !student) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Student not found",
                },
                { status: 404 }
            );
        }

        // Get class_id from className
        let class_id = null;
        if (className && className !== "none") {
            const { data: classData } = await supabase
                .from("stg_classes")
                .select("id")
                .eq("name", className)
                .single();

            if (classData) {
                class_id = classData.id;
            }
        }

        // Update based on what field we found the student with
        const updateField = student.id ? "id" : "student_id";
        const updateValue = student.id || student.student_id;

        const { error: updateError } = await supabase
            .from("stg_students")
            .update({
                fullname,
                ic_number,
                class_id,
                updated_at: new Date().toISOString(),
            })
            .eq(updateField, updateValue);

        if (updateError) {
            console.error("API: Update error:", updateError);
            return NextResponse.json(
                {
                    success: false,
                    message: "Failed to update student",
                },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Student updated successfully",
        });
    } catch (error: any) {
        console.error("API: Unhandled error in PUT:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Server error",
                error: error.message,
            },
            { status: 500 }
        );
    }
>>>>>>> a3c1c78bc98c6976f363b0faa9dc0a93b21746ff
}

export async function DELETE(req: Request) {
<<<<<<< HEAD
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ message: "ID diperlukan" }, { status: 400 });

    const { error } = await supabase.from("stg_students").delete().eq("id", id);
    if (error) {
        return NextResponse.json({ 
            success: false, 
            message: "Gagal padam. Mungkin pelajar mempunyai data markah/kehadiran.",
            error: error.message 
        }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Dipadam" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
=======
    console.log("API: DELETE /api/admin/students called");

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        console.log("API: Delete ID:", id);

        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Student ID required",
                },
                { status: 400 }
            );
        }

        // Find student
        const { data: student, error: findError } = await supabase
            .from("stg_students")
            .select("*")
            .or(`id.eq.${id},student_id.eq.${id}`)
            .single();

        if (findError || !student) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Student not found",
                },
                { status: 404 }
            );
        }

        // Delete based on what field we found the student with
        const deleteField = student.id ? "id" : "student_id";
        const deleteValue = student.id || student.student_id;

        const { error: deleteError } = await supabase
            .from("stg_students")
            .delete()
            .eq(deleteField, deleteValue);

        if (deleteError) {
            console.error("API: Delete error:", deleteError);
            return NextResponse.json(
                {
                    success: false,
                    message: "Failed to delete student",
                },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Student deleted successfully",
            deleted_name: student.fullname,
        });
    } catch (error: any) {
        console.error("API: Unhandled error in DELETE:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Server error",
                error: error.message,
            },
            { status: 500 }
        );
    }
}
>>>>>>> a3c1c78bc98c6976f363b0faa9dc0a93b21746ff
