# 05. 데이터

> 식탐정 서비스가 돌아가는 데 필요한 모든 데이터. 총 ~82MB, 전부 git 추적.
> 점수 산정 룰의 자세한 명세는 [data/SCORING_AND_SCHEMA.md](../data/SCORING_AND_SCHEMA.md), 출처는 [data/DATA_SOURCES.md](../data/DATA_SOURCES.md).

## 📦 구조

```
data/
├── by-gu/                            # 자치구별 식당 (82MB)
│   ├── restaurants-{slug}.json × 25  # 152,238개 식당
│   └── _index.json                   # split 빌드 메타
├── restaurants-index.json            # 자치구 인덱스 (3KB)
├── hygiene-guides.json               # 위생 가이드 콘텐츠 (5KB)
├── DATA_SOURCES.md                   # 출처 명세 (10KB)
└── SCORING_AND_SCHEMA.md             # 점수 + 스키마 명세 (19KB)
```

`_archive/` (gitignore) — 옛 데이터 + 원본 CSV. 서비스 구동에는 불필요.

---

## 1️⃣ 자치구별 식당 데이터 (`data/by-gu/`)

**왜 자치구로 쪼갰나**: dynamic import → 사용자가 보는 구의 chunk만 받음 (강남 ~8.8MB, 도봉 ~1.5MB). 25개 전부를 받지 않음.

### 식당 1건 — 필드

| 그룹 | 필드 | 용도 |
|---|---|---|
| 신원 | `id`, `name`, `category`, `categoryRaw` | 검색·카드·필터 |
| 위치 | `gu`, `addr`, `roadAddr`, `lat`, `lng`, `phone` | 지도 마커·상세 |
| 데이터 점수 | `score` (0~50), `breakdown.{data, hygiene, evalDelta, punish, model}` | 종합 점수 계산용 base |
| 인증/제재 | `flags.{hygieneDesignated, hasModel, punishCount, punishTypes, evalGrade, punishReasons, hygieneViolation}` | 뱃지·경고·치즈 등급 분기 |
| 위험 가이드 | `riskTags`, `menuHints` | 메뉴 카테고리 경고·시즌 가이드 |

> JSON의 `score`는 **데이터 점수(0~50)** — 사장님·사용자 점수가 0인 초기값. 앱이 매 렌더 시 `score + ownerScore + userScore = 종합점수(0~100)`를 계산. 종합 점수와 등급은 JSON에 저장 X.

### 종합 점수 = 50 + 25 + 25

| 컴포넌트 | 만점 | 출처 | 초기값 |
|---|---|---|---|
| 데이터 | 50 | 식약처 + 행안부 공공데이터 (JSON `score`) | 시그널 없을 시 25 |
| 사장님 | 25 | 사장님 청소 인증 (최근 30일) | 0 |
| 사용자 | 25 | 사용자 별점 평균 × 5 | 0 |

자세한 점수 룰·테이블은 [data/SCORING_AND_SCHEMA.md](../data/SCORING_AND_SCHEMA.md).

### 치즈 등급 (4단계)

`utils/scoring.ts`의 `deriveGrade()`에서 결정 — 종합 점수 + 과락 조건 결합.

| 등급 | 조건 | 색상 |
|---|---|---|
| **GOLDEN** (골드 치즈) | score ≥ 80 | `#F1C40F` |
| **SILVER** (실버 치즈) | 50 ≤ score < 80 | `#94A3B8` |
| **BRONZE** (브론즈 치즈) | score < 50 (기본) | `#CD7F32` |
| **ROTTEN** (썩은 치즈) | score < 50 AND 과락 | `#FF3B30` |

**썩은 치즈 과락 조건** (50 미만일 때만 평가):
- 과락 1: 사용자 리뷰 ≥ 10개 AND 사용자 점수 ≤ 10/25
- 과락 2: 중점관리업소 평가 (식약처 위생 미흡 분류)
- 과락 3: `flags.hygieneViolation = true` (AI가 행정처분 위반사유를 위생 직결로 분류)
- 셋 중 하나라도 → ROTTEN, 그 외엔 BRONZE

> 50점 이상이면 과락이 있어도 SILVER 이상으로 클램프. 데이터 만점(50)이면 자동 SILVER 진입.

> ROTTEN 트리거에서 처분 종류(영업정지·영업소폐쇄·과태료/과징금)는 **사용하지 않음**. 자세한 근거는 [data/SCORING_AND_SCHEMA.md](../data/SCORING_AND_SCHEMA.md) §"행정처분 종류만으로 판단하지 않는 이유" — 식약처 I2630의 위반사유를 AI(claude-opus-4-7)로 309건 분류한 결과 처분 종류와 위생 위험은 약한 상관(영업정지 44건 중 위생 직결은 3건뿐)이라 처분 텍스트 의미 기반 분류로 대체됨.

---

## 2️⃣ 자치구 인덱스 (`restaurants-index.json`)

```json
{ "meta": { "totalCount": 152238, "gus": [...25개], "gusCount": {...}, ... } }
```

GPS → 자치구 매핑, 로드할 chunk 결정에 사용.

---

## 3️⃣ 위생 가이드 (`hygiene-guides.json`)

메뉴 카테고리별 안내문 (날생선·육회·가금류 등). 식당 상세의 가이드 모달에 표시. 식당의 `riskTags`와 키 매칭.

---

## 🛠 갱신 절차

데이터 점수 룰 또는 분류 로직이 바뀌면:

1. (필요 시) 새 CSV 받음 → `_archive/restaurants_with_scores.csv`로 저장
2. `node scripts/split-restaurants.js` 실행 (CSV → 자치구별 JSON 재생성)
   - 또는 CSV 없이 점수만 재계산: `node scripts/recompute-scores.js`
3. 산출물 갱신: `data/by-gu/*.json` (25개) + `_index.json` + `restaurants-index.json`
4. **이 문서 + [data/SCORING_AND_SCHEMA.md](../data/SCORING_AND_SCHEMA.md)도 함께 갱신** — 필드·grade 컷·과락·절차 변경 시 필수
5. `git commit` → Vercel 자동 배포

---

## ⚠️ 한계

- **사장님 청소 인증 시스템은 개발 중** — `utils/owner.ts`에 구조만 있고 실제 인증 데이터는 아직 0. 기능 완성 시 자동 반영.
- **사용자 리뷰는 로컬 storage** — 백엔드 부재 동안 `localStorage`에 영속. 디바이스 간 동기화 X.
- **정적 스냅샷** — 신규 식당·신규 행정처분 즉시 반영 X (재빌드 필요)
- **데이터 점수만의 한계** — 위생등급 + 모범 식당도 데이터 점수 만점이 50/100. 사장님·사용자 활동 없으면 BRONZE에서 못 벗어남. 활성 식당 보상 구조.
- **메인 hero 위험지수는 별개** — 환경·식중독은 추후 외부 API 예정

본래 계획은 FastAPI + PostgreSQL + PostGIS 백엔드. 현재는 MVP용 정적 데이터 + 클라이언트 storage.
