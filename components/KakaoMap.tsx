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
  onMarkerClick?: (restaurant: Restaurant) => void;
}

export type KakaoMapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  panTo: (lat: number, lng: number) => void;
  setLevel: (lv: number) => void;
};

// 등급별 단순 dot 마커: 색상 + 크기로만 등급 표현
const GRADE_STYLE: Record<string, { color: string; size: number }> = {
  GOLDEN: { color: '#22C55E', size: 18 }, // brand green — 최상위
  SILVER: { color: '#94A3B8', size: 14 }, // 회색 — 중간
  BRONZE: { color: '#CD7F32', size: 12 }, // 갈색 — 하위
};

/**
 * 줌 레벨 → 표시할 최소 점수 임계값.
 * 멀리서(레벨↑) 볼수록 상위 점수만 표시해 밀도를 해소.
 *  · 1-5 (도시 ~ 동네): 모두 표시
 *  · 6-7 (구 단위)     : 75점 이상 (BRONZE 상위 + SILVER + GOLDEN)
 *  · 8+  (광역)        : 85점 이상 (SILVER + GOLDEN)
 */
function scoreThreshold(level: number): number {
  if (level <= 5) return 0;
  if (level <= 7) return 75;
  return 85;
}

/** 단순한 색상 dot SVG → data URL (서버에서도 안전) */
function dotMarkerSrc(fill: string, size: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1.5}" fill="${fill}" stroke="white" stroke-width="1.5"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const KakaoMap = forwardRef<KakaoMapHandle, KakaoMapProps>(function KakaoMap(
  {
    restaurants,
    centerLat = 37.5735,
    centerLng = 126.9788,
    zoom = 4,
    onMarkerClick,
  },
  ref
) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ marker: any; score: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 점수 내림차순 정렬 — 마커 생성·표시 우선순위
  const sortedRestaurants = useMemo(
    () => [...restaurants].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    [restaurants]
  );

  // 등급별 SVG 마커 (서버/클라 모두 안전)
  const markerSrc = useMemo<Record<string, string>>(() => {
    return {
      GOLDEN: dotMarkerSrc(GRADE_STYLE.GOLDEN.color, GRADE_STYLE.GOLDEN.size),
      SILVER: dotMarkerSrc(GRADE_STYLE.SILVER.color, GRADE_STYLE.SILVER.size),
      BRONZE: dotMarkerSrc(GRADE_STYLE.BRONZE.color, GRADE_STYLE.BRONZE.size),
    };
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
    // 첫 mount 시 restaurants는 빈 배열 — 빈 상태로 Map을 두 번 만들면
    // 같은 div에 중복 Map이 생성돼 마커가 보이지 않을 수 있다. 데이터가 들어온 뒤 한 번만 init.
    if (sortedRestaurants.length === 0) return;
    const initMap = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const kakao = await loadKakaoMap();
        
        if (!mapRef.current) return;
        
        // 지도 인스턴스 생성
        const options = {
          center: new kakao.maps.LatLng(centerLat, centerLng),
          level: zoom,
        };
        const map = new kakao.maps.Map(mapRef.current, options);
        mapInstanceRef.current = map;

        // 마커 생성 (점수 높은 순으로 already sorted)
        const allMarkers: { marker: any; score: number }[] = [];

        sortedRestaurants.forEach((rest) => {
          if (!rest.lat || !rest.lng) return;
          const src = markerSrc[rest.grade];
          if (!src) return; // 치즈 등급 외(WARNING/INVESTIGATING)는 표시 안 함

          const position = new kakao.maps.LatLng(rest.lat, rest.lng);
          const size = GRADE_STYLE[rest.grade]?.size ?? 9;

          const markerImage = new kakao.maps.MarkerImage(
            src,
            new kakao.maps.Size(size, size),
            { offset: new kakao.maps.Point(size / 2, size / 2) }
          );

          const marker = new kakao.maps.Marker({
            position,
            image: markerImage,
            title: rest.name,
            zIndex: rest.score ?? 0, // 겹침 시 점수 높은 게 위
          });

          kakao.maps.event.addListener(marker, 'click', () => {
            onMarkerClick?.(rest);
          });

          allMarkers.push({ marker, score: rest.score ?? 0 });
        });

        markersRef.current = allMarkers;

        // 줌 레벨에 따른 가시성 적용
        const applyVisibility = () => {
          const threshold = scoreThreshold(map.getLevel());
          allMarkers.forEach(({ marker, score }) => {
            marker.setMap(score >= threshold ? map : null);
          });
        };

        applyVisibility();
        kakao.maps.event.addListener(map, 'zoom_changed', applyVisibility);

        if (__DEV__) console.log(`[KakaoMap] ${allMarkers.length}개 핀 생성 (점수 정렬)`);
        setLoading(false);

      } catch (err: any) {
        if (__DEV__) console.error('[KakaoMap] 초기화 실패:', err);
        setError(err.message || '지도 로드 실패');
        setLoading(false);
      }
    };
    
    initMap();

    // 클린업
    return () => {
      markersRef.current.forEach(({ marker }) => marker.setMap(null));
      markersRef.current = [];
      mapInstanceRef.current = null;
    };
  }, [sortedRestaurants, centerLat, centerLng, zoom, onMarkerClick, markerSrc]);
  
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