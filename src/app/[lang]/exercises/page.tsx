import { notFound } from "next/navigation";
import { ExerciseList } from "@/components/exercises/ExerciseList";
import { isLang } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function ExercisesPage({ params }: PageProps<"/[lang]/exercises">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const { exercises } = getDictionary(lang);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{exercises.title}</h1>
      <p className="mt-3 mb-8 text-muted">{exercises.intro}</p>
      <ExerciseList lang={lang} dict={exercises} />
    </main>
  );
}
