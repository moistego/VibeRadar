import {createClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Single shared Supabase client for the whole app. AuthService,
// GroupService, and LocationSyncService all import THIS instance rather
// than creating their own — otherwise the anonymous auth session created
// by AuthService wouldn't be visible to the other services' requests,
// and every RLS policy check (which relies on auth.uid()) would fail.
const SUPABASE_URL = 'https://gnnurzhtszroudpnxnbo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xbb0gMncTy3Goeyfk5WrfQ_5S7K4kuy';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
    },
});
