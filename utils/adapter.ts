// 실제 데이터(Restaurant)를 UI 화면이 기대하는 형태로 변환하는 어댑터.
// 누락된 필드는 grade/cat/score 기반으로 합성한다.

import { CategoryKey, GradeKey, Restaurant } from '@/constants/Restaurant';
import {
  AdminAction,
  AxisScore,
  Grade,
  MenuGuide,
  Restaurant as UIRestaurant,
  Review,
} from '@/constants/MockData';
import { deriveGrade as deriveGradeCore } from '@/utils/scoring';

// 등급 결정은 utils/scoring.ts가 단일 원본. 여기는 re-export로 사용성 유지.
export { deriveGrade } from '@/utils/scoring';

// ---------- 5축 ----------
// 각 축은 단순 ratio가 아니라, 원시 신호의 의미를 따져 등급/tone을 결정한다.
// 예: B축 0/30 = "행정처분 이력 없음" = 양호(green), 음수 = 처분 있음(severity별)
// 예: A축 0/30 = hyg=1이면 "보유"(green), hyg=0이면 "미인증"(yellow, 회색 의미).

const AXIS_MAX = { a: 30, b: 30, c: 25, d: 30, e: 15 } as const;

type Tone = 'green' | 'yellow' | 'red';
type Rated = { score: number; rating: string; tone: Tone };

// A축 — 위생등급 (식약처)
function rateHygiene(r: Restaurant): Rated {
  if (r.hyg === 1) return { score: 28, rating: '보유', tone: 'green' };
  return { score: 0, rating: '미인증', tone: 'yellow' };
}

// B축 — 행정처분 (서울시·자치구). 0 = 이력 없음 = 양호
function rateAdmin(r: Restaurant): Rated {
  if (r.pun === 0) return { score: 30, rating: '이력 없음', tone: 'green' };
  // 처분 종류별 심각도
  if (r.puT === '영업소폐쇄') return { score: 0, rating: '중대', tone: 'red' };
  if (r.puT === '영업정지') return { score: 5, rating: '주의', tone: 'red' };
  if (r.puT === '시정명령') return { score: 18, rating: '경미', tone: 'yellow' };
  if (r.puT === '과태료') return { score: 22, rating: '경미', tone: 'yellow' };
  // 그 외 처분
  const remaining = Math.max(0, 30 - r.pun * 10);
  return {
    score: remaining,
    rating: remaining >= 18 ? '경미' : remaining >= 10 ? '주의' : '중대',
    tone: remaining >= 18 ? 'yellow' : 'red',
  };
}

// C축 — 신뢰 인증 (공공+사장님)
function rateTrust(r: Restaurant): Rated {
  if (r.mod === 1 && r.own === 1) return { score: 23, rating: '매우 우수', tone: 'green' };
  if (r.mod === 1) return { score: 17, rating: '우수', tone: 'green' };
  if (r.own === 1) return { score: 12, rating: '양호', tone: 'green' };
  return { score: 0, rating: '미인증', tone: 'yellow' };
}

// D축 — 리뷰 분석. 시연용은 대부분 0 → 데이터 부족
function rateReview(r: Restaurant): Rated {
  if (r.d <= 0) return { score: 0, rating: '데이터 부족', tone: 'yellow' };
  const ratio = r.d / AXIS_MAX.d;
  if (ratio >= 0.7) return { score: r.d, rating: '우수', tone: 'green' };
  if (ratio >= 0.4) return { score: r.d, rating: '양호', tone: 'green' };
  return { score: r.d, rating: '보통', tone: 'yellow' };
}

// E축 — Gap 탐지 (정적 vs 동적). 시연용은 대부분 0 → 데이터 부족
function rateGap(r: Restaurant): Rated {
  if (r.e <= 0) return { score: 0, rating: '데이터 부족', tone: 'yellow' };
  const ratio = r.e / AXIS_MAX.e;
  if (ratio >= 0.7) return { score: r.e, rating: '양호', tone: 'green' };
  if (ratio >= 0.4) return { score: r.e, rating: '보통', tone: 'yellow' };
  return { score: r.e, rating: '주의', tone: 'red' };
}

