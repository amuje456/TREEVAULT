import type {
  RestoreResponse,
  SerializeResponse,
  TreeBundle,
  TreeNodeData,
  VerifyResponse,
} from '../types/tree.ts';

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = (await res.json()) as T & { ok?: boolean; message?: string };
  return data;
}

export interface StateResponse {
  ok: boolean;
  original: TreeBundle;
  restored: TreeBundle;
}

export interface CreateResponse {
  ok: boolean;
  message?: string;
  errorCode?: string;
  original?: TreeBundle;
}

export interface ClearResponse {
  ok: boolean;
  message: string;
  originalCleared?: boolean;
  original?: TreeBundle;
  restored?: TreeBundle;
}

export interface HealthResponse {
  ok: boolean;
  backend: string;
  cppEngine?: {
    ok: boolean;
    engine: string;
    maxNodes: number;
  };
  message?: string;
}

export const treeApi = {
  health: () => requestJson<HealthResponse>('/api/health'),

  getState: () => requestJson<StateResponse>('/api/tree/state'),

  loadSample: (preset: string) =>
    requestJson<CreateResponse>('/api/tree/create', {
      method: 'POST',
      body: JSON.stringify({ action: 'sample', preset }),
    }),

  importText: (mode: 'bracket' | 'preorder_csv', input: string) =>
    requestJson<CreateResponse>('/api/tree/create', {
      method: 'POST',
      body: JSON.stringify({ action: 'import', mode, input }),
    }),

  addRoot: (label: string) =>
    requestJson<CreateResponse>('/api/tree/create', {
      method: 'POST',
      body: JSON.stringify({ action: 'add_root', label }),
    }),

  insertChild: (parentId: string, side: 'left' | 'right', label: string) =>
    requestJson<CreateResponse>('/api/tree/create', {
      method: 'POST',
      body: JSON.stringify({ action: 'insert_child', parentId, side, label }),
    }),

  editLabel: (nodeId: string, label: string) =>
    requestJson<CreateResponse>('/api/tree/create', {
      method: 'POST',
      body: JSON.stringify({ action: 'edit_label', nodeId, label }),
    }),

  deleteNode: (nodeId: string) =>
    requestJson<CreateResponse>('/api/tree/create', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete_node', nodeId }),
    }),

  serialize: () =>
    requestJson<SerializeResponse>('/api/tree/serialize', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  restore: (archiveText: string) =>
    requestJson<RestoreResponse>('/api/tree/restore', {
      method: 'POST',
      body: JSON.stringify({ archiveText }),
    }),

  verify: (expectedTree?: TreeNodeData | null) =>
    requestJson<VerifyResponse>('/api/tree/verify', {
      method: 'POST',
      body: JSON.stringify(expectedTree !== undefined ? { expectedTree } : {}),
    }),

  clearTree: (target: 'original' | 'restored' = 'original') =>
    requestJson<ClearResponse>('/api/tree/clear', {
      method: 'POST',
      body: JSON.stringify({ target }),
    }),

  generateUnseenDemo: (seed?: number) =>
    requestJson<CreateResponse>('/api/tree/demo', {
      method: 'POST',
      body: JSON.stringify({ scenario: 'unseen', seed }),
    }),

  runAutomatedRoundTrip: (seed?: number) =>
    requestJson<{
      ok: boolean;
      originalSnapshot: TreeBundle;
      serialized: SerializeResponse;
      cleared: ClearResponse;
      restored: RestoreResponse;
      verified: VerifyResponse;
    }>('/api/tree/demo', {
      method: 'POST',
      body: JSON.stringify({ scenario: 'round_trip', seed }),
    }),
};
