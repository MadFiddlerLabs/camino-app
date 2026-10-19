import 'dotenv/config';
import { ExpoConfig } from 'expo/config';

// Build-time guard for the exact Android launch trap the handoff repeats: an Android *production*
// build MUST carry EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER, or the Play Integrity path bakes in
// empty → getNativeSession returns null on Android → sessionGate 401s /api/lola → the interview
// ships DEAD to the 12 closed-test testers. Fail the cloud build fast (before ~20min of EAS work
// and a broken .aab) rather than discover it on the Redmi. Scoped to EAS build-server env vars, so
// it never fires for iOS, web, local dev, `expo start`, or tests. See docs/ANDROID_LAUNCH.md.
if (
  process.env.EAS_BUILD_PLATFORM === 'android' &&
  process.env.EAS_BUILD_PROFILE === 'production' &&
  !process.env.EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER
) {
  throw new Error(
    'Android production build is missing EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER (Play Integrity). ' +
      'Set it in the EAS "production" environment (plaintext) before cutting the .aab — otherwise ' +
      'the interview ships dead on Android. See docs/ANDROID_LAUNCH.md.',
  );
}

const config: ExpoConfig = {
  name: 'Get Camino',
  slug: 'camino',
  owner: 'madfiddlerlabs',
  // Bumped 1.0.0 → 1.0.1 (2026-08-01): once 1.0.0 was released on the App Store, Apple CLOSES that
  // pre-release "train" (ITMS-90186), so every later TestFlight/App Store build needs a higher
  // marketing version. Build number stays remote/auto-incremented (eas.json appVersionSource).
  version: '1.0.1',
  // OTA updates (EAS Update, build 40+): post-launch JS fixes ship without a new binary or an
  // App Review cycle (`npm run ota:production`). The FINGERPRINT policy (not appVersion) is
  // deliberate: it decouples OTA compatibility from `version`, so we can bump `version` (or ship
  // native changes) freely — fingerprint changes whenever anything native-affecting changes, so an
  // update can never land on an incompatible binary.
  runtimeVersion: { policy: 'fingerprint' },
  updates: {
    url: 'https://u.expo.dev/5714f767-d3dc-4284-8235-33e6d7e6f381',
  },
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'caminoapp',
  userInterfaceStyle: 'automatic',
  ios: {
    // iPad off for the first release (user decision 2026-07-03): no iPad screenshots or
    // review overhead until the phone experience has earned its keep.
    supportsTablet: false,
    bundleIdentifier: 'com.nerolabs.camino',
    usesAppleSignIn: true, // Sign in with Apple (App Review guideline 4.8 — required alongside Google)
    // Universal links: getcamino.app links in our emails open the APP (signed in) instead of a
    // logged-out browser tab. Pairs with public/.well-known/apple-app-site-association (the
    // AASA file lists which paths deep-link). Apple fetches the AASA via its CDN on install,
    // so AASA changes need a fresh install to take effect on a device.
    associatedDomains: ['applinks:getcamino.app'],
    // App Attest (build 39): the entitlement @expo/app-integrity needs to prove requests come from
    // a genuine, unmodified install on a real device — the non-spoofable native equivalent of the
    // web's Turnstile (council fix C2b). "production" = App Store / TestFlight builds; the App
    // Attest capability is enabled on the App ID (developer portal, 2026-07-13) so EAS re-mints the
    // provisioning profile with this entitlement on the next build.
    entitlements: {
      'com.apple.developer.devicecheck.appattest-environment': 'production',
    },
    infoPlist: {
      // App uses only standard HTTPS (exempt encryption) — avoids the manual export-compliance step.
      ITSAppUsesNonExemptEncryption: false,
      // A linked system framework (expo-file-system) references the Photos API, so Apple's static
      // check (ITMS-90683) requires this string even though Get Camino does not access your photos.
      // TODO(public-release): revisit — drop this if we confirm no photo API path ships.
      NSPhotoLibraryUsageDescription:
        'Get Camino does not access your photo library; this entry is only required by a system framework the app links against.',
    },
  },
  android: {
    // Android package = the AELaboratories legal entity + brand (the Play app created 2026-07-30).
    // Deliberately differs from the iOS bundle (com.nerolabs.camino, already live) — the two store
    // IDs are independent, and iOS can't change post-launch.
    package: 'com.aelaboratories.getcamino',
    adaptiveIcon: {
      backgroundColor: '#2B5AA3',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'server', // 'server' enables Expo Router API routes (app/api/*+api.ts) on EAS Hosting
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    // sitemap:false removes the auto-injected /_sitemap route index (which otherwise lists every
    // route, including the unlisted /how-i-was-built blog). Expo Router has no per-route exclusion.
    ['expo-router', { sitemap: false }],
    ['expo-splash-screen', {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#FBFAF7',
    }],
    'expo-font',
    ['expo-speech-recognition', {
      microphonePermission: 'Allow Get Camino to use the microphone so you can dictate your answers.',
      speechRecognitionPermission: 'Allow Get Camino to use speech recognition to transcribe your spoken answers.',
    }],
    // expo-speech-recognition requires iOS 16.4+; pin the deployment target so the pod builds.
    ['expo-build-properties', { ios: { deploymentTarget: '16.4' } }],
    // Native Sentry (crash/error reporting + source-map upload during EAS Build). Source-map
    // upload needs SENTRY_AUTH_TOKEN as an EAS secret; without it the build still succeeds but
    // stack traces stay minified. DSN + init live in lib/monitoring.native.ts.
    ['@sentry/react-native/expo', {
      url: 'https://sentry.io/',
      organization: 'madfiddlerlabs',
      project: 'getcamino',
    }],
    // Peer of posthog-react-native (device-locale context for native analytics). NOT app i18n —
    // that's a separate, later effort.
    'expo-localization',
    // Sign in with Apple (adds the entitlement; EAS syncs the capability at build time).
    'expo-apple-authentication',
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: { projectId: '5714f767-d3dc-4284-8235-33e6d7e6f381' },
    // Note: the Anthropic key is intentionally NOT exposed here. It lives only on the
    // server (process.env.ANTHROPIC_API_KEY) and is used by app/api/lola+api.ts.
  },
};

export default config;
