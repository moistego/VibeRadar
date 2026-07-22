import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface PeerData {
  userId: string;
  displayName?: string;
  lastRSSI: number;
  lastHeading: number;
  bearing: number | null;
  distance: number | null;
  confidence: number;
  lastSeen: number;
  latitude?: number;
  longitude?: number;
  isConnected: boolean;
}

interface PeersState {
  peers: Record<string, PeerData>;
  peerIds: string[];
}

const initialState: PeersState = {
  peers: {},
  peerIds: [],
};

const peersSlice = createSlice({
  name: 'peers',
  initialState,
  reducers: {
    upsertPeer: (state, action: PayloadAction<PeerData>) => {
      const {userId} = action.payload;
      state.peers[userId] = action.payload;
      if (!state.peerIds.includes(userId)) {
        state.peerIds.push(userId);
      }
    },
    updatePeerRSSI: (
      state,
      action: PayloadAction<{userId: string; rssi: number; heading: number; timestamp: number}>,
    ) => {
      const peer = state.peers[action.payload.userId];
      if (peer) {
        peer.lastRSSI = action.payload.rssi;
        peer.lastHeading = action.payload.heading;
        peer.lastSeen = action.payload.timestamp;
      }
    },
    updatePeerBearing: (
      state,
      action: PayloadAction<{userId: string; bearing: number; distance: number; confidence: number}>,
    ) => {
      const peer = state.peers[action.payload.userId];
      if (peer) {
        peer.bearing = action.payload.bearing;
        peer.distance = action.payload.distance;
        peer.confidence = action.payload.confidence;
      }
    },
    updatePeerPosition: (
      state,
      action: PayloadAction<{userId: string; latitude: number; longitude: number}>,
    ) => {
      const peer = state.peers[action.payload.userId];
      if (peer) {
        peer.latitude = action.payload.latitude;
        peer.longitude = action.payload.longitude;
      }
    },
    setPeerConnected: (
      state,
      action: PayloadAction<{userId: string; connected: boolean}>,
    ) => {
      const peer = state.peers[action.payload.userId];
      if (peer) {
        peer.isConnected = action.payload.connected;
      }
    },
    removePeer: (state, action: PayloadAction<string>) => {
      delete state.peers[action.payload];
      state.peerIds = state.peerIds.filter(id => id !== action.payload);
    },
    cleanupStalePeers: (state, action: PayloadAction<number>) => {
      const cutoff = action.payload; // timestamp
      const staleIds = state.peerIds.filter(id => {
        const peer = state.peers[id];
        return peer && peer.lastSeen < cutoff;
      });
      staleIds.forEach(id => {
        delete state.peers[id];
      });
      state.peerIds = state.peerIds.filter(id => !staleIds.includes(id));
    },
    clearPeers: () => initialState,
  },
});

export const {
  upsertPeer,
  updatePeerRSSI,
  updatePeerBearing,
  updatePeerPosition,
  setPeerConnected,
  removePeer,
  cleanupStalePeers,
  clearPeers,
} = peersSlice.actions;
export default peersSlice.reducer;
