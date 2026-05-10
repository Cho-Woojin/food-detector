#!/usr/bin/env node
// 식약처 행정처분(I2630) 위반사유 분석.
// 종합 점수 룰의 "행정처분 -X점"이 실제 어떤 위반사유에서 나오는지 파악용.
//
// 입력: FOOD_SAFETY_KOREA_KEY (data/.env)
// 출력: 콘솔에 처분종류 × 위반사유 키워드 분포 + 자주 나오는 위반사유 텍스트.

const fs = require('fs');
const path = require('path');

// ---- API 키 로드 (data/.env에서) ----
const ENV_PATH = path.join(__dirname, '..', '..', '..', '..', 'data', '.env');
const env = fs.readFileSync(ENV_PATH, 'utf8');
const KEY = (env.match(/FOOD_SAFETY_KOREA_KEY=(\S+)/) || [])[1];
if (!KEY) {
  console.error('FOOD_SAFETY_KOREA_KEY 못 찾음 in', ENV_PATH);
  process.exit(1);
}

// ---- I2630 fetch ----
const BATCH = 1000;
async function fetchBatch(start, end) {
  const url = `http://openapi.foodsafetykorea.go.kr/api/${KEY}/I2630/json/${start}/${end}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.I2630;
}

(async () => {
  // 전국 ~2,918건 → 1-1000 / 1001-2000 / 2001-3000 세 번이면 충분
  const all = [];
  for (let s = 1; s <= 5000; s += BATCH) {
    const e = s + BATCH - 1;
    const batch = await fetchBatch(s, e);
    if (!batch) break;
    if (batch.RESULT && batch.RESULT.CODE !== 'INFO-000') {
      console.log('done at', s, batch.RESULT);
      break;
    }
    if (!batch.row) break;
    all.push(...batch.row);
    console.log(`${s}-${e}: +${batch.row.length}건 (누적 ${all.length})`);
    if (batch.row.length < BATCH) break;
  }

  const seoul = all.filter(r => (r.ADDR || '').startsWith('서울'));
  console.log(`\n전국 ${all.length}건 / 서울 ${seoul.length}건\n`);

  // ---- 처분종류 분포 ----
  const byType = {};
  for (const r of seoul) byType[r.DSPS_TYPECD_NM] = (byType[r.DSPS_TYPECD_NM] || 0) + 1;
  console.log('=========================================');
  console.log('처분종류 분포 (서울):');
  for (const [t, c] of Object.entries(byType).sort((a,b)=>b[1]-a[1])) {
    console.log('  ' + t.padEnd(14) + ' ' + c.toString().padStart(5));
  }

  // ---- 위반사유 키워드 분포 ----
  const KEYWORDS = [
    // 위생 직결
    '유통기한', '소비기한', '부패', '변질', '이물', '오염', '곰팡이', '벌레',
    '냉장', '냉동', '온도', '보관',
    // 시설·청결
    '청결', '시설기준', '시설 기준', '위생관리', '위생모', '위생복', '손위생',
    // 영업 관련
    '영업장', '신고', '변경', '미신고', '폐업',
    // 위해 식품
    '유해', '미허가', '무허가', '미인증',
    // 표시
    '표시기준', '표시 위반', '허위표시', '원산지',
    // 미신고/무신고/위반행위
    '준수사항', '준수 사항',
    // 식품 자체
    '원료', '제조', '가공',
  ];

  const kwCount = {};
  for (const r of seoul) {
    const v = (r.VILTCN || '').replace(/\s+/g, '');
    for (const kw of KEYWORDS) {
      if (v.includes(kw.replace(/\s+/g, ''))) kwCount[kw] = (kwCount[kw] || 0) + 1;
    }
  }
  console.log('\n=========================================');
  console.log('위반사유 키워드 빈도 (서울 ' + seoul.length + '건 중):');
  for (const [kw, c] of Object.entries(kwCount).sort((a,b)=>b[1]-a[1])) {
    if (c < 3) continue;
    console.log('  ' + kw.padEnd(10) + ' ' + c.toString().padStart(5) + ' (' + (c/seoul.length*100).toFixed(1) + '%)');
  }

  // ---- 처분종류 × 키워드 cross-tab ----
  console.log('\n=========================================');
  console.log('처분종류별 주요 위반사유:');
  for (const t of Object.keys(byType).sort((a,b)=>byType[b]-byType[a])) {
    const subset = seoul.filter(r => r.DSPS_TYPECD_NM === t);
    const sub = {};
    for (const r of subset) {
      const v = (r.VILTCN || '').replace(/\s+/g, '');
      for (const kw of KEYWORDS) {
        if (v.includes(kw.replace(/\s+/g, ''))) sub[kw] = (sub[kw] || 0) + 1;
      }
    }
    const top = Object.entries(sub).sort((a,b)=>b[1]-a[1]).slice(0, 5);
    if (top.length === 0) continue;
    console.log(`\n  [${t}] (${byType[t]}건)`);
    for (const [kw, c] of top) {
      console.log('    ' + kw.padEnd(10) + ' ' + c.toString().padStart(4) + ' (' + (c/byType[t]*100).toFixed(0) + '%)');
    }
  }

  // ---- 자주 나오는 위반사유 텍스트 (정확 일치) ----
  const exactCount = {};
  for (const r of seoul) {
    const v = (r.VILTCN || '').trim();
    if (!v) continue;
    // 짧게 자른 핵심부 (괄호·특수문자 제거)
    const short = v.split(/\([^)]*\)/).join('').replace(/\s+/g, ' ').trim().slice(0, 60);
    exactCount[short] = (exactCount[short] || 0) + 1;
  }
  console.log('\n=========================================');
  console.log('자주 나오는 위반사유 텍스트 Top 15:');
  const exactSorted = Object.entries(exactCount).sort((a,b)=>b[1]-a[1]).slice(0, 15);
  for (const [v, c] of exactSorted) {
    console.log('  ' + c.toString().padStart(4) + '건  ' + v);
  }

  // ---- 옵션: by-gu JSON과 매칭 ----
  console.log('\n=========================================');
  console.log('샘플 위반사유 원문 5건:');
  for (const r of seoul.slice(0, 5)) {
    console.log(`\n  [${r.DSPS_TYPECD_NM}] ${r.PRCSCITYPOINT_BSSHNM || r.BSSH_NM}`);
    console.log(`    ADDR: ${(r.ADDR||'').slice(0,40)}`);
    console.log(`    VILTCN: ${(r.VILTCN||'').slice(0,200)}`);
  }
})().catch(e => {
  console.error('실패:', e.message);
  process.exit(1);
});
