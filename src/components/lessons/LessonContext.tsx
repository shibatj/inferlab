"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Lang } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

interface LessonContextValue {
  lang: Lang;
  dict: Dictionary["lessons"];
  strategies: Dictionary["playground"]["strategy"];
}

const Context = createContext<LessonContextValue | null>(null);

/** Gives MDX components (which receive only their own props) the page language and strings. */
export function LessonProvider({ children, ...value }: LessonContextValue & { children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLesson(): LessonContextValue {
  const value = useContext(Context);
  if (!value) throw new Error("Lesson components must be rendered inside <LessonProvider>");
  return value;
}
