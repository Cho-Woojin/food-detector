// 사용자 위치 관리 — 권한 요청, 카카오 Geocoder 역지오코딩(웹) + centroid fallback,
// localStorage 캐시로 재진입 시 즉시 사용.

import { GuKey } from '@/constants/Restaurant';
import { loadKakaoMap } from '@/utils/kakaoMap';

const STORAGE_KEY = 'food-detector:user-location';

const SEOUL_GUS: readonly GuKey[] = [
  '종로구','중구','용산구','성동구','광진구','동대문구','중랑구','성북구','강북구','도봉구',
  '노원구','은평구','서대문구','마포구','양천구','강서구','구로구','금천구','영등포구','동작구',
  '관악구','서초구','강남구','송파구','강동구',
];

export type UserLocation = {
  lat: number;
  lng: number;
  /** UI 표시용 — "서울시 마포구" / "세종시 한솔동" / "수원시 영통동" 등 */
  displayLabel: string;
  /** 서울 자치구일 때만 — env API(poisonmap)는 서울 25개 구만 키로 사용 */
  seoulGu: GuKey | null;
  /** Kakao 응답 원본 — 디버깅·향후 확장용 */
  region1: string;
  region2: string;
  region3: string;
  /** 마지막 갱신 시각 (ms) */
  updatedAt: number;
};

// 서울 25개 자치구 centroid — Kakao Geocoder 실패 시 fallback에서만 사용.
// (centroid 기반은 경계에서 부정확. 프로덕션 매칭은 카카오 Geocoder 우선.)
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

/** 좌표 → 가장 가까운 자치구 (centroid Euclidean — 경계에서 부정확. fallback only) */
export function nearestGu(lat: number, lng: number): GuKey {
  let best: GuKey = '강남구';
  let bestDist = Number.POSITIVE_INFINITY;
  for (const [gu, [glat, glng]] of Object.entries(GU_CENTROID) as [GuKey, [number, number]][]) {
    const d = (glat - lat) ** 2 + (glng - lng) ** 2;
    if (d < bestDist) { bestDist = d; best = gu; }
  }
  return best;
}

/**
 * 시·도 명을 "XX시" / "XX도" 형식으로 통일.
 * 카카오는 region_1depth_name을 보통 짧은 형태("서울")로 주지만 방어적으로 둘 다 처리.
 */
function toShi(region1: string): string {
  if (!region1) return '';
  // 풀네임 케이스
  if (region1.endsWith('특별시'))     return region1.replace('특별시', '시');     // 서울특별시 → 서울시
  if (region1.endsWith('광역시'))     return region1.replace('광역시', '시');     // 부산광역시 → 부산시
  if (region1.endsWith('특별자치시')) return region1.replace('특별자치시', '시'); // 세종특별자치시 → 세종시
  if (region1.endsWith('특별자치도')) return region1.replace('특별자치도', '도'); // 제주특별자치도 → 제주도
  // 짧은 폼 (Kakao 기본)
  const SHORT_TO_SHI: Record<string, string> = {
    '서울': '서울시', '부산': '부산시', '인천': '인천시', '대구': '대구시',
    '광주': '광주시', '대전': '대전시', '울산': '울산시', '세종': '세종시',
  };
  if (SHORT_TO_SHI[region1]) return SHORT_TO_SHI[region1];
  // 도 (경기, 강원, 충북, 충남, 전북, 전남, 경북, 경남)
  if (region1.endsWith('도')) return region1;
  return region1;
}

/**
 * displayLabel 만들기 — "XX시 XX구" / "XX시 XX동" / "XX시 XX동(or 구)"
 *
 * 케이스:
 * - 서울 마포구 → "서울시 마포구"
 * - 세종 "" 한솔동 → "세종시 한솔동"
 * - 경기 수원시 영통동 → "수원시 영통동" (도는 생략)
 * - 응답 비면 → fallback 라벨
 */
function buildDisplayLabel(r1: string, r2: string, r3: string, fallback: string): string {
  if (!r1 && !r2 && !r3) return fallback;

  // 도(道) 케이스 — region2가 시(市) 역할이라 1depth는 생략
  if (r1.endsWith('도') || /^(경기|강원|충북|충남|전북|전남|경북|경남|제주)$/.test(r1)) {
    if (r2 && r3) return `${r2} ${r3}`;
    if (r2) return r2;
  }

  const shi = toShi(r1);
  if (r2) return `${shi} ${r2}`.trim();
  if (r3) return `${shi} ${r3}`.trim();
  return shi || fallback;
}

