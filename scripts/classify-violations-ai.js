#!/usr/bin/env node
// 식약처 행정처분(I2630) 위반사유를 Claude Haiku로 분류.
// 키워드 매칭이 아닌 LLM 의미 이해 → 정확한 카테고리·심각도 분류.
//
// 입력: data/violations-raw.json (scripts/dump-violations-raw.js 결과)
// 출력: data/violations-classified.json
//
// 모델: claude-haiku-4-5 (저렴·빠름)
// 배치: 50건 / 1회 API 호출 → 309건 ≈ 7회 호출
// 비용: 대략 $0.10 미만 (Haiku 4.5: $1/M in, $5/M out)
//
// 환경변수: ANTHROPIC_API_KEY (data/.env에 추가)

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk').default;

// ---- API 키 로드 (data/.env 또는 환경변수) ----
function loadEnv(name) {
  if (process.env[name]) return process.env[name];
  const envPath = path.join(__dirname, '..', '..', '..', '..', 'data', '.env');
  if (fs.existsSync(envPath)) {
    const m = fs.readFileSync(envPath, 'utf8').match(new RegExp(`${name}=(\\S+)`));
    if (m) return m[1];
  }
  return null;
}

const ANTHROPIC_KEY = loadEnv('ANTHROPIC_API_KEY');
if (!ANTHROPIC_KEY) {
  console.error('ANTHROPIC_API_KEY 못 찾음. data/.env 또는 환경변수에 추가:');
  console.error('  ANTHROPIC_API_KEY=sk-ant-...');
  console.error('키 발급: https://console.anthropic.com/settings/keys');
  process.exit(1);
}

const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

// ---- 입출력 경로 ----
const INPUT = path.join(__dirname, '..', 'data', 'violations-raw.json');
const OUTPUT = path.join(__dirname, '..', 'data', 'violations-classified.json');

// ---- 분류 카테고리 ----
const CATEGORIES = [
  'hygiene_direct',         // 식품 위생 직결: 이물혼입·유통기한·부패·곰팡이·무등록 식품 등
  'hygiene_facility',       // 시설·청결: 위생복 미착용·시설기준 미달·청결 미흡
  'youth_alcohol',          // 청소년 주류 제공·유해업소 출입·고용
  'entertainment_violation',// 유흥접객·춤·노래·음향시설 등 영업형태 위반
  'immoral_act',            // 성매매 알선·호객행위·윤락 등
  'closure_admin',          // 폐업·시설철거·사업자등록 말소 (위생 무관, 사실상 정리)
  'admin_other',            // 변경신고 위반·영업장외 영업 등 행정 절차
  'other',                  // 위 분류 어디에도 안 맞음
];

const SYSTEM_PROMPT = `당신은 한국 식약처 행정처분 분석 전문가입니다.
주어진 식당 행정처분 데이터의 위반사유(VILTCN) 텍스트를 다음 8개 카테고리로 분류하세요.

카테고리:
- hygiene_direct: 식품 위생 직결 위반 (이물혼입·바퀴벌레·유통기한 경과·부패·변질·곰팡이·무등록 식품 사용·원료 위반 등)
- hygiene_facility: 시설·청결 미흡 (위생복 미착용·시설기준 미달·청결 부족·위생모 등)
- youth_alcohol: 청소년 관련 (주류 판매·제공·청소년 출입·청소년유해업소 청소년 고용)
- entertainment_violation: 영업 형태 위반 (유흥접객·손님 춤 허용·노래 허용·음향시설 위반·단란주점 영업 행위)
- immoral_act: 사회·도덕 위반 (성매매 알선·호객행위·윤락)
- closure_admin: 폐업 행정정리 (영업시설 철거·멸실·폐업신고 미이행·사업자등록 말소·무단폐업)
- admin_other: 기타 행정 위반 (변경신고 위반·영업장외 영업·영업소 이전 미신고 등 폐업과 무관한 행정 절차)
- other: 위 어디에도 안 맞는 경우

각 케이스에 대해:
1. category: 위 8개 중 하나
2. severity: 위생/안전 관점에서 "high" (중대) | "medium" (주의) | "low" (경미)
   - hygiene_direct, immoral_act는 보통 high
   - youth_alcohol, entertainment_violation은 보통 medium
   - closure_admin, admin_other는 보통 low (위생 위험 시그널 아님)
3. hygiene_related: 식품 위생 직결 여부 (true/false). hygiene_direct·hygiene_facility만 true.
4. summary: 위반 사유 한 줄 요약 (한국어, 사용자가 이해하기 쉽게, 30자 이내)

JSON 형식으로 분류 결과 배열을 반환하세요.`;

