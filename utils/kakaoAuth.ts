// 카카오 로그인 (JS SDK v2) — 웹 전용
// SDK v2부터 popup login() 제거 → redirect 방식(Kakao.Auth.authorize)만 지원
//
// 흐름:
//   1) loginWithKakao(): Kakao.Auth.authorize({redirectUri}) → 카카오 인증 페이지로 리다이렉트
//   2) 사용자 동의 후 ?code=XXX 로 redirectUri로 돌아옴
//   3) handleKakaoCallback(code): /oauth/token 호출 → access_token → /v2/user/me
//   4) 사용자 정보(닉네임·프로필 이미지)를 localStorage 캐시 + listeners emit
//   5) logoutFromKakao(): 캐시 비움

import { useSyncExternalStore } from 'react';

const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
const STORAGE_KEY = 'food-detector:kakao-user';
const KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY;

export type KakaoUser = {
  id: number;
  nickname: string;
  profileImage?: string;
};

let user: KakaoUser | null = loadFromStorage();
const listeners = new Set<() => void>();
let sdkPromise: Promise<any> | null = null;

function loadFromStorage(): KakaoUser | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToStorage() {
  if (typeof localStorage === 'undefined') return;
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** 카카오 JS SDK lazy load + init. 첫 호출 후 캐시. */
function ensureSDK(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('web only'));
  const w = window as any;
  if (w.Kakao?.isInitialized?.()) return Promise.resolve(w.Kakao);
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SDK_URL}"]`);
      const onReady = () => {
        if (!w.Kakao) return reject(new Error('Kakao SDK 로드 후 객체 없음'));
        if (!w.Kakao.isInitialized()) {
          if (!KEY) return reject(new Error('EXPO_PUBLIC_KAKAO_JS_KEY 미설정'));
          w.Kakao.init(KEY);
        }
        resolve(w.Kakao);
      };
      if (existing) { existing.addEventListener('load', onReady); return; }
      const s = document.createElement('script');
      s.src = SDK_URL;
      s.async = true;
      s.onload = onReady;
      s.onerror = () => reject(new Error('Kakao SDK 로드 실패'));
      document.head.appendChild(s);
    });
  }
  return sdkPromise;
}

/** redirectUri 결정 — origin + /auth/kakao */
function getRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin + '/auth/kakao';
}

/** "카카오로 시작하기" 클릭 시 호출. 리다이렉트가 발생하므로 함수는 return하지 않고 페이지가 떠남. */
export async function loginWithKakao(): Promise<void> {
  const Kakao = await ensureSDK();
  Kakao.Auth.authorize({
    redirectUri: getRedirectUri(),
    scope: 'profile_nickname,profile_image',
  });
}

/** /auth/kakao 콜백 페이지에서 호출. code → access_token → 사용자 정보. */
export async function handleKakaoCallback(code: string): Promise<KakaoUser | null> {
  if (!KEY) throw new Error('EXPO_PUBLIC_KAKAO_JS_KEY 미설정');
  // 1) code → access_token (카카오 토큰 엔드포인트)
  //    JS 키 + redirect_uri만 사용 (client_secret 미사용 시)
  const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: KEY,
      redirect_uri: getRedirectUri(),
      code,
    }),
  });
  if (!tokenRes.ok) {
    if (__DEV__) console.warn('[kakaoAuth] token exchange 실패', await tokenRes.text());
    return null;
  }
  const { access_token } = await tokenRes.json();

  // 2) SDK 토큰 set + 사용자 정보 조회
  const Kakao = await ensureSDK();
  Kakao.Auth.setAccessToken(access_token);
  const meRes = await Kakao.API.request({ url: '/v2/user/me' });
  const profile = meRes.kakao_account?.profile;
  const next: KakaoUser = {
    id: meRes.id,
    nickname: profile?.nickname ?? '카카오 사용자',
    profileImage: profile?.profile_image_url,
  };
  user = next;
  saveToStorage();
  emit();
  return next;
}

export async function logoutFromKakao(): Promise<void> {
  user = null;
  saveToStorage();
  emit();
  try {
    const Kakao = await ensureSDK();
    if (Kakao.Auth.getAccessToken()) Kakao.Auth.logout();
  } catch {}
}

export function getKakaoUser(): KakaoUser | null {
  return user;
}

export function useKakaoUser(): KakaoUser | null {
  return useSyncExternalStore(subscribe, () => user, () => user);
}
