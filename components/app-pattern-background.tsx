"use client";

import { usePathname } from "next/navigation";

export function AppPatternBackground({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();

	if (pathname === "/login") return children;

	return <div className="app-pattern-shell">{children}</div>;
}
