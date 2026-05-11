// 위생 리뷰 공용 스토어 (Supabase 백엔드) — lazy fetch 패턴
//
// 구조:
//   - statsByRestaurant : 모든 식당의 집계 (review_count, avg_rating, foreign_*).
//                         앱 첫 load 시 view 한 번 fetch (chunked, ~7-8k행).
//                         지도 마커 색·등급 계산에 사용.
//   - reviewsByRestaurant : 가게별 리뷰 본문. 가게 상세 페이지 mount 시 그 가게만 fetch.
//                           평균 2~3건이라 한 가게당 ~10KB.
//   - myReviews : 본인 리뷰 목록. 카카오 로그인 사용자 단위로 fetch.
//
// 점수 산식 (data/SCORING_AND_SCHEMA.md):
//   사용자 점수 = avg_rating × 5  (0~25)
//
// 평가 모델: 별점(1~5) + 4축 별점(table/food/staff/restroom) + visit_window 칩
//
// 이물질 신고는 점수에 직접 반영 X — UI에 강조 표시 + 운영 시그널 역할.

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Restaurant, GradeKey } from '@/constants/Restaurant';
import { useKakaoUser } from '@/utils/kakaoAuth';
import {
  SCORE_MAX,
  deriveGrade,
  totalScoreOf,
  userScoreFromRatings,
} from '@/utils/scoring';
import { supabase } from '@/utils/supabase';
import { deletePhotos, publicUrlsFor, uploadPhotos } from '@/utils/upload';

// =====================================================================
// 상수 / 태그
// =====================================================================

export const POSITIVE_TAGS = [
  '직원 위생복 깔끔',
  '식재료 신선',
  '보관 온도 적절',
  '조리장 청결',
  '화장실 깨끗',
  '배달 포장 꼼꼼',
  '트레이·식기 청결',
  '메뉴 정보 충실',
] as const;

export const NEGATIVE_TAGS = [
  '직원 위생복 미흡',
  '식재료 상태 의심',
  '보관 온도 관리 부족',
  '조리장 어수선',
  '화장실 더러움',
  '배달 포장 허술',
  '트레이·식기 더러움',
  '메뉴 정보 부족',
] as const;

export const FOREIGN_OBJECTS = [
  '벌레',
  '머리카락',
  '곰팡이',
  '그 외 이물질',
] as const;

export type ReviewSentiment = 'positive' | 'negative';

export function sentimentFromRating(rating: number): ReviewSentiment | null {
  if (rating >= 4) return 'positive';
  if (rating >= 1) return 'negative';
  return null;
}

export function tagsFor(sentiment: ReviewSentiment): readonly string[] {
  return sentiment === 'positive' ? POSITIVE_TAGS : NEGATIVE_TAGS;
}

export type AxisRating = {
  table?: number;
  food?: number;
  staff?: number;
  restroom?: number;
};
export type VisitWindow = 'today' | 'week' | 'older';

// =====================================================================
// 타입
// =====================================================================

export type HygieneReview = {
  id: string;
  userId: string | null;
  userNickname?: string | null;
  userProfileImage?: string | null;
  restaurantId: string;
  restaurantName: string;
  rating: number;            // 1..5 (4축 평균 반올림)
  tags: string[];
  foreignObjects: string[];
  body: string;
  photos: string[];
  visitDate: string;
  createdAt: number;
  axisRatings?: AxisRating;
  visitWindow?: VisitWindow;
};

export type AddReviewInput = Omit<HygieneReview, 'id' | 'createdAt'>;

type Stats = {
  reviewCount: number;
  avgRating: number;
  foreignReports: number;
  foreignTotal: number;
};

// =====================================================================
// In-memory caches + 통합 listener
// =====================================================================

let statsByRestaurant: Map<string, Stats> = new Map();
let statsLoaded = false;
let statsLoadingPromise: Promise<void> | null = null;

let reviewsByRestaurant: Map<string, HygieneReview[]> = new Map();
const reviewsLoadingPromises = new Map<string, Promise<void>>();

let myReviews: HygieneReview[] = [];
let myReviewsLoadedFor: string | null = null;
let myReviewsLoadingPromise: Promise<void> | null = null;

const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  ensureStatsLoaded();
  return () => { listeners.delete(fn); };
}

// =====================================================================
// Row → HygieneReview 변환
// =====================================================================

