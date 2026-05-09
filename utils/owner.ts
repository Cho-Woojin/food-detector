// 사장님 모드 통합 스토어 — favorites/reviews와 동일한 패턴
// (useSyncExternalStore + localStorage). 4개 도메인을 한 파일에서 관리:
//   1) ownership      : 식당 → 사장님 kakao userId
//   2) ownerPosts     : 사장님이 직접 올리는 인증 게시글 (텍스트 + 사진)
//   3) ownerEdits     : 사장님이 수정한 가게 정보 (영업시간·전화 등)
//   4) reviewReplies  : 사용자 리뷰에 사장님이 다는 답글 (1리뷰 1답글)
//
// 점수 반영(C축 신뢰): 인증 게시글 N건 → 가산점. computeOwnerImpact() 참조.

import { useMemo, useSyncExternalStore } from 'react';

const OWNERSHIP_KEY = 'food-detector:ownership';
const POSTS_KEY = 'food-detector:owner-posts';
const EDITS_KEY = 'food-detector:owner-edits';
const REPLIES_KEY = 'food-detector:review-replies';

// ---------- 타입 ----------

export type OwnerPost = {
  id: string;
  restaurantId: string;
  userId: number;          // 작성자 kakao id (= 사장님)
  body: string;            // 한줄/여러줄 텍스트
  photo?: string;          // base64 data URL (선택)
  createdAt: number;
};

export type OwnerEdit = {
  address?: string;
  phone?: string;
  hours?: string;
  closedDay?: string;
  intro?: string;          // 가게 소개글 (장문 가능)
  updatedAt: number;
};

export type ReviewReply = {
  reviewId: string;
  userId: number;          // 답글 작성자 kakao id (= 사장님)
  body: string;
  updatedAt: number;
};

type OwnershipMap = Record<string, number>;          // restaurantId → kakao userId
type OwnerEditMap = Record<string, OwnerEdit>;        // restaurantId → edit
type ReviewReplyMap = Record<string, ReviewReply>;    // reviewId → reply

// ---------- 상태 ----------

let ownership: OwnershipMap = loadJSON<OwnershipMap>(OWNERSHIP_KEY, {});
let posts: OwnerPost[] = loadJSON<OwnerPost[]>(POSTS_KEY, []);
let edits: OwnerEditMap = loadJSON<OwnerEditMap>(EDITS_KEY, {});
let replies: ReviewReplyMap = loadJSON<ReviewReplyMap>(REPLIES_KEY, {});
const listeners = new Set<() => void>();

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, val: unknown) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // QuotaExceededError — 사진 큰 게시글이 누적된 경우. 사진만 제거하고 재시도.
    if (key === POSTS_KEY) {
      try {
        const stripped = (val as OwnerPost[]).map((p) => ({ ...p, photo: undefined }));
        localStorage.setItem(key, JSON.stringify(stripped));
        posts = stripped;
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert('저장 공간이 부족해 첨부 사진은 저장되지 않았어요.');
        }
      } catch {
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert('저장 공간이 부족해 게시글 저장에 실패했어요.');
        }
      }
    }
  }
}

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ============================================================
// 1) Ownership — 누가 어느 식당의 사장님인지
// ============================================================

export function setOwner(restaurantId: string, userId: number) {
  if (ownership[restaurantId] === userId) return;
  ownership = { ...ownership, [restaurantId]: userId };
  saveJSON(OWNERSHIP_KEY, ownership);
  emit();
}

export function clearOwner(restaurantId: string) {
  if (!(restaurantId in ownership)) return;
  const next = { ...ownership };
  delete next[restaurantId];
  ownership = next;
  saveJSON(OWNERSHIP_KEY, ownership);
  emit();
}

export function getOwnerId(restaurantId: string): number | null {
  return ownership[restaurantId] ?? null;
}

export function isOwnerOf(restaurantId: string, userId: number | null | undefined): boolean {
  if (userId == null) return false;
  return ownership[restaurantId] === userId;
}

// 훅 — 현재 사용자가 이 식당의 사장님인가?
export function useIsOwnerOf(
  restaurantId: string | undefined | null,
  userId: number | undefined | null,
): boolean {
  const map = useSyncExternalStore(subscribe, () => ownership, () => ownership);
  if (!restaurantId || userId == null) return false;
  return map[restaurantId] === userId;
}

// 훅 — 현재 사용자가 사장님으로 지정된 모든 식당 id 목록
// 내정보 "내 가게 관리" 메뉴 분기에 사용 (없음/1개/N개)
export function useMyOwnedRestaurantIds(userId: number | undefined | null): string[] {
  const map = useSyncExternalStore(subscribe, () => ownership, () => ownership);
  return useMemo(() => {
    if (userId == null) return [];
    return Object.entries(map)
      .filter(([, uid]) => uid === userId)
      .map(([rid]) => rid);
  }, [map, userId]);
}

// ============================================================
// 2) Owner Posts — 사장님 인증 게시글
// ============================================================

export function addOwnerPost(input: Omit<OwnerPost, 'id' | 'createdAt'>): OwnerPost {
  const created: OwnerPost = {
    ...input,
    id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  };
  posts = [created, ...posts];
  saveJSON(POSTS_KEY, posts);
  emit();
  return created;
}

