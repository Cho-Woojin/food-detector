// 홈 화면 환경 데이터 클라이언트.
// /api/env 프록시 호출 + localStorage 1시간 캐시.

import { GuKey } from '@/constants/Restaurant';

export type EnvData = {
  gu: string;
  foodPoison: {
    today: number;
    tomorrow: number;
    afterTomorrow: number;
    regDatetime: string;
  };
  weather: {
    temperature: number;
    humidity: number;
    precipitation: number;
    pm10: number;
    regDt: string;
    regTime: string;
  };
};

type Cached = { data: EnvData; cachedAt: number };

const CACHE_TTL_MS = 60 * 60 * 1000;
const STORAGE_PREFIX = 'food-detector:env:';

function readCache(gu: GuKey): Cached | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + gu);
    return raw ? (JSON.parse(raw) as Cached) : null;
  } catch {
    return null;
  }
}

function writeCache(gu: GuKey, data: EnvData): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const payload: Cached = { data, cachedAt: Date.now() };
    localStorage.setItem(STORAGE_PREFIX + gu, JSON.stringify(payload));
  } catch {}
}

/**
 * 자치구별 환경 데이터(식중독지수+기온+습도+PM10) 조회.
 * 1시간 이내 캐시는 즉시 반환, 만료/없음이면 프록시 호출.
 * 호출 실패 시 캐시값(만료된 것이라도) fallback, 그것도 없으면 null.
 */
export async function fetchEnvData(gu: GuKey): Promise<EnvData | null> {
  const cached = readCache(gu);
  const now = Date.now();
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await fetch(`/api/env?gu=${encodeURIComponent(gu)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as EnvData;
    writeCache(gu, data);
    return data;
  } catch (err) {
    if (cached) return cached.data;
    return null;
  }
}

/**
 * 캐시된 시각이 얼마나 오래됐는지 (분).
 * UI에 "1시간 전 기준" 같은 표기에 사용.
 */
export function getCacheAgeMin(gu: GuKey): number | null {
  const cached = readCache(gu);
  if (!cached) return null;
  return Math.floor((Date.now() - cached.cachedAt) / 60_000);
}
