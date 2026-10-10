import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import dotenv from 'dotenv';
import Pusher from 'pusher';

dotenv.config();

const app = express();
const server = createServer(app);
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// Pusher server instance if configured in env
let pusherServer: Pusher | null = null;
if (
  process.env.PUSHER_APP_ID &&
  process.env.PUSHER_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.PUSHER_CLUSTER
) {
  try {
    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    });
    console.log('[Pusher] Initialized from environment variables');
  } catch (err) {
    console.error('[Pusher] Initialization error:', err);
  }
}

// REST Endpoints
app.get('/api/config', (_req, res) => {
  res.json({
    hasPusherEnv: Boolean(process.env.PUSHER_KEY && process.env.PUSHER_CLUSTER),
    pusherKey: process.env.PUSHER_KEY || null,
    pusherCluster: process.env.PUSHER_CLUSTER || null,
    serverTime: Date.now(),
    stunServers: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:stun3.l.google.com:19302',
    ],
  });
});

app.post('/api/pusher/trigger', async (req, res) => {
  const { channel, event, data, credentials } = req.body;
  if (!channel || !event) {
    return res.status(400).json({ error: 'Missing channel or event' });
  }

  // Use custom credentials if provided by client UI or fall back to server env
  let activePusher = pusherServer;
  if (credentials?.appId && credentials?.key && credentials?.secret && credentials?.cluster) {
    try {
      activePusher = new Pusher({
        appId: credentials.appId,
        key: credentials.key,
        secret: credentials.secret,
        cluster: credentials.cluster,
        useTLS: true,
      });
    } catch (e: any) {
      return res.status(400).json({ error: 'Invalid custom Pusher credentials: ' + e.message });
    }
  }

  if (!activePusher) {
    return res.status(400).json({
      error: 'Pusher is not configured. Use the built-in WebSocket signaling or configure Pusher credentials.',
    });
  }

  try {
    await activePusher.trigger(channel, event, data);
    return res.json({ success: true, timestamp: Date.now() });
  } catch (err: any) {
    console.error('[Pusher Trigger Error]', err);
    return res.status(500).json({ error: err.message || 'Failed to trigger event' });
  }
});

app.post('/api/pusher/auth', (req, res) => {
  const { socket_id, channel_name, credentials, user_data } = req.body;
  let activePusher = pusherServer;
  if (credentials?.appId && credentials?.key && credentials?.secret && credentials?.cluster) {
    try {
      activePusher = new Pusher({
        appId: credentials.appId,
        key: credentials.key,
        secret: credentials.secret,
        cluster: credentials.cluster,
        useTLS: true,
      });
    } catch (e: any) {
      return res.status(400).json({ error: 'Invalid custom Pusher credentials: ' + e.message });
    }
  }

  if (!activePusher) {
    return res.status(400).json({ error: 'Pusher not configured' });
  }

  try {
    const authResponse = activePusher.authorizeChannel(socket_id, channel_name, user_data);
    return res.send(authResponse);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// WebSocket Signaling Hub
interface ClientInfo {
  deskId: string;
  name: string;
  deviceType: string;
  ws: WebSocket;
  connectedAt: number;
}

const connectedDesks = new Map<string, ClientInfo>();
const deskByWs = new WeakMap<WebSocket, string>();

const wss = new WebSocketServer({ noServer: true });

function broadcastDeskList() {
  const onlineDesks = Array.from(connectedDesks.values()).map((c) => ({
    deskId: c.deskId,
    name: c.name,
    deviceType: c.deviceType,
    connectedAt: c.connectedAt,
  }));

  const payload = JSON.stringify({
    type: 'online-desks',
    desks: onlineDesks,
  });

  connectedDesks.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (raw: string) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'register': {
          const { deskId, name, deviceType } = msg;
          if (!deskId) return;

          connectedDesks.set(deskId, {
            deskId,
            name: name || `Desk ${deskId.slice(-4)}`,
            deviceType: deviceType || 'Web Browser',
            ws,
            connectedAt: Date.now(),
          });
          deskByWs.set(ws, deskId);

          ws.send(
            JSON.stringify({
              type: 'registered',
              deskId,
              status: 'online',
            })
          );
          broadcastDeskList();
          break;
        }

        case 'request-connection': {
          const { targetDeskId, fromDeskId, fromName, requesterInfo } = msg;
          const target = connectedDesks.get(targetDeskId);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(
              JSON.stringify({
                type: 'incoming-connection-request',
                fromDeskId,
                fromName: fromName || `Desk ${fromDeskId}`,
                requesterInfo,
              })
            );
          } else {
            ws.send(
              JSON.stringify({
                type: 'target-unavailable',
                targetDeskId,
                message: 'Target Desk is offline or does not exist.',
              })
            );
          }
          break;
        }

        case 'respond-connection': {
          const { targetDeskId, fromDeskId, accepted, reason } = msg;
          const target = connectedDesks.get(targetDeskId);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(
              JSON.stringify({
                type: 'connection-response',
                fromDeskId,
                accepted,
                reason,
              })
            );
          }
          break;
        }

        case 'signal': {
          // Relays WebRTC Offer, Answer, ICE Candidates, Laser Pointer, Chat
          const { targetDeskId, signalData, fromDeskId } = msg;
          const target = connectedDesks.get(targetDeskId);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(
              JSON.stringify({
                type: 'signal',
                fromDeskId,
                signalData,
              })
            );
          }
          break;
        }

        case 'end-session': {
          const { targetDeskId, fromDeskId } = msg;
          const target = connectedDesks.get(targetDeskId);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(
              JSON.stringify({
                type: 'session-ended',
                fromDeskId,
              })
            );
          }
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        }
      }
    } catch (e) {
      console.error('[Signaling Error]', e);
    }
  });

  ws.on('close', () => {
    const deskId = deskByWs.get(ws);
    if (deskId) {
      connectedDesks.delete(deskId);
      broadcastDeskList();
    }
  });
});

// Upgrade handling for WebSocket on /ws-signaling
server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
  if (pathname === '/ws-signaling') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`[AnyDesk Web Server] Listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Startup Failure]', err);
  process.exit(1);
});
