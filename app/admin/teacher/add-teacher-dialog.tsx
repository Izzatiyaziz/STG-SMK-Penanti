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

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  UserPlus,
  Loader2,
  User,
  Mail,
  Phone,
  BookOpen,
  RefreshCw,
  Copy,
} from "lucide-react"; //

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

function generateTeacherUsername() {
  const code = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `PNT-${code}`; // example: PNT-8F3A12
}

function generatePassword() {
  return Math.random().toString(36).slice(-4) +
         Math.random().toString(36).slice(-4).toUpperCase() +
         "@1";
}

export function AddTeacherDialog({ onSuccess, children }: AddTeacherDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState("");
  const [generatedPwd, setGeneratedPwd] = useState("");
  const [role, setRole] = useState<TeacherRoleName | "">("");

  
  // ✅ COPY FUNCTION
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Berjaya disalin!");
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!role) {
      toast.error("Sila pilih jawatan guru");
      return;
    }
    if (!generatedId || !generatedPwd) {
      toast.error("ID atau password belum dijana");
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

    // ✅ Auto-create username for database
    //const username = generateTeacherUsername();
    //const username = generatedId;

    try {
      const res = await fetch("/api/admin/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: generatedId,
          password: generatedPwd,
          fullname,
          email: email || null,
          phone_number: phone || null,
          role_name: role,
          is_first_login: true, // ✅ IMPORTANT
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message || "Gagal menambah guru");
        return;
      }

      // ✅ SHOW staff ID + temp password
      toast.success("Akaun berjaya dibuat", {
       // description: `ID Staff: ${generatedId} | Password: ${generatedPwd}`,
      });

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Ralat rangkaian. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} 
    onOpenChange={(val) => {
        setOpen(val);

        // ✅ GENERATE staff ID bila buka dialog
        if (val) {
          setGeneratedId(generateTeacherUsername());
          setGeneratedPwd(generatePassword());
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

        <form onSubmit={handleSubmit} className="space-y-5">
            {/* ✅ NEW: STAFF ID DISPLAY */}
<div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-xl">
            <div>
              <Label className="text-xs">Staff ID</Label>
              <div className="font-mono font-bold text-primary">
                {generatedId}
              </div>
            </div>

            <div>
              <Label className="text-xs">Password</Label>

              <div className="flex items-center gap-2">
                <code className="font-mono font-bold text-primary">
                  {generatedPwd}
                </code>

                {/* COPY */}
                <button
                  type="button"
                  onClick={() => copyToClipboard(generatedPwd)}
                >
                  <Copy className="w-4 h-4" />
                </button>

                {/* REGENERATE */}
                <button
                  type="button"
                  onClick={() => setGeneratedPwd(generatePassword())}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* PERSONAL INFO */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">
                Maklumat Peribadi
              </h3>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    <Mail className="w-3 h-3 inline mr-1" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="guru@penanti.edu.my"
                    className="rounded-xl border-2 border-border/30 focus:border-primary/50 h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    <Phone className="w-3 h-3 inline mr-1" />
                    Telefon
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="01X-XXXX XXX"
                    className="rounded-xl border-2 border-border/30 focus:border-primary/50 h-11"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ROLE */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Jawatan</Label>

              <Select
                value={role}
                onValueChange={(val) => setRole(val as TeacherRoleName)}
              >
                <SelectTrigger className="w-full rounded-xl border-2 border-border/30 focus:border-primary/50 h-11">
                  <SelectValue placeholder="Pilih jawatan..." />
                </SelectTrigger>

                <SelectContent className="rounded-xl border-2 border-border">
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-3 pt-2">
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
              Guru boleh tukar kata laluan pada log masuk pertama.
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
