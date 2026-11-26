import React, { useCallback, useEffect, useState } from 'react';
import {
  GitFork,
  ArrowRightLeft,
  PlayCircle,
  ShieldAlert,
  BookOpen,
  FileCode2,
} from 'lucide-react';
import { treeApi } from './services/treeApi.ts';
import type {
  AppTab,
  RestoreResponse,
  SerializeResponse,
  TreeBundle,
  VerifyResponse,
} from './types/tree.ts';
import { TreeVisualizer } from './components/TreeVisualizer.tsx';
import { TreeBuilderPanel } from './components/TreeBuilderPanel.tsx';
import { SerializationPanel } from './components/SerializationPanel.tsx';
import { CompareVerifyView } from './components/CompareVerifyView.tsx';
import { RoundTripDemoView } from './components/RoundTripDemoView.tsx';
import { DamageLabView } from './components/DamageLabView.tsx';
import { DocsAndJudgesView } from './components/DocsAndJudgesView.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('workspace');
  const [original, setOriginal] = useState<TreeBundle | null>(null);
  const [restored, setRestored] = useState<TreeBundle | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [serialized, setSerialized] = useState<SerializeResponse | null>(null);
  const [traceStepIdx, setTraceStepIdx] = useState<number>(-1);

  const [archiveInput, setArchiveInput] = useState<string>('');
  const [restoreResult, setRestoreResult] = useState<RestoreResponse | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);

  const [lastOperation, setLastOperation] = useState<string>('Initialized C++ Engine');
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  const syncState = useCallback(async () => {
    try {
      const state = await treeApi.getState();
      if (state.ok) {
        setOriginal(state.original);
        setRestored(state.restored);
        if (state.original.tree && !selectedNodeId) {
          setSelectedNodeId(state.original.tree.id);
        }
      }
    } catch {
      setBuilderError('Unable to reach backend /api/tree/state.');
    } finally {
      setInitialLoading(false);
    }
  }, [selectedNodeId]);

  useEffect(() => {
    void syncState();
  }, [syncState]);

  const invalidateDerivedOnMutate = () => {
    setSerialized(null);
    setTraceStepIdx(-1);
    setVerifyResult(null);
    setBuilderError(null);
  };

  const handleLoadSample = async (preset: string) => {
    setBusy(true);
    invalidateDerivedOnMutate();
    try {
      const res = await treeApi.loadSample(preset);
      if (res.ok && res.original) {
        setOriginal(res.original);
        setSelectedNodeId(res.original.tree?.id ?? null);
        setLastOperation(`Loaded sample: ${preset}`);
      } else {
        setBuilderError(res.message ?? 'Failed to load sample tree.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleImportText = async (mode: 'bracket' | 'preorder_csv', input: string) => {
    setBusy(true);
    invalidateDerivedOnMutate();
    try {
      const res = await treeApi.importText(mode, input);
      if (res.ok && res.original) {
        setOriginal(res.original);
        setSelectedNodeId(res.original.tree?.id ?? null);
        setLastOperation(res.message ?? 'Imported tree via C++ parser');
      } else {
        setBuilderError(res.message ?? 'Failed to parse input tree.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleAddRoot = async (label: string) => {
    setBusy(true);
    invalidateDerivedOnMutate();
    try {
      const res = await treeApi.addRoot(label);
      if (res.ok && res.original) {
        setOriginal(res.original);
        setSelectedNodeId(res.original.tree?.id ?? null);
        setLastOperation(res.message ?? `Added root "${label}"`);
      } else {
        setBuilderError(res.message ?? 'Failed to add root.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleInsertChild = async (parentId: string, side: 'left' | 'right', label: string) => {
    setBusy(true);
    invalidateDerivedOnMutate();
    try {
      const res = await treeApi.insertChild(parentId, side, label);
      if (res.ok && res.original) {
        setOriginal(res.original);
        setLastOperation(res.message ?? `Inserted ${side} child "${label}"`);
      } else {
        setBuilderError(res.message ?? 'Failed to insert child.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleEditLabel = async (nodeId: string, label: string) => {
    setBusy(true);
    invalidateDerivedOnMutate();
    try {
      const res = await treeApi.editLabel(nodeId, label);
      if (res.ok && res.original) {
        setOriginal(res.original);
        setLastOperation(res.message ?? `Renamed node to "${label}"`);
      } else {
        setBuilderError(res.message ?? 'Failed to edit label.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    setBusy(true);
    invalidateDerivedOnMutate();
    try {
      const res = await treeApi.deleteNode(nodeId);
      if (res.ok && res.original) {
        setOriginal(res.original);
        setSelectedNodeId(res.original.tree?.id ?? null);
        setLastOperation(res.message ?? 'Deleted node subtree');
      } else {
        setBuilderError(res.message ?? 'Failed to delete node.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleResetTree = async () => {
    setBusy(true);
    invalidateDerivedOnMutate();
    try {
      const res = await treeApi.clearTree('original');
      if (res.ok && res.original) {
        setOriginal(res.original);
        setSelectedNodeId(null);
        setLastOperation('Cleared original C++ tree memory');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    setBusy(true);
    setBuilderError(null);
    try {
      const res = await treeApi.serialize();
      if (res.ok) {
        setSerialized(res);
        setTraceStepIdx(res.trace.length > 0 ? 0 : -1);
        setArchiveInput(res.archiveText);
        setLastOperation(`Exported TREEVAULT_V1 (${res.tokenCount} tokens)`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    setVerifyResult(null);
    try {
      const res = await treeApi.restore(archiveInput);
      setRestoreResult(res);
      if (res.ok && res.restored) {
        setRestored(res.restored);
        setLastOperation(`Restored ${res.restoredNodeCount ?? 0} nodes from archive`);
      } else {
        setLastOperation(`Restoration rejected (${res.errorCode ?? 'ERROR'})`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    setBusy(true);
    try {
      const res = await treeApi.verify();
      if (res.ok) {
        setVerifyResult(res);
        setLastOperation(
          res.identical ? 'Verification passed (Identical)' : 'Verification detected mismatch'
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const activeTraceStep =
    serialized && traceStepIdx >= 0 && traceStepIdx < serialized.trace.length
      ? serialized.trace[traceStepIdx]
      : null;

  const highlightedNodeId =
    activeTraceStep?.operation === 'VISIT_NODE' ? activeTraceStep.nodeId : null;
  const highlightedNullId =
    activeTraceStep?.operation === 'EMIT_NULL' && activeTraceStep.parentId
      ? `null-${activeTraceStep.parentId}-${activeTraceStep.branch}`
      : null;

  const archiveStatusText = restoreResult
    ? restoreResult.ok
      ? 'Restored & Validated'
      : `Rejected (${restoreResult.errorCode})`
    : serialized
    ? `Exported (${serialized.tokenCount} tokens)`
    : 'Not Exported';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* 3-Zone Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('workspace');
            }}
            className="text-lg font-extrabold tracking-tight text-slate-950 whitespace-nowrap shrink-0"
          >
            TREEVAULT
          </a>

          <nav aria-label="Primary sections" className="hidden md:flex items-center gap-6 text-sm font-medium">
            {[
              { id: 'workspace', label: 'Workspace', icon: GitFork },
              { id: 'compare', label: 'Compare & Verify', icon: ArrowRightLeft },
              { id: 'demo', label: 'Round-Trip Demo', icon: PlayCircle },
              { id: 'damage', label: 'Damage Lab', icon: ShieldAlert },
              { id: 'docs', label: 'DSA & Judges', icon: BookOpen },
            ].map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as AppTab)}
                  className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-blue-700 text-blue-700 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-950'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('workspace');
                void handleExport();
              }}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <FileCode2 className="w-3.5 h-3.5" aria-hidden="true" />
              Export Archive
            </button>
          </div>
        </div>

        {/* Mobile Tab Strip */}
        <div className="md:hidden border-t border-slate-100 px-3 py-2 flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'workspace', label: 'Workspace' },
            { id: 'compare', label: 'Compare' },
            { id: 'demo', label: 'Round-Trip' },
            { id: 'damage', label: 'Damage Lab' },
            { id: 'docs', label: 'DSA & Judges' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as AppTab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                activeTab === item.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Dashboard Overview & KPI Strip */}
        <section aria-label="Tree Dashboard Summary" className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 text-balance">
                Preserve Every Branch. Recover Every Connection.
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Lossless binary tree archiving powered by a compiled C++17 DSA engine using preorder traversal, explicit NULL markers, and recursive structural equality.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Max Limit: 2,000 nodes</span>
              <span aria-hidden="true">·</span>
              <span>Engine: C++17</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-100">
            <div>
              <span className="text-xs text-slate-500 block">Total Nodes</span>
              <span data-testid="kpi-node-count" className="text-lg font-bold font-mono tabular-nums text-slate-950">
                {initialLoading ? '—' : original?.metrics.nodeCount ?? 0}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Tree Height</span>
              <span data-testid="kpi-tree-height" className="text-lg font-bold font-mono tabular-nums text-slate-950">
                {initialLoading ? '—' : original?.metrics.height ?? 0}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Leaf Nodes</span>
              <span data-testid="kpi-leaf-count" className="text-lg font-bold font-mono tabular-nums text-slate-950">
                {initialLoading ? '—' : original?.metrics.leafCount ?? 0}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Archive Status</span>
              <span className="text-sm font-semibold text-slate-900 block mt-0.5 truncate">
                {archiveStatusText}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-500 block">Last Operation</span>
              <span className="text-sm font-medium text-blue-700 block mt-0.5 truncate" title={lastOperation}>
                {lastOperation}
              </span>
            </div>
          </div>
        </section>

        {/* Active Module Content */}
        {activeTab === 'workspace' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-4">
                <TreeBuilderPanel
                  tree={original?.tree ?? null}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={setSelectedNodeId}
                  onAddRoot={handleAddRoot}
                  onInsertChild={handleInsertChild}
                  onEditLabel={handleEditLabel}
                  onDeleteNode={handleDeleteNode}
                  onLoadSample={handleLoadSample}
                  onImportText={handleImportText}
                  onResetTree={handleResetTree}
                  busy={busy}
                  errorMsg={builderError}
                />
              </div>

              <div className="lg:col-span-8 space-y-4">
                <TreeVisualizer
                  tree={original?.tree ?? null}
                  title="Live Binary Tree Canvas"
                  selectedNodeId={selectedNodeId}
                  highlightedNodeId={highlightedNodeId}
                  highlightedNullId={highlightedNullId}
                  onSelectNode={(id) => setSelectedNodeId(id)}
                  testId="main-tree-visualizer"
                />

                {/* Quick Traversal Strip for Active Tree */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-slate-700 block mb-1">
                      Preorder (Root → Left → Right)
                    </span>
                    <div data-testid="workspace-preorder" className="font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900">
                      [{original?.metrics.preorder.map((n) => n.label).join(', ') ?? ''}]
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 block mb-1">
                      Inorder (Left → Root → Right)
                    </span>
                    <div data-testid="workspace-inorder" className="font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900">
                      [{original?.metrics.inorder.map((n) => n.label).join(', ') ?? ''}]
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <SerializationPanel
              serialized={serialized}
              onExport={handleExport}
              onSendToRestore={(txt) => {
                setArchiveInput(txt);
                setActiveTab('compare');
              }}
              activeStepIdx={traceStepIdx}
              onChangeStepIdx={setTraceStepIdx}
              busy={busy}
            />
          </div>
        )}

        {activeTab === 'compare' && (
          <CompareVerifyView
            original={original}
            restored={restored}
            archiveInput={archiveInput}
            onChangeArchiveInput={setArchiveInput}
            restoreResult={restoreResult}
            verifyResult={verifyResult}
            onRestore={handleRestore}
            onVerify={handleVerify}
            busy={busy}
          />
        )}

        {activeTab === 'demo' && (
          <RoundTripDemoView
            onSyncGlobalState={syncState}
            onOperationLabel={(label) => setLastOperation(label)}
          />
        )}

        {activeTab === 'damage' && <DamageLabView />}

        {activeTab === 'docs' && <DocsAndJudgesView />}
      </main>
    </div>
  );
}