function rowToReview(row: any): HygieneReview {
  const axis: AxisRating = {};
  if (row.axis_table != null) axis.table = Number(row.axis_table);
  if (row.axis_food != null) axis.food = Number(row.axis_food);
  if (row.axis_staff != null) axis.staff = Number(row.axis_staff);
  if (row.axis_restroom != null) axis.restroom = Number(row.axis_restroom);
  const visitWindow: VisitWindow | undefined =
    row.visit_window === 'today' || row.visit_window === 'week' || row.visit_window === 'older'
      ? row.visit_window
      : undefined;
  return {
    id: String(row.id),
    userId: row.user_id ?? null,
    userNickname: row.user_nickname ?? null,
    userProfileImage: row.user_profile_image ?? null,
    restaurantId: String(row.restaurant_id),
    restaurantName: row.restaurant_name ?? '',
    rating: Number(row.rating),
    tags: Array.isArray(row.tags) ? row.tags : [],
    foreignObjects: Array.isArray(row.foreign_objects) ? row.foreign_objects : [],
    body: row.body ?? '',
    photos: publicUrlsFor(row.photo_paths ?? []),
    visitDate: String(row.visit_date ?? ''),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    axisRatings: Object.keys(axis).length > 0 ? axis : undefined,
    visitWindow,
  };
}

// =====================================================================
// Stats (지도 마커용) — restaurant_review_stats view chunked load
// =====================================================================

async function loadStats(): Promise<void> {
  const PAGE = 1000;
  const next = new Map<string, Stats>();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('restaurant_review_stats')
      .select('*')
      .range(from, from + PAGE - 1);
    if (error) {
      if (__DEV__) console.warn('[reviews] stats load failed', error);
      return;
    }
    const chunk = data ?? [];
    for (const row of chunk) {
      next.set(String(row.restaurant_id), {
        reviewCount: Number(row.review_count) || 0,
        avgRating: Number(row.avg_rating) || 0,
        foreignReports: Number(row.foreign_reports) || 0,
        foreignTotal: Number(row.foreign_total) || 0,
      });
    }
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  statsByRestaurant = next;
  statsLoaded = true;
  emit();
}

function ensureStatsLoaded() {
  if (statsLoaded || statsLoadingPromise) return;
  statsLoadingPromise = loadStats().finally(() => {
    statsLoadingPromise = null;
  });
}

async function refreshStatsForRestaurant(restaurantId: string): Promise<void> {
  const { data, error } = await supabase
    .from('restaurant_review_stats')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  if (error) {
    if (__DEV__) console.warn('[reviews] stats refresh failed', restaurantId, error);
    return;
  }
  const next = new Map(statsByRestaurant);
  if (data) {
    next.set(restaurantId, {
      reviewCount: Number(data.review_count) || 0,
      avgRating: Number(data.avg_rating) || 0,
      foreignReports: Number(data.foreign_reports) || 0,
      foreignTotal: Number(data.foreign_total) || 0,
    });
  } else {
    next.delete(restaurantId);
  }
  statsByRestaurant = next;
  emit();
}

// =====================================================================
// Per-restaurant reviews — 가게 상세 진입 시 lazy fetch
// =====================================================================

async function loadReviewsForRestaurant(restaurantId: string): Promise<void> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });
  if (error) {
    if (__DEV__) console.warn('[reviews] per-restaurant load failed', restaurantId, error);
    return;
  }
  const list = (data ?? []).map(rowToReview);
  const next = new Map(reviewsByRestaurant);
  next.set(restaurantId, list);
  reviewsByRestaurant = next;
  emit();
}

function ensureReviewsLoadedFor(restaurantId: string) {
  if (reviewsByRestaurant.has(restaurantId) || reviewsLoadingPromises.has(restaurantId)) return;
  const p = loadReviewsForRestaurant(restaurantId).finally(() => {
    reviewsLoadingPromises.delete(restaurantId);
  });
  reviewsLoadingPromises.set(restaurantId, p);
}

// =====================================================================
// My reviews — 카카오 로그인 사용자 단위
// =====================================================================

async function loadMyReviews(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    if (__DEV__) console.warn('[reviews] my reviews load failed', error);
    return;
  }
  myReviews = (data ?? []).map(rowToReview);
  myReviewsLoadedFor = userId;
  emit();
}

function ensureMyReviewsLoaded(userId: string | null) {
  if (!userId) {
    if (myReviewsLoadedFor !== null) {
      myReviews = [];
      myReviewsLoadedFor = null;
      emit();
    }
    return;
  }
  if (myReviewsLoadedFor === userId || myReviewsLoadingPromise) return;
  myReviewsLoadingPromise = loadMyReviews(userId).finally(() => {
    myReviewsLoadingPromise = null;
  });
}

// =====================================================================
// Public API — Read
// =====================================================================

/**
 * @deprecated 전체 리뷰 캐시는 lazy fetch 패턴에서 제거됨.
 * 항상 빈 배열 반환. 가게별 리뷰는 useReviewsFor, 본인 리뷰는 useMyReviews 사용.
 */
