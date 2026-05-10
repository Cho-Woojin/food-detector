// app/(tabs)/map.tsx — SCR-06 지도
import { Icon } from '@/components/Icon';
import KakaoMap, { KakaoMapHandle } from '@/components/KakaoMap';
import { RestaurantBottomSheet } from '@/components/RestaurantBottomSheet';
import { Cheese } from '@/constants/Assets';
import { SearchBar } from '@/components/ui';
import { color, elevation, radius, spacing, typography } from '@/constants/tokens';
import { CategoryKey, GuKey, Restaurant } from '@/constants/Restaurant';
import type { Grade } from '@/constants/MockData';
import { loadRestaurantsByGu } from '@/utils/loadData';
import { useLikedIds } from '@/utils/favorites';
import { getCachedLocation } from '@/utils/location';
import { adjustedScoreAndGrade, EMPTY_REVIEW_IMPACT, useReviewImpactMap } from '@/utils/reviews';
import { useOwnerImpactMap } from '@/utils/owner';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

const SEOUL_CENTER = { lat: 37.5663, lng: 126.978 };
const ALL_GUS: GuKey[] = [
  '종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구', '성북구',
  '강북구', '도봉구', '노원구', '은평구', '서대문구', '마포구', '양천구', '강서구',
  '구로구', '금천구', '영등포구', '동작구', '관악구', '서초구', '강남구', '송파구', '강동구',
];

// 지도 카테고리 필터 옵션
const CATEGORY_FILTERS: { key: CategoryKey | 'ALL'; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: '한식', label: '한식' },
  { key: '치킨', label: '치킨' },
  { key: '카페디저트', label: '카페·디저트' },
  { key: '일식', label: '일식' },
  { key: '중식', label: '중식' },
  { key: '양식', label: '양식' },
  { key: '분식', label: '분식' },
  { key: '고기', label: '고기' },
  { key: '술집', label: '술집' },
  { key: '찜탕', label: '찜·탕' },
  { key: '아시안', label: '아시안' },
  { key: '패스트푸드', label: '패스트푸드' },
  { key: '도시락', label: '도시락' },
  { key: '샌드위치', label: '샌드위치' },
  { key: '샐러드', label: '샐러드' },
  { key: '뷔페', label: '뷔페' },
];

