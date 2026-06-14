"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function PrincipalRouteGuard({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const isAllowedRoute = pathname === "/principal/dashboard" || pathname === "/principal/profile";

	useEffect(() => {
		if (!isAllowedRoute) router.replace("/principal/dashboard");
	}, [isAllowedRoute, router]);

	return isAllowedRoute ? children : null;
}
