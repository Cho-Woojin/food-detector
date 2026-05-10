// 위생 리뷰 공용 스토어
// - favorites.ts 패턴 (useSyncExternalStore + localStorage)
// - 백엔드 부재 동안 사용자 작성 리뷰를 로컬에 영속화
//
// 평가 모델: 별점(1~5) + 별점에 따라 분기되는 긍정/부정 태그 (네이버 플레이스 식)
// - ★4-5 → POSITIVE_TAGS 중 1개 이상 필수
// - ★1-3 → NEGATIVE_TAGS 중 1개 이상 필수
//
// 점수 산식 (data/SCORING_AND_SCHEMA.md):
//   사용자 점수 = 별점 평균 × 5  (0~25)
// 이물질 신고는 점수에 직접 반영 X — UI에 강조 표시 + 운영 시그널 역할.
// (구버전의 Bayesian shrinkage / 이물질 페널티 산식은 제거됨)

import { useMemo, useSyncExternalStore } from 'react';
import type { Restaurant, GradeKey } from '@/constants/Restaurant';
import { useKakaoUser } from '@/utils/kakaoAuth';
import {
  SCORE_MAX,
  deriveGrade,
  totalScoreOf,
  userScoreFromRatings,
} from '@/utils/scoring';

const STORAGE_KEY = 'food-detector:reviews';

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

export type HygieneReview = {
  id: string;
  userId: string | null;     // 카카오 user id (없으면 익명/legacy)
  restaurantId: string;
  restaurantName: string;
  rating: number;            // 1..5 (필수)
  tags: string[];            // 1개 이상 (필수, 긍정/부정 중 한 묶음)
  foreignObjects: string[];  // 이물질 발견 (선택, 비어있으면 미발견)
  body: string;              // 한줄평 (선택)
  photos: string[];          // base64 data URL (선택, canvas 리사이즈)
  visitDate: string;         // 방문일 'YYYY-MM-DD' (필수)
  createdAt: number;
};

let reviews: HygieneReview[] = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): HygieneReview[] {
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

// localStorage quota 초과 시 사진을 제거하고 다시 시도 — 메타는 잃지 않게
function saveToStorage() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch (e) {
    try {
      const stripped = reviews.map((r) => ({ ...r, photos: [] }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
      reviews = stripped;
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('저장 공간이 부족해 첨부 사진은 저장되지 않았어요. 메타 정보는 보존됐어요.');
      }
    } catch {
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('저장 공간이 부족해 리뷰 저장에 실패했어요. 기존 리뷰를 일부 삭제해주세요.');
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

export function getReviews(): HygieneReview[] {
  return reviews;
}

export function getReviewsFor(restaurantId: string): HygieneReview[] {
  return reviews.filter((r) => r.restaurantId === restaurantId);
}

export function addReview(input: Omit<HygieneReview, 'id' | 'createdAt'>): HygieneReview {
  const created: HygieneReview = {
    ...input,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  };
  reviews = [created, ...reviews];
  saveToStorage();
  emit();
  return created;
}

export function removeReview(id: string) {
  const next = reviews.filter((r) => r.id !== id);
  if (next.length === reviews.length) return;
  reviews = next;
  saveToStorage();
  emit();
}

// =====================================================================
// 사용자 리뷰 → 사용자 점수(0~25) + 부가 시그널
// =====================================================================

export type ReviewScoreImpact = {
  // 점수 컴포넌트
  userScore: number;        // 0~25 (별점 평균 × 5)
  reviewCount: number;
  rawAvg: number;           // 표본 평균 별점 (0 if no reviews)

  // 이물질 신고 (점수에는 영향 X, UI 강조용)
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
      evalGrade: raw.evalGrade,
      punishTypes: raw.punishTypes,
      hygieneViolation: raw.hygieneViolation,
    },
    userScore: impact.userScore,
    userReviewCount: impact.reviewCount,
  });
  return { score, grade };
}

// =====================================================================
// 5축 'D축(리뷰 분석)' 시각화 — 5축 레이더 차트의 D 슬롯에 표시
// =====================================================================

const D_AXIS_MAX = 30;
type AxisTone = 'green' | 'yellow' | 'red';

export function reviewAxisFromImpact(
  impact: ReviewScoreImpact,
  baseScoreRatio: number, // 0..1 — 다른 축들의 평균 (raw baseScore/100)
): { score: number; rating: string; tone: AxisTone } {
  if (impact.reviewCount === 0) {
    return { score: 0, rating: '데이터 부족', tone: 'yellow' };
  }
  // 별점 평균을 D축(0~30)에 선형 매핑 + 이물질 페널티 (시각용)
  const linear = ((impact.rawAvg - 1) / 4) * D_AXIS_MAX;
  const foreignPenalty = impact.foreignTotal * 4;
  const score = Math.max(0, Math.min(D_AXIS_MAX, Math.round(linear - foreignPenalty)));

  let rating: string;
  let tone: AxisTone;
  if (impact.foreignTotal > 0 && score < 16) { rating = '주의'; tone = 'red'; }
  else if (score >= 24) { rating = '우수'; tone = 'green'; }
  else if (score >= 16) { rating = '양호'; tone = 'green'; }
  else if (score >= 8)  { rating = '보통'; tone = 'yellow'; }
  else                  { rating = '주의'; tone = 'red'; }
  return { score, rating, tone };
}

// =====================================================================
// React hooks
// =====================================================================

export function useReviews(): HygieneReview[] {
  return useSyncExternalStore(subscribe, () => reviews, () => reviews);
}

export function useReviewsFor(restaurantId: string | undefined | null): HygieneReview[] {
  const all = useReviews();
  if (!restaurantId) return [];
  return all.filter((r) => r.restaurantId === restaurantId);
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
  const reviews = useReviews();
  return useMemo(() => {
    const grouped = new Map<string, HygieneReview[]>();
    for (const r of reviews) {
      const list = grouped.get(r.restaurantId);
      if (list) list.push(r);
      else grouped.set(r.restaurantId, [r]);
    }
    const out = new Map<string, ReviewScoreImpact>();
    for (const [id, list] of grouped) {
      out.set(id, computeReviewImpact(list));
    }
    return out;
  }, [reviews]);
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
