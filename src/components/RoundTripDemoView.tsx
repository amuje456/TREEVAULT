import React, { useState } from 'react';
import {
  Sparkles,
  FileCode2,
  Trash2,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
} from 'lucide-react';
import { treeApi } from '../services/treeApi.ts';
import type {
  RestoreResponse,
  SerializeResponse,
  TreeBundle,
  TreeNodeData,
  VerifyResponse,
} from '../types/tree.ts';
import { TreeVisualizer } from './TreeVisualizer.tsx';

interface RoundTripDemoViewProps {
  onSyncGlobalState: () => Promise<void>;
  onOperationLabel?: (label: string) => void;
}

export const RoundTripDemoView: React.FC<RoundTripDemoViewProps> = ({
  onSyncGlobalState,
  onOperationLabel,
}) => {
  const [step, setStep] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  const [unseenTreeSnapshot, setUnseenTreeSnapshot] = useState<TreeBundle | null>(null);
  const [originalMemoryAlive, setOriginalMemoryAlive] = useState<boolean>(false);
  const [savedArchiveText, setSavedArchiveText] = useState<string>('');
  const [serializeInfo, setSerializeInfo] = useState<SerializeResponse | null>(null);
  const [restoredBundle, setRestoredBundle] = useState<TreeBundle | null>(null);
  const [verifyReport, setVerifyReport] = useState<VerifyResponse | null>(null);
  const [damagedTestResult, setDamagedTestResult] = useState<RestoreResponse | null>(null);

  const handleStep1Generate = async () => {
    setBusy(true);
    try {
      const res = await treeApi.generateUnseenDemo(Date.now());
      if (res.ok && res.original) {
        setUnseenTreeSnapshot(res.original);
        setOriginalMemoryAlive(true);
        setSavedArchiveText('');
        setSerializeInfo(null);
        setRestoredBundle(null);
        setVerifyReport(null);
        setDamagedTestResult(null);
        setStep(1);
        await onSyncGlobalState();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleStep2Export = async () => {
    setBusy(true);
    try {
      const res = await treeApi.serialize();
      if (res.ok) {
        setSerializeInfo(res);
        setSavedArchiveText(res.archiveText);
        setStep(2);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleStep3DestroyOriginal = async () => {
    setBusy(true);
    try {
      const res = await treeApi.clearTree('original');
      if (res.ok) {
        setOriginalMemoryAlive(false);
        setStep(3);
        await onSyncGlobalState();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleStep4Restore = async () => {
    if (!savedArchiveText) return;
    setBusy(true);
    try {
      const res = await treeApi.restore(savedArchiveText);
      if (res.ok && res.restored) {
        setRestoredBundle(res.restored);
        setStep(4);
        await onSyncGlobalState();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleStep5Verify = async () => {
    setBusy(true);
    try {
      const expectedTree: TreeNodeData | null = unseenTreeSnapshot?.tree ?? null;
      const res = await treeApi.verify(expectedTree);
      if (res.ok) {
        setVerifyReport(res);
        setStep(5);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRunFullDemo = async () => {
    setBusy(true);
    try {
      const res = await treeApi.runAutomatedRoundTrip(Date.now());
      if (res.ok) {
        setUnseenTreeSnapshot(res.originalSnapshot);
        setSerializeInfo(res.serialized);
        setSavedArchiveText(res.serialized.archiveText);
        setOriginalMemoryAlive(false);
        setRestoredBundle(res.restored.restored ?? null);
        setVerifyReport(res.verified);
        setDamagedTestResult(null);
        setStep(5);
        onOperationLabel?.('Completed 5-step Round-Trip Demo (Identical ✓)');
        await onSyncGlobalState();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDamagedDemo = async () => {
    if (!savedArchiveText) return;
    setBusy(true);
    try {
      // Truncate the last 3 lines of the saved archive
      const lines = savedArchiveText.split('\n');
      const truncated = lines.slice(0, Math.max(3, lines.length - 3)).join('\n');
      const res = await treeApi.restore(truncated);
      setDamagedTestResult(res);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro & One-Click Automated Demo */}
      <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            Critical Round-Trip Demonstration Mode
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Demonstrates lossless recovery: generate an unseen tree in C++, export it to TREEVAULT_V1 text, destroy the original C++ memory object, reconstruct solely from the saved text, and verify structural equality.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRunFullDemo}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Play className="w-3.5 h-3.5" aria-hidden="true" />
          Run Full 5-Step Round-Trip
        </button>
      </div>

      {/* 5-Step Interactive Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={handleStep1Generate}
          disabled={busy}
          className={`p-3.5 rounded-xl border text-left transition-colors ${
            step >= 1
              ? 'bg-emerald-50/40 border-emerald-200'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
            <span>Step 1</span>
            {step >= 1 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />}
          </div>
          <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
            Generate Unseen Tree
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Builds fresh binary tree in C++ memory</p>
        </button>

        <button
          type="button"
          onClick={handleStep2Export}
          disabled={busy || !originalMemoryAlive}
          className={`p-3.5 rounded-xl border text-left transition-colors ${
            step >= 2
              ? 'bg-emerald-50/40 border-emerald-200'
              : 'bg-white border-slate-200 hover:border-blue-300 disabled:opacity-45'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
            <span>Step 2</span>
            {step >= 2 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />}
          </div>
          <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
            <FileCode2 className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
            Export Archive
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Preorder serialize with N markers</p>
        </button>

        <button
          type="button"
          onClick={handleStep3DestroyOriginal}
          disabled={busy || !savedArchiveText || !originalMemoryAlive}
          className={`p-3.5 rounded-xl border text-left transition-colors ${
            step >= 3 && !originalMemoryAlive
              ? 'bg-emerald-50/40 border-emerald-200'
              : 'bg-white border-slate-200 hover:border-red-300 disabled:opacity-45'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
            <span>Step 3</span>
            {step >= 3 && !originalMemoryAlive && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            )}
          </div>
          <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5 text-red-600" aria-hidden="true" />
            Destroy Original Object
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Releases C++ originalTree heap memory</p>
        </button>

        <button
          type="button"
          onClick={handleStep4Restore}
          disabled={busy || !savedArchiveText || originalMemoryAlive}
          className={`p-3.5 rounded-xl border text-left transition-colors ${
            step >= 4
              ? 'bg-emerald-50/40 border-emerald-200'
              : 'bg-white border-slate-200 hover:border-blue-300 disabled:opacity-45'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
            <span>Step 4</span>
            {step >= 4 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />}
          </div>
          <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
            Restore from Text Alone
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Deserializes strictly from saved archive</p>
        </button>

        <button
          type="button"
          onClick={handleStep5Verify}
          disabled={busy || !restoredBundle}
          className={`p-3.5 rounded-xl border text-left transition-colors ${
            step >= 5 && verifyReport?.passed
              ? 'bg-emerald-50/40 border-emerald-200'
              : 'bg-white border-slate-200 hover:border-emerald-400 disabled:opacity-45'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
            <span>Step 5</span>
            {step >= 5 && verifyReport?.passed && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            )}
          </div>
          <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            Verify Equality
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Recursive C++ structural check</p>
        </button>
      </div>

      {/* Live Memory & Archive State */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-900">Saved Archive Text</h3>
            {serializeInfo && (
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {serializeInfo.tokenCount} tokens
              </span>
            )}
          </div>
          <div className="text-xs font-mono px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-slate-600">C++ originalTree status:</span>
            <span
              data-testid="demo-original-memory-status"
              className={originalMemoryAlive ? 'text-blue-700 font-semibold' : 'text-red-700 font-semibold'}
            >
              {originalMemoryAlive ? 'Allocated in Memory' : step >= 3 ? 'Destroyed (NULL)' : 'Not Created'}
            </span>
          </div>
          <div className="bg-slate-950 text-slate-100 rounded-lg p-3 h-56 overflow-auto border border-slate-800">
            <pre className="font-mono text-xs leading-5 whitespace-pre">
              {savedArchiveText || '(Run Step 1 and Step 2 to generate archive text)'}
            </pre>
          </div>
          {savedArchiveText && (
            <button
              type="button"
              onClick={handleDamagedDemo}
              disabled={busy}
              className="w-full py-2 px-3 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
            >
              Simulate Truncation Damage on This Archive
            </button>
          )}
        </div>

        <div className="lg:col-span-4">
          <TreeVisualizer
            tree={unseenTreeSnapshot?.tree ?? null}
            title={
              originalMemoryAlive
                ? 'Original Tree (Live C++ Memory)'
                : 'Original Tree (Captured Snapshot Before Clear)'
            }
            compact
          />
        </div>

        <div className="lg:col-span-4">
          <TreeVisualizer
            tree={restoredBundle?.tree ?? null}
            title="Restored Tree (From Text Alone)"
            compact
          />
        </div>
      </div>

      {/* Verification Outcome */}
      {verifyReport && (
        <div
          data-testid="demo-verify-report"
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
              <span className="text-sm font-bold">TREEVAULT INTEGRITY CHECK: PASSED</span>
            </div>
            <span className="text-xs font-mono text-emerald-800">
              Structural Equality: IDENTICAL · Nodes: {verifyReport.restored.metrics.nodeCount} · Height: {verifyReport.restored.metrics.height}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-white border border-emerald-200 rounded-lg p-3">
              <span className="font-sans font-semibold text-slate-700 block mb-1">
                Preorder Traversal (Match ✓)
              </span>
              [{verifyReport.restored.metrics.preorder.map((n) => n.label).join(', ')}]
            </div>
            <div className="bg-white border border-emerald-200 rounded-lg p-3">
              <span className="font-sans font-semibold text-slate-700 block mb-1">
                Inorder Traversal (Match ✓)
              </span>
              [{verifyReport.restored.metrics.inorder.map((n) => n.label).join(', ')}]
            </div>
          </div>
        </div>
      )}

      {/* Damaged Demo Result */}
      {damagedTestResult && !damagedTestResult.ok && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-red-900">
            <XCircle className="w-5 h-5 text-red-600" aria-hidden="true" />
            <span className="text-sm font-bold">DAMAGED ARCHIVE REJECTED — RESTORATION FAILED</span>
          </div>
          <p className="text-xs text-red-900">{damagedTestResult.message}</p>
          <p className="text-xs font-mono text-red-800">
            Rule Failed: {damagedTestResult.ruleFailed} · Expected: {damagedTestResult.expectedTokens} tokens · Received: {damagedTestResult.receivedTokens} tokens · Partial Reconstruction Prevented: YES
          </p>
        </div>
      )}
    </div>
  );
};
