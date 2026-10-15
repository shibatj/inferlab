import type { Strategy } from "@/engine";
import type { Bilingual } from "@/i18n/config";

/** A fact the learner switches on or off with a checkbox instead of editing the source. */
export interface Toggle {
  fact: string;
  label: Bilingual;
  checked: boolean;
}

export interface Example {
  id: string;
  title: Bilingual;
  description: Bilingual;
  mode: "forward" | "backward";
  strategy?: Strategy;
  /** Goals offered in backward mode; the first is selected on load. */
  goals?: string[];
  source: string;
  toggles?: Toggle[];
}

const ANIMAL = `# Animal identification (Winston, 1992)
# Edit the facts below, then run forward chaining.
fact has_hair
fact eats_meat
fact tawny_color
fact dark_spots

rule Z1: IF has_hair THEN mammal
rule Z2: IF gives_milk THEN mammal
rule Z3: IF has_feathers THEN bird
rule Z4: IF flies AND lays_eggs THEN bird
rule Z5: IF mammal AND eats_meat THEN carnivore
rule Z6: IF mammal AND pointed_teeth AND claws AND forward_eyes THEN carnivore
rule Z7: IF mammal AND has_hoofs THEN ungulate
rule Z8: IF mammal AND chews_cud THEN ungulate
rule Z9: IF carnivore AND tawny_color AND dark_spots THEN cheetah
rule Z10: IF carnivore AND tawny_color AND black_stripes THEN tiger
rule Z11: IF ungulate AND long_neck AND long_legs AND dark_spots THEN giraffe
rule Z12: IF ungulate AND black_stripes THEN zebra
rule Z13: IF bird AND does_not_fly AND long_neck AND long_legs AND black_and_white THEN ostrich
rule Z14: IF bird AND does_not_fly AND swims AND black_and_white THEN penguin
rule Z15: IF bird AND good_flier THEN albatross
`;

const CAR = `# Car won't start
# Tick the symptoms you observe, choose a diagnosis, then run backward chaining.
rule C1: IF lights_dim AND clicking_sound THEN battery_dead CF 0.9
rule C2: IF no_lights THEN battery_dead CF 0.8
rule C3: IF lights_ok AND no_crank AND clicking_sound THEN starter_faulty CF 0.7
rule C4: IF engine_cranks AND fuel_gauge_empty THEN out_of_fuel CF 0.95
rule C5: IF engine_cranks AND smell_fuel THEN engine_flooded CF 0.6
`;

const MYCIN = `# Mini-MYCIN: identify the organism
# A simplified teaching example in the style of MYCIN. Not medical advice.
fact gram_negative CF 0.9
fact rod_shaped CF 0.8
fact anaerobic CF 0.6
fact grows_in_blood CF 0.7
fact patient_compromised CF 0.5

rule M1: IF gram_negative AND rod_shaped AND anaerobic THEN bacteroides CF 0.6
rule M2: IF gram_negative AND rod_shaped AND grows_in_blood THEN pseudomonas CF 0.4
rule M3: IF patient_compromised AND gram_negative THEN pseudomonas CF 0.3
rule M4: IF gram_positive AND coccus AND grows_in_chains THEN streptococcus CF 0.7
`;

const symptom = (fact: string, th: string, en: string, checked = false): Toggle => ({
  fact,
  label: { th, en },
  checked,
});

export const EXAMPLES: Example[] = [
  {
    id: "animal",
    title: { th: "จำแนกสัตว์", en: "Animal identification" },
    description: {
      th: "ตัวอย่างคลาสสิกของ forward chaining: จากลักษณะที่สังเกตได้ ไล่สรุปจนรู้ว่าเป็นสัตว์อะไร",
      en: "The classic forward-chaining example: from observed features, infer which animal it is.",
    },
    mode: "forward",
    strategy: "order",
    source: ANIMAL,
  },
  {
    id: "car",
    title: { th: "รถสตาร์ทไม่ติด", en: "Car troubleshooting" },
    description: {
      th: "Backward chaining: เลือกการวินิจฉัยที่ต้องการตรวจ แล้วดูว่าอาการที่ติ๊กไว้สนับสนุนหรือไม่",
      en: "Backward chaining: pick a diagnosis to check and see whether the ticked symptoms support it.",
    },
    mode: "backward",
    goals: ["battery_dead", "starter_faulty", "out_of_fuel", "engine_flooded"],
    source: CAR,
    toggles: [
      symptom("lights_dim", "ไฟหน้าหรี่", "Headlights are dim", true),
      symptom("no_lights", "ไฟไม่ติดเลย", "No lights at all"),
      symptom("lights_ok", "ไฟสว่างปกติ", "Lights are normal"),
      symptom("clicking_sound", "ได้ยินเสียงแชะ ๆ ตอนบิดกุญแจ", "Clicking sound when turning the key", true),
      symptom("no_crank", "เครื่องยนต์ไม่หมุน", "Engine does not crank"),
      symptom("engine_cranks", "เครื่องยนต์หมุนแต่ไม่ติด", "Engine cranks but won't start"),
      symptom("fuel_gauge_empty", "เข็มน้ำมันอยู่ที่ E", "Fuel gauge reads empty"),
      symptom("smell_fuel", "ได้กลิ่นน้ำมัน", "Smell of fuel"),
    ],
  },
  {
    id: "mycin",
    title: { th: "Mini-MYCIN", en: "Mini-MYCIN" },
    description: {
      th: "Certainty factors แบบ MYCIN: หลายกฎสนับสนุนข้อสรุปเดียวกัน แล้ว CF ถูกรวมเข้าด้วยกัน",
      en: "MYCIN-style certainty factors: several rules support one conclusion and their CFs combine.",
    },
    mode: "backward",
    goals: ["pseudomonas", "bacteroides", "streptococcus"],
    source: MYCIN,
  },
];

/** The source the engine runs: the editor text plus one `fact` line per ticked checkbox. */
export function withToggles(source: string, toggles: Toggle[] | undefined, checked: Set<string>): string {
  const extra = (toggles ?? []).filter((t) => checked.has(t.fact)).map((t) => `fact ${t.fact}`);
  return extra.length ? `${source}\n${extra.join("\n")}\n` : source;
}
