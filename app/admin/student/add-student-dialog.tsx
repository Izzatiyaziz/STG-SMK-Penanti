"use client";

import { ReactNode, useEffect, useState } from "react";
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
    RefreshCw,
    AlertCircle,
} from "lucide-react";

interface AddStudentDialogProps {
    onSuccess: () => void;
    classes: Array<{ id: string; name: string }>;
    children?: ReactNode;
}

// Helper untuk detect tingkatan dari IC
const detectLevelFromIC = (ic: string): string | null => {
    if (ic.length < 12) return null;
    const yearPart = parseInt(ic.substring(0, 2));
    const currentYear = new Date().getFullYear();
    const fullYear = yearPart > (currentYear % 100) ? 1900 + yearPart : 2000 + yearPart;
    const age = currentYear - fullYear;

    if (age === 13) return "1";
    if (age === 14) return "2";
    if (age === 15) return "3";
    if (age === 16) return "4";
    if (age === 17) return "5";
    return null;
};

// Helper untuk dapatkan umur dari IC
const getAgeFromIC = (ic: string): number | null => {
    if (ic.length < 12) return null;
    const yearPart = parseInt(ic.substring(0, 2));
    const currentYear = new Date().getFullYear();
    const fullYear = yearPart > (currentYear % 100) ? 1900 + yearPart : 2000 + yearPart;
    return currentYear - fullYear;
};

export function AddStudentDialog({
    onSuccess,
    children,
}: AddStudentDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const [selectedLevel, setSelectedLevel] = useState<string>("");
    const [detectedLevel, setDetectedLevel] = useState<string | null>(null);
    const [userOverridden, setUserOverridden] = useState(false);
    const today = new Date().toISOString().split('T')[0];
    
    const [formData, setFormData] = useState({
        fullname: "",
        ic_number: "",
        enrollment_date: today,
    });

    const handleICChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setFormData((prev) => ({ ...prev, ic_number: value }));
        
        const detected = detectLevelFromIC(value);
        setDetectedLevel(detected);
        
        // Only auto-set if user hasn't manually overridden
        if (!userOverridden && detected) {
            setSelectedLevel(detected);
        }
    };

    const handleLevelChange = (value: string) => {
        setSelectedLevel(value);
        setUserOverridden(true);
    };

    const resetToAuto = () => {
        if (detectedLevel) {
            setSelectedLevel(detectedLevel);
            setUserOverridden(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({ fullname: "", ic_number: "", enrollment_date: today });
        setSelectedLevel("");
        setDetectedLevel(null);
        setUserOverridden(false);
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        
        if (!formData.fullname.trim()) {
            toast.error("Sila masukkan nama pelajar");
            return;
        }
        if (!formData.ic_number.trim() || formData.ic_number.length < 12) {
            toast.error("Sila masukkan No. Kad Pengenalan yang sah (12 digit)");
            return;
        }
        if (!selectedLevel) {
            toast.error("Sila pilih tingkatan pelajar");
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Mendaftar pelajar...");

        const payload = {
            fullname: formData.fullname.trim(),
            ic_number: formData.ic_number.trim(),
            enrollment_date: formData.enrollment_date,
            level: selectedLevel,
            class_id: null,
        };

        try {
            const res = await fetch("/api/admin/students", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || "Gagal menambah pelajar", { id: toastId });
                return;
            }

            toast.success("🎉 Pelajar berjaya ditambah!", { id: toastId });
            setOpen(false);
            resetForm();
            onSuccess();
        } catch {
            toast.error("⚠️ Ralat rangkaian. Sila cuba lagi.", { id: toastId });
        } finally {
            setLoading(false);
        }
    }

    const age = formData.ic_number.length === 12 ? getAgeFromIC(formData.ic_number) : null;
    const isPeralihan = detectedLevel && selectedLevel && detectedLevel !== selectedLevel;

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            setOpen(newOpen);
            if (!newOpen) resetForm();
        }}>
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

            <DialogContent className="sm:max-w-[500px] rounded-2xl border-2 border-border/50 bg-card shadow-2xl">
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
                                    disabled={loading}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="ic_number" className="text-sm font-medium flex items-center gap-1">
                                        <IdCard className="w-3 h-3" />
                                        No. Kad Pengenalan *
                                    </Label>
                                    <Input
                                        id="ic_number"
                                        name="ic_number"
                                        value={formData.ic_number}
                                        onChange={handleICChange}
                                        placeholder="010101-01-0101"
                                        required
                                        className="rounded-xl border-2 border-border/30 focus:border-primary/50 h-11 font-mono"
                                        maxLength={12}
                                        disabled={loading}
                                    />
                              
                                    {formData.ic_number.length === 12 && !detectedLevel && (
                                        <div className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1.5 rounded-md">
                                            <AlertCircle className="w-3 h-3" />
                                            <span>Umur tidak sesuai untuk Tingkatan 1-5 (umur {age} tahun)</span>
                                        </div>
                                    )}
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
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ACADEMIC SECTION */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-primary" />
                                <h3 className="font-semibold text-foreground">
                                    Maklumat Akademik
                                </h3>
                            </div>
                            {userOverridden && detectedLevel && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetToAuto}
                                    className="h-7 text-xs text-primary hover:text-primary/80 px-2"
                                    disabled={loading}
                                >
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Reset ke Auto (Tingkatan {detectedLevel})
                                </Button>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" />
                                Tingkatan *
                            </Label>
                            <Select 
                                value={selectedLevel} 
                                onValueChange={handleLevelChange} 
                                required
                                disabled={loading}
                            >
                                <SelectTrigger className={`w-full rounded-xl border-2 h-11 ${
                                    isPeralihan 
                                        ? "border-amber-400 bg-amber-50/50" 
                                        : "border-border/30 focus:border-primary/50"
                                }`}>
                                    <SelectValue placeholder="Pilih tingkatan..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-border">
                                    {[1, 2, 3, 4, 5].map((lvl) => (
                                        <SelectItem key={lvl} value={lvl.toString()} className="rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <span>Tingkatan {lvl}</span>
                                                {detectedLevel === lvl.toString() && (
                                                    <span className="text-xs text-green-600"></span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            
                            {/* Warning for peralihan/ulang tahun */}
                            {isPeralihan && (
                                <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 p-2.5 rounded-md mt-2">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-amber-800">
                                        <span className="font-medium">⚠️ Kelas Peralihan</span>
                                    </div>
                                </div>
                            )}

                            {/* Info when IC not detected */}
                            {formData.ic_number.length === 12 && !detectedLevel && (
                                <div className="flex items-start gap-2 text-xs bg-blue-50 border border-blue-200 p-2.5 rounded-md mt-2">
                                    <AlertCircle className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-blue-800">
                                        <span className="font-medium">ℹ️ Makluman</span>
                                        <p className="text-blue-700 mt-0.5">
                                            Umur pelajar ({age} tahun) tidak dalam julat Tingkatan 1-5 (13-17 tahun).
                                            Sila pastikan tingkatan yang dipilih adalah tepat.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
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