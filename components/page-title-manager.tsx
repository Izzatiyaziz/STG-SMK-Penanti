"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { getPageTitle } from "@/lib/page-titles";

export function PageTitleManager() {
  const pathname = usePathname();

  useEffect(() => {
    document.title = getPageTitle(pathname);
  }, [pathname]);

  return null;
}
