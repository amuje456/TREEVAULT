# DSA Selection, Walkthrough & Judges' Explanation Guide

## 1. Why Preorder + Explicit Null Markers?

Given the illustrative tree:

```text
      A
     / \
    B   C
     \
      D
```

Saving only preorder labels `[A, B, D, C]` is **lossy**: we cannot tell whether `D` is the left child of `B`, the right child of `B`, or the left child of `C`.

Adding explicit `N` markers during preorder traversal (`Root -> Left -> Right`) records every `nullptr` branch:

`V:A, V:B, N, V:D, N, N, V:C, N, N`

Because every binary tree with `N` nodes has exactly `N + 1` null pointers, the token stream has `2N + 1` tokens (`O(N)` space) and uniquely determines the exact tree topology—even when duplicate node labels exist.

## 2. Step-by-Step Reconstruction Walkthrough

1. Read `V:A` -> allocate root `A`; recurse `A.left`.
2. Read `V:B` -> allocate `B` as `A.left`; recurse `B.left`.
3. Read `N` -> `B.left = nullptr`; recurse `B.right`.
4. Read `V:D` -> allocate `D` as `B.right`; recurse `D.left` and `D.right`.
5. Read `N`, `N` -> `D` has no children; return from `B`, recurse `A.right`.
6. Read `V:C` -> allocate `C` as `A.right`; read `N`, `N` -> `C` has no children.
7. Stream ends cleanly at token 9/9.

## 3. Why Structural Equality Is Separate from Traversals

Matching Preorder and Inorder sequences alone does not prove two trees are identical when duplicate labels are allowed. `BinaryTree::compareRec(a, b)` checks recursively at every node:
1. Both `nullptr` -> equal.
2. One `nullptr` and one non-null -> mismatch.
3. `a->label != b->label` -> mismatch.
4. `compareRec(a->left, b->left)` AND `compareRec(a->right, b->right)`.

## 4. Complexity Summary

| Operation | Time | Space |
|---|---|---|
| Serialization (`serializeRec`) | `O(N)` | `O(N)` archive, `O(H)` call stack |
| Deserialization (`deserializeRec`) | `O(N)` | `O(N)` tree, `O(H)` call stack |
| Preorder / Inorder / Postorder | `O(N)` | `O(N)` output, `O(H)` call stack |
| Level Order | `O(N)` | `O(W) <= O(N)` queue |
| Structural Equality (`compareRec`) | `O(N)` | `O(H)` call stack |
| Node Count / Height / Leaf Count | `O(N)` | `O(H)` call stack |
