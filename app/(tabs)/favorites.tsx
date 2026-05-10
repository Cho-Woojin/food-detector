import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Cheese } from '@/constants/Assets';
import { color, radius, spacing, typography } from '@/constants/tokens';
import { AnimatedHeart, AppHeader, Chip, EmptyState, IconButton, Screen } from '@/components/ui';
// Chip is still used in the filter row above the list.
import type { Restaurant as RawRestaurant } from '@/constants/Restaurant';
import { ensureRawById, ensureRecomputedIndex } from '@/utils/dataStore';
import { toggleLike as toggleLikeStore, useLikedIds } from '@/utils/favorites';
import { adjustedScoreAndGrade, useReviewImpactMap } from '@/utils/reviews';
import { useOwnerScoreMap } from '@/utils/owner';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

type Grade = 'GOLDEN' | 'SILVER' | 'BRONZE' | 'ROTTEN';
type Favorite = {
  id: string;
  name: string;
  category: string;
  grade: Grade;
  score: number;
  distance: string;
  district: string;
};

const FILTERS = ['전체', 'GOLDEN', 'SILVER', 'BRONZE', 'ROTTEN'] as const;
type Filter = (typeof FILTERS)[number];
type SortKey = 'score' | 'recent' | 'name';

const FILTER_LABEL: Record<Filter, string> = {
  전체: '전체',
  GOLDEN: '골드',
  SILVER: '실버',
  BRONZE: '브론즈',
  ROTTEN: '썩은',
};

const SORT_LABEL: Record<SortKey, string> = {
  score: '점수순',
  recent: '최근순',
  name: '이름순',
};

const GRADE_LABEL: Record<Grade, string> = {
  GOLDEN: '골드 치즈',
  SILVER: '실버 치즈',
  BRONZE: '브론즈 치즈',
  ROTTEN: '썩은 치즈',
};

const CHEESE_BY_GRADE = (g: Grade) =>
  g === 'GOLDEN' ? Cheese.gold
    : g === 'SILVER' ? Cheese.silver
    : g === 'BRONZE' ? Cheese.bronze
    : null;

