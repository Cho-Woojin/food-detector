import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Cheese } from '@/constants/Assets';
import { Grade } from '@/constants/MockData';
import { color, radius, spacing, typography } from '@/constants/tokens';
import { Chip, EmptyState, IconButton, SearchBar, SectionHeader } from '@/components/ui';
import { RecomputedRow, ensureRecomputedIndex } from '@/utils/dataStore';

const RECENT_SEED = ['행복한', '국수', '돈까스'];
const RECENT_STORAGE_KEY = 'foodDetector:recentSearch';
const RECENT_MAX = 8;

// 모달이 닫혔다 열려도 메모리에 유지 + localStorage persist (web)
let cachedRecent: string[] | null = null;

function loadRecent(): string[] {
  if (cachedRecent !== null) return cachedRecent;
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(RECENT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
          cachedRecent = parsed;
          return cachedRecent;
        }
      }
    } catch {
      /* noop */
    }
  }
  cachedRecent = [...RECENT_SEED];
  return cachedRecent;
}

function persistRecent(list: string[]) {
  cachedRecent = list;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* noop */
    }
  }
}

const POPULAR = [
  { kw: '강남 한식',   trend: 'up' },
  { kw: '냉면',        trend: 'up' },
  { kw: '돈까스',      trend: 'flat' },
  { kw: '국수',        trend: 'down' },
  { kw: '한식',        trend: 'flat' },
  { kw: '중식',        trend: 'down' },
] as const;

// 지도 탭과 동일한 카테고리 (CategoryKey와 매칭)
const CATEGORIES = [
  '한식', '치킨', '카페디저트', '일식', '중식', '양식', '분식', '고기',
  '술집', '찜탕', '아시안', '패스트푸드', '도시락', '샌드위치', '샐러드', '뷔페',
];

