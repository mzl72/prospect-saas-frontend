/**
 * Custom Next.js Server with Socket.io
 * Necessário para integrar Socket.io com Next.js 15+
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { initSocketServer } = require('./src/lib/socket-server');
/* eslint-enable @typescript-eslint/no-require-imports */

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Inicializa Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Cria servidor HTTP
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Inicializa Socket.io
  initSocketServer(httpServer);

  console.log('[Server] Socket.io server initialized');

  // Inicia servidor
  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.io listening on path: /api/socketio`);
    });
});
