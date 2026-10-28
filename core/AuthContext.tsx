import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { type Session, type User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { currentLang } from '@/lib/i18n';
import { capture, identify, resetAnalytics } from '@/lib/analytics';
import { captureError } from '@/lib/monitoring';
import { signInWithApple as appleFlow, appleSignInAvailable } from '@/lib/appleSignIn';
import { isAppleSignInCancel } from '@/lib/appleSignInCancel';
import { type Profile } from './interview-controller';

// Lets the auth browser session close cleanly after the OAuth redirect (no-op harm on native).
WebBrowser.maybeCompleteAuthSession();

// Turn an OAuth redirect URL into a Supabase session. Handles both flows: PKCE (a `code` to
// exchange) and implicit (access/refresh tokens in the URL). Used by the native sign-in flow.
async function completeSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);
  if (params.code) {
    await supabase.auth.exchangeCodeForSession(params.code);
  } else if (params.access_token && params.refresh_token) {
    await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
  }
}

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>; // iOS only — no-op elsewhere (appleSignInAvailable gates UI)
  appleSignInAvailable: boolean;
  // Passwordless email (magic link + one-time code). `pendingProfile` rides along as auth
  // metadata for brand-new accounts ("email me my roadmap"): SessionSync adopts it on first
  // sign-in, so the link works even when clicked on a different device.
  signInWithEmail: (email: string, pendingProfile?: Profile) => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null, user: null, loading: true,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  appleSignInAvailable: false,
  signInWithEmail: async () => {},
  verifyEmailCode: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) identify(session.user.id);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      // Tie analytics events to the user once known; unlink on sign-out.
      if (session?.user) identify(session.user.id);
      else if (event === 'SIGNED_OUT') resetAnalytics();
    });
    return () => subscription.unsubscribe();
  }, []);

  // Native: complete sessions arriving via cold/warm deep links — a magic-link email opens
  // caminoapp://auth-callback directly from Mail, with no in-app browser session for
  // openAuthSessionAsync to return through (unlike the Google flow above).
  useEffect(() => {
    if (Platform.OS === 'web') return; // web: detectSessionInUrl handles the redirect
    const complete = (url: string | null) => {
      if (url && url.includes('auth-callback')) completeSessionFromUrl(url).catch(() => {});
    };
    Linking.getInitialURL().then(complete);
    const sub = Linking.addEventListener('url', ({ url }) => complete(url));
    return () => sub.remove();
  }, []);

  async function signInWithGoogle() {
    if (Platform.OS === 'web') {
      // Web: full-page redirect; `detectSessionInUrl` (set on the client) completes it on return.
      // RN also defines a global `window` (without `.location`), so gate on Platform.OS not typeof.
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      return;
    }

    // Native: open the OAuth URL in an in-app browser and complete the session from the deep-link
    // redirect ourselves (detectSessionInUrl is off on native). redirectTo resolves to the app's
    // custom scheme, e.g. caminoapp://auth-callback — allowlisted in Supabase's redirect URLs.
    const redirectTo = Linking.createURL('auth-callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) throw error ?? new Error('no OAuth url');
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success' && result.url) {
      await completeSessionFromUrl(result.url);
    }
  }

  async function signInWithApple() {
    try {
      await appleFlow(); // session lands via onAuthStateChange
    } catch (e: unknown) {
      // The user closing Apple's sheet is not an error (see lib/appleSignInCancel.ts).
      if (isAppleSignInCancel(e)) return;
      const code = (e as { code?: string })?.code;
      // Anything else is a real failure ("Sign Up Not Completed" etc.) — make it observable.
      // Apple's native errors carry a code (e.g. ERR_REQUEST_UNKNOWN / 1000) that names the layer
      // that failed; Supabase signInWithIdToken errors carry a message. Log both destinations.
      captureError(e, { flow: 'apple_signin', code });
      capture('apple_signin_failed', { code: code ?? null, message: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  }

  async function signInWithEmail(email: string, pendingProfile?: Profile) {
    // Web lands on /plan (allowlisted in Supabase redirect URLs); native reuses the same
    // caminoapp://auth-callback deep link as the Google flow.
    const emailRedirectTo = Platform.OS === 'web'
      ? `${window.location.origin}/plan`
      : Linking.createURL('auth-callback');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true, // "email me my roadmap" silently creates the account
        emailRedirectTo,
        // data is only applied to NEW users by Supabase, so an existing account's saved
        // roadmap can never be clobbered from a signed-out screen. `lang` ALWAYS rides along:
        // the Supabase auth email templates read {{ .Data.lang }} to localize the sign-in
        // code email (user-found bug 2026-07-05: Italian UI, English code email), and the
        // weekly cron reads the same key. Existing users keep their stored lang (SessionSync
        // mirrors it); new users get it from this request.
        data: { lang: currentLang(), ...(pendingProfile ? { pending_profile: pendingProfile } : {}) },
      },
    });
    if (error) throw error;
  }

  async function verifyEmailCode(email: string, code: string) {
    // The one-time-code fallback: works cross-device, in simulators, and when mail apps
    // mangle links. Session lands via onAuthStateChange like every other method.
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signInWithGoogle, signInWithApple, appleSignInAvailable, signInWithEmail, verifyEmailCode, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
