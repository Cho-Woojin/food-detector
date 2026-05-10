#!/usr/bin/env node
// I2630 raw 데이터를 JSON으로 덤프 (분류 입력용)
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '..', '..', '..', 'data', '.env');
const KEY = (fs.readFileSync(ENV_PATH, 'utf8').match(/FOOD_SAFETY_KOREA_KEY=(\S+)/) || [])[1];
const OUT = path.join(__dirname, '..', 'data', 'violations-raw.json');

(async () => {
  const all = [];
  for (let s = 1; s <= 5000; s += 1000) {
    const url = `http://openapi.foodsafetykorea.go.kr/api/${KEY}/I2630/json/${s}/${s + 999}`;
    const j = await fetch(url).then(r => r.json());
    const rows = j.I2630?.row || [];
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < 1000) break;
  }
  const seoul = all.filter(r => (r.ADDR || '').startsWith('서울'));
  const slim = seoul.map((r, i) => ({
    idx: i,
    bssh: r.PRCSCITYPOINT_BSSHNM || r.BSSH_NM,
    addr: r.ADDR,
    type: r.DSPS_TYPECD_NM,
    viltcn: (r.VILTCN || '').replace(/^\([0-9]{4,8}\)\s*/, '').replace(/\s+/g, ' ').trim(),
  }));
  fs.writeFileSync(OUT, JSON.stringify(slim, null, 2));
  console.log(`서울 ${slim.length}건 → ${OUT}`);
})();
