// utils/loadData.ts
import { CategoryKey, GradeKey, GuKey, Restaurant, RestaurantIndex, RiskTag } from '@/constants/Restaurant';

// 25개 자치구 lazy import (slug 기반)
const dataMap: Record<GuKey, () => Promise<RawRestaurant[]>> = {
  '종로구':   async () => (await import('@/data/by-gu/restaurants-jongno.json')).default as RawRestaurant[],
  '중구':     async () => (await import('@/data/by-gu/restaurants-junggu.json')).default as RawRestaurant[],
  '용산구':   async () => (await import('@/data/by-gu/restaurants-yongsan.json')).default as RawRestaurant[],
  '성동구':   async () => (await import('@/data/by-gu/restaurants-seongdong.json')).default as RawRestaurant[],
  '광진구':   async () => (await import('@/data/by-gu/restaurants-gwangjin.json')).default as RawRestaurant[],
  '동대문구': async () => (await import('@/data/by-gu/restaurants-dongdaemun.json')).default as RawRestaurant[],
  '중랑구':   async () => (await import('@/data/by-gu/restaurants-jungnang.json')).default as RawRestaurant[],
  '성북구':   async () => (await import('@/data/by-gu/restaurants-seongbuk.json')).default as RawRestaurant[],
  '강북구':   async () => (await import('@/data/by-gu/restaurants-gangbuk.json')).default as RawRestaurant[],
  '도봉구':   async () => (await import('@/data/by-gu/restaurants-dobong.json')).default as RawRestaurant[],
  '노원구':   async () => (await import('@/data/by-gu/restaurants-nowon.json')).default as RawRestaurant[],
  '은평구':   async () => (await import('@/data/by-gu/restaurants-eunpyeong.json')).default as RawRestaurant[],
  '서대문구': async () => (await import('@/data/by-gu/restaurants-seodaemun.json')).default as RawRestaurant[],
  '마포구':   async () => (await import('@/data/by-gu/restaurants-mapo.json')).default as RawRestaurant[],
  '양천구':   async () => (await import('@/data/by-gu/restaurants-yangcheon.json')).default as RawRestaurant[],
  '강서구':   async () => (await import('@/data/by-gu/restaurants-gangseo.json')).default as RawRestaurant[],
  '구로구':   async () => (await import('@/data/by-gu/restaurants-guro.json')).default as RawRestaurant[],
  '금천구':   async () => (await import('@/data/by-gu/restaurants-geumcheon.json')).default as RawRestaurant[],
  '영등포구': async () => (await import('@/data/by-gu/restaurants-yeongdeungpo.json')).default as RawRestaurant[],
  '동작구':   async () => (await import('@/data/by-gu/restaurants-dongjak.json')).default as RawRestaurant[],
  '관악구':   async () => (await import('@/data/by-gu/restaurants-gwanak.json')).default as RawRestaurant[],
  '서초구':   async () => (await import('@/data/by-gu/restaurants-seocho.json')).default as RawRestaurant[],
  '강남구':   async () => (await import('@/data/by-gu/restaurants-gangnam.json')).default as RawRestaurant[],
  '송파구':   async () => (await import('@/data/by-gu/restaurants-songpa.json')).default as RawRestaurant[],
  '강동구':   async () => (await import('@/data/by-gu/restaurants-gangdong.json')).default as RawRestaurant[],
};

// CSV 파생 JSON 원본 형태
interface RawRestaurant {
  id: string;
  name: string;
  gu: GuKey;
  category: CategoryKey;
  categoryRaw: string;
  addr: string;
  roadAddr: string;
  phone: string;
  lat: number;
  lng: number;
  score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  color: string;
  riskTags: RiskTag[];
  menuHints: string[];
  breakdown: { base: number; hygiene: number; evalDelta: number; punish: number; model: number };
  flags: { hygieneDesignated: boolean; hasModel: boolean; punishCount: number; punishTypes: string; evalGrade: string };
  geoFallback?: boolean;
}

// 새 grade(S/A/B/C/D/F) → 앱 GradeKey
function mapGrade(g: RawRestaurant['grade']): GradeKey {
  switch (g) {
    case 'S': return 'GOLDEN';
    case 'A': return 'SILVER';
    case 'B': return 'BRONZE';
    case 'C': return 'NEEDS_DATA';
    case 'D': return 'WARNING';
    case 'F': return 'INVESTIGATING';
  }
}

function adapt(r: RawRestaurant): Restaurant {
  return {
    id: r.id,
    name: r.name,
    cat: r.category,
    gu: r.gu,
    addr: r.roadAddr || r.addr || '',
    phone: r.phone && r.phone !== 'None' && r.phone !== '' ? r.phone : null,
    lat: r.lat,
    lng: r.lng,
    score: r.score,
    grade: mapGrade(r.grade),
    a: 0, b: 0, c: 0, d: 0, e: 0,
    hyg: r.flags.hygieneDesignated ? 1 : 0,
    mod: r.flags.hasModel ? 1 : 0,
    pun: r.flags.punishCount,
    puT: r.flags.punishTypes || null,
    img: '',
    own: 0,
    riskTags: r.riskTags,
    menuHints: r.menuHints,
    color: r.color,
    geoFallback: r.geoFallback,
  };
}

// 자치구 식당 전체 로드 + 어댑트
export async function loadRestaurantsByGu(gu: GuKey): Promise<Restaurant[]> {
  const raw = await dataMap[gu]();
  return raw.map(adapt);
}

// 인덱스 (meta only — flat index는 dataStore가 lazy 빌드)
export async function loadIndex(): Promise<RestaurantIndex> {
  return (await import('@/data/restaurants-index.json')).default as unknown as RestaurantIndex;
}

export async function getTopRestaurants(gu: GuKey, n = 3): Promise<Restaurant[]> {
  const all = await loadRestaurantsByGu(gu);
  return all
    .filter((r) => r.grade === 'GOLDEN' || r.grade === 'SILVER')
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

export async function getRestaurantById(id: string, gu: GuKey): Promise<Restaurant | null> {
  const all = await loadRestaurantsByGu(gu);
  return all.find((r) => r.id === id) || null;
}

export async function getRestaurantsByCategory(gu: GuKey, category: CategoryKey): Promise<Restaurant[]> {
  const all = await loadRestaurantsByGu(gu);
  return all.filter((r) => r.cat === category);
}
