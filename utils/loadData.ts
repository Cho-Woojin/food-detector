// utils/loadData.ts
import { GuKey, Restaurant, RestaurantIndex } from '@/constants/Restaurant';

// 자치구별 lazy load
const dataMap: Record<GuKey, () => Promise<Restaurant[]>> = {
  '종로구': async () => (await import('@/data/restaurants-jongno.json')).default as Restaurant[],
  '강남구': async () => (await import('@/data/restaurants-gangnam.json')).default as Restaurant[],
  '마포구': async () => (await import('@/data/restaurants-mapo.json')).default as Restaurant[],
};

// 자치구 식당 전체 로드
export async function loadRestaurantsByGu(gu: GuKey): Promise<Restaurant[]> {
  return dataMap[gu]();
}

// 검색 인덱스 (전체 가벼운 데이터)
export async function loadIndex(): Promise<RestaurantIndex> {
  return (await import('@/data/restaurants-index.json')).default as RestaurantIndex;
}

// 좋아요·인기 식당 (점수 높은 순)
export async function getTopRestaurants(gu: GuKey, n = 3): Promise<Restaurant[]> {
  const all = await loadRestaurantsByGu(gu);
  return all
    .filter(r => r.grade === 'GOLDEN' || r.grade === 'SILVER')
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

// ID로 식당 1개 조회
export async function getRestaurantById(id: string, gu: GuKey): Promise<Restaurant | null> {
  const all = await loadRestaurantsByGu(gu);
  return all.find(r => r.id === id) || null;
}

// 카테고리 필터
export async function getRestaurantsByCategory(
  gu: GuKey, 
  category: string
): Promise<Restaurant[]> {
  const all = await loadRestaurantsByGu(gu);
  return all.filter(r => r.cat === category);
}