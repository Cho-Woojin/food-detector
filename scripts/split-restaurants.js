#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const proj4 = require('proj4');

const SRC = path.join(__dirname, '..', '_archive', 'restaurants_with_scores.csv');
const OUT_DIR = path.join(__dirname, '..', 'data', 'by-gu');
const INDEX_OUT = path.join(__dirname, '..', 'data', 'restaurants-index.json');

if (!fs.existsSync(SRC)) {
  console.error(`✗ CSV 입력 파일을 찾을 수 없습니다: ${SRC}`);
  console.error(`  → _archive/restaurants_with_scores.csv를 준비해주세요.`);
  console.error(`  → 갱신 절차는 docs/05_DATA.md 참조.`);
  process.exit(1);
}

// 자치구 영문 slug (URL/파일 안전)
const GU_SLUG = {
  '종로구': 'jongno', '중구': 'junggu', '용산구': 'yongsan', '성동구': 'seongdong',
  '광진구': 'gwangjin', '동대문구': 'dongdaemun', '중랑구': 'jungnang', '성북구': 'seongbuk',
  '강북구': 'gangbuk', '도봉구': 'dobong', '노원구': 'nowon', '은평구': 'eunpyeong',
  '서대문구': 'seodaemun', '마포구': 'mapo', '양천구': 'yangcheon', '강서구': 'gangseo',
  '구로구': 'guro', '금천구': 'geumcheon', '영등포구': 'yeongdeungpo', '동작구': 'dongjak',
  '관악구': 'gwanak', '서초구': 'seocho', '강남구': 'gangnam', '송파구': 'songpa',
  '강동구': 'gangdong',
};

// 자치구 대표 좌표 (lat null 폴백용)
const GU_CENTROID = {
  '종로구': [37.5735, 126.9789], '중구': [37.5638, 126.9979], '용산구': [37.5326, 126.9905],
  '성동구': [37.5634, 127.0371], '광진구': [37.5384, 127.0822], '동대문구': [37.5744, 127.0395],
  '중랑구': [37.6063, 127.0925], '성북구': [37.5894, 127.0167], '강북구': [37.6396, 127.0257],
  '도봉구': [37.6688, 127.0471], '노원구': [37.6543, 127.0568], '은평구': [37.6027, 126.9291],
  '서대문구': [37.5791, 126.9368], '마포구': [37.5663, 126.9019], '양천구': [37.5170, 126.8665],
  '강서구': [37.5509, 126.8495], '구로구': [37.4954, 126.8874], '금천구': [37.4566, 126.8954],
  '영등포구': [37.5264, 126.8962], '동작구': [37.5124, 126.9393], '관악구': [37.4784, 126.9516],
  '서초구': [37.4836, 127.0327], '강남구': [37.5172, 127.0473], '송파구': [37.5145, 127.1059],
  '강동구': [37.5301, 127.1238],
};

// EPSG:5174 (Korea 1985 Modified Central Belt, Bessel + towgs84) → WGS84
// 식약처/지자체 음식점 인허가 TM 좌표는 EPSG:5174 사용. 5181보다 ~250m 더 정확.
proj4.defs(
  'EPSG:5174',
  '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43'
);
const toWGS84 = (x, y) => proj4('EPSG:5174', 'WGS84', [x, y]);

// ---- Data score (0~70) ----
// Rule (2026-05-10): 70+15+15 점수 체계 + 위생등급 3단계 차등 + 모범 보조 가산. 자세한 룰은 data/SCORING_AND_SCHEMA.md.
//
// 종합 점수(0~100)는 클라이언트에서 dataScore + ownerScore + userScore로 계산.
// 등급(GOLDEN/SILVER/BRONZE/ROTTEN)도 클라이언트에서 deriveGrade()로 결정.
// 따라서 split 결과 JSON에는 grade/color를 박지 않는다.
//
// I2630에 실제로 존재하는 처분 종류만 정의 (시정명령/과태료/경고/품목제조정지는 데이터 없음, 제거됨).
const PUNISH_DELTAS = {
  '영업소폐쇄': -50,
  '영업정지': -25,
  '영업허가·등록취소': -50,
  '과징금부과': -10,
};

