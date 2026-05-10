// 식약처 식중독지수 + 기온·습도 가중치 → 앱 위험단계(1~5) 산출.

import type { RiskLevel } from '@/constants/tokens';
import type { EnvData } from './api/env';

/**
 * 위험단계 산출.
 * - 식약처 todayRisk2 (0~100) 를 20점 단위로 5단계 매핑
 * - 폭염(30°C+) 또는 고온다습(25°C+ ∧ 70%+) 이면 한 단계 가중
 * - 1~5 범위로 clamp
 */
export function calculateRiskLevel(env: EnvData): RiskLevel {
  const score = env.foodPoison.today;
  const { temperature: t, humidity: h } = env.weather;

  let level = Math.ceil(score / 20);

  if (t >= 30 || (t >= 25 && h >= 70)) {
    level += 1;
  }

  if (level < 1) level = 1;
  if (level > 5) level = 5;

  return level as RiskLevel;
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
  if (score >= 71) return 'danger';
  if (score >= 41) return 'warning';
  return 'success';
}

export function pm10Tone(pm10: number): Tone {
  if (pm10 >= 151) return 'danger';
  if (pm10 >= 81) return 'warning';
  return 'success';
}

/**
 * 식약처 식중독지수 점수 → 한국어 라벨.
 */
export function foodPoisonLabel(score: number): string {
  if (score >= 86) return '위험';
  if (score >= 71) return '경고';
  if (score >= 51) return '주의';
  if (score >= 31) return '관심';
  return '낮음';
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
