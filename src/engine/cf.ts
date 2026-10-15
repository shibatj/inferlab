/**
 * MYCIN certainty factors. A CF is a number in [-1, 1]: 1 is certainly true, -1 certainly
 * false, 0 no evidence either way.
 */

/** A premise "holds" only when its CF is above this value (MYCIN's 0.2 threshold). */
export const CF_THRESHOLD = 0.2;

/** CF of a conjunction: the weakest link. */
export function cfAnd(cfs: number[]): number {
  return Math.min(...cfs);
}

/** Evidence one rule firing contributes to its conclusion. */
export function cfRule(premiseCf: number, ruleCf: number): number {
  return premiseCf * ruleCf;
}

/**
 * Combines two independent pieces of evidence for the same conclusion. The result does not
 * depend on order, so evidence can be folded in as it arrives.
 *
 * Fully certain evidence for and against (1 and -1) is a contradiction the formula leaves
 * undefined (0/0). We return 0: no net belief.
 */
export function cfCombine(a: number, b: number): number {
  if (a >= 0 && b >= 0) return a + b * (1 - a);
  if (a < 0 && b < 0) return a + b * (1 + a);
  const denominator = 1 - Math.min(Math.abs(a), Math.abs(b));
  return denominator === 0 ? 0 : (a + b) / denominator;
}