const BONUS_CAP = 15;

function computeDataScore(flags) {
  // 점수 체계 (2026-05-10 개정): 각 인증 독립 배점, 위생등급 없을 때만 보조 합 cap 35.
  // 자세한 룰은 data/SCORING_AND_SCHEMA.md.
  let data = 25;
  const hasHy = !!flags.hygieneDesignated;
  const hasMod = !!flags.hasModel;
  const hasSafe = !!flags.safeRestaurant;
  const hasGood = !!flags.goodPrice;

  const hygiene = hasHy ? 35 : 0;
  const model = hasMod ? 25 : 0;
  const safe = hasSafe ? 15 : 0;
  const good = hasGood ? 15 : 0;

  let bonus = model + safe + good;
  if (!hasHy) bonus = Math.min(35, bonus);

  data += hygiene + bonus;

  let punish = 0;
  const types = (flags.punishTypes || '').split('|').filter(Boolean);
  for (const t of types) {
    punish += PUNISH_DELTAS[t] ?? -3;
  }
  data += punish;

  data = Math.max(0, Math.min(70, data));
  return { data, hygiene, model, safe, good, bonus, punish };
}

// ---- Seoul 25 districts allowlist ----
const SEOUL_GU = new Set([
  '종로구','중구','용산구','성동구','광진구','동대문구','중랑구','성북구','강북구','도봉구',
  '노원구','은평구','서대문구','마포구','양천구','강서구','구로구','금천구','영등포구','동작구',
  '관악구','서초구','강남구','송파구','강동구',
]);

// ---- Category remap (CSV 원본 category → 신규 카테고리) ----
const RAW_MAP = {
  '한식': '한식',
  '냉면집': '한식',
  '구내식당': '한식',
  '중식': '중식',
  '중국식': '중식',
  '일식': '일식',
  '횟집': '일식',
  '복어취급': '일식',
  '양식': '양식',
  '경양식': '양식',
  '패밀리레스트랑': '양식',
  '분식': '분식',
  '김밥(도시락)': '도시락',
  '도시락': '도시락',
  '치킨': '치킨',
  '치킨·호프': '치킨',
  '통닭(치킨)': '치킨',
  '호프/통닭': '치킨',
  '카페·디저트': '카페디저트',
  '까페': '카페디저트',
  '카페': '카페디저트',
  '커피숍': '카페디저트',
  '전통찻집': '카페디저트',
  '키즈카페': '카페디저트',
  '라이브카페': '카페디저트',
  '다방': '카페디저트',
  '아이스크림': '카페디저트',
  '과자점': '카페디저트',
  '떡카페': '카페디저트',
  '고기·구이': '고기',
  '식육(숯불구이)': '고기',
  '뷔페': '뷔페',
  '뷔페식': '뷔페',
  '술집': '술집',
  '정종/대포집/소주방': '술집',
  '감성주점': '술집',
  '단란주점': '술집',
  '유흥주점': '술집',
  '패스트푸드': '패스트푸드',
  '외국음식전문점(인도, 태국 등)': '아시안',
  '외국음식전문점(인도,태국등)': '아시안',  // 띄어쓰기 없는 LOCALDATA 표기
  '탕류(보신용)': '찜탕',
  '출장조리': '기타',
  '이동조리': '기타',
  '푸드트럭': '기타',
  '기타': '기타',
  '기타 휴게음식점': '기타',
  '일반조리판매': '기타',
  '간식': '기타',
  '음식점': '기타',
  '백화점': '기타',
  '철도역구내': '기타',
  '고속도로': '기타',
  '관광호텔': '기타',
  '극장': '기타',
  '유원지': '기타',
  '공항': '기타',
  '푸드코트': '기타',
};

