// 사장님 모드 통합 스토어 (Supabase 백엔드)
// 4개 도메인:
//   1) ownership      : restaurant → 사장님 kakao userId (1:1)
//   2) ownerPosts     : 사장님 인증 게시글 (텍스트 + 사진 단수)
//   3) ownerEdits     : 가게 정보 수정 (영업시간 등) (1:1)
//   4) reviewReplies  : 리뷰 답글 (1리뷰 1답글)
//
// DB: public.{restaurant_ownership, owner_posts, owner_edits, review_replies}
// 사진: Supabase Storage 'photos' bucket, 'verifications/' 폴더 (단수, photo_path)
// 모듈 레벨 in-memory 캐시 + useSyncExternalStore (reviews/favorites와 동일).
//
// 점수 반영(C축 신뢰): 인증 게시글 N건 → 가산점.
//   0건 → +0,  1건 → +3,  2건 → +5,  3건+ → +6 (상한)

import { useMemo, useSyncExternalStore } from 'react';
import { supabase } from '@/utils/supabase';
import { countWithinWindow, ownerScoreFromCount } from '@/utils/scoring';
import { deletePhotos, publicUrlFor, uploadPhoto } from '@/utils/upload';

// =====================================================================
// 타입 (PR #7 시그니처 유지 — userId는 number)
// =====================================================================

export type OwnerPost = {
  id: string;
  restaurantId: string;
  userId: number;          // 카카오 user.id (number)
  body: string;
  photo?: string;          // publicUrl (Storage) 또는 base64 (legacy 호환)
  createdAt: number;
};

export type OwnerEdit = {
  address?: string;
  phone?: string;
  hours?: string;
  closedDay?: string;
  intro?: string;
  updatedAt: number;
};

export type ReviewReply = {
  reviewId: string;
  userId: number;
  body: string;
  updatedAt: number;
};

type OwnershipMap = Record<string, number>;
type OwnerEditMap = Record<string, OwnerEdit>;
type ReviewReplyMap = Record<string, ReviewReply>;

// =====================================================================
// In-memory caches + 통합 listener
// =====================================================================

let ownership: OwnershipMap = {};
let posts: OwnerPost[] = [];
let edits: OwnerEditMap = {};
let replies: ReviewReplyMap = {};

const loadedDomains = new Set<'ownership' | 'posts' | 'edits' | 'replies'>();
const loadingPromises = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function emit() { for (const fn of listeners) fn(); }

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  ensureAllLoaded();
  return () => { listeners.delete(fn); };
}

function ensureAllLoaded() {
  ensureLoaded('ownership', loadOwnership);
  ensureLoaded('posts', loadOwnerPosts);
  ensureLoaded('edits', loadOwnerEdits);
  ensureLoaded('replies', loadReviewReplies);
}

function ensureLoaded(
  key: 'ownership' | 'posts' | 'edits' | 'replies',
  fn: () => Promise<void>,
) {
  if (loadedDomains.has(key) || loadingPromises.has(key)) return;
  const p = fn().finally(() => { loadingPromises.delete(key); });
  loadingPromises.set(key, p);
}

async function loadOwnership(): Promise<void> {
  const { data, error } = await supabase.from('restaurant_ownership').select('*');
  if (error) {
    if (__DEV__) console.warn('[owner] load ownership failed', error);
    return;
  }
  const next: OwnershipMap = {};
  for (const row of (data ?? []) as any[]) {
    const uid = Number(row.user_id);
    if (!Number.isNaN(uid)) next[String(row.restaurant_id)] = uid;
  }
  ownership = next;
  loadedDomains.add('ownership');
  emit();
}

async function loadOwnerPosts(): Promise<void> {
  const { data, error } = await supabase
    .from('owner_posts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    if (__DEV__) console.warn('[owner] load posts failed', error);
    return;
  }
  posts = (data ?? []).map(rowToPost);
  loadedDomains.add('posts');
  emit();
}

