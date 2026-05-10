#!/usr/bin/env node
// 기존 data/by-gu/*.json의 flags를 입력으로, 새 데이터 점수(0~50)와 breakdown을 재계산.
// CSV 없이 점수 룰만 바뀐 케이스에 사용 (예: 영업소폐쇄 가중치 조정, 신호 재구성 등).
//
// 변경:
// - score: 옛 0~100 → 새 0~50 (데이터 점수만)
// - breakdown: { base, hygiene, evalDelta, punish, model } → { data, hygiene, evalDelta, punish, model }
// - grade, color: 제거 (클라이언트에서 deriveGrade()로 계산)
//
// 출력: data/by-gu/*.json 덮어쓰기 + data/restaurants-index.json + data/by-gu/_index.json 갱신.
//
// 룰의 단일 원본은 scripts/split-restaurants.js의 computeDataScore — 이 스크립트도 동일 룰 사용.

const fs = require('fs');
const path = require('path');

const BY_GU_DIR = path.join(__dirname, '..', 'data', 'by-gu');
const INDEX_OUT = path.join(__dirname, '..', 'data', 'restaurants-index.json');

const PUNISH_DELTAS = {
  '영업소폐쇄': -50, '영업정지': -20, '품목제조정지': -15,
  '과태료': -8, '과징금': -8, '시정명령': -3, '경고': -2,
};

function computeDataScore(flags) {
  let data = 25;
  let hygiene = 0, evalDelta = 0, punish = 0, model = 0;

  if (flags.hygieneDesignated) {
    hygiene = 20; data += hygiene;
  } else if (flags.evalGrade === '자율관리업소') {
    evalDelta = 10; data += evalDelta;
  } else if (flags.evalGrade === '일반관리업소') {
    evalDelta = 3; data += evalDelta;
  } else if (flags.evalGrade === '중점관리업소') {
    evalDelta = -15; data += evalDelta;
  } else if (flags.evalGrade === '평가불능업소') {
    evalDelta = -5; data += evalDelta;
  }

  if (flags.hasModel) {
    model = 5; data += model;
  }

  const types = (flags.punishTypes || '').split('|').filter(Boolean);
  for (const t of types) {
    punish += PUNISH_DELTAS[t] ?? -3;
  }
  data += punish;

  data = Math.max(0, Math.min(50, data));
  return { data, hygiene, evalDelta, punish, model };
}

function bucketDataScore(score) {
  if (score >= 50) return '50';
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
