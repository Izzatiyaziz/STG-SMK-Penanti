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
import { AlertCircle, Loader2, User, UserPlus } from "lucide-react";

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
  { value: "subject coordinator", label: "Panitia Subjek" },
  { value: "subject teacher", label: "Guru Subjek" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeSpaces = (value: string) => value.replace(/\s+/g, " ").trim();
const isWordsOnlyName = (value: string) => {
  const normalized = normalizeSpaces(value);
  if (!normalized) return false;
  return /^[\p{L}]+(?:[/'\u2019][\p{L}]+)*(?: [\p{L}]+(?:[/'\u2019][\p{L}]+)*)*$/u.test(
    normalized
  );
};

function generateTeacherUsername() {
  const code = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `PNT-${code}`;
}

export function AddTeacherDialog({ onSuccess, children }: AddTeacherDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState("");
  const [roles, setRoles] = useState<TeacherRoleName[]>([]);
  const [fullname, setFullname] = useState("");
  const [fullnameTouched, setFullnameTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  const emailError =
    emailTouched && !emailFocused && !email.trim()
      ? "E-mel wajib diisi."
      : emailTouched && !emailFocused && email.trim() && !EMAIL_REGEX.test(email.trim())
        ? "Format e-mel tidak sah. Contoh: guru@penanti.edu.my"
        : "";

  const fullnameError =
    fullnameTouched && !fullname.trim()
      ? "Nama penuh wajib diisi."
      : fullnameTouched && fullname.trim() && !isWordsOnlyName(fullname)
        ? "Nama penuh hanya boleh mengandungi huruf, ruang dan '/'"
        : "";

  const toggleRole = (value: TeacherRoleName, checked: boolean) => {
    setRoles((current) =>
      checked ? [...current, value] : current.filter((role) => role !== value)
    );
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFullnameTouched(true);
    setEmailTouched(true);

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
    const fullname = String(formData.get("fullname") || "").trim().toUpperCase();
    const email = String(formData.get("email") || "").trim();

    if (!fullname) {
      setLoading(false);
      return;
    }

    if (!isWordsOnlyName(fullname)) {
      setLoading(false);
      return;
    }

    if (!email) {
      setLoading(false);
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
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
          email,
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
          setFullname("");
          setFullnameTouched(false);
          setEmail("");
          setEmailTouched(false);
          setEmailFocused(false);
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
              <h3 className="font-semibold text-foreground">Maklumat Guru</h3>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                 <Label htmlFor="fullname" className="text-sm font-medium flex items-center gap-1">
                   Nama Penuh <span className="text-red-500">*</span>
                 </Label>
                <Input
                  id="fullname"
                  name="fullname"
                  placeholder="Contoh: AHMAD BIN ABU"
                  required
                  value={fullname}
                  onChange={(e) => {
                    setFullnameTouched(true);
                    setFullname(e.target.value.toUpperCase());
                  }}
                  onBlur={() => setFullnameTouched(true)}
                  aria-invalid={Boolean(fullnameError)}
                  className={`rounded-xl border-2 focus:border-primary/50 h-11 ${
                    fullnameError ? "border-red-400" : "border-border/30"
                  }`}
                />
                {fullnameError && (
                  <div className="flex items-start gap-2 text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1.5 rounded-md">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="leading-4">{fullnameError}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                                   <Label htmlFor="fullname" className="text-sm font-medium flex items-center gap-1">
                    E-mel <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="text"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => {
                      setEmailFocused(false);
                      setEmailTouched(true);
                    }}
                    placeholder="guru@penanti.edu.my"
                    title="Masukkan format e-mel yang sah"
                    aria-invalid={Boolean(emailError)}
                    className={`rounded-xl border-2 focus:border-primary/50 h-11 ${
                      emailError ? "border-red-400" : "border-border/30"
                    }`}
                  />
                  {emailError && (
                    <div className="flex items-start gap-2 text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1.5 rounded-md">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="leading-4">{emailError}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
                               <Label htmlFor="fullname" className="text-sm font-medium flex items-center gap-1">
                Jawatan <span className="text-red-500">*</span>
              </Label>
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
              disabled={loading || Boolean(fullnameError)}
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
              Password default guru buat masa ini ialah <span className="font-mono">123456</span> (tiada e-mel dihantar).
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
