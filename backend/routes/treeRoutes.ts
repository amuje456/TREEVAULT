import { Router, type Request, type Response } from 'express';
import { cppBridge } from '../cppBridge.ts';

const SAMPLE_TREES: Record<string, unknown> = {
  illustrative: {
    label: 'A',
    left: {
      label: 'B',
      left: null,
      right: { label: 'D', left: null, right: null },
    },
    right: { label: 'C', left: null, right: null },
  },
  museum_lineage: {
    label: 'Founder_1840',
    left: {
      label: 'Eleanor_1868',
      left: null,
      right: {
        label: 'Arthur_1894',
        left: { label: 'Clara_1921', left: null, right: null },
        right: null,
      },
    },
    right: {
      label: 'Thomas_1871',
      left: { label: 'Julian_1902', left: null, right: null },
      right: { label: 'Beatrice_1905', left: null, right: null },
    },
  },
  left_skewed: {
    label: 'A',
    left: {
      label: 'B',
      left: {
        label: 'C',
        left: { label: 'D', left: null, right: null },
        right: null,
      },
      right: null,
    },
    right: null,
  },
  right_skewed: {
    label: 'A',
    left: null,
    right: {
      label: 'B',
      left: null,
      right: {
        label: 'C',
        left: null,
        right: { label: 'D', left: null, right: null },
      },
    },
  },
  duplicate_labels: {
    label: 'X',
    left: {
      label: 'X',
      left: null,
      right: { label: 'X', left: null, right: null },
    },
    right: {
      label: 'X',
      left: { label: 'N', left: null, right: null },
      right: null,
    },
  },
};

function generateUnseenTree(seedNumber: number): Record<string, unknown> {
  const artifacts = ['Root_Vault', 'Wing_North', 'Wing_South', 'Gallery_A', 'Gallery_B', 'Chamber_1', 'Chamber_2', 'Relic_X', 'Relic_Y'];
  const suffix = String((seedNumber % 90) + 10);
  return {
    label: `${artifacts[0]}_${suffix}`,
    left: {
      label: `${artifacts[1]}_${suffix}`,
      left: null,
      right: {
        label: `${artifacts[3]}_${suffix}`,
        left: { label: `${artifacts[7]}_${suffix}`, left: null, right: null },
        right: null,
      },
    },
    right: {
      label: `${artifacts[2]}_${suffix}`,
      left: {
        label: `${artifacts[4]}_${suffix}`,
        left: null,
        right: { label: `${artifacts[8]}_${suffix}`, left: null, right: null },
      },
      right: { label: `${artifacts[5]}_${suffix}`, left: null, right: null },
    },
  };
}

export const treeRouter = Router();

treeRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    const engineRes = await cppBridge.execute({ cmd: 'ping' });
    res.json({
      ok: true,
      backend: 'express',
      cppEngine: engineRes,
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      errorCode: 'CPP_ENGINE_UNAVAILABLE',
      message: (err as Error).message,
    });
  }
});

treeRouter.get('/tree/state', async (_req: Request, res: Response) => {
  try {
    const engineRes = await cppBridge.execute({ cmd: 'state' });
    res.json(engineRes);
  } catch (err) {
    res.status(500).json({ ok: false, errorCode: 'ENGINE_ERROR', message: (err as Error).message });
  }
});

treeRouter.post('/tree/create', async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const action = typeof body.action === 'string' ? body.action : 'load';

    if (action === 'sample') {
      const preset = typeof body.preset === 'string' ? body.preset : 'illustrative';
      const sample = SAMPLE_TREES[preset];
      if (!sample) {
        res.status(400).json({ ok: false, errorCode: 'UNKNOWN_SAMPLE', message: `Unknown sample preset '${preset}'.` });
        return;
      }
      const engineRes = await cppBridge.execute({ cmd: 'create_tree', tree: sample });
      res.status(engineRes.ok ? 200 : 400).json(engineRes);
      return;
    }

    if (action === 'load') {
      if (!('tree' in body)) {
        res.status(400).json({ ok: false, errorCode: 'MISSING_TREE', message: 'Request body must include a "tree" field.' });
        return;
      }
      const engineRes = await cppBridge.execute({ cmd: 'create_tree', tree: body.tree });
      res.status(engineRes.ok ? 200 : 400).json(engineRes);
      return;
    }

    if (action === 'import') {
      const mode = typeof body.mode === 'string' ? body.mode : 'bracket';
      const input = typeof body.input === 'string' ? body.input : '';
      const engineRes = await cppBridge.execute({ cmd: 'import_text', mode, input });
      res.status(engineRes.ok ? 200 : 400).json(engineRes);
      return;
    }

    if (action === 'add_root') {
      const label = typeof body.label === 'string' ? body.label : '';
      const engineRes = await cppBridge.execute({ cmd: 'add_root', label });
      res.status(engineRes.ok ? 200 : 400).json(engineRes);
      return;
    }

    if (action === 'insert_child') {
      const parentId = typeof body.parentId === 'string' ? body.parentId : '';
      const side = typeof body.side === 'string' ? body.side : '';
      const label = typeof body.label === 'string' ? body.label : '';
      const engineRes = await cppBridge.execute({ cmd: 'insert_child', parentId, side, label });
      res.status(engineRes.ok ? 200 : 400).json(engineRes);
      return;
    }

    if (action === 'edit_label') {
      const nodeId = typeof body.nodeId === 'string' ? body.nodeId : '';
      const label = typeof body.label === 'string' ? body.label : '';
      const engineRes = await cppBridge.execute({ cmd: 'edit_label', nodeId, label });
      res.status(engineRes.ok ? 200 : 400).json(engineRes);
      return;
    }

    if (action === 'delete_node') {
      const nodeId = typeof body.nodeId === 'string' ? body.nodeId : '';
      const engineRes = await cppBridge.execute({ cmd: 'delete_node', nodeId });
      res.status(engineRes.ok ? 200 : 400).json(engineRes);
      return;
    }

    res.status(400).json({ ok: false, errorCode: 'UNKNOWN_ACTION', message: `Unsupported tree action '${action}'.` });
  } catch (err) {
    res.status(500).json({ ok: false, errorCode: 'ENGINE_ERROR', message: (err as Error).message });
  }
});

