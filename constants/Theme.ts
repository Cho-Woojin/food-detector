// Food Detector - Production-grade Theme System
// Inspired by: Toss, Linear, Apple HIG, Material Design 3

import { Platform } from 'react-native';

// ============================================
// SPACING SCALE (4의 배수 시스템)
// ============================================
export const space = {
  none: 0,
  xs: 4,    // 아이콘 옆 여백
  sm: 8,    // 인접 요소 사이
  md: 12,   // 카드 내부 패딩 (작음)
  base: 16, // 표준 간격
  lg: 20,   // 섹션 사이
  xl: 24,   // 메인 패딩
  xxl: 32,  // 큰 섹션 사이
  huge: 48, // 페이지 시작·끝
} as const;

// ============================================
// TYPOGRAPHY SCALE (8단계)
// ============================================
export const typography = {
  // Display - 점수, 큰 숫자
  display: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  // Title - 화면 제목, Hero
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  // Heading - 섹션 제목
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  // Subheading - 카드 제목
  subheading: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  // Body - 본문
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  // Body Strong - 본문 강조
  bodyStrong: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  // Caption - 보조 정보
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  // Micro - 출처·메타
  micro: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '400' as const,
  },
} as const;

// ============================================
// SHADOW SYSTEM (3단계 깊이)
// ============================================
export const shadow = {
  // 살짝 떠있음 - 카드, 버튼
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
    },
    android: { elevation: 1 },
    web: { boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.02)' },
    default: {},
  }),
  
  // 명확히 떠있음 - 모달, sticky bar
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
    web: { boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)' },
    default: {},
  }),
  
  // 강하게 떠있음 - 다이얼로그, 팝오버
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
    web: { boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)' },
    default: {},
  }),
} as const;

// ============================================
// BORDER RADIUS (5단계)
// ============================================
export const radius = {
  none: 0,
  sm: 6,    // 작은 칩, 미니 버튼
  md: 10,   // 일반 버튼
  base: 12, // 기본 카드
  lg: 16,   // Hero 카드
  xl: 20,   // 모달
  full: 9999, // 원형
} as const;

// ============================================
// MOTION (3단계 애니메이션)
// ============================================
export const motion = {
  // 빠른 피드백 (탭, 호버)
  fast: 150,
  // 표준 (화면 전환, 카드 펼침)
  base: 250,
  // 부드러운 (모달 등장, 페이지 전환)
  slow: 400,
  
  // 이징 함수
  ease: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',  // Material standard
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',  // 들어옴 (등장)
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',  // 나감 (사라짐)
  },
} as const;

// ============================================
// PRESS FEEDBACK (탭 시 시각 피드백)
// ============================================
export const press = {
  // 모든 탭 가능 요소에 적용
  scale: 0.97,
  opacity: 0.7,
  duration: 150,
} as const;