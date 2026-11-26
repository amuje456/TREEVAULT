import React, { useState } from 'react';
import { BookOpen, Search, ChevronDown, ChevronRight } from 'lucide-react';

const COMPLEXITY_ROWS = [
  { op: 'Preorder Serialization', time: 'O(N)', space: 'O(N) archive + O(H) stack', note: 'Visits each of N nodes and N+1 null slots once' },
  { op: 'Recursive Deserialization', time: 'O(N)', space: 'O(N) tree + O(H) stack', note: 'Consumes 2N+1 tokens linearly in one recursive pass' },
  { op: 'Preorder Traversal', time: 'O(N)', space: 'O(N) output + O(H) stack', note: 'Root -> Left -> Right' },
  { op: 'Inorder Traversal', time: 'O(N)', space: 'O(N) output + O(H) stack', note: 'Left -> Root -> Right' },
  { op: 'Postorder Traversal', time: 'O(N)', space: 'O(N) output + O(H) stack', note: 'Left -> Right -> Root' },
  { op: 'Level-Order Traversal', time: 'O(N)', space: 'O(W) queue <= O(N)', note: 'Breadth-first via std::queue' },
  { op: 'Structural Equality Check', time: 'O(N)', space: 'O(H) stack', note: 'Compares corresponding nodes & NULLs recursively' },
  { op: 'Node Count / Height / Leaf Count', time: 'O(N)', space: 'O(H) stack', note: 'Single recursive traversal of all nodes' },
];

const CPP_FUNCTIONS = [
  {
    name: 'Serializer::serializeRec',
    purpose: 'Recursively serializes a binary tree in preorder while recording execution trace steps.',
    params: 'const TreeNode* node, parentId, branch, tokens&, trace&',
    returns: 'void (appends tokens and TraceStep objects)',
    concept: 'Binary Tree + Preorder Recursion + Explicit Null Markers',
    complexity: 'Time: O(N) · Auxiliary Stack Space: O(H)',
  },
  {
    name: 'Serializer::deserializeRec',
    purpose: 'Reconstructs a binary tree from a validated preorder token stream into a temporary unique_ptr.',
    params: 'tokens&, size_t& index, int& nextNodeId, int& nodeCount, unique_ptr<TreeNode>& outNode, DeserializeResult& errOut',
    returns: 'bool (true on valid subtree, false on incomplete stream or limit overflow)',
    concept: 'Preorder Tree Reconstruction + Transactional Memory Safety',
    complexity: 'Time: O(N) · Auxiliary Stack Space: O(H)',
  },
  {
    name: 'Validator::validateArchive',
    purpose: 'Enforces TREEVAULT_V1 header, TOKENS count, non-empty V: labels, and exact token line count before reconstruction.',
    params: 'const std::string& archiveText',
    returns: 'ValidationResult (valid flag, errorCode, ruleFailed, expected/received counts)',
    concept: 'Line-by-Line Grammar & Bounds Validation',
    complexity: 'Time: O(L) characters · Space: O(N) tokens',
  },
  {
    name: 'BinaryTree::compareRec',
    purpose: 'Performs genuine structural equality checking across two trees rather than trusting traversal strings alone.',
    params: 'const TreeNode* a, const TreeNode* b, const std::string& path, StructuralComparisonResult& res',
    returns: 'void (populates identical flag and exact mismatchPath on divergence)',
    concept: 'Simultaneous Two-Tree Recursion',
    complexity: 'Time: O(N) · Auxiliary Stack Space: O(H)',
  },
  {
    name: 'BinaryTree::deleteNode',
    purpose: 'Deletes a target node and its entire subtree cleanly via std::unique_ptr::reset() with zero memory leaks.',
    params: 'const std::string& nodeId',
    returns: 'OperationResult (removedCount)',
    concept: 'RAII Smart Pointer Ownership',
    complexity: 'Time: O(N) · Space: O(H)',
  },
];

