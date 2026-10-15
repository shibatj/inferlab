import type { ParseErrorCode } from "@/engine";

export const en = {
  meta: {
    title: "InferLab — learn expert systems by running them",
    description:
      "Write IF–THEN rules and watch forward and backward chaining, conflict resolution and certainty factors step by step.",
  },
  nav: { home: "Home", playground: "Playground" },
  theme: { toggle: "Toggle light/dark theme" },
  lang: { switchTo: "ภาษาไทย", switchLabel: "Switch to Thai" },
  touch: {
    title: "Please open InferLab on a computer",
    body: "The rule editor and inference views need a keyboard and a large screen, so InferLab is designed for desktop browsers only.",
  },
  home: {
    heading: "Learn expert systems by running them",
    intro:
      "Write IF–THEN rules in a small language, then watch an inference engine reason with them one step at a time: which rules match, which one fires, and why.",
    cta: "Open the playground",
    features: [
      { title: "Forward chaining", body: "Go from facts to conclusions and compare four conflict-resolution strategies." },
      { title: "Backward chaining", body: "Start from a goal and watch the AND/OR tree grow, then shrink back to an answer." },
      { title: "Certainty factors", body: "Attach MYCIN-style CFs to facts and rules and see evidence combine." },
      { title: "Explanations", body: "Ask HOW a conclusion was reached and WHY a subgoal was needed." },
    ],
    lessonsSoon: "Lessons are coming soon. For now, try the three example knowledge bases in the playground.",
  },
  playground: {
    example: "Example",
    mode: { label: "Mode", forward: "Forward chaining", backward: "Backward chaining" },
    strategy: {
      label: "Conflict resolution",
      order: "Rule order",
      specificity: "Specificity",
      priority: "Priority",
      recency: "Recency",
    },
    goal: "Goal",
    symptoms: "Observed symptoms",
    controls: { reset: "Reset", back: "Back", step: "Step", run: "Run to end" },
    progress: "Step {k} / {n}",
    editor: "Rules and facts",
    errors: "{n} error(s) — fix them to run the engine.",
    saved: "Your edits are saved in this browser.",
    log: {
      title: "Step log",
      empty: "Press Step or Run to start.",
      cycle: "Cycle {n}",
      conflictSet: "Conflict set",
      fired: "Fired {rule}",
      added: "added {fact} (CF {cf})",
      updated: "updated {fact}: CF {before} → {after}",
      done: "No rule can fire any more — the engine stops (quiescence).",
    },
    memory: { title: "Working memory", fact: "Fact", cf: "CF", time: "Time", hint: "Click a fact to see HOW it was derived." },
    how: {
      title: "HOW",
      initial: "initial fact (CF {cf})",
      firing: "cycle {cycle}: {rule} contributed {cf}",
      none: "Not derived by any rule yet.",
    },
    tree: {
      title: "AND/OR tree",
      empty: "Press Step or Run to start proving the goal.",
      result: "{goal}: {status} (CF {cf})",
      hint: "Click a node to see WHY it was needed and HOW it was decided.",
      fact: "fact CF {cf}",
      skipped: "skipped: {list}",
    },
    status: {
      proven: "proven",
      failed: "failed",
      unknown: "unknown",
      cycle: "cycle",
      pending: "…",
      cached: "reused",
      fired: "fired",
      notFired: "did not fire",
    },
    why: {
      title: "WHY",
      top: "This is the top goal.",
      step: "{goal} is needed by rule {rule}, which tries to prove {parent}.",
    },
    howGoal: {
      fact: "Initial fact with CF {cf}.",
      rule: "Rule {rule} contributed {cf}.",
      noEvidence: "No fact and no fired rule supports it.",
      cached: "Same result as where it was first evaluated.",
      cycle: "Circular: this goal is already being proven higher up, so this path is ignored.",
    },
  },
  errors: {
    UNEXPECTED_CHAR: "Unexpected character",
    EXPECTED_STATEMENT: "A line must start with 'fact' or 'rule'",
    EXPECTED_IDENT: "A name is missing here",
    EXPECTED_COLON: "Missing ':' after the rule name",
    EXPECTED_IF: "Missing 'IF'",
    EXPECTED_AND_OR_THEN: "Expected 'AND' or 'THEN'",
    EXPECTED_END_OF_LINE: "Extra text after the end of the statement",
    EXPECTED_NUMBER: "A number is missing",
    CF_OUT_OF_RANGE: "CF must be between -1 and 1",
    EXPECTED_INTEGER: "PRIORITY must be a whole number",
    DUPLICATE_RULE: "Two rules have the same name",
  } satisfies Record<ParseErrorCode, string>,
};

export type Dictionary = typeof en;
