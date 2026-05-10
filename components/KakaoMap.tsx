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
  mapType?: 'ROADMAP' | 'SKYVIEW';
  likedIds?: Set<string>;
  /** 강제로 표시할 마커 id (검색 결과 등) — minLevel/viewport 무시하고 노출 */
  forcedVisibleIds?: Set<string>;
  /** 사용자가 지도를 드래그·줌으로 움직였을 때 호출. "이 지역에서 검색" 버튼 노출 트리거. */
  onMapMoved?: () => void;
  /** 지도 빈 영역 클릭 또는 드래그 시작 — 선택 해제용 */
  onMapDismiss?: () => void;
  /** 사용자 현재 위치 — 파란 점 + 정확도 반경 표시. accuracy는 m 단위 */
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
}

export type KakaoMapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  panTo: (lat: number, lng: number) => void;
  setLevel: (lv: number) => void;
  setMapType: (type: 'ROADMAP' | 'SKYVIEW' | 'HYBRID') => void;
  /** 현재 viewport로 마커 재계산 (수동 "이 지역에서 검색"용) */
  searchThisArea: () => void;
};

// 등급별 단순 dot 마커: 비비드 컬러로 지도 배경(회색·주황 도로/건물)과 충돌 회피
// zIndex: 마커 중첩 시 등급 높은 게 위로 (큰 값 = 위)
// minLevel: 카카오 맵 level이 이 값 이하일 때만 표시 (level 작을수록 줌인). 마커 과밀 방지용.
// 말풍선 핀 마커 — 너비 36px (꼬리 포함 높이 ~43px). 색상은 안의 cheese/warning 아이콘에 적용.
// minLevel=-1이면 viewport 자동 표시 X (검색 매칭 또는 좋아요 시에만 노출)
const GRADE_STYLE: Record<string, { color: string; size: number; border: number; zIndex: number; minLevel: number }> = {
  GOLDEN: { color: '#FACC15', size: 36, border: 1, zIndex: 50, minLevel: 14 }, // 노랑 치즈
  SILVER: { color: '#A3B8C2', size: 36, border: 1, zIndex: 40, minLevel: 5  }, // 실버 치즈
  BRONZE: { color: '#CD7F32', size: 36, border: 1, zIndex: 30, minLevel: 4  }, // 브론즈 치즈
  ROTTEN: { color: '#EF4444', size: 36, border: 1, zIndex: 35, minLevel: 4  }, // 빨강 — 썩은치즈
};
// 등급 미상 fallback (검색/좋아요 등)
const FALLBACK_STYLE = { color: '#D1D5DB', size: 28, border: 1, zIndex: 10, minLevel: -1 };
// 선택된 마커 강조 — 등급 색 그대로지만 크기 +50% + 두꺼운 흰 보더
// 선택 시 크기 변화 X — 강조는 라벨/zIndex로만
const SELECTED_BOOST = 1;

// 그림자를 SVG 내부에 feDropShadow로 굽는다. CSS filter는 카카오맵이 마커를
// background-image 또는 캔버스로 렌더하는 경우 적용 안 될 수 있어서 신뢰도 떨어짐.
const SHADOW_PAD = 6;

// 픽사 스타일 3D 치즈 PNG 에셋을 base64로 마커 SVG에 임베드. 한 번만 로드.
type CheeseB64 = { gold: string; silver: string; bronze: string };

// 등급별 아이콘 종류
type IconKind = 'cheese' | 'warning' | 'magnify';
const GRADE_ICON: Record<string, IconKind> = {
  GOLDEN: 'cheese',
  SILVER: 'cheese',
  BRONZE: 'cheese',
  ROTTEN: 'warning',
};

