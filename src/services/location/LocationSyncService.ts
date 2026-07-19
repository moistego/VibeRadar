import Geolocation, {GeoPosition, GeoError} from 'react-native-geolocation-service';
import {createClient, SupabaseClient, RealtimeChannel} from '@supabase/supabase-js';
import {AppState, AppStateStatus, PermissionsAndroid, Platform} from 'react-native';
import {logger} from '@/utils/logger';
import {SENSORS} from '@/utils/constants';

const TAG = 'LocationSyncService';

// TODO: move these to env config (react-native-config or similar) rather
// than hardcoding — placeholders shown for clarity.
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// Foreground vs background push/pull cadence. Mirrors the pattern already
// used for BLE scan intervals in BLE constants — same idea, applied to GPS.
const PUSH_INTERVAL_FOREGROUND_MS = 3000;
const PUSH_INTERVAL_BACKGROUND_MS = 15000;

export interface PeerLocation {
    userId: string;
    latitude: number;
    longitude: number;
    heading?: number;
    updatedAt: number; // epoch ms
}

type PeerLocationsCallback = (peers: PeerLocation[]) => void;

class LocationSyncServiceClass {
    private supabase: SupabaseClient;
    private watchId: number | null = null;
    private pushIntervalHandle: ReturnType<typeof setInterval> | null = null;
    private realtimeChannel: RealtimeChannel | null = null;
    private appStateSubscription: {remove: () => void} | null = null;

  private currentGroupId: string | null = null;
    private currentUserId: string | null = null;
    private latestPosition: {latitude: number; longitude: number} | null = null;
    private peerLocationsCallback: PeerLocationsCallback | null = null;
    private appState: AppStateStatus = 'active';

