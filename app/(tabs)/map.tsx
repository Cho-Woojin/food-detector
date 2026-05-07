// app/(tabs)/map.tsx — SCR-06 지도
import { Icon } from '@/components/Icon';
import KakaoMap, { KakaoMapHandle } from '@/components/KakaoMap';
import { RestaurantBottomSheet } from '@/components/RestaurantBottomSheet';
import { Cheese } from '@/constants/Assets';
import { SearchBar } from '@/components/ui';
import { color, elevation, radius, spacing, typography } from '@/constants/tokens';
import { CategoryKey, GuKey, Restaurant } from '@/constants/Restaurant';
import { loadRestaurantsByGu } from '@/utils/loadData';
import { useLikedIds } from '@/utils/favorites';
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
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [center, setCenter] = useState(SEOUL_CENTER);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey | 'ALL'>('ALL');
  const [mapType, setMapType] = useState<'ROADMAP' | 'SKYVIEW'>('ROADMAP');
  const [mapMoved, setMapMoved] = useState(false);
  const likedIds = useLikedIds();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await Promise.all(ALL_GUS.map((g) => loadRestaurantsByGu(g)));
        if (cancelled) return;
        // 좌표 있는 식당만 + 5축 기반 재계산 점수/등급 적용
        // score/grade는 빌드타임에 사전 계산된 값을 그대로 사용 (recomputeFromRaw 제거 — 첫 진입 -2~3초)
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

  // 카테고리 필터 적용된 결과
  const visible = useMemo(() => {
    if (categoryFilter === 'ALL') return restaurants;
    return restaurants.filter((r) => r.cat === categoryFilter);
  }, [restaurants, categoryFilter]);

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
    if (!targetId || restaurants.length === 0) return;
    const target = restaurants.find((r) => r.id === targetId);
    if (target) {
      setSelected(target);
      setCenter({ lat: target.lat, lng: target.lng });
      // 필터로 가려져 있으면 전체로 풀어준다
      if (categoryFilter !== 'ALL' && target.cat !== categoryFilter) setCategoryFilter('ALL');
    }
  }, [targetId, restaurants]);

  const handleLocate = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      alert('현위치 기능을 사용할 수 없습니다');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(next);
        mapHandleRef.current?.panTo(next.lat, next.lng);
        mapHandleRef.current?.setLevel(4);
      },
      (err) => {
        if (__DEV__) console.error('위치 조회 실패:', err);
        alert('위치 권한을 허용해주세요');
      }
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
    setSelected(r);
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
              mapType={mapType}
              likedIds={likedIds}
              forcedVisibleIds={forcedVisibleIds}
              onMapMoved={() => setMapMoved(true)}
              centerLat={center.lat}
              centerLng={center.lng}
              zoom={targetId ? 3 : 5}
              selectedId={targetId ?? selected?.id ?? null}
              onMarkerClick={(r) => {
                // 다른 마커 클릭 시 시트가 한 번 내려갔다 다시 올라오도록 잠깐 닫고 재오픈
                if (selected && selected.id !== r.id) {
                  setSelected(null);
                  setTimeout(() => setSelected(r), 260);
                } else {
                  setSelected(r);
                }
              }}
              onMapDismiss={() => setSelected(null)}
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
                    {r.score}점
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
        </View>

        {/* 우측 컨트롤 버튼 (오버레이) */}
        <View style={styles.controls}>
          <Pressable
            onPress={() => setMapType(mapType === 'ROADMAP' ? 'SKYVIEW' : 'ROADMAP')}
            accessibilityRole="button"
            accessibilityLabel={mapType === 'ROADMAP' ? '위성지도 보기' : '일반지도 보기'}
            style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}>
            <Text style={styles.mapTypeText}>{mapType === 'ROADMAP' ? '위성' : '일반'}</Text>
          </Pressable>
          <Pressable
            onPress={handleLocate}
            accessibilityRole="button"
            accessibilityLabel="현위치 이동"
            style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}>
            <Icon name="location" size={18} color={color.text.primary} />
          </Pressable>
          <View style={styles.zoomGroup}>
            <Pressable
              onPress={() => mapHandleRef.current?.zoomIn()}
              accessibilityRole="button"
              accessibilityLabel="확대"
              style={({ pressed }) => [styles.zoomBtn, pressed && styles.ctrlBtnPressed]}>
              <Text style={styles.zoomText}>+</Text>
            </Pressable>
            <View style={styles.zoomDivider} />
            <Pressable
              onPress={() => mapHandleRef.current?.zoomOut()}
              accessibilityRole="button"
              accessibilityLabel="축소"
              style={({ pressed }) => [styles.zoomBtn, pressed && styles.ctrlBtnPressed]}>
              <Text style={styles.zoomText}>−</Text>
            </Pressable>
          </View>
        </View>

        {/* "이 지역에서 검색" 버튼 — 사용자가 지도를 이동·줌하면 등장 */}
        {mapMoved && (
          <Pressable
            onPress={() => {
              mapHandleRef.current?.searchThisArea();
              setMapMoved(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="이 지역에서 검색"
            style={({ pressed }) => [styles.researchBtn, pressed && { opacity: 0.85 }]}>
            <Icon name="search" size={14} color={color.surface.subtle} />
            <Text style={styles.researchBtnText}>이 지역에서 검색</Text>
          </Pressable>
        )}

        {/* 마커 클릭 시 노출되는 바텀시트 — 요약(collapsed) ↔ 결과 카드(expanded) */}
        <RestaurantBottomSheet
          restaurant={selected}
          onClose={() => setSelected(null)}
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

  // 우측 컨트롤
  controls: {
    position: 'absolute',
    right: spacing.m,
    bottom: 96,
    gap: spacing.s + 2,
    alignItems: 'center',
  },
  ctrlBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: color.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.border.default,
    ...(elevation.raised as ViewStyle),
  },
  ctrlBtnPressed: { opacity: 0.7 },
  zoomGroup: {
    backgroundColor: color.surface.subtle,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: color.border.default,
    overflow: 'hidden',
    ...(elevation.raised as ViewStyle),
  },
  zoomBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: { ...typography.title, fontSize: 22, lineHeight: 24, color: color.text.primary },
  mapTypeText: { ...typography.captionEmphasized, color: color.text.primary },

  // "이 지역에서 검색" 떠있는 버튼 (지도 상단 가운데)
  researchBtn: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: color.brand.primary,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.pill,
    ...(elevation.raised as ViewStyle),
  },
  researchBtnText: { ...typography.captionEmphasized, color: color.surface.subtle },
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
