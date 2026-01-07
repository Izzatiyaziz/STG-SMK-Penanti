"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { User } from "@/app/types";

type ClassItem = {
  id: string;
  name: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);

  // ================= FETCH STUDENTS =================
  async function fetchUsers() {
    const res = await fetch("/api/admin/users?role=student");
    const data = await res.json();
    setUsers(data);
  }

  // ================= FETCH CLASSES =================
  async function fetchClasses() {
    const res = await fetch("/api/admin/classes");
    const data = await res.json();
    setClasses(data);
  }

  useEffect(() => {
    fetchUsers();
    fetchClasses();
  }, []);

  // ================= ADD STUDENT =================
  async function handleAddStudent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const payload = {
      username: formData.get("username"),
      fullname: formData.get("fullname"),
      email: formData.get("email") || null,
      class_id: formData.get("class_id") || null,
      password: formData.get("password"),
    };

    const res = await fetch("/api/admin/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.message || "Failed to add student");
      setLoading(false);
      return;
    }

    toast.success("Student added successfully");
    setLoading(false);
    fetchUsers();

    (document.getElementById("close-dialog") as HTMLButtonElement)?.click();
  }

  return (
    <div className="space-y-6">
      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Student Management</h1>

        {/* ================= ADD STUDENT DIALOG ================= */}
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Student</Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
              <DialogDescription>
                Fill in student information below.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <Label>Username</Label>
                <Input name="username" required />
              </div>

              <div>
                <Label>Full Name</Label>
                <Input name="fullname" required />
              </div>

              <div>
                <Label>Email (Optional)</Label>
                <Input name="email" type="email" />
              </div>

              <div>
                <Label>Class (Optional)</Label>
                <select
                  name="class_id"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">-- No Class --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Password</Label>
                <Input name="password" type="password" required />
              </div>

              <DialogFooter>
                <Button
                  id="close-dialog"
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
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No students found
                </TableCell>
              </TableRow>
            )}

            {users.map((user, index) => (
              <TableRow key={user.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.identifier}</TableCell>
                <TableCell>
                  <Badge variant="secondary">student</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
