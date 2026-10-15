import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExerciseWorkbench } from "@/components/exercises/ExerciseWorkbench";
import { EXERCISES, exerciseById } from "@/exercises/exercises";
import { isLang } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export function generateStaticParams() {
  return EXERCISES.map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/exercises/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  const ex = exerciseById(id);
  if (!isLang(lang) || !ex) return {};
  return { title: `${ex.title[lang]} — InferLab` };
}

export default async function ExercisePage({ params }: PageProps<"/[lang]/exercises/[id]">) {
  const { lang, id } = await params;
  const ex = exerciseById(id);
  if (!isLang(lang) || !ex) notFound();
  const dict = getDictionary(lang);

  return (
    <main className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-line bg-panel px-6 py-3">
        <Link href={`/${lang}/exercises`} className="text-sm text-muted hover:text-fg">
          ← {dict.exercises.title}
        </Link>
        <h1 className="font-semibold">{ex.title[lang]}</h1>
        <span className="rounded bg-subtle px-2 py-0.5 text-xs text-muted">{dict.exercises.mode[ex.mode]}</span>
      </div>
      <ExerciseWorkbench id={id} lang={lang} dict={dict.exercises} errorText={dict.errors} />
    </main>
  );
}