const JUDGES_QA: Array<{ q: string; a: string }> = [
  { q: '1. Why did you choose preorder traversal for serialization?', a: 'Preorder visits Root first, then Left, then Right. When deserializing, reading the first token immediately tells us whether to allocate a parent node or return nullptr before recursively building its left and right subtrees in a single pass.' },
  { q: '2. Why are explicit null markers (N) necessary?', a: 'Without null markers, two structurally different trees can produce the exact same preorder list (for example, A with left child B vs A with right child B both yield [A, B]). Explicit N markers record every absent child position, making the mapping 1-to-1 and lossless.' },
  { q: '3. Can inorder traversal alone reconstruct a binary tree?', a: 'No. Inorder only tells us relative left-to-right order, not which node is the root or which branches are missing. Even Preorder + Inorder fails when duplicate labels exist, whereas Preorder + Explicit Null Markers works even with duplicate labels.' },
  { q: '4. Why is structural equality checking necessary if Preorder and Inorder match?', a: 'Two trees with duplicate node labels can yield identical Preorder and Inorder sequences yet have completely different shapes. Recursive structural equality checks both pointer existence and label equality at every corresponding (left, right) position.' },
  { q: '5. What happens if a token is missing from the archive?', a: 'Validator::validateArchive compares the declared TOKENS header count against received lines and immediately rejects with MISSING_TOKENS. Even if the header count was forged, deserializeRec detects premature end-of-stream and rejects with INCOMPLETE_TREE_STRUCTURE.' },
  { q: '6. How do you detect extra tokens?', a: 'Two layers: Validator catches receivedTokens > expectedTokens (EXTRA_TOKENS), and after root reconstruction finishes, Serializer::deserialize checks if index < tokens.size() (EXTRA_TOKENS_AFTER_TREE).' },
  { q: '7. How do you prevent partial restoration on damaged files?', a: 'Transactional deserialization: nodes are allocated into a local temporary std::unique_ptr<TreeNode> tempRoot. Only after validation, reconstruction, and stream-termination checks all succeed is tempRoot moved into restoredTree. On failure, tempRoot goes out of scope and is automatically freed.' },
  { q: '8. How do you handle duplicate node labels?', a: 'Each node in C++ is identified by an internal monotonic id (n1, n2, ...) and structural path, while the archive encodes position via preorder order and N markers rather than unique keys.' },
  { q: '9. What if a user names a node literally "N"?', a: 'In TREEVAULT_V1, node values are always prefixed with "V:" (so a node labeled N becomes "V:N"), while null markers are bare "N". They can never collide.' },
  { q: '10. How does the system support 2,000 nodes safely?', a: 'Both BinaryTree::MAX_NODES = 2000 and Validator enforce the 2,000-node / 4,001-token cap. In the worst case of a 2,000-node skewed tree, 2,000 recursive frames use ~128 KB of stack, well within Linux default 8 MB stack limits.' },
  { q: '11. What is the time and space complexity?', a: 'Every core operation—serialization, deserialization, traversals, metrics, and structural equality—is O(N) time. Archive and tree memory are O(N) (specifically 2N+1 tokens), and recursion stack space is O(H).' },
  { q: '12. What happens with a deeply skewed tree?', a: 'A left-skewed or right-skewed chain of N nodes has height H = N, so recursion depth is O(N) instead of O(log N), and every missing opposite branch emits an explicit N marker preserving exact skew.' },
  { q: '13. Why implement the core DSA engine in C++ instead of JavaScript?', a: 'C++ provides deterministic memory ownership via std::unique_ptr, strict static typing, fast O(N) execution even for 2,000-node trees, and demonstrates genuine DSA implementation rather than relying on JS JSON helpers.' },
  { q: '14. How does the React frontend communicate with C++?', a: 'React sends REST requests to our Node.js/Express backend, which manages a persistent compiled C++ worker daemon (--daemon) via safe child_process stdin/stdout JSON-RPC without any shell interpolation.' },
  { q: '15. How do you prove the restored tree was not secretly copied from the original?', a: 'In Round-Trip Demo Step 3, C++ executes originalTree.clear(), releasing every std::unique_ptr in memory. Step 4 calls Serializer::deserialize using only the saved archiveText string.' },
  { q: '16. What if an empty tree is archived?', a: 'An empty tree serializes cleanly to TREEVAULT_V1 with TOKENS: 1 and a single "N" token, which deserializes back to root == nullptr.' },
  { q: '17. How do you distinguish an unsupported version from a corrupt header?', a: 'Line 1 is checked against TREEVAULT_V1. If it starts with "TREEVAULT_V" with another version number, C++ reports UNSUPPORTED_VERSION; otherwise it reports INVALID_HEADER.' },
  { q: '18. Why is node height defined as 0 for empty and 1 for a single node?', a: 'Counting nodes along the longest root-to-leaf path keeps height non-negative (0, 1, 2, ...) and matches standard CSE curriculum metrics alongside node count and leaf count.' },
  { q: '19. How does the SVG visualization avoid overlapping nodes?', a: 'We use an inorder slot assignment algorithm (computeTreeLayout) where every node and explicit NULL slot receives a strictly increasing horizontal coordinate, guaranteeing left children appear left of parents and right children appear right.' },
  { q: '20. What happens if a node with children is deleted?', a: 'BinaryTree::deleteNode resets the parent unique_ptr to that node, which recursively frees the entire subtree via RAII and returns the exact removed node count.' },
  { q: '21. How are step-by-step animations synchronized with C++?', a: 'Serializer::serializeRec records each VISIT_NODE and EMIT_NULL event during the actual C++ recursion and returns the trace array to React, so the frontend plays back real C++ execution steps.' },
  { q: '22. What if the archive file uses Windows CRLF line endings?', a: 'Validator::normalizeNewlines normalizes CRLF (\\r\\n) to LF (\\n) so archives transferred between Windows, macOS, and Linux computers restore identically.' },
  { q: '23. Why not use JSON or XML directly as the archive format?', a: 'While JSON works for APIs, the problem asks for a documented, compact, human-readable text archive that avoids parsing overhead and teaches explicit preorder null-marker serialization.' },
  { q: '24. How are node labels validated against injection or format breaks?', a: 'Validator::isValidLabel rejects empty strings, whitespace-only labels, newline characters (\\n, \\r), and labels over 64 characters.' },
  { q: '25. How is the C++ engine verified automatically?', a: 'Running ./cpp-engine/treevault_engine --test executes 10 automated C++ test suites (Illustrative Example, Left-Only, Right-Only, Mixed, Single Node, Empty, Duplicate Labels, Damaged Archives, Extra Tokens, and 2,000-Node Stress Test), all passing.' },
];

