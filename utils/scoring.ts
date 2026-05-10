// utils/scoring.ts
// 식탐정 점수 체계 단일 원본. 자세한 명세는 data/SCORING_AND_SCHEMA.md.
//
// 종합 점수(0~100) = 데이터(0~70) + 사장님(0~15) + 사용자(0~15)
//
// - 데이터 점수: data/by-gu/*.json의 score 필드 (정적, scripts/split-restaurants.js에서 계산)
// - 사장님 점수: utils/owner.ts에서 최근 30일 청소 인증 건수 × 1.5
// - 사용자 점수: utils/reviews.ts에서 별점 평균 × 3
//
// 등급(GOLDEN/SILVER/BRONZE/ROTTEN)은 종합 점수 + 과락 조건으로 결정.

import type { GradeKey } from '@/constants/Restaurant';

// ===== 점수 만점 =====
export const SCORE_MAX = {
  DATA: 70,
  OWNER: 15,
  USER: 15,
  TOTAL: 100,
} as const;

// ===== 등급 임계값 =====
// SILVER 임계값은 "썩은치즈 면제 라인"도 겸함 — 이 값 이상이면 과락 있어도 BRONZE 이상.
// GOLDEN 65: 위생등급 매우우수 단독(70)이 launch 시점에도 GOLDEN 진입 가능.
export const GRADE_THRESHOLDS = {
  GOLDEN: 65,
  SILVER: 50,
} as const;

// ===== 썩은치즈 과락 조건 =====
// (참고) 옛 룰은 punishTypes의 영업정지/영업소폐쇄/과태료/과징금을 트리거로 썼지만,
// 식약처 I2630 행정처분 텍스트를 AI(claude-opus-4-7)로 309건 분류한 결과:
// - 영업소폐쇄(241) + 영업허가·등록취소(24) ≈ 거의 다 폐업·시설철거 행정정리 (위생 무관)
// - 영업정지(44) 중 위생 직결은 단 3건 (이물·유통기한·무등록 식품). 나머지 41건은
//   청소년 주류·유흥접객·성매매 등 사회·도덕 위반 — 식중독 위험과 무관.
// → 처분 종류만으로 ROTTEN 판단하면 식탐정의 본질(위생·식중독)과 어긋남.
//   대신 by-gu의 flags.hygieneViolation (AI 분류 위생 직결 위반 bool) 사용.
//   자세한 분석은 data/violations-classified.json + data/SCORING_AND_SCHEMA.md.
//
// 위생관리평가(I1540) 트리거는 제거됨 (2026-05-10) — I1540은 식품제조·가공업체 평가라
// 음식점에 부적절. 자세한 건 data/SCORING_AND_SCHEMA.md.
export const ROTTEN_TRIGGER = {
  // 과락 1: 사용자 리뷰 ≥ N개 AND 사용자 점수 ≤ M/15
  USER_MIN_REVIEWS: 10,
  USER_MAX_SCORE: 6,  // 별점 평균 ≤ 2.0 (2.0 × 3 = 6/15)
  // 과락 2: AI 분류로 hygieneViolation=true (이물·유통기한·무등록 식품 등)
  // → flags.hygieneViolation 직접 체크
} as const;

// ===== 사장님 점수 =====
// 최근 30일 인증 건수 × 1.5, max 15 (= 10건 만점)
const OWNER_PER_VERIFICATION = 1.5;
const OWNER_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30일

export function ownerScoreFromCount(count30d: number): number {
  return Math.min(SCORE_MAX.OWNER, Math.max(0, count30d) * OWNER_PER_VERIFICATION);
}

export function countWithinWindow(timestamps: number[], now = Date.now()): number {
  return timestamps.filter((t) => now - t <= OWNER_WINDOW_MS).length;
}

// ===== 사용자 점수 =====
// 별점 1~5 → 점수 3~15 (avg × 3)
export function userScoreFromRatings(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return Math.max(0, Math.min(SCORE_MAX.USER, avg * 3));
}

// ===== 종합 점수 =====
export function totalScoreOf(dataScore: number, ownerScore: number, userScore: number): number {
  const sum = dataScore + ownerScore + userScore;
  return Math.max(0, Math.min(SCORE_MAX.TOTAL, Math.round(sum)));
}

// ===== 등급 결정 =====
export type DeriveGradeInput = {
  score: number;            // 종합 점수 0~100
  flags?: {
    punishTypes?: string;      // 보존 (UI 표시·통계용). ROTTEN 트리거에는 사용 안 함.
    hygieneViolation?: boolean; // AI 분류 결과 위생 직결 위반 — ROTTEN 트리거
  };
  userScore?: number;       // 0~15, default 0
  userReviewCount?: number; // default 0
};

export function deriveGrade(input: DeriveGradeInput | number): GradeKey {
  // 숫자만 넘기면 score-only fallback (flags 없음 → 썩은 평가 불가, BRONZE로 떨어짐)
  if (typeof input === 'number') return deriveGrade({ score: input });

  const { score, flags = {}, userScore = 0, userReviewCount = 0 } = input;

  if (score >= GRADE_THRESHOLDS.GOLDEN) return 'GOLDEN';   // 65+
  if (score >= GRADE_THRESHOLDS.SILVER) return 'SILVER';   // 50+

  // score < SILVER 임계값 — 썩은치즈 조건 평가
  const userFail =
    userReviewCount >= ROTTEN_TRIGGER.USER_MIN_REVIEWS &&
    userScore <= ROTTEN_TRIGGER.USER_MAX_SCORE;

  const hygieneFail = !!flags.hygieneViolation;

  return userFail || hygieneFail ? 'ROTTEN' : 'BRONZE';
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
