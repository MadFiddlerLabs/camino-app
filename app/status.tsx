import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { palette } from '@/constants/Colors';
import Seo from '@/components/Seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import type { Check, CheckStatus } from '@/lib/status';

// Public product-health page (user idea 2026-09-07): one place that shows whether Camino
// and everything it depends on is up — app, Supabase (auth + database), and whatever we add
// later. Fed by GET /api/status, which probes the LIVE dependencies server-side and 503s if
// any critical one is down. Doubles as the single URL our one uptime monitor watches, so a
// dependency outage anywhere trips an alert. English-only, like the other meta pages.

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';
const REFRESH_MS = 30_000;

const OK = '#1f9d57';
const DOWN = '#c0392b';
const dotColor = (s: CheckStatus) => (s === 'ok' ? OK : DOWN);

type StatusPayload = { status: CheckStatus; checks: Check[]; updatedAt: string };

export default function Status() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/status`, { headers: { accept: 'application/json' } });
      const json = (await res.json()) as StatusPayload;
      setData(json);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const allOk = data?.status === 'ok';
  const bannerColor = error ? DOWN : allOk ? OK : DOWN;
  const bannerText = error
    ? "Couldn't reach the status service"
    : allOk
      ? 'All systems operational'
      : 'Service disruption — we are on it';

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Seo
        title="Status — Get Camino"
        description="Live health of Get Camino and the services it runs on — app, authentication, and database."
        canonical="https://getcamino.app/status"
      />
      <NavBar />

      <View style={styles.wrap}>
        <Text style={styles.eyebrow}>SYSTEM STATUS</Text>
        <Text style={styles.h1}>Get Camino status</Text>

        {loading && !data ? (
          <View style={styles.loading}>
            <ActivityIndicator color={palette.indigo} />
          </View>
        ) : (
          <>
            <View style={[styles.banner, { borderColor: bannerColor }]}>
              <View style={[styles.dot, styles.dotLg, { backgroundColor: bannerColor }]} />
              <Text style={[styles.bannerText, { color: bannerColor }]}>{bannerText}</Text>
            </View>

            {data?.checks?.map((c) => (
              <View key={c.name} style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.dot, { backgroundColor: dotColor(c.status) }]} />
                  <Text style={styles.rowName}>{c.name}</Text>
                </View>
                <Text style={styles.rowMeta}>
                  {c.status === 'ok'
                    ? c.latencyMs != null && c.latencyMs > 0
                      ? `Operational · ${c.latencyMs} ms`
                      : 'Operational'
                    : `Down${c.detail ? ` · ${c.detail}` : ''}`}
                </Text>
              </View>
            ))}

            <Text style={styles.updated}>
              {data?.updatedAt ? `Last checked ${new Date(data.updatedAt).toLocaleString()}` : ''}
              {'  ·  auto-refreshes every 30s'}
            </Text>
          </>
        )}
      </View>

      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.cal },
  content: { flexGrow: 1 },
  wrap: { paddingVertical: 44, paddingHorizontal: 24, alignItems: 'center', gap: 10 },
  eyebrow: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, letterSpacing: 2, color: palette.amber },
  h1: { fontFamily: 'Fraunces_600SemiBold', fontSize: 28, lineHeight: 34, color: palette.indigo, textAlign: 'center', marginBottom: 12 },
  loading: { paddingVertical: 40 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20,
    width: '100%', maxWidth: 560, marginBottom: 10,
  },
  bannerText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 18 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', maxWidth: 560,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowName: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: palette.indigo },
  rowMeta: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: palette.muted },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotLg: { width: 14, height: 14, borderRadius: 7 },
  updated: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: palette.muted, marginTop: 16, textAlign: 'center' },
});