export const DocsAndJudgesView: React.FC = () => {
  const [subTab, setSubTab] = useState<'dsa' | 'cpp' | 'qa' | 'script'>('dsa');
  const [searchQuery, setSearchQuery] = useState('');
  const [openQaIdx, setOpenQaIdx] = useState<number | null>(0);

  const filteredQa = JUDGES_QA.filter(
    (item) =>
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
            <BookOpen className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              DSA Architecture, Format Spec &amp; Judges&apos; Preparation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Complexity analysis, TREEVAULT_V1 walkthrough, C++ function reference, and 25 Q&amp;A entries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {[
            { id: 'dsa', label: 'DSA & Format' },
            { id: 'cpp', label: 'C++ Reference' },
            { id: 'qa', label: '25 Judges Q&A' },
            { id: 'script', label: 'Pitch Script' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as typeof subTab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                subTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'dsa' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Algorithm Complexity Analysis (N = Nodes, H = Height)
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">Operation</th>
                    <th className="text-left font-medium px-3 py-2">Time</th>
                    <th className="text-left font-medium px-3 py-2">Space</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {COMPLEXITY_ROWS.map((r) => (
                    <tr key={r.op}>
                      <td className="px-3 py-2 font-medium text-slate-900">{r.op}</td>
                      <td className="px-3 py-2 font-mono text-blue-700">{r.time}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{r.space}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every binary tree with <span className="font-mono font-semibold">N</span> nodes has exactly{' '}
              <span className="font-mono font-semibold">N + 1</span> null pointers, so the serialized stream always contains{' '}
              <span className="font-mono font-semibold">2N + 1</span> tokens (<span className="font-mono">O(N)</span> space).
            </p>
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Illustrative Walkthrough: A, B, N, D, N, N, C, N, N
            </h3>
            <ol className="space-y-2 text-xs text-slate-700 list-decimal pl-4 leading-relaxed">
              <li>Read <span className="font-mono font-semibold">V:A</span> → create root A, recurse left.</li>
              <li>Read <span className="font-mono font-semibold">V:B</span> → attach as A.left, recurse B.left.</li>
              <li>Read <span className="font-mono font-semibold">N</span> → B.left is NULL, return to B and recurse B.right.</li>
              <li>Read <span className="font-mono font-semibold">V:D</span> → attach as B.right, recurse D.left &amp; D.right.</li>
              <li>Read <span className="font-mono font-semibold">N, N</span> → D is a leaf; finish B and return to A.right.</li>
              <li>Read <span className="font-mono font-semibold">V:C</span> → attach as A.right; read <span className="font-mono font-semibold">N, N</span> → C is a leaf.</li>
            </ol>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
              <strong className="text-slate-900">Why null markers matter:</strong> Without N, <span className="font-mono">[A, B, D, C]</span> cannot tell whether D is B&apos;s left child or right child, or whether D is C&apos;s sibling.
            </div>
          </div>
        </div>
      )}

      {subTab === 'cpp' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CPP_FUNCTIONS.map((fn) => (
            <div key={fn.name} className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
              <h3 className="font-mono text-sm font-semibold text-blue-800">{fn.name}</h3>
              <p className="text-xs text-slate-700 leading-relaxed">{fn.purpose}</p>
              <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                <p><span className="text-slate-500">Parameters:</span> <span className="font-mono text-slate-800">{fn.params}</span></p>
                <p><span className="text-slate-500">Returns:</span> <span className="font-mono text-slate-800">{fn.returns}</span></p>
                <p><span className="text-slate-500">DSA Concept:</span> <span className="font-medium text-slate-900">{fn.concept}</span></p>
                <p><span className="text-slate-500">Complexity:</span> <span className="font-mono text-blue-700">{fn.complexity}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'qa' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">
              25 Technical Questions &amp; Judges&apos; Answers
            </h3>
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter questions..."
                aria-label="Filter judges questions"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
            {filteredQa.map((item, idx) => {
              const isOpen = openQaIdx === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenQaIdx(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-xs font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3.5 text-xs text-slate-600 leading-relaxed bg-slate-50/60">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'script' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">
            2–3 Minute Hackathon Presentation Script
          </h3>
          <div className="space-y-3 text-xs text-slate-700 leading-relaxed max-w-3xl">
            <p>
              <strong>0:00 – Problem (30s):</strong> &quot;Good morning judges. Museums archive historical family trees as binary trees, but when exported without tracking empty branches, right children silently collapse into left children on import. We built TREEVAULT—Preserve Every Branch, Recover Every Connection.&quot;
            </p>
            <p>
              <strong>0:30 – Core DSA &amp; C++ Engine (45s):</strong> &quot;All data structures and algorithms run in compiled C++17 using std::unique_ptr ownership. Instead of saving raw preorder values, we perform O(N) preorder serialization with explicit N markers for every null pointer, producing 2N + 1 tokens in our versioned TREEVAULT_V1 format.&quot;
            </p>
            <p>
              <strong>1:15 – Live Round-Trip Demo (60s):</strong> &quot;In Round-Trip Demo mode, we generate an unseen tree, export the archive text, and then explicitly call originalTree.clear() to destroy the C++ heap object. Next, we reconstruct a brand-new tree strictly from the saved text, and run a genuine recursive C++ structural equality check alongside Preorder and Inorder verification.&quot;
            </p>
            <p>
              <strong>2:15 – Damage Detection &amp; Conclusion (30s):</strong> &quot;Finally, in our Damage Lab, any truncated, malformed, or version-mismatched archive is rejected transactionally before committing to memory—never exposing a partial tree. Thank you!&quot;
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