// 우선순위 순서 (위에서부터 매칭되면 적용)
// 주의: 모호한 단어(라운지/키친 등)는 더 구체적인 규칙 뒤에 둘 것
const NAME_RULES = [
  { cat: '샌드위치', kws: ['서브웨이', '써브웨이', '샌드위치', 'sandwich', '에그드랍', 'eggdrop', '바게트'] },
  { cat: '샐러드', kws: ['샐러드', 'salad', '스윗밸런스', '샐러디드', '슬로우캘리', '포케올데이', '굿투고'] },
  { cat: '패스트푸드', kws: ['맥도날드', '버거킹', '롯데리아', 'kfc', '맘스터치', '노브랜드버거', '쉐이크쉑', 'shake shack', '버거', '햄버거', '프랭크', '프랭크버거'] },
  { cat: '도시락', kws: ['도시락', '한솥', '본도시락', '오봉', '스노우폭스'] },
  { cat: '아시안', kws: ['쌀국수', '미분당', '포메인', '포 (', '팟타이', '분짜', '하노이', '베트남', '태국', '타이', '인도', '커리하우스', '카레', '포케', 'poke', '반미', '딤섬', '훠궈', '마라탕', '마라샹궈', '양꼬치'] },
  { cat: '치킨', kws: ['bbq', 'bhc', '교촌', '굽네', '네네치킨', '처갓집', '페리카나', '호식이', '또래오래', '치킨플러스', '60계', '푸라닭', '치킨'] },
  { cat: '술집', kws: [
    '포차', '호프', '맥주', '생맥주', '펍 ', 'pub', 'PUB',
    'bar ', ' bar', 'BAR', 'Bar',
    '라운지', 'lounge', 'Lounge', 'LOUNGE',
    '혼술', '막걸리', '와인바', '위스키', '사케', '이자카야', '주점', '주류', '홀덤펍', '비어',
    '브루어리', 'brewery', '비스트로', 'bistro',
  ] },
  { cat: '양식', kws: ['피자', 'pizza', '파스타', 'pasta', '스테이크', 'steak', '리조또', '이탈리', '타코', 'taco', 'TACO', '멕시칸', '키친', 'kitchen', '레스토랑', '브런치', 'brunch'] },
  { cat: '일식', kws: ['돈까스', '돈가스', '카츠', '우동', '라멘', '라면', '스시', 'sushi', '초밥', '오마카세', '오뎅', '소바', '텐동', '야키토리', '사시미', '텐푸라'] },
  { cat: '고기', kws: ['삼겹살', '소갈비', '한우', '곱창', '막창', '대창', '족발', '보쌈', '갈비살', '등심', '안심', '꼬치구이', '바베큐', 'bbq구이'] },
  { cat: '찜탕', kws: ['감자탕', '뼈해장국', '설렁탕', '곰탕', '갈비탕', '추어탕', '삼계탕', '아구찜', '해물찜', '찜닭', '도리탕', '아구탕', '동태탕', '매운탕'] },
  { cat: '분식', kws: ['김밥', '떡볶이', '떡복이', '튀김', '순대', '오뎅바'] },
  { cat: '한식', kws: ['국밥', '한식당', '한정식', '백반', '비빔밥', '냉면', '쌈밥', '순두부', '두부', '닭갈비', '낙지', '해장국', '곱창전골', '전골', '청국장', '된장'] },
  { cat: '카페디저트', kws: [
    '스타벅스', 'starbucks', '투썸', '이디야', '메가커피', '메가mgc', '컴포즈', '빽다방', '할리스', '폴바셋', '공차',
    '탐앤탐스', '커피빈', '엔제리너스', '카페베네', '드롭탑', '더벤티', '매머드', '바나프레소', '더카페',
    '카페', 'cafe', 'CAFE', 'Cafe', 'coffee', 'COFFEE', 'Coffee', '커피', '에스프레소', '로스터리', '로스터스',
    '디저트', '베이커리', '파리바게뜨', '뚜레쥬르', '던킨', 'dunkin', '브레드', '제과', '마카롱', '도넛', '아이스크림', '배스킨', '베스킨',
    '젤라또', '젤라토', '요거트', '쿠키', '케이크', 'cake', '와플', '크레페', '팥빙수', '빙수',
  ] },
];

