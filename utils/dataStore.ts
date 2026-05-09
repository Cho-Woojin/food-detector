// 메모리 캐시: 인덱스 1회, gu별 식당 데이터 lazy load.

import { Grade } from '@/constants/MockData';
import { GuKey, Restaurant, RestaurantIndex } from '@/constants/Restaurant';
import { recomputeFromRaw } from '@/utils/adapter';
import { loadIndex, loadRestaurantsByGu } from '@/utils/loadData';

let indexCache: RestaurantIndex | null = null;
let indexPromise: Promise<RestaurantIndex> | null = null;

const guCache: Partial<Record<GuKey, Restaurant[]>> = {};
const guPromise: Partial<Record<GuKey, Promise<Restaurant[]>>> = {};

export async function ensureIndex(): Promise<RestaurantIndex> {
  if (indexCache) return indexCache;
  if (!indexPromise) {
    indexPromise = loadIndex().then((idx) => {
      indexCache = idx;
      return idx;
    });
  }
  return indexPromise;
}

export function getIndexSync(): RestaurantIndex | null {
  return indexCache;
}

export async function ensureGu(gu: GuKey): Promise<Restaurant[]> {
  if (guCache[gu]) return guCache[gu]!;
  if (!guPromise[gu]) {
    guPromise[gu] = loadRestaurantsByGu(gu).then((arr) => {
      guCache[gu] = arr;
      return arr;
    });
  }
  return guPromise[gu]!;
}

export function getGuSync(gu: GuKey): Restaurant[] | null {
  return guCache[gu] ?? null;
}

// id → gu 매핑: 신규 인덱스는 flat index를 포함하지 않으므로 recomputed 캐시에서 빌드한다.
let idToGu: Map<string, GuKey> | null = null;

export async function ensureIdToGu(): Promise<Map<string, GuKey>> {
  if (idToGu) return idToGu;
  const all = await ensureRecomputedIndex();
  idToGu = new Map(all.map((r) => [r.i, r.g]));
  return idToGu;
}

export async function findRestaurantById(id: string): Promise<Restaurant | null> {
  const map = await ensureIdToGu();
  const gu = map.get(id);
  if (!gu) return null;
  const arr = await ensureGu(gu);
  return arr.find((r) => r.id === id) ?? null;
}

// ---------- 재계산 인덱스 ----------
// 인덱스의 raw `s`/`gr`은 5축 합과 맞지 않아 신뢰할 수 없음.
// 모든 gu 데이터를 1회 로드해서 5축 기반 점수/등급으로 재계산하고 캐시한다.
// 검색·홈·지도·좋아요·상세 모두 이 캐시를 통해 동일한 값을 본다.

export type RecomputedRow = {
  i: string;        // id
  n: string;        // name
  c: string;        // category
  g: GuKey;         // 자치구
  s: number;        // 재계산 점수
  gr: Grade;        // 재계산 등급
};

let recomputedCache: RecomputedRow[] | null = null;
let recomputedPromise: Promise<RecomputedRow[]> | null = null;

export async function ensureRecomputedIndex(): Promise<RecomputedRow[]> {
  if (recomputedCache) return recomputedCache;
  if (!recomputedPromise) {
    recomputedPromise = (async () => {
      const idx = await ensureIndex();
      const gus = idx.meta.gus;
      const allRows: RecomputedRow[] = [];
      for (const gu of gus) {
        const arr = await ensureGu(gu);
        for (const r of arr) {
          const { score, grade } = recomputeFromRaw(r);
          allRows.push({
            i: r.id,
            n: r.name,
            c: r.cat,
            g: r.gu,
            s: score,
            gr: grade,
          });
        }
      }
      recomputedCache = allRows;
      return allRows;
    })();
  }
  return recomputedPromise;
}

// raw Restaurant id 매핑 — 5축 axes 빌드에 필요 (좋아요·지도 보정 등)
let rawById: Map<string, Restaurant> | null = null;
let rawByIdPromise: Promise<Map<string, Restaurant>> | null = null;

export async function ensureRawById(): Promise<Map<string, Restaurant>> {
  if (rawById) return rawById;
  if (!rawByIdPromise) {
    rawByIdPromise = (async () => {
      const idx = await ensureIndex();
      const m = new Map<string, Restaurant>();
      for (const gu of idx.meta.gus) {
        const arr = await ensureGu(gu);
        for (const r of arr) m.set(r.id, r);
      }
      rawById = m;
      return m;
    })();
  }
  return rawByIdPromise;
}

let recomputedById: Map<string, RecomputedRow> | null = null;

export async function ensureRecomputedById(): Promise<Map<string, RecomputedRow>> {
  if (recomputedById) return recomputedById;
  const all = await ensureRecomputedIndex();
  recomputedById = new Map(all.map((r) => [r.i, r]));
  return recomputedById;
}
