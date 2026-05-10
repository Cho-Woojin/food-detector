// utils/loadData.ts
import { CategoryKey, GuKey, Restaurant, RestaurantIndex, RiskTag } from '@/constants/Restaurant';
import { deriveGrade, totalScoreOf } from '@/utils/scoring';

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

// CSV 파생 JSON 원본 형태 (scripts/split-restaurants.js 출력 + recompute-scores.js 호환)
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
  // 새 스키마: score = 데이터 점수(0~70). 종합 점수는 클라이언트에서 계산.
  score: number;
  breakdown: { data: number; hygiene: number; model: number; bonus: number; punish: number };
  flags: {
    hygieneDesignated: boolean;
    hygieneGrade?: string;          // '매우우수' | '우수' | '좋음' | undefined (미상)
    hasModel: boolean;
    safeRestaurant?: boolean;
    safeRestaurantSince?: string;
    goodPrice?: boolean;
    goodPriceMenus?: { name: string; price: number | string }[];
    punishCount: number;
    punishTypes: string;
    hygieneViolation?: boolean;
    punishReasons?: string;
  };
  riskTags: RiskTag[];
  menuHints: string[];
  geoFallback?: boolean;
}

// JSON → 런타임 Restaurant 어댑터.
// 종합 점수는 처음에는 dataScore + 0(owner) + 0(user) = dataScore로 초기화.
// 화면(map.tsx, restaurant detail 등)이 useOwnerScoreFor + useImpactFor로
// 런타임 owner/user 점수를 합쳐서 adjustedScoreAndGrade로 갱신.
function adapt(r: RawRestaurant): Restaurant {
  const dataScore = r.score;
  const ownerScore = 0;
  const userScore = 0;
  const score = totalScoreOf(dataScore, ownerScore, userScore);
  const grade = deriveGrade({
    score,
    flags: {
      punishTypes: r.flags.punishTypes,
      hygieneViolation: r.flags.hygieneViolation,
    },
    userScore,
    userReviewCount: 0,
  });

  return {
    id: r.id,
    name: r.name,
    cat: r.category,
    gu: r.gu,
    addr: r.roadAddr || r.addr || '',
    phone: r.phone && r.phone !== 'None' && r.phone !== '' ? r.phone : null,
    lat: r.lat,
    lng: r.lng,

    score,
    grade,
    dataScore,
    ownerScore,
    userScore,
    userReviewCount: 0,

    a: 0, b: 0, c: 0, d: 0, e: 0,
    hyg: r.flags.hygieneDesignated ? 1 : 0,
    mod: r.flags.hasModel ? 1 : 0,
    pun: r.flags.punishCount,
    puT: r.flags.punishTypes || null,
    img: '',
    own: 0,

    riskTags: r.riskTags,
    menuHints: r.menuHints,
    geoFallback: r.geoFallback,

    dataBreakdown: {
      hygiene: r.breakdown.hygiene,
      model: r.breakdown.model,
      bonus: r.breakdown.bonus ?? 0,
      punish: r.breakdown.punish,
    },
    punishTypes: r.flags.punishTypes,
    hygieneViolation: r.flags.hygieneViolation ?? false,
    punishReasons: r.flags.punishReasons ?? '',
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

// "데이터 점수 우수" 식당 — 위생등급+모범 같은 강한 시그널 (dataScore ≥ 45).
// 종합 등급(GOLDEN/SILVER)은 owner/user 활동 후에야 가능하므로,
// 홈 화면에서는 정적 데이터 기준으로만 판정 가능한 "데이터 검증 우수"를 추천.
export async function getTopRestaurants(gu: GuKey, n = 3): Promise<Restaurant[]> {
  const all = await loadRestaurantsByGu(gu);
  return all
    .filter((r) => r.dataScore >= 45)
    .sort((a, b) => b.dataScore - a.dataScore)
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
