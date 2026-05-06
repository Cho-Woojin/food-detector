// components/KakaoMap.tsx
// 카카오맵 React 컴포넌트 (Web 환경 전용)

import { color, spacing, typography } from '@/constants/tokens';
import { Restaurant } from '@/constants/Restaurant';
import { loadKakaoMap } from '@/utils/kakaoMap';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
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

// 등급별 핀 색상 (식탐정 디자인 토큰)
const GRADE_COLORS: Record<string, string> = {
  GOLDEN: '#F1C40F',         // 노랑
  SILVER: '#94A3B8',          // 실버
  BRONZE: '#CD7F32',          // 브론즈
  INVESTIGATING: '#3498DB',   // 정보 파랑
  WARNING: '#E74C3C',         // 빨강
  NEEDS_DATA: '#BDBDBD',      // 회색
};

// 등급별 핀 크기 (중요한 등급일수록 크게)
const GRADE_SIZES: Record<string, number> = {
  GOLDEN: 36,
  SILVER: 28,
  BRONZE: 24,
  INVESTIGATING: 20,
  WARNING: 22,
  NEEDS_DATA: 16,
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        
        // 클러스터러 생성 (26,474개 핀을 줌 레벨에 따라 묶기)
        const clusterer = new kakao.maps.MarkerClusterer({
          map: map,
          averageCenter: true,
          minLevel: 6, // 줌 레벨 6 이하에서 클러스터링
          disableClickZoom: false,
        });
        clustererRef.current = clusterer;
        
        // 마커 생성
        const markers: any[] = [];
        
        restaurants.forEach((rest) => {
          if (!rest.lat || !rest.lng) return;
          
          const position = new kakao.maps.LatLng(rest.lat, rest.lng);
          
          // 등급별 커스텀 마커 (HTML 사용)
          const pinColor = GRADE_COLORS[rest.grade] || GRADE_COLORS.NEEDS_DATA;
          const size = GRADE_SIZES[rest.grade] || 16;

          const markerImageSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
            <svg width="${size}" height="${size + 4}" xmlns="http://www.w3.org/2000/svg">
              <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}"
                      fill="${pinColor}" stroke="white" stroke-width="2"/>
              ${rest.grade === 'GOLDEN' ? `<text x="${size/2}" y="${size/2 + 4}" font-size="12" text-anchor="middle" fill="white" font-weight="700">★</text>` : ''}
            </svg>
          `)}`;
          
          const markerImage = new kakao.maps.MarkerImage(
            markerImageSrc,
            new kakao.maps.Size(size, size + 4),
            { offset: new kakao.maps.Point(size/2, size/2) }
          );
          
          const marker = new kakao.maps.Marker({
            position: position,
            image: markerImage,
            title: rest.name,
          });
          
          // 클릭 이벤트
          kakao.maps.event.addListener(marker, 'click', () => {
            if (onMarkerClick) {
              onMarkerClick(rest);
            }
          });
          
          markers.push(marker);
        });
        
        // 클러스터러에 마커 추가
        clusterer.addMarkers(markers);

        if (__DEV__) console.log(`[KakaoMap] ${markers.length}개 핀 표시 완료`);
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
      }
      mapInstanceRef.current = null;
    };
  }, [restaurants, centerLat, centerLng, zoom]);
  
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