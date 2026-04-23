"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Trash2 } from "lucide-react";

type User = {
  id: string; // ✅ teacher_id UUID
  name: string; // fullname
  identifier: string; // teacher code / username display (TCH001 etc) - UI only
  roles?: string[];
  email?: string;
  phone_number?: string;
  status?: "active" | "inactive";
};

type EditTeacherDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess?: () => void;
};

export function EditTeacherDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: EditTeacherDialogProps) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // form states
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState(""); // UI only
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("subject teacher");

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setIdentifier(user.identifier ?? "");
      setEmail(user.email ?? "");
      setRole(user.roles?.[0] ?? "subject teacher");
    }
  }, [user]);

async function handleSave() {
  if (!user) return;

  if (!name.trim()) {
    toast.error("Sila isi Nama Guru");
    return;
  }

  if (!user.id) {
    toast.error("teacher_id (UUID) tiada. Sila refresh data.");
    return;
  }

  setSaving(true);

  try {
    const payload = {
      teacher_id: user.id, // ✅ include
      fullname: name.trim(),
      email: email?.trim() ? email.trim() : null,
      role: role, // ✅ role name
    };

    const res = await fetch(`/api/admin/teacher/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) throw new Error(result?.error || "Update gagal");

    toast.success("Maklumat guru berjaya dikemaskini ✅");
    onOpenChange(false);
    onSuccess?.();
  } catch (err: any) {
    toast.error("Gagal kemaskini maklumat guru", {
      description: err?.message || "Sila cuba lagi",
    });
  } finally {
    setSaving(false);
  }
}


  async function confirmDelete() {
    if (!user) return;

    if (!user.id) {
      toast.error("teacher_id (UUID) tiada. Sila refresh data.");
      return;
    }

    setDeleting(true);

    try {
      console.log("🗑️ DELETE URL:", `/api/admin/teacher/${user.id}`);

      const res = await fetch(`/api/admin/teacher/${user.id}`, {
        method: "DELETE",
      });

      const result = await res.json();
      console.log("🗑️ DELETE RESULT:", result);

      if (!res.ok) {
        throw new Error(result?.error || "Delete gagal");
      }

      toast.success(`${user.name} berjaya dipadam ✅`);
      setDeleteOpen(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("DELETE TEACHER ERROR:", err);
      toast.error("Gagal padam guru", {
        description: err?.message || "Sila cuba lagi",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* MAIN EDIT DIALOG */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Edit Maklumat Guru
            </DialogTitle>
          </DialogHeader>

          {!user ? (
            <div className="py-8 text-sm text-muted-foreground">
              Tiada data guru dipilih.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Nama */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Guru</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Cikgu Aisyah"
                />
              </div>

              {/* No. Staff (UI only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">No. Staff (Paparan)</label>
                <Input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Contoh: STAF001"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  No. Staff ini untuk paparan (login guna No. Staff).
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Contoh: teacher@school.com"
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Peranan</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih peranan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principal">Pengetua</SelectItem>
                    <SelectItem value="class teacher">Guru Kelas</SelectItem>
                    <SelectItem value="subject teacher">Guru Subjek</SelectItem>
                    <SelectItem value="subject coordinator">
                      Penyelaras Subjek
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* DELETE BUTTON */}
            <Button
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={!user || deleting || saving}
              className="w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Padam Guru
            </Button>

            {/* ACTION BUTTONS */}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving || deleting}
                className="flex-1 sm:flex-none"
              >
                Batal
              </Button>

              <Button
                onClick={handleSave}
                disabled={saving || deleting || !user}
                className="flex-1 sm:flex-none"
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Padam guru ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak boleh dipulihkan. Guru{" "}
              <span className="font-semibold text-foreground">{user?.name}</span>{" "}
              akan dipadam secara kekal daripada sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>

            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault(); // prevent auto close
                confirmDelete();
              }}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? "Memadam..." : "Teruskan Padam"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
