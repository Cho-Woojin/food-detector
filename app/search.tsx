import { Icon } from '@/components/Icon';
import { Cheese, Mascots } from '@/constants/Assets';
import { palette } from '@/constants/Colors';
import { Grade } from '@/constants/MockData';
import { RecomputedRow, ensureRecomputedIndex } from '@/utils/dataStore';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RECENT_SEED = ['행복한', '국수', '돈까스'];
const POPULAR = ['강남 한식', '냉면', '돈까스', '국수', '한식', '중식'];

type IndexRow = RecomputedRow;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState((params.q as string) ?? '');
  const [recent, setRecent] = useState(RECENT_SEED);
  const [index, setIndex] = useState<IndexRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureRecomputedIndex().then((rows) => {
      if (!cancelled) setIndex(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmed = query.trim();
  const isTyping = trimmed.length > 0;

  const suggestions = useMemo(() => {
    if (!isTyping || !index) return [];
    const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
    const out: IndexRow[] = [];
    for (const r of index) {
      const haystack = `${r.n} ${r.c} ${r.g}`.toLowerCase();
      if (tokens.every((t) => haystack.includes(t))) {
        out.push(r);
        if (out.length >= 20) break;
      }
    }
    // 점수순 정렬, 등급 우선
    return out.sort((a, b) => {
      if (a.gr === 'GOLDEN' && b.gr !== 'GOLDEN') return -1;
      if (b.gr === 'GOLDEN' && a.gr !== 'GOLDEN') return 1;
      return b.s - a.s;
    });
  }, [trimmed, isTyping, index]);

  const submit = (q: string) => {
    if (!q.trim()) return;
    setRecent((prev) => [q, ...prev.filter((x) => x !== q)].slice(0, 8));
  };

  const removeRecent = (kw: string) => setRecent((prev) => prev.filter((x) => x !== kw));
  const clearRecent = () => setRecent([]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.inputWrap}>
          <Icon name="search" size={16} color={palette.accent} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="식당 이름, 카테고리, 자치구"
            placeholderTextColor={palette.text3}
            returnKeyType="search"
            onSubmitEditing={() => submit(query)}
            autoFocus
            style={styles.input}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={6} style={styles.clearBtn}>
              <Icon name="close" size={14} color={palette.white} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.cancel}>취소</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}>

        {!index && (
          <Text style={styles.loading}>인덱스 불러오는 중…</Text>
        )}

        {isTyping ? (
          <View>
            {index && suggestions.length > 0 && (
              <Text style={styles.resultCount}>
                상위 {suggestions.length}건 (전체 26,793곳에서 검색)
              </Text>
            )}
            {suggestions.map((r) => (
              <Pressable
                key={r.i}
                onPress={() => router.push(`/restaurant/${r.i}` as any)}
                style={styles.suggestRow}>
                <Icon name="search" size={14} color={palette.text3} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestName}>{highlight(r.n, trimmed)}</Text>
                  <Text style={styles.suggestMeta}>
                    {r.g} · {r.c} {r.s > 0 ? `· ${r.s}점` : ''}
                  </Text>
                </View>
                {gradeCheese(r.gr)}
              </Pressable>
            ))}
            {index && suggestions.length === 0 && (
              <View style={styles.empty}>
                <Image source={Mascots.empty} style={styles.emptyMascot} resizeMode="contain" />
                <Text style={styles.emptyTitle}>일치하는 식당이 없어요</Text>
                <Text style={styles.emptyBody}>다른 키워드로 다시 검색해보세요</Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>최근 검색</Text>
              {recent.length > 0 && (
                <Pressable onPress={clearRecent} hitSlop={6}>
                  <Text style={styles.sectionAction}>전체 삭제</Text>
                </Pressable>
              )}
            </View>
            {recent.length > 0 ? (
              <View style={styles.chipsRow}>
                {recent.map((kw) => (
                  <View key={kw} style={styles.recentChip}>
                    <Pressable onPress={() => setQuery(kw)}>
                      <Text style={styles.recentChipText}>{kw}</Text>
                    </Pressable>
                    <Pressable onPress={() => removeRecent(kw)} hitSlop={6}>
                      <Icon name="close" size={11} color={palette.text3} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.recentEmpty}>최근 검색 기록이 없어요</Text>
            )}

            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>인기 검색어</Text>
              <Text style={styles.sectionTime}>오늘 12:00 기준</Text>
            </View>
            <View style={styles.popularList}>
              {POPULAR.map((kw, i) => (
                <Pressable key={kw} onPress={() => setQuery(kw)} style={styles.popularRow}>
                  <Text style={[styles.popularRank, i < 3 && { color: palette.accent }]}>
                    {i + 1}
                  </Text>
                  <Text style={styles.popularText}>{kw}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function gradeCheese(gr: Grade) {
  if (gr === 'GOLDEN') return <Image source={Cheese.gold} style={styles.suggestCheese} resizeMode="contain" />;
  if (gr === 'SILVER') return <Image source={Cheese.silver} style={styles.suggestCheese} resizeMode="contain" />;
  if (gr === 'BRONZE') return <Image source={Cheese.bronze} style={styles.suggestCheese} resizeMode="contain" />;
  return null;
}

function highlight(text: string, term: string) {
  if (!term) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <Text style={{ color: palette.accent, fontWeight: '700' }}>
        {text.slice(idx, idx + term.length)}
      </Text>
      {text.slice(idx + term.length)}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.bgCard,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  input: { flex: 1, fontSize: 14, color: palette.text1, paddingVertical: 0 },
  clearBtn: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: palette.text3,
    alignItems: 'center', justifyContent: 'center',
  },
  cancel: { fontSize: 14, color: palette.text1, fontWeight: '500' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14 },

  loading: { fontSize: 12, color: palette.text3, paddingVertical: 24, textAlign: 'center' },
  resultCount: { fontSize: 11, color: palette.text3, marginBottom: 8 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: palette.text1 },
  sectionAction: { fontSize: 12, color: palette.text3 },
  sectionTime: { fontSize: 11, color: palette.text3 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
  },
  recentChipText: { fontSize: 12, color: palette.text1, fontWeight: '500' },
  recentEmpty: { fontSize: 12, color: palette.text3, paddingVertical: 12 },

  popularList: { gap: 4 },
  popularRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10,
  },
  popularRank: { fontSize: 14, fontWeight: '800', color: palette.text2, width: 20 },
  popularText: { fontSize: 14, color: palette.text1, fontWeight: '500' },

  suggestRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.border,
  },
  suggestName: { fontSize: 14, color: palette.text1, fontWeight: '500' },
  suggestMeta: { fontSize: 11, color: palette.text3, marginTop: 2 },
  suggestCheese: { width: 28, height: 28 },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyMascot: { width: 110, height: 110, marginBottom: 12 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: palette.text1, marginBottom: 4 },
  emptyBody: { fontSize: 12, color: palette.text3 },
});
