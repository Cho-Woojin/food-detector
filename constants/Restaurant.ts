// constants/Restaurant.ts

// 4단계 치즈 등급 — utils/scoring.ts의 deriveGrade()로 결정.
// GOLDEN ≥ 80, SILVER 50~79, BRONZE < 50 (기본), ROTTEN < 50 + 과락 조건 (트랩 치즈)
export type GradeKey = 'GOLDEN' | 'SILVER' | 'BRONZE' | 'ROTTEN';

// 새 카테고리 (CSV 재분류)
export type CategoryKey =
  | '한식' | '분식' | '치킨' | '중식' | '일식' | '양식'
  | '카페디저트' | '고기' | '술집' | '뷔페' | '기타'
  | '패스트푸드' | '샌드위치' | '도시락' | '샐러드' | '아시안' | '찜탕';

// 서울 25개 자치구
export type GuKey =
  | '종로구' | '중구' | '용산구' | '성동구' | '광진구' | '동대문구' | '중랑구'
  | '성북구' | '강북구' | '도봉구' | '노원구' | '은평구' | '서대문구' | '마포구'
  | '양천구' | '강서구' | '구로구' | '금천구' | '영등포구' | '동작구' | '관악구'
  | '서초구' | '강남구' | '송파구' | '강동구';

// 위험 태그 (식중독·날것)
export type RiskTag = 'raw_fish' | 'raw_meat' | 'shellfish_raw' | 'egg_raw' | 'fugu' | 'raw_chicken';

export interface Restaurant {
  id: string;
  name: string;
  cat: CategoryKey;
  gu: GuKey;
  addr: string;
  phone: string | null;
  lat: number;
  lng: number;
  // 종합 점수(0~100). loadData에서는 dataScore(=초기 dataScore + 0 + 0)으로 설정,
  // 화면이 owner/user 반영해 재계산 (adjustedScoreAndGrade) 시 갱신.
  score: number;
  grade: GradeKey;
  // 점수 컴포넌트 (utils/scoring.ts와 일치)
  dataScore: number;   // 0~50 (정적, JSON에서 옴)
  ownerScore: number;  // 0~25 (런타임)
  userScore: number;   // 0~25 (런타임)
  // 5축 (adapter가 합성)
  a: number; b: number; c: number; d: number; e: number;
  hyg: 0 | 1;
  mod: 0 | 1;
  pun: number;
  puT: string | null;
  img: string;
  own: 0 | 1;
  // 신규
  riskTags?: RiskTag[];
  menuHints?: string[];
  geoFallback?: boolean;   // 좌표가 자치구 centroid 폴백인지
  // 트랩 치즈 과락 평가용 (런타임)
  userReviewCount?: number;
  // 데이터 점수 세부 (UI breakdown 표시용)
  // - hygiene: 식품안심업소 (구 위생등급) 가산
  // - model: 모범음식점 가산
  // - bonus: 보조 인증 (안심식당·착한가격업소 등) 가산
  // - punish: 행정처분 차감
  // (I1540 위생관리 평가는 식품제조 데이터로 음식점과 무관 → evalDelta 제거)
  dataBreakdown?: { hygiene: number; model: number; bonus: number; punish: number };
  // 행정처분/평가 플래그 (deriveGrade에서 사용)
  evalGrade?: string;
  punishTypes?: string;
  hygieneViolation?: boolean;   // AI 분류 위생 직결 위반 — ROTTEN 트리거
  punishReasons?: string;       // AI 분류 위반사유 요약 pipe-separated (UI 표시용)
  // 추가 인증 (대시보드 §3~§4) — 매칭 스크립트로 데이터 파이프라인에 적용 후 채워짐
  hygieneGrade?: '매우우수' | '우수' | '좋음' | '';  // 식약처 위생등급 3단계 세부 (Excel 매칭)
  safeRestaurant?: boolean;        // 안심식당 (MAFRA) 지정 여부
  safeRestaurantSince?: string;    // 안심식당 지정일 (YYYY-MM-DD)
  goodPrice?: boolean;             // 착한가격업소 (행안부) 지정 여부
  goodPriceMenus?: string;         // 착한가격 대표 메뉴 (pipe-separated)
}

export interface RestaurantIndex {
  meta: {
    totalCount: number;
    gus: GuKey[];
    gusCount: Record<GuKey, number>;
    guSlug: Record<GuKey, string>;
    categories: CategoryKey[];
    dataScoreDistribution?: Record<string, number>;
    riskDistribution?: Partial<Record<RiskTag, number>>;
    lastUpdated: string;
  };
  index: Array<{ i: string; n: string; c: CategoryKey; g: GuKey; s: number; gr: GradeKey }>;
}
