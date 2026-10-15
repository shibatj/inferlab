export const LANGS = ["th", "en"] as const;
export type Lang = (typeof LANGS)[number];

export const isLang = (value: string): value is Lang => (LANGS as readonly string[]).includes(value);

/** Text that exists in both languages. */
export type Bilingual = Record<Lang, string>;
