import type { GoalNode, TreeNode } from "@/engine";

export interface PlacedNode {
  node: TreeNode;
  /** Column, in units of one leaf width. */
  x: number;
  /** Row: depth from the top goal. */
  y: number;
  parent: number | null;
}

const children = (n: TreeNode): TreeNode[] => (n.kind === "goal" ? n.rules : n.premises);

/**
 * Simple tidy-tree layout: leaves take consecutive columns left to right, and each parent is
 * centred over its first and last child. Subtrees never overlap because every leaf has its
 * own column.
 */
export function layoutTree(root: GoalNode): PlacedNode[] {
  const placed: PlacedNode[] = [];
  let nextColumn = 0;

  const place = (node: TreeNode, depth: number, parent: number | null): number => {
    const entry: PlacedNode = { node, x: 0, y: depth, parent };
    placed.push(entry);
    const kids = children(node);
    if (kids.length === 0) {
      entry.x = nextColumn++;
    } else {
      const xs = kids.map((k) => place(k, depth + 1, node.id));
      entry.x = (xs[0] + xs[xs.length - 1]) / 2;
    }
    return entry.x;
  };

  place(root, 0, null);
  return placed;
}
