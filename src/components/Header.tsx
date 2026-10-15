import Link from "next/link";
import type { Lang } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { LangSwitch } from "./LangSwitch";
import { ThemeToggle } from "./ThemeToggle";

export function Header({ lang, dict }: { lang: Lang; dict: Dictionary }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-panel/90 backdrop-blur">
      <div className="flex h-14 items-center gap-6 px-6">
        <Link href={`/${lang}`} className="text-lg font-bold tracking-tight text-accent">
          InferLab
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href={`/${lang}`} className="text-muted hover:text-fg">
            {dict.nav.home}
          </Link>
          <Link href={`/${lang}/playground`} className="text-muted hover:text-fg">
            {dict.nav.playground}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LangSwitch lang={lang} label={dict.lang.switchTo} title={dict.lang.switchLabel} />
          <ThemeToggle label={dict.theme.toggle} />
        </div>
      </div>
    </header>
  );
}
