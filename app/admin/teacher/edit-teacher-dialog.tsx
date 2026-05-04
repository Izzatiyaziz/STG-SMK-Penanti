"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Edit, Loader2, Trash2 } from "lucide-react";

type User = {
  id: string;
  name: string;
  identifier: string;
  roles?: string[];
  email?: string;
  phone_number?: string;
  status?: "active" | "inactive";
};

type EditTeacherDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleteOpen?: boolean;
  onDeleteOpenChange?: (open: boolean) => void;
  user: User | null;
  onSuccess?: () => void;
};

type TeacherRoleName =
  | "principal"
  | "class teacher"
  | "subject teacher"
  | "subject coordinator";

const ROLE_OPTIONS: { value: TeacherRoleName; label: string }[] = [
  { value: "principal", label: "Pengetua" },
  { value: "class teacher", label: "Guru Kelas" },
  { value: "subject coordinator", label: "Penyelaras Subjek" },
  { value: "subject teacher", label: "Guru Subjek" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+?6?01)[0-9]-?\d{7,8}$/;
const PHONE_MAX_DIGITS = 12;
const PHONE_MAX_LENGTH = 14;

function formatPhoneInput(value: string) {
  let digitCount = 0;
  let result = "";

  for (const char of value.replace(/[^\d+-]/g, "")) {
    if (/\d/.test(char)) {
      if (digitCount >= PHONE_MAX_DIGITS) continue;
      digitCount += 1;
    }
    result += char;
  }

  return result.slice(0, PHONE_MAX_LENGTH);
}

export function EditTeacherDialog({
  open,
  onOpenChange,
  deleteOpen: controlledDeleteOpen,
  onDeleteOpenChange,
  user,
  onSuccess,
}: EditTeacherDialogProps) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [internalDeleteOpen, setInternalDeleteOpen] = useState(false);

  const deleteOpen = controlledDeleteOpen ?? internalDeleteOpen;
  const setDeleteOpen = onDeleteOpenChange ?? setInternalDeleteOpen;

  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roles, setRoles] = useState<TeacherRoleName[]>([]);
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

  const emailError =
    emailTouched && !emailFocused && email.trim() && !EMAIL_REGEX.test(email.trim())
      ? "Format email tidak sah. Contoh: guru@penanti.edu.my"
      : "";
  const phoneError =
    phoneTouched && !phoneFocused && phone.trim() && !PHONE_REGEX.test(phone.trim())
      ? "Format telefon Malaysia tidak sah. Contoh: 0123456789, 012-3456789 atau +60123456789"
      : "";

  useEffect(() => {
    if (!user) return;

    setName(user.name ?? "");
    setIdentifier(user.identifier ?? "");
    setEmail(user.email ?? "");
    setPhone(user.phone_number ?? "");
    setEmailTouched(false);
    setPhoneTouched(false);
    setEmailFocused(false);
    setPhoneFocused(false);
    setRoles(
      (user.roles ?? []).filter((role): role is TeacherRoleName =>
        ROLE_OPTIONS.some((option) => option.value === role)
      )
    );
  }, [user]);

  const toggleRole = (value: TeacherRoleName, checked: boolean) => {
    setRoles((current) =>
      checked ? [...current, value] : current.filter((role) => role !== value)
    );
  };

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

    if (roles.length === 0) {
      toast.error("Sila pilih sekurang-kurangnya satu peranan");
      return;
    }

    if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
      setEmailTouched(true);
      toast.error("Format email tidak sah");
      return;
    }

    if (phone.trim() && !PHONE_REGEX.test(phone.trim())) {
      setPhoneTouched(true);
      toast.error("Format no. telefon tidak sah");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/admin/teacher/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_id: user.id,
          fullname: name.trim(),
          email: email.trim() ? email.trim() : null,
          phone_number: phone.trim() ? phone.trim() : null,
          role_names: roles,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result?.error || "Update gagal");
      }

      toast.success("Maklumat guru berjaya dikemaskini");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error("Gagal kemaskini maklumat guru", {
        description: err instanceof Error ? err.message : "Sila cuba lagi",
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
      const res = await fetch(`/api/admin/teacher/${user.id}`, {
        method: "DELETE",
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result?.error || "Delete gagal");
      }

      toast.success(`${user.name} berjaya dipadam`);
      setDeleteOpen(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error("Gagal padam guru", {
        description: err instanceof Error ? err.message : "Sila cuba lagi",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Edit className="w-5 h-5 text-primary" />
              Kemaskini Guru
            </DialogTitle>
          </DialogHeader>

          {!user ? (
            <div className="py-8 text-sm text-muted-foreground">
              Tiada data guru dipilih.
            </div>
          ) : (
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Guru</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Cikgu Aisyah"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">No. Staff</label>
                <Input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Contoh: STAF001"
                  className="h-11 font-mono"
                  disabled
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => {
                    setEmailFocused(false);
                    setEmailTouched(true);
                  }}
                  placeholder="Contoh: teacher@school.com"
                  type="text"
                  inputMode="email"
                  title="Masukkan format email yang sah"
                  aria-invalid={Boolean(emailError)}
                  className={emailError ? "h-11 border-red-400" : "h-11"}
                />
                {emailError && (
                  <p className="text-xs font-medium text-red-600">{emailError}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">No. Telefon</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => {
                    setPhoneFocused(false);
                    setPhoneTouched(true);
                  }}
                  placeholder="Contoh: 0123456789"
                  inputMode="tel"
                  maxLength={PHONE_MAX_LENGTH}
                  title="Masukkan nombor telefon Malaysia yang sah"
                  aria-invalid={Boolean(phoneError)}
                  className={phoneError ? "h-11 border-red-400" : "h-11"}
                />
                {phoneError && (
                  <p className="text-xs font-medium text-red-600">{phoneError}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Peranan</label>
                <div className="grid gap-3 rounded-md border border-border p-3">
                  {ROLE_OPTIONS.map((r) => (
                    <label key={r.value} className="flex items-center gap-3 text-sm">
                      <Checkbox
                        checked={roles.includes(r.value)}
                        onCheckedChange={(checked) => toggleRole(r.value, checked === true)}
                      />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={!user || deleting || saving}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Padam
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving || deleting}
                >
                  Batal
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={saving || deleting || !user}
                  className="bg-primary px-8"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {saving ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive font-bold">
              Padam Guru?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Padam rekod{" "}
              <span className="font-semibold text-foreground">{user?.name}</span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={(e) => {
                  e.preventDefault();
                  confirmDelete();
                }}
                disabled={deleting}
              >
                {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {deleting ? "Memadam..." : "Ya, Padam"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
