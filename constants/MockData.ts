export type Grade = 'GOLDEN' | 'SILVER' | 'BRONZE' | 'INVESTIGATING';

export type AxisKey = 'hygiene' | 'admin' | 'trust' | 'review' | 'gap';

export type AxisScore = {
  key: AxisKey;
  label: string;
  source: string;
  score: number;
  max: number;
  rating: string;
  tone: 'green' | 'yellow' | 'red';
};

export type AdminAction = {
  date: string;
  original: string;
  translated: string;
  impact: string;
  severity: 'low' | 'medium' | 'high';
};

export type MenuGuide = {
  recommend: string[];
  avoid: string[];
  guideline: string;
  contextLine: string;
  updatedAt: string;
};

export type Review = {
  id: string;
  author: string;
  rating: number;
  date: string;
  body: string;
  hygieneTags: string[];
};

export type Restaurant = {
  id: string;
  name: string;
  category: string;
  grade: Grade;
  score: number;
  distance: string;
  district: string;
  address: string;
  phone: string;
  hours: string;
  closedDay: string;
  status: '영업중' | '영업종료' | '브레이크타임';
  highlight?: string;
  reviewCount: number;
  hygieneReviewCount: number;
  axes: AxisScore[];
  detectiveNote: string;
  scoreSummary: string;
  menuGuide: MenuGuide;
  adminActions: AdminAction[];
  reviews: Review[];
};

const goldenAxes = (): AxisScore[] => [
  { key: 'hygiene', label: '위생등급', source: '식약처', score: 28, max: 30, rating: '매우 우수', tone: 'green' },
  { key: 'admin', label: '행정처분', source: '서울시·자치구', score: 25, max: 30, rating: '양호', tone: 'green' },
  { key: 'trust', label: '신뢰 인증', source: '공공+사장님', score: 23, max: 25, rating: '우수', tone: 'green' },
  { key: 'review', label: '리뷰 분석', source: '자체+구글', score: 24, max: 30, rating: '우수', tone: 'green' },
  { key: 'gap', label: 'Gap 탐지', source: '정적 vs 동적', score: 14, max: 15, rating: '양호', tone: 'green' },
];

const silverAxes = (): AxisScore[] => [
  { key: 'hygiene', label: '위생등급', source: '식약처', score: 24, max: 30, rating: '우수', tone: 'green' },
  { key: 'admin', label: '행정처분', source: '서울시·자치구', score: 22, max: 30, rating: '양호', tone: 'green' },
  { key: 'trust', label: '신뢰 인증', source: '공공+사장님', score: 19, max: 25, rating: '양호', tone: 'green' },
  { key: 'review', label: '리뷰 분석', source: '자체+구글', score: 20, max: 30, rating: '양호', tone: 'green' },
  { key: 'gap', label: 'Gap 탐지', source: '정적 vs 동적', score: 11, max: 15, rating: '보통', tone: 'yellow' },
];

const bronzeAxes = (): AxisScore[] => [
  { key: 'hygiene', label: '위생등급', source: '식약처', score: 21, max: 30, rating: '양호', tone: 'green' },
  { key: 'admin', label: '행정처분', source: '서울시·자치구', score: 18, max: 30, rating: '보통', tone: 'yellow' },
  { key: 'trust', label: '신뢰 인증', source: '공공+사장님', score: 16, max: 25, rating: '보통', tone: 'yellow' },
  { key: 'review', label: '리뷰 분석', source: '자체+구글', score: 17, max: 30, rating: '보통', tone: 'yellow' },
  { key: 'gap', label: 'Gap 탐지', source: '정적 vs 동적', score: 9, max: 15, rating: '보통', tone: 'yellow' },
];

const investigatingAxes = (): AxisScore[] => [
  { key: 'hygiene', label: '위생등급', source: '식약처', score: 18, max: 30, rating: '보통', tone: 'yellow' },
  { key: 'admin', label: '행정처분', source: '서울시·자치구', score: 12, max: 30, rating: '주의', tone: 'red' },
  { key: 'trust', label: '신뢰 인증', source: '공공+사장님', score: 13, max: 25, rating: '보통', tone: 'yellow' },
  { key: 'review', label: '리뷰 분석', source: '자체+구글', score: 14, max: 30, rating: '보통', tone: 'yellow' },
  { key: 'gap', label: 'Gap 탐지', source: '정적 vs 동적', score: 7, max: 15, rating: '보통', tone: 'yellow' },
];

// 오늘 환경 (현재 mock): 기온 28.6°C, 습도 65%, 식중독 주의 — 가열 메뉴 우선
const baseContext = '오늘 28.6°C · 습도 65% · 식중독 주의 단계';
const baseUpdated = '12:00 기준';

