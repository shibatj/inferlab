import { notFound } from "next/navigation";
import { LessonList } from "@/components/lessons/LessonNav";
import { isLang } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function LessonsPage({ params }: PageProps<"/[lang]/lessons">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const { lessons } = getDictionary(lang);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{lessons.title}</h1>
      <p className="mt-3 mb-8 text-muted">{lessons.intro}</p>
      <LessonList lang={lang} dict={lessons} />
    </main>
  );
}
