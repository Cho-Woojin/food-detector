// 위생 리뷰 공용 스토어
// - favorites.ts 패턴 (useSyncExternalStore + localStorage)
// - 백엔드 부재 동안 사용자 작성 리뷰를 로컬에 영속화
//
// 평가 모델: 전체 별점 + 별점에 따라 분기되는 긍정/부정 태그 (네이버 플레이스 식)
// - ★4-5 → POSITIVE_TAGS 중 1개 이상 필수
// - ★1-3 → NEGATIVE_TAGS 중 1개 이상 필수

import { useMemo, useSyncExternalStore } from 'react';
import type { Grade } from '@/constants/MockData';
import type { Restaurant } from '@/constants/Restaurant';
import { buildAxes, deriveGrade, recomputeScore } from '@/utils/adapter';
import { useKakaoUser } from '@/utils/kakaoAuth';

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
    // QuotaExceededError 가능성 — 사진 제거 후 재시도
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
// 위생 리뷰 → 식탐정 스코어 보정 체계 (v2)
// =====================================================================
//
// 기본 점수(baseScore) = 식약처 데이터 기반 5축 합산 (0..100)
//
// 위생 리뷰 N건 발생 시 두 갈래로 보정:
//
//   (1) 별점 보정 (Bayesian shrinkage)
//       사전 분포: 3.0점 가중치 PRIOR_WEIGHT=5건
//       보정 평균 = (별점합 + 5*3) / (N + 5)
//       ratingDelta = (보정 평균 − 3) × 4   →  대략 −8 ~ +8
//       핵심: 표본이 작을수록 3점에 수렴해 성급한 판단을 막음.
//         · 1건 5점  → 보정 평균 3.33 → +1.3점
//         · 10건 5점 → 보정 평균 4.33 → +5.3점
//         · 50건 5점 → 보정 평균 4.82 → +7.3점
//
//   (2) 이물질 페널티 (객관적 증거 — 별점보다 우선)
//       foreignReports = 이물질이 1개라도 있는 리뷰 수
//       foreignTotal   = 이물질 누적 건수 (벌레+머리카락+...)
//       foreignRatio   = foreignReports / N
//       foreignPenalty = −(foreignRatio × 25 + foreignTotal × 2)
//         · 1/1 리뷰 1건 발견 → −25 −2  = −27점
//         · 1/10 리뷰 1건       → −2.5 −2 ≈ −5점
//         · 5/10 리뷰 누적 5건  → −12.5 −10 = −22.5점
//
//   (3) 가산 차단 룰
//       이물질이 1건이라도 보고되면 ratingDelta의 + 값은 무시 (음수만 통과).
//       이유: 이물질은 객관적 증거. 별점 평균이 좋아도 위생 위험은 감산만 적용.
//
// 최종 = clamp(baseScore + ratingDelta + foreignPenalty, 0, 100)
// =====================================================================

const PRIOR_WEIGHT = 5;     // 사전 표본 수 (몇 건의 "중립 리뷰"가 사전에 있다고 보는가)
const PRIOR_RATING = 3;     // 사전 평균 별점 (중립 = 3점)
const RATING_RANGE = 4;     // 별점 1점 차이 = 4점 변화 (별점 1~5 → 보정 −8~+8)
const FOREIGN_RATIO_WEIGHT = 25;  // 이물질 보고 비율 페널티 상한
const FOREIGN_COUNT_WEIGHT = 2;   // 이물질 1건당 추가 페널티

export type ReviewScoreImpact = {
  delta: number;            // 최종 보정치 (정수, baseScore에 더해짐)
  ratingDelta: number;      // 별점 보정 컴포넌트
  foreignPenalty: number;   // 이물질 페널티 컴포넌트
  rawAvg: number;           // 표본 평균 별점 (원시)
  shrunkAvg: number;        // shrinkage 적용 후 평균
  foreignReports: number;   // 이물질 보고가 있는 리뷰 수
  foreignTotal: number;     // 이물질 누적 건수
  reviewCount: number;
};

export function computeReviewImpact(reviews: HygieneReview[]): ReviewScoreImpact {
  const n = reviews.length;
  if (n === 0) {
    return {
      delta: 0,
      ratingDelta: 0,
      foreignPenalty: 0,
      rawAvg: 0,
      shrunkAvg: 0,
      foreignReports: 0,
      foreignTotal: 0,
      reviewCount: 0,
    };
  }

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const rawAvg = sum / n;
  const shrunkAvg = (sum + PRIOR_WEIGHT * PRIOR_RATING) / (n + PRIOR_WEIGHT);
  let ratingDelta = (shrunkAvg - PRIOR_RATING) * RATING_RANGE;  // −8 ~ +8

  const foreignReports = reviews.filter(
    (r) => (r.foreignObjects?.length ?? 0) > 0,
  ).length;
  const foreignTotal = reviews.reduce(
    (acc, r) => acc + (r.foreignObjects?.length ?? 0),
    0,
  );
  const foreignRatio = foreignReports / n;
  const foreignPenalty = -(
    foreignRatio * FOREIGN_RATIO_WEIGHT +
    foreignTotal * FOREIGN_COUNT_WEIGHT
  );

  // 가산 차단: 이물질 보고가 있으면 별점이 + 보정을 주지 못함
  if (foreignReports > 0) ratingDelta = Math.min(0, ratingDelta);

  const delta = Math.round(ratingDelta + foreignPenalty);

  return {
    delta,
    ratingDelta: Math.round(ratingDelta * 10) / 10,
    foreignPenalty: Math.round(foreignPenalty * 10) / 10,
    rawAvg,
    shrunkAvg,
    foreignReports,
    foreignTotal,
    reviewCount: n,
  };
}

