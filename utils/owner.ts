// utils/owner.ts
// 사장님 청소 인증 데이터 store.
// 백엔드 부재 동안 localStorage에 영속 (favorites/reviews와 동일 패턴).
//
// 점수 = 최근 30일 인증 건수 × 2.5, 0~25 클램프 (utils/scoring.ts의 ownerScoreFromCount).
//
// MVP 시점에는 인증 입력 UI가 아직 미구현이라 데이터가 비어 있음 → 모든 식당의 사장님 점수 = 0.
// 사장님 청소 인증 화면 완성 시 addVerification()을 호출해 데이터를 누적.

import { useMemo, useSyncExternalStore } from 'react';
import { countWithinWindow, ownerScoreFromCount } from '@/utils/scoring';

const STORAGE_KEY = 'food-detector:owner-verifications';

export type OwnerVerification = {
  id: string;
  restaurantId: string;
  ownerId: string | null;       // 카카오 user id (사장님 인증 후), 없으면 anonymous
  timestamp: number;            // ms epoch (인증 시점)
  note?: string;                // 사장님이 남긴 메모
  photos?: string[];            // base64 data URL (인증 사진)
};

let verifications: OwnerVerification[] = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): OwnerVerification[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveToStorage() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(verifications));
  } catch {
    // QuotaExceeded — drop photos and retry
    try {
      const stripped = verifications.map((v) => ({ ...v, photos: [] }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
      verifications = stripped;
    } catch { /* give up silently */ }
  }
}

function emit() { for (const fn of listeners) fn(); }
function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getVerifications(): OwnerVerification[] {
  return verifications;
}

export function getVerificationsFor(restaurantId: string): OwnerVerification[] {
  return verifications.filter((v) => v.restaurantId === restaurantId);
}

export function addVerification(input: Omit<OwnerVerification, 'id' | 'timestamp'>): OwnerVerification {
  const created: OwnerVerification = {
    ...input,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  };
  verifications = [created, ...verifications];
  saveToStorage();
  emit();
  return created;
}

export function removeVerification(id: string) {
  const next = verifications.filter((v) => v.id !== id);
  if (next.length === verifications.length) return;
  verifications = next;
  saveToStorage();
  emit();
}

// React hooks
export function useVerifications(): OwnerVerification[] {
  return useSyncExternalStore(subscribe, () => verifications, () => verifications);
}

export function useVerificationsFor(restaurantId: string | undefined | null): OwnerVerification[] {
  const all = useVerifications();
  return useMemo(() => {
    if (!restaurantId) return [];
    return all.filter((v) => v.restaurantId === restaurantId);
  }, [all, restaurantId]);
}

// 식당별 사장님 점수 (0~25)
export function useOwnerScoreFor(restaurantId: string | undefined | null): {
  score: number;
  count30d: number;
  totalCount: number;
} {
  const list = useVerificationsFor(restaurantId);
  return useMemo(() => {
    const count30d = countWithinWindow(list.map((v) => v.timestamp));
    return {
      score: ownerScoreFromCount(count30d),
      count30d,
      totalCount: list.length,
    };
  }, [list]);
}

// 모든 식당에 대한 사장님 점수 맵 (지도·검색 등 다수 식당 일괄 처리)
export function useOwnerScoreMap(): Map<string, number> {
  const all = useVerifications();
  return useMemo(() => {
    const grouped = new Map<string, number[]>();
    for (const v of all) {
      const list = grouped.get(v.restaurantId);
      if (list) list.push(v.timestamp);
      else grouped.set(v.restaurantId, [v.timestamp]);
    }
    const out = new Map<string, number>();
    for (const [id, timestamps] of grouped) {
      out.set(id, ownerScoreFromCount(countWithinWindow(timestamps)));
    }
    return out;
  }, [all]);
}
