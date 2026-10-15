import type { Metadata } from "next";
import { Geist_Mono, Inter, Noto_Sans_Thai } from "next/font/google";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { LANGS, isLang } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const thai = Noto_Sans_Thai({ subsets: ["thai"], variable: "--font-thai" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

// Saved choice, else the OS preference. Runs before first paint so there is no flash.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const { meta } = getDictionary(lang);
  return { title: meta.title, description: meta.description };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <html
      lang={lang}
      data-theme="light"
      suppressHydrationWarning
      className={`${inter.variable} ${thai.variable} ${mono.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans">
        <div className="touch-notice min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-2xl font-semibold">{dict.touch.title}</p>
          <p className="max-w-md text-muted">{dict.touch.body}</p>
        </div>
        <div className="app-shell flex min-h-screen flex-col">
          <Header lang={lang} dict={dict} />
          {children}
        </div>
      </body>
    </html>
  );
}
