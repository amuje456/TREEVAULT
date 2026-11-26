import type { DamagedSample } from '../types/tree.ts';

export const DAMAGED_ARCHIVE_SAMPLES: DamagedSample[] = [
  {
    id: 'missing_tokens',
    title: 'Truncated Stream (Missing Tokens)',
    category: 'Token Count Mismatch',
    description: 'Header declares 9 tokens, but the last 3 tokens were lost during file transfer.',
    archiveText: `TREEVAULT_V1
TOKENS: 9

V:A
V:B
N
V:D
N
N`,
  },
  {
    id: 'extra_tokens',
    title: 'Trailing Corruption (Extra Tokens)',
    category: 'Token Count Mismatch',
    description: 'Header declares 9 tokens, but 2 stray tokens were appended at the end of the file.',
    archiveText: `TREEVAULT_V1
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
V:Z
N`,
  },
  {
    id: 'invalid_header',
    title: 'Corrupted Format Header',
    category: 'Header Validation',
    description: 'First line does not match the TREEVAULT_V1 format signature.',
    archiveText: `MUSEUM_EXPORT_RAW
TOKENS: 3

V:A
N
N`,
  },
  {
    id: 'unsupported_version',
    title: 'Unsupported Archive Version',
    category: 'Version Control',
    description: 'File claims TREEVAULT_V2 format which this decoder refuses to guess.',
    archiveText: `TREEVAULT_V2
TOKENS: 3

V:A
N
N`,
  },
  {
    id: 'empty_label',
    title: 'Empty Node Label',
    category: 'Node Grammar',
    description: 'A node token V: has no label after the colon prefix.',
    archiveText: `TREEVAULT_V1
TOKENS: 9

V:A
V:
N
V:D
N
N
V:C
N
N`,
  },
  {
    id: 'invalid_prefix',
    title: 'Invalid Token Prefix',
    category: 'Token Syntax',
    description: 'Contains an unrecognized token line "X:B" instead of "V:<label>" or "N".',
    archiveText: `TREEVAULT_V1
TOKENS: 9

V:A
X:B
N
V:D
N
N
V:C
N
N`,
  },
  {
    id: 'incomplete_tree',
    title: 'Incomplete Preorder Structure',
    category: 'Structural Integrity',
    description: 'Token count matches header (TOKENS: 3), but preorder stream ends before closing all child branches.',
    archiveText: `TREEVAULT_V1
TOKENS: 3

V:A
V:B
N`,
  },
];
