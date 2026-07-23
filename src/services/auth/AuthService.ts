import {supabase} from '@/services/supabase/client';
import {logger} from '@/utils/logger';

const TAG = 'AuthService';

class AuthServiceClass {
    private currentUserId: string | null = null;

  /**
     * Call once on app startup. Restores an existing anonymous session if
     * one is persisted (AsyncStorage, via the shared client's auth config),
     * or creates a new anonymous user if this is a first launch.
     *
     * Returns the user's stable auth.uid(), or null if auth failed entirely
     * (e.g. no network on first launch — there's nothing to restore yet).
     */
  async initialize(): Promise<string | null> {
        try {
                const {data: sessionData, error: sessionError} = await supabase.auth.getSession();

          if (sessionError) {
                    logger.error(TAG, 'Failed to check for existing session', sessionError as unknown as Error);
          }

          if (sessionData?.session?.user) {
                    this.currentUserId = sessionData.session.user.id;
                    logger.info(TAG, 'Restored existing anonymous session', {userId: this.currentUserId});
                    return this.currentUserId;
          }

          const {data, error} = await supabase.auth.signInAnonymously();

          if (error || !data.user) {
                    logger.error(TAG, 'Anonymous sign-in failed', error as unknown as Error);
                    return null;
          }

          this.currentUserId = data.user.id;
                logger.info(TAG, 'Created new anonymous session', {userId: this.currentUserId});
                return this.currentUserId;
        } catch (error) {
                logger.error(TAG, 'Unexpected error during auth initialization', error as Error);
                return null;
        }
  }

  /** Get the current user's id without re-checking the network. */
  getUserId(): string | null {
        return this.currentUserId;
  }

  async signOut(): Promise<void> {
        try {
                await supabase.auth.signOut();
                this.currentUserId = null;
                logger.info(TAG, 'Signed out');
        } catch (error) {
                logger.error(TAG, 'Error signing out', error as Error);
        }
  }
}

export const AuthService = new AuthServiceClass();
