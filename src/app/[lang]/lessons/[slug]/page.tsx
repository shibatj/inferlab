import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonProvider } from "@/components/lessons/LessonContext";
import { LessonSidebar } from "@/components/lessons/LessonNav";
import { isLang } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { LESSONS, lessonBySlug } from "@/lessons/registry";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/lessons/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const lesson = lessonBySlug(slug);
  if (!isLang(lang) || !lesson) return {};
  return { title: `${lesson.title[lang]} — InferLab`, description: lesson.summary[lang] };
}

export default async function LessonPage({ params }: PageProps<"/[lang]/lessons/[slug]">) {
  const { lang, slug } = await params;
  const lesson = lessonBySlug(slug);
  if (!isLang(lang) || !lesson) notFound();
  const dict = getDictionary(lang);
  const { default: Content } = await import(`@/content/lessons/${lang}/${slug}.mdx`);

  const index = LESSONS.indexOf(lesson);
  const prev = LESSONS[index - 1];
  const next = LESSONS[index + 1];

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-[220px_1fr] gap-10 px-6 py-10">
      <aside>
        <LessonSidebar lang={lang} current={slug} dict={dict.lessons} />
      </aside>
      <main className="max-w-3xl text-[16.5px]">
        <LessonProvider lang={lang} dict={dict.lessons} strategies={dict.playground.strategy}>
          <article>
            <Content />
          </article>
        </LessonProvider>
        <nav className="mt-14 flex justify-between gap-4 border-t border-line pt-6 text-sm">
          {prev ? (
            <Link href={`/${lang}/lessons/${prev.slug}`} className="hover:text-accent">
              ← {dict.lessons.prev}: {prev.title[lang]}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/${lang}/lessons/${next.slug}`} className="text-right hover:text-accent">
              {dict.lessons.next}: {next.title[lang]} →
            </Link>
          )}
        </nav>
      </main>
    </div>
  );
}
