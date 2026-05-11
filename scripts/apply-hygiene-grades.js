#!/usr/bin/env node
// 식약처 위생등급 지정현황 Excel(2025.5.30 기준)에서 등급(매우우수/우수/좋음)을 추출해
// data/by-gu/*.json의 flags.hygieneGrade에 부착한다.
//
// 입력:
//   - data/hygiene-grades-mfds.json  (Excel→JSON 변환 결과, 서울 6,877건)
//
// 출력:
//   - data/by-gu/restaurants-{slug}.json (25개) — flags.hygieneGrade 추가
//
// 매칭 전략(보수적):
//   1) 이름 정규화 + 자치구 → 단일 매칭
//   2) 다중 매칭이면 도로명 키로 한 번 더 좁힘
//   3) 1차에서 못 찾으면 도로명 키 단독 매칭(이름 첫 1글자 일치 필수)
//   4) 셋 다 실패하면 skip — false positive 방지

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'data', 'hygiene-grades-mfds.json');
const BY_GU_DIR = path.join(__dirname, '..', 'data', 'by-gu');

if (!fs.existsSync(SRC)) {
  console.error(`✗ 입력 파일을 찾을 수 없음: ${SRC}`);
  console.error(`  → MFDS 공지 https://www.mfds.go.kr/brd/m_74/view.do?seq=45019 의 Excel을`);
  console.error(`     변환해 ${SRC}로 저장 필요`);
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

// 도로명 핵심: 부속 정보(층/호/동/괄호) 제거 후 "구 + 도로명 + 번지"만
function extractRoadKey(addr) {
  if (!addr) return '';
  let v = addr.replace(/\(.*$/, '').replace(/,.*$/, '');
  v = v.replace(/^서울(특별시|시)?\s+/, '');
  return v.replace(/\s+/g, ' ').trim().toLowerCase();
}

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const grades = Array.isArray(raw) ? raw : raw.records;
console.log(`MFDS 등급 데이터: ${grades.length}건 (서울)  ${raw.meta?.source || ''}`);

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
const gradeDistMatched = { '매우우수': 0, '우수': 0, '좋음': 0 };

for (const [gu, slug] of Object.entries(GU_SLUG)) {
  const filePath = path.join(BY_GU_DIR, `restaurants-${slug}.json`);
  if (!fs.existsSync(filePath)) { console.warn(`skip ${gu}: file missing`); continue; }
  const arr = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const guGrades = grades.filter(g => g.gu === gu);

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

  // 기존 hygieneGrade 초기화 (재실행 idempotent)
  for (const r of arr) {
    if (r.flags) delete r.flags.hygieneGrade;
  }

  let matched = 0, miss = 0, amb = 0;
  for (const e of guGrades) {
    const nk = normName(e.name);
    let cand = byName.get(nk) || [];

    // 다중 매칭이면 도로키로 좁힘
    if (cand.length > 1) {
      const ek = extractRoadKey(e.addr);
      const tight = cand.filter(c => extractRoadKey(c.roadAddr || '') === ek);
      if (tight.length >= 1) cand = [tight[0]];
    }

    let target = null;
    if (cand.length === 1) target = cand[0];
    else if (cand.length > 1) { amb++; continue; }
    else {
      // 2차: 도로키 단독 매칭 (이름 첫 1글자 일치 필수 — 보수적)
      const rk = extractRoadKey(e.addr);
      const byRoad = byRoadKey.get(rk) || [];
      const enFirst = nk.slice(0, 1);
      const tight = byRoad.filter(c => normName(c.name).startsWith(enFirst));
      if (tight.length === 1) target = tight[0];
      else if (tight.length > 1) { amb++; continue; }
    }

    if (target) {
      if (!target.flags) target.flags = {};
      target.flags.hygieneGrade = e.grade;
      // 등급이 매겨졌으면 hygieneDesignated도 일관성 보장
      if (!target.flags.hygieneDesignated) target.flags.hygieneDesignated = true;
      matched++;
      gradeDistMatched[e.grade] = (gradeDistMatched[e.grade] || 0) + 1;
    } else {
      miss++;
    }
  }

  // 정렬 유지(score 내림차순) + 저장
  arr.sort((a, b) => b.score - a.score);
  fs.writeFileSync(filePath, JSON.stringify(arr));

  totalMatched += matched; totalMiss += miss; totalAmb += amb;
  const pct = guGrades.length ? (matched * 100 / guGrades.length).toFixed(1) : '-';
  console.log(`  ${gu.padEnd(5)} excel=${String(guGrades.length).padStart(4)}  매칭=${String(matched).padStart(4)} (${pct}%)  miss=${miss}  amb=${amb}`);
}

console.log(`\n=== 합계 ===`);
console.log(`Excel 서울 등급 식당: ${grades.length}`);
console.log(`매칭 성공: ${totalMatched} (${(totalMatched*100/grades.length).toFixed(1)}%)`);
console.log(`매칭 실패(miss): ${totalMiss}`);
console.log(`다중후보 결정불가(amb): ${totalAmb}`);
console.log(`매칭된 등급 분포: ${JSON.stringify(gradeDistMatched)}`);