export function buildAxes(r: Restaurant): AxisScore[] {
  const a = rateHygiene(r);
  const b = rateAdmin(r);
  const c = rateTrust(r);
  const d = rateReview(r);
  const e = rateGap(r);
  return [
    { key: 'hygiene', label: '위생등급', source: '식약처', max: AXIS_MAX.a, ...a },
    { key: 'admin', label: '행정처분', source: '서울시·자치구', max: AXIS_MAX.b, ...b },
    { key: 'trust', label: '신뢰 인증', source: '공공+사장님', max: AXIS_MAX.c, ...c },
    { key: 'review', label: '리뷰 분석', source: '자체+구글', max: AXIS_MAX.d, ...d },
    { key: 'gap', label: 'Gap 탐지', source: '정적 vs 동적', max: AXIS_MAX.e, ...e },
  ];
}

// ---------- AI 메뉴 가이드 ----------
const baseContext = '오늘 28.6°C · 습도 65% · 식중독 주의 단계';
const baseUpdated = '12:00 기준';

function buildMenuGuide(cat: CategoryKey): MenuGuide {
  const guides: Record<CategoryKey, Omit<MenuGuide, 'contextLine' | 'updatedAt'>> = {
    '한식': {
      recommend: ['찌개류', '국밥', '제육볶음', '갈비탕'],
      avoid: ['육회', '회무침', '냉채류'],
      guideline: '오늘은 충분히 가열된 메뉴를 추천드려요. 날 음식은 잠시 미루는 게 안전합니다.',
    },
    '중식': {
      recommend: ['짜장면', '짬뽕', '볶음밥', '탕수육'],
      avoid: ['해파리 냉채', '오향장육'],
      guideline: '가열 조리 메뉴 위주로. 차가운 전채는 오늘 컨디션상 권장하지 않아요.',
    },
    '일식': {
      recommend: ['우동', '돈부리', '카츠동', '라멘'],
      avoid: ['스시 (날생선)', '사시미', '회덮밥'],
      guideline: '오늘은 가열 메뉴가 안전해요. 날생선 메뉴는 피해주세요.',
    },
    '양식': {
      recommend: ['파스타', '리조또', '스테이크 (웰던)', '피자'],
      avoid: ['카르파초', '비프 타르타르', '레어 스테이크'],
      guideline: '잘 익힌 메뉴를 추천드려요. 날 고기·생선 메뉴는 오늘 피하세요.',
    },
    '분식': {
      recommend: ['떡볶이', '튀김', '오뎅', '김밥 (즉석)'],
      avoid: ['오래 진열된 김밥', '회 김밥'],
      guideline: '즉석에서 만들어주는 메뉴를 선택하세요. 진열 시간이 긴 음식은 피해주세요.',
    },
    '치킨': {
      recommend: ['후라이드', '양념치킨', '간장치킨'],
      avoid: ['생채소 사이드', '치즈볼 장시간 보관'],
      guideline: '튀긴 메인은 안전해요. 곁들임 생채소는 오늘 컨디션에 따라 선택하세요.',
    },
    '카페디저트': {
      recommend: ['커피', '구운 베이커리', '핫 디저트'],
      avoid: ['생크림 디저트', '치즈케이크 (장시간 진열)'],
      guideline: '뜨거운 음료와 구운 디저트가 안전해요.',
    },
    '고기': {
      recommend: ['바싹 구운 고기', '찌개', '국'],
      avoid: ['육회', '갈비살 (레어)', '날계란'],
      guideline: '충분히 익혀 드세요. 날 고기는 오늘 같은 날 위험합니다.',
    },
    '패스트푸드': {
      recommend: ['갓 조리한 버거', '튀김류'],
      avoid: ['오래된 사이드', '생야채 토핑 다량'],
      guideline: '주문 즉시 받은 음식 위주로. 진열된 사이드는 피하세요.',
    },
    '샌드위치': {
      recommend: ['따뜻한 샌드위치', '갓 만든 샌드위치'],
      avoid: ['오래 진열된 차가운 샌드위치', '날계란 토핑'],
      guideline: '주문 즉시 만든 따뜻한 메뉴를 선택하세요.',
    },
    '도시락': {
      recommend: ['갓 데운 도시락', '가열 반찬'],
      avoid: ['장시간 보관된 도시락', '날 반찬류'],
      guideline: '구입 후 빠르게 섭취하세요. 보관 시간이 길수록 위험합니다.',
    },
    '샐러드': {
      recommend: ['그릴드 단백질 추가 샐러드', '드레싱 즉시 사용'],
      avoid: ['오래 보관된 야채', '날계란 드레싱'],
      guideline: '신선도가 최우선. 채소는 식중독 위험이 상대적으로 높아요.',
    },
    '아시안': {
      recommend: ['쌀국수', '카레', '볶음 메뉴'],
      avoid: ['생야채 다량', '날계란 토핑'],
      guideline: '뜨거운 국물·볶음 메뉴 위주로. 생식 토핑은 피해주세요.',
    },
    '찜탕': {
      recommend: ['뜨거운 탕', '찜류'],
      avoid: ['미지근한 국물', '재가열한 탕'],
      guideline: '갓 끓인 뜨거운 메뉴가 가장 안전해요.',
    },
    '술집': {
      recommend: ['튀김 안주', '구이 안주', '찌개'],
      avoid: ['회', '육회', '냉채'],
      guideline: '안주는 가열된 메뉴로. 날 음식과 술 조합은 오늘 위험합니다.',
    },
    '뷔페': {
      recommend: ['갓 만든 핫 메뉴', '국·찌개'],
      avoid: ['샐러드 바', '회 코너', '오래 진열된 음식'],
      guideline: '진열 시간이 짧고 뜨거운 메뉴를 선택하세요.',
    },
    '기타': {
      recommend: ['가열 메뉴 위주'],
      avoid: ['날 음식'],
      guideline: '오늘은 충분히 가열된 메뉴 위주로 선택하세요.',
    },
  };
  return { ...guides[cat], contextLine: baseContext, updatedAt: baseUpdated };
}

