// 로그인 필요 액션 게이트 — 좋아요/리뷰/사장님 인증처럼 카카오 로그인이 전제된 기능을
// 비로그인 상태에서 눌렀을 때, 사용자에게 confirm을 띄우고 OK 누르면 카카오 인증으로 이동.
//
// 사용: const ok = await requireLogin('로그인하면 좋아요를 저장할 수 있어요'); if (!ok) ...
// 또는: gateAction(() => toggleLike(id), '좋아요는 로그인이 필요해요').

import { Platform, Alert } from 'react-native';
import { getKakaoUser, loginWithKakao } from '@/utils/kakaoAuth';

/**
 * 로그인 상태면 true 즉시 반환. 아니면 confirm을 띄우고
 * - OK → loginWithKakao() 호출 (리다이렉트 발생, 함수는 사실상 미반환)
 * - Cancel → false 반환
 */
export async function requireLogin(message: string): Promise<boolean> {
  if (getKakaoUser()) return true;

  const proceed = await confirmAsync('로그인이 필요해요', message);
  if (proceed) {
    await loginWithKakao();
    // 리다이렉트되면 여기로 안 돌아옴. mobile에선 promise 결과 따라옴.
    return !!getKakaoUser();
  }
  return false;
}

/**
 * 비로그인 시 안내·로그인 유도, 로그인 상태일 때만 fn() 실행.
 */
export async function gateAction<T>(fn: () => T | Promise<T>, message: string): Promise<T | undefined> {
  const ok = await requireLogin(message);
  if (!ok) return undefined;
  return await fn();
}

function confirmAsync(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: '취소', style: 'cancel', onPress: () => resolve(false) },
      { text: '로그인', onPress: () => resolve(true) },
    ]);
  });
}
