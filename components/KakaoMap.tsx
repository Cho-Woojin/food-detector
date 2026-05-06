// components/KakaoMap.tsx
// 카카오맵 React 컴포넌트 (Web 환경 전용)

import { color, spacing, typography } from '@/constants/tokens';
import { Restaurant } from '@/constants/Restaurant';
import { loadKakaoMap } from '@/utils/kakaoMap';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

interface KakaoMapProps {
  restaurants: Restaurant[];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  selectedId?: string | null;
  onMarkerClick?: (restaurant: Restaurant) => void;
}

export type KakaoMapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  panTo: (lat: number, lng: number) => void;
  setLevel: (lv: number) => void;
};

// 등급별 단순 dot 마커: 식탐정 그린 농도 + 크기로 등급 표현
const GRADE_STYLE: Record<string, { color: string; size: number; border: number }> = {
  GOLDEN: { color: '#16A34A', size: 18, border: 2 },   // 진한 그린 — 최상위
  SILVER: { color: '#4ADE80', size: 14, border: 1.5 }, // 옅은 그린 — 중간
  BRONZE: { color: '#94A3B8', size: 12, border: 1.5 }, // 회색  — 하위
};
// 선택된 마커 강조 — 등급 색 그대로지만 크기 +50% + 두꺼운 흰 보더
const SELECTED_BOOST = 1.6;

/** 단순한 색상 dot SVG → data URL (서버에서도 안전) */
function dotMarkerSrc(fill: string, size: number, border: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - border}" fill="${fill}" stroke="white" stroke-width="${border}"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

type MarkerEntry = {
  id: string;
  marker: any;
  lat: number;
  lng: number;
  grade: string;
  visible: boolean;
  normalImage: any;
  highlightImage: any;
};

