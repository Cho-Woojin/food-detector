// Supabase 클라이언트 — 사용자 생성 데이터(리뷰·즐겨찾기·사장님 인증) 백엔드.
//
// Auth 전략 (PR feat/db-supabase 시점):
// - 로그인은 커스텀 카카오 OAuth(utils/kakaoAuth.ts)를 그대로 사용.
// - Supabase는 익명 anon key로 호출. 카카오 user.id를 user_id 칼럼에 박음.
// - 따라서 RLS는 시연용으로 anon에 관대. 진짜 보안은 향후 Supabase Auth 통일 시 강화.
//
// 식당 마스터 데이터(data/by-gu/*.json)는 정적 유지. DB로 안 올림.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // 개발 중에는 경고만. 프로덕션 빌드 시 .env에 박혀 있어야 함.
  if (typeof console !== 'undefined') {
    console.warn(
      '[supabase] EXPO_PUBLIC_SUPABASE_URL 또는 EXPO_PUBLIC_SUPABASE_ANON_KEY 미설정. .env.local 확인.',
    );
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // 우리는 Supabase Auth 안 쓰니 세션 관리 비활성.
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

/**
 * 카카오 user.id (number) → DB user_id 칼럼 (text) 변환.
 * 로그아웃 상태(undefined/null)면 null 반환.
 */
export function userIdFromKakao(
  kakaoId: number | string | undefined | null,
): string | null {
  if (kakaoId === undefined || kakaoId === null) return null;
  return String(kakaoId);
}
