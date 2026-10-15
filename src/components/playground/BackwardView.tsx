"use client";

import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState } from "react";
import type { BackwardResult, GoalNode, RuleNode, TreeNode } from "@/engine";
import { fmt, formatCf, type Dictionary } from "@/i18n/dictionaries";
import { whyPath } from "@/playground/explain";
import { layoutTree } from "@/playground/layout";
import { treeStateAt } from "@/playground/replay";

type Dict = Dictionary["playground"];

const COLUMN = 165;
const ROW = 110;
/** Small trees are not blown up past this zoom when fitted to the pane. */
const FIT = { padding: 0.2, maxZoom: 1.1 };

interface NodeData extends Record<string, unknown> {
  node: TreeNode;
  closed: boolean;
  current: boolean;
  selected: boolean;
  dict: Dict;
}

const STATUS_CLASS: Record<GoalNode["status"], string> = {
  proven: "border-ok bg-ok-soft",
  failed: "border-bad bg-bad-soft",
  unknown: "border-line bg-subtle",
  cycle: "border-warn bg-warn-soft",
};

function GoalBox({ data }: NodeProps<Node<NodeData>>) {
  const node = data.node as GoalNode;
  const { dict } = data;
  const tone = data.closed ? STATUS_CLASS[node.status] : "border-dashed border-accent bg-panel";
  return (
    <div
      className={`w-[150px] rounded-lg border-2 px-2.5 py-1.5 text-center text-xs ${tone} ${
        data.selected ? "ring-2 ring-accent ring-offset-2 ring-offset-bg" : ""
      } ${data.current ? "shadow-lg" : ""}`}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="truncate font-mono text-[13px] font-semibold">{node.atom}?</div>
      <div className="text-muted">
        {data.closed ? `${dict.status[node.status]} · CF ${formatCf(node.cf)}` : dict.status.pending}
      </div>
      {data.closed && (node.factCf !== null || node.cached) && (
        <div className="text-[11px] text-muted">
          {node.cached ? dict.status.cached : fmt(dict.tree.fact, { cf: formatCf(node.factCf!) })}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

function RuleBox({ data }: NodeProps<Node<NodeData>>) {
  const node = data.node as RuleNode;
  const { dict } = data;
  const tone = !data.closed
    ? "border-dashed border-accent"
    : node.fired
      ? "border-ok text-ok"
      : "border-bad text-bad";
  return (
    <div
      className={`w-[140px] rounded-full border bg-panel px-2.5 py-1 text-center text-xs ${tone} ${
        data.selected ? "ring-2 ring-accent ring-offset-2 ring-offset-bg" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="font-mono font-semibold">
        AND · {node.rule}
      </div>
      {data.closed && (
        <div>{node.fired ? `${dict.status.fired} +${formatCf(node.contribution)}` : dict.status.notFired}</div>
      )}
      {data.closed && node.skipped.length > 0 && (
        <div className="truncate text-[11px] text-muted">{fmt(dict.tree.skipped, { list: node.skipped.join(", ") })}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

const nodeTypes = { goal: GoalBox, rule: RuleBox };

export function BackwardView({ result, k, dict }: { result: BackwardResult; k: number; dict: Dict }) {
  const [selected, setSelected] = useState<number | null>(null);
  const placed = useMemo(() => layoutTree(result.tree), [result.tree]);
  const state = treeStateAt(result.steps, k);
  const rootDone = state.closed.has(result.tree.id);

  const nodes: Node<NodeData>[] = placed
    .filter((p) => state.opened.has(p.node.id))
    .map((p) => ({
      id: String(p.node.id),
      type: p.node.kind,
      position: { x: p.x * COLUMN, y: p.y * ROW },
      data: {
        node: p.node,
        closed: state.closed.has(p.node.id),
        current: state.current === p.node.id,
        selected: selected === p.node.id,
        dict,
      },
      draggable: false,
      connectable: false,
    }));
  const edges: Edge[] = placed
    .filter((p) => p.parent !== null && state.opened.has(p.node.id))
    .map((p) => ({ id: `${p.parent}-${p.node.id}`, source: String(p.parent), target: String(p.node.id) }));

  const selectedNode = selected !== null && state.opened.has(selected) ? placed.find((p) => p.node.id === selected)?.node : undefined;

  return (
    <div className="grid h-full grid-cols-[1fr_300px]">
      <div className="relative min-h-0">
        <div className="absolute left-4 top-3 z-10 rounded-md border border-line bg-panel px-3 py-1.5 text-sm">
          <span className="font-semibold">{dict.tree.title}</span>
          {rootDone && (
            <span className={`ml-2 ${result.proven ? "text-ok" : "text-bad"}`}>
              {fmt(dict.tree.result, {
                goal: result.goal,
                status: dict.status[result.tree.status],
                cf: formatCf(result.cf),
              })}
            </span>
          )}
        </div>
        {k === 0 ? (
          <p className="p-6 pt-16 text-sm text-muted">{dict.tree.empty}</p>
        ) : (
          <ReactFlowProvider>
            <FitOnGrow count={nodes.length} />
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={(_, n) => setSelected(Number(n.id))}
              onPaneClick={() => setSelected(null)}
              nodesConnectable={false}
              fitView
              fitViewOptions={FIT}
              minZoom={0.2}
            >
              <Background gap={24} />
              <Controls showInteractive={false} />
            </ReactFlow>
          </ReactFlowProvider>
        )}
      </div>

      <aside className="min-h-0 overflow-y-auto border-l border-line bg-panel p-4 text-sm">
        {selectedNode ? (
          <Explanation root={result.tree} node={selectedNode} closed={state.closed.has(selectedNode.id)} dict={dict} />
        ) : (
          <p className="text-muted">{dict.tree.hint}</p>
        )}
      </aside>
    </div>
  );
}

/** Re-fits the viewport as the tree grows during step-by-step replay. */
function FitOnGrow({ count }: { count: number }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const frame = requestAnimationFrame(() => fitView({ ...FIT, duration: 200 }));
    return () => cancelAnimationFrame(frame);
  }, [count, fitView]);
  return null;
}

const label = (n: TreeNode) => (n.kind === "goal" ? n.atom : n.rule);

function Explanation({ root, node, closed, dict }: { root: GoalNode; node: TreeNode; closed: boolean; dict: Dict }) {
  const path = whyPath(root, node.id);
  // WHY: from the selected goal up to the top goal, one line per goal → rule → parent link.
  const why: string[] = [];
  for (let i = path.length - 1; i >= 2; i--) {
    if (path[i].kind !== "goal") continue;
    why.push(fmt(dict.why.step, { goal: label(path[i]), rule: label(path[i - 1]), parent: label(path[i - 2]) }));
  }

  return (
    <div className="space-y-4">
      <h2 className="font-mono text-base font-semibold">{label(node)}</h2>

      <section>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted">{dict.why.title}</h3>
        {node.kind === "goal" && path.length === 1 ? (
          <p>{dict.why.top}</p>
        ) : (
          <ol className="space-y-1">
            {node.kind === "rule" && path.length >= 2 && (
              <li>
                <span className="font-mono">{node.rule}</span> → <span className="font-mono">{label(path[path.length - 2])}</span>
              </li>
            )}
            {why.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted">HOW</h3>
        {!closed ? (
          <p className="text-muted">{dict.status.pending}</p>
        ) : node.kind === "goal" ? (
          <GoalHow node={node} dict={dict} />
        ) : (
          <p>
            {node.fired
              ? `${dict.status.fired}: CF min(${node.premises.map((p) => formatCf(p.cf)).join(", ")}) = ${formatCf(
                  node.premiseCf!,
                )} → +${formatCf(node.contribution)}`
              : dict.status.notFired}
          </p>
        )}
      </section>
    </div>
  );
}

function GoalHow({ node, dict }: { node: GoalNode; dict: Dict }) {
  if (node.status === "cycle") return <p>{dict.howGoal.cycle}</p>;
  if (node.cached) return <p>{dict.howGoal.cached}</p>;
  const fired = node.rules.filter((r) => r.fired);
  return (
    <ul className="space-y-1">
      {node.factCf !== null && <li>• {fmt(dict.howGoal.fact, { cf: formatCf(node.factCf) })}</li>}
      {fired.map((r) => (
        <li key={r.id}>• {fmt(dict.howGoal.rule, { rule: r.rule, cf: formatCf(r.contribution) })}</li>
      ))}
      {node.factCf === null && fired.length === 0 && <li>{dict.howGoal.noEvidence}</li>}
      <li className="pt-1 font-semibold">
        = {dict.status[node.status]} · CF {formatCf(node.cf)}
      </li>
    </ul>
  );
}