export function getReviews(): HygieneReview[] {
  return [];
}

export function getReviewsFor(restaurantId: string): HygieneReview[] {
  return reviewsByRestaurant.get(restaurantId) ?? [];
}

// =====================================================================
// Public API — Write
// =====================================================================

/**
 * 리뷰 작성. 사진은 base64 dataURL로 받아 Storage로 업로드 후 path 저장.
 * 실패 시 null. (사진 업로드 실패만 있으면 그 사진만 빠지고 리뷰는 정상 등록.)
 */
export async function addReview(input: AddReviewInput): Promise<HygieneReview | null> {
  const photoPaths = await uploadPhotos(input.photos ?? [], 'reviews');

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      user_id: input.userId,
      user_nickname: input.userNickname ?? null,
      user_profile_image: input.userProfileImage ?? null,
      restaurant_id: input.restaurantId,
      restaurant_name: input.restaurantName,
      rating: input.rating,
      tags: input.tags,
      foreign_objects: input.foreignObjects,
      body: input.body || null,
      photo_paths: photoPaths,
      visit_date: input.visitDate,
      axis_table: input.axisRatings?.table ?? null,
      axis_food: input.axisRatings?.food ?? null,
      axis_staff: input.axisRatings?.staff ?? null,
      axis_restroom: input.axisRatings?.restroom ?? null,
      visit_window: input.visitWindow ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    if (__DEV__) console.warn('[reviews] insert failed', error);
    if (photoPaths.length) await deletePhotos(photoPaths);
    return null;
  }

  const created = rowToReview(data);

  // 1) 해당 가게 리뷰 캐시 앞에 추가 (캐시 있을 때만)
  if (reviewsByRestaurant.has(created.restaurantId)) {
    const list = reviewsByRestaurant.get(created.restaurantId) ?? [];
    const next = new Map(reviewsByRestaurant);
    next.set(created.restaurantId, [created, ...list]);
    reviewsByRestaurant = next;
  }

  // 2) 본인 리뷰 캐시 앞에 추가
  if (created.userId && created.userId === myReviewsLoadedFor) {
    myReviews = [created, ...myReviews];
  }

  // 3) stats 부분 갱신 (DB view는 자동 최신화되지만 캐시는 클라에서 동기화)
  void refreshStatsForRestaurant(created.restaurantId);

  emit();
  return created;
}

export async function removeReview(id: string): Promise<void> {
  // photo path + restaurant_id 미리 fetch (캐시의 photos는 publicUrl이라 storage path 아님)
  let storagePaths: string[] = [];
  let restaurantId: string | null = null;
  const { data: row } = await supabase
    .from('reviews')
    .select('photo_paths, restaurant_id')
    .eq('id', id)
    .maybeSingle();
  if (row) {
    storagePaths = (row.photo_paths ?? []) as string[];
    restaurantId = String(row.restaurant_id);
  }

  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) {
    if (__DEV__) console.warn('[reviews] delete failed', error);
    return;
  }
  if (storagePaths.length) await deletePhotos(storagePaths);

  // 캐시 정리
  if (restaurantId && reviewsByRestaurant.has(restaurantId)) {
    const list = reviewsByRestaurant.get(restaurantId) ?? [];
    const next = new Map(reviewsByRestaurant);
    next.set(restaurantId, list.filter((r) => r.id !== id));
    reviewsByRestaurant = next;
  }
  myReviews = myReviews.filter((r) => r.id !== id);

  // stats 부분 갱신
  if (restaurantId) void refreshStatsForRestaurant(restaurantId);

  emit();
}

// =====================================================================
// 사용자 리뷰 → 사용자 점수(0~25) + 부가 시그널
// =====================================================================

export type ReviewScoreImpact = {
  userScore: number;        // 0~25 (avg_rating × 5)
  reviewCount: number;
  rawAvg: number;
  foreignReports: number;
  foreignTotal: number;
};

export const EMPTY_IMPACT: ReviewScoreImpact = {
  userScore: 0,
  reviewCount: 0,
  rawAvg: 0,
  foreignReports: 0,
  foreignTotal: 0,
};

export const EMPTY_REVIEW_IMPACT: ReviewScoreImpact = EMPTY_IMPACT;

function statsToImpact(s: Stats): ReviewScoreImpact {
  return {
    userScore: Math.max(0, Math.min(SCORE_MAX.USER, s.avgRating * 5)),
    reviewCount: s.reviewCount,
    rawAvg: s.avgRating,
    foreignReports: s.foreignReports,
    foreignTotal: s.foreignTotal,
  };
}

