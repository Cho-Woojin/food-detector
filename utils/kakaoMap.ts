// utils/kakaoMap.ts
// 카카오맵 SDK 동적 로더 (Web 환경 전용)
import { KAKAO_JS_KEY } from '@/constants/Env';

declare global {
  interface Window {
    kakao: any;
  }
}

let loadPromise: Promise<any> | null = null;

/**
 * 카카오맵 SDK를 동적으로 로드
 * - 한 번만 로드 (싱글톤 패턴)
 * - Web 환경에서만 작동
 * - Promise 반환 (await 가능)
 */
export const loadKakaoMap = (): Promise<any> => {
  // Web 환경 체크
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('카카오맵은 Web 환경에서만 작동합니다'));
  }
  
  // 이미 로드됨
  if (window.kakao && window.kakao.maps) {
    return Promise.resolve(window.kakao);
  }
  
  // 로딩 중
  if (loadPromise) {
    return loadPromise;
  }
  
  // 키 검증
  if (!KAKAO_JS_KEY) {
    return Promise.reject(new Error('카카오 JavaScript 키가 설정되지 않았습니다 (.env 확인)'));
  }
  
  loadPromise = new Promise((resolve, reject) => {
    // 기존 스크립트 태그 중복 방지
    const existing = document.getElementById('kakao-map-sdk');
    if (existing) {
      existing.remove();
    }
    
    const script = document.createElement('script');
    script.id = 'kakao-map-sdk';
    script.async = true;
    // autoload=false로 명시적 load 제어
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false&libraries=services,clusterer`;
    
    script.onload = () => {
      // SDK 로드되면 maps 명시적 초기화
      window.kakao.maps.load(() => {
        if (__DEV__) console.log('[KakaoMap] SDK 로드 완료');
        resolve(window.kakao);
      });
    };

    script.onerror = (error) => {
      if (__DEV__) console.error('[KakaoMap] SDK 로드 실패:', error);
      loadPromise = null;
      reject(new Error('카카오맵 SDK 로드 실패. 도메인 등록을 확인하세요.'));
    };
    
    document.head.appendChild(script);
  });
  
  return loadPromise;
};

/**
 * 카카오맵 SDK 로드 상태 확인
 */
export const isKakaoMapLoaded = (): boolean => {
  return typeof window !== 'undefined' && !!window.kakao && !!window.kakao.maps;
};