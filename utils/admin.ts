// 관리자 권한 — 시연용 단순 매커니즘
// - 정식 백엔드 RBAC 부재. 화이트리스트(하드코딩) + localStorage claim 두 가지로 결정.
// - 시연 흐름: 개발자가 카카오 로그인 후 /admin-claim 진입 → 본인 kakao userId가 admin 등록.
//   이후 식당 상세 페이지에서 "사장님 지정" 권한 노출.

import { useSyncExternalStore } from 'react';
import { useKakaoUser } from '@/utils/kakaoAuth';

const STORAGE_KEY = 'food-detector:admin-ids';

// 추후 production에서는 환경변수나 백엔드로 이전. 시연 단계에선 빈 배열 유지.
const HARDCODED_ADMINS: number[] = [];

let claimed: number[] = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): number[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'number') : [];
  } catch {
    return [];
  }
}

function saveToStorage() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(claimed));
  } catch {
    /* noop */
  }
}

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function claimAdmin(userId: number) {
  if (claimed.includes(userId)) return;
  claimed = [...claimed, userId];
  saveToStorage();
  emit();
}

export function revokeAdmin(userId: number) {
  if (!claimed.includes(userId)) return;
  claimed = claimed.filter((x) => x !== userId);
  saveToStorage();
  emit();
}

export function isAdmin(userId: number | null | undefined): boolean {
  if (userId == null) return false;
  return HARDCODED_ADMINS.includes(userId) || claimed.includes(userId);
}

export function useIsAdmin(): boolean {
  const user = useKakaoUser();
  const list = useSyncExternalStore(subscribe, () => claimed, () => claimed);
  if (!user) return false;
  return HARDCODED_ADMINS.includes(user.id) || list.includes(user.id);
}
