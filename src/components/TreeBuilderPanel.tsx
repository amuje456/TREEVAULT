import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, RotateCcw, DownloadCloud, AlertCircle } from 'lucide-react';
import type { TreeNodeData } from '../types/tree.ts';

interface TreeBuilderPanelProps {
  tree: TreeNodeData | null;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onAddRoot: (label: string) => Promise<void>;
  onInsertChild: (parentId: string, side: 'left' | 'right', label: string) => Promise<void>;
  onEditLabel: (nodeId: string, label: string) => Promise<void>;
  onDeleteNode: (nodeId: string) => Promise<void>;
  onLoadSample: (preset: string) => Promise<void>;
  onImportText: (mode: 'bracket' | 'preorder_csv', input: string) => Promise<void>;
  onResetTree: () => Promise<void>;
  busy: boolean;
  errorMsg: string | null;
}

interface FlatNodeInfo {
  id: string;
  label: string;
  hasLeft: boolean;
  hasRight: boolean;
  leftLabel: string | null;
  rightLabel: string | null;
}

function flattenNodes(root: TreeNodeData | null): FlatNodeInfo[] {
  const out: FlatNodeInfo[] = [];
  function walk(n: TreeNodeData | null) {
    if (!n) return;
    out.push({
      id: n.id,
      label: n.label,
      hasLeft: n.left !== null,
      hasRight: n.right !== null,
      leftLabel: n.left?.label ?? null,
      rightLabel: n.right?.label ?? null,
    });
    walk(n.left);
    walk(n.right);
  }
  walk(root);
  return out;
}

