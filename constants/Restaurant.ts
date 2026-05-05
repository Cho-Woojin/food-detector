// constants/Restaurant.ts

export type GradeKey = 'GOLDEN' | 'SILVER' | 'BRONZE' | 'INVESTIGATING' | 'WARNING' | 'NEEDS_DATA';

export type CategoryKey = 
  | '한식' | '분식' | '치킨·호프' | '중식' | '일식' | '양식'
  | '카페·디저트' | '고기·구이' | '술집' | '뷔페' | '기타';

export type GuKey = '종로구' | '강남구' | '마포구';

export interface Restaurant {
  id: string;        // r000001
  name: string;
  cat: CategoryKey;
  gu: GuKey;
  addr: string;
  phone: string | null;
  lat: number;
  lng: number;
  score: number;     // 0-100
  grade: GradeKey;
  // 5축 점수
  a: number;         // 위생등급
  b: number;         // 행정처분 (음수)
  c: number;         // 신뢰 인증
  d: number;         // 리뷰 분석 (시연용 대부분 0)
  e: number;         // Gap 탐지 (시연용 대부분 0)
  // 인증
  hyg: 0 | 1;        // 위생등급 보유
  mod: 0 | 1;        // 모범음식점
  pun: number;       // 행정처분 횟수
  puT: string | null;// 처분 종류
  img: string;
  own: 0 | 1;        // 사장님 인증
}

export interface RestaurantIndex {
  meta: {
    totalCount: number;
    gus: GuKey[];
    gusCount: Record<GuKey, number>;
    categories: CategoryKey[];
    gradesDistribution: Record<GradeKey, number>;
    goldenDemo: string[];
    lastUpdated: string;
  };
  index: Array<{
    i: string;  // id
    n: string;  // name
    c: CategoryKey;
    g: GuKey;
    s: number;  // score
    gr: GradeKey;
  }>;
}