// ---- Risk tags (식중독 위험 — 날것 등) ----
// 키워드는 이름·원본카테고리 둘 다에 매칭. 부분일치(소문자 비교).
const RISK_RULES = [
  { tag: 'raw_fish', kws: [
    '회 ', '회.', '회집', '회식당', '회타운', '회마을', '활어회', '모듬회', '모둠회', '생선회',
    '사시미', 'sashimi', '스시', 'sushi', '초밥', '오마카세',
    '회덮밥', '물회', '회무침', '회비빔', '연어회', '참치회', '광어회', '우럭회', '방어회', '도미회',
    '횟집', '연어 ', '연어덮밥', '연어 1인',
  ] },
  { tag: 'raw_meat', kws: ['육회', '육사시미', '생고기', '타다끼', '타타키', '뭉티기'] },
  { tag: 'shellfish_raw', kws: ['생굴', '굴 ', '굴집', '굴요리', '굴마을', '석화', '홍합', '조개구이', '조개찜', '소라', '전복회', '꼬막', '키조개'] },
  { tag: 'egg_raw', kws: ['날달걀', '계란회', '난황'] },
  { tag: 'fugu', kws: ['복어', '복지리', '복국', '복매운탕', '복불고기'] },
  { tag: 'raw_chicken', kws: ['닭회'] },
];

// ---- Menu hints (이름에서 대표 메뉴 추정) ----
const MENU_HINTS = [
  // 한식
  '삼겹살', '오겹살', '소갈비', '돼지갈비', '갈비살', '갈비탕', '곰탕', '설렁탕', '추어탕', '삼계탕',
  '감자탕', '뼈해장국', '해장국', '국밥', '순대국', '순대국밥', '돼지국밥',
  '김치찌개', '된장찌개', '순두부찌개', '청국장', '부대찌개', '동태찌개',
  '찜닭', '닭갈비', '닭한마리', '닭볶음탕',
  '비빔밥', '돌솥비빔밥', '냉면', '물냉면', '비빔냉면', '쌈밥', '백반', '한정식',
  '족발', '보쌈', '낙지볶음', '낙곱새', '아구찜', '아구탕', '해물찜',
  '곱창', '막창', '대창', '소곱창', '한우', '한우구이', '안심', '등심', '치마살',
  '두부전골', '곱창전골', '버섯전골', '낙지전골',
  // 분식
  '김밥', '떡볶이', '떡복이', '튀김', '순대', '오뎅', '라볶이', '쫄면', '컵밥',
  // 일식
  '돈까스', '돈가스', '카츠', '우동', '라멘', '라면', '스시', '초밥', '오마카세',
  '소바', '텐동', '텐푸라', '야키토리', '오뎅바', '회덮밥', '물회', '사시미',
  // 중식
  '짜장면', '짬뽕', '탕수육', '마라탕', '마라샹궈', '훠궈', '양꼬치', '딤섬',
  // 아시안
  '쌀국수', '팟타이', '분짜', '반미', '포케', '커리', '카레', '나시고렝',
  // 양식
  '피자', '파스타', '스테이크', '리조또', '브런치', '타코', '부리또', '햄버거', '버거',
  // 카페·디저트
  '커피', '에스프레소', '라떼', '아메리카노', '베이커리', '브레드', '도넛', '마카롱',
  '아이스크림', '젤라또', '팥빙수', '와플', '크레페', '쿠키', '케이크',
  // 치킨
  '치킨', '닭강정', '통닭', '후라이드',
  // 술집
  '막걸리', '와인', '위스키', '사케', '맥주', '생맥주', '하이볼',
];

// ---- Risk by category (원본 카테고리에서 직접 부여) ----
const RISK_BY_RAW_CAT = {
  '횟집': 'raw_fish',
  '복어취급': 'fugu',
};

function detectRisks(rawCat, name) {
  const tags = new Set();
  const lc = ((name || '') + ' ').toLowerCase();
  if (RISK_BY_RAW_CAT[rawCat]) tags.add(RISK_BY_RAW_CAT[rawCat]);
  for (const rule of RISK_RULES) {
    if (rule.kws.some((k) => lc.includes(k.toLowerCase()))) tags.add(rule.tag);
  }
  return [...tags];
}

