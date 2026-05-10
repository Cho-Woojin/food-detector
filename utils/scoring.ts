// utils/scoring.ts
// 식탐정 점수 체계 단일 원본. 자세한 명세는 data/SCORING_AND_SCHEMA.md.
//
// 종합 점수(0~100) = 데이터(0~50) + 사장님(0~25) + 사용자(0~25)
//
// - 데이터 점수: data/by-gu/*.json의 score 필드 (정적, scripts/split-restaurants.js에서 계산)
// - 사장님 점수: utils/owner.ts에서 최근 30일 청소 인증 건수 × 2.5
// - 사용자 점수: utils/reviews.ts에서 별점 평균 × 5
//
// 등급(GOLDEN/SILVER/BRONZE/ROTTEN)은 종합 점수 + 과락 조건으로 결정.

import type { GradeKey } from '@/constants/Restaurant';

// ===== 점수 만점 =====
export const SCORE_MAX = {
  DATA: 50,
  OWNER: 25,
  USER: 25,
  TOTAL: 100,
} as const;

// ===== 등급 임계값 =====
// SILVER 임계값은 "썩은치즈 면제 라인"도 겸함 — 이 값 이상이면 과락 있어도 BRONZE 이상.
export const GRADE_THRESHOLDS = {
  GOLDEN: 80,
  SILVER: 50,
} as const;

// ===== 썩은치즈 과락 조건 =====
export const ROTTEN_TRIGGER = {
  // 과락 1: 사용자 리뷰 ≥ N개 AND 사용자 점수 ≤ M/25
  USER_MIN_REVIEWS: 10,
  USER_MAX_SCORE: 10,
  // 과락 2: 다음 평가/처분 중 하나라도
  EVAL_FAIL: '중점관리업소' as const,
  PUNISH_FAILS: ['영업정지', '영업소폐쇄', '과태료', '과징금'] as const,
} as const;

// ===== 사장님 점수 =====
const OWNER_PER_VERIFICATION = 2.5;
const OWNER_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30일

export function ownerScoreFromCount(count30d: number): number {
  return Math.min(SCORE_MAX.OWNER, Math.max(0, count30d) * OWNER_PER_VERIFICATION);
}

export function countWithinWindow(timestamps: number[], now = Date.now()): number {
  return timestamps.filter((t) => now - t <= OWNER_WINDOW_MS).length;
}

// ===== 사용자 점수 =====
export function userScoreFromRatings(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  // 별점 1~5 → 점수 5~25. 만점 25 클램프.
  return Math.max(0, Math.min(SCORE_MAX.USER, avg * 5));
}

// ===== 종합 점수 =====
export function totalScoreOf(dataScore: number, ownerScore: number, userScore: number): number {
  const sum = dataScore + ownerScore + userScore;
  return Math.max(0, Math.min(SCORE_MAX.TOTAL, Math.round(sum)));
}

// ===== 등급 결정 =====
export type DeriveGradeInput = {
  score: number;            // 종합 점수 0~100
  flags?: { evalGrade?: string; punishTypes?: string };
  userScore?: number;       // 0~25, default 0
  userReviewCount?: number; // default 0
};

export function deriveGrade(input: DeriveGradeInput | number): GradeKey {
  // 숫자만 넘기면 score-only fallback (flags 없음 → 썩은 평가 불가, BRONZE로 떨어짐)
  if (typeof input === 'number') return deriveGrade({ score: input });

  const { score, flags = {}, userScore = 0, userReviewCount = 0 } = input;

  if (score >= GRADE_THRESHOLDS.GOLDEN) return 'GOLDEN';
  if (score >= GRADE_THRESHOLDS.SILVER) return 'SILVER';

  // score < SILVER 임계값 — 썩은치즈 조건 평가
  const userFail =
    userReviewCount >= ROTTEN_TRIGGER.USER_MIN_REVIEWS &&
    userScore <= ROTTEN_TRIGGER.USER_MAX_SCORE;

  const evalFail = flags.evalGrade === ROTTEN_TRIGGER.EVAL_FAIL;

  const punishTypes = (flags.punishTypes || '').split('|').filter(Boolean);
  const punishFail = punishTypes.some((t) =>
    (ROTTEN_TRIGGER.PUNISH_FAILS as readonly string[]).includes(t),
  );

  return userFail || evalFail || punishFail ? 'ROTTEN' : 'BRONZE';
}

// ===== 사람이 읽는 라벨 =====
export const GRADE_LABEL_KR: Record<GradeKey, string> = {
  GOLDEN: '골드 치즈',
  SILVER: '실버 치즈',
  BRONZE: '브론즈 치즈',
  ROTTEN: '썩은 치즈',
};

export const GRADE_PHRASE: Record<GradeKey, string> = {
  GOLDEN: '데이터·사장님·사용자 모두 우수',
  SILVER: '믿고 갈 수 있는 식당',
  BRONZE: '평범한 동네 식당',
  ROTTEN: '주의가 필요한 식당',
};