type IndexRow = RecomputedRow;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState((params.q as string) ?? '');
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
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

  const restaurantHits = useMemo(() => {
    if (!isTyping || !index) return [];
    const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
    const out: IndexRow[] = [];
    for (const r of index) {
      const haystack = `${r.n}`.toLowerCase();
      if (tokens.every((t) => haystack.includes(t))) {
        out.push(r);
        if (out.length >= 8) break;
      }
    }
    return out.sort((a, b) => {
      if (a.gr === 'GOLDEN' && b.gr !== 'GOLDEN') return -1;
      if (b.gr === 'GOLDEN' && a.gr !== 'GOLDEN') return 1;
      return b.s - a.s;
    });
  }, [trimmed, isTyping, index]);

  const districtHits = useMemo(() => {
    if (!isTyping || !index) return [];
    const set = new Set<string>();
    for (const r of index) {
      if (r.g.toLowerCase().includes(trimmed.toLowerCase())) {
        set.add(r.g);
        if (set.size >= 5) break;
      }
    }
    return Array.from(set);
  }, [trimmed, isTyping, index]);

  const categoryHits = useMemo(() => {
    if (!isTyping) return [];
    return CATEGORIES.filter((c) => c.includes(trimmed)).slice(0, 6);
  }, [trimmed, isTyping]);

  const totalHits = restaurantHits.length + districtHits.length + categoryHits.length;

  const submit = (q: string) => {
    const t = q.trim();
    if (!t) return;
    setRecent((prev) => {
      const next = [t, ...prev.filter((x) => x !== t)].slice(0, RECENT_MAX);
      persistRecent(next);
      return next;
    });
  };

  const removeRecent = (kw: string) =>
    setRecent((prev) => {
      const next = prev.filter((x) => x !== kw);
      persistRecent(next);
      return next;
    });

  const clearRecent = () => {
    setRecent([]);
    persistRecent([]);
  };

  // 자동완성 결과 클릭 시에도 recent에 키워드 저장 (사용자는 enter 안 누르고 클릭)
  const goRestaurant = (id: string) => {
    submit(trimmed);
    router.push(`/restaurant/${id}` as any);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header — unified search bar */}
      <View style={styles.header}>
        <SearchBar
          variant="input"
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="식당명·메뉴·자치구"
          returnKeyType="search"
          onSubmitEditing={() => submit(query)}
          autoFocus
          accessibilityLabel="검색어 입력"
          style={{ flex: 1 }}
          trailing={
            query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="검색어 지우기" style={styles.clearBtn}>
                <Icon name="close" size={12} color={color.text.onBrand} />
              </Pressable>
            ) : null
          }
        />
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="검색 닫기">
          <Text style={styles.cancel}>취소</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}>
        {!index ? (
          <Text style={styles.loading}>인덱스 불러오는 중…</Text>
        ) : isTyping ? (
          <>
            {totalHits === 0 ? (
              <EmptyState
                mascot="empty"
                mascotSize="md"
                title="다른 키워드로 찾아봐요"
                body="식당명·메뉴·동네 이름으로 검색해 보세요"
                cta={{ label: '카테고리 탐색', onPress: () => setQuery(''), variant: 'secondary' }}
              />
            ) : (
              <>
                {restaurantHits.length > 0 ? (
                  <View style={styles.group}>
                    <Text style={styles.groupTitle}>식당</Text>
                    {restaurantHits.map((r) => (
                      <Pressable
                        key={r.i}
                        onPress={() => goRestaurant(r.i)}
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.suggestRow, pressed && { backgroundColor: color.fill.tertiary }]}>
                        <Icon name="search" size={14} color={color.text.tertiary} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestName}>{highlight(r.n, trimmed)}</Text>
                          <Text style={styles.suggestMeta}>{r.g} · {r.c}{r.s > 0 ? ` · ${r.s}점` : ''}</Text>
                        </View>
                        {gradeCheese(r.gr)}
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {districtHits.length > 0 ? (
                  <View style={styles.group}>
                    <Text style={styles.groupTitle}>자치구</Text>
                    <View style={styles.chipsRow}>
                      {districtHits.map((d) => (
                        <Chip key={d} variant="recent" size="sm" onPress={() => setQuery(d)} leftIcon="location">
                          {d}
                        </Chip>
                      ))}
                    </View>
                  </View>
                ) : null}

                {categoryHits.length > 0 ? (
                  <View style={styles.group}>
                    <Text style={styles.groupTitle}>카테고리</Text>
                    <View style={styles.chipsRow}>
                      {categoryHits.map((c) => (
                        <Chip key={c} variant="recent" size="sm" onPress={() => setQuery(c)}>
                          {c}
                        </Chip>
                      ))}
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </>
        ) : (
          <>
            {/* 1. 카테고리 — 상단 가로 스크롤 (지도 탭과 동일) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catRow}
              style={styles.catScroll}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setQuery(c)}
                  accessibilityRole="button"
                  accessibilityLabel={`${c} 카테고리`}
                  style={({ pressed }) => [styles.catChip, pressed && { opacity: 0.85 }]}>
                  <Text style={styles.catChipText}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* 2. 최근 검색 */}
            <SectionHeader
              title="최근 검색"
              trailing={recent.length > 0 ? { label: '전체 삭제', onPress: clearRecent } : undefined}
              marginTop="l"
              marginBottom="s"
            />
            {recent.length > 0 ? (
              <View style={styles.chipsRow}>
                {recent.map((kw) => (
                  <Chip
                    key={kw}
                    variant="recent"
                    size="sm"
                    onPress={() => setQuery(kw)}
                    onRemove={() => removeRecent(kw)}>
                    {kw}
                  </Chip>
                ))}
              </View>
            ) : (
              <EmptyState mascot="search" mascotSize="sm" title="검색하면 여기에 기록이 쌓여요" paddingY="l" />
            )}

            {/* 3. 인기 검색어 */}
            <SectionHeader
              title="인기 검색어"
              subtitle="오늘 12:00 기준"
              marginTop="xl"
              marginBottom="s"
            />
            <View>
              {POPULAR.map((p, i) => (
                <Pressable
                  key={p.kw}
                  onPress={() => setQuery(p.kw)}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.kw} 검색`}
                  style={({ pressed }) => [styles.popularRow, pressed && { backgroundColor: color.fill.tertiary }]}>
                  <Text style={[styles.popularRank, i < 3 && { color: color.brand.primary }]}>
                    {i + 1}
                  </Text>
                  <Text style={styles.popularText}>{p.kw}</Text>
                  <TrendArrow trend={p.trend} />
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

function TrendArrow({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'flat') {
    return <Text style={[styles.trendText, { color: color.text.tertiary }]}>—</Text>;
  }
  return (
    <Text style={[styles.trendText, { color: trend === 'up' ? color.status.danger : color.status.info }]}>
      {trend === 'up' ? '▲' : '▼'}
    </Text>
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
      <Text style={{ color: color.brand.primary, fontWeight: '700' }}>
        {text.slice(idx, idx + term.length)}
      </Text>
      {text.slice(idx + term.length)}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    gap: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: color.border.default,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: color.fill.secondary,
    borderRadius: radius.l,
    paddingHorizontal: spacing.m,
    height: 48,
  },
  input: { flex: 1, ...typography.body, color: color.text.primary, paddingVertical: 0 },
  clearBtn: {
    width: 22, height: 22, borderRadius: radius.pill, backgroundColor: color.text.tertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  cancel: { ...typography.bodyEmphasized, color: color.text.primary },

  scrollContent: { paddingHorizontal: spacing.l, paddingTop: spacing.l },

  loading: { ...typography.caption, color: color.text.tertiary, paddingVertical: spacing.xxl, textAlign: 'center' },

  group: { marginBottom: spacing.xl },
  groupTitle: { ...typography.captionEmphasized, color: color.text.secondary, marginBottom: spacing.s },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },

  popularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: spacing.s + 2,
    minHeight: 36,
    borderRadius: radius.s,
  },
  popularRank: { ...typography.subheadlineEmphasized, color: color.text.secondary, width: 18 },
  popularText: { ...typography.subheadline, color: color.text.primary, flex: 1 },
  trendText: { ...typography.caption },

  // 카테고리 가로 스크롤 칩 (지도 탭과 동일 스타일)
  catScroll: { marginHorizontal: -spacing.l, flexGrow: 0 },
  catRow: { gap: spacing.xs, paddingHorizontal: spacing.l, alignItems: 'center' },
  catChip: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: color.surface.subtle,
    borderWidth: 1,
    borderColor: color.border.default,
  },
  catChipText: { ...typography.caption, color: color.text.secondary, fontWeight: '600' },

  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: spacing.m,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: color.border.default,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.s,
  },
  suggestName: { ...typography.body, color: color.text.primary },
  suggestMeta: { ...typography.footnote, color: color.text.tertiary, marginTop: spacing.xxs },
  suggestCheese: { width: 28, height: 28 },
});