// ---- JSON Schema (구조화된 출력 강제) ----
const SCHEMA = {
  type: 'object',
  properties: {
    classifications: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          idx: { type: 'integer' },
          category: { type: 'string', enum: CATEGORIES },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          hygiene_related: { type: 'boolean' },
          summary: { type: 'string' },
        },
        required: ['idx', 'category', 'severity', 'hygiene_related', 'summary'],
        additionalProperties: false,
      },
    },
  },
  required: ['classifications'],
  additionalProperties: false,
};

// ---- 메인 ----
(async () => {
  const raw = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  console.log(`입력: ${raw.length}건`);

  const BATCH_SIZE = 50;
  const batches = [];
  for (let i = 0; i < raw.length; i += BATCH_SIZE) {
    batches.push(raw.slice(i, i + BATCH_SIZE));
  }
  console.log(`배치: ${batches.length}회 호출 (배치당 ${BATCH_SIZE}건)\n`);

  const allResults = [];
  let totalInput = 0, totalOutput = 0;

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    const userMsg = `다음 ${batch.length}건의 위반사유를 분류하세요. 각 케이스의 idx를 그대로 유지하세요.\n\n` +
      batch.map(r => `[idx=${r.idx}] (${r.type}) ${r.viltcn}`).join('\n');

    process.stdout.write(`  배치 ${bi + 1}/${batches.length} (${batch.length}건)... `);
    const t0 = Date.now();

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
      output_config: {
        format: { type: 'json_schema', schema: SCHEMA },
      },
    });

    // 응답 파싱
    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock) {
      console.error(`\n  ✗ 텍스트 응답 없음. content:`, JSON.stringify(response.content).slice(0, 300));
      throw new Error('No text response');
    }
    const parsed = JSON.parse(textBlock.text);
    allResults.push(...parsed.classifications);

    totalInput += response.usage.input_tokens;
    totalOutput += response.usage.output_tokens;
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`${parsed.classifications.length}건 (${dt}s, in=${response.usage.input_tokens} out=${response.usage.output_tokens})`);
  }

  // 결과를 idx 순서대로 정렬
  allResults.sort((a, b) => a.idx - b.idx);

  // raw 데이터 + 분류 결과 결합
  const merged = raw.map(r => {
    const cls = allResults.find(c => c.idx === r.idx);
    return { ...r, ...cls };
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(merged, null, 2));
  console.log(`\n결과 저장: ${OUTPUT}`);

  // ---- 통계 ----
  const byCategory = {};
  const bySeverity = {};
  let hygieneRelated = 0;
  for (const r of merged) {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
    if (r.hygiene_related) hygieneRelated++;
  }

  console.log('\n=========================================');
  console.log('카테고리 분포:');
  for (const [c, n] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${c.padEnd(24)} ${n.toString().padStart(4)}건  (${(n/merged.length*100).toFixed(1)}%)`);
  }
  console.log('\n심각도 분포:');
  for (const [s, n] of Object.entries(bySeverity).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s.padEnd(8)} ${n.toString().padStart(4)}건`);
  }
  console.log(`\n위생 직결 (hygiene_related=true): ${hygieneRelated}건 (${(hygieneRelated/merged.length*100).toFixed(1)}%)`);

  // ---- 비용 추정 (Haiku 4.5: $1/M in, $5/M out) ----
  const cost = (totalInput * 1 + totalOutput * 5) / 1_000_000;
  console.log(`\n토큰 사용: input=${totalInput.toLocaleString()} / output=${totalOutput.toLocaleString()}`);
  console.log(`비용 추정: $${cost.toFixed(4)} (Haiku 4.5)`);

  // ---- 처분종류 × 카테고리 cross-tab ----
  console.log('\n=========================================');
  console.log('처분종류 × 카테고리:');
  const punishTypes = [...new Set(merged.map(r => r.type))];
  for (const pt of punishTypes) {
    const subset = merged.filter(r => r.type === pt);
    const subCats = {};
    for (const r of subset) subCats[r.category] = (subCats[r.category] || 0) + 1;
    console.log(`\n  [${pt}] ${subset.length}건`);
    for (const [c, n] of Object.entries(subCats).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${c.padEnd(24)} ${n.toString().padStart(3)}`);
    }
  }
})().catch(e => {
  console.error('\n실패:', e.message);
  if (e.status) console.error('HTTP:', e.status);
  process.exit(1);
});
