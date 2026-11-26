import React, { useMemo, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff, FileText, GitFork } from 'lucide-react';
import type { TreeNodeData } from '../types/tree.ts';
import { computeTreeLayout, formatIndentedTree } from '../utils/treeLayout.ts';

interface TreeVisualizerProps {
  tree: TreeNodeData | null;
  title?: string;
  selectedNodeId?: string | null;
  highlightedNodeId?: string | null;
  highlightedNullId?: string | null;
  mismatchPath?: string | null;
  onSelectNode?: (nodeId: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  compact?: boolean;
  testId?: string;
}

export const TreeVisualizer: React.FC<TreeVisualizerProps> = ({
  tree,
  title,
  selectedNodeId,
  highlightedNodeId,
  highlightedNullId,
  mismatchPath,
  onSelectNode,
  emptyTitle = 'Empty Binary Tree (NULL)',
  emptyDescription = 'Add a root node or load a sample tree to inspect its structure.',
  compact = false,
  testId,
}) => {
  const [zoom, setZoom] = useState(1);
  const [showNullMarkers, setShowNullMarkers] = useState(true);
  const [viewMode, setViewMode] = useState<'svg' | 'indented'>('svg');

  const layout = useMemo(
    () =>
      computeTreeLayout(tree, {
        horizontalSpacing: compact ? 58 : 70,
        verticalSpacing: compact ? 76 : 90,
        nodeRadius: compact ? 19 : 22,
      }),
    [tree, compact]
  );

  const indentedText = useMemo(() => formatIndentedTree(tree), [tree]);

  const handleZoomIn = () => setZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.45, Number((z - 0.15).toFixed(2))));
  const handleZoomReset = () => setZoom(1);

  return (
    <div
      data-testid={testId}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/70">
        <div className="flex items-center gap-3 min-w-0">
          {title && (
            <h3 className="text-sm font-semibold text-slate-900 truncate">{title}</h3>
          )}
          {tree && (
            <span className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
              {layout.nodes.length} {layout.nodes.length === 1 ? 'node' : 'nodes'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('svg')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'svg'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" aria-hidden="true" />
              Graph
            </button>
            <button
              type="button"
              onClick={() => setViewMode('indented')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'indented'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              Indented
            </button>
          </div>

          {viewMode === 'svg' && (
            <>
              <button
                type="button"
                onClick={() => setShowNullMarkers((v) => !v)}
                aria-label={showNullMarkers ? 'Hide NULL branch markers' : 'Show NULL branch markers'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  showNullMarkers
                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
              >
                {showNullMarkers ? (
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                NULL Markers
              </button>

              <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  aria-label="Zoom out tree"
                  className="p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-xs font-mono text-slate-600 tabular-nums border-x border-slate-200">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  aria-label="Zoom in tree"
                  className="p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  aria-label="Reset zoom"
                  className="p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l border-slate-200 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {!tree ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-slate-50/40 min-h-[280px]">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-mono text-sm font-semibold mb-3">
            NULL
          </div>
          <p className="text-sm font-semibold text-slate-900">{emptyTitle}</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">{emptyDescription}</p>
        </div>
      ) : viewMode === 'indented' ? (
        <div className="p-5 bg-slate-950 text-slate-100 min-h-[280px] overflow-auto">
          <pre className="font-mono text-xs leading-6 whitespace-pre">{indentedText}</pre>
        </div>
      ) : (
        <div
          className="overflow-auto bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] bg-slate-50/40"
          style={{ minHeight: compact ? '280px' : '360px', maxHeight: compact ? '420px' : '540px' }}
        >
          <div className="w-fit min-w-full p-4">
            <svg
              width={Math.round(layout.width * zoom)}
              height={Math.round(layout.height * zoom)}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              role="img"
              aria-label={title ? `${title} binary tree diagram` : 'Binary tree diagram'}
              className="select-none overflow-visible mx-auto block max-w-none"
            >
              {/* Explicit NULL branch markers */}
              {(showNullMarkers || highlightedNullId) &&
                layout.nullMarkers.map((nm) => {
                  const isHighlighted = highlightedNullId === nm.id;
                  const isMismatched = mismatchPath === nm.path;
                  if (!showNullMarkers && !isHighlighted && !isMismatched) return null;

                  const strokeColor = isMismatched
                    ? '#dc2626'
                    : isHighlighted
                    ? '#0284c7'
                    : '#cbd5e1';

                  return (
                    <g key={nm.id}>
                      <line
                        x1={nm.x1}
                        y1={nm.y1 + layout.nodeRadius}
                        x2={nm.x2}
                        y2={nm.y2 - 10}
                        stroke={strokeColor}
                        strokeWidth={isHighlighted || isMismatched ? 2 : 1.25}
                        strokeDasharray="4 3"
                      />
                      <rect
                        x={nm.x2 - 11}
                        y={nm.y2 - 10}
                        width={22}
                        height={20}
                        rx={5}
                        fill={isMismatched ? '#fef2f2' : isHighlighted ? '#e0f2fe' : '#f8fafc'}
                        stroke={isMismatched ? '#dc2626' : isHighlighted ? '#0284c7' : '#cbd5e1'}
                        strokeWidth={isHighlighted || isMismatched ? 1.75 : 1}
                      />
                      <text
                        x={nm.x2}
                        y={nm.y2 + 4}
                        textAnchor="middle"
                        className="font-mono text-[10px] font-semibold"
                        fill={isMismatched ? '#b91c1c' : isHighlighted ? '#0369a1' : '#94a3b8'}
                      >
                        N
                      </text>
                    </g>
                  );
                })}

              {/* Parent-child edges */}
              {layout.edges.map((edge) => {
                const midX = (edge.x1 + edge.x2) / 2;
                const midY = (edge.y1 + edge.y2) / 2;
                const isLeft = edge.side === 'left';
                return (
                  <g key={edge.id}>
                    <line
                      x1={edge.x1}
                      y1={edge.y1}
                      x2={edge.x2}
                      y2={edge.y2}
                      stroke={isLeft ? '#1d4ed8' : '#0284c7'}
                      strokeWidth={2}
                      strokeOpacity={0.75}
                    />
                    <rect
                      x={midX - 8}
                      y={midY - 8}
                      width={16}
                      height={16}
                      rx={4}
                      fill="#ffffff"
                      stroke={isLeft ? '#bfdbfe' : '#bae6fd'}
                      strokeWidth={1}
                    />
                    <text
                      x={midX}
                      y={midY + 3.5}
                      textAnchor="middle"
                      className="font-mono text-[9px] font-bold"
                      fill={isLeft ? '#1d4ed8' : '#0369a1'}
                    >
                      {isLeft ? 'L' : 'R'}
                    </text>
                  </g>
                );
              })}

              {/* Tree Nodes */}
              {layout.nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isHighlighted = highlightedNodeId === node.id;
                const isMismatched = mismatchPath === node.path;

                let fill = '#0f172a';
                let stroke = '#1e293b';
                let textFill = '#ffffff';
                let ringColor: string | null = null;

                if (isMismatched) {
                  fill = '#dc2626';
                  stroke = '#991b1b';
                  ringColor = '#fca5a5';
                } else if (isHighlighted) {
                  fill = '#0284c7';
                  stroke = '#0369a1';
                  ringColor = '#7dd3fc';
                } else if (isSelected) {
                  fill = '#1d4ed8';
                  stroke = '#1e40af';
                  ringColor = '#93c5fd';
                }

                const displayLabel =
                  node.label.length > 15 ? `${node.label.slice(0, 14)}…` : node.label;
                const boxH = layout.nodeRadius * 2;
                const boxW = node.boxWidth;
                const isCircle = boxW <= boxH + 1;

                return (
                  <g
                    key={node.id}
                    onClick={() => onSelectNode?.(node.id)}
                    className={onSelectNode ? 'cursor-pointer' : undefined}
                    role={onSelectNode ? 'button' : undefined}
                    tabIndex={onSelectNode ? 0 : undefined}
                    aria-label={onSelectNode ? `Select node ${node.label}` : undefined}
                    onKeyDown={(e) => {
                      if (onSelectNode && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onSelectNode(node.id);
                      }
                    }}
                  >
                    <title>{`${node.label} (${node.path})`}</title>
                    {ringColor && (
                      isCircle ? (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={layout.nodeRadius + 5}
                          fill="none"
                          stroke={ringColor}
                          strokeWidth={2.5}
                        />
                      ) : (
                        <rect
                          x={node.x - boxW / 2 - 5}
                          y={node.y - boxH / 2 - 5}
                          width={boxW + 10}
                          height={boxH + 10}
                          rx={layout.nodeRadius + 5}
                          fill="none"
                          stroke={ringColor}
                          strokeWidth={2.5}
                        />
                      )
                    )}
                    {isCircle ? (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={layout.nodeRadius}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={2}
                      />
                    ) : (
                      <rect
                        x={node.x - boxW / 2}
                        y={node.y - boxH / 2}
                        width={boxW}
                        height={boxH}
                        rx={layout.nodeRadius}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={2}
                      />
                    )}
                    <text
                      x={node.x}
                      y={node.y + 4}
                      textAnchor="middle"
                      fill={textFill}
                      className="font-mono text-xs font-semibold pointer-events-none"
                    >
                      {displayLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {tree && viewMode === 'svg' && (
        <div className="px-4 py-2 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-blue-700 inline-block" aria-hidden="true" />
              Left Branch (L)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sky-600 inline-block" aria-hidden="true" />
              Right Branch (R)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-mono text-[10px] px-1 border border-slate-300 rounded text-slate-600">N</span>
              Explicit NULL Marker
            </span>
          </div>
          {onSelectNode && (
            <span className="text-slate-400">Click any node to select parent</span>
          )}
        </div>
      )}
    </div>
  );
};
