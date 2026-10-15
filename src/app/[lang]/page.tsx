import Link from "next/link";
import { notFound } from "next/navigation";
import { isLang } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const { home } = getDictionary(lang);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">{home.heading}</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{home.intro}</p>
      <Link
        href={`/${lang}/playground`}
        className="mt-8 inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:opacity-90"
      >
        {home.cta} →
      </Link>

      <div className="mt-14 grid grid-cols-2 gap-4">
        {home.features.map((f) => (
          <div key={f.title} className="rounded-xl border border-line bg-panel p-5">
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{f.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted">{home.lessonsSoon}</p>
    </main>
  );
}
