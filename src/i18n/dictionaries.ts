import type { Lang } from "./config";
import { en, type Dictionary } from "./en";
import { th } from "./th";

const dictionaries: Record<Lang, Dictionary> = { th, en };

export const getDictionary = (lang: Lang): Dictionary => dictionaries[lang];

export type { Dictionary };

/** Fills `{name}` placeholders: fmt("Step {k}", { k: 2 }) → "Step 2". */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** CFs are shown with two decimals; trailing zeros are dropped (1 → "1", 0.40 → "0.4"). */
export const formatCf = (cf: number): string => String(Number(cf.toFixed(2)));
