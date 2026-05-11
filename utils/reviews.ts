// 위생 리뷰 공용 스토어 (Supabase 백엔드)
// - DB: public.reviews (Postgres)
// - 사진: Supabase Storage 'photos' bucket, 'reviews/' 폴더
// - 모듈 레벨 in-memory 캐시 + useSyncExternalStore (favorites/owner와 동일 패턴)
//
// 평가 모델: 별점(1~5) + 별점 분기 긍정/부정 태그 (네이버 플레이스 식)
// - ★4-5 → POSITIVE_TAGS 1개 이상 필수
// - ★1-3 → NEGATIVE_TAGS 1개 이상 필수
//
// 점수 산식 (data/SCORING_AND_SCHEMA.md):
//   사용자 점수 = 모든 리뷰 별점 평균 × 5  (0~25)
// 마이그레이션 후 의미 변화: "본인 평균"에서 "전체 사용자 평균"으로 자동 전환됨
// (cache가 모든 사용자 리뷰를 가져오므로 useImpactFor가 자연스레 전체 평균 반환).
//
// 이물질 신고는 점수에 직접 반영 X — UI에 강조 표시 + 운영 시그널 역할.

import { useMemo, useSyncExternalStore } from 'react';
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

// 위생등급제 8항목을 긍정/부정 표현으로 1:1 대응
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

// 이물질 발견 항목 — 심각 신호로 별점과 무관하게 별도 수집
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

// 새 모델 (2026-05): 4개 항목별 별점 + 방문 시점 칩 + 한 줄 메모
export type AxisRating = {
  table?: number;       // 테이블·식기 청결도
  food?: number;        // 음식 신선도·품질
  staff?: number;       // 직원 위생 (위생복·마스크)
  restroom?: number;    // 화장실 위생
};
export type VisitWindow = 'today' | 'week' | 'older'; // 오늘·어제 / 1주일 / 1주일+

// =====================================================================
// 타입
// =====================================================================

export type HygieneReview = {
  id: string;
  userId: string | null;
  userNickname?: string | null;        // 작성 시점의 카카오 nickname (denormalize)
  userProfileImage?: string | null;
  restaurantId: string;
  restaurantName: string;
  rating: number;            // 1..5 — 새 모델에서는 axisRatings 평균. 호환용 보존.
  tags: string[];            // (옛 모델 호환) 긍정/부정 태그 묶음
  foreignObjects: string[];  // (옛 모델 호환) 이물질 발견
  body: string;              // 한 줄 위생 메모 (50자 권장)
  photos: string[];          // public URL (Storage) 또는 base64 dataURL (legacy)
  visitDate: string;         // 방문일 'YYYY-MM-DD' (호환 보존, 새 모델에서는 visitWindow 기반 산출)
  createdAt: number;         // ms epoch
  // 신규 (옵셔널)
  axisRatings?: AxisRating;  // 4개 항목별 별점. 없으면 옛 rating만.
  visitWindow?: VisitWindow; // 방문 시점 칩
};

export type AddReviewInput = Omit<HygieneReview, 'id' | 'createdAt'>;

// =====================================================================
// In-memory cache + Supabase sync
// =====================================================================

let reviews: HygieneReview[] = [];
let loaded = false;
let loadingPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  ensureLoaded();
  return () => { listeners.delete(fn); };
}

async function loadFromSupabase(): Promise<void> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    if (__DEV__) console.warn('[reviews] load failed', error);
    return;
  }
  reviews = (data ?? []).map(rowToReview);
  loaded = true;
  emit();
}

function ensureLoaded() {
  if (loaded || loadingPromise) return;
  loadingPromise = loadFromSupabase().finally(() => {
    loadingPromise = null;
  });
}

function rowToReview(row: any): HygieneReview {
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
  };
}

// =====================================================================
// Public API
// =====================================================================

export function getReviews(): HygieneReview[] {
  return reviews;
}

export function getReviewsFor(restaurantId: string): HygieneReview[] {
  return reviews.filter((r) => r.restaurantId === restaurantId);
}

/**
 * 리뷰 작성. 사진은 base64 dataURL로 받아 Storage로 업로드 후 path 저장.
 * 실패 시 null. (사진 업로드 실패만 있으면 그 사진만 빠지고 리뷰는 정상 등록.)
 */
export async function addReview(input: AddReviewInput): Promise<HygieneReview | null> {
  // 1) 사진 먼저 Storage로 업로드 (실패한 사진은 결과에서 제외)
  const photoPaths = await uploadPhotos(input.photos ?? [], 'reviews');

  // 2) DB insert
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
    })
    .select()
    .single();

  if (error || !data) {
    if (__DEV__) console.warn('[reviews] insert failed', error);
    // 업로드된 사진 cleanup (best effort)
    if (photoPaths.length) await deletePhotos(photoPaths);
    return null;
  }

  const created = rowToReview(data);
  reviews = [created, ...reviews];
  emit();
  return created;
}