export default function FavoritesScreen() {
  const [filter, setFilter] = useState<Filter>('전체');
  const [sort, setSort] = useState<SortKey>('score');
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [rawMap, setRawMap] = useState<Map<string, RawRestaurant> | null>(null);
  const likedIds = useLikedIds();
  const impactMap = useReviewImpactMap();
  const ownerScoreMap = useOwnerScoreMap();

  // 좋아요한 ID들의 메타정보를 인덱스에서 조회 (G/S/B만 좋아요 카드로 표시)
  // raw 데이터도 같이 캐싱 → 상세 페이지와 동일한 5축 axes 산식 사용
  useEffect(() => {
    let cancelled = false;
    Promise.all([ensureRecomputedIndex(), ensureRawById()]).then(([rows, raw]) => {
      if (cancelled) return;
      const list: Favorite[] = rows
        .filter((r) => likedIds.has(r.i))
        .map((r) => ({
          id: r.i,
          name: r.n,
          category: r.c,
          grade: r.gr,
          score: r.s,
          distance: '—',
          district: r.g,
        }));
      setFavorites(list);
      setRawMap(raw);
    });
    return () => {
      cancelled = true;
    };
  }, [likedIds]);

  // 위생 리뷰 + 사장님 인증 보정 — 상세/지도와 동일한 종합 점수 산식 사용
  const adjusted = useMemo(() => {
    if (!rawMap) return favorites;
    return favorites.map((f) => {
      const raw = rawMap.get(f.id);
      if (!raw) return f;
      const impact = impactMap.get(f.id);
      const ownerScore = ownerScoreMap.get(f.id) ?? 0;
      if ((!impact || impact.reviewCount === 0) && ownerScore === 0) return f;
      const { score, grade } = adjustedScoreAndGrade(
        raw,
        impact ?? { userScore: 0, reviewCount: 0, rawAvg: 0, foreignReports: 0, foreignTotal: 0 },
        ownerScore,
      );
      return { ...f, score, grade };
    });
  }, [favorites, impactMap, ownerScoreMap, rawMap]);

  const filtered = useMemo(() => {
    let list = filter === '전체' ? adjusted : adjusted.filter((f) => f.grade === filter);
    list = list.filter((f) => likedIds.has(f.id));
    if (sort === 'score') list = [...list].sort((a, b) => b.score - a.score);
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    return list;
  }, [adjusted, filter, sort, likedIds]);

  const totalCount = adjusted.filter((f) => likedIds.has(f.id)).length;
  const allEmpty = totalCount === 0;
  const filterEmpty = !allEmpty && filtered.length === 0;

  const cycleSort = () => {
    const order: SortKey[] = ['score', 'recent', 'name'];
    const next = order[(order.indexOf(sort) + 1) % order.length];
    setSort(next);
  };

  const toggleLike = (id: string) => { toggleLikeStore(id); };

  return (
    <Screen variant="surface" edges={['top']} paddingHorizontal="none">
      <AppHeader
        title="좋아요한 식당"
        subtitle={`${totalCount}곳`}
        variant="large"
        leading="none"
        withSafeArea={false}
        trailing={
          <IconButton
            icon="search"
            size="md"
            accessibilityLabel="검색"
            onPress={() => router.push('/search')}
          />
        }
      />

      {/* Filter + sort row */}
      <View style={styles.controlBar}>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <Chip
              key={f}
              variant="filter"
              size="sm"
              selected={filter === f}
              onPress={() => setFilter(f)}
              accessibilityLabel={`${FILTER_LABEL[f]} 필터`}>
              {FILTER_LABEL[f]}
            </Chip>
          ))}
        </View>
        <Pressable
          onPress={cycleSort}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`정렬: ${SORT_LABEL[sort]}`}
          style={styles.sortBtn}>
          <Icon name="forward" size={12} color={color.text.secondary} />
          <Text style={styles.sortText}>{SORT_LABEL[sort]}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {filtered.map((item, i) => (
          <View key={item.id}>
            <RestaurantRow
              item={item}
              liked={likedIds.has(item.id)}
              onToggle={() => toggleLike(item.id)}
              onPress={() => router.push(`/restaurant/${item.id}` as any)}
            />
            {i < filtered.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}

        {allEmpty ? (
          <EmptyState
            mascot="search"
            mascotSize="lg"
            title="아직 좋아요한 식당이 없어요"
            body="식당 상세에서 하트를 눌러 모아보세요"
            cta={{ label: '식당 둘러보기', onPress: () => router.push('/search'), variant: 'primary' }}
          />
        ) : filterEmpty ? (
          <EmptyState
            mascot="empty"
            mascotSize="md"
            title="이 등급엔 좋아요가 없어요"
            body="다른 등급으로 골라봐요"
            cta={{ label: '전체 보기', onPress: () => setFilter('전체') }}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function RestaurantRow({
  item,
  liked,
  onPress,
  onToggle,
}: {
  item: Favorite;
  liked: boolean;
  onPress: () => void;
  onToggle: () => void;
}) {
  const cheeseFg = color.cheese[item.grade].fg;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} 상세 보기`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.fill.quaternary }]}>
      {/* Thumbnail */}
      <View style={styles.thumb}>
        {CHEESE_BY_GRADE(item.grade) ? (
          <Image
            source={CHEESE_BY_GRADE(item.grade)!}
            style={styles.thumbImg}
            resizeMode="contain"
          />
        ) : (
          <Icon name="warning" size={32} color={color.cheese.ROTTEN.fg} />
        )}
      </View>

      {/* Info column */}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <AnimatedHeart active={liked} size={20} hitSize={32} onPress={onToggle} />
        </View>

        <View style={styles.scoreRow}>
          <Text style={[styles.score, { color: cheeseFg }]}>{item.score}점</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={[styles.gradeLabel, { color: cheeseFg }]}>{GRADE_LABEL[item.grade]}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.category}>{item.category}</Text>
        </View>

        <View style={styles.metaRow}>
          <Icon name="location" size={11} color={color.text.tertiary} />
          <Text style={styles.metaText}>{item.district}</Text>
          {item.distance !== '—' ? (
            <>
              <Text style={styles.dotSmall}>·</Text>
              <Text style={styles.metaText}>{item.distance}</Text>
            </>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingTop: spacing.s,
    paddingBottom: spacing.m,
    gap: spacing.s,
  },
  filterRow: { flexDirection: 'row', gap: spacing.s, flex: 1, flexWrap: 'wrap' },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.pill,
    backgroundColor: color.fill.tertiary,
  },
  sortText: { ...typography.captionEmphasized, color: color.text.secondary },

  scrollContent: { paddingTop: spacing.xs, paddingBottom: spacing.xxl },

  // List row (no card, no shadow)
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.m,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.l,
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: radius.m,
    backgroundColor: color.fill.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: { width: 56, height: 56 },

  info: { flex: 1, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  name: { ...typography.bodyEmphasized, color: color.text.primary, flex: 1 },

  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  score: { ...typography.subheadlineEmphasized },
  gradeLabel: { ...typography.captionEmphasized },
  dot: { ...typography.caption, color: color.text.tertiary },
  category: { ...typography.caption, color: color.text.secondary },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: spacing.xxs },
  metaText: { ...typography.footnote, color: color.text.tertiary },
  dotSmall: { ...typography.footnote, color: color.text.tertiary, marginHorizontal: spacing.xxs },

  divider: {
    height: 1,
    backgroundColor: color.border.default,
    marginHorizontal: spacing.l,
  },
});
