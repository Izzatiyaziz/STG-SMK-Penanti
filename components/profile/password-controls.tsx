"use client";

import { Check, Circle, Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = {
    value: string;
    onChange: (value: string) => void;
    show: boolean;
    onToggle: () => void;
    required?: boolean;
    placeholder?: string;
    autoComplete?: string;
};

export function PasswordInput({
    value,
    onChange,
    show,
    onToggle,
    required,
    placeholder,
    autoComplete,
}: PasswordInputProps) {
    return (
        <div className="relative">
            <Input
                type={show ? "text" : "password"}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                required={required}
                placeholder={placeholder}
                autoComplete={autoComplete}
                className="pr-10"
            />
            <button
                type="button"
                onClick={onToggle}
                aria-label={show ? "Sembunyikan kata laluan" : "Tunjukkan kata laluan"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
            >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    );
}

export function getPasswordChecks(password: string) {
    return {
        hasLength: password.length >= 8,
        hasUpper: /[A-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSymbol: /[^A-Za-z0-9]/.test(password),
    };
}

export function isStrongPassword(password: string) {
    const checks = getPasswordChecks(password);
    return checks.hasLength && checks.hasUpper && checks.hasNumber && checks.hasSymbol;
}

export function PasswordRequirements({ password }: { password: string }) {
    const checks = getPasswordChecks(password);
    const items = [
        { met: checks.hasLength, label: "Sekurang-kurangnya 8 aksara" },
        { met: checks.hasUpper, label: "Sekurang-kurangnya 1 huruf besar" },
        { met: checks.hasNumber, label: "Sekurang-kurangnya 1 nombor" },
        { met: checks.hasSymbol, label: "Sekurang-kurangnya 1 simbol, contoh @, ! atau #" },
    ];

    return (
        <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs">
            <p className="mb-2 font-semibold text-foreground">Kata laluan baharu perlu memenuhi syarat ini:</p>
            <ul className="space-y-1.5">
                {items.map((item) => (
                    <li
                        key={item.label}
                        className={cn(
                            "flex items-start gap-2",
                            item.met ? "font-medium text-emerald-700" : "text-muted-foreground"
                        )}
                    >
                        {item.met ? (
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        ) : (
                            <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        )}
                        <span>{item.label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
