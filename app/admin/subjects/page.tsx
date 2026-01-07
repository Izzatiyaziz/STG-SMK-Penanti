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
import { SubjectItem } from "@/app/types";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<SubjectItem | null>(null);
  const [deleting, setDeleting] = useState<SubjectItem | null>(null);


  // ================= FETCH SUBJECTS =================
  async function fetchSubjects() {
    const res = await fetch("/api/admin/subjects");
    const data = await res.json();
    setSubjects(data);
  }

  useEffect(() => {
    fetchSubjects();
  }, []);

  // ================= ADD SUBJECT =================
  async function handleAddSubject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      subject_name: formData.get("subject_name"),
    };

    const res = await fetch("/api/admin/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.message || "Failed to add subject");
      setLoading(false);
      return;
    }

    toast.success("Subject added successfully");
    setLoading(false);
    fetchSubjects();

    (document.getElementById("close-subject-dialog") as HTMLButtonElement)?.click();
  }

  async function handleEditSubject(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setLoading(true);

  const formData = new FormData(e.currentTarget);

  const res = await fetch("/api/admin/subjects", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject_id: editing?.id,
      subject_name: formData.get("subject_name"),
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    toast.error(data.message || "Failed to update subject");
    setLoading(false);
    return;
  }

  toast.success("Subject updated successfully");
  setEditing(null);
  setLoading(false);
  fetchSubjects();
}

async function handleDeleteSubject() {
  if (!deleting) return;
  setLoading(true);

  const res = await fetch(
    `/api/admin/subjects?id=${deleting.id}`,
    { method: "DELETE" }
  );

  const data = await res.json();

  if (!res.ok) {
    toast.error(data.message || "Failed to delete subject");
    setLoading(false);
    return;
  }

  toast.success("Subject deleted successfully");
  setDeleting(null);
  setLoading(false);
  fetchSubjects();
}


  return (
    <div className="space-y-6">
      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Subject Management</h1>

        {/* ================= ADD SUBJECT DIALOG ================= */}
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Subject</Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
              <DialogDescription>
                Enter subject name to add a new subject.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <Label>Subject Name</Label>
                <Input name="subject_name" required />
              </div>

              <DialogFooter>
                <Button
                  id="close-subject-dialog"
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
              <TableHead>Subject Name</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {subjects.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-muted-foreground"
                >
                  No subjects found
                </TableCell>
              </TableRow>
            )}

            {subjects.map((subject, index) => (
              <TableRow key={subject.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{subject.name}</TableCell>
                <TableCell className="flex gap-2">
  <Button
    size="icon"
    variant="outline"
    onClick={() => setEditing(subject)}
  >
    <Pencil className="h-4 w-4" />
  </Button>

  <Button
    size="icon"
    variant="destructive"
    onClick={() => setDeleting(subject)}
  >
    <Trash2 className="h-4 w-4" />
  </Button>
</TableCell>

              </TableRow>
            ))}
          </TableBody>

          <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Subject</DialogTitle>
    </DialogHeader>

    <form onSubmit={handleEditSubject} className="space-y-4">
      <div>
        <Label>Subject Name</Label>
        <Input
          name="subject_name"
          defaultValue={editing?.name}
          required
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setEditing(null)}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          Save
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

<Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete Subject</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete <b>{deleting?.name}</b>?
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>

    <DialogFooter>
      <Button variant="outline" onClick={() => setDeleting(null)}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        onClick={handleDeleteSubject}
        disabled={loading}
      >
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

        </Table>
      </div>
    </div>
  );
}
