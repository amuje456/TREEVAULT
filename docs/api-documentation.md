# TREEVAULT — REST API Documentation

Base URL: `http://localhost:3000/api`

## Endpoints

### `GET /api/health`
Verifies Express backend and C++ engine daemon health.

### `GET /api/tree/state`
Returns both `original` and `restored` tree bundles (node structure, metrics, and traversals) currently held in C++ memory.

### `POST /api/tree/create`
Constructs or mutates `originalTree` in C++ memory via `action`:
- `{"action":"sample","preset":"illustrative" | "museum_lineage" | "left_skewed" | "right_skewed" | "duplicate_labels"}`
- `{"action":"import","mode":"bracket" | "preorder_csv","input":"A(B(,D),C)"}`
- `{"action":"add_root","label":"A"}`
- `{"action":"insert_child","parentId":"n1","side":"left" | "right","label":"B"}`
- `{"action":"edit_label","nodeId":"n1","label":"Root"}`
- `{"action":"delete_node","nodeId":"n2"}`
- `{"action":"load","tree":{...}}`

### `POST /api/tree/serialize`
Runs `Serializer::serialize(originalTree)` in C++. Returns `archiveText`, `tokenCount`, `nodeCount`, `tokens`, and step-by-step `trace`.

### `POST /api/tree/restore`
Body: `{"archiveText":"TREEVAULT_V1\n..."}`.
Validates and deserializes exclusively from `archiveText` into `restoredTree`.
- `200 OK`: Returns restored tree bundle and metrics.
- `422 Unprocessable Entity`: Returns `{ ok: false, errorCode, ruleFailed, message, expectedTokens, receivedTokens, lineNumber, reconstructionPrevented: true }`.

### `POST /api/tree/verify`
Body: `{}` or `{"expectedTree":{...}}` (used in Round-Trip Demo after `originalTree` is destroyed).
Executes `BinaryTree::compareStructure` and compares Preorder & Inorder traversals.

### `POST /api/tree/clear`
Body: `{"target":"original" | "restored"}`.
Calls `clear()` on the C++ `BinaryTree` instance, releasing all heap memory.

### `POST /api/tree/demo`
- `{"scenario":"unseen"}`: Generates a fresh unseen tree in `originalTree`.
- `{"scenario":"round_trip"}`: Executes the full automated generate -> export -> destroy original -> restore -> verify pipeline.