export function removeOwnerPost(id: string) {
  const next = posts.filter((p) => p.id !== id);
  if (next.length === posts.length) return;
  posts = next;
  saveJSON(POSTS_KEY, posts);
  emit();
}

export function getOwnerPostsFor(restaurantId: string): OwnerPost[] {
  return posts.filter((p) => p.restaurantId === restaurantId);
}

export function useOwnerPosts(): OwnerPost[] {
  return useSyncExternalStore(subscribe, () => posts, () => posts);
}

export function useOwnerPostsFor(restaurantId: string | undefined | null): OwnerPost[] {
  const all = useOwnerPosts();
  return useMemo(() => {
    if (!restaurantId) return [];
    return all.filter((p) => p.restaurantId === restaurantId);
  }, [all, restaurantId]);
}

// ============================================================
// 3) Owner Edits — 가게 정보 수정 (영업시간/전화/휴무일)
// ============================================================

export function setOwnerEdit(restaurantId: string, partial: Partial<Omit<OwnerEdit, 'updatedAt'>>) {
  const prev = edits[restaurantId] ?? { updatedAt: 0 };
  const next: OwnerEdit = { ...prev, ...partial, updatedAt: Date.now() };
  edits = { ...edits, [restaurantId]: next };
  saveJSON(EDITS_KEY, edits);
  emit();
}

export function getOwnerEdit(restaurantId: string): OwnerEdit | null {
  return edits[restaurantId] ?? null;
}

export function useOwnerEditFor(restaurantId: string | undefined | null): OwnerEdit | null {
  const map = useSyncExternalStore(subscribe, () => edits, () => edits);
  if (!restaurantId) return null;
  return map[restaurantId] ?? null;
}

// ============================================================
// 4) Review Replies — 리뷰에 다는 사장님 답글
// ============================================================

export function setReviewReply(reviewId: string, userId: number, body: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    removeReviewReply(reviewId);
    return;
  }
  const next: ReviewReply = { reviewId, userId, body: trimmed, updatedAt: Date.now() };
  replies = { ...replies, [reviewId]: next };
  saveJSON(REPLIES_KEY, replies);
  emit();
}

export function removeReviewReply(reviewId: string) {
  if (!(reviewId in replies)) return;
  const next = { ...replies };
  delete next[reviewId];
  replies = next;
  saveJSON(REPLIES_KEY, replies);
  emit();
}

export function useReviewReply(reviewId: string | undefined | null): ReviewReply | null {
  const map = useSyncExternalStore(subscribe, () => replies, () => replies);
  if (!reviewId) return null;
  return map[reviewId] ?? null;
}

// ============================================================
// 5) Owner Score Impact — C축 신뢰 가산
// ============================================================
//
// 인증 게시글이 식탐정 스코어에 미치는 영향. 아래 정책으로 단순화:
//   0건  → +0
//   1건  → +3
//   2건  → +5
//   3건+ → +6 (상한)
//
// 리뷰 영향과 함께 합산되어 최종 점수에 반영. 최종 deriveGrade도 포함된 점수로 계산.

export type OwnerScoreImpact = {
  delta: number;
  postCount: number;
  hasOwner: boolean;
};

const EMPTY_OWNER_IMPACT: OwnerScoreImpact = { delta: 0, postCount: 0, hasOwner: false };

export function computeOwnerImpact(restaurantId: string): OwnerScoreImpact {
  const list = posts.filter((p) => p.restaurantId === restaurantId);
  const postCount = list.length;
  const hasOwner = restaurantId in ownership;
  let delta = 0;
  if (postCount >= 3) delta = 6;
  else if (postCount === 2) delta = 5;
  else if (postCount === 1) delta = 3;
  return { delta, postCount, hasOwner };
}

// 식당 다수의 impact를 한꺼번에 — 지도/좋아요/검색 등에서 사용
export function useOwnerImpactMap(): Map<string, OwnerScoreImpact> {
  const allPosts = useOwnerPosts();
  const own = useSyncExternalStore(subscribe, () => ownership, () => ownership);
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of allPosts) {
      counts.set(p.restaurantId, (counts.get(p.restaurantId) ?? 0) + 1);
    }
    const out = new Map<string, OwnerScoreImpact>();
    const ids = new Set<string>([...counts.keys(), ...Object.keys(own)]);
    for (const id of ids) {
      const postCount = counts.get(id) ?? 0;
      const hasOwner = id in own;
      let delta = 0;
      if (postCount >= 3) delta = 6;
      else if (postCount === 2) delta = 5;
      else if (postCount === 1) delta = 3;
      out.set(id, { delta, postCount, hasOwner });
    }
    return out;
  }, [allPosts, own]);
}

export function useOwnerImpactFor(restaurantId: string | undefined | null): OwnerScoreImpact {
  const map = useOwnerImpactMap();
  return useMemo(() => {
    if (!restaurantId) return EMPTY_OWNER_IMPACT;
    return map.get(restaurantId) ?? EMPTY_OWNER_IMPACT;
  }, [map, restaurantId]);
}
