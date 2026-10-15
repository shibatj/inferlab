/**
 * A one-input Mamdani fuzzy system for the lesson widget:
 * body temperature (°C) → fever risk (0–100).
 */

/** Trapezoid membership: rises from a to b, flat to c, falls to d. a = b or c = d gives a shoulder. */
export interface Trapezoid {
  a: number;
  b: number;
  c: number;
  d: number;
}

export function membership(x: number, { a, b, c, d }: Trapezoid): number {
  if (x < a || x > d) return 0;
  if (x < b) return (x - a) / (b - a);
  if (x <= c) return 1;
  return (d - x) / (d - c);
}

export type Level = "low" | "medium" | "high";

export const TEMPERATURE = { min: 35, max: 42 };
export const RISK = { min: 0, max: 100 };

/** Input sets, keyed by the output level each one's rule concludes. */
export const INPUT_SETS: Record<Level, Trapezoid> = {
  low: { a: 35, b: 35, c: 36.8, d: 37.6 }, // normal
  medium: { a: 37.2, b: 38, c: 38.4, d: 39.2 }, // fever
  high: { a: 38.8, b: 39.6, c: 42, d: 42 }, // high fever
};

export const OUTPUT_SETS: Record<Level, Trapezoid> = {
  low: { a: 0, b: 0, c: 15, d: 40 },
  medium: { a: 25, b: 45, c: 55, d: 75 },
  high: { a: 60, b: 85, c: 100, d: 100 },
};

export const LEVELS: Level[] = ["low", "medium", "high"];

export interface FuzzyResult {
  /** Degree each rule fires: IF temperature is <set> THEN risk is <level>. */
  degrees: Record<Level, number>;
  /** Aggregated output: max over rules of each output set clipped at its rule's degree. */
  aggregate: (y: number) => number;
  /** Centroid of the aggregate, or null when no rule fires. */
  crisp: number | null;
}

const SAMPLES = 400;

export function infer(temperature: number): FuzzyResult {
  const degrees = Object.fromEntries(
    LEVELS.map((l) => [l, membership(temperature, INPUT_SETS[l])]),
  ) as Record<Level, number>;

  // Mamdani: clip (min) each consequent by its firing degree, aggregate with max.
  const aggregate = (y: number) =>
    Math.max(...LEVELS.map((l) => Math.min(degrees[l], membership(y, OUTPUT_SETS[l]))));

  // Centroid defuzzification by numeric integration (midpoint rule).
  let area = 0;
  let moment = 0;
  const step = (RISK.max - RISK.min) / SAMPLES;
  for (let i = 0; i < SAMPLES; i++) {
    const y = RISK.min + (i + 0.5) * step;
    const mu = aggregate(y);
    area += mu * step;
    moment += y * mu * step;
  }

  return { degrees, aggregate, crisp: area === 0 ? null : moment / area };
}
