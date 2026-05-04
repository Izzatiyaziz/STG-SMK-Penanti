"use client";

import { ReactNode, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, User, Mail, Phone } from "lucide-react";

interface AddTeacherDialogProps {
  onSuccess: () => void;
  children?: ReactNode;
}

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

function generateTeacherUsername() {
  const code = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `PNT-${code}`;
}

export function AddTeacherDialog({ onSuccess, children }: AddTeacherDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState("");
  const [roles, setRoles] = useState<TeacherRoleName[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
      ? "Format tidak sah. Contoh: 0123456789, 012-3456789 atau +60123456789"
      : "";

  const toggleRole = (value: TeacherRoleName, checked: boolean) => {
    setRoles((current) =>
      checked ? [...current, value] : current.filter((role) => role !== value)
    );
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (roles.length === 0) {
      toast.error("Sila pilih sekurang-kurangnya satu jawatan guru");
      return;
    }

    if (!generatedId) {
      toast.error("ID Staff belum dijana");
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const fullname = String(formData.get("fullname") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();

    if (!fullname) {
      toast.error("Nama penuh wajib diisi");
      setLoading(false);
      return;
    }

    if (email && !EMAIL_REGEX.test(email)) {
      setEmailTouched(true);
      toast.error("Format email tidak sah");
      setLoading(false);
      return;
    }

    if (phone && !PHONE_REGEX.test(phone)) {
      setPhoneTouched(true);
      toast.error("Format no. telefon tidak sah");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: generatedId,
          fullname,
          email: email || null,
          phone_number: phone || null,
          role_names: roles,
          is_first_login: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message || "Gagal menambah guru");
        return;
      }

      toast.success("Akaun berjaya dibuat");
      setOpen(false);
      onSuccess?.();
    } catch {
      toast.error("Ralat rangkaian. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);

        if (val) {
          setGeneratedId(generateTeacherUsername());
          setRoles([]);
          setEmail("");
          setPhone("");
          setEmailTouched(false);
          setPhoneTouched(false);
          setEmailFocused(false);
          setPhoneFocused(false);
        }
      }}
    >
      <DialogTrigger asChild>
        {children ? (
          children
        ) : (
          <Button className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/80 shadow-lg">
            <UserPlus className="w-4 h-4 mr-2" />
            Tambah Guru
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] rounded-2xl border-2 border-border/50 bg-card shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              Daftar Guru Baru
            </DialogTitle>
          </div>

          <p className="text-sm text-muted-foreground">
            Isi maklumat guru untuk akses sistem
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div className="rounded-xl bg-muted p-4">
            <Label className="text-xs">Staff ID</Label>
            <div className="font-mono font-bold text-primary">{generatedId}</div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Maklumat Peribadi</h3>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullname" className="text-sm font-medium">
                  Nama Penuh
                </Label>
                <Input
                  id="fullname"
                  name="fullname"
                  placeholder="Contoh: Ahmad bin Abu"
                  required
                  className="rounded-xl border-2 border-border/30 focus:border-primary/50 h-11"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    <Mail className="w-3 h-3 inline mr-1" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="text"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => {
                      setEmailFocused(false);
                      setEmailTouched(true);
                    }}
                    placeholder="guru@penanti.edu.my"
                    title="Masukkan format email yang sah"
                    aria-invalid={Boolean(emailError)}
                    className={`rounded-xl border-2 focus:border-primary/50 h-11 ${
                      emailError ? "border-red-400" : "border-border/30"
                    }`}
                  />
                  {emailError && (
                    <p className="text-xs font-medium text-red-600">{emailError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    <Phone className="w-3 h-3 inline mr-1" />
                    Telefon
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => {
                      setPhoneFocused(false);
                      setPhoneTouched(true);
                    }}
                    placeholder="0123456789"
                    inputMode="tel"
                    maxLength={PHONE_MAX_LENGTH}
                    title="Masukkan nombor telefon Malaysia yang sah, contoh 0123456789"
                    aria-invalid={Boolean(phoneError)}
                    className={`rounded-xl border-2 focus:border-primary/50 h-11 ${
                      phoneError ? "border-red-400" : "border-border/30"
                    }`}
                  />
                  {phoneError && (
                    <p className="text-xs font-medium text-red-600">{phoneError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Jawatan</Label>
              <div className="grid gap-3 rounded-xl border-2 border-border/30 p-3">
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

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl border-2 border-border/30 h-11"
              disabled={loading}
            >
              Batal
            </Button>

            <Button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/80 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Simpan Guru
                </>
              )}
            </Button>
          </div>

          <div className="pt-2 border-t border-border/20">
            <p className="text-xs text-muted-foreground text-center">
              Password sementara akan dijana oleh sistem dan dihantar melalui email.
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