const KakaoMap = forwardRef<KakaoMapHandle, KakaoMapProps>(function KakaoMap(
  {
    restaurants,
    centerLat = 37.5735,
    centerLng = 126.9788,
    zoom = 4,
    selectedId,
    onMarkerClick,
  },
  ref
) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<MarkerEntry[]>([]);
  const selectedMarkerRef = useRef<MarkerEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 점수 내림차순 정렬 — 마커 생성·표시 우선순위
  const sortedRestaurants = useMemo(
    () => [...restaurants].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    [restaurants]
  );

  // 등급별 SVG 마커 (서버/클라 모두 안전)
  const markerSrc = useMemo<Record<string, string>>(() => {
    const make = (g: keyof typeof GRADE_STYLE) =>
      dotMarkerSrc(GRADE_STYLE[g].color, GRADE_STYLE[g].size, GRADE_STYLE[g].border);
    return { GOLDEN: make('GOLDEN'), SILVER: make('SILVER'), BRONZE: make('BRONZE') };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => {
        const map = mapInstanceRef.current;
        if (!map) return;
        map.setLevel(Math.max(1, map.getLevel() - 1));
      },
      zoomOut: () => {
        const map = mapInstanceRef.current;
        if (!map) return;
        map.setLevel(Math.min(14, map.getLevel() + 1));
      },
      panTo: (lat: number, lng: number) => {
        const w = window as any;
        const map = mapInstanceRef.current;
        if (!map || !w.kakao?.maps) return;
        map.panTo(new w.kakao.maps.LatLng(lat, lng));
      },
      setLevel: (lv: number) => {
        const map = mapInstanceRef.current;
        if (!map) return;
        map.setLevel(lv);
      },
    }),
    []
  );

  // 모바일·네이티브 환경에서는 Web only 안내
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          🗺️ 지도는 웹 브라우저에서 보실 수 있어요
        </Text>
      </View>
    );
  }
  
  // 카카오맵 초기화
  useEffect(() => {
    // 데이터 들어온 뒤 한 번만 init (빈 배열로 Map 중복 생성 방지)
    if (sortedRestaurants.length === 0) return;

    const initMap = async () => {
      try {
        setLoading(true);
        setError(null);

        const kakao = await loadKakaoMap();
        if (!mapRef.current) return;

        const map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(centerLat, centerLng),
          level: zoom,
        });
        mapInstanceRef.current = map;

        // ===== 마커 풀 생성 (한 번만) =====
        const entries: MarkerEntry[] = [];
        for (const rest of sortedRestaurants) {
          if (!rest.lat || !rest.lng) continue;
          const src = markerSrc[rest.grade];
          if (!src) continue;

          const baseSize = GRADE_STYLE[rest.grade]?.size ?? 12;
          const baseBorder = GRADE_STYLE[rest.grade]?.border ?? 1.5;
          const fill = GRADE_STYLE[rest.grade]?.color ?? '#94A3B8';

          const normalImage = new kakao.maps.MarkerImage(
            src,
            new kakao.maps.Size(baseSize, baseSize),
            { offset: new kakao.maps.Point(baseSize / 2, baseSize / 2) }
          );

          // 강조 이미지: 같은 색 + 1.6배 + 두꺼운 흰 보더
          const hSize = Math.round(baseSize * SELECTED_BOOST);
          const highlightImage = new kakao.maps.MarkerImage(
            dotMarkerSrc(fill, hSize, baseBorder + 1.5),
            new kakao.maps.Size(hSize, hSize),
            { offset: new kakao.maps.Point(hSize / 2, hSize / 2) }
          );

          const position = new kakao.maps.LatLng(rest.lat, rest.lng);
          const marker = new kakao.maps.Marker({
            position,
            image: normalImage,
            title: rest.name,
          });

          const entry: MarkerEntry = {
            id: rest.id,
            marker,
            lat: rest.lat,
            lng: rest.lng,
            grade: rest.grade,
            visible: false,
            normalImage,
            highlightImage,
          };

          // 클릭: 자동 줌인 + 강조 + 콜백
          kakao.maps.event.addListener(marker, 'click', () => {
            map.panTo(position);
            if (map.getLevel() > 3) map.setLevel(3);
            highlight(entry);
            onMarkerClick?.(rest);
          });

          entries.push(entry);
        }
        markersRef.current = entries;

        // ===== Viewport 기반 표시 (visible bounds 안의 마커만 setMap) =====
        const applyViewport = () => {
          const bounds = map.getBounds();
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          const south = sw.getLat(), west = sw.getLng();
          const north = ne.getLat(), east = ne.getLng();

          for (const e of entries) {
            const inView = e.lat >= south && e.lat <= north && e.lng >= west && e.lng <= east;
            if (inView && !e.visible) {
              e.marker.setMap(map);
              e.visible = true;
            } else if (!inView && e.visible) {
              e.marker.setMap(null);
              e.visible = false;
            }
          }
        };

        applyViewport();
        kakao.maps.event.addListener(map, 'idle', applyViewport);

        // 외부에서 selectedId가 들어왔다면 해당 마커 강조 + 이동
        if (selectedId) {
          const target = entries.find((e) => e.id === selectedId);
          if (target) {
            const pos = new kakao.maps.LatLng(target.lat, target.lng);
            map.panTo(pos);
            if (map.getLevel() > 3) map.setLevel(3);
            highlight(target);
          }
        }

        if (__DEV__) console.log(`[KakaoMap] ${entries.length}개 핀 생성 (viewport 렌더)`);
        setLoading(false);
      } catch (err: any) {
        if (__DEV__) console.error('[KakaoMap] 초기화 실패:', err);
        setError(err.message || '지도 로드 실패');
        setLoading(false);
      }
    };

    const highlight = (entry: MarkerEntry) => {
      const prev = selectedMarkerRef.current;
      if (prev && prev !== entry) prev.marker.setImage(prev.normalImage);
      entry.marker.setImage(entry.highlightImage);
      selectedMarkerRef.current = entry;
    };

    initMap();

    return () => {
      for (const e of markersRef.current) e.marker.setMap(null);
      markersRef.current = [];
      selectedMarkerRef.current = null;
      mapInstanceRef.current = null;
    };
  }, [sortedRestaurants, centerLat, centerLng, zoom, onMarkerClick, markerSrc, selectedId]);
  
  return (
    <View style={styles.container}>
      {/* 지도 div (실제 카카오맵 렌더링) */}
      <View 
        // @ts-ignore - web only ref
        ref={mapRef}
        style={styles.map}
      />
      
      {/* 로딩 오버레이 */}
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator color={color.brand.primary} size="large" />
          <Text style={styles.loadingText}>식탐정이 지도를 펼치는 중...</Text>
        </View>
      )}
      
      {/* 에러 오버레이 */}
      {error && (
        <View style={styles.overlay}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>
            카카오 콘솔의 도메인 등록을 확인해주세요
          </Text>
        </View>
      )}
    </View>
  );
});

export default KakaoMap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    minHeight: 400,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 400,
    backgroundColor: color.fill.tertiary,
  },
  fallback: {
    flex: 1,
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.fill.tertiary,
  },
  fallbackText: {
    ...typography.subheadline,
    color: color.text.secondary,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  loadingText: {
    ...typography.caption,
    color: color.text.secondary,
    marginTop: spacing.m,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: spacing.s,
  },
  errorText: {
    ...typography.subheadlineEmphasized,
    color: color.status.danger,
    textAlign: 'center',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xxl,
  },
  errorHint: {
    ...typography.footnote,
    color: color.text.tertiary,
    textAlign: 'center',
  },
});