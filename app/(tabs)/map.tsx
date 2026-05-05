// app/(tabs)/map.tsx — SCR-06 지도
import { Icon } from '@/components/Icon';
import KakaoMap, { KakaoMapHandle } from '@/components/KakaoMap';
import { Cheese } from '@/constants/Assets';
import { palette } from '@/constants/Colors';
import { GuKey, Restaurant } from '@/constants/Restaurant';
import { loadRestaurantsByGu } from '@/utils/loadData';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const SEOUL_CENTER = { lat: 37.5663, lng: 126.978 };
const ALL_GUS: GuKey[] = ['종로구', '강남구', '마포구'];

export default function MapScreen() {
  const router = useRouter();
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
        const merged = all
          .flat()
          .filter((r) => r.lat && r.lng)
          .filter((r) => r.grade === 'GOLDEN' || r.grade === 'SILVER' || r.grade === 'BRONZE');
        setRestaurants(merged);
      } catch (e) {
        console.error('데이터 로드 실패:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        console.error('위치 조회 실패:', err);
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
              zoom={5}
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
        <View style={styles.searchBar}>
          <Icon name="search" size={14} color={palette.text2} />
          <Text style={styles.searchText}>이 지역에서 검색</Text>
        </View>

        {/* 우측 컨트롤 버튼 (오버레이) */}
        <View style={styles.controls}>
          <Pressable
            onPress={handleLocate}
            style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}>
            <Icon name="location" size={18} color={palette.text1} />
          </Pressable>
          <View style={styles.zoomGroup}>
            <Pressable
              onPress={() => mapHandleRef.current?.zoomIn()}
              style={({ pressed }) => [styles.zoomBtn, pressed && styles.ctrlBtnPressed]}>
              <Text style={styles.zoomText}>+</Text>
            </Pressable>
            <View style={styles.zoomDivider} />
            <Pressable
              onPress={() => mapHandleRef.current?.zoomOut()}
              style={({ pressed }) => [styles.zoomBtn, pressed && styles.ctrlBtnPressed]}>
              <Text style={styles.zoomText}>−</Text>
            </Pressable>
          </View>
        </View>

        {/* 선택된 식당 카드 */}
        {selected && (
          <Pressable
            onPress={goDetail}
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
              <Text style={styles.selectedScore}>
                {selected.score}점 · {gradeLabel(selected.grade)}
              </Text>
            </View>
            <Icon name="forward" size={18} color={palette.text3} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bgCard, alignItems: 'center' },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    backgroundColor: palette.bg,
    position: 'relative',
  },

  mapBox: { flex: 1, backgroundColor: palette.bgCard },
  mobileFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  mobileFallbackTitle: { fontSize: 16, fontWeight: '700', color: palette.text1, marginBottom: 4 },
  mobileFallbackSub: { fontSize: 12, color: palette.text2 },

  // 상단 검색바 (오버레이)
  searchBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.border,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  searchText: { fontSize: 13, color: palette.text2 },

  // 우측 컨트롤
  controls: {
    position: 'absolute',
    right: 12,
    bottom: 96,
    gap: 10,
    alignItems: 'center',
  },
  ctrlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.1)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
  ctrlBtnPressed: { opacity: 0.7 },
  zoomGroup: {
    backgroundColor: palette.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.1)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
  zoomBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: { fontSize: 22, fontWeight: '600', color: palette.text1, lineHeight: 24 },
  zoomDivider: { height: 1, backgroundColor: palette.border },

  // 선택 카드
  selectedCard: {
    position: 'absolute',
    bottom: 16,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.1)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 6,
      },
    }),
  },
  selectedImageBox: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 12,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: palette.bgCard,
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
  selectedName: { fontSize: 14, fontWeight: '700', color: palette.text1, marginBottom: 2 },
  selectedMeta: { fontSize: 11, color: palette.text2, marginBottom: 2 },
  selectedScore: { fontSize: 12, fontWeight: '600', color: palette.primaryGreen },
});