const menuGuideHansik = (): MenuGuide => ({
  recommend: ['찌개류', '제육볶음', '국밥', '갈비탕'],
  avoid: ['육회', '회무침', '냉채류'],
  guideline: '오늘은 충분히 가열된 메뉴를 추천드려요. 날 음식은 잠시 미루는 게 안전합니다.',
  contextLine: baseContext,
  updatedAt: baseUpdated,
});

const menuGuideNoodle = (): MenuGuide => ({
  recommend: ['칼국수', '잔치국수', '온면'],
  avoid: ['비빔국수', '냉면 회 토핑'],
  guideline: '뜨거운 국물 메뉴가 안전해요. 차가운 비빔류는 실온 노출 위험이 있어요.',
  contextLine: baseContext,
  updatedAt: baseUpdated,
});

const menuGuidePorkCutlet = (): MenuGuide => ({
  recommend: ['치즈 돈까스', '왕돈까스', '카레 돈까스'],
  avoid: ['샐러드 사이드', '드레싱 소스 추가'],
  guideline: '튀긴 메인은 안전해요. 곁들임 생채소는 오늘 같은 날 컨디션에 따라 선택하세요.',
  contextLine: baseContext,
  updatedAt: baseUpdated,
});

const menuGuideNaengmyeon = (): MenuGuide => ({
  recommend: ['온면', '만두국'],
  avoid: ['물냉면 (날 계란)', '회 비빔 토핑'],
  guideline: '오늘은 차가운 면보다 따뜻한 메뉴가 안전합니다. 날 토핑은 피해주세요.',
  contextLine: baseContext,
  updatedAt: baseUpdated,
});

const menuGuideChinese = (): MenuGuide => ({
  recommend: ['짜장면', '짬뽕', '볶음밥', '탕수육'],
  avoid: ['해파리 냉채', '오향장육'],
  guideline: '가열 조리 메뉴 위주로 선택하세요. 차가운 전채는 오늘 컨디션상 권장하지 않아요.',
  contextLine: baseContext,
  updatedAt: baseUpdated,
});

const menuGuideGukbap = (): MenuGuide => ({
  recommend: ['뜨거운 국밥', '수육 (즉석 제공 시)'],
  avoid: ['반찬 무침류 장시간 보관', '겉절이'],
  guideline: '국물은 뜨거우면 안전해요. 무침 반찬은 만든 시간을 확인해주세요.',
  contextLine: baseContext,
  updatedAt: baseUpdated,
});

const reviewsClean = (): Review[] => [
  {
    id: 'r1',
    author: '맛집탐험가',
    rating: 5,
    date: '2025-04-29',
    body: '주방이 보이는데 정리정돈이 잘 되어 있어요. 음식도 항상 일정한 맛.',
    hygieneTags: ['주방 청결', '식기 깨끗'],
  },
  {
    id: 'r2',
    author: '동네주민',
    rating: 4,
    date: '2025-04-21',
    body: '매번 갈 때마다 신선한 재료를 쓰는 게 보여요.',
    hygieneTags: ['재료 신선'],
  },
];

const reviewsMixed = (): Review[] => [
  {
    id: 'r1',
    author: '리얼리뷰',
    rating: 4,
    date: '2025-04-30',
    body: '맛은 좋아요. 다만 점심 피크에 테이블 정리가 약간 늦은 적 있음.',
    hygieneTags: ['맛 좋음'],
  },
  {
    id: 'r2',
    author: '관찰자',
    rating: 3,
    date: '2025-04-15',
    body: '평균 이상이지만 화장실 청결도는 평범했어요.',
    hygieneTags: ['평균'],
  },
];

const reviewsCaution = (): Review[] => [
  {
    id: 'r1',
    author: '솔직후기',
    rating: 3,
    date: '2025-05-01',
    body: '맛은 추억의 맛. 다만 위생은 좀 더 신경 쓰셨으면 합니다.',
    hygieneTags: ['주의'],
  },
];