/** 말풍선 핀 마커 — 흰색 둥근 사각 + 하단 꼬리 + 안에 등급 아이콘 */
function bubbleMarkerSrc(grade: string, fill: string, size: number, opacity = 1, cheeseB64?: CheeseB64, liked = false): string {
  // 원형 말풍선: viewBox 64x80. 원 중심(32,28) r=26, 꼬리 끝(32,70).
  const VB = 64;
  const VBH = 80;
  const totalW = size + SHADOW_PAD * 2;
  const totalH = Math.round((size * VBH) / VB) + SHADOW_PAD * 2;
  const scale = size / VB;
  const off = SHADOW_PAD;

  const iconKind = GRADE_ICON[grade] ?? 'magnify';

  // 아이콘은 원 중심 (32, 28)에 배치
  let icon = '';
  if (iconKind === 'cheese') {
    if (cheeseB64) {
      // 픽사 3D PNG 에셋을 SVG 안에 base64로 임베드 — 별도 fetch 없이 모두 마커 데이터에 포함
      const b64 = grade === 'GOLDEN' ? cheeseB64.gold
                : grade === 'SILVER' ? cheeseB64.silver
                : cheeseB64.bronze;
      // PNG 521x724 (aspect 0.72:1). 원형 말풍선 r=26 안에 fit하도록 height ~40, width ~29
      const iw = 30, ih = 40;
      icon = `<image href="${b64}" x="${32 - iw / 2}" y="${28 - ih / 2}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid meet"/>`;
    } else {
      // PNG 로딩 전 fallback — SVG 삼각 웨지
      icon =
        `<g transform="translate(32 28)">` +
          `<path d="M -3 -19 Q 0 -21 3 -19 L 21 12 Q 22 15 19 16 L -19 16 Q -22 15 -21 12 Z" fill="${fill}" stroke="rgba(0,0,0,0.22)" stroke-width="0.9" stroke-linejoin="round"/>` +
          `<circle cx="-5" cy="-2" r="2.5" fill="rgba(0,0,0,0.22)"/>` +
          `<circle cx="6" cy="3" r="2.2" fill="rgba(0,0,0,0.22)"/>` +
          `<circle cx="-2" cy="9" r="2" fill="rgba(0,0,0,0.22)"/>` +
          `<circle cx="9" cy="-7" r="1.4" fill="rgba(0,0,0,0.22)"/>` +
        `</g>`;
    }
  } else if (iconKind === 'warning') {
    icon =
      `<g transform="translate(32 28)">` +
        `<path d="M0 -20 L20 16 L-20 16 Z" fill="#EF4444" stroke="white" stroke-width="1.4" stroke-linejoin="round"/>` +
        `<rect x="-2" y="-9" width="4" height="14" rx="2" fill="white"/>` +
        `<circle cx="0" cy="11" r="2.4" fill="white"/>` +
      `</g>`;
  } else {
    icon =
      `<g transform="translate(32 28)">` +
        `<circle cx="-3" cy="-3" r="11" fill="none" stroke="${fill}" stroke-width="4"/>` +
        `<line x1="5" y1="5" x2="14" y2="14" stroke="${fill}" stroke-width="4" stroke-linecap="round"/>` +
      `</g>`;
  }

  // 원형 말풍선 path: 꼬리 끝(32,70)에서 양쪽 접점을 지나 원의 윗부분을 따라 도는 닫힌 path
  const bubblePath =
    `M 32 70 L 11.6 44.1 A 26 26 0 1 1 52.4 44.1 Z`;

  // 좋아요 마커는 초록 테두리로 강조 (하트 심볼 대신)
  const stroke = liked ? '#22C55E' : 'rgba(0,0,0,0.05)';
  const strokeWidth = liked ? 3 : 0.5;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW / scale} ${totalH / scale}" opacity="${opacity}">` +
    `<defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%">` +
    `<feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="black" flood-opacity="0.35"/>` +
    `</filter></defs>` +
    `<g transform="translate(${off / scale} ${off / scale})">` +
    `<path d="${bubblePath}" fill="white" stroke="${stroke}" stroke-width="${strokeWidth}" filter="url(#s)"/>` +
    icon +
    `</g>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

type MarkerEntry = {
  id: string;
  marker: any;
  lat: number;
  lng: number;
  grade: string;
  rest: Restaurant;
};

// 등급 × 변형(normal/highlight/liked/likedH) 별 MarkerImage 캐시.
// 같은 등급 마커는 동일한 SVG라서 한 번만 생성하면 됨 (최대 6 등급 × 4 변형 = 24개)
type ImageVariant = 'normal' | 'highlight' | 'liked' | 'likedHighlight';
type ImageCache = Record<string, Record<ImageVariant, any>>;

function buildImageCache(kakao: any, cheeseB64?: CheeseB64): ImageCache {
  const cache: ImageCache = {} as any;
  // 좋아요 변형은 같은 bubbleMarkerSrc를 liked=true로 호출 — 빨간 테두리로 강조
  const mk = (grade: string, fill: string, size: number, liked: boolean) => {
    const totalW = size + SHADOW_PAD * 2;
    const totalH = Math.round((size * 80) / 64) + SHADOW_PAD * 2;
    return new kakao.maps.MarkerImage(
      bubbleMarkerSrc(grade, fill, size, 1, cheeseB64, liked),
      new kakao.maps.Size(totalW, totalH),
      { offset: new kakao.maps.Point(totalW / 2, totalH - SHADOW_PAD) }
    );
  };
  for (const g of Object.keys(GRADE_STYLE)) {
    const { color: fill, size: baseSize } = GRADE_STYLE[g];
    const hSize = Math.round(baseSize * SELECTED_BOOST);
    cache[g] = {
      normal:         mk(g, fill, baseSize, false),
      highlight:      mk(g, fill, hSize,    false),
      liked:          mk(g, fill, baseSize, true),
      likedHighlight: mk(g, fill, hSize,    true),
    };
  }
  return cache;
}

const KakaoMap = forwardRef<KakaoMapHandle, KakaoMapProps>(function KakaoMap(
  {
    restaurants,
    centerLat = 37.5735,
    centerLng = 126.9788,
    zoom = 4,
    selectedId,
    onMarkerClick,
    mapType = 'ROADMAP',
    likedIds,
    forcedVisibleIds,
    onMapMoved,
    onMapDismiss,
    userLocation,
  },
  ref
) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersByIdRef = useRef<Map<string, MarkerEntry>>(new Map());
  const restaurantsRef = useRef<Restaurant[]>([]);
  const imageCacheRef = useRef<ImageCache | null>(null);
  const likedIdsRef = useRef<Set<string>>(new Set());
  const forcedVisibleIdsRef = useRef<Set<string>>(new Set());
  const selectedIdRef = useRef<string | null>(null);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onMapMovedRef = useRef(onMapMoved);
  const onMapDismissRef = useRef(onMapDismiss);
  // 현위치 파란 점 + 정확도 반경
  const userMarkerRef = useRef<any>(null);
  const userCircleRef = useRef<any>(null);
  // 마커 클릭 시각 — 직후의 map click(같은 클릭에서 함께 fire되는 이벤트)을 무시하기 위함
  const lastMarkerClickRef = useRef(0);
  const selectedMarkerRef = useRef<MarkerEntry | null>(null);
  // 좋아요한 마커들의 이름 라벨 — 여러 개 동시 표시. id별로 CustomOverlay 보관
  const labelOverlaysRef = useRef<Map<string, any>>(new Map());
  const applyViewportRef = useRef<() => void>(() => {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cheeseB64, setCheeseB64] = useState<CheeseB64 | null>(null);
  // 최신 cheeseB64 ref — init useEffect가 한 번만 실행되므로 클로저가 stale해지지 않게 ref로 읽음
  const cheeseB64Ref = useRef<CheeseB64 | null>(null);

  // 점수 내림차순 정렬 — 가까운 위치에 겹친 마커 중 등급 높은 것 우선
  const sortedRestaurants = useMemo(
    () => [...restaurants].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    [restaurants]
  );

  // 콜백 ref 동기화 (재렌더 없이 최신 함수 참조)
  useEffect(() => { onMarkerClickRef.current = onMarkerClick; }, [onMarkerClick]);

  // 치즈 PNG를 public/cheese/에서 로드 → canvas로 작게 렌더링 → base64 PNG로 인라인.
  // <img>로 로드되는 SVG 안에선 외부 리소스 참조 차단되므로 인라인 필수.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    const origin = window.location.origin;
    const loadAndShrink = async (path: string): Promise<string> => {
      const url = origin + path;
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new window.Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('image load failed: ' + url));
        i.src = url;
      });
      const W = 40, H = 55;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, W, H);
      return canvas.toDataURL('image/png');
    };
    (async () => {
      try {
        const [gold, silver, bronze] = await Promise.all([
          loadAndShrink('/cheese/gold.png'),
          loadAndShrink('/cheese/silver.png'),
          loadAndShrink('/cheese/bronze.png'),
        ]);
        if (__DEV__) console.log('[KakaoMap] cheese inlined, gold bytes:', gold.length);
        if (!cancelled) setCheeseB64({ gold, silver, bronze });
      } catch (e) {
        if (__DEV__) console.warn('[KakaoMap] cheese 로드 실패:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // cheeseB64 로드되면 imageCache 재빌드 + 활성 마커 이미지 갱신
  useEffect(() => {
    cheeseB64Ref.current = cheeseB64;
    if (!cheeseB64 || !mapInstanceRef.current) return;
    const w = window as any;
    if (!w.kakao?.maps) return;
    imageCacheRef.current = buildImageCache(w.kakao, cheeseB64);
    const cache = imageCacheRef.current;
    const selected = selectedMarkerRef.current;
    for (const entry of markersByIdRef.current.values()) {
      const isLiked = likedIdsRef.current.has(entry.id);
      const isSelected = selected === entry;
      const v = cache[entry.grade] ?? cache.BRONZE;
      const img = isLiked
        ? (isSelected ? v.likedHighlight : v.liked)
        : (isSelected ? v.highlight : v.normal);
      entry.marker.setImage(img);
    }
  }, [cheeseB64]);
  useEffect(() => { onMapMovedRef.current = onMapMoved; }, [onMapMoved]);
  useEffect(() => { onMapDismissRef.current = onMapDismiss; }, [onMapDismiss]);
  useEffect(() => { likedIdsRef.current = likedIds ?? new Set(); }, [likedIds]);
  useEffect(() => {
    forcedVisibleIdsRef.current = forcedVisibleIds ?? new Set();
    if (mapInstanceRef.current) applyViewportRef.current();
  }, [forcedVisibleIds]);
  useEffect(() => { selectedIdRef.current = selectedId ?? null; }, [selectedId]);

  // 좋아요한 마커들의 이름 라벨을 항상 표시. id별 CustomOverlay를 Map으로 관리.
  const showLabel = (entry: MarkerEntry) => {
    if (labelOverlaysRef.current.has(entry.id)) return;
    const w = window as any;
    const map = mapInstanceRef.current;
    if (!map || !w.kakao?.maps?.CustomOverlay) return;
    const content = document.createElement('div');
    content.style.cssText = `
      transform: translateY(1px);
      color: #111;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.25;
      max-width: 140px;
      text-align: center;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: keep-all;
      pointer-events: none;
      text-shadow:
        0 0 4px #fff, 0 0 4px #fff, 0 0 4px #fff,
        0 0 4px #fff, 0 0 4px #fff, 0 0 4px #fff;
    `;
    content.textContent = entry.rest.name;
    const overlay = new w.kakao.maps.CustomOverlay({
      position: new w.kakao.maps.LatLng(entry.lat, entry.lng),
      content,
      xAnchor: 0.5,
      yAnchor: 0,
      zIndex: 1500,
    });
    overlay.setMap(map);
    labelOverlaysRef.current.set(entry.id, overlay);
  };

  const hideLabel = (id: string) => {
    const ov = labelOverlaysRef.current.get(id);
    if (ov) { ov.setMap(null); labelOverlaysRef.current.delete(id); }
  };

  const hideAllLabels = () => {
    for (const ov of labelOverlaysRef.current.values()) ov.setMap(null);
    labelOverlaysRef.current.clear();
  };

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
      setMapType: (type: 'ROADMAP' | 'SKYVIEW' | 'HYBRID') => {
        const w = window as any;
        const map = mapInstanceRef.current;
        if (!map || !w.kakao?.maps?.MapTypeId) return;
        const id = w.kakao.maps.MapTypeId[type];
        map.setMapTypeId(id);
      },
      searchThisArea: () => {
        applyViewportRef.current();
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
  
  // sortedRestaurants 변경 시 ref 동기화 + 활성 마커 갱신
  useEffect(() => {
    restaurantsRef.current = sortedRestaurants;
    if (mapInstanceRef.current) {
      // 데이터 변경 시: 더 이상 데이터에 없는 활성 마커 제거 후 viewport 재계산
      const validIds = new Set(sortedRestaurants.map((r) => r.id));
      for (const [id, entry] of markersByIdRef.current) {
        if (!validIds.has(id)) {
          entry.marker.setMap(null);
          markersByIdRef.current.delete(id);
        }
      }
      applyViewportRef.current();
    }
  }, [sortedRestaurants]);

  // 카카오맵 초기화 (한 번만)
  useEffect(() => {
    let cancelled = false;
    const initMap = async () => {
      try {
        setLoading(true);
        setError(null);

        const kakao = await loadKakaoMap();
        if (cancelled || !mapRef.current) return;

        const map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(centerLat, centerLng),
          level: zoom,
        });
        mapInstanceRef.current = map;
        // cheeseB64이 init보다 먼저 로드된 경우 ref로 즉시 반영
        imageCacheRef.current = buildImageCache(kakao, cheeseB64Ref.current ?? undefined);

        // 마커 1개 생성 + 클릭 핸들러 + 초기 이미지(좋아요/선택 상태 반영)
        const createEntry = (rest: Restaurant): MarkerEntry => {
          const cache = imageCacheRef.current!;
          const variants = cache[rest.grade] ?? cache.BRONZE;
          const isLiked = likedIdsRef.current.has(rest.id);
          const isSelected = selectedIdRef.current === rest.id;
          const img = isLiked
            ? (isSelected ? variants.likedHighlight : variants.liked)
            : (isSelected ? variants.highlight : variants.normal);
          const position = new kakao.maps.LatLng(rest.lat, rest.lng);
          const baseZ = GRADE_STYLE[rest.grade]?.zIndex ?? 10;
          const z = isSelected ? 1000 : isLiked ? 500 : baseZ;
          const marker = new kakao.maps.Marker({
            position, image: img, title: rest.name, zIndex: z,
          });
          const entry: MarkerEntry = {
            id: rest.id, marker, lat: rest.lat, lng: rest.lng, grade: rest.grade, rest,
          };
          kakao.maps.event.addListener(marker, 'click', () => {
            // 마커 클릭 직후 map click 이벤트가 함께 발생해서 dismiss되는 버그 방지
            lastMarkerClickRef.current = Date.now();
            // 줌인 + 중심 이동 — 거리 무관 안정적으로 동작.
            // panTo는 거리가 멀면 애니메이션 안 먹고 jump하거나 setLevel과 race해서 중심이 어긋남.
            // setLevel 후 setCenter 순서로 호출하면 어떤 거리든 정확히 마커 좌표로 정렬됨.
            const targetLevel = Math.min(map.getLevel(), 3);
            if (map.getLevel() !== targetLevel) map.setLevel(targetLevel);
            map.setCenter(position);
            highlight(entry);
            onMarkerClickRef.current?.(rest);
          });
          if (isSelected) selectedMarkerRef.current = entry;
          return entry;
        };

        // ===== Viewport + 줌레벨 기반 가상화 =====
        // - viewport 안에 있고 + 현재 level이 GRADE_STYLE.minLevel 이하인 식당만
        //   실제 kakao.maps.Marker 객체를 만들어 setMap. 떠나면 destroy.
        // - 12만 건을 사전 생성하지 않고 보이는 수백 개만 유지 → 메모리/CPU 절감
        const applyViewport = () => {
          if (!mapInstanceRef.current) return;
          const bounds = map.getBounds();
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          const south = sw.getLat(), west = sw.getLng();
          const north = ne.getLat(), east = ne.getLng();
          const level = map.getLevel();

          // 1) 원하는 id 집합 계산
          // - GOLDEN: 9개뿐이라 viewport 무시하고 항상 표시
          // - 좋아요 / 강제 표시(검색): 줌 레벨·viewport 무시하고 항상 표시 (수집중 등급도 노출)
          // - 그 외: viewport + minLevel 둘 다 통과해야 표시
          const liked = likedIdsRef.current;
          const forced = forcedVisibleIdsRef.current;
          const want = new Set<string>();
          const newcomers: Restaurant[] = [];
          for (const r of restaurantsRef.current) {
            if (!r.lat || !r.lng) continue;
            const isLiked = liked.has(r.id);
            const isForced = forced.has(r.id);
            const isGold = r.grade === 'GOLDEN';
            if (!isLiked && !isForced) {
              const minLv = GRADE_STYLE[r.grade]?.minLevel ?? 3;
              if (minLv < 0) continue; // 미상 등급은 자동 표시 X (검색·좋아요만 노출)
              if (level > minLv) continue;
              if (!isGold) {
                if (r.lat < south || r.lat > north || r.lng < west || r.lng > east) continue;
              }
            }
            want.add(r.id);
            if (!markersByIdRef.current.has(r.id)) newcomers.push(r);
          }

          // 2) 더 이상 필요 없는 마커 제거
          for (const [id, entry] of markersByIdRef.current) {
            if (!want.has(id)) {
              entry.marker.setMap(null);
              hideLabel(id);
              if (selectedMarkerRef.current === entry) selectedMarkerRef.current = null;
              markersByIdRef.current.delete(id);
            }
          }

          // 3) 신규 마커 생성 (이미 정렬돼 있어 점수 높은 것부터 = 상위 등급 우선)
          for (const r of newcomers) {
            const entry = createEntry(r);
            entry.marker.setMap(map);
            markersByIdRef.current.set(r.id, entry);
            // 좋아요한 마커는 클릭 없이도 이름 라벨 표시
            if (likedIdsRef.current.has(r.id)) showLabel(entry);
          }
        };

        // highlight: 클릭한 마커를 강조 이미지로, 이전 강조는 원래대로
        const highlight = (entry: MarkerEntry) => {
          const cache = imageCacheRef.current!;
          const prev = selectedMarkerRef.current;
          if (prev && prev !== entry) {
            const v = cache[prev.grade] ?? cache.BRONZE;
            const prevLiked = likedIdsRef.current.has(prev.id);
            prev.marker.setImage(prevLiked ? v.liked : v.normal);
            prev.marker.setZIndex(prevLiked ? 500 : GRADE_STYLE[prev.grade]?.zIndex ?? 10);
            // 이전 선택 마커가 좋아요 상태가 아니면 라벨 제거 (좋아요면 라벨 유지)
            if (!prevLiked) hideLabel(prev.id);
          }
          const v = cache[entry.grade] ?? cache.BRONZE;
          const isLiked = likedIdsRef.current.has(entry.id);
          entry.marker.setImage(isLiked ? v.likedHighlight : v.highlight);
          entry.marker.setZIndex(1000);
          selectedMarkerRef.current = entry;
          // 클릭한 마커는 좋아요 여부와 관계없이 이름 라벨 표시
          showLabel(entry);
        };

        applyViewportRef.current = applyViewport;
        // 초기 1회만 자동 렌더. 이후 사용자가 드래그·줌하면 onMapMoved만 emit하고
        // 마커는 그대로 — "이 지역에서 검색" 버튼을 눌러야 갱신됨 (캐치테이블 패턴).
        applyViewport();
        let lastApplied = true; // 방금 자동 호출했으므로
        kakao.maps.event.addListener(map, 'idle', () => {
          if (lastApplied) { lastApplied = false; return; }
          // 마커 클릭으로 인한 setCenter 후의 idle은 사용자 이동이 아니므로 무시
          if (Date.now() - lastMarkerClickRef.current < 500) return;
          onMapMovedRef.current?.();
        });
        // 빈 영역 클릭 → 시트 닫기. 마커 클릭은 marker click과 map click이 함께 fire되므로
        // 마커 클릭 직후(300ms 이내)의 map click은 무시 → 시트가 떴다 사라지는 버그 방지
        kakao.maps.event.addListener(map, 'click', () => {
          if (Date.now() - lastMarkerClickRef.current < 300) return;
          onMapDismissRef.current?.();
        });
        // 드래그 시작도 dismiss로 취급 (지도 이동 = 선택 해제)
        kakao.maps.event.addListener(map, 'dragstart', () => {
          onMapDismissRef.current?.();
        });
        // searchThisArea 호출 시 lastApplied 플래그 리셋해서 다음 idle을 사용자 이동으로 취급
        const wrapped = applyViewportRef.current;
        applyViewportRef.current = () => { lastApplied = true; wrapped(); };

        // 초기 selectedId가 있고 viewport 안이면 강조
        if (selectedIdRef.current) {
          const target = markersByIdRef.current.get(selectedIdRef.current);
          if (target) highlight(target);
        }

        setLoading(false);
      } catch (err: any) {
        if (__DEV__) console.error('[KakaoMap] 초기화 실패:', err);
        setError(err.message || '지도 로드 실패');
        setLoading(false);
      }
    };

    initMap();

    return () => {
      cancelled = true;
      for (const entry of markersByIdRef.current.values()) entry.marker.setMap(null);
      markersByIdRef.current.clear();
      selectedMarkerRef.current = null;
      hideAllLabels();
      mapInstanceRef.current = null;
      imageCacheRef.current = null;
    };
    // 한 번만 초기화. 데이터·selectedId·콜백 변경은 ref + 별도 useEffect로 반영.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // 카카오맵 타일만 채도/명도 낮춤 — 우리 마커(SVG data URL)는 영향 없음.
  // 일반지도(ROADMAP)일 때만 필터 적용. 위성(SKYVIEW)은 원본 그대로.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const id = 'food-detector-map-tile-filter';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = `
      /* 마커 그림자는 SVG 내부 feDropShadow로 처리 — CSS는 카카오 마커가 background-image로
         렌더되는 케이스에서 안 먹는 경우가 있어 신뢰도 낮음. 여기는 비워둠. */
    `;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);

  // 외부 mapType prop 변경 → 카카오맵 인스턴스에 반영
  useEffect(() => {
    const w = window as any;
    const map = mapInstanceRef.current;
    if (!map || !w.kakao?.maps?.MapTypeId) return;
    map.setMapTypeId(w.kakao.maps.MapTypeId[mapType]);
  }, [mapType]);

  // 외부 center/zoom prop 변경 → 지도 이동 + 줌 (init useEffect는 한 번만 실행되므로
  // prop 변경 감지가 별도 필요. detail → "지도 보기" 진입 시 해당 좌표로 이동)
  useEffect(() => {
    const w = window as any;
    const map = mapInstanceRef.current;
    if (!map || !w.kakao?.maps) return;
    map.panTo(new w.kakao.maps.LatLng(centerLat, centerLng));
    map.setLevel(zoom);
  }, [centerLat, centerLng, zoom]);

  // 사용자 현위치 — 파란 점 마커 + 정확도 반경 원
  // userLocation이 update되면 위치만 옮김 (재생성 X). 좌표 null이면 마커·원 제거.
  useEffect(() => {
    const w = window as any;
    const map = mapInstanceRef.current;
    if (!map || !w.kakao?.maps) return;

    if (!userLocation) {
      if (userMarkerRef.current) { userMarkerRef.current.setMap(null); userMarkerRef.current = null; }
      if (userCircleRef.current) { userCircleRef.current.setMap(null); userCircleRef.current = null; }
      return;
    }

    const pos = new w.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    const accuracy = Math.max(50, Math.min(userLocation.accuracy ?? 80, 500)); // 50~500m clamp

    // 마커 — 흰색 외곽링 + 파란 inner dot SVG (Google/Kakao Maps 스타일)
    if (!userMarkerRef.current) {
      const dotSvg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">` +
        `<defs><filter id="d" x="-50%" y="-50%" width="200%" height="200%">` +
        `<feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="black" flood-opacity="0.25"/>` +
        `</filter></defs>` +
        `<circle cx="11" cy="11" r="9" fill="white" filter="url(#d)"/>` +
        `<circle cx="11" cy="11" r="6" fill="#3B82F6"/>` +
        `</svg>`;
      const dotUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dotSvg)}`;
      const img = new w.kakao.maps.MarkerImage(
        dotUri,
        new w.kakao.maps.Size(22, 22),
        { offset: new w.kakao.maps.Point(11, 11) }
      );
      userMarkerRef.current = new w.kakao.maps.Marker({
        position: pos, image: img, zIndex: 2500, clickable: false,
      });
      userMarkerRef.current.setMap(map);
    } else {
      userMarkerRef.current.setPosition(pos);
    }

    // 정확도 반경 원 — 파란 fill 약간, stroke 살짝
    if (!userCircleRef.current) {
      userCircleRef.current = new w.kakao.maps.Circle({
        center: pos,
        radius: accuracy,
        strokeWeight: 1,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.4,
        strokeStyle: 'solid',
        fillColor: '#3B82F6',
        fillOpacity: 0.12,
      });
      userCircleRef.current.setMap(map);
    } else {
      userCircleRef.current.setPosition(pos);
      userCircleRef.current.setRadius(accuracy);
    }
  }, [userLocation?.lat, userLocation?.lng, userLocation?.accuracy]);

  // 좋아요 상태 변화 → 활성 마커들의 이미지/z-index만 교체 (재생성 X)
  useEffect(() => {
    if (!mapInstanceRef.current || !imageCacheRef.current) return;
    const cache = imageCacheRef.current;
    const wantIds = likedIds ?? new Set<string>();
    const selected = selectedMarkerRef.current;
    for (const entry of markersByIdRef.current.values()) {
      const isLiked = wantIds.has(entry.id);
      const isSelected = selected === entry;
      const v = cache[entry.grade] ?? cache.BRONZE;
      const img = isLiked
        ? (isSelected ? v.likedHighlight : v.liked)
        : (isSelected ? v.highlight : v.normal);
      entry.marker.setImage(img);
      if (isSelected) entry.marker.setZIndex(1000);
      else if (isLiked) entry.marker.setZIndex(500);
      else entry.marker.setZIndex(GRADE_STYLE[entry.grade]?.zIndex ?? 10);
    }
    // 좋아요 상태에 맞춰 라벨도 동기화 (활성 마커들 기준)
    for (const entry of markersByIdRef.current.values()) {
      if (wantIds.has(entry.id)) showLabel(entry);
      else hideLabel(entry.id);
    }
    // 새로 좋아요된 마커는 viewport·zoom 무시하고 표시되어야 하므로 viewport 재계산
    applyViewportRef.current();
  }, [likedIds]);

  // 외부 selectedId 변경 → 해당 마커 강조 (활성이면 즉시, 아니면 viewport 진입 시)
  useEffect(() => {
    if (!mapInstanceRef.current || !imageCacheRef.current) return;
    const cache = imageCacheRef.current;
    const prev = selectedMarkerRef.current;
    if (prev && prev.id !== selectedId) {
      const v = cache[prev.grade] ?? cache.BRONZE;
      const prevLiked = likedIdsRef.current.has(prev.id);
      prev.marker.setImage(prevLiked ? v.liked : v.normal);
      prev.marker.setZIndex(prevLiked ? 500 : GRADE_STYLE[prev.grade]?.zIndex ?? 10);
      // 이전 선택 마커가 좋아요 X면 라벨 제거
      if (!prevLiked) hideLabel(prev.id);
      selectedMarkerRef.current = null;
    }
    if (!selectedId) return;
    const target = markersByIdRef.current.get(selectedId);
    if (!target) return; // viewport 밖이면 createEntry에서 isSelected 반영됨
    const v = cache[target.grade] ?? cache.BRONZE;
    const isLiked = likedIdsRef.current.has(target.id);
    target.marker.setImage(isLiked ? v.likedHighlight : v.highlight);
    target.marker.setZIndex(1000);
    selectedMarkerRef.current = target;
    showLabel(target);
  }, [selectedId]);

  return (
    <View style={styles.container}>
      {/* 지도 div (실제 카카오맵 렌더링) */}
      <View
        // @ts-ignore - web only ref + className + data attr
        ref={mapRef}
        className="food-detector-kakao-map"
        data-map-type={mapType}
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