# TREEVAULT_V1 — Lossless Archive Format Specification

## Structure

Every TREEVAULT archive is a plain-text UTF-8 file (`.treevault`) with LF (`\n`) or CRLF (`\r\n`) line endings:

```text
TREEVAULT_V1
TOKENS: 9

V:A
V:B
N
V:D
N
N
V:C
N
N
```

### Empty Tree Representation

```text
TREEVAULT_V1
TOKENS: 1

N
```

## Format Rules

1. **Line 1 (Version Header)**: Must equal `TREEVAULT_V1`.
   - Any other `TREEVAULT_V*` string triggers `UNSUPPORTED_VERSION`.
   - Any other string triggers `INVALID_HEADER`.
2. **Line 2 (Token Count Header)**: Must match `TOKENS: <integer>` where `<integer>` is in `[1, 4001]` (since max 2,000 nodes produces `2N + 1 = 4,001` tokens).
3. **Line 3 (Separator)**: Optional single blank line before the token stream.
4. **Token Lines**: Exactly `<integer>` lines, each one of:
   - `V:<label>` — A node with non-empty `<label>` (up to 64 chars, no newline characters). Even a node literally named `N` is written `V:N`, so it never collides with null markers.
   - `N` — Explicit null marker representing an absent child (`nullptr`).

## Validation & Error Codes

| Error Code | Trigger Condition |
|---|---|
| `EMPTY_ARCHIVE` | Input is empty or whitespace-only |
| `INVALID_HEADER` | Line 1 is not `TREEVAULT_V1` |
| `UNSUPPORTED_VERSION` | Line 1 begins with `TREEVAULT_V` with an unsupported version |
| `MISSING_TOKEN_COUNT_HEADER` | Line 2 is missing |
| `INVALID_TOKEN_COUNT_HEADER` | Line 2 does not match `TOKENS: <digits>` |
| `TOKEN_COUNT_OUT_OF_RANGE` | Token count `< 1` or `> 4001` |
| `EMPTY_NODE_LABEL` | Token is `V:` with empty or whitespace-only label |
| `INVALID_TOKEN_PREFIX` | Token is neither `N` nor `V:<label>` |
| `MISSING_TOKENS` | Actual token count `<` declared `TOKENS` |
| `EXTRA_TOKENS` | Actual token count `>` declared `TOKENS` |
| `INCOMPLETE_TREE_STRUCTURE` | Preorder stream ends before closing all child pointers |
| `EXTRA_TOKENS_AFTER_TREE` | Valid tree finishes before all declared tokens are consumed |
| `MAX_NODES_EXCEEDED` | Tree contains more than 2,000 nodes |
