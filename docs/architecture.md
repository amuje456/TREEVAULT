# TREEVAULT — System Architecture

## Overview

TREEVAULT separates interactive visualization from core Data Structures & Algorithms (DSA) execution:

```
USER (Browser)
  |
  v
REACT + TYPESCRIPT + SVG FRONTEND (src/)
  |  REST / JSON over HTTP
  v
NODE.JS + EXPRESS BACKEND (server.ts, backend/routes/treeRoutes.ts)
  |  Safe stdin/stdout JSON-RPC via child_process.spawn (shell: false)
  v
COMPILED C++17 DSA ENGINE (cpp-engine/treevault_engine --daemon)
  |-- BinaryTree (std::unique_ptr<TreeNode> ownership, metrics, traversals, compareStructure)
  |-- Serializer (O(N) preorder serialize + trace, transactional recursive deserialize)
  |-- Validator (TREEVAULT_V1 header, token count, V:/N syntax, label bounds)
```

## Key Architectural Guarantees

1. **All Core DSA Operations Execute in C++17**:
   - Tree construction, insertion, deletion, height, leaf count, node count, preorder/inorder/postorder/level-order traversals, serialization, deserialization, archive validation, and recursive structural equality all run in compiled C++.
2. **True In-Memory Object Destruction**:
   - The C++ daemon maintains separate `originalTree` and `restoredTree` instances using `std::unique_ptr<TreeNode>`.
   - Calling `POST /api/tree/clear` invokes `originalTree.clear()`, immediately deallocating every node on the C++ heap.
3. **Transactional Deserialization**:
   - `Serializer::deserialize` reconstructs into a local temporary `std::unique_ptr<TreeNode> tempRoot`.
   - Only when validation, recursive reconstruction, and stream-termination checks all pass is `tempRoot` committed to `restoredTree`.
4. **Safe Process Integration**:
   - `backend/cppBridge.ts` spawns the compiled binary directly (`shell: false`), serializes requests with a promise queue, and enforces a 5-second per-command timeout.
