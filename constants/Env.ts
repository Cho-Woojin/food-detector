// constants/Env.ts
// 환경 변수 중앙 관리

export const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY || '';

export const validateEnv = (): { ok: boolean; missing: string[] } => {
  const missing: string[] = [];
  if (!KAKAO_JS_KEY) missing.push('EXPO_PUBLIC_KAKAO_JS_KEY');
  return { ok: missing.length === 0, missing };
};

export const getKakaoKeyMasked = (): string => {
  if (!KAKAO_JS_KEY) return '(미설정)';
  if (KAKAO_JS_KEY.length < 8) return '(짧음)';
  return `${KAKAO_JS_KEY.slice(0, 4)}...${KAKAO_JS_KEY.slice(-4)}`;
};