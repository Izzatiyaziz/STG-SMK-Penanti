import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export const runtime = "nodejs";

// SIMPLE GET - hanya return data basic
export async function GET(req: Request) {
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
}

// SIMPLE POST
export async function POST(req: Request) {
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
}

// SIMPLE PUT
export async function PUT(req: Request) {
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
}

// SIMPLE DELETE
export async function DELETE(req: Request) {
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