// ---------- AI 행정처분 번역 ----------
function buildAdminActions(r: Restaurant): AdminAction[] {
  if (r.pun === 0 || !r.puT) return [];
  const original = `식품위생법 위반 — ${r.puT}`;
  let translated: string;
  let severity: 'low' | 'medium' | 'high';
  let impact: string;

  switch (r.puT) {
    case '영업소폐쇄':
      translated = '영업소 폐쇄 처분이 내려진 이력이 있어요. 위생 관련 가장 무거운 처분입니다.';
      severity = 'high';
      impact = `B축 -50점`;
      break;
    case '영업정지':
      translated = '일정 기간 영업정지 처분을 받았어요. 위생 직결성이 높은 중대 항목입니다.';
      severity = 'high';
      impact = `B축 -20점`;
      break;
    case '시정명령':
      translated = '위생 점검에서 시정명령을 받았어요. 즉시 개선이 가능한 중간 수준 처분입니다.';
      severity = 'medium';
      impact = `B축 -10점`;
      break;
    case '과태료':
      translated = '경미한 위반으로 과태료가 부과됐어요. 위생 직결성은 낮은 편입니다.';
      severity = 'low';
      impact = `B축 -5점`;
      break;
    default:
      translated = `${r.puT} 처분 이력이 있어요. 식탐정이 모니터링 중입니다.`;
      severity = 'medium';
      impact = `B축 -10점`;
  }

  // pun 횟수만큼 generate (날짜는 mock)
  const dates = ['2025-03-18', '2024-11-20', '2024-08-12', '2024-04-05', '2023-12-15'];
  return Array.from({ length: Math.min(r.pun, 3) }).map((_, i) => ({
    date: dates[i] ?? '2024-01-01',
    original,
    translated,
    impact,
    severity,
  }));
}

// ---------- 리뷰 (mock) ----------
function buildReviews(grade: GradeKey): Review[] {
  if (grade === 'GOLDEN' || grade === 'SILVER') {
    return [
      {
        id: 'r1', author: '맛집탐험가', rating: 5, date: '2025-04-29',
        body: '주방이 깔끔하고 음식 맛이 일정해요. 다시 방문 의사 있습니다.',
        hygieneTags: ['주방 청결', '식기 깨끗'],
      },
      {
        id: 'r2', author: '동네주민', rating: 4, date: '2025-04-21',
        body: '재료가 신선해요. 가족 단위로 자주 가는 곳입니다.',
        hygieneTags: ['재료 신선'],
      },
    ];
  }
  if (grade === 'BRONZE') {
    return [
      {
        id: 'r1', author: '리얼리뷰', rating: 4, date: '2025-04-30',
        body: '맛은 좋은데 위생은 보통이에요. 점심 시간엔 분주해 보입니다.',
        hygieneTags: ['평균'],
      },
    ];
  }
  return [
    {
      id: 'r1', author: '솔직후기', rating: 3, date: '2025-05-01',
      body: '맛은 추억의 맛. 다만 위생은 좀 더 신경 쓰셨으면 합니다.',
      hygieneTags: ['주의'],
    },
  ];
}

// ---------- 주소 → 동/지역 ----------
function extractDistrict(r: Restaurant): string {
  // "서울특별시 강남구 자곡로 186, ..." → "강남구 자곡동" (간단 추출)
  const m = r.addr.match(/([가-힣]+동)/);
  return m ? `${r.gu} ${m[1]}` : r.gu;
}