async function loadOwnerEdits(): Promise<void> {
  const { data, error } = await supabase.from('owner_edits').select('*');
  if (error) {
    if (__DEV__) console.warn('[owner] load edits failed', error);
    return;
  }
  const next: OwnerEditMap = {};
  for (const row of (data ?? []) as any[]) {
    next[String(row.restaurant_id)] = {
      address: row.address ?? undefined,
      phone: row.phone ?? undefined,
      hours: row.hours ?? undefined,
      closedDay: row.closed_day ?? undefined,
      intro: row.intro ?? undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : 0,
    };
  }
  edits = next;
  loadedDomains.add('edits');
  emit();
}

async function loadReviewReplies(): Promise<void> {
  const { data, error } = await supabase.from('review_replies').select('*');
  if (error) {
    if (__DEV__) console.warn('[owner] load replies failed', error);
    return;
  }
  const next: ReviewReplyMap = {};
  for (const row of (data ?? []) as any[]) {
    const uid = Number(row.user_id);
    if (Number.isNaN(uid)) continue;
    next[String(row.review_id)] = {
      reviewId: String(row.review_id),
      userId: uid,
      body: row.body ?? '',
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : 0,
    };
  }
  replies = next;
  loadedDomains.add('replies');
  emit();
}

function rowToPost(row: any): OwnerPost {
  const userId = Number(row.user_id);
  const photoUrl = row.photo_path ? publicUrlFor(row.photo_path) : null;
  return {
    id: String(row.id),
    restaurantId: String(row.restaurant_id),
    userId: Number.isNaN(userId) ? 0 : userId,
    body: row.body ?? '',
    photo: photoUrl ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

// =====================================================================
// 1) Ownership
// =====================================================================

export async function setOwner(restaurantId: string, userId: number): Promise<void> {
  if (ownership[restaurantId] === userId) return;
  // Optimistic
  const prev = ownership[restaurantId];
  ownership = { ...ownership, [restaurantId]: userId };
  emit();

  const { error } = await supabase
    .from('restaurant_ownership')
    .upsert({
      restaurant_id: restaurantId,
      user_id: String(userId),
    });
  if (error) {
    if (__DEV__) console.warn('[owner] setOwner failed', error);
    if (prev !== undefined) {
      ownership = { ...ownership, [restaurantId]: prev };
    } else {
      const rb = { ...ownership };
      delete rb[restaurantId];
      ownership = rb;
    }
    emit();
  }
}

export async function clearOwner(restaurantId: string): Promise<void> {
  if (!(restaurantId in ownership)) return;
  const prev = ownership[restaurantId];
  const rb = { ...ownership };
  delete rb[restaurantId];
  ownership = rb;
  emit();

  const { error } = await supabase
    .from('restaurant_ownership')
    .delete()
    .eq('restaurant_id', restaurantId);
  if (error) {
    if (__DEV__) console.warn('[owner] clearOwner failed', error);
    ownership = { ...ownership, [restaurantId]: prev };
    emit();
  }
}

export function getOwnerId(restaurantId: string): number | null {
  return ownership[restaurantId] ?? null;
}

export function isOwnerOf(
  restaurantId: string,
  userId: number | null | undefined,
): boolean {
  if (userId == null) return false;
  return ownership[restaurantId] === userId;
}

export function useIsOwnerOf(
  restaurantId: string | undefined | null,
  userId: number | undefined | null,
): boolean {
  const map = useSyncExternalStore(subscribe, () => ownership, () => ownership);
  if (!restaurantId || userId == null) return false;
  return map[restaurantId] === userId;
}

export function useMyOwnedRestaurantIds(
  userId: number | undefined | null,
): string[] {
  const map = useSyncExternalStore(subscribe, () => ownership, () => ownership);
  return useMemo(() => {
    if (userId == null) return [];
    return Object.entries(map)
      .filter(([, uid]) => uid === userId)
      .map(([rid]) => rid);
  }, [map, userId]);
}

// =====================================================================
// 2) Owner Posts
// =====================================================================

export async function addOwnerPost(
  input: Omit<OwnerPost, 'id' | 'createdAt'>,
): Promise<OwnerPost | null> {
  // 사진 업로드 (단수, optional)
  let photoPath: string | null = null;
  if (input.photo) {
    photoPath = await uploadPhoto(input.photo, 'verifications');
  }

  const { data, error } = await supabase
    .from('owner_posts')
    .insert({
      restaurant_id: input.restaurantId,
      user_id: String(input.userId),
      body: input.body,
      photo_path: photoPath,
    })
    .select()
    .single();

  if (error || !data) {
    if (__DEV__) console.warn('[owner] addOwnerPost failed', error);
    if (photoPath) await deletePhotos([photoPath]);
    return null;
  }

  const created = rowToPost(data);
  posts = [created, ...posts];
  emit();
  return created;
}

export async function removeOwnerPost(id: string): Promise<void> {
  // 사진 path 미리 fetch (cache의 photo는 publicUrl이라 storage path 아님)
  let storagePath: string | null = null;
  const { data: row } = await supabase
    .from('owner_posts')
    .select('photo_path')
    .eq('id', id)
    .maybeSingle();
  if (row?.photo_path) storagePath = row.photo_path as string;

  const { error } = await supabase.from('owner_posts').delete().eq('id', id);
  if (error) {
    if (__DEV__) console.warn('[owner] removeOwnerPost failed', error);
    return;
  }
  if (storagePath) await deletePhotos([storagePath]);

  posts = posts.filter((p) => p.id !== id);
  emit();
}

export function getOwnerPostsFor(restaurantId: string): OwnerPost[] {
  return posts.filter((p) => p.restaurantId === restaurantId);
}

export function useOwnerPosts(): OwnerPost[] {
  return useSyncExternalStore(subscribe, () => posts, () => posts);
}

export function useOwnerPostsFor(
  restaurantId: string | undefined | null,
): OwnerPost[] {
  const all = useOwnerPosts();
  return useMemo(() => {
    if (!restaurantId) return [];
    return all.filter((p) => p.restaurantId === restaurantId);
  }, [all, restaurantId]);
}

// =====================================================================
// 3) Owner Edits
// =====================================================================

export async function setOwnerEdit(
  restaurantId: string,
  partial: Partial<Omit<OwnerEdit, 'updatedAt'>>,
): Promise<void> {
  const prev = edits[restaurantId];
  const next: OwnerEdit = {
    ...(prev ?? { updatedAt: 0 }),
    ...partial,
    updatedAt: Date.now(),
  };
  edits = { ...edits, [restaurantId]: next };
  emit();

  const { error } = await supabase
    .from('owner_edits')
    .upsert({
      restaurant_id: restaurantId,
      address: next.address ?? null,
      phone: next.phone ?? null,
      hours: next.hours ?? null,
      closed_day: next.closedDay ?? null,
      intro: next.intro ?? null,
      updated_at: new Date(next.updatedAt).toISOString(),
    });
  if (error) {
    if (__DEV__) console.warn('[owner] setOwnerEdit failed', error);
    if (prev) {
      edits = { ...edits, [restaurantId]: prev };
    } else {
      const rb = { ...edits };
      delete rb[restaurantId];
      edits = rb;
    }
    emit();
  }
}

export function getOwnerEdit(restaurantId: string): OwnerEdit | null {
  return edits[restaurantId] ?? null;
}

export function useOwnerEditFor(
  restaurantId: string | undefined | null,
): OwnerEdit | null {
  const map = useSyncExternalStore(subscribe, () => edits, () => edits);
  if (!restaurantId) return null;
  return map[restaurantId] ?? null;
}

// =====================================================================
// 4) Review Replies
// =====================================================================

export async function setReviewReply(
  reviewId: string,
  userId: number,
  body: string,
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) {
    await removeReviewReply(reviewId);
    return;
  }
  const next: ReviewReply = {
    reviewId,
    userId,
    body: trimmed,
    updatedAt: Date.now(),
  };
  const prev = replies[reviewId];
  replies = { ...replies, [reviewId]: next };
  emit();

  const { error } = await supabase
    .from('review_replies')
    .upsert({
      review_id: reviewId,
      user_id: String(userId),
      body: trimmed,
      updated_at: new Date(next.updatedAt).toISOString(),
    });
  if (error) {
    if (__DEV__) console.warn('[owner] setReviewReply failed', error);
    if (prev) {
      replies = { ...replies, [reviewId]: prev };
    } else {
      const rb = { ...replies };
      delete rb[reviewId];
      replies = rb;
    }
    emit();
  }
}

export async function removeReviewReply(reviewId: string): Promise<void> {
  if (!(reviewId in replies)) return;
  const prev = replies[reviewId];
  const rb = { ...replies };
  delete rb[reviewId];
  replies = rb;
  emit();

  const { error } = await supabase
    .from('review_replies')
    .delete()
    .eq('review_id', reviewId);
  if (error) {
    if (__DEV__) console.warn('[owner] removeReviewReply failed', error);
    replies = { ...replies, [reviewId]: prev };
    emit();
  }
}

export function useReviewReply(
  reviewId: string | undefined | null,
): ReviewReply | null {
  const map = useSyncExternalStore(subscribe, () => replies, () => replies);
  if (!reviewId) return null;
  return map[reviewId] ?? null;
}

// =====================================================================
// 5) Owner Score Impact (C축 신뢰)
// =====================================================================

export type OwnerScoreImpact = {
  delta: number;          // 0~25 (utils/scoring의 ownerScoreFromCount 산식)
  postCount: number;      // 최근 30일 인증 건수 (점수 산정 기준)
  totalPostCount: number; // 누적 전체 인증 건수 (UI 표시용)
  hasOwner: boolean;
};

const EMPTY_OWNER_IMPACT: OwnerScoreImpact = {
  delta: 0,
  postCount: 0,
  totalPostCount: 0,
  hasOwner: false,
};

export function computeOwnerImpact(restaurantId: string): OwnerScoreImpact {
  const list = posts.filter((p) => p.restaurantId === restaurantId);
  const recentCount = countWithinWindow(list.map((p) => p.createdAt));
  return {
    delta: ownerScoreFromCount(recentCount),
    postCount: recentCount,
    totalPostCount: list.length,
    hasOwner: restaurantId in ownership,
  };
}

export function useOwnerImpactMap(): Map<string, OwnerScoreImpact> {
  const allPosts = useOwnerPosts();
  const own = useSyncExternalStore(subscribe, () => ownership, () => ownership);
  return useMemo(() => {
    const recentByRid = new Map<string, number>();
    const totalByRid = new Map<string, number>();
    const now = Date.now();
    const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
    for (const p of allPosts) {
      totalByRid.set(p.restaurantId, (totalByRid.get(p.restaurantId) ?? 0) + 1);
      if (now - p.createdAt <= WINDOW_MS) {
        recentByRid.set(p.restaurantId, (recentByRid.get(p.restaurantId) ?? 0) + 1);
      }
    }
    const out = new Map<string, OwnerScoreImpact>();
    const ids = new Set<string>([...totalByRid.keys(), ...Object.keys(own)]);
    for (const id of ids) {
      const recent = recentByRid.get(id) ?? 0;
      out.set(id, {
        delta: ownerScoreFromCount(recent),
        postCount: recent,
        totalPostCount: totalByRid.get(id) ?? 0,
        hasOwner: id in own,
      });
    }
    return out;
  }, [allPosts, own]);
}

export function useOwnerImpactFor(
  restaurantId: string | undefined | null,
): OwnerScoreImpact {
  const map = useOwnerImpactMap();
  return useMemo(() => {
    if (!restaurantId) return EMPTY_OWNER_IMPACT;
    return map.get(restaurantId) ?? EMPTY_OWNER_IMPACT;
  }, [map, restaurantId]);
}