function detectMenuHints(name) {
  const hits = [];
  const lc = (name || '').toLowerCase();
  for (const m of MENU_HINTS) {
    if (lc.includes(m.toLowerCase())) hits.push(m);
  }
  // 중복 normalize: 돈까스/돈가스, 떡볶이/떡복이 → 첫 표기 사용
  const norm = new Map([
    ['돈가스', '돈까스'], ['떡복이', '떡볶이'], ['라면', '라멘'],
  ]);
  return [...new Set(hits.map((h) => norm.get(h) || h))];
}

function reclassifyCategory(rawCat, name) {
  const base = RAW_MAP[rawCat] || '기타';
  const lc = (name || '').toLowerCase();
  for (const rule of NAME_RULES) {
    if (rule.kws.some((k) => lc.includes(k.toLowerCase()))) return rule.cat;
  }
  return base;
}

// ---- CSV parser (RFC4180-ish, handles quoted fields with commas) ----
function parseCSVLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else {
      if (c === ',') { out.push(cur); cur = ''; }
      else if (c === '"') inQ = true;
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function parseCSV(text) {
  // Split on \n but respect quoted newlines
  const records = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { cur += c; inQ = !inQ; continue; }
    if (c === '\n' && !inQ) { records.push(cur); cur = ''; continue; }
    if (c === '\r' && !inQ) continue;
    cur += c;
  }
  if (cur.length) records.push(cur);
  const header = parseCSVLine(records[0].replace(/^﻿/, ''));
  const rows = [];
  for (let i = 1; i < records.length; i++) {
    if (!records[i]) continue;
    const cols = parseCSVLine(records[i]);
    const obj = {};
    for (let j = 0; j < header.length; j++) obj[header[j]] = cols[j];
    rows.push(obj);
  }
  return rows;
}

// ---- Main ----
console.log('reading CSV…');
const text = fs.readFileSync(SRC, 'utf8');
const rows = parseCSV(text);
console.log(`parsed ${rows.length} rows`);

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const buckets = new Map();
const stats = { total: 0, geoOk: 0, geoFail: 0, byGu: {}, byCat: {}, byDataScore: {}, byRisk: {}, byMenu: {} };

const num = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const bool = (v) => String(v).toLowerCase() === 'true';

for (const r of rows) {
  const gu = (r.gu || '').trim();
  if (!SEOUL_GU.has(gu)) continue;

  // 좌표: x,y(EPSG5174)가 있으면 변환, 없으면 lat,lng(EPSG4326) 직접 사용
  const x = num(r.x);
  const y = num(r.y);
  let lat = null, lng = null;
  if (x !== null && y !== null) {
    try {
      const [lon, la] = toWGS84(x, y);
      if (Number.isFinite(la) && Number.isFinite(lon)) { lat = +la.toFixed(6); lng = +lon.toFixed(6); }
    } catch {}
  }
  // Fallback: lat,lng가 csv에 직접 있으면 사용 (Phase 4 통합 csv는 이쪽)
  if (lat === null) {
    const directLat = num(r.lat);
    const directLng = num(r.lng);
    if (directLat !== null && directLng !== null) {
      lat = +directLat.toFixed(6);
      lng = +directLng.toFixed(6);
    }
  }
  if (lat !== null) stats.geoOk++; else stats.geoFail++;

  const flags = {
    hygieneDesignated: bool(r.hygiene_designated),
    hasModel: bool(r.has_model),
    punishCount: num(r.punish_count) ?? 0,
    punishTypes: r.punish_types || '',
    // 위생관리평가(I1540)는 제거됨 (2026-05-10) — 식품제조·가공업체 평가라 음식점에 부적절.
    // hygieneGrade(매우우수/우수/좋음)는 split 단계에서 채우지 않음.
    // CSV 파이프라인 통합 후, scripts/apply-hygiene-grades.js를 별도로 실행해
    // MFDS 위생등급 지정현황 Excel에서 부착한다. 자세한 건 docs/05_DATA.md.
    //
    // safeRestaurant / safeRestaurantSince도 split 단계에서 채우지 않음.
    // scripts/apply-safe-restaurants.js를 실행해 MAFRA 안심식당 데이터에서 부착.
    //
    // goodPrice / goodPriceMenus도 split 단계에서 채우지 않음.
    // scripts/apply-good-price.js를 실행해 행안부 착한가격업소 데이터에서 부착.
  };
  const breakdown = computeDataScore(flags);
  const score = breakdown.data;  // 데이터 점수(0~50). 종합 점수는 클라이언트에서 +ownerScore+userScore.
  const category = reclassifyCategory(r.category, r.name);
  const riskTags = detectRisks(r.category, r.name);
  const menuHints = detectMenuHints(r.name);

  const out = {
    id: r.mgtno,
    name: r.name,
    gu,
    category,
    categoryRaw: r.category || '',
    addr: r.addr || '',
    roadAddr: r.road_addr || '',
    phone: r.phone || '',
    lat, lng,
    score,
    breakdown,
    flags,
    riskTags, menuHints,
  };

  if (!buckets.has(gu)) buckets.set(gu, []);
  buckets.get(gu).push(out);

  stats.total++;
  stats.byGu[gu] = (stats.byGu[gu] || 0) + 1;
  stats.byCat[category] = (stats.byCat[category] || 0) + 1;
  // 데이터 점수 분포 (0~50)
  const bucket = score >= 50 ? '50' : score >= 40 ? '40-49' : score >= 30 ? '30-39' : score >= 20 ? '20-29' : score >= 10 ? '10-19' : '0-9';
  stats.byDataScore[bucket] = (stats.byDataScore[bucket] || 0) + 1;
  for (const t of riskTags) stats.byRisk[t] = (stats.byRisk[t] || 0) + 1;
  for (const m of menuHints) stats.byMenu[m] = (stats.byMenu[m] || 0) + 1;
}

