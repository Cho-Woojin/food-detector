#!/usr/bin/env node
// LOCALDATA raw 인허가 CSV → 서울 영업·정상 마스터 통합 CSV 재빌드
//
// 입력:
//   _archive/raw/extract/일반음식점.utf8.csv  (LOCALDATA 07_24_04_P)
//   _archive/raw/extract/휴게음식점.utf8.csv  (LOCALDATA 07_24_05_P)
//   _archive/restaurants_with_scores.csv.original  (기존 인증/처분 enrichment 소스)
//
// 출력:
//   _archive/restaurants_with_scores.csv  (split-restaurants.js 입력)
//
// 필터: 소재지전체주소 prefix "서울" + 상세영업상태명 == "영업"
//       휴게음식점은 위생업태명에 "편의점" 포함 시 제외

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const proj4 = require('proj4');

const ROOT = path.join(__dirname, '..');
const RAW_GENERAL = path.join(ROOT, '_archive', 'raw', 'extract', '일반음식점.utf8.csv');
const RAW_REST = path.join(ROOT, '_archive', 'raw', 'extract', '휴게음식점.utf8.csv');
const ORIG_CSV = path.join(ROOT, '_archive', 'restaurants_with_scores.csv.original');
const OUT_CSV = path.join(ROOT, '_archive', 'restaurants_with_scores.csv');

proj4.defs(
  'EPSG:5174',
  '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43'
);

const COL = {
  IDX: 0,
  SVC_NM: 1,
  MGTNO: 4,
  TRD_STATE_NM: 8,
  DTL_STATE_NM: 10,
  DCB_YMD: 11,
  PHONE: 15,
  ADDR: 18,
  ROAD_ADDR: 19,
  BPLCNM: 21,
  UPTAE_NM: 25,
  X: 26,
  Y: 27,
  WSE_NM: 28,
};

function parseLine(line) {
  const cells = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') inQuote = false;
      else cur += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') {
        cells.push(cur);
        cur = '';
      } else cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

function extractGu(addr) {
  if (!addr || !addr.startsWith('서울')) return null;
  const m = addr.match(/서울특별시\s+([가-힣]+구)/);
  return m ? m[1] : null;
}

function mapCategory(uptae, wse) {
  const s = (uptae || '').trim() + ' ' + (wse || '').trim();
  if (/일식|회|초밥|스시/.test(s)) return '일식';
  if (/중식|중국/.test(s)) return '중식';
  if (/양식|이탈리|이태리|프렌치|아메리/.test(s)) return '양식';
  if (/카페|커피|디저트|베이커리|제과|아이스크림/.test(s)) return '카페';
  if (/치킨|호프|주점|바|펍|와인/.test(s)) return '주점';
  if (/패스트푸드|버거/.test(s)) return '패스트푸드';
  if (/분식/.test(s)) return '분식';
  if (/한식|한정식|국밥|찌개|곰탕|족발|보쌈|냉면|국수|순대|감자탕/.test(s)) return '한식';
  return '기타';
}

