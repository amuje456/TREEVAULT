import React, { useState } from 'react';
import { ShieldAlert, XCircle, CheckCircle2, Play } from 'lucide-react';
import { DAMAGED_ARCHIVE_SAMPLES } from '../utils/damagedPresets.ts';
import { treeApi } from '../services/treeApi.ts';
import type { RestoreResponse } from '../types/tree.ts';

export const DamageLabView: React.FC = () => {
  const [selectedId, setSelectedId] = useState(DAMAGED_ARCHIVE_SAMPLES[0].id);
  const [archiveText, setArchiveText] = useState(DAMAGED_ARCHIVE_SAMPLES[0].archiveText);
  const [result, setResult] = useState<RestoreResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedSample =
    DAMAGED_ARCHIVE_SAMPLES.find((s) => s.id === selectedId) ?? DAMAGED_ARCHIVE_SAMPLES[0];

  const handleSelectPreset = (id: string) => {
    const sample = DAMAGED_ARCHIVE_SAMPLES.find((s) => s.id === id);
    if (!sample) return;
    setSelectedId(id);
    setArchiveText(sample.archiveText);
    setResult(null);
  };

  const handleTest = async () => {
    setBusy(true);
    try {
      const res = await treeApi.restore(archiveText);
      setResult(res);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left: Damaged Presets */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Archive Damage Scenarios</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a corruption scenario to verify C++ rejection &amp; error diagnostics
          </p>
        </div>

        <div className="space-y-1.5">
          {DAMAGED_ARCHIVE_SAMPLES.map((sample) => {
            const active = sample.id === selectedId;
            return (
              <button
                key={sample.id}
                type="button"
                onClick={() => handleSelectPreset(sample.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  active
                    ? 'bg-red-50/70 border-red-300 text-slate-900'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{sample.title}</span>
                  <span className="text-[11px] font-mono text-slate-500">{sample.category}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{sample.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Editor & Validation Diagnostics */}
      <div className="lg:col-span-8 space-y-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{selectedSample.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Edit the payload below or test it directly against the C++ Validator &amp; Serializer
              </p>
            </div>
            <button
              type="button"
              onClick={handleTest}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
              Test Archive in C++ Engine
            </button>
          </div>

          <label htmlFor="damage-lab-textarea" className="sr-only">
            Damaged archive payload
          </label>
          <textarea
            id="damage-lab-textarea"
            rows={10}
            value={archiveText}
            onChange={(e) => setArchiveText(e.target.value)}
            className="w-full p-3.5 font-mono text-xs bg-slate-950 text-slate-100 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        {result && !result.ok && (
          <div
            role="alert"
            data-testid="damage-lab-result"
            className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-4"
          >
            <div className="flex items-center gap-2.5 text-red-900">
              <XCircle className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
              <div>
                <h4 className="text-sm font-bold">RESTORATION FAILED</h4>
                <p className="text-xs text-red-800 mt-0.5">{result.message}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white border border-red-200 rounded-lg p-3.5 text-xs">
              <div>
                <span className="text-slate-500 block">Validation Rule Failed</span>
                <span className="font-semibold text-slate-900">{result.ruleFailed}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Error Code</span>
                <span className="font-mono font-semibold text-red-700">{result.errorCode}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Line Number</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {result.lineNumber && result.lineNumber > 0 ? `Line ${result.lineNumber}` : 'Stream EOF'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Expected Token Count</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {result.expectedTokens ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Received Token Count</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {result.receivedTokens ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Partial Reconstruction</span>
                <span className="font-semibold text-emerald-700">
                  {result.reconstructionPrevented ? 'Prevented (Safe)' : 'Blocked'}
                </span>
              </div>
            </div>
          </div>
        )}

        {result && result.ok && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-900 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>
              Archive repaired! C++ engine validated {result.tokenCount} tokens and restored{' '}
              {result.restoredNodeCount} node(s).
            </span>
          </div>
        )}

        {!result && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 text-xs text-slate-600">
            <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            <span>
              Transactional Safety: If any validation rule or preorder check fails, C++ discards the temporary subtree so a corrupted tree is never exposed.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
