#!/usr/bin/env node
// data/violations-classified.json 생성 — 분류 결과 + meta(모델·프롬프트·날짜)
//
// 이 스크립트는 Claude Opus 4.7이 대화 세션 내에서 309건 위반사유를 직접 읽고
// 분류한 결과를 인코딩한 파일이다. 자동화 버전(Anthropic API)는 별도로
// scripts/classify-violations-ai.js 에 있음 (ANTHROPIC_API_KEY 필요).
//
// 분류 결과는 explicit override map + closure_admin default로 표현:
// - 영업정지·영업소폐쇄·영업허가·등록취소 중 위반사유가 단순 시설철거·폐업신고 미이행이
//   아닌 케이스는 OVERRIDES에 명시
// - 명시 안 된 케이스는 자동으로 closure_admin/low/hygiene_related=false 처리

const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'data', 'violations-raw.json');
const OUTPUT = path.join(__dirname, '..', 'data', 'violations-classified.json');

// =====================================================================
// 분류 META — 모델·프롬프트·일자
// =====================================================================
const META = {
  model: 'claude-opus-4-7',
  model_full_name: 'Anthropic Claude Opus 4.7 (1M context)',
  classified_at: '2026-05-10',
  total: 309,
  method: '이 대화 세션에서 LLM이 309건 raw VILTCN 텍스트를 직접 읽고 의미 기반으로 분류. 자동화 재실행은 scripts/classify-violations-ai.js (Haiku 4.5 + Anthropic API) 사용.',
  prompt: `당신은 한국 식약처 행정처분 분석 전문가입니다.
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
4. summary: 위반 사유 한 줄 요약 (한국어, 30자 이내)`,
  categories: {
    hygiene_direct: '식품 위생 직결: 이물혼입·유통기한·곰팡이·무등록 식품 등',
    hygiene_facility: '시설·청결: 위생복·시설기준·청결 미흡',
    youth_alcohol: '청소년 주류 제공·유해업소 출입·고용',
    entertainment_violation: '유흥접객·춤·노래·음향시설 등 영업형태 위반',
    immoral_act: '성매매 알선·호객행위·윤락',
    closure_admin: '폐업·시설철거·사업자등록 말소 (위생 무관)',
    admin_other: '변경신고·영업장외 등 행정 위반',
    other: '위 분류 어디에도 안 맞음',
  },
};

// =====================================================================
// 분류 결과 — idx → {category, severity, hygiene_related, summary}
// =====================================================================
// closure_admin/low/false 가 아닌 케이스만 명시. 그 외는 자동으로 closure_admin.
//
// 실제 분류는 위 PROMPT에 따라 이뤄짐. AI가 raw VILTCN을 읽고 판단한 결과:
// - 영업정지(44건)는 다양: 청소년·유흥·성매매·이물·유통기한·영업장외 등
// - 영업소폐쇄·영업허가·등록취소(265건)는 거의 다 closure_admin
// - 일부 closure 처분도 사유는 entertainment 등 (예: idx 77 손님 춤 허용 3차로 폐쇄)
const OVERRIDES = {
  0:   { category: 'hygiene_direct',         severity: 'high',   hygiene_related: true,  summary: '이물혼입(바퀴벌레)' },
  1:   { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '여성접객원 동석 접객' },
  2:   { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '음향·손님 춤 허용' },
  3:   { category: 'youth_alcohol',          severity: 'medium', hygiene_related: false, summary: '청소년 주류 판매' },
  4:   { category: 'youth_alcohol',          severity: 'medium', hygiene_related: false, summary: '청소년 주류 제공' },
  5:   { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '단란주점 유흥접객' },
  8:   { category: 'youth_alcohol',          severity: 'medium', hygiene_related: false, summary: '청소년 주류 제공' },
  11:  { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '손님 노래 허용' },
  12:  { category: 'youth_alcohol',          severity: 'medium', hygiene_related: false, summary: '청소년 주류 제공' },
  13:  { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '유흥접객행위' },
  14:  { category: 'hygiene_direct',          severity: 'high',   hygiene_related: true,  summary: '유통기한 경과 막걸리' },
  16:  { category: 'youth_alcohol',          severity: 'medium', hygiene_related: false, summary: '청소년 주류 판매' },
  17:  { category: 'youth_alcohol',          severity: 'medium', hygiene_related: false, summary: '청소년 주류 제공' },
  18:  { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '유흥접객원 고용' },
  19:  { category: 'admin_other',            severity: 'low',    hygiene_related: false, summary: '영업장외 영업' },
  21:  { category: 'youth_alcohol',          severity: 'medium', hygiene_related: false, summary: '청소년 주류 제공' },
  22:  { category: 'youth_alcohol',          severity: 'medium', hygiene_related: false, summary: '유흥주점 청소년 출입' },
  25:  { category: 'youth_alcohol',          severity: 'medium', hygiene_related: false, summary: '청소년 출입·주류 제공' },
  26:  { category: 'youth_alcohol',          severity: 'medium', hygiene_related: false, summary: '청소년 출입·주류 제공' },
  27:  { category: 'hygiene_direct',          severity: 'high',   hygiene_related: true,  summary: '무등록 식품 사용·조리' },
  28:  { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '유흥접객원 고용' },
  34:  { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '단란주점 유흥접객 알선' },
  35:  { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '유흥접객행위 알선' },
  36:  { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '유흥접객행위 알선' },
  37:  { category: 'youth_alcohol',          severity: 'medium', hygiene_related: false, summary: '청소년 주류 제공' },
  38:  { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '손님 춤 허용' },
  39:  { category: 'youth_alcohol',          severity: 'medium', hygiene_related: false, summary: '청소년유해업소 고용' },
  42:  { category: 'youth_alcohol',          severity: 'medium', hygiene_related: false, summary: '청소년 출입·주류 제공' },
  43:  { category: 'immoral_act',            severity: 'high',   hygiene_related: false, summary: '성매매 알선' },
  47:  { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '유흥접객원 고용' },
  49:  { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '음향·노래 허용' },
  58:  { category: 'admin_other',            severity: 'low',    hygiene_related: false, summary: '객실 통로형 설비' },
  59:  { category: 'immoral_act',            severity: 'high',   hygiene_related: false, summary: '성매매 알선' },
  60:  { category: 'immoral_act',            severity: 'medium', hygiene_related: false, summary: '호객행위' },
  61:  { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '손님 춤 허용' },
  62:  { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '손님 춤 허용' },
  63:  { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '손님 춤 허용' },
  66:  { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '단란주점 유흥접객원 고용' },
  77:  { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '음향·춤 허용 (3차→폐쇄)' },
  78:  { category: 'admin_other',            severity: 'low',    hygiene_related: false, summary: '변경신고 미이행 (이전)' },
  79:  { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '손님 춤 허용' },
  81:  { category: 'youth_alcohol',          severity: 'medium', hygiene_related: false, summary: '청소년 주류 제공 (3차)' },
  91:  { category: 'immoral_act',            severity: 'high',   hygiene_related: false, summary: '성매매 알선' },
  107: { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '음향·노래 허용 (2차)' },
  243: { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '음향·춤 허용 (2차+추가)' },
  260: { category: 'entertainment_violation', severity: 'medium', hygiene_related: false, summary: '음향·춤 허용 (2차+추가)' },
  264: { category: 'admin_other',            severity: 'low',    hygiene_related: false, summary: '위생교육 미수료+멸실' },
  270: { category: 'admin_other',            severity: 'low',    hygiene_related: false, summary: '위치변경 변경신고 미이행' },
};

