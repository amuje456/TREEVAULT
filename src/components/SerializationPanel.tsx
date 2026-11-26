import React, { useEffect, useState } from 'react';
import {
  Download,
  Copy,
  Check,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  FileCode2,
} from 'lucide-react';
import type { SerializeResponse, TraceStep } from '../types/tree.ts';

interface SerializationPanelProps {
  serialized: SerializeResponse | null;
  onExport: () => Promise<void>;
  onSendToRestore: (archiveText: string) => void;
  activeStepIdx: number;
  onChangeStepIdx: (idx: number) => void;
  busy: boolean;
}

export const SerializationPanel: React.FC<SerializationPanelProps> = ({
  serialized,
  onExport,
  onSendToRestore,
  activeStepIdx,
  onChangeStepIdx,
  busy,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const trace: TraceStep[] = serialized?.trace ?? [];
  const currentStep =
    activeStepIdx >= 0 && activeStepIdx < trace.length ? trace[activeStepIdx] : null;

  useEffect(() => {
    if (!isPlaying) return;
    if (trace.length === 0 || activeStepIdx >= trace.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      onChangeStepIdx(activeStepIdx + 1);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [isPlaying, activeStepIdx, trace.length, onChangeStepIdx]);

  const handleCopy = async () => {
    if (!serialized?.archiveText) return;
    try {
      await navigator.clipboard.writeText(serialized.archiveText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored in restricted clipboard contexts
    }
  };

  const handleDownload = () => {
    if (!serialized?.archiveText) return;
    const blob = new Blob([serialized.archiveText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tree-archive.treevault';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePlayToggle = () => {
    if (trace.length === 0) return;
    if (activeStepIdx < 0 || activeStepIdx >= trace.length - 1) {
      onChangeStepIdx(0);
    }
    setIsPlaying((p) => !p);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left: Export & Archive Text */}
      <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Preorder Serialization &amp; Archive Export
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                C++ Root → Left → Right traversal with explicit NULL markers (N)
              </p>
            </div>
            <button
              type="button"
              onClick={onExport}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <FileCode2 className="w-3.5 h-3.5" aria-hidden="true" />
              Export Tree
            </button>
          </div>

          {!serialized ? (
            <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50/60">
              <p className="text-xs font-medium text-slate-700">
                No archive generated yet for the current tree
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Click &quot;Export Tree&quot; to invoke the C++ preorder serializer and generate a TREEVAULT_V1 file.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 border-y border-slate-100 py-2">
                <div className="flex items-center gap-3 font-mono tabular-nums">
                  <span>Format: TREEVAULT_V1</span>
                  <span aria-hidden="true">·</span>
                  <span>Nodes: {serialized.nodeCount}</span>
                  <span aria-hidden="true">·</span>
                  <span>Tokens: {serialized.tokenCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    Download .treevault
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 text-slate-100 rounded-lg p-3.5 max-h-56 overflow-auto border border-slate-800">
                <pre data-testid="generated-archive-text" className="font-mono text-xs leading-5 whitespace-pre">
                  {serialized.archiveText}
                </pre>
              </div>
            </>
          )}
        </div>

        {serialized && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              V: marks node value · N marks empty child position
            </span>
            <button
              type="button"
              onClick={() => onSendToRestore(serialized.archiveText)}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 underline underline-offset-2 whitespace-nowrap"
            >
              Send Archive to Restore &amp; Verify →
            </button>
          </div>
        )}
      </div>

      {/* Right: Step-by-Step C++ Serialization Trace */}
      <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Step-by-Step C++ Execution Trace
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect every recursive call emitted by C++ Serializer::serializeRec
              </p>
            </div>
            {trace.length > 0 && (
              <span className="text-xs font-mono text-slate-600 tabular-nums">
                Step {activeStepIdx >= 0 ? activeStepIdx + 1 : 0} / {trace.length}
              </span>
            )}
          </div>

          {trace.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50/60">
              <p className="text-xs font-medium text-slate-700">
                Export the tree to record its C++ execution trace
              </p>
              <p className="text-xs text-slate-500 mt-1">
                You can then play, pause, and step forward/backward through every node visit and NULL emission.
              </p>
            </div>
          ) : (
            <>
              {/* Playback Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handlePlayToggle}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" aria-hidden="true" />
                      Play Trace
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    onChangeStepIdx(Math.max(0, activeStepIdx - 1));
                  }}
                  disabled={activeStepIdx <= 0}
                  aria-label="Previous trace step"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-45 rounded-lg transition-colors"
                >
                  <SkipBack className="w-3.5 h-3.5" aria-hidden="true" />
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    onChangeStepIdx(Math.min(trace.length - 1, activeStepIdx + 1));
                  }}
                  disabled={activeStepIdx >= trace.length - 1}
                  aria-label="Next trace step"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-45 rounded-lg transition-colors"
                >
                  Next
                  <SkipForward className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    onChangeStepIdx(-1);
                  }}
                  disabled={activeStepIdx < 0}
                  aria-label="Reset trace step"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 disabled:opacity-45 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  Reset
                </button>
              </div>

              {/* Active Step Card */}
              <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70 space-y-2">
                {currentStep ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-900">
                        Step {currentStep.step}:{' '}
                        {currentStep.operation === 'VISIT_NODE'
                          ? `Visit Node "${currentStep.nodeLabel}"`
                          : 'Emit NULL Marker'}
                      </span>
                      <span
                        className={`font-mono font-semibold px-2 py-0.5 rounded ${
                          currentStep.operation === 'VISIT_NODE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        Token: {currentStep.token}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{currentStep.description}</p>
                    <div className="pt-2 border-t border-slate-200">
                      <span className="block text-[11px] font-medium text-slate-500 mb-1">
                        Archive Buffer State ({currentStep.tokensSoFar.length} / {trace.length} tokens)
                      </span>
                      <div className="font-mono text-xs text-slate-900 bg-white border border-slate-200 rounded p-2 break-all">
                        {currentStep.tokensSoFar.join(', ')}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-600">
                    Press &quot;Play Trace&quot; or &quot;Next&quot; to step through the C++ preorder serialization and highlight each node or NULL branch on the canvas above.
                  </p>
                )}
              </div>

              {/* Step List */}
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {trace.map((step, idx) => (
                  <button
                    key={step.step}
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      onChangeStepIdx(idx);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-2 transition-colors ${
                      idx === activeStepIdx
                        ? 'bg-blue-50 text-blue-900 font-medium'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="truncate">
                      <span className="font-mono text-slate-400 mr-2 tabular-nums">
                        {String(step.step).padStart(2, '0')}
                      </span>
                      {step.description}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 shrink-0">
                      {step.token}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
