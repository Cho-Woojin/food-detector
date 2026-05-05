import { Platform } from 'react-native';

/**
 * Pretendard 폰트 패밀리 토큰.
 * - 웹: +html.tsx에서 CDN 로드 후 CSS 변수로 적용
 * - 네이티브: 시스템 폰트로 폴백 (필요 시 expo-font로 추후 추가)
 */
export const fontFamily = Platform.select({
  web: 'Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
  default: undefined,
});

export const typography = {
  fontFamily,
} as const;
