import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTreeLayout, formatIndentedTree } from './treeLayout.ts';
import type { TreeNodeData } from '../types/tree.ts';

test('empty tree returns empty layout with safe canvas dimensions', () => {
  const layout = computeTreeLayout(null);
  assert.equal(layout.nodes.length, 0);
  assert.equal(layout.edges.length, 0);
  assert.equal(layout.nullMarkers.length, 0);
  assert.ok(layout.width >= 520);
  assert.ok(layout.height >= 280);
});

test('illustrative tree preserves left-right geometry and null markers', () => {
  const tree: TreeNodeData = {
    id: 'n1',
    label: 'A',
    left: {
      id: 'n2',
      label: 'B',
      left: null,
      right: { id: 'n4', label: 'D', left: null, right: null },
    },
    right: { id: 'n3', label: 'C', left: null, right: null },
  };

  const layout = computeTreeLayout(tree);
  assert.equal(layout.nodes.length, 4);
  assert.equal(layout.edges.length, 3);
  assert.equal(layout.nullMarkers.length, 5); // B.left, D.left, D.right, C.left, C.right

  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  const a = byId.get('n1')!;
  const b = byId.get('n2')!;
  const c = byId.get('n3')!;
  const d = byId.get('n4')!;

  assert.ok(b.x < a.x, 'Left child B must be strictly left of A');
  assert.ok(c.x > a.x, 'Right child C must be strictly right of A');
  assert.ok(d.x > b.x, 'Right-only child D must be strictly right of B');
  assert.ok(d.x < a.x, 'Right child of left subtree D must remain left of root A');
});

test('left-only skewed tree angles strictly left at every level', () => {
  const tree: TreeNodeData = {
    id: 'n1',
    label: 'A',
    left: {
      id: 'n2',
      label: 'B',
      left: { id: 'n3', label: 'C', left: null, right: null },
      right: null,
    },
    right: null,
  };
  const layout = computeTreeLayout(tree);
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  assert.ok(byId.get('n3')!.x < byId.get('n2')!.x);
  assert.ok(byId.get('n2')!.x < byId.get('n1')!.x);
});

test('right-only skewed tree angles strictly right at every level', () => {
  const tree: TreeNodeData = {
    id: 'n1',
    label: 'A',
    left: null,
    right: {
      id: 'n2',
      label: 'B',
      left: null,
      right: { id: 'n3', label: 'C', left: null, right: null },
    },
  };
  const layout = computeTreeLayout(tree);
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  assert.ok(byId.get('n1')!.x < byId.get('n2')!.x);
  assert.ok(byId.get('n2')!.x < byId.get('n3')!.x);
});

test('formatIndentedTree clearly distinguishes L and R branches', () => {
  const tree: TreeNodeData = {
    id: 'n1',
    label: 'A',
    left: { id: 'n2', label: 'B', left: null, right: { id: 'n4', label: 'D', left: null, right: null } },
    right: { id: 'n3', label: 'C', left: null, right: null },
  };
  const text = formatIndentedTree(tree);
  assert.ok(text.includes('[L] B'));
  assert.ok(text.includes('[L] N (NULL)'));
  assert.ok(text.includes('[R] D'));
  assert.ok(text.includes('[R] C'));
});
