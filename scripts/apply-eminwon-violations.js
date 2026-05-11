#!/usr/bin/env node
// 서울 25개 자치구 새올전자민원창구에서 수집한 행정처분 위반사유를
// AI 분류 없이 룰 기반(위생 키워드)으로 분류해서 by-gu JSON에 hygieneViolation 부착.
//
// 입력:
//   - data/violations-eminwon.json (자치구별 행정처분 raw, 3,734건)
//
// 출력:
//   - data/by-gu/restaurants-{slug}.json (25개) — flags.hygieneViolation, flags.punishReasons 갱신
//
// 매칭 전략:
//   1) 자치구 + 이름 정규화 매칭 (단일 후보)
//   2) 다중 후보면 skip (false positive 방지)
//   3) 우리 마스터에 없는 식당이면 skip (신규 식당)
//
// 위생 키워드 룰: 이물·바퀴·곰팡이·세균·대장균·살모넬라·유통기한·소비기한·식중독 등
// 비음식점 키워드 제외: 대부업·자판기·담배·건강기능식품판매업

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'data', 'violations-eminwon.json');
const BY_GU_DIR = path.join(__dirname, '..', 'data', 'by-gu');

if (!fs.existsSync(SRC)) {
  console.error(`✗ 입력 파일 없음: ${SRC}`);
  console.error(`  → 새올민원 raw 수집 절차는 docs/05_DATA.md 참조.`);
  process.exit(1);
}

const HYGIENE_KEYWORDS = [
  '이물', '바퀴', '벌레', '곤충', '쥐', '쥐털', '곰팡이', '세균', '대장균', '살모넬라',
  '유통기한', '소비기한', '부패', '변질', '상한', '썩은',
  '무등록 식품', '무허가 식품', '미신고 식품',
  '식중독', '복통', '구토', '설사',
];

// 새올민원 데이터에 음식점 외 업종(대부업·자판기·담배 등)이 섞여있어 제외
const NON_FOOD_KEYWORDS = ['대부업', '건강기능식품판매업', '자판기', '담배', '대부업자'];

function isHygieneViolation(r) {
  const allViltcn = (r.violations || []).map(v => v.viltcn).join(' ');
  if (NON_FOOD_KEYWORDS.some(kw => allViltcn.includes(kw))) return false;
  if (r.induty && !r.induty.includes('음식') && !r.induty.includes('휴게') && !r.induty.includes('식품')) return false;
  return HYGIENE_KEYWORDS.some(kw => allViltcn.includes(kw));
}

function normalizeName(s) {
  return (s || '').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

const GU_SLUG = {
  '종로구': 'jongno', '중구': 'junggu', '용산구': 'yongsan', '성동구': 'seongdong',
  '광진구': 'gwangjin', '동대문구': 'dongdaemun', '중랑구': 'jungnang', '성북구': 'seongbuk',
  '강북구': 'gangbuk', '도봉구': 'dobong', '노원구': 'nowon', '은평구': 'eunpyeong',
  '서대문구': 'seodaemun', '마포구': 'mapo', '양천구': 'yangcheon', '강서구': 'gangseo',
  '구로구': 'guro', '금천구': 'geumcheon', '영등포구': 'yeongdeungpo', '동작구': 'dongjak',
  '관악구': 'gwanak', '서초구': 'seocho', '강남구': 'gangnam', '송파구': 'songpa',
  '강동구': 'gangdong',
};

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const data = raw.records || raw;
const totalRecords = Object.values(data).reduce((s, recs) => s + recs.length, 0);
console.log(`새올민원 raw: ${totalRecords}건 (${Object.keys(data).length}개 자치구)`);

// 위생 직결 위반만 추출
const hygieneRecs = [];
for (const [gu, recs] of Object.entries(data)) {
  for (const r of recs) {
    if (isHygieneViolation(r)) hygieneRecs.push({ gu, ...r });
  }
}
console.log(`위생 직결 위반: ${hygieneRecs.length}건`);

// by-gu 로드
const byGuArrs = {};
for (const [gu, slug] of Object.entries(GU_SLUG)) {
  byGuArrs[gu] = JSON.parse(fs.readFileSync(path.join(BY_GU_DIR, `restaurants-${slug}.json`), 'utf8'));
}

let matched = 0, miss = 0, ambiguous = 0;
const missSamples = [], ambSamples = [];

for (const v of hygieneRecs) {
  const arr = byGuArrs[v.gu];
  const candidates = arr.filter(r => normalizeName(r.name) === normalizeName(v.bssh));

  if (candidates.length === 0) {
    miss++;
    if (missSamples.length < 5) missSamples.push({ gu: v.gu, bssh: v.bssh });
    continue;
  }
  if (candidates.length > 1) {
    ambiguous++;
    if (ambSamples.length < 5) ambSamples.push({ gu: v.gu, bssh: v.bssh, n: candidates.length });
    continue;
  }

  // 단일 매칭 — 적용 (dedup: 같은 텍스트는 추가 안 함)
  const target = candidates[0];
  if (!target.flags) target.flags = {};
  target.flags.hygieneViolation = true;
  const newReason = (v.violations || []).map(x => x.viltcn).join('; ').slice(0, 200);
  const existing = (target.flags.punishReasons || '').split('|').filter(Boolean);
  if (!existing.includes(newReason)) {
    target.flags.punishReasons = existing.length > 0 ? newReason + '|' + existing.join('|') : newReason;
  }
  matched++;
}

// 저장
for (const [gu, slug] of Object.entries(GU_SLUG)) {
  const fp = path.join(BY_GU_DIR, `restaurants-${slug}.json`);
  byGuArrs[gu].sort((a, b) => b.score - a.score);
  fs.writeFileSync(fp, JSON.stringify(byGuArrs[gu]));
}

let totalHV = 0;
for (const arr of Object.values(byGuArrs)) {
  for (const r of arr) if (r.flags?.hygieneViolation) totalHV++;
}

console.log(`\n=== 결과 ===`);
console.log(`매칭: ${matched}, miss: ${miss}, ambiguous: ${ambiguous}`);
console.log(`전체 hygieneViolation=true: ${totalHV}건`);
if (missSamples.length) {
  console.log(`\n매칭 실패 sample:`);
  for (const s of missSamples) console.log(`  [${s.gu}] "${s.bssh}"`);
}
if (ambSamples.length) {
  console.log(`\n다중 후보 sample:`);
  for (const s of ambSamples) console.log(`  [${s.gu}] "${s.bssh}" → ${s.n}개`);
}
