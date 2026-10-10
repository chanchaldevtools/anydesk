export type ConnectionMode = 'builtin-ws' | 'pusher';

export type SessionRole = 'idle' | 'sharer' | 'viewer';

export interface DeskInfo {
  deskId: string;
  name: string;
  deviceType: string;
  connectedAt?: number;
}

export interface PusherConfig {
  appId: string;
  key: string;
  secret: string;
  cluster: string;
  enabled: boolean;
}

export interface WebRTCStats {
  resolution: string;
  fps: number;
  bitrateKbps: number;
  rttMs: number;
  packetsLost: number;
  codec: string;
}

export interface ChatMessage {
  id: string;
  senderDeskId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSelf: boolean;
}

export interface LaserPointer {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  active: boolean;
  color: string;
  senderName: string;
}

export interface AnnotationPoint {
  x: number;
  y: number;
}

export interface AnnotationStroke {
  id: string;
  color: string;
  points: AnnotationPoint[];
}

export interface IncomingRequest {
  fromDeskId: string;
  fromName: string;
  requesterInfo?: {
    userAgent: string;
    screenResolution?: string;
  };
}
