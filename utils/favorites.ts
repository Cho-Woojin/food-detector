// 좋아요(즐겨찾기) 공용 스토어
// - 메모리 Set + localStorage 영속화 (웹)
// - useSyncExternalStore로 React 컴포넌트 reactive 구독

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'food-detector:liked-ids';

let liked: Set<string> = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveToStorage() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...liked]));
  } catch {}
}

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getLikedIds(): Set<string> {
  return liked;
}

export function isLiked(id: string): boolean {
  return liked.has(id);
}

export function toggleLike(id: string): boolean {
  // 새 Set 인스턴스로 교체 — useSyncExternalStore가 reference equality로 변경 감지
  const next = new Set(liked);
  const nowLiked = !next.has(id);
  if (nowLiked) next.add(id); else next.delete(id);
  liked = next;
  saveToStorage();
  emit();
  return nowLiked;
}

export function setLiked(id: string, value: boolean) {
  if (liked.has(id) === value) return;
  toggleLike(id);
}

// React hooks
export function useLikedIds(): Set<string> {
  return useSyncExternalStore(subscribe, () => liked, () => liked);
}

export function useIsLiked(id: string | undefined | null): boolean {
  const set = useLikedIds();
  return id ? set.has(id) : false;
}
