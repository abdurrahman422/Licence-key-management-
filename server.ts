import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getDb, ensureDirectories, PROOFS_DIR } from './server/db';
import apiRouter from './server/routes';

async function startServer() {
  ensureDirectories();
  const app = express();
  const PORT = 3000;

  // Body parsers with generous limits for bulk import
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Static serving for payment proofs
  app.use('/api/proofs', express.static(PROOFS_DIR));

  // Initialize SQLite database
  try {
    await getDb();
    console.log('SQLite database initialized successfully.');
  } catch (dbErr) {
    console.error('Failed to initialize SQLite database:', dbErr);
  }

  // API router
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Vite middleware for development vs static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`License Manager Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
