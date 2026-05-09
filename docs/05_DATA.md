# 05. 데이터

> 식탐정 서비스가 돌아가는 데 필요한 모든 데이터. 총 ~82MB, 전부 git 추적.

## 📦 구조

```
data/
├── by-gu/                            # 자치구별 식당 (82MB)
│   ├── restaurants-{slug}.json × 25  # 152,238개 식당
│   └── _index.json                   # split 빌드 메타
├── restaurants-index.json            # 자치구 인덱스 (3KB)
└── hygiene-guides.json               # 위생 가이드 콘텐츠 (5KB)
```

`_archive/` (gitignore) — 옛 데이터 + 원본 CSV. 서비스 구동에는 불필요.

---

## 1️⃣ 자치구별 식당 데이터 (`data/by-gu/`)

**왜 자치구로 쪼갰나**: dynamic import → 사용자가 보는 구의 chunk만 받음 (강남 ~8.8MB, 도봉 ~1.5MB). 25개 전부를 받지 않음.

### 식당 1건 — 필드

| 그룹 | 필드 | 용도 |
|---|---|---|
| 신원 | `id`, `name`, `category` | 검색·카드·필터 |
| 위치 | `gu`, `addr`, `roadAddr`, `lat`, `lng`, `phone` | 지도 마커·상세 |
| 평가 | `score` (0~100), `grade` (S~F), `color` | Hero 점수·치즈 등급 |
| 점수 내역 | `breakdown.{base, hygiene, evalDelta, punish, model}` | "왜 N점?" 펼침 |
| 인증/제재 | `flags.{hygieneDesignated, hasModel, punishCount, punishTypes, evalGrade}` | 뱃지·경고 |
| 위험 가이드 | `riskTags`, `menuHints` | 메뉴 카테고리 경고·시즌 가이드 |

### grade 컷오프

`scripts/split-restaurants.js`의 `gradeFor()`에서 결정.

| score | grade | color |
|---|---|---|
| ≥ 90 | S | #FFD700 (골드) |
| 75~89 | A | #22C55E (초록) |
| 60~74 | B | #3B82F6 (파랑) |
| 45~59 | C | #F59E0B (주황) |
| 30~44 | D | #EF4444 (빨강) |
| < 30 | F | #6B7280 (회색) |

앱 표시 라벨(GOLDEN/SILVER/BRONZE/...) 매핑은 `utils/loadData.ts`의 `mapGrade()` 참조.

### 점수 출처

`score`와 `breakdown` 값은 **외부에서 미리 계산된 CSV** (`_archive/restaurants_with_scores.csv`)로 들어옴. split 스크립트는 자치구 분리·grade 매핑만 수행. 가중치 자체는 CSV 생성 단계에서 결정되며 이 저장소 외부.

`breakdown` 5개 컴포넌트:
- `base` — 기본 점수
- `hygiene` — 식약처 위생등급 가산
- `evalDelta` — 위생관리평가 ±
- `punish` — 행정처분 감점
- `model` — 행안부 모범음식점 가산

---

## 2️⃣ 자치구 인덱스 (`restaurants-index.json`)

```json
{ "meta": { "totalCount": 152238, "gus": [...25개] } }
```

GPS → 자치구 매핑, 로드할 chunk 결정에 사용.

---

## 3️⃣ 위생 가이드 (`hygiene-guides.json`)

메뉴 카테고리별 안내문 (날생선·육회·가금류 등). 식당 상세의 가이드 모달에 표시. 식당의 `riskTags`와 키 매칭.

---

## 🛠 갱신 절차

1. 새 CSV 받음 → `_archive/restaurants_with_scores.csv`로 저장
2. `node scripts/split-restaurants.js` 실행
3. 산출물 갱신: `data/by-gu/*.json` (25개) + `_index.json` + `restaurants-index.json`
4. **이 문서도 함께 확인/갱신** — 필드 추가·삭제, grade 컷, 절차·전제 변경 시 필수
5. `git commit` → Vercel 자동 배포

---

## ⚠️ 한계

- **정적 스냅샷** — 신규 식당·신규 행정처분 즉시 반영 X (재빌드 필요)
- **사용자 리뷰·사장님 인증 데이터 없음** — 5축 점수 중 일부 필드는 0
- **메인 hero 위험지수는 별개** — 환경·식중독은 추후 외부 API 예정

본래 계획은 FastAPI + PostgreSQL + PostGIS 백엔드. 현재는 MVP용 정적 데이터.
