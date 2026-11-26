import type { TreeNodeData } from '../types/tree.ts';

export interface PositionedNode {
  id: string;
  label: string;
  x: number;
  y: number;
  depth: number;
  path: string;
  hasLeft: boolean;
  hasRight: boolean;
  boxWidth: number;
}

export interface PositionedEdge {
  id: string;
  fromId: string;
  toId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  side: 'left' | 'right';
}

export interface PositionedNullMarker {
  id: string;
  parentId: string;
  side: 'left' | 'right';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  path: string;
}

export interface TreeLayout {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  nullMarkers: PositionedNullMarker[];
  width: number;
  height: number;
  nodeRadius: number;
}

export interface LayoutOptions {
  horizontalSpacing?: number;
  verticalSpacing?: number;
  paddingX?: number;
  paddingY?: number;
  nodeRadius?: number;
}

/**
 * Inorder slot layout that preserves strict left/right orientation even when
 * one child is missing, and reserves positions for explicit NULL branch markers.
 */
export function computeTreeLayout(
  root: TreeNodeData | null,
  options: LayoutOptions = {}
): TreeLayout {
  const baseHorizontalSpacing = options.horizontalSpacing ?? 72;
  const verticalSpacing = options.verticalSpacing ?? 92;
  const paddingX = options.paddingX ?? 64;
  const paddingY = options.paddingY ?? 56;
  const nodeRadius = options.nodeRadius ?? 22;

  if (!root) {
    return {
      nodes: [],
      edges: [],
      nullMarkers: [],
      width: 520,
      height: 280,
      nodeRadius,
    };
  }

  let slotCursor = 0;
  let maxLabelLen = 1;
  const rawNodes: Array<{
    node: TreeNodeData;
    slot: number;
    depth: number;
    path: string;
  }> = [];
  const rawNulls: Array<{
    parent: TreeNodeData;
    side: 'left' | 'right';
    slot: number;
    depth: number;
    path: string;
  }> = [];

  const coordsById = new Map<string, { x: number; y: number }>();

  function assignSlots(node: TreeNodeData | null, parent: TreeNodeData | null, side: 'left' | 'right' | 'root', depth: number, path: string): void {
    if (!node) {
      if (parent && (side === 'left' || side === 'right')) {
        const nullSlot = slotCursor;
        slotCursor += 0.68;
        rawNulls.push({ parent, side, slot: nullSlot, depth, path });
      }
      return;
    }

    if (node.label.length > maxLabelLen) maxLabelLen = node.label.length;

    assignSlots(node.left, node, 'left', depth + 1, `${path}.left`);

    const mySlot = slotCursor;
    slotCursor += 1.0;
    rawNodes.push({ node, slot: mySlot, depth, path });

    assignSlots(node.right, node, 'right', depth + 1, `${path}.right`);
  }

  assignSlots(root, null, 'root', 0, 'root');

  const horizontalSpacing = Math.max(
    baseHorizontalSpacing,
    Math.min(130, 36 + Math.min(maxLabelLen, 14) * 6)
  );

  let maxDepth = 0;
  for (const item of rawNodes) {
    if (item.depth > maxDepth) maxDepth = item.depth;
  }
  for (const item of rawNulls) {
    if (item.depth > maxDepth) maxDepth = item.depth;
  }

  const maxSlot = Math.max(slotCursor - 0.68, 1);
  const contentWidth = maxSlot * horizontalSpacing;
  const effectivePaddingX = Math.max(paddingX, Math.min(90, maxLabelLen * 4 + 32));
  const minCanvasWidth = options.horizontalSpacing && options.horizontalSpacing < 65 ? 380 : 520;
  const width = Math.max(minCanvasWidth, Math.ceil(contentWidth + effectivePaddingX * 2));
  const height = Math.max(280, Math.ceil((maxDepth + 0.5) * verticalSpacing + paddingY * 2));

  // Center horizontally inside minimum canvas width
  const offsetX = width > contentWidth + effectivePaddingX * 2
    ? (width - contentWidth) / 2
    : effectivePaddingX;

  const nodes: PositionedNode[] = rawNodes.map((item) => {
    const x = offsetX + item.slot * horizontalSpacing;
    const y = paddingY + item.depth * verticalSpacing;
    coordsById.set(item.node.id, { x, y });
    const displayLen = Math.min(item.node.label.length, 16);
    const boxWidth =
      displayLen <= 3
        ? nodeRadius * 2
        : Math.max(nodeRadius * 2, displayLen * 7.6 + 22);
    return {
      id: item.node.id,
      label: item.node.label,
      x,
      y,
      depth: item.depth,
      path: item.path,
      hasLeft: item.node.left !== null,
      hasRight: item.node.right !== null,
      boxWidth,
    };
  });

  const edges: PositionedEdge[] = [];
  function collectEdges(node: TreeNodeData): void {
    const pCoord = coordsById.get(node.id);
    if (!pCoord) return;
    if (node.left) {
      const cCoord = coordsById.get(node.left.id);
      if (cCoord) {
        edges.push({
          id: `${node.id}->${node.left.id}`,
          fromId: node.id,
          toId: node.left.id,
          x1: pCoord.x,
          y1: pCoord.y,
          x2: cCoord.x,
          y2: cCoord.y,
          side: 'left',
        });
      }
      collectEdges(node.left);
    }
    if (node.right) {
      const cCoord = coordsById.get(node.right.id);
      if (cCoord) {
        edges.push({
          id: `${node.id}->${node.right.id}`,
          fromId: node.id,
          toId: node.right.id,
          x1: pCoord.x,
          y1: pCoord.y,
          x2: cCoord.x,
          y2: cCoord.y,
          side: 'right',
        });
      }
      collectEdges(node.right);
    }
  }
  collectEdges(root);

  const nullMarkers: PositionedNullMarker[] = rawNulls.map((item) => {
    const pCoord = coordsById.get(item.parent.id)!;
    const x2 = offsetX + item.slot * horizontalSpacing;
    const y2 = paddingY + item.depth * verticalSpacing - 12;
    return {
      id: `null-${item.parent.id}-${item.side}`,
      parentId: item.parent.id,
      side: item.side,
      x1: pCoord.x,
      y1: pCoord.y,
      x2,
      y2,
      path: item.path,
    };
  });

  return {
    nodes,
    edges,
    nullMarkers,
    width,
    height,
    nodeRadius,
  };
}

/**
 * Formats a binary tree into a readable indented text representation showing
 * explicit L/R branches and NULL markers.
 */
export function formatIndentedTree(root: TreeNodeData | null): string {
  if (!root) return '(empty tree -> NULL)';
  const lines: string[] = [];

  function walk(node: TreeNodeData | null, prefix: string, connector: string, branchLabel: string): void {
    if (!node) {
      lines.push(`${prefix}${connector}[${branchLabel}] N (NULL)`);
      return;
    }
    lines.push(`${prefix}${connector}${branchLabel ? `[${branchLabel}] ` : ''}${node.label}`);
    const childPrefix = prefix + (connector === '' ? '' : connector === '├─ ' ? '│  ' : '   ');
    if (node.left || node.right) {
      walk(node.left, childPrefix, '├─ ', 'L');
      walk(node.right, childPrefix, '└─ ', 'R');
    }
  }

  walk(root, '', '', '');
  return lines.join('\n');
}
