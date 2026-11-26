import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { cppBridge } from '../backend/cppBridge.ts';

after(() => {
  cppBridge.shutdown();
});

test('cppBridge executes full round-trip with original tree memory destruction', async () => {
  const ping = await cppBridge.execute({ cmd: 'ping' });
  assert.equal(ping.ok, true);
  assert.equal(ping.maxNodes, 2000);

  const illustrative = {
    label: 'A',
    left: {
      label: 'B',
      left: null,
      right: { label: 'D', left: null, right: null },
    },
    right: { label: 'C', left: null, right: null },
  };

  const created = await cppBridge.execute({ cmd: 'create_tree', tree: illustrative });
  assert.equal(created.ok, true);

  const serialized = await cppBridge.execute({ cmd: 'serialize' });
  assert.equal(serialized.ok, true);
  assert.equal(serialized.tokenCount, 9);
  assert.equal(serialized.nodeCount, 4);
  assert.equal(
    serialized.archiveText,
    'TREEVAULT_V1\nTOKENS: 9\n\nV:A\nV:B\nN\nV:D\nN\nN\nV:C\nN\nN'
  );

  // Destroy original C++ object
  const cleared = await cppBridge.execute({ cmd: 'clear_original' });
  assert.equal(cleared.ok, true);
  assert.equal(cleared.originalCleared, true);

  const stateAfterClear = await cppBridge.execute({ cmd: 'state' });
  assert.equal((stateAfterClear.original as { metrics: { isEmpty: boolean } }).metrics.isEmpty, true);

  // Restore exclusively from saved archive text
  const restored = await cppBridge.execute({
    cmd: 'restore',
    archiveText: serialized.archiveText,
  });
  assert.equal(restored.ok, true);
  assert.equal(restored.restoredNodeCount, 4);

  // Verify against captured structure
  const verified = await cppBridge.execute({
    cmd: 'verify',
    expectedTree: illustrative,
  });
  assert.equal(verified.ok, true);
  assert.equal(verified.identical, true);
  assert.equal(verified.passed, true);
});

test('cppBridge rejects malformed archive and detects structural mismatch', async () => {
  const damaged = await cppBridge.execute({
    cmd: 'restore',
    archiveText: 'TREEVAULT_V1\nTOKENS: 9\n\nV:A\nV:B',
  });
  assert.equal(damaged.ok, false);
  assert.equal(damaged.errorCode, 'MISSING_TOKENS');
  assert.equal(damaged.reconstructionPrevented, true);

  // Test structural mismatch detection (A->B(left) vs A->B(right))
  await cppBridge.execute({
    cmd: 'import_text',
    mode: 'bracket',
    input: 'A(B,)',
  });
  await cppBridge.execute({
    cmd: 'restore',
    archiveText: 'TREEVAULT_V1\nTOKENS: 5\n\nV:A\nN\nV:B\nN\nN',
  });
  const cmp = await cppBridge.execute({ cmd: 'verify' });
  assert.equal(cmp.ok, true);
  assert.equal(cmp.identical, false);
  assert.equal(cmp.mismatchPath, 'root.left');
});
