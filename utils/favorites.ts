// 좋아요(즐겨찾기) 공용 스토어 (Supabase 백엔드)
// - DB: public.favorites (user_id, restaurant_id, created_at)
// - 카카오 로그인 사용자 단위 — 로그아웃 상태에선 빈 Set + 토글 no-op
// - 모듈 레벨 in-memory 캐시 + useSyncExternalStore (reviews/owner와 동일 패턴)
// - 로그인 변경 시 자동 재 fetch (useLikedIds 안에서 useEffect)

import { useEffect, useSyncExternalStore } from 'react';
import { getKakaoUser, useKakaoUser } from '@/utils/kakaoAuth';
import { supabase } from '@/utils/supabase';

let liked: Set<string> = new Set();
let loadedForUserId: string | null = null;
let loadingPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  ensureLoadedForCurrentUser();
  return () => { listeners.delete(fn); };
}

async function loadFromSupabase(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('favorites')
    .select('restaurant_id')
    .eq('user_id', userId);
  if (error) {
    if (__DEV__) console.warn('[favorites] load failed', error);
    return;
  }
  liked = new Set((data ?? []).map((r: any) => String(r.restaurant_id)));
  loadedForUserId = userId;
  emit();
}

function ensureLoadedForCurrentUser() {
  const user = getKakaoUser();
  if (!user) {
    if (loadedForUserId !== null) {
      // 로그아웃 — 캐시 비움
      liked = new Set();
      loadedForUserId = null;
      emit();
    }
    return;
  }
  const uid = String(user.id);
  if (loadedForUserId === uid || loadingPromise) return;
  loadingPromise = loadFromSupabase(uid).finally(() => {
    loadingPromise = null;
  });
}

// =====================================================================
// Public API
// =====================================================================

export function getLikedIds(): Set<string> {
  return liked;
}

export function isLiked(id: string): boolean {
  return liked.has(id);
}

/**
 * 좋아요 토글. 카카오 로그인 필요 — 로그아웃 상태에선 no-op.
 * Optimistic update: cache 즉시 반영 + emit, 실패 시 rollback.
 */
export async function toggleLike(id: string): Promise<boolean> {
  const user = getKakaoUser();
  if (!user) {
    if (__DEV__) console.warn('[favorites] toggle without kakao login — ignored');
    return liked.has(id);
  }
  const uid = String(user.id);
  const wasLiked = liked.has(id);
  const nowLiked = !wasLiked;

  // Optimistic update
  const next = new Set(liked);
  if (nowLiked) next.add(id); else next.delete(id);
  liked = next;
  emit();

  if (nowLiked) {
    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: uid, restaurant_id: id });
    if (error) {
      // Rollback
      const rb = new Set(liked);
      rb.delete(id);
      liked = rb;
      emit();
      if (__DEV__) console.warn('[favorites] insert failed', error);
      return false;
    }
  } else {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', uid)
      .eq('restaurant_id', id);
    if (error) {
      // Rollback
      const rb = new Set(liked);
      rb.add(id);
      liked = rb;
      emit();
      if (__DEV__) console.warn('[favorites] delete failed', error);
      return true;
    }
  }
  return nowLiked;
}

export function setLiked(id: string, value: boolean) {
  if (liked.has(id) === value) return;
  // fire-and-forget
  void toggleLike(id);
}

// =====================================================================
// React hooks
// =====================================================================

export function useLikedIds(): Set<string> {
  const user = useKakaoUser();
  // 카카오 user 변경 시 favorites 다시 fetch
  useEffect(() => {
    ensureLoadedForCurrentUser();
  }, [user?.id]);
  return useSyncExternalStore(subscribe, () => liked, () => liked);
}

export function useIsLiked(id: string | undefined | null): boolean {
  const set = useLikedIds();
  return id ? set.has(id) : false;
}
