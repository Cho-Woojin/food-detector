// 카카오톡 공유 (Kakao Share API) — 친구에게 식당 상세 보고서 카드 메시지 전송.
// 카카오 로그인 없이도 동작 (사용자가 카카오톡 공유 시트에서 직접 친구 선택).
//
// 카카오 콘솔 설정:
//   - 제품 설정 → 카카오 로그인 SDK 사용 활성화 (이미 켜짐)
//   - 사이트 도메인에 vercel·localhost 등록 (이미 등록됨)
//
// 별도 동의 항목·비즈 채널 불필요. 일반 서비스에 적합.

const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
const KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY;

let sdkPromise: Promise<any> | null = null;

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

type ShareRestaurant = {
  id: string;
  name: string;
  cat: string;
  gu: string;
  score: number;
  grade: 'GOLDEN' | 'SILVER' | 'BRONZE' | 'ROTTEN';
};

const GRADE_LABEL: Record<ShareRestaurant['grade'], string> = {
  GOLDEN: '골드 치즈',
  SILVER: '실버 치즈',
  BRONZE: '브론즈 치즈',
  ROTTEN: '썩은 치즈',
};

const GRADE_IMG: Record<ShareRestaurant['grade'], string> = {
  GOLDEN: '/cheese/gold.png',
  SILVER: '/cheese/silver.png',
  BRONZE: '/cheese/bronze.png',
  ROTTEN: '/cheese/bronze.png',
};

export async function shareRestaurantToKakao(r: ShareRestaurant): Promise<boolean> {
  const Kakao = await ensureSDK();
  if (!Kakao.Share) {
    if (__DEV__) console.warn('[kakaoShare] Kakao.Share SDK 모듈 없음');
    return false;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const restaurantUrl = `${origin}/restaurant/${r.id}`;
  const imageUrl = origin + GRADE_IMG[r.grade];

  Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: r.name,
      description: `식탐정 ${r.score}점 · ${GRADE_LABEL[r.grade]} · ${r.cat} · ${r.gu}`,
      imageUrl,
      link: {
        mobileWebUrl: restaurantUrl,
        webUrl: restaurantUrl,
      },
    },
    buttons: [
      {
        title: '식당 보기',
        link: { mobileWebUrl: restaurantUrl, webUrl: restaurantUrl },
      },
      {
        title: '식탐정 열기',
        link: { mobileWebUrl: origin, webUrl: origin },
      },
    ],
  });
  return true;
}