// 좌표 폴백: lat null이면 자치구 centroid + id 기반 deterministic jitter (~50m)
function jitter(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  const dx = (((h & 0xffff) / 0xffff) - 0.5) * 0.0009; // ~±50m lat
  const dy = ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * 0.0011; // ~±50m lng
  return [dx, dy];
}
for (const [gu, arr] of buckets) {
  const [clat, clng] = GU_CENTROID[gu];
  for (const r of arr) {
    if (r.lat === null || r.lng === null) {
      const [dx, dy] = jitter(r.id || r.name || '');
      r.lat = +(clat + dx).toFixed(6);
      r.lng = +(clng + dy).toFixed(6);
      r.geoFallback = true;
    }
  }
}

const indexEntries = [];
for (const [gu, arr] of buckets) {
  arr.sort((a, b) => b.score - a.score);
  const slug = GU_SLUG[gu];
  const file = `restaurants-${slug}.json`;
  fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(arr));
  indexEntries.push({ gu, slug, count: arr.length, file });
}
indexEntries.sort((a, b) => a.gu.localeCompare(b.gu, 'ko'));

// 메인 인덱스 — meta만. flat index는 dataStore가 lazy load 시 빌드
const gusCount = {};
const guSlugMap = {};
for (const e of indexEntries) { gusCount[e.gu] = e.count; guSlugMap[e.gu] = e.slug; }
fs.writeFileSync(
  INDEX_OUT,
  JSON.stringify({
    meta: {
      totalCount: stats.total,
      gus: indexEntries.map((e) => e.gu),
      gusCount,
      guSlug: guSlugMap,
      categories: Object.keys(stats.byCat).sort(),
      dataScoreDistribution: stats.byDataScore,
      riskDistribution: stats.byRisk,
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
    index: [],
  }, null, 2)
);

// 가벼운 파일별 메타
fs.writeFileSync(
  path.join(OUT_DIR, '_index.json'),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    total: stats.total,
    geo: { ok: stats.geoOk, fail: stats.geoFail },
    files: indexEntries,
    byCategory: stats.byCat,
    byDataScore: stats.byDataScore,
    byRisk: stats.byRisk,
  }, null, 2)
);

console.log(`wrote ${indexEntries.length} files to ${OUT_DIR}`);
console.log(`wrote index to ${INDEX_OUT}`);
console.log('stats:', JSON.stringify(stats, null, 2));