function csvEscape(v) {
  const s = String(v == null ? '' : v);
  if (/[,"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

console.log('[1/3] 기존 통합 CSV에서 enrichment 머지 맵 빌드...');
const enrichmentMap = new Map();
{
  const text = fs.readFileSync(ORIG_CSV, 'utf-8');
  const lines = text.split('\n');
  const header = parseLine(lines[0]);
  const idx = {};
  header.forEach((h, i) => (idx[h.replace(/^﻿/, '')] = i));
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const cells = parseLine(lines[i]);
    const mgtno = cells[idx.mgtno];
    if (!mgtno) continue;
    enrichmentMap.set(mgtno, {
      hygiene_designated: cells[idx.hygiene_designated] || 'False',
      hygiene_designated_delta: cells[idx.hygiene_designated_delta] || '0',
      hg_asgn_to: cells[idx.hg_asgn_to] || '',
      hg_asgn_no: cells[idx.hg_asgn_no] || '',
      eval_grade: cells[idx.eval_grade] || '',
      eval_delta: cells[idx.eval_delta] || '0',
      punish_count: cells[idx.punish_count] || '0',
      punish_types: cells[idx.punish_types] || '',
      punish_delta: cells[idx.punish_delta] || '0',
      model_delta: cells[idx.model_delta] || '0',
      has_model: cells[idx.has_model] || 'False',
      kakao_id: cells[idx.kakao_id] || '',
      kakao_url: cells[idx.kakao_url] || '',
      kakao_category: cells[idx.kakao_category] || '',
    });
  }
}
console.log('  머지 맵 크기: ' + enrichmentMap.size);

console.log('[2/3] raw CSV stream 처리 + 필터 + 머지...');
const outStream = fs.createWriteStream(OUT_CSV);
const HEADER =
  'mgtno,name,gu,category,addr,road_addr,phone,x,y,lat,lng,base_score,hygiene_designated,hygiene_designated_delta,hg_asgn_to,hg_asgn_no,eval_grade,eval_delta,punish_count,punish_types,punish_delta,model_delta,has_model,score,grade,source,kakao_id,kakao_url,kakao_category';
outStream.write('﻿' + HEADER + '\n');

const stats = {
  general: { total: 0, seoul: 0, active: 0, kept: 0, no_coord: 0 },
  rest: { total: 0, seoul: 0, active: 0, kept: 0, no_coord: 0, conv_excluded: 0 },
  enriched: 0,
  punished_in_active: 0,
};

async function processFile(filePath, isRest, srcCode) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });
  let isFirst = true;
  for await (const line of rl) {
    if (isFirst) {
      isFirst = false;
      continue;
    }
    if (!line) continue;
    const cells = parseLine(line);
    if (cells.length < 30) continue;
    const bucket = isRest ? stats.rest : stats.general;
    bucket.total++;

    const addr = cells[COL.ADDR] || '';
    if (!addr.startsWith('서울')) continue;
    bucket.seoul++;

    const dtl = cells[COL.DTL_STATE_NM];
    if (dtl !== '영업') continue;
    bucket.active++;

    if (isRest) {
      const wse = cells[COL.WSE_NM] || '';
      if (/편의점/.test(wse)) {
        bucket.conv_excluded++;
        continue;
      }
    }

    const mgtno = cells[COL.MGTNO];
    const name = cells[COL.BPLCNM];
    const gu = extractGu(addr);
    if (!gu || !mgtno || !name) continue;

    const roadAddr = cells[COL.ROAD_ADDR];
    const phone = cells[COL.PHONE];
    const x = cells[COL.X];
    const y = cells[COL.Y];
    const uptae = cells[COL.UPTAE_NM];
    const wse = cells[COL.WSE_NM];
    const category = mapCategory(uptae, wse);

    let lat = '',
      lng = '';
    const nx = parseFloat(x),
      ny = parseFloat(y);
    if (Number.isFinite(nx) && Number.isFinite(ny) && nx > 0 && ny > 0) {
      try {
        const [lon, la] = proj4('EPSG:5174', 'EPSG:4326', [nx, ny]);
        lat = la.toFixed(7);
        lng = lon.toFixed(7);
      } catch (e) {}
    }
    if (!lat || !lng) bucket.no_coord++;

    const e = enrichmentMap.get(mgtno) || {};
    if (enrichmentMap.has(mgtno)) stats.enriched++;
    if ((e.punish_count || '0') !== '0') stats.punished_in_active++;

    const row = [
      mgtno,
      name,
      gu,
      category,
      addr,
      roadAddr,
      phone,
      x,
      y,
      lat,
      lng,
      '50',
      e.hygiene_designated || 'False',
      e.hygiene_designated_delta || '0',
      e.hg_asgn_to || '',
      e.hg_asgn_no || '',
      e.eval_grade || '',
      e.eval_delta || '0',
      e.punish_count || '0',
      e.punish_types || '',
      e.punish_delta || '0',
      e.model_delta || '0',
      e.has_model || 'False',
      '0',
      '',
      srcCode,
      e.kakao_id || '',
      e.kakao_url || '',
      e.kakao_category || '',
    ];
    outStream.write(row.map(csvEscape).join(',') + '\n');
    bucket.kept++;
  }
}

(async () => {
  await processFile(RAW_GENERAL, false, 'WS07');
  await processFile(RAW_REST, true, 'WS07R');
  outStream.end();
  await new Promise((r) => outStream.on('finish', r));

  console.log(
    '  일반: total=' +
      stats.general.total +
      ' seoul=' +
      stats.general.seoul +
      ' active=' +
      stats.general.active +
      ' no_coord=' +
      stats.general.no_coord +
      ' kept=' +
      stats.general.kept
  );
  console.log(
    '  휴게: total=' +
      stats.rest.total +
      ' seoul=' +
      stats.rest.seoul +
      ' active=' +
      stats.rest.active +
      ' conv_excluded=' +
      stats.rest.conv_excluded +
      ' no_coord=' +
      stats.rest.no_coord +
      ' kept=' +
      stats.rest.kept
  );
  console.log('  enrichment 머지: ' + stats.enriched + ' (영업중인 식당 중 기존 통합 CSV에 있던 비율)');
  console.log('  영업중 + 처분이력 보유: ' + stats.punished_in_active);
  console.log('[3/3] 출력: ' + OUT_CSV);
})();
