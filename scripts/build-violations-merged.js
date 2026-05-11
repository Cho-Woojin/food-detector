#!/usr/bin/env node
// 행정처분 3개 출처 → 단일 통합 파일 (가벼운 union + dedup)
//
// 입력:
//   data/violations-raw.json         식약처 I2630 (서울 309건)
//   data/violations-classified.json  AI 분류 (309건, category/severity)
//   data/violations-eminwon.json     자치구 새올민원 raw (3,734건)
//
// 출력:
//   data/violations.json   단일 SoT (records 배열 + meta)
//
// 룰:
//   - 서울 + 음식점 induty만
//   - id hash = bssh_norm + addr_norm_prefix + type
//   - 중복은 첫 레코드 유지 + source 배열에 추가
//   - 카테고리 매트릭스(차등 감점)는 다음 라운드 — 이번엔 단순 union

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const I2630 = path.join(ROOT, 'data', 'violations-raw.json');
const CLASSIFIED = path.join(ROOT, 'data', 'violations-classified.json');
const EMINWON = path.join(ROOT, 'data', 'violations-eminwon.json');
const OUT = path.join(ROOT, 'data', 'violations.json');

const FOOD_INDUTY = new Set(['일반음식점', '휴게음식점', '집단급식소', '단란주점', '유흥주점', '식품접객업']);

function normalize(s) {
  return (s || '').toLowerCase().replace(/\s+/g, '').replace(/[(){}\[\]·,.\-]/g, '');
}

function extractGu(addr) {
  if (!addr || !addr.startsWith('서울')) return null;
  const m = addr.match(/서울특별시\s+([가-힣]+구)/) || addr.match(/^서울\s+([가-힣]+구)/);
  return m ? m[1] : null;
}

function hashId(bssh, addr, type) {
  const key = normalize(bssh) + '|' + normalize(addr).slice(0, 40) + '|' + (type || '');
  return crypto.createHash('md5').update(key).digest('hex').slice(0, 12);
}

const records = new Map();

console.log('[1/3] I2630 raw 로드 + AI 분류 머지');
const raw = JSON.parse(fs.readFileSync(I2630, 'utf-8'));
const cls = JSON.parse(fs.readFileSync(CLASSIFIED, 'utf-8'));
const clsByIdx = new Map();
for (const c of cls.classifications || []) clsByIdx.set(c.idx, c);

for (const r of raw) {
  const c = clsByIdx.get(r.idx) || {};
  const id = hashId(r.bssh, r.addr, r.type);
  if (!records.has(id)) {
    records.set(id, {
      id,
      sources: ['mfds_i2630'],
      gu: extractGu(r.addr),
      bssh: r.bssh,
      addr: r.addr,
      type: r.type,
      viltcn: r.viltcn,
      category: c.category || null,
      severity: c.severity || null,
      hygiene_related: c.hygiene_related ?? null,
      summary: c.summary || null,
    });
  }
}
console.log('  I2630 records:', records.size);

console.log('[2/3] eminwon raw 로드 (음식점만)');
const em = JSON.parse(fs.readFileSync(EMINWON, 'utf-8'));
let emTotal = 0, emFood = 0, emAdded = 0, emDup = 0;

for (const [gu, list] of Object.entries(em.records || {})) {
  for (const r of list) {
    emTotal++;
    if (!FOOD_INDUTY.has(r.induty)) continue;
    emFood++;
    const v = (r.violations || [])[0] || {};
    const viltcn = v.viltcn || '';
    const type = r.punishType || ''; // eminwon은 대부분 빈값
    const addr = r.addrRaw || `서울특별시 ${gu}`;
    const id = hashId(r.bssh, addr, type || viltcn.slice(0, 20));
    if (records.has(id)) {
      const ex = records.get(id);
      if (!ex.sources.includes('eminwon')) ex.sources.push('eminwon');
      emDup++;
    } else {
      records.set(id, {
        id,
        sources: ['eminwon'],
        gu,
        bssh: r.bssh,
        addr,
        type,
        viltcn,
        date: r.date,
        category: null,
        severity: null,
        hygiene_related: null,
        summary: null,
      });
      emAdded++;
    }
  }
}
console.log('  eminwon total:', emTotal, '/ 음식점:', emFood, '/ 신규 추가:', emAdded, '/ 중복:', emDup);

console.log('[3/3] 출력');
const out = {
  meta: {
    builtAt: new Date().toISOString().slice(0, 10),
    sources: ['mfds_i2630 (식약처 OpenAPI I2630)', 'eminwon (서울 25개 자치구 새올전자민원창구)'],
    note: '가벼운 통합본 (union + id hash dedup). 카테고리 매트릭스(차등 감점)는 다음 라운드. 현재는 by-gu에 부착하는 룰 자체는 기존 apply-* 스크립트가 raw 파일에서 직접 가져옴 — 이 파일은 prep용.',
    counts: {
      total: records.size,
      from_i2630: raw.length,
      from_eminwon_food: emFood,
      eminwon_dup_with_i2630: emDup,
    },
  },
  records: [...records.values()],
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log('  총:', records.size, '건 →', OUT);
