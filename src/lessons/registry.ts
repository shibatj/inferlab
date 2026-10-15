import type { Bilingual } from "@/i18n/config";

export interface Lesson {
  slug: string;
  title: Bilingual;
  summary: Bilingual;
  /** Ids of every quiz in the lesson, in both languages. A test checks the MDX files match. */
  quizzes: string[];
}

/** In the suggested order. Every lesson is open; the order is only a recommendation (Q25). */
export const LESSONS: Lesson[] = [
  {
    slug: "what-is-an-expert-system",
    title: { th: "Expert System คืออะไร", en: "What is an expert system?" },
    summary: {
      th: "ส่วนประกอบ ความต่างจากโปรแกรมทั่วไป และเมื่อไหร่ควรใช้",
      en: "Its parts, how it differs from ordinary programs, and when to use one.",
    },
    quizzes: ["l1-q1", "l1-q2", "l1-q3"],
  },
  {
    slug: "knowledge-representation",
    title: { th: "การแทนความรู้", en: "Knowledge representation" },
    summary: {
      th: "Production rules, semantic networks และ frames",
      en: "Production rules, semantic networks and frames.",
    },
    quizzes: ["l2-q1", "l2-q2", "l2-q3"],
  },
  {
    slug: "forward-and-backward-chaining",
    title: { th: "Forward และ Backward Chaining", en: "Forward and backward chaining" },
    summary: {
      th: "สองทิศทางของการอนุมาน และวิธีเลือกใช้",
      en: "The two directions of inference and how to choose between them.",
    },
    quizzes: ["l3-p1", "l3-q1", "l3-q2", "l3-q3"],
  },
  {
    slug: "conflict-resolution",
    title: { th: "Conflict Resolution", en: "Conflict resolution" },
    summary: {
      th: "เมื่อหลายกฎ fire ได้พร้อมกัน จะเลือกกฎไหน",
      en: "When several rules can fire, which one goes first?",
    },
    quizzes: ["l4-p1", "l4-p2", "l4-q1", "l4-q2"],
  },
  {
    slug: "uncertainty",
    title: { th: "ความไม่แน่นอน", en: "Reasoning under uncertainty" },
    summary: {
      th: "Certainty factors, Bayes และ fuzzy logic",
      en: "Certainty factors, Bayes' rule and fuzzy logic.",
    },
    quizzes: ["l5-q1", "l5-q2", "l5-q3", "l5-q4"],
  },
  {
    slug: "knowledge-acquisition-and-case-studies",
    title: { th: "การได้มาซึ่งความรู้ และกรณีศึกษา", en: "Knowledge acquisition and case studies" },
    summary: {
      th: "Knowledge engineering, คอขวด และระบบจริง: DENDRAL, MYCIN, XCON",
      en: "Knowledge engineering, its bottleneck, and real systems: DENDRAL, MYCIN, XCON.",
    },
    quizzes: ["l6-q1", "l6-q2", "l6-q3"],
  },
];

export const lessonBySlug = (slug: string) => LESSONS.find((l) => l.slug === slug);