/**
 * Kakao Maps Geocoder로 좌표 → 행정구역 정보 역지오코딩.
 * 행정동(H) 우선, 없으면 법정동(B). SDK 미로드/실패 시 null.
 */
async function kakaoReverseGeocode(
  lat: number,
  lng: number,
): Promise<{ region1: string; region2: string; region3: string } | null> {
  if (typeof window === 'undefined') return null;
  let kakao: any;
  try {
    kakao = await loadKakaoMap();
  } catch {
    return null;
  }
  if (!kakao?.maps?.services?.Geocoder) return null;
  return new Promise((resolve) => {
    try {
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.coord2RegionCode(lng, lat, (result: any[], status: string) => {
        if (status !== kakao.maps.services.Status.OK || !Array.isArray(result) || result.length === 0) {
          resolve(null);
          return;
        }
        // 행정동(H) 우선 — 일상에서 부르는 동 이름. 없으면 법정동(B).
        const h = result.find((r) => r?.region_type === 'H');
        const b = result.find((r) => r?.region_type === 'B');
        const r = h ?? b ?? result[0];
        resolve({
          region1: r?.region_1depth_name ?? '',
          region2: r?.region_2depth_name ?? '',
          region3: r?.region_3depth_name ?? '',
        });
      });
    } catch {
      resolve(null);
    }
  });
}

/** localStorage에서 마지막 위치 불러오기 — 24시간 이내면 재사용 */
export function getCachedLocation(): UserLocation | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as UserLocation;
    // 런타임 가드 — 손상된/구버전 캐시 무효화. updatedAt이 NaN이면
    // ageMs > TTL 비교가 항상 false라 캐시가 영구히 살아남는 버그 방지.
    if (typeof data.displayLabel !== 'string') return null;
    if (typeof data.updatedAt !== 'number' || !Number.isFinite(data.updatedAt)) return null;
    if (typeof data.lat !== 'number' || !Number.isFinite(data.lat)) return null;
    if (typeof data.lng !== 'number' || !Number.isFinite(data.lng)) return null;
    const ageMs = Date.now() - data.updatedAt;
    if (ageMs > 24 * 60 * 60 * 1000) return null;
    return data;
  } catch { return null; }
}

function saveLocation(loc: UserLocation): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(loc)); } catch {}
}

/**
 * 브라우저 Geolocation 권한 요청 + 카카오 역지오코딩으로 자치구 매핑.
 * 좌표 실패 시 null. 좌표 OK + 카카오 실패 시 nearestGu(centroid)로 fallback.
 */
export async function requestUserLocation(): Promise<UserLocation | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  const coords = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: false, maximumAge: 60_000 },
    );
  });
  if (!coords) return null;

  // Kakao Geocoder로 정확한 자치구·동 매핑. 실패 시 centroid fallback (서울 한정).
  const region = await kakaoReverseGeocode(coords.lat, coords.lng);

  let region1 = '', region2 = '', region3 = '', seoulGu: GuKey | null = null, displayLabel = '';
  if (region) {
    region1 = region.region1;
    region2 = region.region2;
    region3 = region.region3;
    if (region2 && (SEOUL_GUS as readonly string[]).includes(region2)) {
      seoulGu = region2 as GuKey;
    }
    // fallback은 displayLabel 규격(시 + 구) 그대로 — 카카오 응답이 텅 빌 때
    // displayLabel이 시 접두어 없는 "강남구" 같은 형태로 떨어지지 않도록.
    displayLabel = buildDisplayLabel(region1, region2, region3, '서울시 강남구');
  } else {
    // Kakao 실패 — 서울 안이라고 가정하고 centroid로 한 번 더 시도
    const gu = nearestGu(coords.lat, coords.lng);
    region1 = '서울';
    region2 = gu;
    seoulGu = gu;
    displayLabel = `서울시 ${gu}`;
  }

  const loc: UserLocation = {
    lat: coords.lat,
    lng: coords.lng,
    region1, region2, region3,
    displayLabel,
    seoulGu,
    updatedAt: Date.now(),
  };
  saveLocation(loc);
  return loc;
}

/** 캐시 우선, 없으면 요청 */
export async function ensureUserLocation(): Promise<UserLocation | null> {
  return getCachedLocation() ?? requestUserLocation();
}

export function clearUserLocation(): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
