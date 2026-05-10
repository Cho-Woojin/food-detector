#!/usr/bin/env node
// 농림축산식품부 안심식당 데이터(서울 3,035건)를 by-gu JSON에 매칭해
// flags.safeRestaurant: true 와 flags.safeRestaurantSince: 'YYYY-MM-DD' 를 부착한다.
//
// 입력:
//   - data/safe-restaurants-mafra.json (MAFRA portal에서 수집)
//
// 출력:
//   - data/by-gu/restaurants-{slug}.json (25개) — flags 확장
//
// 매칭 전략(보수적, apply-hygiene-grades.js와 동일 룰):
//   1) 이름 정규화 + 자치구 → 단일 매칭
//   2) 다중 매칭이면 도로명 키로 좁힘
//   3) 1차 실패 → 도로명 키 단독 매칭(이름 첫 1글자 일치 필수)
//   4) 셋 다 실패 → skip
//
// 안심식당은 자발적 참여 프로그램이라 4개 자치구(강남·광진·금천·노원)는 0건.
// 이는 데이터 부재가 아니라 실제 미참여 (2026-05-10 기준).

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'data', 'safe-restaurants-mafra.json');
const BY_GU_DIR = path.join(__dirname, '..', 'data', 'by-gu');

if (!fs.existsSync(SRC)) {
  console.error(`✗ 입력 파일을 찾을 수 없음: ${SRC}`);
  console.error(`  → MAFRA 안심식당 데이터를 받아 ${SRC}로 저장 필요. 절차는 docs/05_DATA.md 참조.`);
  process.exit(1);
}

const COLLAPSE = [
  ['스타벅스커피코리아', '스타벅스'],
  ['스타벅스커피', '스타벅스'],
  ['투썸플레이스', '투썸'],
  ['파리바게뜨', '파리바게트'],
  ['주식회사', ''],
  ['(주)', ''],
  ['㈜', ''],
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
const safe = Array.isArray(raw) ? raw : raw.records;
console.log(`MAFRA 안심식당: ${safe.length}건 (서울)  ${raw.meta?.source || ''}`);

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
  const guSafe = safe.filter(s => s.gu === gu);

  // 인덱스 빌드
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

  // 기존 safeRestaurant 필드 초기화 (idempotent)
  for (const r of arr) {
    if (r.flags) {
      delete r.flags.safeRestaurant;
      delete r.flags.safeRestaurantSince;
    }
  }

  let matched = 0, miss = 0, amb = 0;
  for (const e of guSafe) {
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
      target.flags.safeRestaurant = true;
      if (e.designatedDate) target.flags.safeRestaurantSince = e.designatedDate;
      matched++;
    } else {
      miss++;
    }
  }

  arr.sort((a, b) => b.score - a.score);
  fs.writeFileSync(filePath, JSON.stringify(arr));

  totalMatched += matched; totalMiss += miss; totalAmb += amb;
  const pct = guSafe.length ? (matched * 100 / guSafe.length).toFixed(1) : '-';
  console.log(`  ${gu.padEnd(5)} mafra=${String(guSafe.length).padStart(4)}  매칭=${String(matched).padStart(4)} (${pct}%)  miss=${miss}  amb=${amb}`);
}

console.log(`\n=== 합계 ===`);
console.log(`MAFRA 서울 안심식당: ${safe.length}`);
console.log(`매칭 성공: ${totalMatched} (${(totalMatched*100/safe.length).toFixed(1)}%)`);
console.log(`매칭 실패(miss): ${totalMiss}`);
console.log(`다중후보 결정불가(amb): ${totalAmb}`);
