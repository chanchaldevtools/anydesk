import PusherClient from 'pusher-js';
import { Peer, DataConnection } from 'peerjs';
import { ConnectionMode, DeskInfo, IncomingRequest, PusherConfig } from '../types';

export type SignalingEventMap = {
  'status-change': (connected: boolean, mode: ConnectionMode) => void;
  'registered': (deskId: string) => void;
  'online-desks': (desks: DeskInfo[]) => void;
  'incoming-connection-request': (req: IncomingRequest) => void;
  'connection-response': (data: { accepted: boolean; fromDeskId: string; reason?: string }) => void;
  'target-unavailable': (data: { targetDeskId: string; message: string }) => void;
  'signal': (data: { fromDeskId: string; signalData: any }) => void;
  'session-ended': (data: { fromDeskId: string }) => void;
  'error': (err: string) => void;
};

// Detect static/serverless platforms like Vercel, Netlify, GitHub Pages
const isServerlessHost =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('netlify.app') ||
    window.location.hostname.includes('github.io') ||
    window.location.hostname.includes('pages.dev'));

export class SignalingService {
  // If deployed to Vercel/Netlify, default to cloud-p2p to avoid WebSocket connection failure
  private mode: ConnectionMode = isServerlessHost ? 'cloud-p2p' : 'builtin-ws';
  private ws: WebSocket | null = null;
  private wsFailCount: number = 0;
  private peer: Peer | null = null;
  private peerConnections: Map<string, DataConnection> = new Map();
  private pusherClient: PusherClient | null = null;
  private pusherChannel: any = null;
  private listeners: Map<keyof SignalingEventMap, Set<Function>> = new Map();
  private currentDeskId: string = '';
  private currentDeskName: string = '';
  private isConnected: boolean = false;
  private pingInterval: any = null;
  private reconnectTimeout: any = null;
  private pusherConfig: PusherConfig | null = null;

  constructor() {
    this.initPusherFromStorage();
  }

