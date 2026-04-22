"use client";

import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    Loader2,
    UserPlus,
    User,
    IdCard,
    GraduationCap,
    Calendar,
    Layers,
} from "lucide-react";

interface AddStudentDialogProps {
    onSuccess: () => void;
    classes: Array<{ id: string; name: string }>; // Kekalkan props untuk elakkan ralat pada parent component
    children?: ReactNode;
}

export function AddStudentDialog({
    onSuccess,
    children,
}: AddStudentDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // State untuk Tingkatan (Level)
    const [selectedLevel, setSelectedLevel] = useState<string>("");
    const today = new Date().toISOString().split('T')[0];
    
    const [formData, setFormData] = useState({
        fullname: "",
        ic_number: "",
        enrollment_date: today,
    });

    // Fungsi Logik Auto-Detect Tingkatan
    const autoDetectLevel = (ic: string) => {
        if (ic.length < 2) return;

        const yearPart = ic.substring(0, 2);
        const birthYear = parseInt(yearPart) > 30 ? 1900 + parseInt(yearPart) : 2000 + parseInt(yearPart);
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;

        let detected = "";
        if (age === 13) detected = "1";
        else if (age === 14) detected = "2";
        else if (age === 15) detected = "3";
        else if (age === 16) detected = "4";
        else if (age === 17) detected = "5";

        if (detected) {
            setSelectedLevel(detected);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (name === "ic_number") {
            autoDetectLevel(value);
        }
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        
        if (!selectedLevel) {
            toast.error("Sila pilih tingkatan pelajar");
            return;
        }

        setLoading(true);

        const payload = {
            fullname: formData.fullname,
            ic_number: formData.ic_number,
            enrollment_date: formData.enrollment_date,
            level: selectedLevel,
            class_id: null, // Setkan null kerana Guru Kelas akan uruskan penempatan kemudian
        };

        try {
            const res = await fetch("/api/admin/students", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Gagal menambah pelajar");
                return;
            }

            toast.success("🎉 Pelajar berjaya ditambah!");
            setOpen(false);

            // Reset form
            setFormData({
                fullname: "",
                ic_number: "",
                enrollment_date: today,
            });
            setSelectedLevel("");

            onSuccess();
        } catch {
            toast.error("⚠️ Ralat rangkaian. Sila cuba lagi.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ? (
                    children
                ) : (
                    <Button className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/80 shadow-lg">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Tambah Pelajar
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[480px] rounded-2xl border-2 border-border/50 bg-card shadow-2xl">
                <DialogHeader className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <GraduationCap className="w-6 h-6 text-primary" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                            Daftar Pelajar Baru
                        </DialogTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Isi maklumat asas. Penempatan kelas akan dilakukan oleh Guru Kelas.
                    </p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* PERSONAL INFORMATION SECTION */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-primary" />
                            <h3 className="font-semibold text-foreground">
                                Maklumat Peribadi
                            </h3>
                        </div>

                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullname" className="text-sm font-medium flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    Nama Penuh *
                                </Label>
                                <Input
                                    id="fullname"
                                    name="fullname"
                                    value={formData.fullname}
                                    onChange={handleInputChange}
                                    placeholder="Contoh: Ali bin Ahmad"
                                    required
                                    className="rounded-xl border-2 border-border/30 focus:border-primary/50 h-11"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ic_number" className="text-sm font-medium flex items-center gap-1">
                                        <IdCard className="w-3 h-3" />
                                        No. Kad Pengenalan *
                                    </Label>
                                    <Input
                                        id="ic_number"
                                        name="ic_number"
                                        value={formData.ic_number}
                                        onChange={handleInputChange}
                                        placeholder="010101-01-0101"
                                        required
                                        className="rounded-xl border-2 border-border/30 focus:border-primary/50 h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="enrollment_date" className="text-sm font-medium flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        Tarikh Daftar *
                                    </Label>
                                    <Input
                                        id="enrollment_date"
                                        name="enrollment_date"
                                        type="date"
                                        max={today}
                                        value={formData.enrollment_date}
                                        onChange={handleInputChange}
                                        required
                                        className="rounded-xl border-2 border-border/30 focus:border-primary/50 h-11"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ACADEMIC SECTION */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Layers className="w-4 h-4 text-secondary" />
                            <h3 className="font-semibold text-foreground">
                                Maklumat Akademik
                            </h3>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" />
                                Tingkatan *
                            </Label>
                            <Select value={selectedLevel} onValueChange={setSelectedLevel} required>
                                <SelectTrigger className="w-full rounded-xl border-2 border-border/30 focus:border-primary/50 h-11">
                                    <SelectValue placeholder="Pilih tingkatan..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-border">
                                    {[1, 2, 3, 4, 5].map((lvl) => (
                                        <SelectItem key={lvl} value={lvl.toString()} className="rounded-lg">
                                            Tingkatan {lvl}
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
                            onClick={() => {
                                setOpen(false);
                                setFormData({
                                    fullname: "",
                                    ic_number: "",
                                    enrollment_date: today,
                                });
                                setSelectedLevel("");
                            }}
                            className="flex-1 rounded-xl border-2 border-border/30 h-11 hover:bg-muted/50"
                            disabled={loading}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded-xl h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/80 shadow-lg font-medium"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Mendaftarkan...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Daftar Pelajar
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}