/**
 * 리뷰 배열로 impact 계산 — 가게 페이지에서 useReviewsFor() 결과를 그대로 넣어 사용.
 * stats view와 산식 동일 (avg × 5).
 */
export function computeReviewImpact(reviews: HygieneReview[]): ReviewScoreImpact {
  const n = reviews.length;
  if (n === 0) return EMPTY_IMPACT;
  const ratings = reviews.map((r) => r.rating);
  const sum = ratings.reduce((a, b) => a + b, 0);
  const rawAvg = sum / n;
  const userScore = userScoreFromRatings(ratings);
  const foreignReports = reviews.filter((r) => (r.foreignObjects?.length ?? 0) > 0).length;
  const foreignTotal = reviews.reduce(
    (acc, r) => acc + (r.foreignObjects?.length ?? 0),
    0,
  );
  return { userScore, reviewCount: n, rawAvg, foreignReports, foreignTotal };
}

// =====================================================================
// 종합 점수 + 등급 (data + owner + user → grade)
// =====================================================================

export function adjustedScoreAndGrade(
  raw: Restaurant,
  impact: ReviewScoreImpact,
  ownerScore: number,
): { score: number; grade: GradeKey } {
  const dataScore = raw.dataScore ?? raw.score ?? 0;
  const score = totalScoreOf(dataScore, ownerScore, impact.userScore);
  const grade = deriveGrade({
    score,
    flags: {
      punishTypes: raw.punishTypes,
      hygieneViolation: raw.hygieneViolation,
    },
    userScore: impact.userScore,
    userReviewCount: impact.reviewCount,
  });
  return { score, grade };
}

// =====================================================================
// React hooks
// =====================================================================

/**
 * @deprecated 전체 리뷰 메모리 캐시 제거됨 (lazy fetch 패턴).
 * 항상 빈 배열 반환. 가게별은 useReviewsFor, 본인은 useMyReviews 사용.
 */
export function useReviews(): HygieneReview[] {
  return useSyncExternalStore(subscribe, () => EMPTY_REVIEW_ARRAY, () => EMPTY_REVIEW_ARRAY);
}
const EMPTY_REVIEW_ARRAY: HygieneReview[] = [];

/**
 * 가게 페이지 mount 시 그 가게의 리뷰만 fetch. mount/unmount에 따라 자동 호출.
 */
export function useReviewsFor(restaurantId: string | undefined | null): HygieneReview[] {
  const map = useSyncExternalStore(subscribe, () => reviewsByRestaurant, () => reviewsByRestaurant);
  useEffect(() => {
    if (restaurantId) ensureReviewsLoadedFor(restaurantId);
  }, [restaurantId]);
  if (!restaurantId) return EMPTY_REVIEW_ARRAY;
  return map.get(restaurantId) ?? EMPTY_REVIEW_ARRAY;
}

/**
 * 본인이 작성한 리뷰. 카카오 user 변경 시 자동 재fetch.
 */
export function useMyReviews(): HygieneReview[] {
  const user = useKakaoUser();
  useEffect(() => {
    ensureMyReviewsLoaded(user?.id != null ? String(user.id) : null);
  }, [user?.id]);
  return useSyncExternalStore(subscribe, () => myReviews, () => myReviews);
}

export function useMyReviewsFor(restaurantId: string | undefined | null): HygieneReview[] {
  const mine = useMyReviews();
  return useMemo(() => {
    if (!restaurantId) return EMPTY_REVIEW_ARRAY;
    return mine.filter((r) => r.restaurantId === restaurantId);
  }, [mine, restaurantId]);
}

/**
 * 모든 식당의 사용자 점수(impact) 맵 — stats view에서 직접 lookup.
 * 가게별 리뷰 본문은 안 받음. 지도 마커·즐겨찾기 카드 등에서 사용.
 */
export function useReviewImpactMap(): Map<string, ReviewScoreImpact> {
  const stats = useSyncExternalStore(subscribe, () => statsByRestaurant, () => statsByRestaurant);
  return useMemo(() => {
    const out = new Map<string, ReviewScoreImpact>();
    for (const [rid, s] of stats) {
      out.set(rid, statsToImpact(s));
    }
    return out;
  }, [stats]);
}

export function useImpactFor(restaurantId: string | undefined | null): ReviewScoreImpact {
  const map = useReviewImpactMap();
  return useMemo(() => {
    if (!restaurantId) return EMPTY_IMPACT;
    return map.get(restaurantId) ?? EMPTY_IMPACT;
  }, [map, restaurantId]);
}

// 사용자 점수 만점 상수 (UI 표시용)
export const USER_SCORE_MAX = SCORE_MAX.USER;
