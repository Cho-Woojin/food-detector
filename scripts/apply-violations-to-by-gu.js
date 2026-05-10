#!/usr/bin/env node
// data/by-gu/*.json 의 각 식당 record에 AI 분류 결과 머지.
// 추가 필드 2개:
//   - flags.punishReasons   (string)  — 위반사유 요약 pipe-separated (예: "이물혼입(바퀴벌레)")
//   - flags.hygieneViolation (boolean) — 위생 직결 위반 여부 (any hygiene_related=true)
//
// 매칭 방법:
//   1. 정규화 주소 매칭 (도로명 + 번지)
//   2. 후보 중 정규화 이름 substring 매칭
//   3. 실패 시 fallback: 자치구 + 정규화 이름 매칭
//
// 입력: data/violations-classified.json (309건)
// 출력: data/by-gu/*.json 덮어쓰기

const fs = require('fs');
const path = require('path');

const CLASSIFIED = path.join(__dirname, '..', 'data', 'violations-classified.json');
const BY_GU_DIR = path.join(__dirname, '..', 'data', 'by-gu');

// ---- 정규화 헬퍼 ----
function normalizeAddr(addr) {
  // 괄호 + 첫 콤마 이후 + 다중 공백 제거 → "서울특별시 [구] [도로명] [번지]" 형태
  return (addr || '')
    .replace(/\([^)]*\)/g, '')
    .replace(/,.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeName(name) {
  // 괄호 안 지점명 제거 + 다중 공백 정리
  return (name || '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractGu(addr) {
  const m = (addr || '').match(/서울특별시\s+([가-힣]+구)/);
  return m ? m[1] : '';
}

// ---- 분류 결과 로드 + 인덱싱 ----
const cls = JSON.parse(fs.readFileSync(CLASSIFIED, 'utf8'));
const violations = cls.classifications;
console.log(`분류 데이터 로드: ${violations.length}건`);

// 주소별 인덱스: normalizedAddr → [violation, ...]
const byAddr = new Map();
// 자치구+이름 인덱스: "${gu}|${normalizedName}" → [violation, ...]
const byNameGu = new Map();

for (const v of violations) {
  const addrKey = normalizeAddr(v.addr);
  if (addrKey) {
    if (!byAddr.has(addrKey)) byAddr.set(addrKey, []);
    byAddr.get(addrKey).push(v);
  }
  const gu = extractGu(v.addr);
  if (gu) {
    const nameKey = `${gu}|${normalizeName(v.bssh)}`;
    if (!byNameGu.has(nameKey)) byNameGu.set(nameKey, []);
    byNameGu.get(nameKey).push(v);
  }
}

console.log(`주소 인덱스: ${byAddr.size} 키`);
console.log(`이름+자치구 인덱스: ${byNameGu.size} 키\n`);

// ---- by-gu 처리 ----
const files = fs.readdirSync(BY_GU_DIR)
  .filter(f => f.startsWith('restaurants-') && f.endsWith('.json'));

// 1차 패스: by-gu 식당의 이름+자치구 카운트 → 동명 식당이 여러 개면 violation을 하나로 귀속 불가
const byGuNameCount = new Map();
for (const file of files) {
  const arr = JSON.parse(fs.readFileSync(path.join(BY_GU_DIR, file), 'utf8'));
  for (const r of arr) {
    const k = `${r.gu}|${normalizeName(r.name)}`;
    byGuNameCount.set(k, (byGuNameCount.get(k) || 0) + 1);
  }
}
console.log(`by-gu 식당 이름+구 unique 키: ${byGuNameCount.size}\n`);

let totalRestaurants = 0;
let matchedRestaurants = 0;
let hygieneViolators = 0;
const matchedViolationIds = new Set();
const matchByMethod = { addr: 0, name: 0, none: 0, name_skipped_ambiguous: 0 };

for (const file of files) {
  const filePath = path.join(BY_GU_DIR, file);
  const arr = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(arr)) continue;

  for (const r of arr) {
    totalRestaurants++;
    let matched = [];
    let method = 'none';

    // 1차: 주소 매칭 (after normalization) + 이름 substring 검증
    const rAddrKey = normalizeAddr(r.roadAddr);
    if (rAddrKey && byAddr.has(rAddrKey)) {
      const candidates = byAddr.get(rAddrKey);
      const rNameNorm = normalizeName(r.name);
      for (const v of candidates) {
        const vNameNorm = normalizeName(v.bssh);
        // 이름이 정확히 일치하거나 한쪽이 다른쪽을 포함하면 같은 식당으로 간주
        if (
          rNameNorm === vNameNorm ||
          rNameNorm.includes(vNameNorm) ||
          vNameNorm.includes(rNameNorm)
        ) {
          matched.push(v);
        }
      }
      if (matched.length > 0) method = 'addr';
    }

    // 2차 fallback: 자치구+이름 매칭 — 단, by-gu에 같은 이름+구 식당이 여러 개면
    // violation을 누구에게 귀속해야 할지 결정할 수 없으므로 매칭 SKIP
    if (matched.length === 0) {
      const nameKey = `${r.gu}|${normalizeName(r.name)}`;
      if (byNameGu.has(nameKey)) {
        const byGuCount = byGuNameCount.get(nameKey) || 0;
        if (byGuCount === 1) {
          matched = [...byNameGu.get(nameKey)];
          method = 'name';
        } else {
          method = 'name_skipped_ambiguous';
        }
      }
    }

    matchByMethod[method]++;

    if (matched.length > 0) {
      const reasons = matched.map(v => v.summary).filter(Boolean);
      const hygiene = matched.some(v => v.hygiene_related);
      r.flags.punishReasons = reasons.join('|');
      r.flags.hygieneViolation = hygiene;
      matchedRestaurants++;
      if (hygiene) hygieneViolators++;
      for (const v of matched) matchedViolationIds.add(v.idx);
    } else {
      // 명시적으로 빈값 — 일관된 스키마 유지
      r.flags.punishReasons = '';
      r.flags.hygieneViolation = false;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(arr));
}

console.log(`=========================================`);
console.log(`총 식당: ${totalRestaurants.toLocaleString()}`);
console.log(`매칭된 식당: ${matchedRestaurants}`);
console.log(`  주소 매칭: ${matchByMethod.addr}`);
console.log(`  이름+구 매칭: ${matchByMethod.name}`);
console.log(`  매칭 안 됨: ${matchByMethod.none.toLocaleString()}`);
console.log(`\n위생 직결 위반 식당 (hygieneViolation=true): ${hygieneViolators}`);
console.log(`\n분류 데이터 309건 중 매칭된 violation: ${matchedViolationIds.size}/309`);
console.log(`매칭 안 된 violation: ${309 - matchedViolationIds.size}건 (대부분 폐업으로 by-gu 인덱스에 없는 식당)`);
