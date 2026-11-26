import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { cppBridge } from './backend/cppBridge.ts';
import { treeRouter } from './backend/routes/treeRoutes.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // CORS headers for API interoperability
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: '2mb' }));

  app.use('/api', treeRouter);

  // Seed default illustrative example tree in C++ memory on startup so first load is ready
  try {
    const state = await cppBridge.execute({ cmd: 'state' });
    const orig = state.original as { metrics?: { isEmpty?: boolean } } | undefined;
    if (orig?.metrics?.isEmpty) {
      await cppBridge.execute({
        cmd: 'create_tree',
        tree: {
          label: 'A',
          left: {
            label: 'B',
            left: null,
            right: { label: 'D', left: null, right: null },
          },
          right: { label: 'C', left: null, right: null },
        },
      });
    }
  } catch (err) {
    console.error('Warning: failed to initialize default C++ tree:', err);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TREEVAULT server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
