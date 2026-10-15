"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Lang } from "@/i18n/config";

/** Links to the same page in the other language and remembers the choice for visits to `/`. */
export function LangSwitch({ lang, label, title }: { lang: Lang; label: string; title: string }) {
  const pathname = usePathname();
  const other: Lang = lang === "th" ? "en" : "th";
  const href = pathname.replace(/^\/(th|en)(?=\/|$)/, `/${other}`);

  return (
    <Link
      href={href}
      title={title}
      onClick={() => {
        document.cookie = `lang=${other}; path=/; max-age=31536000; samesite=lax`;
      }}
      className="rounded-md border border-line px-2.5 py-1 text-sm text-muted hover:bg-subtle hover:text-fg"
    >
      {label}
    </Link>
  );
}
