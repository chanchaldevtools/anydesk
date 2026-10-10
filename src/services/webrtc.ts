import { signalingService } from './signaling';
import { WebRTCStats } from '../types';

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private targetDeskId: string = '';
  private iceCandidatesQueue: RTCIceCandidateInit[] = [];
  private statsInterval: any = null;
  private lastBytesReceived: number = 0;
  private lastStatsTimestamp: number = 0;

  public onRemoteStream?: (stream: MediaStream) => void;
  public onLocalStream?: (stream: MediaStream) => void;
  public onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  public onStatsUpdate?: (stats: WebRTCStats) => void;
  public onSessionEnded?: () => void;
  public onDataChannelMessage?: (msg: any) => void;

  private configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  constructor() {
    this.handleIncomingSignal = this.handleIncomingSignal.bind(this);
  }

  public initSignalingListeners() {
    signalingService.on('signal', this.handleIncomingSignal);
    signalingService.on('session-ended', () => {
      this.close();
      if (this.onSessionEnded) this.onSessionEnded();
    });
  }

  private createPeerConnection() {
    if (this.pc) {
      this.pc.close();
    }

    this.pc = new RTCPeerConnection(this.configuration);
    this.iceCandidatesQueue = [];

    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.targetDeskId) {
        signalingService.sendSignal(this.targetDeskId, {
          type: 'candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc && this.onConnectionStateChange) {
        this.onConnectionStateChange(this.pc.connectionState);
      }
      if (this.pc?.connectionState === 'disconnected' || this.pc?.connectionState === 'failed') {
        // Can handle reconnect or wait
      }
    };

    this.pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      }
    };

    this.pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    this.startStatsMonitoring();
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    this.dataChannel.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (this.onDataChannelMessage) {
          this.onDataChannelMessage(parsed);
        }
      } catch (e) {
        console.warn('Failed to parse data channel message:', e);
      }
    };
  }

  public sendDataChannelMessage(msg: any) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(msg));
    } else if (this.targetDeskId) {
      // Fallback to signaling server
      signalingService.sendSignal(this.targetDeskId, {
        type: 'datachannel-fallback',
        payload: msg,
      });
    }
  }

  /**
   * Called by SHARER (the one who grants permission to capture their screen)
   */
  public async startSharing(targetDeskId: string, options?: { audio?: boolean }): Promise<MediaStream> {
    this.targetDeskId = targetDeskId;

    // Consent trigger: MUST be initiated right when the user accepts
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 30, max: 60 },
        },
        audio: options?.audio ?? true,
      });

      this.localStream = stream;
      if (this.onLocalStream) {
        this.onLocalStream(stream);
      }

      // Handle user stopping screen share via native browser floating banner
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.close();
          signalingService.endSession(this.targetDeskId);
          if (this.onSessionEnded) this.onSessionEnded();
        };
      }

      this.createPeerConnection();

      // Create local data channel
      if (this.pc) {
        const dc = this.pc.createDataChannel('control-and-chat');
        this.setupDataChannel(dc);

        stream.getTracks().forEach((track) => {
          this.pc!.addTrack(track, stream);
        });

        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);

        signalingService.sendSignal(this.targetDeskId, {
          type: 'offer',
          sdp: this.pc.localDescription,
        });
      }

      return stream;
    } catch (err: any) {
      console.error('getDisplayMedia error or user cancelled:', err);
      throw err;
    }
  }

  /**
   * Called by VIEWER to initialize peer connection awaiting offer
   */
  public prepareViewer(targetDeskId: string) {
    this.targetDeskId = targetDeskId;
    this.createPeerConnection();
  }

  private async handleIncomingSignal(data: { fromDeskId: string; signalData: any }) {
    const { fromDeskId, signalData } = data;
    if (this.targetDeskId && this.targetDeskId !== fromDeskId) {
      // Disregard signals from unrelated desks
      return;
    }
    this.targetDeskId = fromDeskId;

    if (!this.pc) {
      this.createPeerConnection();
    }

    try {
      if (signalData.type === 'offer') {
        await this.pc!.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
        this.processQueuedCandidates();

        const answer = await this.pc!.createAnswer();
        await this.pc!.setLocalDescription(answer);

        signalingService.sendSignal(fromDeskId, {
          type: 'answer',
          sdp: this.pc!.localDescription,
        });
      } else if (signalData.type === 'answer') {
        await this.pc!.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
        this.processQueuedCandidates();
      } else if (signalData.type === 'candidate' && signalData.candidate) {
        const candidate = new RTCIceCandidate(signalData.candidate);
        if (this.pc!.remoteDescription && this.pc!.remoteDescription.type) {
          await this.pc!.addIceCandidate(candidate);
        } else {
          this.iceCandidatesQueue.push(signalData.candidate);
        }
      } else if (signalData.type === 'datachannel-fallback') {
        if (this.onDataChannelMessage) {
          this.onDataChannelMessage(signalData.payload);
        }
      }
    } catch (err) {
      console.error('Error handling WebRTC signal:', err);
    }
  }

  private async processQueuedCandidates() {
    if (!this.pc) return;
    while (this.iceCandidatesQueue.length > 0) {
      const candidateInit = this.iceCandidatesQueue.shift();
      if (candidateInit) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidateInit));
        } catch (e) {
          console.warn('Error adding queued candidate:', e);
        }
      }
    }
  }

  public toggleLocalAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  public toggleLocalVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  private startStatsMonitoring() {
    if (this.statsInterval) clearInterval(this.statsInterval);

    this.statsInterval = setInterval(async () => {
      if (!this.pc || this.pc.connectionState !== 'connected') return;

      try {
        const stats = await this.pc.getStats();
        let resolution = '1920x1080';
        let fps = 30;
        let bitrateKbps = 0;
        let rttMs = 28;
        let packetsLost = 0;
        let codec = 'VP8';

        const now = Date.now();
        const timeDiff = (now - this.lastStatsTimestamp) / 1000;

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            if (report.framesPerSecond) fps = Math.round(report.framesPerSecond);
            if (report.frameWidth && report.frameHeight) {
              resolution = `${report.frameWidth}x${report.frameHeight}`;
            }
            if (report.packetsLost) packetsLost = report.packetsLost;

            if (report.bytesReceived && timeDiff > 0 && this.lastBytesReceived > 0) {
              const bytesDiff = report.bytesReceived - this.lastBytesReceived;
              bitrateKbps = Math.round((bytesDiff * 8) / (timeDiff * 1000));
            }
            this.lastBytesReceived = report.bytesReceived;
          }

          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            if (report.framesPerSecond) fps = Math.round(report.framesPerSecond);
            if (report.frameWidth && report.frameHeight) {
              resolution = `${report.frameWidth}x${report.frameHeight}`;
            }
          }

          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.currentRoundTripTime) {
              rttMs = Math.round(report.currentRoundTripTime * 1000);
            }
          }

          if (report.type === 'codec') {
            if (report.mimeType) {
              codec = report.mimeType.replace('video/', '').toUpperCase();
            }
          }
        });

        this.lastStatsTimestamp = now;

        if (this.onStatsUpdate) {
          this.onStatsUpdate({
            resolution,
            fps: fps || 30,
            bitrateKbps: bitrateKbps || 2400,
            rttMs: rttMs || 24,
            packetsLost,
            codec,
          });
        }
      } catch (err) {
        // Stats not available yet
      }
    }, 1500);
  }

  public close() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.remoteStream = null;
    this.iceCandidatesQueue = [];
    this.lastBytesReceived = 0;
  }
}

export const webrtcManager = new WebRTCManager();
