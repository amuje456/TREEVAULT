import React, { useRef } from 'react';
import {
  Upload,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import type {
  RestoreResponse,
  TreeBundle,
  VerifyResponse,
} from '../types/tree.ts';
import { TreeVisualizer } from './TreeVisualizer.tsx';

interface CompareVerifyViewProps {
  original: TreeBundle | null;
  restored: TreeBundle | null;
  archiveInput: string;
  onChangeArchiveInput: (val: string) => void;
  restoreResult: RestoreResponse | null;
  verifyResult: VerifyResponse | null;
  onRestore: () => Promise<void>;
  onVerify: () => Promise<void>;
  busy: boolean;
}

export const CompareVerifyView: React.FC<CompareVerifyViewProps> = ({
  original,
  restored,
  archiveInput,
  onChangeArchiveInput,
  restoreResult,
  verifyResult,
  onRestore,
  onVerify,
  busy,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    onChangeArchiveInput(text);
    e.target.value = '';
  };

  const origPreLabels = original?.metrics.preorder.map((n) => n.label) ?? [];
  const restPreLabels = restored?.metrics.preorder.map((n) => n.label) ?? [];
  const origInLabels = original?.metrics.inorder.map((n) => n.label) ?? [];
  const restInLabels = restored?.metrics.inorder.map((n) => n.label) ?? [];
  const origPostLabels = original?.metrics.postorder.map((n) => n.label) ?? [];
  const restPostLabels = restored?.metrics.postorder.map((n) => n.label) ?? [];

  const restoreFailed = restoreResult && !restoreResult.ok;

  return (
    <div className="space-y-6">
      {/* Restore Workspace */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Archive Restoration &amp; Structural Verification
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste a TREEVAULT_V1 archive or upload a .treevault file to validate and reconstruct the tree in C++
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".treevault,.txt"
              onChange={handleFileUpload}
              className="hidden"
              aria-label="Upload .treevault archive file"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              Upload .treevault
            </button>
            <button
              type="button"
              onClick={onRestore}
              disabled={busy || !archiveInput.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Validate &amp; Restore Tree
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="restore-archive-textarea" className="block text-xs font-medium text-slate-700 mb-1.5">
            Archive Text Input
          </label>
          <textarea
            id="restore-archive-textarea"
            rows={7}
            value={archiveInput}
            onChange={(e) => onChangeArchiveInput(e.target.value)}
            placeholder={'TREEVAULT_V1\nTOKENS: 9\n\nV:A\nV:B\nN\nV:D\nN\nN\nV:C\nN\nN'}
            className="w-full p-3.5 font-mono text-xs bg-slate-950 text-slate-100 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {restoreFailed && (
          <div
            role="alert"
            data-testid="restore-error-banner"
            className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2"
          >
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
              <span className="text-sm font-bold tracking-tight">RESTORATION FAILED</span>
              <span className="text-xs font-mono text-red-700">({restoreResult.errorCode})</span>
            </div>
            <p className="text-xs text-red-900">{restoreResult.message}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-red-200/80 text-xs">
              <div>
                <span className="text-red-700 block">Rule Failed</span>
                <span className="font-semibold text-red-950">{restoreResult.ruleFailed ?? 'Archive Grammar'}</span>
              </div>
              <div>
                <span className="text-red-700 block">Expected Tokens</span>
                <span className="font-mono font-semibold text-red-950 tabular-nums">
                  {restoreResult.expectedTokens ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-red-700 block">Received Tokens</span>
                <span className="font-mono font-semibold text-red-950 tabular-nums">
                  {restoreResult.receivedTokens ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-red-700 block">Partial Restoration</span>
                <span className="font-semibold text-red-950">
                  {restoreResult.reconstructionPrevented ? 'Prevented (Transactional)' : 'Blocked'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Before/After Comparison */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Before / After Structural Comparison
            </h3>
            <p className="text-xs text-slate-500">
              Side-by-side comparison of the original in-memory tree and the independently restored tree
            </p>
          </div>
          <button
            type="button"
            onClick={onVerify}
            disabled={busy || !restored}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Run C++ Structural Equality Check
          </button>
        </div>

        {verifyResult && (
          <div
            data-testid="verification-status-banner"
            className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
              verifyResult.passed
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-red-50 border-red-200 text-red-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {verifyResult.passed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div>
                <p className="text-sm font-bold">
                  {verifyResult.identical
                    ? 'TREE STRUCTURE IDENTICAL ✓'
                    : 'TREE STRUCTURE MISMATCH ✕'}
                </p>
                <p className="text-xs mt-0.5 opacity-90">
                  {verifyResult.identical
                    ? 'Genuine C++ recursive structural equality confirmed every node label, left subtree, right subtree, and NULL position matches.'
                    : verifyResult.mismatchReason}
                </p>
              </div>
            </div>
            <div className="text-xs font-mono font-semibold">
              {verifyResult.passed
                ? 'TREEVAULT INTEGRITY CHECK: PASSED'
                : `MISMATCH AT: ${verifyResult.mismatchPath}`}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TreeVisualizer
            tree={original?.tree ?? null}
            title="LEFT · Original Tree"
            mismatchPath={verifyResult && !verifyResult.identical ? verifyResult.mismatchPath : null}
            emptyTitle="Original Tree Cleared or Empty"
            emptyDescription="Original in-memory tree is currently empty (NULL)."
            compact
            testId="compare-original-tree"
          />
          <TreeVisualizer
            tree={restoreFailed ? null : restored?.tree ?? null}
            title="RIGHT · Restored Tree"
            mismatchPath={verifyResult && !verifyResult.identical ? verifyResult.mismatchPath : null}
            emptyTitle={restoreFailed ? 'Restoration Rejected' : 'No Restored Tree Yet'}
            emptyDescription={
              restoreFailed
                ? 'Validation failed, so no corrupted or partial tree was constructed.'
                : 'Click "Validate & Restore Tree" to deserialize the archive into a fresh C++ tree.'
            }
            compact
            testId="compare-restored-tree"
          />
        </div>
      </div>

      {/* Traversal Analysis & Integrity Report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Traversal Analysis Comparison</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Mandatory Preorder &amp; Inorder signatures plus Postorder verification computed in C++
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                name: 'Preorder (Root → Left → Right)',
                orig: origPreLabels,
                rest: restPreLabels,
              },
              {
                name: 'Inorder (Left → Root → Right)',
                orig: origInLabels,
                rest: restInLabels,
              },
              {
                name: 'Postorder (Left → Right → Root)',
                orig: origPostLabels,
                rest: restPostLabels,
              },
            ].map((row) => {
              const matches =
                !restoreFailed &&
                restored &&
                JSON.stringify(row.orig) === JSON.stringify(row.rest);
              return (
                <div key={row.name} className="border border-slate-200 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800">{row.name}</span>
                    {restored && !restoreFailed && (
                      <span
                        className={`text-xs font-semibold ${
                          matches ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {matches ? 'Match ✓' : 'Mismatch ✕'}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200 truncate">
                      <span className="text-slate-400 mr-1.5">Orig:</span>
                      [{row.orig.join(', ')}]
                    </div>
                    <div className="bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200 truncate">
                      <span className="text-slate-400 mr-1.5">Rest:</span>
                      {restoreFailed || !restored ? '—' : `[${row.rest.join(', ')}]`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Integrity Report Table */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Tree Integrity Report</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Structural telemetry comparing original and restored memory objects
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Property</th>
                  <th className="text-right font-medium px-3 py-2">Original</th>
                  <th className="text-right font-medium px-3 py-2">Restored</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                <tr>
                  <td className="px-3 py-2 font-sans text-slate-700">Node Count</td>
                  <td className="px-3 py-2 text-right">{original?.metrics.nodeCount ?? 0}</td>
                  <td className="px-3 py-2 text-right">
                    {restoreFailed || !restored ? '—' : restored.metrics.nodeCount}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-sans text-slate-700">Tree Height</td>
                  <td className="px-3 py-2 text-right">{original?.metrics.height ?? 0}</td>
                  <td className="px-3 py-2 text-right">
                    {restoreFailed || !restored ? '—' : restored.metrics.height}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-sans text-slate-700">Leaf Nodes</td>
                  <td className="px-3 py-2 text-right">{original?.metrics.leafCount ?? 0}</td>
                  <td className="px-3 py-2 text-right">
                    {restoreFailed || !restored ? '—' : restored.metrics.leafCount}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-sans text-slate-700">Archive Status</td>
                  <td colSpan={2} className="px-3 py-2 text-right font-sans font-semibold">
                    {restoreFailed
                      ? 'Rejected (Malformed)'
                      : restoreResult?.ok
                      ? 'Validated (TREEVAULT_V1)'
                      : 'Pending'}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-sans text-slate-700">Structural Equality</td>
                  <td colSpan={2} className="px-3 py-2 text-right font-sans font-semibold">
                    {verifyResult
                      ? verifyResult.identical
                        ? 'PASSED (Identical)'
                        : 'FAILED (Mismatch)'
                      : 'Not Verified Yet'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
