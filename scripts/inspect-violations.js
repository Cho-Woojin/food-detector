#!/usr/bin/env node
// 처분종류별 위반사유 원문(VILTCN) 직접 inspect.
// 키워드 매칭 없이 raw 텍스트 분포 → 사람이 보고 판단할 수 있게.

const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '..', '..', '..', 'data', '.env');
const env = fs.readFileSync(ENV_PATH, 'utf8');
const KEY = (env.match(/FOOD_SAFETY_KOREA_KEY=(\S+)/) || [])[1];

(async () => {
  const all = [];
  for (let s = 1; s <= 5000; s += 1000) {
    const url = `http://openapi.foodsafetykorea.go.kr/api/${KEY}/I2630/json/${s}/${s + 999}`;
    const r = await fetch(url).then(r => r.json());
    const rows = r.I2630?.row || [];
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < 1000) break;
  }
  const seoul = all.filter(r => (r.ADDR || '').startsWith('서울'));
  console.log(`서울 ${seoul.length}건\n`);

  // 처분종류별 원문 정규화 + 빈도
  const byType = {};
  for (const r of seoul) {
    const t = r.DSPS_TYPECD_NM;
    if (!byType[t]) byType[t] = [];
    byType[t].push((r.VILTCN || '').trim());
  }

  for (const [type, texts] of Object.entries(byType).sort((a,b) => b[1].length - a[1].length)) {
    console.log('=========================================');
    console.log(`[${type}] 총 ${texts.length}건`);
    console.log('=========================================');

    // 원문 그대로 빈도 (전부)
    const exact = {};
    for (const v of texts) {
      // 날짜 prefix "(20260415)" 제거 + 공백 정규화
      const norm = v.replace(/^\([0-9]{4,8}\)\s*/, '').replace(/\s+/g, ' ').trim();
      exact[norm] = (exact[norm] || 0) + 1;
    }
    const sorted = Object.entries(exact).sort((a,b) => b[1] - a[1]);

    console.log(`고유 텍스트 ${sorted.length}종 (정규화 후)\n`);
    console.log(`상위 30종 (커버리지):`);
    let cum = 0;
    for (let i = 0; i < Math.min(30, sorted.length); i++) {
      const [v, c] = sorted[i];
      cum += c;
      console.log(`  ${c.toString().padStart(3)}건 (누적 ${(cum/texts.length*100).toFixed(0)}%)  ${v.slice(0, 100)}`);
    }
    if (sorted.length > 30) {
      const remaining = texts.length - cum;
      console.log(`  ... 나머지 ${sorted.length - 30}종 = ${remaining}건`);
    }
    console.log();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