export const RESTAURANTS: Restaurant[] = [
  {
    id: '1',
    name: '행복한 밥상',
    category: '한식',
    grade: 'GOLDEN',
    score: 92,
    distance: '320m',
    district: '강남구 역삼동',
    address: '서울 강남구 역삼동 123-45',
    phone: '02-555-1234',
    hours: '11:00 - 22:00',
    closedDay: '일요일',
    status: '영업중',
    highlight: '5축 모두 양호',
    reviewCount: 248,
    hygieneReviewCount: 17,
    axes: goldenAxes(),
    detectiveNote: '5축 모두 양호. 강남구 역삼동에서 신뢰할 수 있는 한식집입니다.',
    scoreSummary: '92점 골든 치즈 — 5축 모두 양호한 검증된 한식집',
    menuGuide: menuGuideHansik(),
    adminActions: [],
    reviews: reviewsClean(),
  },
  {
    id: '2',
    name: '오늘의 국수',
    category: '국수',
    grade: 'SILVER',
    score: 87,
    distance: '480m',
    district: '강남구 삼성동',
    address: '서울 강남구 삼성동 78-9',
    phone: '02-555-2345',
    hours: '10:30 - 21:00',
    closedDay: '없음',
    status: '영업중',
    reviewCount: 142,
    hygieneReviewCount: 9,
    axes: silverAxes(),
    detectiveNote: '주방 위생 양호. 점심 회전율이 높아 재료 신선도가 우수합니다.',
    scoreSummary: '87점 실버 치즈 — 회전율 높고 재료 신선한 국수 전문점',
    menuGuide: menuGuideNoodle(),
    adminActions: [],
    reviews: reviewsClean(),
  },
  {
    id: '3',
    name: '강남 돈까스',
    category: '경양식',
    grade: 'GOLDEN',
    score: 91,
    distance: '850m',
    district: '강남구 신사동',
    address: '서울 강남구 신사동 11-22',
    phone: '02-555-3456',
    hours: '11:30 - 21:30',
    closedDay: '월요일',
    status: '영업중',
    highlight: '식약처 위생등급 우수',
    reviewCount: 312,
    hygieneReviewCount: 24,
    axes: goldenAxes(),
    detectiveNote: '튀김 온도 관리가 일관되고, 기름 교체 주기가 정확합니다.',
    scoreSummary: '91점 골든 치즈 — 튀김 온도·기름 관리가 우수한 돈까스 전문점',
    menuGuide: menuGuidePorkCutlet(),
    adminActions: [],
    reviews: reviewsClean(),
  },
  {
    id: '4',
    name: '진미냉면',
    category: '냉면',
    grade: 'GOLDEN',
    score: 95,
    distance: '320m',
    district: '종로구 청운효자동',
    address: '서울 종로구 자하문로 99',
    phone: '02-555-4567',
    hours: '10:30 - 21:00',
    closedDay: '없음',
    status: '영업중',
    highlight: '5축 모두 90+',
    reviewCount: 248,
    hygieneReviewCount: 17,
    axes: goldenAxes(),
    detectiveNote: '5축 모두 90점 이상. 청운효자동에서 가장 믿을 수 있는 냉면집입니다.',
    scoreSummary: '95점 골든 치즈 — 5축 모두 90+ 청운효자동 최고 평가 냉면집',
    menuGuide: menuGuideNaengmyeon(),
    adminActions: [],
    reviews: reviewsClean(),
  },
  {
    id: '5',
    name: '송도식당',
    category: '한식',
    grade: 'SILVER',
    score: 84,
    distance: '480m',
    district: '종로구 사직동',
    address: '서울 종로구 사직동 56-7',
    phone: '02-555-5678',
    hours: '11:00 - 22:00',
    closedDay: '일요일',
    status: '영업중',
    reviewCount: 167,
    hygieneReviewCount: 11,
    axes: silverAxes(),
    detectiveNote: '오랜 단골이 많은 동네 한식집. 위생 리뷰도 꾸준히 양호합니다.',
    scoreSummary: '84점 실버 치즈 — 단골이 인정한 동네 한식집, 꾸준한 위생 관리',
    menuGuide: menuGuideHansik(),
    adminActions: [],
    reviews: reviewsClean(),
  },
  {
    id: '6',
    name: '동성반점',
    category: '중식',
    grade: 'BRONZE',
    score: 76,
    distance: '720m',
    district: '종로구 부암동',
    address: '서울 종로구 부암동 33-4',
    phone: '02-555-6789',
    hours: '11:00 - 21:00',
    closedDay: '화요일',
    status: '영업중',
    reviewCount: 98,
    hygieneReviewCount: 6,
    axes: bronzeAxes(),
    detectiveNote: '맛은 좋지만 일부 위생 항목이 보통 수준. 개선 추적 중입니다.',
    scoreSummary: '76점 브론즈 치즈 — 맛은 좋으나 일부 위생 항목 개선 권장',
    menuGuide: menuGuideChinese(),
    adminActions: [
      {
        date: '2024-08-12',
        original: '식품위생법 제44조 제1항 위반 — 영업자 준수사항 미이행',
        translated: '주방 위생 점검 시 일부 청소·정리 미흡 사항이 발견됐어요. 즉시 시정 완료된 경미한 처분입니다.',
        impact: 'B축 -3점',
        severity: 'low',
      },
    ],
    reviews: reviewsMixed(),
  },
  {
    id: '8',
    name: '강남 짬뽕집',
    category: '중식',
    grade: 'BRONZE',
    score: 71,
    distance: '650m',
    district: '강남구 논현동',
    address: '서울 강남구 논현동 14-7',
    phone: '02-555-8910',
    hours: '11:00 - 22:00',
    closedDay: '없음',
    status: '영업중',
    reviewCount: 187,
    hygieneReviewCount: 5,
    axes: [
      { key: 'hygiene', label: '위생등급', source: '식약처', score: 22, max: 30, rating: '양호', tone: 'green' },
      { key: 'admin', label: '행정처분', source: '서울시·자치구', score: 14, max: 30, rating: '주의', tone: 'red' },
      { key: 'trust', label: '신뢰 인증', source: '공공+사장님', score: 17, max: 25, rating: '보통', tone: 'yellow' },
      { key: 'review', label: '리뷰 분석', source: '자체+구글', score: 18, max: 30, rating: '보통', tone: 'yellow' },
      { key: 'gap', label: 'Gap 탐지', source: '정적 vs 동적', score: 0, max: 15, rating: '중대', tone: 'red' },
    ],
    detectiveNote: '맛은 인정받지만 최근 행정처분 이력으로 B축 점수가 낮습니다. 식탐정이 모니터링 중.',
    scoreSummary: '71점 브론즈 치즈 — 행정처분 이력 있음, AI 번역으로 상세 확인 가능',
    menuGuide: menuGuideChinese(),
    adminActions: [
      {
        date: '2025-03-18',
        original: '식품위생법 제4조 제1호 위반 — 부패·변질 우려 식품 사용',
        translated: '재료 보관 상태에서 부패 우려가 있는 식품이 발견됐어요. 위생과 직결되는 중대 항목으로 점수 영향이 큽니다.',
        impact: 'B축 -10점',
        severity: 'high',
      },
      {
        date: '2024-12-02',
        original: '식품위생법 시행규칙 별표 17 제6호 위반 — 위생모·위생복 미착용',
        translated: '조리 종사자의 위생복·위생모 착용이 일부 미흡한 사항이 적발됐어요. 즉시 개선 가능한 경미한 처분입니다.',
        impact: 'B축 -3점',
        severity: 'low',
      },
      {
        date: '2024-09-14',
        original: '식품위생법 제3조 제1항 위반 — 영업장 청결 미흡 (재발)',
        translated: '영업장 청결이 기준에 미달했어요. 같은 항목 재발로 가중 처분이 적용됐습니다.',
        impact: 'B축 -5점',
        severity: 'medium',
      },
    ],
    reviews: reviewsMixed(),
  },
  {
    id: '7',
    name: '봉천이네',
    category: '국밥',
    grade: 'INVESTIGATING',
    score: 64,
    distance: '1.5km',
    district: '관악구 봉천동',
    address: '서울 관악구 봉천동 88-1',
    phone: '02-555-7890',
    hours: '06:00 - 22:00',
    closedDay: '없음',
    status: '영업중',
    reviewCount: 54,
    hygieneReviewCount: 3,
    axes: investigatingAxes(),
    detectiveNote: '최근 행정처분 이력이 있어 식탐정이 지켜보고 있습니다.',
    scoreSummary: '64점 수사 중 — 최근 행정처분 이력으로 식탐정이 모니터링',
    menuGuide: menuGuideGukbap(),
    adminActions: [
      {
        date: '2025-02-04',
        original: '식품위생법 제4조 위반 — 유통기한 경과 식품 사용',
        translated: '유통기한이 지난 재료를 사용한 사실이 적발됐어요. 위생과 직결되는 항목으로 점수 영향이 큽니다.',
        impact: 'B축 -8점',
        severity: 'high',
      },
      {
        date: '2024-11-20',
        original: '식품위생법 제3조 제1항 위반 — 영업장 청결 미흡',
        translated: '영업장 일부 구역의 청결 상태가 기준에 미달했어요. 위생 직결성은 중간 수준입니다.',
        impact: 'B축 -4점',
        severity: 'medium',
      },
    ],
    reviews: reviewsCaution(),
  },
];

export function getRestaurantById(id: string): Restaurant | undefined {
  return RESTAURANTS.find((r) => r.id === id);
}
