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

// 등급별 단순 dot 마커: 식탐정 그린 농도 + 크기로 등급 표현
const GRADE_STYLE: Record<string, { color: string; size: number; border: number }> = {
  GOLDEN: { color: '#16A34A', size: 22, border: 2.5 }, // 진한 그린 — 최상위
  SILVER: { color: '#4ADE80', size: 18, border: 2 },   // 옅은 그린 — 중간
  BRONZE: { color: '#94A3B8', size: 16, border: 2 },   // 회색  — 하위
};

/** 단순한 색상 dot SVG → data URL (서버에서도 안전) */
function dotMarkerSrc(fill: string, size: number, border: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - border}" fill="${fill}" stroke="white" stroke-width="${border}"/></svg>`;
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
  const clustererRef = useRef<any>(null);
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

        // 클러스터러 — 5,000+ 마커를 동시에 그리면 브라우저가 멈추므로 줌 레벨에 따라 자동 묶음
        const clusterer = new kakao.maps.MarkerClusterer({
          map,
          averageCenter: true,
          minLevel: 5,            // 줌 레벨 5 이상(축소)에서 클러스터링
          disableClickZoom: false,
          gridSize: 60,
          calculator: [10, 50, 200], // 묶음 크기 단계
          styles: [
            { width: '32px', height: '32px', background: 'rgba(34,197,94,0.85)', borderRadius: '16px', color: '#fff', textAlign: 'center', lineHeight: '32px', fontSize: '12px', fontWeight: '700' },
            { width: '40px', height: '40px', background: 'rgba(22,163,74,0.85)', borderRadius: '20px', color: '#fff', textAlign: 'center', lineHeight: '40px', fontSize: '13px', fontWeight: '700' },
            { width: '52px', height: '52px', background: 'rgba(21,128,61,0.9)',  borderRadius: '26px', color: '#fff', textAlign: 'center', lineHeight: '52px', fontSize: '14px', fontWeight: '800' },
            { width: '64px', height: '64px', background: 'rgba(20,83,45,0.92)',  borderRadius: '32px', color: '#fff', textAlign: 'center', lineHeight: '64px', fontSize: '15px', fontWeight: '800' },
          ],
        });
        clustererRef.current = clusterer;

        // 마커 생성 (점수 높은 순으로 already sorted)
        const allMarkers: { marker: any; score: number }[] = [];
        const kakaoMarkers: any[] = [];

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
          });

          kakao.maps.event.addListener(marker, 'click', () => {
            onMarkerClick?.(rest);
          });

          allMarkers.push({ marker, score: rest.score ?? 0 });
          kakaoMarkers.push(marker);
        });

        // 클러스터러에 일괄 추가 (개별 marker.setMap 호출 안 함)
        clusterer.addMarkers(kakaoMarkers);
        markersRef.current = allMarkers;

        if (__DEV__) console.log(`[KakaoMap] ${allMarkers.length}개 핀 생성 + 클러스터링`);
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
      if (clustererRef.current) {
        clustererRef.current.clear();
        clustererRef.current = null;
      }
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