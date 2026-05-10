#!/usr/bin/env node
// 기존 data/by-gu/*.json의 flags를 입력으로, 새 데이터 점수(0~70)와 breakdown을 재계산.
// CSV 없이 점수 룰만 바뀐 케이스에 사용 (예: 영업소폐쇄 가중치 조정, 신호 재구성 등).
//
// Rule (2026-05-10): 70+15+15 점수 체계 + 위생등급 3단계 차등 + 모범 보조 가산.
// 자세한 룰은 data/SCORING_AND_SCHEMA.md.
//
// 출력: data/by-gu/*.json 덮어쓰기 + data/restaurants-index.json + data/by-gu/_index.json 갱신.
//
// 룰의 단일 원본은 scripts/split-restaurants.js의 computeDataScore — 이 스크립트도 동일 룰 사용.

const fs = require('fs');
const path = require('path');

const BY_GU_DIR = path.join(__dirname, '..', 'data', 'by-gu');
const INDEX_OUT = path.join(__dirname, '..', 'data', 'restaurants-index.json');

// I2630에 실제로 존재하는 처분 종류만 (시정명령/과태료/경고/품목제조정지는 데이터 없음, 제거됨)
const PUNISH_DELTAS = {
  '영업소폐쇄': -50,
  '영업정지': -25,
  '영업허가·등록취소': -50,
  '과징금부과': -10,
};

const BONUS_CAP = 15;

function computeDataScore(flags) {
  // 점수 체계 (2026-05-10 개정): 각 인증 독립 배점, 위생등급 없을 때만 보조 합 cap 35.
  //   위생등급:   +35 (단독 60 → SILVER)
  //   모범음식점: +25 (단독 50 → SILVER)
  //   안심식당:   +15
  //   착한가격:   +15
  //   위생등급 X 시 (모범+안심+착한) 합 cap 35 → 25+35=60 → SILVER에 머무름.
  //   위생등급 O 시 cap 없이 합산 (만점 70까지 가능).
  // → BRONZE: 시그널 없음 / 안심 단독 / 착한 단독 / 안심+착한
  //   SILVER: 위생 단독 / 모범 단독 / 모범+가산
  //   GOLD: 위생 + 다른 인증 1개+
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
  if (!hasHy) bonus = Math.min(35, bonus);  // 위생등급 없을 때만 cap

  data += hygiene + bonus;

  let punish = 0;
  for (const t of (flags.punishTypes || '').split('|').filter(Boolean)) {
    punish += PUNISH_DELTAS[t] ?? -3;
  }
  data += punish;

  data = Math.max(0, Math.min(70, data));
  return { data, hygiene, model, safe, good, bonus, punish };
}

function bucketDataScore(score) {
  if (score >= 70) return '70';
  if (score >= 60) return '60-69';
  if (score >= 50) return '50-59';
  if (score >= 40) return '40-49';
  if (score >= 30) return '30-39';
  if (score >= 20) return '20-29';
  if (score >= 10) return '10-19';
  return '0-9';
}

const stats = { total: 0, byGu: {}, byCat: {}, byDataScore: {}, byRisk: {} };
const indexEntries = [];

const files = fs.readdirSync(BY_GU_DIR)
  .filter((f) => f.startsWith('restaurants-') && f.endsWith('.json'));

console.log(`Recomputing scores for ${files.length} by-gu files…`);

for (const file of files) {
  const filePath = path.join(BY_GU_DIR, file);
  const arr = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(arr) || arr.length === 0) continue;

  for (const r of arr) {
    // 별도 매칭 스크립트 산출물은 보존 — computeDataScore와 무관, 점수 룰 변경/재계산 사이에도 유지돼야 함:
    //   hygieneGrade                  ← apply-hygiene-grades.js (MFDS 위생등급 Excel)
    //   safeRestaurant(+Since)        ← apply-safe-restaurants.js (MAFRA 안심식당)
    //   goodPrice(+Menus)             ← apply-good-price.js (행안부 착한가격업소)
    const breakdown = computeDataScore(r.flags || {});
    r.score = breakdown.data;
    r.breakdown = breakdown;
    // 옛 grade/color 제거 — 클라이언트에서 deriveGrade()로 계산
    delete r.grade;
    delete r.color;

    stats.total++;
    stats.byGu[r.gu] = (stats.byGu[r.gu] || 0) + 1;
    stats.byCat[r.category] = (stats.byCat[r.category] || 0) + 1;
    stats.byDataScore[bucketDataScore(r.score)] = (stats.byDataScore[bucketDataScore(r.score)] || 0) + 1;
    for (const t of (r.riskTags || [])) stats.byRisk[t] = (stats.byRisk[t] || 0) + 1;
  }

  // 점수 내림차순 정렬 (split-restaurants.js와 동일)
  arr.sort((a, b) => b.score - a.score);
  fs.writeFileSync(filePath, JSON.stringify(arr));

  const slug = file.replace(/^restaurants-/, '').replace(/\.json$/, '');
  indexEntries.push({ gu: arr[0].gu, slug, count: arr.length, file });
  console.log(`  ${arr[0].gu.padEnd(5)} ${arr.length.toString().padStart(6)}  →  ${file}`);
}

indexEntries.sort((a, b) => a.gu.localeCompare(b.gu, 'ko'));

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

fs.writeFileSync(
  path.join(BY_GU_DIR, '_index.json'),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    total: stats.total,
    files: indexEntries,
    byCategory: stats.byCat,
    byDataScore: stats.byDataScore,
    byRisk: stats.byRisk,
  }, null, 2)
);

console.log(`\nWrote ${indexEntries.length} by-gu files`);
console.log(`Total: ${stats.total.toLocaleString()} restaurants`);
console.log(`Data score distribution:`, stats.byDataScore);
console.log(`Risk tags:`, stats.byRisk);