  private initPusherFromStorage() {
    try {
      const stored = localStorage.getItem('anydesk_pusher_config');
      if (stored) {
        this.pusherConfig = JSON.parse(stored);
        if (this.pusherConfig?.enabled && this.pusherConfig.key) {
          this.mode = 'pusher';
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored pusher config');
    }
  }

  public setPusherConfig(config: PusherConfig) {
    this.pusherConfig = config;
    localStorage.setItem('anydesk_pusher_config', JSON.stringify(config));
    if (this.mode === 'pusher') {
      this.reconnect();
    }
  }

  public getPusherConfig(): PusherConfig | null {
    return this.pusherConfig;
  }

  public setMode(mode: ConnectionMode) {
    if (this.mode === mode && this.isConnected) return;
    this.mode = mode;
    this.disconnect();
    this.connect(this.currentDeskId, this.currentDeskName);
  }

  public getMode(): ConnectionMode {
    return this.mode;
  }

  public on<K extends keyof SignalingEventMap>(event: K, handler: SignalingEventMap[K]) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  public off<K extends keyof SignalingEventMap>(event: K, handler: SignalingEventMap[K]) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit<K extends keyof SignalingEventMap>(event: K, ...args: Parameters<SignalingEventMap[K]>) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          (h as any)(...args);
        } catch (e) {
          console.error(`Error in event listener ${event}:`, e);
        }
      });
    }
  }

  public connect(deskId: string, name: string) {
    this.currentDeskId = deskId;
    this.currentDeskName = name;

    if (this.mode === 'pusher' && this.pusherConfig?.enabled && this.pusherConfig.key) {
      this.connectPusher();
    } else if (this.mode === 'cloud-p2p' || isServerlessHost) {
      this.connectPeerJS();
    } else {
      this.connectWebSocket();
    }
  }

  // -------------------------------------------------------------
  // Mode 1: Cloud P2P via global WebRTC broker (Zero setup, 100% works on Vercel)
  // -------------------------------------------------------------
  private connectPeerJS() {
    this.mode = 'cloud-p2p';
    const cleanId = `desk-${this.currentDeskId.replace(/\s+/g, '')}`;

    if (this.peer && !this.peer.destroyed) {
      this.peer.destroy();
    }

    try {
      this.peer = new Peer(cleanId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
          ],
        },
      });

      this.peer.on('open', (id) => {
        this.isConnected = true;
        this.emit('status-change', true, 'cloud-p2p');
        this.emit('registered', this.currentDeskId);
      });

      this.peer.on('connection', (conn) => {
        this.setupPeerDataConnection(conn);
      });

      // Handle direct media stream calls from opponent
      this.peer.on('call', (mediaCall) => {
        console.log('[PeerJS Cloud] Incoming screen stream media call!');
        // Viewer answers the media call
        mediaCall.answer();
        mediaCall.on('stream', (remoteStream) => {
          console.log('[PeerJS Cloud] Remote stream received successfully via peer.call!', remoteStream);
          this.emit('signal', {
            fromDeskId: mediaCall.peer.replace('desk-', ''),
            signalData: {
              type: 'peerjs-stream',
              stream: remoteStream,
            },
          });
        });
        mediaCall.on('close', () => {
          this.emit('session-ended', { fromDeskId: mediaCall.peer.replace('desk-', '') });
        });
      });

      this.peer.on('error', (err: any) => {
        console.warn('[Cloud P2P Signaling]', err.type || err);
        if (err.type === 'unavailable-id') {
          // ID already in use, regenerated automatically
          this.currentDeskId = Math.floor(100000000 + Math.random() * 900000000).toString();
          sessionStorage.setItem('anydesk_self_desk_id', this.currentDeskId);
          setTimeout(() => this.connectPeerJS(), 500);
        } else if (err.type === 'peer-unavailable') {
          this.emit('target-unavailable', {
            targetDeskId: err.message || 'remote',
            message: 'Target Desk is offline or does not exist.',
          });
        }
      });

      this.peer.on('disconnected', () => {
        this.isConnected = false;
        this.emit('status-change', false, 'cloud-p2p');
        // PeerJS auto reconnect
        this.peer?.reconnect();
      });
    } catch (e: any) {
      console.error('PeerJS init failed:', e);
      this.emit('error', 'Cloud signaling connection error');
    }
  }

  public callPeerMedia(targetDeskId: string, stream: MediaStream) {
    if (!this.peer || this.peer.destroyed) return;
    const cleanTargetId = targetDeskId.replace(/\s+/g, '');
    const fullTargetId = `desk-${cleanTargetId}`;
    try {
      console.log('[PeerJS Cloud] Calling target desk with media stream:', fullTargetId);
      const mediaCall = this.peer.call(fullTargetId, stream);
      mediaCall.on('error', (err) => console.warn('[PeerJS Media Call Error]:', err));
      mediaCall.on('close', () => {
        this.emit('session-ended', { fromDeskId: cleanTargetId });
      });
    } catch (e) {
      console.warn('Failed to initiate peer media call:', e);
    }
  }

  private setupPeerDataConnection(conn: DataConnection) {
    const remoteId = conn.peer.replace('desk-', '');
    this.peerConnections.set(remoteId, conn);

    conn.on('data', (data: any) => {
      this.handleIncomingMessage(data);
    });

    conn.on('close', () => {
      this.peerConnections.delete(remoteId);
    });
  }

  private pendingConnections: Map<string, Promise<DataConnection>> = new Map();

  private ensurePeerConnection(targetDeskId: string): Promise<DataConnection> {
    const cleanTargetId = targetDeskId.replace(/\s+/g, '');
    const existing = this.peerConnections.get(cleanTargetId);
    if (existing && existing.open) {
      return Promise.resolve(existing);
    }

    if (this.pendingConnections.has(cleanTargetId)) {
      return this.pendingConnections.get(cleanTargetId)!;
    }

    const promise = new Promise<DataConnection>((resolve, reject) => {
      if (!this.peer || this.peer.destroyed) {
        return reject(new Error('PeerJS not initialized'));
      }

      const fullPeerId = `desk-${cleanTargetId}`;
      const conn = this.peer.connect(fullPeerId, { reliable: true });

      conn.on('open', () => {
        this.pendingConnections.delete(cleanTargetId);
        this.setupPeerDataConnection(conn);
        resolve(conn);
      });

      conn.on('error', (err) => {
        this.pendingConnections.delete(cleanTargetId);
        reject(err);
      });

      setTimeout(() => {
        if (!conn.open) {
          this.pendingConnections.delete(cleanTargetId);
          reject(new Error('Connection timed out to Desk ' + targetDeskId));
        }
      }, 8000);
    });

    this.pendingConnections.set(cleanTargetId, promise);
    return promise;
  }

  // -------------------------------------------------------------
  // Mode 2: Native WebSocket (Only for full-stack Node.js hosting)
  // -------------------------------------------------------------
  private connectWebSocket() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws-signaling`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.wsFailCount = 0;
        this.isConnected = true;
        this.emit('status-change', true, 'builtin-ws');
        this.registerDesk();

        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleIncomingMessage(msg);
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit('status-change', false, 'builtin-ws');
        if (this.pingInterval) clearInterval(this.pingInterval);

        this.wsFailCount++;
        // If native WS fails on a static/serverless host like Vercel, immediately fallback to Cloud P2P!
        if (this.wsFailCount >= 1 || isServerlessHost) {
          console.log(
            '[Signaling] Native WebSocket unavailable on current host (e.g. Vercel serverless). Switching to Cloud P2P signaling...'
          );
          this.disconnect();
          this.setMode('cloud-p2p');
          return;
        }

        // Auto reconnect retry only once
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          if (this.mode === 'builtin-ws' && this.currentDeskId) {
            this.connectWebSocket();
          }
        }, 3000);
      };

      this.ws.onerror = () => {
        // Suppress unhandled noisy console crash on static hosting
        this.wsFailCount++;
      };
    } catch (e: any) {
      console.warn('WS not supported, switching to Cloud P2P:', e);
      this.setMode('cloud-p2p');
    }
  }

  // -------------------------------------------------------------
  // Mode 3: Pusher Channels
  // -------------------------------------------------------------
  private connectPusher() {
    if (!this.pusherConfig?.key || !this.pusherConfig.cluster) {
      this.emit('error', 'Pusher App Key & Cluster are required');
      this.setMode('cloud-p2p');
      return;
    }

    try {
      const clientOptions: any = {
        cluster: this.pusherConfig.cluster,
        forceTLS: true,
      };

      // If secret is supplied in browser, authorize private channels directly via WebCrypto
      if (this.pusherConfig.secret && typeof window !== 'undefined' && window.crypto?.subtle) {
        clientOptions.authorizer = (channel: any) => ({
          authorize: async (socketId: string, callback: (err: any, authData: any) => void) => {
            try {
              const enc = new TextEncoder();
              const keyData = enc.encode(this.pusherConfig!.secret);
              const msgData = enc.encode(`${socketId}:${channel.name}`);
              const cryptoKey = await window.crypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
              );
              const sig = await window.crypto.subtle.sign('HMAC', cryptoKey, msgData);
              const hex = Array.from(new Uint8Array(sig))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
              callback(null, { auth: `${this.pusherConfig!.key}:${hex}` });
            } catch (err) {
              console.warn('Browser Pusher channel authorization failed:', err);
              callback(err, null);
            }
          },
        });
      }

      this.pusherClient = new PusherClient(this.pusherConfig.key, clientOptions);

      this.pusherClient.connection.bind('connected', () => {
        this.isConnected = true;
        this.emit('status-change', true, 'pusher');
        this.emit('registered', this.currentDeskId);
      });

      this.pusherClient.connection.bind('disconnected', () => {
        this.isConnected = false;
        this.emit('status-change', false, 'pusher');
      });

      this.pusherClient.connection.bind('error', (err: any) => {
        console.warn('Pusher connection error:', err);
        const errMsg =
          err?.data?.message || err?.error?.data?.message || err?.message || '';

        if (errMsg.includes('client events') || errMsg.includes('Settings page')) {
          this.emit(
            'error',
            'Pusher: To send client events, please enable "Enable client events" in Pusher Dashboard > App Settings, or switch to Cloud P2P mode.'
          );
        } else if (errMsg) {
          this.emit('error', 'Pusher: ' + errMsg);
        }
      });

      const cleanSelfId = this.currentDeskId.replace(/\s+/g, '');
      const channelName = this.pusherConfig.secret
        ? `private-desk-${cleanSelfId}`
        : `desk-${cleanSelfId}`;

      this.pusherChannel = this.pusherClient.subscribe(channelName);

      const bindEvent = (evt: string, cb: (data: any) => void) => {
        this.pusherChannel.bind(evt, cb);
        this.pusherChannel.bind(`client-${evt}`, cb);
      };

      bindEvent('incoming-request', (data: IncomingRequest) => {
        this.emit('incoming-connection-request', data);
      });

      bindEvent('connection-response', (data: any) => {
        this.emit('connection-response', data);
      });

      bindEvent('signal', (data: any) => {
        this.emit('signal', data);
      });

      bindEvent('session-ended', (data: any) => {
        this.emit('session-ended', data);
      });
    } catch (e: any) {
      console.error('Pusher init error:', e);
      this.emit('error', e.message);
      this.setMode('cloud-p2p');
    }
  }

  private registerDesk() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentDeskId) {
      this.ws.send(
        JSON.stringify({
          type: 'register',
          deskId: this.currentDeskId,
          name: this.currentDeskName,
          deviceType: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
        })
      );
    }
  }

  private handleIncomingMessage(msg: any) {
    if (!msg) return;
    switch (msg.type) {
      case 'registered':
        this.emit('registered', msg.deskId);
        break;
      case 'online-desks':
        this.emit('online-desks', msg.desks);
        break;
      case 'incoming-connection-request':
      case 'request-connection':
        this.emit('incoming-connection-request', {
          fromDeskId: msg.fromDeskId,
          fromName: msg.fromName,
          requesterInfo: msg.requesterInfo,
        });
        break;
      case 'connection-response':
      case 'respond-connection':
        this.emit('connection-response', {
          accepted: msg.accepted,
          fromDeskId: msg.fromDeskId,
          reason: msg.reason,
        });
        break;
      case 'target-unavailable':
        this.emit('target-unavailable', {
          targetDeskId: msg.targetDeskId,
          message: msg.message,
        });
        break;
      case 'signal':
        this.emit('signal', {
          fromDeskId: msg.fromDeskId,
          signalData: msg.signalData,
        });
        break;
      case 'session-ended':
      case 'end-session':
        this.emit('session-ended', {
          fromDeskId: msg.fromDeskId,
        });
        break;
    }
  }

  public async requestConnection(targetDeskId: string) {
    const cleanTargetId = targetDeskId.replace(/\s+/g, '');
    const cleanSelfId = this.currentDeskId.replace(/\s+/g, '');

    const reqData = {
      type: 'request-connection',
      targetDeskId: cleanTargetId,
      fromDeskId: cleanSelfId,
      fromName: this.currentDeskName,
      requesterInfo: {
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
      },
    };

    if (this.mode === 'cloud-p2p') {
      try {
        const conn = await this.ensurePeerConnection(cleanTargetId);
        conn.send(reqData);
      } catch (err: any) {
        console.warn('Peer connection error:', err);
        this.emit('target-unavailable', {
          targetDeskId: cleanTargetId,
          message: 'Unable to reach Desk ' + cleanTargetId + ' (may be offline or incorrect ID)',
        });
      }
    } else if (this.mode === 'pusher') {
      this.triggerPusherEvent(`desk-${cleanTargetId}`, 'incoming-request', reqData);
    } else {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(reqData));
      }
    }
  }

  public async respondToConnection(targetDeskId: string, accepted: boolean, reason?: string) {
    const cleanTargetId = targetDeskId.replace(/\s+/g, '');
    const cleanSelfId = this.currentDeskId.replace(/\s+/g, '');

    const payload = {
      type: 'connection-response',
      targetDeskId: cleanTargetId,
      fromDeskId: cleanSelfId,
      accepted,
      reason,
    };

    if (this.mode === 'cloud-p2p') {
      try {
        const conn = await this.ensurePeerConnection(cleanTargetId);
        conn.send(payload);
      } catch (e) {
        console.warn('Failed to send peer response:', e);
      }
    } else if (this.mode === 'pusher') {
      this.triggerPusherEvent(`desk-${cleanTargetId}`, 'connection-response', payload);
    } else {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(payload));
      }
    }
  }

  public async sendSignal(targetDeskId: string, signalData: any) {
    const cleanTargetId = targetDeskId.replace(/\s+/g, '');
    const cleanSelfId = this.currentDeskId.replace(/\s+/g, '');

    const payload = {
      type: 'signal',
      targetDeskId: cleanTargetId,
      fromDeskId: cleanSelfId,
      signalData,
    };

    if (this.mode === 'cloud-p2p') {
      try {
        const conn = await this.ensurePeerConnection(cleanTargetId);
        conn.send(payload);
      } catch (e) {
        console.warn('Failed to send peer signal:', e);
      }
    } else if (this.mode === 'pusher') {
      this.triggerPusherEvent(`desk-${cleanTargetId}`, 'signal', payload);
    } else {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(payload));
      }
    }
  }

  public async endSession(targetDeskId: string) {
    const cleanTargetId = targetDeskId.replace(/\s+/g, '');
    const cleanSelfId = this.currentDeskId.replace(/\s+/g, '');

    const payload = {
      type: 'session-ended',
      targetDeskId: cleanTargetId,
      fromDeskId: cleanSelfId,
    };

    if (this.mode === 'cloud-p2p') {
      try {
        const conn = this.peerConnections.get(cleanTargetId);
        if (conn && conn.open) {
          conn.send(payload);
        }
      } catch (e) {}
    } else if (this.mode === 'pusher') {
      this.triggerPusherEvent(`desk-${cleanTargetId}`, 'session-ended', payload);
    } else {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(payload));
      }
    }
  }

  private async triggerPusherEvent(channel: string, event: string, data: any) {
    try {
      // 1. Try Pusher direct client-event trigger if channel is active
      if (this.pusherChannel && typeof this.pusherChannel.trigger === 'function') {
        try {
          const sent = this.pusherChannel.trigger(`client-${event}`, data);
          if (sent) return;
        } catch (e) {
          // Client events might not be enabled on user's Pusher app, continue to fallback
        }
      }

      // 2. Attempt backend endpoint with safe content-type verification
      const response = await fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          event,
          data,
          credentials: this.pusherConfig,
        }),
      });

      if (!response.ok) {
        let errMsg = `HTTP ${response.status}`;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const err = await response.json().catch(() => null);
          errMsg = err?.error || errMsg;
        } else {
          // Non-JSON response (e.g. Vercel 404 "The page could not be found")
          const text = await response.text().catch(() => '');
          if (text.includes('The page') || response.status === 404) {
            errMsg = 'Serverless host has no backend /api route. Use Cloud P2P mode.';
          }
        }
        console.warn('Pusher trigger:', errMsg);
      }
    } catch (e: any) {
      console.warn('Pusher trigger failed:', e?.message || e);
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.peer && !this.peer.destroyed) {
      this.peer.destroy();
      this.peer = null;
      this.peerConnections.clear();
    }
    if (this.pusherClient) {
      this.pusherClient.disconnect();
      this.pusherClient = null;
      this.pusherChannel = null;
    }
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.isConnected = false;
  }

  public reconnect() {
    this.disconnect();
    this.connect(this.currentDeskId, this.currentDeskName);
  }
}

export const signalingService = new SignalingService();