// ---------- 영업 시간 (mock) ----------
function defaultHours(cat: CategoryKey): string {
  if (cat === '카페디저트') return '08:00 - 22:00';
  if (cat === '술집') return '17:00 - 02:00';
  if (cat === '치킨') return '15:00 - 24:00';
  if (cat === '패스트푸드') return '10:00 - 23:00';
  return '11:00 - 22:00';
}

// ---------- 점수 재계산 (5축 차트 시각화 전용) ----------
// 5축 그래프(SpiderChart5)에 들어갈 정규화 점수를 다시 계산. 실제 종합 점수와 별개.
// "데이터 부족" 축을 분모에서 제외해 실제로 측정된 항목만으로 정규화한다.
// 이렇게 해야 hyg=1·pun=0 같은 평범한 식당도 BRONZE 이상으로 분류된다.
export function recomputeScore(axes: AxisScore[]): number {
  const measured = axes.filter((a) => a.rating !== '데이터 부족');
  if (measured.length === 0) return 0;
  const sum = measured.reduce((acc, a) => acc + a.score, 0);
  const max = measured.reduce((acc, a) => acc + a.max, 0);
  return Math.round((sum / max) * 100);
}

function gradeLabelFromUI(g: Grade): string {
  if (g === 'GOLDEN') return '골드 치즈';
  if (g === 'SILVER') return '실버 치즈';
  if (g === 'BRONZE') return '브론즈 치즈';
  return '썩은 치즈';
}

// 등급은 utils/scoring.ts의 deriveGrade로 파생 — 종합 점수 + flags 기반.
// 호출자가 이미 score/grade를 갖고 있는 케이스라 ref만 반환 (싸다).
export function recomputeFromRaw(r: Restaurant): { score: number; grade: Grade } {
  return {
    score: r.score,
    grade: deriveGradeCore({
      score: r.score,
      flags: { evalGrade: r.evalGrade, punishTypes: r.punishTypes },
      userScore: r.userScore,
      userReviewCount: r.userReviewCount,
    }) as Grade,
  };
}

// ---------- 메인 어댑터 (상세) ----------
export function toUIRestaurant(r: Restaurant): UIRestaurant {
  // 점수는 사전 계산 그대로, 등급은 deriveGrade로 파생 (utils/scoring.ts 단일 산식).
  // 5축은 spider chart 시각화 용도로만 빌드 (점수에는 영향 X)
  const axes = buildAxes(r);
  const score = r.score;
  const grade = deriveGradeCore({
    score,
    flags: { evalGrade: r.evalGrade, punishTypes: r.punishTypes },
    userScore: r.userScore,
    userReviewCount: r.userReviewCount,
  }) as Grade;
  const labelKr = gradeLabelFromUI(grade);

  const scoreSummary =
    grade === 'GOLDEN'
      ? `${score}점 ${labelKr} — 데이터·사장님·사용자 모두 우수한 ${r.cat} 추천 식당`
      : grade === 'SILVER'
      ? `${score}점 ${labelKr} — 믿고 갈 수 있는 ${r.cat} 식당`
      : grade === 'BRONZE'
      ? `${score}점 ${labelKr} — 평범한 ${r.cat} 식당`
      : r.pun > 0
      ? `${score}점 ${labelKr} — 행정처분 이력 있음, 주의 필요`
      : `${score}점 ${labelKr} — 사용자 평이 좋지 않음, 주의 필요`;

  // mock 리뷰 selector — Grade 4단계에서 우선순위 매핑
  const mockReviewKey = grade === 'GOLDEN' || grade === 'SILVER'
    ? 'GOLDEN'
    : grade === 'BRONZE'
    ? 'BRONZE'
    : 'ROTTEN';

  return {
    id: r.id,
    name: r.name,
    category: r.cat,
    grade,
    score,
    distance: '—',
    district: extractDistrict(r),
    address: r.addr,
    phone: r.phone && r.phone !== 'None' ? r.phone : '정보 없음',
    hours: defaultHours(r.cat),
    closedDay: '매장 문의',
    highlight: r.hyg ? '식약처 위생등급 보유' : undefined,
    reviewCount: 0,
    hygieneReviewCount: 0,
    axes,
    detectiveNote: scoreSummary,
    scoreSummary,
    menuGuide: buildMenuGuide(r.cat),
    adminActions: buildAdminActions(r),
    reviews: buildReviews(mockReviewKey as any),
  };
}