export function applyReviewImpact(baseScore: number, impact: ReviewScoreImpact): number {
  return Math.max(0, Math.min(100, baseScore + impact.delta));
}

// =====================================================================
// 5축 'D축(리뷰 분석)' 동적 점수 — 사용자 위생 리뷰를 5축에 직접 반영해
// 그래프 모양 ↔ 합산 점수 일관성 유지
// =====================================================================
//
// Bayesian shrinkage의 사전 평균을 "이 식당의 다른 축 평균"에 맞춤.
// → 평균 78%인 식당에 5점 리뷰 1건이 들어와도 D축이 78% 근처에서 살짝 위로 ↑
// → "좋은 리뷰인데 점수 떨어졌어?" UX 어색함 회피.
//
// 이물질 페널티는 D축에서 직접 차감 (1건당 4점, 30/약 7건이면 max 페널티)

const D_AXIS_MAX = 30;

type AxisTone = 'green' | 'yellow' | 'red';

export function reviewAxisFromImpact(
  impact: ReviewScoreImpact,
  baseScoreRatio: number, // 0..1 — 다른 축들의 평균 (raw baseScore/100)
): { score: number; rating: string; tone: AxisTone } {
  if (impact.reviewCount === 0) {
    return { score: 0, rating: '데이터 부족', tone: 'yellow' };
  }
  const PRIOR_W = 5;
  const priorRating = Math.max(1, Math.min(5, baseScoreRatio * 4 + 1)); // 0..1 → 1..5
  const sum = impact.rawAvg * impact.reviewCount;
  const shrunkAvg = (sum + PRIOR_W * priorRating) / (impact.reviewCount + PRIOR_W);
  const linear = ((shrunkAvg - 1) / 4) * D_AXIS_MAX;
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

// 점수 보정 — raw 사전 계산 점수를 진실로 두고 delta만 더함 (산식 충돌 방지)
// raw r.score는 식약처 5축 가중 합 사전 계산값. recomputeScore(buildAxes(r))과
// 다를 수 있으므로 절대 axes 합산으로 바꾸지 않음 — 분포 왜곡·UX 점프 회피.
//
// 등급은 항상 deriveGrade(보정 점수)로 파생 — 리뷰 0건이어도 동일한 임계값을 거치므로
// 지도 마커·바텀시트·상세·좋아요·검색·홈이 같은 식당에 대해 동일 cheese 등급을 보장.
//
// 5축 그래프의 D축은 시각적으로만 reviewAxisFromImpact로 변형 (그래프와 합산
// 점수가 수학적으로 100% 일치하진 않지만, 둘 다 "사용자 리뷰 반영" 표시).
export function adjustedScoreAndGrade(
  raw: Restaurant,
  impact: ReviewScoreImpact,
): { score: number; grade: Grade } {
  const score = applyReviewImpact(raw.score, impact);
  return { score, grade: deriveGrade(score) };
}

// React hooks — 전체 리뷰 (점수 보정용 — 백엔드 시 모든 사용자 집계 시뮬)
export function useReviews(): HygieneReview[] {
  return useSyncExternalStore(subscribe, () => reviews, () => reviews);
}

export function useReviewsFor(restaurantId: string | undefined | null): HygieneReview[] {
  const all = useReviews();
  if (!restaurantId) return [];
  return all.filter((r) => r.restaurantId === restaurantId);
}

// 본인이 작성한 리뷰만 — "내 리뷰" 화면용
// userId가 일치하거나 (익명/레거시 = userId null인 레코드는 본인 것 X) 안전하게 본인 매칭만
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
// 지도·좋아요·검색 등 다수 식당의 점수를 한 번에 동기화하기 위해 사용.
// 리뷰 변경 시 deps에 의해 재계산.
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

// 단일 식당의 보정 정보 — 미작성 시 0 impact 반환
export function useImpactFor(restaurantId: string | undefined | null): ReviewScoreImpact {
  const impactMap = useReviewImpactMap();
  return useMemo(() => {
    if (!restaurantId) return EMPTY_IMPACT;
    return impactMap.get(restaurantId) ?? EMPTY_IMPACT;
  }, [impactMap, restaurantId]);
}

const EMPTY_IMPACT: ReviewScoreImpact = {
  delta: 0,
  ratingDelta: 0,
  foreignPenalty: 0,
  rawAvg: 0,
  shrunkAvg: 0,
  foreignReports: 0,
  foreignTotal: 0,
  reviewCount: 0,
};
