#!/usr/bin/env node
// 행정안전부 착한가격업소 현황(서울 1,989건, 식당계 ~1,391건)을 by-gu JSON에 매칭해
// flags.goodPrice: true + flags.goodPriceMenus: [{name, price}] 를 부착한다.
//
// 입력:
//   - data/good-price-restaurants.json (data.go.kr 3045247에서 수집)
//
// 출력:
//   - data/by-gu/restaurants-{slug}.json (25개) — flags 확장
//
// 매칭 전략(보수적, apply-hygiene-grades.js / apply-safe-restaurants.js와 동일 룰):
//   1) 이름 정규화 + 자치구 → 단일 매칭
//   2) 다중 매칭이면 도로명 키로 좁힘
//   3) 1차 실패 → 도로명 키 단독 매칭(이름 첫 1글자 일치 필수)
//
// 식당 외 업종(미용/이용/세탁/목욕/숙박/기타비요식)은 매칭 시도 안 함 — 우리 마스터에 없음.
//
// 지정 기준 메모: 가격 45 + 위생·청결 30 + 서비스 + 공익 = 100점 평가표.
// 위생 30점은 주방/매장/화장실 청결, 위생복·장갑·모자·마스크, 행주 용도별 사용,
// 소독·손씻기 시설, 정수기 위생, 환기/방충 등을 평가. 자세한 룰은 docs/05_DATA.md.

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'data', 'good-price-restaurants.json');
const BY_GU_DIR = path.join(__dirname, '..', 'data', 'by-gu');

if (!fs.existsSync(SRC)) {
  console.error(`✗ 입력 파일 없음: ${SRC}`);
  console.error(`  → 갱신 절차는 docs/05_DATA.md 참조.`);
  process.exit(1);
}

// 식당 카테고리만 매칭 시도 (외 업종은 우리 마스터에 없음)
const FOOD_CATEGORIES = new Set(['한식', '중식', '일식', '양식', '기타요식업']);

const COLLAPSE = [
  ['스타벅스커피코리아', '스타벅스'], ['스타벅스커피', '스타벅스'],
  ['투썸플레이스', '투썸'], ['파리바게뜨', '파리바게트'],
  ['주식회사', ''], ['(주)', ''], ['㈜', ''],
];

function normName(s) {
  let v = (s || '').toLowerCase();
  for (const [a, b] of COLLAPSE) v = v.split(a.toLowerCase()).join(b);
  return v.replace(/[\s\-\(\)\[\]\.,'"·]/g, '');
}

function extractRoadKey(addr) {
  if (!addr) return '';
  let v = addr.replace(/\(.*$/, '').replace(/,.*$/, '');
  v = v.replace(/^서울(특별시|시)?\s+/, '');
  return v.replace(/\s+/g, ' ').trim().toLowerCase();
}

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const all = Array.isArray(raw) ? raw : raw.records;
const food = all.filter(r => FOOD_CATEGORIES.has(r.category));
console.log(`착한가격업소: 전체 ${all.length}건 / 식당계 ${food.length}건 (서울)`);

const GU_SLUG = {
  '종로구': 'jongno', '중구': 'junggu', '용산구': 'yongsan', '성동구': 'seongdong',
  '광진구': 'gwangjin', '동대문구': 'dongdaemun', '중랑구': 'jungnang', '성북구': 'seongbuk',
  '강북구': 'gangbuk', '도봉구': 'dobong', '노원구': 'nowon', '은평구': 'eunpyeong',
  '서대문구': 'seodaemun', '마포구': 'mapo', '양천구': 'yangcheon', '강서구': 'gangseo',
  '구로구': 'guro', '금천구': 'geumcheon', '영등포구': 'yeongdeungpo', '동작구': 'dongjak',
  '관악구': 'gwanak', '서초구': 'seocho', '강남구': 'gangnam', '송파구': 'songpa',
  '강동구': 'gangdong',
};

let totalMatched = 0, totalMiss = 0, totalAmb = 0;

for (const [gu, slug] of Object.entries(GU_SLUG)) {
  const filePath = path.join(BY_GU_DIR, `restaurants-${slug}.json`);
  if (!fs.existsSync(filePath)) { console.warn(`skip ${gu}: file missing`); continue; }
  const arr = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const guGood = food.filter(s => s.gu === gu);

  // 인덱스
  const byName = new Map();
  const byRoadKey = new Map();
  for (const r of arr) {
    const nk = normName(r.name);
    if (!byName.has(nk)) byName.set(nk, []);
    byName.get(nk).push(r);
    const rk = extractRoadKey(r.roadAddr || '');
    if (rk) {
      if (!byRoadKey.has(rk)) byRoadKey.set(rk, []);
      byRoadKey.get(rk).push(r);
    }
  }

  // idempotent 초기화
  for (const r of arr) {
    if (r.flags) {
      delete r.flags.goodPrice;
      delete r.flags.goodPriceMenus;
    }
  }

  let matched = 0, miss = 0, amb = 0;
  for (const e of guGood) {
    const nk = normName(e.name);
    let cand = byName.get(nk) || [];

    if (cand.length > 1) {
      const ek = extractRoadKey(e.addr);
      const tight = cand.filter(c => extractRoadKey(c.roadAddr || '') === ek);
      if (tight.length >= 1) cand = [tight[0]];
    }

    let target = null;
    if (cand.length === 1) target = cand[0];
    else if (cand.length > 1) { amb++; continue; }
    else {
      const rk = extractRoadKey(e.addr);
      const byRoad = byRoadKey.get(rk) || [];
      const enFirst = nk.slice(0, 1);
      const tight = byRoad.filter(c => normName(c.name).startsWith(enFirst));
      if (tight.length === 1) target = tight[0];
      else if (tight.length > 1) { amb++; continue; }
    }

    if (target) {
      if (!target.flags) target.flags = {};
      target.flags.goodPrice = true;
      if (e.menus && e.menus.length > 0) target.flags.goodPriceMenus = e.menus;
      matched++;
    } else {
      miss++;
    }
  }

  arr.sort((a, b) => b.score - a.score);
  fs.writeFileSync(filePath, JSON.stringify(arr));

  totalMatched += matched; totalMiss += miss; totalAmb += amb;
  const pct = guGood.length ? (matched * 100 / guGood.length).toFixed(1) : '-';
  console.log(`  ${gu.padEnd(5)} food=${String(guGood.length).padStart(4)}  매칭=${String(matched).padStart(4)} (${pct}%)  miss=${miss}  amb=${amb}`);
}

console.log(`\n=== 합계 ===`);
console.log(`서울 식당계 착한가격업소: ${food.length}`);
console.log(`매칭 성공: ${totalMatched} (${(totalMatched*100/food.length).toFixed(1)}%)`);
console.log(`매칭 실패(miss): ${totalMiss}`);
console.log(`다중후보 결정불가(amb): ${totalAmb}`);
