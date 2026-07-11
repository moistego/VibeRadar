import {createSelector} from '@reduxjs/toolkit';
import {RootState} from '@/state/store';

export const selectPeers = (state: RootState) => state.peers.peers;
export const selectPeerIds = (state: RootState) => state.peers.peerIds;

export const selectActivePeerIds = createSelector(
  [selectPeers, selectPeerIds],
  (peers, peerIds) =>
    peerIds.filter(id => {
      const peer = peers[id];
      return peer && Date.now() - peer.lastSeen < 120000; // active within 2 min
    }),
);

export const selectActivePeers = createSelector(
  [selectPeers, selectActivePeerIds],
  (peers, activeIds) => activeIds.map(id => peers[id]),
);

export const selectPeerById = (userId: string) =>
  createSelector([selectPeers], peers => peers[userId] ?? null);

export const selectPeersByConfidence = createSelector(
  [selectActivePeers],
  activePeers => [...activePeers].sort((a, b) => b.confidence - a.confidence),
);

export const selectNearestPeer = createSelector([selectActivePeers], peers => {
  if (peers.length === 0) return null;
  return peers.reduce((nearest, peer) => {
    if (peer.distance === null) return nearest;
    if (nearest.distance === null) return peer;
    return peer.distance < nearest.distance ? peer : nearest;
  }, peers[0]);
});

export const selectPeersCount = createSelector(
  [selectActivePeerIds],
  ids => ids.length,
);

export const selectHasPeers = createSelector(
  [selectPeersCount],
  count => count > 0,
);