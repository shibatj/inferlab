import type { Bilingual } from "@/i18n/config";
import type { TestCase } from "./grader";

export interface Exercise {
  id: string;
  title: Bilingual;
  /** Paragraphs separated by blank lines. */
  task: Bilingual;
  mode: "forward" | "backward";
  starter: string;
  tests: TestCase[];
  /** Shown only as pass/fail, so rules cannot be tailored to them. */
  hidden: TestCase[];
}

// Reference solutions live in exercises.test.ts so they never ship to the browser.
export const EXERCISES: Exercise[] = [
  {
    id: "animal-identifier",
    title: { th: "จำแนกสัตว์", en: "Identify the animal" },
    mode: "forward",
    task: {
      th: `เขียนกฎให้ระบบระบุ cheetah, tiger และ zebra ได้ด้วย forward chaining

ลักษณะที่ test จะใส่ให้: has_hair, gives_milk, eats_meat, has_hoofs, tawny_color, dark_spots, black_stripes

ความรู้: สัตว์ที่มีขนหรือให้นมเป็น mammal — mammal ที่กินเนื้อเป็น carnivore — mammal ที่มีกีบเป็น ungulate — carnivore สีน้ำตาลอ่อนมีจุดคือ cheetah — carnivore สีน้ำตาลอ่อนมีลายคือ tiger — ungulate ที่มีลายคือ zebra`,
      en: `Write rules so forward chaining can identify a cheetah, a tiger and a zebra.

Features the tests will supply: has_hair, gives_milk, eats_meat, has_hoofs, tawny_color, dark_spots, black_stripes

Knowledge: an animal with hair, or that gives milk, is a mammal. A mammal that eats meat is a carnivore. A mammal with hoofs is an ungulate. A tawny carnivore with dark spots is a cheetah. A tawny carnivore with black stripes is a tiger. An ungulate with black stripes is a zebra.`,
    },
    starter: `# Rules only: the tests supply the facts.
rule A1: IF has_hair THEN mammal
`,
    tests: [
      { facts: ["has_hair", "eats_meat", "tawny_color", "dark_spots"], expect: { cheetah: true, tiger: false } },
      { facts: ["gives_milk", "has_hoofs", "black_stripes"], expect: { zebra: true, tiger: false } },
    ],
    hidden: [
      { facts: ["has_hair", "eats_meat", "tawny_color", "black_stripes"], expect: { tiger: true, cheetah: false, zebra: false } },
      { facts: ["has_hair", "tawny_color", "dark_spots"], expect: { cheetah: false } },
      { facts: ["gives_milk", "eats_meat", "tawny_color", "black_stripes"], expect: { tiger: true } },
      { facts: ["has_hair", "has_hoofs", "eats_meat", "black_stripes"], expect: { zebra: true, tiger: false } },
    ],
  },
  {
    id: "car-diagnosis",
    title: { th: "วินิจฉัยรถสตาร์ทไม่ติด", en: "Diagnose a car that won't start" },
    mode: "backward",
    task: {
      th: `เขียนกฎให้ backward chaining พิสูจน์การวินิจฉัย battery_dead, out_of_fuel และ starter_faulty ได้ถูกต้อง

อาการที่ test จะใส่ให้: lights_dim, clicking_sound, no_lights, lights_ok, no_crank, engine_cranks, fuel_gauge_empty

ความรู้: แบตหมด (battery_dead) เมื่อไฟหรี่และมีเสียงแชะ ๆ หรือเมื่อไฟไม่ติดเลย — น้ำมันหมด (out_of_fuel) เมื่อเครื่องหมุนแต่เข็มน้ำมันอยู่ที่ E — สตาร์ทเตอร์เสีย (starter_faulty) เมื่อไฟปกติแต่เครื่องไม่หมุน`,
      en: `Write rules so backward chaining correctly proves the diagnoses battery_dead, out_of_fuel and starter_faulty.

Symptoms the tests will supply: lights_dim, clicking_sound, no_lights, lights_ok, no_crank, engine_cranks, fuel_gauge_empty

Knowledge: the battery is dead when the lights are dim and there is a clicking sound, or when there are no lights at all. The car is out of fuel when the engine cranks but the fuel gauge reads empty. The starter is faulty when the lights are fine but the engine does not crank.`,
    },
    starter: `# Rules only: the tests supply the symptoms.
rule C1: IF lights_dim AND clicking_sound THEN battery_dead
`,
    tests: [
      { facts: ["lights_dim", "clicking_sound"], expect: { battery_dead: true, starter_faulty: false } },
      { facts: ["engine_cranks", "fuel_gauge_empty"], expect: { out_of_fuel: true, battery_dead: false } },
    ],
    hidden: [
      { facts: ["no_lights"], expect: { battery_dead: true } },
      { facts: ["lights_ok", "no_crank"], expect: { starter_faulty: true, battery_dead: false } },
      { facts: ["lights_dim"], expect: { battery_dead: false } },
      { facts: ["engine_cranks"], expect: { out_of_fuel: false } },
    ],
  },
  {
    id: "combine-evidence",
    title: { th: "รวมหลักฐานด้วย CF", en: "Combine evidence with CFs" },
    mode: "backward",
    task: {
      th: `แพทย์บอกว่า: มีไข้ (fever) อย่างเดียวบ่งชี้ไข้หวัดใหญ่ (flu) ด้วยความเชื่อ 0.6 และไอ (cough) อย่างเดียวบ่งชี้ด้วยความเชื่อ 0.5 เมื่อมีทั้งสองอาการ หลักฐานต้องรวมกันตามสูตร MYCIN

เขียนกฎให้ flu มี CF 0.6 เมื่อมีแค่ไข้, 0.5 เมื่อมีแค่ไอ และ 0.8 เมื่อมีทั้งคู่ (ยอมให้คลาดเคลื่อน ±0.05) — test บางข้ออาจใส่อาการที่มี CF ไม่เต็ม 1`,
      en: `A doctor says: fever alone suggests flu with belief 0.6, and cough alone suggests it with belief 0.5. When both are present, the evidence must combine using MYCIN's formula.

Write rules so that flu has CF 0.6 with fever only, 0.5 with cough only, and 0.8 with both (within ±0.05). Some tests may supply symptoms with a CF below 1.`,
    },
    starter: `# Rules only. Use CF on rules.
rule F1: IF fever AND cough THEN flu CF 0.8
`,
    tests: [
      { facts: ["fever"], expect: { flu: 0.6 } },
      { facts: ["cough"], expect: { flu: 0.5 } },
    ],
    hidden: [
      { facts: ["fever", "cough"], expect: { flu: 0.8 } },
      { facts: ["fever CF 0.5"], expect: { flu: 0.3 } },
      { facts: [], expect: { flu: false } },
    ],
  },
  {
    id: "loan-approval",
    title: { th: "อนุมัติสินเชื่อ", en: "Loan approval" },
    mode: "forward",
    task: {
      th: `เขียนกฎอนุมัติสินเชื่อด้วย forward chaining โดยใช้ข้อสรุประหว่างทาง

ข้อมูลที่ test จะใส่ให้: stable_income, good_credit_history, low_debt, has_collateral, large_amount

นโยบาย: ผู้กู้น่าเชื่อถือ (creditworthy) เมื่อมีรายได้มั่นคงและประวัติเครดิตดี — สินเชื่ออนุมัติ (approve) เมื่อผู้กู้น่าเชื่อถือ และมีหนี้ต่ำหรือมีหลักประกัน — สินเชื่อที่อนุมัติแล้วแต่เป็นวงเงินสูงต้องส่งให้คนตรวจ (manual_review)`,
      en: `Write loan-approval rules for forward chaining, using intermediate conclusions.

Data the tests will supply: stable_income, good_credit_history, low_debt, has_collateral, large_amount

Policy: an applicant is creditworthy with a stable income and a good credit history. A loan is approved (approve) when the applicant is creditworthy and either has low debt or offers collateral. An approved loan for a large amount also needs manual review (manual_review).`,
    },
    starter: `# Rules only: the tests supply the applicant's data.
`,
    tests: [
      { facts: ["stable_income", "good_credit_history", "low_debt"], expect: { approve: true, manual_review: false } },
      { facts: ["stable_income", "low_debt"], expect: { approve: false } },
    ],
    hidden: [
      { facts: ["stable_income", "good_credit_history", "has_collateral"], expect: { approve: true } },
      { facts: ["stable_income", "good_credit_history", "low_debt", "large_amount"], expect: { approve: true, manual_review: true } },
      { facts: ["good_credit_history", "has_collateral", "low_debt"], expect: { approve: false } },
      { facts: ["stable_income", "good_credit_history", "large_amount"], expect: { approve: false, manual_review: false } },
    ],
  },
];

export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id);

/** Progress id stored alongside quiz ids when an exercise passes every test. */
export const exerciseProgressId = (id: string) => `ex-${id}`;
