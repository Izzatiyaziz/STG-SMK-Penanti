"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
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
    GraduationCap,
    RefreshCw,
    AlertCircle,
} from "lucide-react";
import { getMalaysiaDateInputValue } from "@/lib/date-utils";

interface AddStudentDialogProps {
    onSuccess: () => void;
    classes: Array<{ id: string; name: string }>;
    children?: ReactNode;
}

const normalizeIcDigits = (value: string) => value.replace(/\D/g, "");

const normalizeSpaces = (value: string) => value.replace(/\s+/g, " ").trim();

const isWordsOnlyName = (value: string) => {
    const normalized = normalizeSpaces(value);
    if (!normalized) return false;
    return /^[\p{L}]+(?:[/'\u2019][\p{L}]+)*(?: [\p{L}]+(?:[/'\u2019][\p{L}]+)*)*$/u.test(
        normalized
    );
};

const formatIcNumber = (value: string) => {
    const digits = normalizeIcDigits(value);
    if (digits.length <= 6) return digits;
    if (digits.length <= 8) return `${digits.slice(0, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 12)}`;
};

// Helper untuk detect tingkatan dari IC
const detectLevelFromIC = (ic: string): string | null => {
    const digits = normalizeIcDigits(ic);
    if (digits.length < 12) return null;
    const yearPart = parseInt(digits.substring(0, 2));
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
    const digits = normalizeIcDigits(ic);
    if (digits.length < 12) return null;
    const yearPart = parseInt(digits.substring(0, 2));
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
    const fullnameRef = useRef<HTMLInputElement>(null);
    const [fullnameTouched, setFullnameTouched] = useState(false);
    const [icTouched, setIcTouched] = useState(false);
    const [enrollmentDateTouched, setEnrollmentDateTouched] = useState(false);
    const [levelTouched, setLevelTouched] = useState(false);
    
    const [selectedLevel, setSelectedLevel] = useState<string>("");
    const [detectedLevel, setDetectedLevel] = useState<string | null>(null);
    const [userOverridden, setUserOverridden] = useState(false);
    const today = getMalaysiaDateInputValue();
    
    const [formData, setFormData] = useState({
        fullname: "",
        ic_number: "",
        enrollment_date: today,
    });

    const handleICChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        const formatted = formatIcNumber(value);
        setFormData((prev) => ({ ...prev, ic_number: formatted }));
        
        const detected = detectLevelFromIC(formatted);
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
        const nextValue = name === "fullname" ? value.toUpperCase() : value;
        if (name === "fullname") setFullnameTouched(true);
        setFormData((prev) => ({ ...prev, [name]: nextValue }));
    };

    const resetForm = () => {
        setFormData({ fullname: "", ic_number: "", enrollment_date: today });
        setSelectedLevel("");
        setDetectedLevel(null);
        setUserOverridden(false);
        setFullnameTouched(false);
        setIcTouched(false);
        setEnrollmentDateTouched(false);
        setLevelTouched(false);
    };

    useEffect(() => {
        if (!open) return;
        const id = setTimeout(() => fullnameRef.current?.focus(), 0);
        return () => clearTimeout(id);
    }, [open]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        setFullnameTouched(true);
        setIcTouched(true);
        setEnrollmentDateTouched(true);
        setLevelTouched(true);
         
        const fullnameTrimmed = formData.fullname.trim();
        const icDigits = normalizeIcDigits(formData.ic_number);
        const enrollmentDate = formData.enrollment_date;

        if (!fullnameTrimmed) return;
        if (!isWordsOnlyName(fullnameTrimmed)) return;
        if (icDigits.length !== 12) return;
        if (!selectedLevel) return;
        if (!enrollmentDate) return;

        setLoading(true);
        const toastId = toast.loading("Mendaftar pelajar...");

        const payload = {
            fullname: fullnameTrimmed.toUpperCase(),
            ic_number: formatIcNumber(formData.ic_number.trim()),
            enrollment_date: enrollmentDate,
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
            resetForm();
            onSuccess();
            // Kekalkan dialog terbuka untuk tambah pelajar seterusnya
            setTimeout(() => fullnameRef.current?.focus(), 0);
        } catch {
            toast.error("⚠️ Ralat rangkaian. Sila cuba lagi.", { id: toastId });
        } finally {
            setLoading(false);
        }
    }

    const age = normalizeIcDigits(formData.ic_number).length === 12 ? getAgeFromIC(formData.ic_number) : null;
    const isPeralihan = detectedLevel && selectedLevel && detectedLevel !== selectedLevel;
    const fullnameError =
        fullnameTouched && !formData.fullname.trim()
            ? "Nama penuh wajib diisi."
            : fullnameTouched && formData.fullname.trim() && !isWordsOnlyName(formData.fullname)
                ? "Nama penuh hanya boleh mengandungi huruf dan '/'"
            : "";

    const icDigits = normalizeIcDigits(formData.ic_number);
    const icError =
        icTouched && icDigits.length === 0
            ? "No. Kad Pengenalan wajib diisi."
            : icTouched && icDigits.length > 0 && icDigits.length !== 12
                ? "No. Kad Pengenalan mesti 12 digit."
                : "";

    const enrollmentDateError =
        enrollmentDateTouched && !formData.enrollment_date
            ? "Tarikh daftar wajib diisi."
            : "";

    const levelError =
        levelTouched && !selectedLevel
            ? "Tingkatan wajib dipilih."
            : "";

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
                        Isi maklumat pelajar. Penempatan kelas akan dilakukan oleh Guru Kelas.
                    </p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* PERSONAL INFORMATION SECTION */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-primary" />
                            <h3 className="font-semibold text-foreground">
                                Maklumat Pelajar
                            </h3>
                        </div>

                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullname" className="text-sm font-medium flex items-center gap-1">
                                    Nama Penuh <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    ref={fullnameRef}
                                    id="fullname"
                                    name="fullname"
                                    value={formData.fullname}
                                    onChange={handleInputChange}
                                    onBlur={() => setFullnameTouched(true)}
                                    placeholder="Contoh: ALI BIN AHMAD"
                                    required
                                    aria-invalid={Boolean(fullnameError)}
                                    className={`rounded-xl border-2 focus:border-primary/50 h-11 ${
                                        fullnameError ? "border-red-400" : "border-border/30"
                                    }`}
                                    disabled={loading}
                                />
                                {fullnameError && (
                                    <div className="flex items-start gap-2 text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1.5 rounded-md">
                                        <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                                        <span className="leading-4">{fullnameError}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="ic_number" className="text-sm font-medium flex items-center gap-1">
                                        No. Kad Pengenalan <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="ic_number"
                                        name="ic_number"
                                        value={formData.ic_number}
                                        onChange={handleICChange}
                                        onBlur={() => setIcTouched(true)}
                                        placeholder="010101-01-0101"
                                        required
                                        aria-invalid={Boolean(icError)}
                                        className={`rounded-xl border-2 focus:border-primary/50 h-11 font-mono ${
                                            icError ? "border-red-400" : "border-border/30"
                                        }`}
                                        maxLength={14}
                                        disabled={loading}
                                    />
                                    {icError && (
                                        <div className="flex items-start gap-2 text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1.5 rounded-md">
                                            <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                                            <span className="leading-4">{icError}</span>
                                        </div>
                                    )}
                              
                                    {normalizeIcDigits(formData.ic_number).length === 12 && !detectedLevel && (
                                        <div className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1.5 rounded-md">
                                            <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                                            <span>Umur tidak sesuai untuk Tingkatan 1-5</span>
                                        </div>
                                        
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="enrollment_date" className="text-sm font-medium flex items-center gap-1">
                                        Tarikh Daftar <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="enrollment_date"
                                        name="enrollment_date"
                                        type="date"
                                        max={today}
                                        value={formData.enrollment_date}
                                        onChange={handleInputChange}
                                        onBlur={() => setEnrollmentDateTouched(true)}
                                        required
                                        aria-invalid={Boolean(enrollmentDateError)}
                                        className={`rounded-xl border-2 focus:border-primary/50 h-11 ${
                                            enrollmentDateError ? "border-red-400" : "border-border/30"
                                        }`}
                                        disabled={loading}
                                    />
                                    {enrollmentDateError && (
                                        <div className="flex items-start gap-2 text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1.5 rounded-md">
                                            <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                                            <span className="leading-4">{enrollmentDateError}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ACADEMIC SECTION */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
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
                                Tingkatan <span className="text-red-500">*</span>
                            </Label>
                            <Select 
                                value={selectedLevel} 
                                onValueChange={handleLevelChange} 
                                required
                                disabled={loading}
                            >
                                <SelectTrigger
                                    onBlur={() => setLevelTouched(true)}
                                    className={`w-full rounded-xl border-2 h-11 ${
                                        levelError
                                            ? "border-red-400"
                                            : isPeralihan 
                                                ? "border-amber-400 bg-amber-50/50" 
                                                : "border-border/30 focus:border-primary/50"
                                    }`}
                                >
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
                            {levelError && (
                                <div className="flex items-start gap-2 text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1.5 rounded-md">
                                    <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                                    <span className="leading-4">{levelError}</span>
                                </div>
                            )}
                            
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
                            {normalizeIcDigits(formData.ic_number).length === 12 && !detectedLevel && (
                                <div className="flex items-start gap-2 text-xs bg-red-50 border border-red-200 p-2.5 rounded-md mt-2">
                                    <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-red-800">
                                        <span className="font-bold">ℹ️ Makluman</span>
                                        <p className="text-red-700 mt-0.5">
                                            Umur pelajar ({age} tahun) bukan dalam julat Tingkatan 1-5 (13-17 tahun).
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