export async function removeReview(id: string): Promise<void> {
  // photo 삭제용 path 미리 fetch (cache의 photos는 publicUrl이라 storage path 아님)
  let storagePaths: string[] = [];
  const { data: row } = await supabase
    .from('reviews')
    .select('photo_paths')
    .eq('id', id)
    .maybeSingle();
  if (row?.photo_paths) storagePaths = row.photo_paths as string[];

  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) {
    if (__DEV__) console.warn('[reviews] delete failed', error);
    return;
  }
  if (storagePaths.length) await deletePhotos(storagePaths);

  reviews = reviews.filter((r) => r.id !== id);
  emit();
}

// =====================================================================
// 사용자 리뷰 → 사용자 점수(0~25) + 부가 시그널
// =====================================================================

export type ReviewScoreImpact = {
  userScore: number;        // 0~25 (별점 평균 × 5)
  reviewCount: number;
  rawAvg: number;           // 표본 평균 별점 (0 if no reviews)
  foreignReports: number;   // 이물질 보고가 있는 리뷰 수
  foreignTotal: number;     // 이물질 누적 건수
};

export const EMPTY_IMPACT: ReviewScoreImpact = {
  userScore: 0,
  reviewCount: 0,
  rawAvg: 0,
  foreignReports: 0,
  foreignTotal: 0,
};

export function computeReviewImpact(reviews: HygieneReview[]): ReviewScoreImpact {
  const n = reviews.length;
  if (n === 0) return EMPTY_IMPACT;

  const ratings = reviews.map((r) => r.rating);
  const sum = ratings.reduce((a, b) => a + b, 0);
  const rawAvg = sum / n;
  const userScore = userScoreFromRatings(ratings);

  const foreignReports = reviews.filter(
    (r) => (r.foreignObjects?.length ?? 0) > 0,
  ).length;
  const foreignTotal = reviews.reduce(
    (acc, r) => acc + (r.foreignObjects?.length ?? 0),
    0,
  );

  return {
    userScore,
    reviewCount: n,
    rawAvg,
    foreignReports,
    foreignTotal,
  };
}

// =====================================================================
// 종합 점수 + 등급 계산 (data + owner + user → grade)
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

export const EMPTY_REVIEW_IMPACT: ReviewScoreImpact = EMPTY_IMPACT;

// =====================================================================
// React hooks
// =====================================================================

export function useReviews(): HygieneReview[] {
  return useSyncExternalStore(subscribe, () => reviews, () => reviews);
}

export function useReviewsFor(restaurantId: string | undefined | null): HygieneReview[] {
  const all = useReviews();
  return useMemo(() => {
    if (!restaurantId) return [];
    return all.filter((r) => r.restaurantId === restaurantId);
  }, [all, restaurantId]);
}

// 본인이 작성한 리뷰만 — "내 리뷰" 화면용
export function useMyReviews(): HygieneReview[] {
  const all = useReviews();
  const user = useKakaoUser();
  return useMemo(() => {
    if (!user) return [];
    const uid = String(user.id);
    return all.filter((r) => r.userId === uid);
  }, [all, user]);
}

export function useMyReviewsFor(restaurantId: string | undefined | null): HygieneReview[] {
  const mine = useMyReviews();
  return useMemo(() => {
    if (!restaurantId) return [];
    return mine.filter((r) => r.restaurantId === restaurantId);
  }, [mine, restaurantId]);
}

// 모든 리뷰를 식당 id별로 그룹핑하여 보정 정보를 사전 계산
export function useReviewImpactMap(): Map<string, ReviewScoreImpact> {
  const all = useReviews();
  return useMemo(() => {
    const grouped = new Map<string, HygieneReview[]>();
    for (const r of all) {
      const list = grouped.get(r.restaurantId);
      if (list) list.push(r);
      else grouped.set(r.restaurantId, [r]);
    }
    const out = new Map<string, ReviewScoreImpact>();
    for (const [id, list] of grouped) {
      out.set(id, computeReviewImpact(list));
    }
    return out;
  }, [all]);
}

// 단일 식당의 보정 정보 — 미작성 시 빈 impact 반환
export function useImpactFor(restaurantId: string | undefined | null): ReviewScoreImpact {
  const impactMap = useReviewImpactMap();
  return useMemo(() => {
    if (!restaurantId) return EMPTY_IMPACT;
    return impactMap.get(restaurantId) ?? EMPTY_IMPACT;
  }, [impactMap, restaurantId]);
}

// 사용자 점수 만점 상수 (UI 표시용)
export const USER_SCORE_MAX = SCORE_MAX.USER;
