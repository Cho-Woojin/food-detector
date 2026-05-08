// 사용자 위치 관리 — 권한 요청, 25개 자치구 centroid 기반 reverse-geocoding,
// localStorage 캐시로 재진입 시 즉시 사용.

import { GuKey } from '@/constants/Restaurant';

const STORAGE_KEY = 'food-detector:user-location';

export type UserLocation = {
  lat: number;
  lng: number;
  gu: GuKey;
  /** 마지막 갱신 시각 (ms) */
  updatedAt: number;
};

// 서울 25개 자치구 대표 좌표. split-restaurants.js와 동일.
const GU_CENTROID: Record<GuKey, [number, number]> = {
  '종로구':   [37.5735, 126.9789],
  '중구':     [37.5638, 126.9979],
  '용산구':   [37.5326, 126.9905],
  '성동구':   [37.5634, 127.0371],
  '광진구':   [37.5384, 127.0822],
  '동대문구': [37.5744, 127.0395],
  '중랑구':   [37.6063, 127.0925],
  '성북구':   [37.5894, 127.0167],
  '강북구':   [37.6396, 127.0257],
  '도봉구':   [37.6688, 127.0471],
  '노원구':   [37.6543, 127.0568],
  '은평구':   [37.6027, 126.9291],
  '서대문구': [37.5791, 126.9368],
  '마포구':   [37.5663, 126.9019],
  '양천구':   [37.5170, 126.8665],
  '강서구':   [37.5509, 126.8495],
  '구로구':   [37.4954, 126.8874],
  '금천구':   [37.4566, 126.8954],
  '영등포구': [37.5264, 126.8962],
  '동작구':   [37.5124, 126.9393],
  '관악구':   [37.4784, 126.9516],
  '서초구':   [37.4836, 127.0327],
  '강남구':   [37.5172, 127.0473],
  '송파구':   [37.5145, 127.1059],
  '강동구':   [37.5301, 127.1238],
};

/** 좌표 → 가장 가까운 자치구 (haversine 근사 — 서울 한정 직선거리로 충분) */
export function nearestGu(lat: number, lng: number): GuKey {
  let best: GuKey = '강남구';
  let bestDist = Number.POSITIVE_INFINITY;
  for (const [gu, [glat, glng]] of Object.entries(GU_CENTROID) as [GuKey, [number, number]][]) {
    const d = (glat - lat) ** 2 + (glng - lng) ** 2; // 정렬용이라 sqrt 생략
    if (d < bestDist) { bestDist = d; best = gu; }
  }
  return best;
}

/** localStorage에서 마지막 위치 불러오기 — 24시간 이내면 재사용 */
export function getCachedLocation(): UserLocation | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as UserLocation;
    const ageMs = Date.now() - data.updatedAt;
    if (ageMs > 24 * 60 * 60 * 1000) return null;
    return data;
  } catch { return null; }
}

function saveLocation(loc: UserLocation): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(loc)); } catch {}
}

/** 브라우저 Geolocation 권한 요청 + 좌표 → 자치구. 거부/실패 시 null */
export async function requestUserLocation(): Promise<UserLocation | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const loc: UserLocation = {
          lat, lng,
          gu: nearestGu(lat, lng),
          updatedAt: Date.now(),
        };
        saveLocation(loc);
        resolve(loc);
      },
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: false, maximumAge: 60_000 },
    );
  });
}

/** 캐시 우선, 없으면 요청 */
export async function ensureUserLocation(): Promise<UserLocation | null> {
  return getCachedLocation() ?? requestUserLocation();
}

export function clearUserLocation(): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