export default function MapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const targetId = typeof params.id === 'string' ? params.id : undefined;
  const mapHandleRef = useRef<KakaoMapHandle>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  // 선택된 마커는 id로만 보관 — 리뷰 보정으로 식당 객체가 새로 생성되어도
  // 바텀시트가 항상 최신 score/grade를 반영하도록 selected는 adjustedRestaurants에서 derive
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 진입 시 캐시된 사용자 위치(있으면) 기준, 없으면 서울 중심
  const [center, setCenter] = useState(() => {
    const cached = getCachedLocation();
    return cached ? { lat: cached.lat, lng: cached.lng } : SEOUL_CENTER;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey | 'ALL'>('ALL');
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const likedIds = useLikedIds();

  // 사용자 위치 실시간 추적 — 권한 허용된 경우 watchPosition으로 갱신
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLoc({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => { /* 권한 거부 시 silently 무시 */ },
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 8000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await Promise.all(ALL_GUS.map((g) => loadRestaurantsByGu(g)));
        if (cancelled) return;
        // 좌표 있는 식당만. score는 사전 계산값, grade는 loadData.adapt에서
        // deriveGrade(score)로 정규화돼 도착 — 모든 화면이 같은 임계값을 공유.
        const merged = all.flat().filter((r) => r.lat && r.lng && r.grade);
        setRestaurants(merged);
      } catch (e) {
        if (__DEV__) console.error('데이터 로드 실패:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const impactMap = useReviewImpactMap();
  const ownerImpactMap = useOwnerImpactMap();

  // 위생 리뷰 + 사장님 게시글 보정 — 점수/등급을 동기화해서 마커 색상·검색 결과 점수가 일치
  // 둘 중 하나라도 영향이 있으면 재계산. r 객체는 변경된 식당만 새로 만들어 메모 효율 유지.
  const adjustedRestaurants = useMemo(() => {
    if (impactMap.size === 0 && ownerImpactMap.size === 0) return restaurants;
    return restaurants.map((r) => {
      const impact = impactMap.get(r.id);
      const owner = ownerImpactMap.get(r.id);
      if (!impact && !owner) return r;
      const reviewImp = impact ?? EMPTY_REVIEW_IMPACT;
      const ownerDelta = owner?.delta ?? 0;
      const { score, grade } = adjustedScoreAndGrade(r, reviewImp, ownerDelta);
      return { ...r, score, grade } as Restaurant;
    });
  }, [restaurants, impactMap, ownerImpactMap]);

  // 카테고리 필터 적용된 결과
  const visible = useMemo(() => {
    if (categoryFilter === 'ALL') return adjustedRestaurants;
    return adjustedRestaurants.filter((r) => r.cat === categoryFilter);
  }, [adjustedRestaurants, categoryFilter]);

  // selected 객체는 매 렌더마다 adjustedRestaurants에서 lookup — 리뷰 보정 즉시 반영
  const selected = useMemo<Restaurant | null>(() => {
    if (!selectedId) return null;
    return adjustedRestaurants.find((r) => r.id === selectedId) ?? null;
  }, [selectedId, adjustedRestaurants]);

  // 검색 매칭된 마커 — 줌/등급 무관 강제 표시 (수집중 마커도 검색 시 노출)
  const forcedVisibleIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return undefined;
    const set = new Set<string>();
    for (const r of visible) {
      if (`${r.name} ${r.cat}`.toLowerCase().includes(q)) set.add(r.id);
    }
    return set;
  }, [searchQuery, visible]);

  // 식당 상세 → 지도 보기로 진입 시 해당 식당으로 자동 이동 + 선택
  useEffect(() => {
    if (!targetId || adjustedRestaurants.length === 0) return;
    const target = adjustedRestaurants.find((r) => r.id === targetId);
    if (target) {
      setSelectedId(target.id);
      setCenter({ lat: target.lat, lng: target.lng });
      // 필터로 가려져 있으면 전체로 풀어준다
      if (categoryFilter !== 'ALL' && target.cat !== categoryFilter) setCategoryFilter('ALL');
    }
  }, [targetId, adjustedRestaurants]);

  const handleLocate = () => {
    // 1) 이미 watchPosition으로 userLoc 있으면 즉시 거기로 이동 (가장 빠름)
    if (userLoc) {
      mapHandleRef.current?.setLevel(4);
      mapHandleRef.current?.panTo(userLoc.lat, userLoc.lng);
      setCenter({ lat: userLoc.lat, lng: userLoc.lng });
      return;
    }
    // 2) 캐시된 위치라도 있으면 사용
    const cached = getCachedLocation();
    if (cached) {
      mapHandleRef.current?.setLevel(4);
      mapHandleRef.current?.panTo(cached.lat, cached.lng);
      setCenter({ lat: cached.lat, lng: cached.lng });
      return;
    }
    // 3) 둘 다 없으면 권한 요청
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      alert('현위치 기능을 사용할 수 없습니다');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const accuracy = pos.coords.accuracy;
        setUserLoc({ lat: next.lat, lng: next.lng, accuracy });
        setCenter(next);
        mapHandleRef.current?.setLevel(4);
        mapHandleRef.current?.panTo(next.lat, next.lng);
      },
      () => alert('위치 권한을 허용해주세요'),
    );
  };

  const goDetail = () => {
    if (selected) router.push(`/restaurant/${selected.id}` as any);
  };

  // 지도 전용 검색 — 이름/카테고리 매칭, 점수 높은 순. 메인 검색과 달리 '이 지도 안의 식당'만.
  const searchHits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const out: Restaurant[] = [];
    for (const r of visible) {
      if (out.length >= 6) break;
      const haystack = `${r.name} ${r.cat}`.toLowerCase();
      if (haystack.includes(q)) out.push(r);
    }
    return out.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [searchQuery, visible]);

  const pickSearchResult = (r: Restaurant) => {
    setSelectedId(r.id);
    setCenter({ lat: r.lat, lng: r.lng });
    mapHandleRef.current?.panTo(r.lat, r.lng);
    mapHandleRef.current?.setLevel(3);
    setSearchQuery('');
  };

  const cheeseFor = (g: string) =>
    g === 'GOLDEN' ? Cheese.gold : g === 'SILVER' ? Cheese.silver : Cheese.bronze;

  const gradeLabel = (g: string) =>
    g === 'GOLDEN' ? '골든 치즈'
      : g === 'SILVER' ? '실버 치즈'
      : g === 'BRONZE' ? '브론즈 치즈'
      : g === 'ROTTEN' ? '트랩 치즈'
      : '데이터 수집중';

  const cheeseFg = (g: string) =>
    g === 'GOLDEN' ? color.cheese.GOLDEN.fg
      : g === 'SILVER' ? color.cheese.SILVER.fg
      : g === 'BRONZE' ? color.cheese.BRONZE.fg
      : '#8E8E93';

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        {/* 지도 (전체 영역) */}
        <View style={styles.mapBox}>
          {Platform.OS === 'web' ? (
            <KakaoMap
              ref={mapHandleRef}
              restaurants={visible}
              mapType="ROADMAP"
              likedIds={likedIds}
              forcedVisibleIds={forcedVisibleIds}
              userLocation={userLoc}
              centerLat={center.lat}
              centerLng={center.lng}
              zoom={targetId ? 3 : 5}
              selectedId={targetId ?? selectedId ?? null}
              onMarkerClick={(r) => {
                // 다른 마커 클릭 시 시트가 한 번 내려갔다 다시 올라오도록 잠깐 닫고 재오픈
                if (selectedId && selectedId !== r.id) {
                  setSelectedId(null);
                  setTimeout(() => setSelectedId(r.id), 260);
                } else {
                  setSelectedId(r.id);
                }
              }}
              onMapDismiss={() => setSelectedId(null)}
            />
          ) : (
            <View style={styles.mobileFallback}>
              <Text style={styles.mobileFallbackTitle}>지도는 웹에서 사용 가능해요</Text>
              <Text style={styles.mobileFallbackSub}>
                {visible.length.toLocaleString()}곳 분석 완료
              </Text>
            </View>
          )}
        </View>

        {/* 상단 검색바 (지도 전용 — 인라인 자동완성, 이 지도 안의 식당만 매칭) */}
        <View style={styles.searchOverlay}>
          <View style={styles.searchBarShadow}>
            <SearchBar
              variant="input"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="이 지도 안에서 식당 검색"
              returnKeyType="search"
              onSubmitEditing={() => searchHits[0] && pickSearchResult(searchHits[0])}
            />
          </View>
          {searchQuery.trim() && searchHits.length > 0 ? (
            <View style={styles.searchResults}>
              {searchHits.map((r, i) => (
                <Pressable
                  key={r.id}
                  onPress={() => pickSearchResult(r)}
                  style={({ pressed }) => [
                    styles.searchResultRow,
                    i < searchHits.length - 1 && styles.searchResultDivider,
                    pressed && { backgroundColor: color.fill.tertiary },
                  ]}>
                  <Image source={cheeseFor(r.grade)} style={styles.searchResultCheese} resizeMode="contain" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.searchResultName} numberOfLines={1}>{r.name}</Text>
                    <Text style={styles.searchResultMeta} numberOfLines={1}>
                      {r.cat} · {r.gu}
                    </Text>
                  </View>
                  <Text style={[styles.searchResultScore, { color: cheeseFg(r.grade) }]}>
                    {gradeLabel(r.grade)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : searchQuery.trim() ? (
            <View style={[styles.searchResults, styles.searchEmpty]}>
              <Text style={styles.searchEmptyText}>이 지도 안에서 매칭되는 식당이 없어요</Text>
            </View>
          ) : null}

          {/* 카테고리 필터 칩 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsScroll}>
            {CATEGORY_FILTERS.map((c) => {
              const active = categoryFilter === c.key;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setCategoryFilter(c.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.chip,
                    active && styles.chipActive,
                    pressed && { opacity: 0.85 },
                  ]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* 카테고리 칩 바로 아래 — 현위치 버튼 (과녁 아이콘, 초록 라인) */}
          <Pressable
            onPress={handleLocate}
            accessibilityRole="button"
            accessibilityLabel="현위치 이동"
            style={({ pressed }) => [styles.locateBtn, pressed && { opacity: 0.7 }]}>
            <Icon name="locate" size={20} color={color.brand.primary} />
          </Pressable>
        </View>


        {/* 마커는 매 지도 이동·줌마다 viewport 기준으로 자동 재계산 (별도 검색 버튼 불필요) */}

        {/* 마커 클릭 시 노출되는 바텀시트 — 요약(collapsed) ↔ 결과 카드(expanded) */}
        <RestaurantBottomSheet
          restaurant={selected}
          onClose={() => setSelectedId(null)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.canvas, alignItems: 'center' },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    backgroundColor: color.surface.subtle,
    position: 'relative',
  },

  mapBox: { flex: 1, backgroundColor: color.fill.tertiary },
  mobileFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl },
  mobileFallbackTitle: { ...typography.bodyEmphasized, color: color.text.primary, marginBottom: spacing.xs },
  mobileFallbackSub: { ...typography.caption, color: color.text.secondary },

  // 상단 검색바 (오버레이) — 위치만, 시각 스타일은 SearchBar 컴포넌트
  searchOverlay: {
    position: 'absolute',
    top: spacing.m,
    left: spacing.m,
    right: spacing.m,
  },
  searchBarShadow: {
    borderRadius: radius.l,
    ...(elevation.raised as ViewStyle),
  },
  searchResults: {
    marginTop: spacing.s,
    backgroundColor: color.surface.subtle,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: color.border.default,
    overflow: 'hidden',
    ...(elevation.raised as ViewStyle),
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s + 2,
  },
  searchResultDivider: {
    borderBottomWidth: 1,
    borderBottomColor: color.border.default,
  },
  searchResultCheese: { width: 28, height: 28 },
  searchResultName: { ...typography.subheadlineEmphasized, color: color.text.primary },
  searchResultMeta: { ...typography.footnote, color: color.text.secondary, marginTop: 2 },
  searchResultScore: { ...typography.captionEmphasized },
  searchEmpty: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.l,
    alignItems: 'center',
  },
  searchEmptyText: { ...typography.caption, color: color.text.tertiary },

  // 카테고리 필터 칩
  chipsScroll: { marginTop: spacing.s, flexGrow: 0 },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    paddingRight: spacing.m,
  },
  chip: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs + 2,
    marginRight: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: color.surface.subtle,
    borderWidth: 1,
    borderColor: color.border.default,
    flexShrink: 0,
    ...(elevation.raised as ViewStyle),
  },
  chipActive: {
    backgroundColor: color.brand.primary,
    borderColor: color.brand.primary,
  },
  chipText: { ...typography.caption, color: color.text.secondary },
  chipTextActive: { color: color.surface.subtle, fontWeight: '600' },

  // 카테고리 칩 아래 — 현위치 버튼 (테두리 없이 그림자, 심볼만 초록)
  locateBtn: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.s,
    ...(elevation.raised as ViewStyle),
  },

  zoomDivider: { height: 1, backgroundColor: color.border.default },

  // 선택 카드
  selectedCard: {
    position: 'absolute',
    bottom: spacing.l,
    left: spacing.m,
    right: spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surface.subtle,
    padding: spacing.m,
    borderRadius: radius.l,
    ...(elevation.card as ViewStyle),
  },
  selectedImageBox: {
    width: 56,
    height: 56,
    borderRadius: radius.m,
    marginRight: spacing.m,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: color.fill.tertiary,
  },
  selectedImage: { width: '100%', height: '100%' },
  selectedCheeseBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheeseImg: { width: 20, height: 20 },
  selectedInfo: { flex: 1 },
  selectedName: { ...typography.subheadlineEmphasized, color: color.text.primary, marginBottom: spacing.xxs },
  selectedMeta: { ...typography.footnote, color: color.text.secondary, marginBottom: spacing.xxs },
  selectedScore: { ...typography.captionEmphasized },
});