  constructor() {
        this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  /**
     * Request the OS location permission. Must be called (and granted)
     * before startSync() will produce any position updates.
     */
  async requestPermission(): Promise<boolean> {
        try {
                if (Platform.OS === 'android') {
                          const granted = await PermissionsAndroid.request(
                                      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                            {
                                          title: 'Location Permission',
                                          message: 'VibeRadar needs your location to point you toward your friends.',
                                          buttonPositive: 'OK',
                            },
                                    );
                          return granted === PermissionsAndroid.RESULTS.GRANTED;
                }

          // iOS: permission prompt is triggered by the first Geolocation call
          // itself, driven by NSLocationWhenInUseUsageDescription in Info.plist.
          const authStatus = await Geolocation.requestAuthorization('whenInUse');
                return authStatus === 'granted';
        } catch (error) {
                logger.error(TAG, 'Failed to request location permission', error as Error);
                return false;
        }
  }

  /**
     * Start syncing location for a given group: begins watching GPS,
     * pushing this device's position on an interval, and subscribing to
     * realtime updates for every other member of the group.
     */
  async startSync(
        groupId: string,
        userId: string,
        onPeerLocations: PeerLocationsCallback,
      ): Promise<boolean> {
        try {
                const hasPermission = await this.requestPermission();
                if (!hasPermission) {
                          logger.error(TAG, 'Location permission denied — cannot start sync');
                          return false;
                }

          this.currentGroupId = groupId;
                this.currentUserId = userId;
                this.peerLocationsCallback = onPeerLocations;

          this.startWatchingPosition();
                this.startPushLoop();
                await this.subscribeToPeerUpdates(groupId);
                await this.fetchInitialPeerLocations(groupId);

          this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

          logger.info(TAG, 'Location sync started', {groupId});
                return true;
        } catch (error) {
                logger.error(TAG, 'Failed to start location sync', error as Error);
                return false;
        }
  }

  async stopSync(): Promise<void> {
        if (this.watchId !== null) {
                Geolocation.clearWatch(this.watchId);
                this.watchId = null;
        }
        if (this.pushIntervalHandle) {
                clearInterval(this.pushIntervalHandle);
                this.pushIntervalHandle = null;
        }
        if (this.realtimeChannel) {
                await this.supabase.removeChannel(this.realtimeChannel);
                this.realtimeChannel = null;
        }
        if (this.appStateSubscription) {
                this.appStateSubscription.remove();
                this.appStateSubscription = null;
        }

      // Remove this device's row so it stops showing up for the group.
      if (this.currentGroupId && this.currentUserId) {
              await this.supabase
                .from('locations')
                .delete()
                .eq('group_id', this.currentGroupId)
                .eq('user_id', this.currentUserId);
      }

      this.currentGroupId = null;
        this.currentUserId = null;
        this.latestPosition = null;
        this.peerLocationsCallback = null;

      logger.info(TAG, 'Location sync stopped');
  }

  // ------------------------------------------------------------------
  // GPS watching
  // ------------------------------------------------------------------

  private startWatchingPosition(): void {
        this.watchId = Geolocation.watchPosition(
                (position: GeoPosition) => {
                          this.latestPosition = {
                                      latitude: position.coords.latitude,
                                      longitude: position.coords.longitude,
                          };
                },
                (error: GeoError) => {
                          logger.error(TAG, 'GPS watch error', error as unknown as Error);
                },
          {
                    enableHighAccuracy: true,
                    distanceFilter: 2, // meters — ignore GPS noise smaller than this
                    interval: SENSORS.GPS_UPDATE_INTERVAL_MS,
                    fastestInterval: SENSORS.GPS_UPDATE_INTERVAL_MS,
          },
              );
  }

  // ------------------------------------------------------------------
  // Pushing our own position to Supabase
  // ------------------------------------------------------------------

  private startPushLoop(): void {
        const intervalMs = this.appState === 'active'
          ? PUSH_INTERVAL_FOREGROUND_MS
                : PUSH_INTERVAL_BACKGROUND_MS;

      if (this.pushIntervalHandle) {
              clearInterval(this.pushIntervalHandle);
      }

      this.pushIntervalHandle = setInterval(() => {
              this.pushCurrentPosition();
      }, intervalMs);
  }

  private async pushCurrentPosition(): Promise<void> {
        if (!this.latestPosition || !this.currentGroupId || !this.currentUserId) {
                return; // no GPS fix yet, or not in an active session
        }

      try {
              const {error} = await this.supabase.from('locations').upsert(
                {
                            group_id: this.currentGroupId,
                            user_id: this.currentUserId,
                            latitude: this.latestPosition.latitude,
                            longitude: this.latestPosition.longitude,
                            updated_at: new Date().toISOString(),
                },
                {onConflict: 'group_id,user_id'},
                      );

          if (error) {
                    logger.error(TAG, 'Failed to push location', error as unknown as Error);
          }
      } catch (error) {
              logger.error(TAG, 'Unexpected error pushing location', error as Error);
      }
  }

  // ------------------------------------------------------------------
  // Pulling peers' positions
  // ------------------------------------------------------------------

  private async fetchInitialPeerLocations(groupId: string): Promise<void> {
        const {data, error} = await this.supabase
          .from('locations')
          .select('user_id, latitude, longitude, updated_at')
          .eq('group_id', groupId);

      if (error) {
              logger.error(TAG, 'Failed to fetch initial peer locations', error as unknown as Error);
              return;
      }

      this.emitPeerLocations(data ?? []);
  }

  private async subscribeToPeerUpdates(groupId: string): Promise<void> {
        this.realtimeChannel = this.supabase
          .channel(`locations:${groupId}`)
          .on(
                    'postgres_changes',
            {
                        event: '*', // INSERT, UPDATE, DELETE
                        schema: 'public',
                        table: 'locations',
                        filter: `group_id=eq.${groupId}`,
            },
                    () => {
                                // Simplest correct approach: re-fetch the full set on any change.
                      // For a group capped at GROUP.MAX_MEMBERS = 50, this is cheap.
                      this.fetchInitialPeerLocations(groupId);
                    },
                  )
          .subscribe((status) => {
                    logger.info(TAG, `Realtime subscription status: ${status}`);
          });
  }

  private emitPeerLocations(
        rows: {user_id: string; latitude: number; longitude: number; updated_at: string}[],
      ): void {
        if (!this.peerLocationsCallback || !this.currentUserId) {
                return;
        }

      const peers: PeerLocation[] = rows
          .filter(row => row.user_id !== this.currentUserId) // exclude self
        .map(row => ({
                  userId: row.user_id,
                  latitude: row.latitude,
                  longitude: row.longitude,
                  updatedAt: new Date(row.updated_at).getTime(),
        }));

      this.peerLocationsCallback(peers);
  }

  // ------------------------------------------------------------------
  // Foreground/background push cadence switching
  // ------------------------------------------------------------------

  private handleAppStateChange = (nextState: AppStateStatus): void => {
        if (nextState === this.appState) {
                return;
        }
        this.appState = nextState;
        logger.info(TAG, `App state changed: ${nextState}`);

      if (this.currentGroupId) {
              this.startPushLoop(); // restart with the interval matching new state
      }
  };

  /** Get this device's own last-known position (e.g. for UI display). */
  getLatestPosition(): {latitude: number; longitude: number} | null {
        return this.latestPosition;
  }
}

export const LocationSyncService = new LocationSyncServiceClass();
