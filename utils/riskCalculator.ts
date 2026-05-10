// 식약처 식중독 예측지수 → 앱 위험단계(1~4) 산출.
// 정부 단계 체계와 동기화: 관심(<55)/주의(55~70)/경고(71~85)/위험(≥86).

import type { RiskLevel } from '@/constants/tokens';
import type { EnvData } from './api/env';

/**
 * 위험단계 산출 — 식약처 todayRisk2 (0~100) 점수를 정부 4단계로 매핑.
 *
 * 식약처 임계치:
 * - 1단계 관심: 55 미만
 * - 2단계 주의: 55 이상 ~ 71 미만
 * - 3단계 경고: 71 이상 ~ 86 미만
 * - 4단계 위험: 86 이상
 *
 * 기상 정보(기온·습도)는 식약처 점수 산출에 이미 반영되어 있어
 * 추가 가중하지 않음 — 그래야 정부 사이트의 단계 표시와 일치.
 */
export function calculateRiskLevel(env: EnvData): RiskLevel {
  return scoreToRiskLevel(env.foodPoison.today);
}

export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 86) return 4;
  if (score >= 71) return 3;
  if (score >= 55) return 2;
  return 1;
}

/**
 * 환경 카드용 톤 분류 — UI tone 색상 결정.
 */
export type Tone = 'success' | 'warning' | 'danger';

export function tempTone(temp: number): Tone {
  if (temp >= 30) return 'danger';
  if (temp >= 25 || temp < 0) return 'warning';
  return 'success';
}

export function humidityTone(h: number): Tone {
  if (h >= 80) return 'danger';
  if (h >= 60) return 'warning';
  return 'success';
}

export function foodPoisonTone(score: number): Tone {
  if (score >= 71) return 'danger';   // 경고·위험
  if (score >= 55) return 'warning';  // 주의
  return 'success';                   // 관심
}

export function pm10Tone(pm10: number): Tone {
  if (pm10 >= 151) return 'danger';
  if (pm10 >= 81) return 'warning';
  return 'success';
}

/**
 * 식약처 식중독지수 점수 → 한국어 라벨 (정부 4단계).
 */
export function foodPoisonLabel(score: number): string {
  if (score >= 86) return '위험';
  if (score >= 71) return '경고';
  if (score >= 55) return '주의';
  return '관심';
}

/**
 * 기온 라벨 (평년 비교 데이터 없어서 단순 분류로 대체).
 */
export function tempLabel(temp: number): string {
  if (temp >= 30) return '무더움';
  if (temp >= 25) return '더움';
  if (temp >= 18) return '쾌적';
  if (temp >= 10) return '선선함';
  if (temp >= 0) return '쌀쌀함';
  return '추움';
}

export function humidityLabel(h: number): string {
  if (h >= 80) return '높음';
  if (h >= 60) return '약간 높음';
  if (h >= 40) return '쾌적';
  return '건조';
}

export function pm10Label(pm10: number): string {
  if (pm10 >= 151) return '매우 나쁨';
  if (pm10 >= 81) return '나쁨';
  if (pm10 >= 31) return '보통';
  return '좋음';
}
