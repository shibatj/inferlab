import { notFound } from "next/navigation";
import { Playground } from "@/components/playground/Playground";
import { isLang } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function PlaygroundPage({ params }: PageProps<"/[lang]/playground">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = getDictionary(lang);

  return <Playground lang={lang} dict={dict.playground} errorText={dict.errors} />;
}
