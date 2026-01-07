"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ClassItem } from "@/app/types";

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<ClassItem | null>(null);
  const [deleting, setDeleting] = useState<ClassItem | null>(null);

  // ================= FETCH CLASSES =================
  async function fetchClasses() {
    const res = await fetch("/api/admin/classes");
    const data = await res.json();
    setClasses(data);
  }

  useEffect(() => {
    fetchClasses();
  }, []);

  // ================= ADD CLASS =================
  async function handleAddClass(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        class_name: formData.get("class_name"),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.message || "Failed to add class");
      setLoading(false);
      return;
    }

    toast.success("Class added successfully");
    setLoading(false);
    fetchClasses();

    (document.getElementById("close-add-dialog") as HTMLButtonElement)?.click();
  }

  // ================= EDIT CLASS =================
  async function handleEditClass(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;

    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/admin/classes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        class_id: editing.id,
        class_name: formData.get("class_name"),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.message || "Failed to update class");
      setLoading(false);
      return;
    }

    toast.success("Class updated successfully");
    setEditing(null);
    setLoading(false);
    fetchClasses();
  }

  // ================= DELETE CLASS =================
  async function handleDeleteClass() {
    if (!deleting) return;

    setLoading(true);

    const res = await fetch(
      `/api/admin/classes?id=${deleting.id}`,
      { method: "DELETE" }
    );

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.message || "Failed to delete class");
      setLoading(false);
      return;
    }

    toast.success("Class deleted successfully");
    setDeleting(null);
    setLoading(false);
    fetchClasses();
  }

  return (
    <div className="space-y-6">
      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Class Management</h1>

        {/* ================= ADD CLASS DIALOG ================= */}
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Class</Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Class</DialogTitle>
              <DialogDescription>
                Enter class name to add a new class.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <Label>Class Name</Label>
                <Input name="class_name" required />
              </div>

              <DialogFooter>
                <Button
                  id="close-add-dialog"
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ================= TABLE ================= */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Class Name</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {classes.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No classes found
                </TableCell>
              </TableRow>
            )}

            {classes.map((cls, index) => (
              <TableRow key={cls.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{cls.name}</TableCell>
                <TableCell className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setEditing(cls)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => setDeleting(cls)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ================= EDIT CLASS DIALOG ================= */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditClass} className="space-y-4">
            <div>
              <Label>Class Name</Label>
              <Input
                name="class_name"
                defaultValue={editing?.name}
                required
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= DELETE CONFIRM DIALOG ================= */}
      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Class</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <b>{deleting?.name}</b>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClass}
              disabled={loading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
