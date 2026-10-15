/**
 * The canary hierarchy from Collins & Quillian (1969), used by both the semantic-net and the
 * frames widgets. A concept stores only its own properties; everything else is inherited
 * along `isA` links, and a property set lower down overrides the one above.
 */
export interface Concept {
  name: string;
  isA: string | null;
  properties: Record<string, string>;
}

export const NET: Concept[] = [
  { name: "animal", isA: null, properties: { has_skin: "yes", can_move: "yes", breathes: "yes" } },
  { name: "bird", isA: "animal", properties: { has_wings: "yes", can_fly: "yes", has_feathers: "yes" } },
  { name: "fish", isA: "animal", properties: { has_fins: "yes", can_swim: "yes", has_gills: "yes" } },
  { name: "canary", isA: "bird", properties: { can_sing: "yes", color: "yellow" } },
  { name: "ostrich", isA: "bird", properties: { can_fly: "no", has_long_legs: "yes" } },
  { name: "shark", isA: "fish", properties: { can_bite: "yes", is_dangerous: "yes" } },
  { name: "salmon", isA: "fish", properties: { color: "pink", is_edible: "yes" } },
  { name: "tweety", isA: "canary", properties: {} },
];

const byName = new Map(NET.map((c) => [c.name, c]));

/** Concepts from `name` up to the root, following isA links. */
export function ancestry(name: string): Concept[] {
  const chain: Concept[] = [];
  for (let c = byName.get(name); c; c = c.isA ? byName.get(c.isA) : undefined) chain.push(c);
  return chain;
}

export interface Lookup {
  value: string | null;
  /** Concept where the value was found, or null if no ancestor has the property. */
  from: string | null;
  /** isA links followed to find it (0 = stored on the concept itself). */
  hops: number;
  /** Concepts visited, starting at the queried one. */
  path: string[];
}

/** Property lookup by inheritance: the nearest ancestor that defines it wins. */
export function lookup(name: string, property: string): Lookup {
  const path: string[] = [];
  for (const [hops, c] of ancestry(name).entries()) {
    path.push(c.name);
    if (property in c.properties) return { value: c.properties[property], from: c.name, hops, path };
  }
  return { value: null, from: null, hops: path.length - 1, path };
}

export interface Slot {
  slot: string;
  value: string;
  /** Concept the value comes from (the frame itself when it is not inherited). */
  from: string;
  /** Concept whose value for this slot is hidden by this one, if any. */
  overrides: string | null;
}

/** Every slot a frame has, own and inherited, as the frames widget shows it. */
export function slots(name: string): Slot[] {
  const result = new Map<string, Slot>();
  for (const c of ancestry(name)) {
    for (const [slot, value] of Object.entries(c.properties)) {
      const nearer = result.get(slot);
      if (!nearer) result.set(slot, { slot, value, from: c.name, overrides: null });
      else if (nearer.overrides === null) nearer.overrides = c.name;
    }
  }
  return [...result.values()];
}

/** All property names in the net, for the query picker. */
export const PROPERTIES = [...new Set(NET.flatMap((c) => Object.keys(c.properties)))];