treeRouter.post('/tree/serialize', async (_req: Request, res: Response) => {
  try {
    const engineRes = await cppBridge.execute({ cmd: 'serialize' });
    res.status(engineRes.ok ? 200 : 400).json(engineRes);
  } catch (err) {
    res.status(500).json({ ok: false, errorCode: 'ENGINE_ERROR', message: (err as Error).message });
  }
});

treeRouter.post('/tree/restore', async (req: Request, res: Response) => {
  try {
    const archiveText = req.body?.archiveText;
    if (typeof archiveText !== 'string') {
      res.status(400).json({
        ok: false,
        errorCode: 'INVALID_REQUEST',
        ruleFailed: 'Payload Type Check',
        message: 'archiveText must be a string.',
        reconstructionPrevented: true,
      });
      return;
    }
    const engineRes = await cppBridge.execute({ cmd: 'restore', archiveText });
    res.status(200).json(engineRes);
  } catch (err) {
    res.status(500).json({ ok: false, errorCode: 'ENGINE_ERROR', message: (err as Error).message, reconstructionPrevented: true });
  }
});

treeRouter.post('/tree/verify', async (req: Request, res: Response) => {
  try {
    const cmd: Record<string, unknown> = { cmd: 'verify' };
    if (req.body && 'expectedTree' in req.body) {
      cmd.expectedTree = req.body.expectedTree;
    }
    const engineRes = await cppBridge.execute(cmd);
    res.status(engineRes.ok ? 200 : 400).json(engineRes);
  } catch (err) {
    res.status(500).json({ ok: false, errorCode: 'ENGINE_ERROR', message: (err as Error).message });
  }
});

treeRouter.post('/tree/clear', async (req: Request, res: Response) => {
  try {
    const target = req.body?.target === 'restored' ? 'clear_restored' : 'clear_original';
    const engineRes = await cppBridge.execute({ cmd: target });
    res.json(engineRes);
  } catch (err) {
    res.status(500).json({ ok: false, errorCode: 'ENGINE_ERROR', message: (err as Error).message });
  }
});

treeRouter.post('/tree/demo', async (req: Request, res: Response) => {
  try {
    const scenario = typeof req.body?.scenario === 'string' ? req.body.scenario : 'unseen';
    if (scenario === 'unseen') {
      const seed = typeof req.body?.seed === 'number' ? req.body.seed : Date.now();
      const unseen = generateUnseenTree(seed);
      const created = await cppBridge.execute({ cmd: 'create_tree', tree: unseen });
      await cppBridge.execute({ cmd: 'clear_restored' });
      res.json(created);
      return;
    }

    if (scenario === 'round_trip') {
      const seed = typeof req.body?.seed === 'number' ? req.body.seed : Date.now();
      const unseen = generateUnseenTree(seed);
      const created = await cppBridge.execute({ cmd: 'create_tree', tree: unseen });
      const originalSnapshot = created.original;
      const serialized = await cppBridge.execute({ cmd: 'serialize' });
      const cleared = await cppBridge.execute({ cmd: 'clear_original' });
      const restored = await cppBridge.execute({ cmd: 'restore', archiveText: serialized.archiveText });
      const verified = await cppBridge.execute({ cmd: 'verify', expectedTree: unseen });
      res.json({
        ok: true,
        originalSnapshot,
        serialized,
        cleared,
        restored,
        verified,
      });
      return;
    }

    res.status(400).json({ ok: false, errorCode: 'UNKNOWN_SCENARIO', message: `Unsupported demo scenario '${scenario}'.` });
  } catch (err) {
    res.status(500).json({ ok: false, errorCode: 'ENGINE_ERROR', message: (err as Error).message });
  }
});
