export interface TreeNodeData {
  id: string;
  label: string;
  left: TreeNodeData | null;
  right: TreeNodeData | null;
}

export interface TraversalItem {
  id: string;
  label: string;
}

export interface TreeMetrics {
  isEmpty: boolean;
  nodeCount: number;
  height: number;
  leafCount: number;
  preorder: TraversalItem[];
  inorder: TraversalItem[];
  postorder: TraversalItem[];
  levelOrder: TraversalItem[];
}

export interface TreeBundle {
  tree: TreeNodeData | null;
  metrics: TreeMetrics;
}

export interface TraceStep {
  step: number;
  nodeId: string;
  nodeLabel: string;
  parentId: string;
  branch: 'root' | 'left' | 'right';
  operation: 'VISIT_NODE' | 'EMIT_NULL';
  token: string;
  description: string;
  tokensSoFar: string[];
}

export interface SerializeResponse {
  ok: boolean;
  archiveText: string;
  tokenCount: number;
  nodeCount: number;
  tokens: string[];
  trace: TraceStep[];
  original: TreeBundle;
}

export interface RestoreResponse {
  ok: boolean;
  message?: string;
  tokenCount?: number;
  restoredNodeCount?: number;
  restored?: TreeBundle;
  errorCode?: string;
  ruleFailed?: string;
  expectedTokens?: number;
  receivedTokens?: number;
  lineNumber?: number;
  reconstructionPrevented?: boolean;
}

export interface VerifyResponse {
  ok: boolean;
  identical: boolean;
  passed: boolean;
  preorderMatch: boolean;
  inorderMatch: boolean;
  usedReferenceSnapshot?: boolean;
  mismatchPath: string;
  mismatchReason: string;
  originalLabel: string;
  restoredLabel: string;
  original: TreeBundle;
  restored: TreeBundle;
}

export interface DamagedSample {
  id: string;
  title: string;
  category: string;
  description: string;
  archiveText: string;
}

export type AppTab = 'workspace' | 'compare' | 'demo' | 'damage' | 'docs';
