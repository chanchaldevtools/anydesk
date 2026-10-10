import PusherClient from 'pusher-js';
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

export class SignalingService {
  private mode: ConnectionMode = 'builtin-ws';
  private ws: WebSocket | null = null;
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
    if (this.mode === mode) return;
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
    } else {
      this.connectWebSocket();
    }
  }

  private connectWebSocket() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws-signaling`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
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

        // Auto reconnect
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          if (this.mode === 'builtin-ws' && this.currentDeskId) {
            this.connectWebSocket();
          }
        }, 3000);
      };

      this.ws.onerror = (err) => {
        console.warn('Signaling WebSocket error:', err);
      };
    } catch (e: any) {
      console.error('WS Connection initiation error:', e);
      this.emit('error', 'Signaling server connection error');
    }
  }

  private connectPusher() {
    if (!this.pusherConfig?.key || !this.pusherConfig.cluster) {
      this.emit('error', 'Pusher App Key & Cluster are required');
      this.setMode('builtin-ws');
      return;
    }

    try {
      this.pusherClient = new PusherClient(this.pusherConfig.key, {
        cluster: this.pusherConfig.cluster,
        forceTLS: true,
      });

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
        console.error('Pusher connection error:', err);
        this.emit('error', 'Pusher connection error: ' + (err?.error?.data?.message || err?.message || 'Check credentials'));
      });

      // Subscribe to this desk's private channel
      const channelName = `desk-${this.currentDeskId.replace(/\s+/g, '')}`;
      this.pusherChannel = this.pusherClient.subscribe(channelName);

      this.pusherChannel.bind('incoming-request', (data: IncomingRequest) => {
        this.emit('incoming-connection-request', data);
      });

      this.pusherChannel.bind('connection-response', (data: any) => {
        this.emit('connection-response', data);
      });

      this.pusherChannel.bind('signal', (data: any) => {
        this.emit('signal', data);
      });

      this.pusherChannel.bind('session-ended', (data: any) => {
        this.emit('session-ended', data);
      });
    } catch (e: any) {
      console.error('Pusher init error:', e);
      this.emit('error', e.message);
      this.setMode('builtin-ws');
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
    switch (msg.type) {
      case 'registered':
        this.emit('registered', msg.deskId);
        break;
      case 'online-desks':
        this.emit('online-desks', msg.desks);
        break;
      case 'incoming-connection-request':
        this.emit('incoming-connection-request', {
          fromDeskId: msg.fromDeskId,
          fromName: msg.fromName,
          requesterInfo: msg.requesterInfo,
        });
        break;
      case 'connection-response':
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
        this.emit('session-ended', {
          fromDeskId: msg.fromDeskId,
        });
        break;
    }
  }

  public requestConnection(targetDeskId: string) {
    const cleanTargetId = targetDeskId.replace(/\s+/g, '');
    const cleanSelfId = this.currentDeskId.replace(/\s+/g, '');

    const reqData = {
      fromDeskId: cleanSelfId,
      fromName: this.currentDeskName,
      requesterInfo: {
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
      },
    };

    if (this.mode === 'pusher') {
      this.triggerPusherEvent(`desk-${cleanTargetId}`, 'incoming-request', reqData);
    } else {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'request-connection',
            targetDeskId: cleanTargetId,
            fromDeskId: cleanSelfId,
            fromName: this.currentDeskName,
            requesterInfo: reqData.requesterInfo,
          })
        );
      }
    }
  }

  public respondToConnection(targetDeskId: string, accepted: boolean, reason?: string) {
    const cleanTargetId = targetDeskId.replace(/\s+/g, '');
    const cleanSelfId = this.currentDeskId.replace(/\s+/g, '');

    const payload = {
      targetDeskId: cleanTargetId,
      fromDeskId: cleanSelfId,
      accepted,
      reason,
    };

    if (this.mode === 'pusher') {
      this.triggerPusherEvent(`desk-${cleanTargetId}`, 'connection-response', payload);
    } else {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'respond-connection',
            ...payload,
          })
        );
      }
    }
  }

  public sendSignal(targetDeskId: string, signalData: any) {
    const cleanTargetId = targetDeskId.replace(/\s+/g, '');
    const cleanSelfId = this.currentDeskId.replace(/\s+/g, '');

    const payload = {
      targetDeskId: cleanTargetId,
      fromDeskId: cleanSelfId,
      signalData,
    };

    if (this.mode === 'pusher') {
      this.triggerPusherEvent(`desk-${cleanTargetId}`, 'signal', payload);
    } else {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'signal',
            ...payload,
          })
        );
      }
    }
  }

  public endSession(targetDeskId: string) {
    const cleanTargetId = targetDeskId.replace(/\s+/g, '');
    const cleanSelfId = this.currentDeskId.replace(/\s+/g, '');

    const payload = {
      targetDeskId: cleanTargetId,
      fromDeskId: cleanSelfId,
    };

    if (this.mode === 'pusher') {
      this.triggerPusherEvent(`desk-${cleanTargetId}`, 'session-ended', payload);
    } else {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'end-session',
            ...payload,
          })
        );
      }
    }
  }

  private async triggerPusherEvent(channel: string, event: string, data: any) {
    try {
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
        const err = await response.json();
        console.warn('Pusher trigger failed:', err);
      }
    } catch (e) {
      console.error('Pusher trigger fetch error:', e);
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
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