// =====================================================================
// 메인 — raw + classification 머지해서 출력
// =====================================================================
const raw = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
console.log(`raw: ${raw.length}건`);

const classifications = raw.map((r) => {
  const cls = OVERRIDES[r.idx] || {
    category: 'closure_admin',
    severity: 'low',
    hygiene_related: false,
    summary: defaultSummary(r.viltcn),
  };
  return { ...r, ...cls };
});

function defaultSummary(viltcn) {
  // closure_admin 기본 케이스의 짧은 요약 자동 생성
  const v = viltcn || '';
  if (v.includes('폐업신고') && (v.includes('철수') || v.includes('미이행'))) return '폐업신고 미이행';
  if (v.includes('사업자등록')) return '사업자등록 말소';
  if (v.includes('무단폐업')) return '무단폐업';
  if (v.includes('직권폐업')) return '직권폐업·현장 멸실';
  if (v.includes('6개월') && v.includes('휴업')) return '6개월 이상 무단 휴업';
  if (v.includes('변경신고') && v.includes('철거')) return '변경신고 미이행+철거';
  if (v.includes('멸실')) return '시설물 멸실';
  if (v.includes('철거')) return '영업시설 철거';
  return '폐업·시설철거 행정정리';
}

fs.writeFileSync(
  OUTPUT,
  JSON.stringify({ meta: META, classifications }, null, 2),
);
console.log(`출력: ${OUTPUT}`);

// ---- 통계 ----
const byCategory = {};
const bySeverity = {};
let hygieneRelated = 0;
const byTypeCategory = {};
for (const r of classifications) {
  byCategory[r.category] = (byCategory[r.category] || 0) + 1;
  bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
  if (r.hygiene_related) hygieneRelated++;
  const key = r.type;
  if (!byTypeCategory[key]) byTypeCategory[key] = {};
  byTypeCategory[key][r.category] = (byTypeCategory[key][r.category] || 0) + 1;
}

console.log('\n=========================================');
console.log('카테고리 분포:');
for (const [c, n] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${c.padEnd(24)} ${n.toString().padStart(4)}건  (${(n/classifications.length*100).toFixed(1)}%)`);
}
console.log('\n심각도 분포:');
for (const [s, n] of Object.entries(bySeverity).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${s.padEnd(8)} ${n.toString().padStart(4)}건`);
}
console.log(`\n위생 직결 (hygiene_related=true): ${hygieneRelated}건 (${(hygieneRelated/classifications.length*100).toFixed(1)}%)`);

console.log('\n=========================================');
console.log('처분종류 × 카테고리 cross-tab:');
for (const [pt, cats] of Object.entries(byTypeCategory)) {
  const subtotal = Object.values(cats).reduce((a, b) => a + b, 0);
  console.log(`\n  [${pt}] ${subtotal}건`);
  for (const [c, n] of Object.entries(cats).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${c.padEnd(24)} ${n.toString().padStart(3)}`);
  }
}