export const TreeBuilderPanel: React.FC<TreeBuilderPanelProps> = ({
  tree,
  selectedNodeId,
  onSelectNode,
  onAddRoot,
  onInsertChild,
  onEditLabel,
  onDeleteNode,
  onLoadSample,
  onImportText,
  onResetTree,
  busy,
  errorMsg,
}) => {
  const nodes = flattenNodes(tree);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? nodes[0] ?? null;

  const [rootLabel, setRootLabel] = useState('A');
  const [childSide, setChildSide] = useState<'left' | 'right'>('left');
  const [childLabel, setChildLabel] = useState('');
  const [editValue, setEditValue] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importMode, setImportMode] = useState<'bracket' | 'preorder_csv'>('bracket');
  const [importInput, setImportInput] = useState('A(B(,D),C)');

  useEffect(() => {
    if (selectedNode) {
      setEditValue(selectedNode.label);
      if (selectedNode.hasLeft && !selectedNode.hasRight) {
        setChildSide('right');
      } else if (!selectedNode.hasLeft) {
        setChildSide('left');
      }
    } else {
      setEditValue('');
    }
  }, [selectedNode?.id, selectedNode?.label, selectedNode?.hasLeft, selectedNode?.hasRight]);

  const handleRootSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddRoot(rootLabel.trim());
  };

  const handleChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNode) return;
    await onInsertChild(selectedNode.id, childSide, childLabel.trim());
    setChildLabel('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNode) return;
    await onEditLabel(selectedNode.id, editValue.trim());
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onImportText(importMode, importInput);
  };

  const targetOccupied =
    selectedNode !== null &&
    ((childSide === 'left' && selectedNode.hasLeft) ||
      (childSide === 'right' && selectedNode.hasRight));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-5">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Tree Construction</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Build nodes interactively or import a documented text tree
          </p>
        </div>
        <button
          type="button"
          onClick={onResetTree}
          disabled={busy || !tree}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-45 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Clear Tree
        </button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sample Presets */}
      <div>
        <label htmlFor="sample-preset-select" className="block text-xs font-medium text-slate-700 mb-1.5">
          Load Sample Tree
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => onLoadSample('illustrative')}
            className="px-2.5 py-2 text-xs font-medium text-left text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-800 border border-slate-200 rounded-lg transition-colors truncate"
          >
            Illustrative (A, B→D, C)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onLoadSample('museum_lineage')}
            className="px-2.5 py-2 text-xs font-medium text-left text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-800 border border-slate-200 rounded-lg transition-colors truncate"
          >
            Museum Lineage
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onLoadSample('left_skewed')}
            className="px-2.5 py-2 text-xs font-medium text-left text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-800 border border-slate-200 rounded-lg transition-colors truncate"
          >
            Left-Only Chain
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onLoadSample('right_skewed')}
            className="px-2.5 py-2 text-xs font-medium text-left text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-800 border border-slate-200 rounded-lg transition-colors truncate"
          >
            Right-Only Chain
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onLoadSample('duplicate_labels')}
            className="col-span-2 px-2.5 py-2 text-xs font-medium text-left text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-800 border border-slate-200 rounded-lg transition-colors truncate"
          >
            Duplicate Labels &amp; Literal &quot;N&quot; Node
          </button>
        </div>
      </div>

      {/* Add Root vs Node Editor */}
      {!tree ? (
        <form onSubmit={handleRootSubmit} className="space-y-3 pt-2 border-t border-slate-100">
          <div>
            <label htmlFor="root-label-input" className="block text-xs font-medium text-slate-700 mb-1">
              Root Node Label
            </label>
            <div className="flex gap-2">
              <input
                id="root-label-input"
                type="text"
                value={rootLabel}
                onChange={(e) => setRootLabel(e.target.value)}
                placeholder="e.g. A"
                maxLength={64}
                className="flex-1 min-w-0 px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                disabled={busy || !rootLabel.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Add Root
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="space-y-4 pt-2 border-t border-slate-100">
          {/* Selected Parent Selector */}
          <div>
            <label htmlFor="parent-node-select" className="block text-xs font-medium text-slate-700 mb-1">
              Selected Parent Node
            </label>
            <select
              id="parent-node-select"
              value={selectedNode?.id ?? ''}
              onChange={(e) => onSelectNode(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label} (L: {n.leftLabel ?? 'NULL'}, R: {n.rightLabel ?? 'NULL'})
                </option>
              ))}
            </select>
          </div>

          {/* Insert Child */}
          <form onSubmit={handleChildSubmit} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">Target Branch</span>
              <span className="text-xs text-slate-500 font-mono">
                {selectedNode
                  ? `${childSide === 'left' ? 'Left' : 'Right'}: ${
                      childSide === 'left'
                        ? selectedNode.leftLabel ?? 'Empty'
                        : selectedNode.rightLabel ?? 'Empty'
                    }`
                  : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setChildSide('left')}
                className={`py-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  childSide === 'left'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Left Child {selectedNode?.hasLeft ? '(Filled)' : '(Empty)'}
              </button>
              <button
                type="button"
                onClick={() => setChildSide('right')}
                className={`py-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  childSide === 'right'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Right Child {selectedNode?.hasRight ? '(Filled)' : '(Empty)'}
              </button>
            </div>

            <div className="flex gap-2">
              <label htmlFor="child-label-input" className="sr-only">
                New Child Label
              </label>
              <input
                id="child-label-input"
                type="text"
                value={childLabel}
                onChange={(e) => setChildLabel(e.target.value)}
                placeholder={`New ${childSide} child label`}
                maxLength={64}
                className="flex-1 min-w-0 px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                disabled={busy || !childLabel.trim() || targetOccupied}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-45 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Add {childSide === 'left' ? 'Left' : 'Right'}
              </button>
            </div>
            {targetOccupied && (
              <p className="text-xs text-amber-700">
                The {childSide} branch of &quot;{selectedNode?.label}&quot; already has a child. Delete it first or pick the empty branch.
              </p>
            )}
          </form>

          {/* Edit Label & Delete Subtree */}
          {selectedNode && (
            <form onSubmit={handleEditSubmit} className="pt-3 border-t border-slate-100 space-y-2">
              <label htmlFor="edit-label-input" className="block text-xs font-medium text-slate-700">
                Edit or Delete Selected Node ({selectedNode.label})
              </label>
              <div className="flex gap-2">
                <input
                  id="edit-label-input"
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  maxLength={64}
                  className="flex-1 min-w-0 px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  disabled={busy || !editValue.trim() || editValue.trim() === selectedNode.label}
                  aria-label="Update node label"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-45 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                  Rename
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDeleteNode(selectedNode.id)}
                  aria-label={`Delete node ${selectedNode.label} and subtree`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-45 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Import Documented Text Representation */}
      <div className="pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setShowImport((v) => !v)}
          aria-expanded={showImport}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors"
        >
          <DownloadCloud className="w-3.5 h-3.5" aria-hidden="true" />
          {showImport ? 'Hide Text Import' : 'Import from Bracket or Preorder Text'}
        </button>

        {showImport && (
          <form onSubmit={handleImportSubmit} className="mt-3 space-y-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1 p-0.5 bg-white border border-slate-200 rounded-md">
              <button
                type="button"
                onClick={() => {
                  setImportMode('bracket');
                  setImportInput('A(B(,D),C)');
                }}
                className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                  importMode === 'bracket' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Bracket Notation
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportMode('preorder_csv');
                  setImportInput('A, B, N, D, N, N, C, N, N');
                }}
                className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                  importMode === 'preorder_csv' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Preorder + N Sequence
              </button>
            </div>
            <label htmlFor="import-text-input" className="block text-[11px] text-slate-600">
              {importMode === 'bracket'
                ? 'Syntax: Root(Left,Right) — leave empty side blank, e.g. A(B(,D),C)'
                : 'Syntax: Comma-separated preorder tokens using N for NULL, e.g. A, B, N, D, N, N, C, N, N'}
            </label>
            <input
              id="import-text-input"
              type="text"
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={busy || !importInput.trim()}
              className="w-full py-1.5 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-md transition-colors"
            >
              Parse &amp; Construct in C++
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
