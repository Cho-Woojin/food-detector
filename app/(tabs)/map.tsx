// app/(tabs)/map.tsx — SCR-06 지도
import { Icon } from '@/components/Icon';
import KakaoMap, { KakaoMapHandle } from '@/components/KakaoMap';
import { Cheese } from '@/constants/Assets';
import { SearchBar } from '@/components/ui';
import { color, elevation, radius, spacing, typography } from '@/constants/tokens';
import { GuKey, Restaurant } from '@/constants/Restaurant';
import { loadRestaurantsByGu } from '@/utils/loadData';
import { recomputeFromRaw } from '@/utils/adapter';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

const SEOUL_CENTER = { lat: 37.5663, lng: 126.978 };
const ALL_GUS: GuKey[] = ['종로구', '강남구', '마포구'];

export default function MapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const targetId = typeof params.id === 'string' ? params.id : undefined;
  const mapHandleRef = useRef<KakaoMapHandle>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [center, setCenter] = useState(SEOUL_CENTER);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await Promise.all(ALL_GUS.map((g) => loadRestaurantsByGu(g)));
        if (cancelled) return;
        // 좌표 있는 식당만 + 5축 기반 재계산 점수/등급 적용
        // (raw JSON의 grade/score는 신뢰할 수 없어 일관성 위해 재계산)
        const merged = all
          .flat()
          .filter((r) => r.lat && r.lng)
          .map((r) => {
            const { score, grade } = recomputeFromRaw(r);
            return { ...r, score, grade };
          })
          .filter((r) => r.grade === 'GOLDEN' || r.grade === 'SILVER' || r.grade === 'BRONZE');
        setRestaurants(merged);
      } catch (e) {
        if (__DEV__) console.error('데이터 로드 실패:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 식당 상세 → 지도 보기로 진입 시 해당 식당으로 자동 이동 + 선택
  useEffect(() => {
    if (!targetId || restaurants.length === 0) return;
    const target = restaurants.find((r) => r.id === targetId);
    if (target) {
      setSelected(target);
      setCenter({ lat: target.lat, lng: target.lng });
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

  const cheeseFor = (g: string) =>
    g === 'GOLDEN' ? Cheese.gold : g === 'SILVER' ? Cheese.silver : Cheese.bronze;

  const gradeLabel = (g: string) =>
    g === 'GOLDEN' ? '골든 치즈' : g === 'SILVER' ? '실버 치즈' : g === 'BRONZE' ? '브론즈 치즈' : g;

  const cheeseFg = (g: string) =>
    g === 'GOLDEN' ? color.cheese.GOLDEN.fg
      : g === 'SILVER' ? color.cheese.SILVER.fg
      : color.cheese.BRONZE.fg;

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        {/* 지도 (전체 영역) */}
        <View style={styles.mapBox}>
          {Platform.OS === 'web' ? (
            <KakaoMap
              ref={mapHandleRef}
              restaurants={restaurants}
              centerLat={center.lat}
              centerLng={center.lng}
              zoom={targetId ? 3 : 5}
              selectedId={targetId ?? selected?.id ?? null}
              onMarkerClick={setSelected}
            />
          ) : (
            <View style={styles.mobileFallback}>
              <Text style={styles.mobileFallbackTitle}>지도는 웹에서 사용 가능해요</Text>
              <Text style={styles.mobileFallbackSub}>
                {restaurants.length.toLocaleString()}곳 분석 완료
              </Text>
            </View>
          )}
        </View>

        {/* 상단 검색바 (오버레이) */}
        <View style={styles.searchOverlay}>
          <SearchBar
            variant="button"
            placeholder="이 지역에서 검색"
            onPress={() => router.push('/search')}
          />
        </View>

        {/* 우측 컨트롤 버튼 (오버레이) */}
        <View style={styles.controls}>
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

        {/* 선택된 식당 카드 */}
        {selected && (
          <Pressable
            onPress={goDetail}
            accessibilityRole="button"
            accessibilityLabel={`${selected.name} 상세 보기`}
            style={({ pressed }) => [styles.selectedCard, pressed && { opacity: 0.95 }]}>
            <View style={styles.selectedImageBox}>
              <Image source={{ uri: selected.img }} style={styles.selectedImage} resizeMode="cover" />
              <View style={styles.selectedCheeseBadge}>
                <Image
                  source={cheeseFor(selected.grade)}
                  style={styles.selectedCheeseImg}
                  resizeMode="contain"
                />
              </View>
            </View>
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedName} numberOfLines={1}>
                {selected.name}
              </Text>
              <Text style={styles.selectedMeta} numberOfLines={1}>
                {selected.cat} · {selected.gu}
              </Text>
              <Text style={[styles.selectedScore, { color: cheeseFg(selected.grade) }]}>
                {selected.score}점 · {gradeLabel(selected.grade)}
              </Text>
            </View>
            <Icon name="forward" size={18} color={color.text.tertiary} />
          </Pressable>
        )}
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
    ...(elevation.subtle as ViewStyle),
  },
  ctrlBtnPressed: { opacity: 0.7 },
  zoomGroup: {
    backgroundColor: color.surface.subtle,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: color.border.default,
    overflow: 'hidden',
    ...(elevation.subtle as ViewStyle),
  },
  zoomBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: { ...typography.title, fontSize: 22, lineHeight: 24, color: color.text.primary },
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
