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
├── hygiene-grades-mfds.json          # MFDS 위생등급 3단계 매칭 원본 (1.6MB, 서울 6,877건)
├── safe-restaurants-mafra.json       # MAFRA 안심식당 매칭 원본 (760KB, 서울 3,035건)
├── good-price-restaurants.json       # 행안부 착한가격업소 매칭 원본 (~440KB, 서울 1,989건)
├── violations-eminwon.json           # 자치구 새올민원 행정처분 raw (2MB, 25개구 3,734건)
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
| 데이터 점수 | `score` (0~70), `breakdown.{data, hygiene, model, bonus, punish}` | 종합 점수 계산용 base |
| 인증/제재 | `flags.{hygieneDesignated, hygieneGrade, hasModel, safeRestaurant, safeRestaurantSince, goodPrice, goodPriceMenus, punishCount, punishTypes, punishReasons, hygieneViolation}` | 뱃지·경고·치즈 등급 분기 |
| 위험 가이드 | `riskTags`, `menuHints` | 메뉴 카테고리 경고·시즌 가이드 |

> JSON의 `score`는 **데이터 점수(0~70)** — 사장님·사용자 점수가 0인 초기값. 앱이 매 렌더 시 `score + ownerScore + userScore = 종합점수(0~100)`를 계산. 종합 점수와 등급은 JSON에 저장 X.

### 종합 점수 = 70 + 15 + 15 (2026-05-10 개편)

| 컴포넌트 | 만점 | 출처 | 초기값 |
|---|---|---|---|
| 데이터 | **70** | 식약처 + 행안부 공공데이터 (JSON `score`) | 시그널 없을 시 25 |
| 사장님 | 15 | 사장님 청소 인증 × 1.5 (최근 30일) | 0 |
| 사용자 | 15 | 사용자 별점 평균 × 3 | 0 |

**데이터 점수 룰** (각 인증 독립 배점, 2026-05-10 개정):
- 위생등급 +35, 모범 +25, 안심 +15, 착한 +15
- 위생등급 없을 때 (모범+안심+착한) 합 cap 35 → GOLD 진입 차단
- 페널티: 영업소폐쇄/영업허가취소 -50, 영업정지 -25, 과징금부과 -10

자세한 점수 룰·테이블은 [data/SCORING_AND_SCHEMA.md](../data/SCORING_AND_SCHEMA.md).

### 치즈 등급 (4단계)

`utils/scoring.ts`의 `deriveGrade()`에서 결정 — 종합 점수 + 과락 조건 결합.

| 등급 | 조건 | 색상 |
|---|---|---|
| **GOLDEN** (골드 치즈) | score ≥ **65** | `#F1C40F` |
| **SILVER** (실버 치즈) | **40** ≤ score < 65 | `#94A3B8` |
| **BRONZE** (브론즈 치즈) | score < **40** (기본) | `#CD7F32` |
| **ROTTEN** (트랩 치즈) | score < 40 AND 과락 | `#FF3B30` |

**트랩 치즈 과락 조건** (40 미만일 때만 평가):
- 과락 1: 사용자 리뷰 ≥ 10개 AND 사용자 점수 ≤ 6/15 (별점 평균 ≤ 2.0)
- 과락 2: `flags.hygieneViolation = true` (AI가 행정처분 위반사유를 위생 직결로 분류)
- 둘 중 하나라도 → ROTTEN, 그 외엔 BRONZE

> 옛 룰의 "중점관리업소 과락"은 2026-05-10 제거됨. I1540 위생관리평가가 음식점 평가가 아니라 식품제조·가공업체 평가였기 때문. 자세한 건 [data/SCORING_AND_SCHEMA.md](../data/SCORING_AND_SCHEMA.md).

> **40점 이상**이면 과락이 있어도 SILVER 이상으로 클램프. 인증 1개라도 받으면 SILVER 진입 (안심·착한 단독 = 40점). GOLDEN(65+)은 위생등급 + 가산 인증 1개 이상 (launch 약 2.6%).

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

## 4️⃣ 사용자 데이터 (Supabase 백엔드)

PR `feat/db-supabase`로 도입. **식당 마스터 데이터(`data/by-gu/`)는 정적 JSON 유지**, 사용자 생성 데이터만 Supabase Postgres + Storage. Hybrid 구조.

### 테이블 (`supabase/migrations/`)

| 테이블 | 용도 | 키 |
|---|---|---|
| `reviews` | 위생 리뷰 (4축 별점·방문시점·태그·이물질·사진·한줄평) | uuid id |
| `favorites` | 즐겨찾기 | (user_id, restaurant_id) PK |
| `restaurant_ownership` | 식당 → 사장님 (1:1) | restaurant_id PK |
| `owner_posts` | 사장님 인증 게시글 | uuid id |
| `owner_edits` | 가게 정보 수정 (영업시간 등) (1:1) | restaurant_id PK |
| `review_replies` | 리뷰 답글 (1리뷰 1답글) | review_id PK (→ reviews FK CASCADE) |

모든 테이블 RLS 활성, 시연용 정책은 anon/authenticated CRUD 모두 허용.

### Storage

| Bucket | 용도 | 폴더 |
|---|---|---|
| `photos` | 리뷰·사장님 인증 사진 | `reviews/`, `verifications/` |

5MB 제한, jpeg/png/webp만 허용. public bucket — URL로 누구나 조회.

### Auth 전략

커스텀 카카오 OAuth (`utils/kakaoAuth.ts`)는 그대로 유지. Supabase는 anon key로 직접 호출. user_id 컬럼은 카카오 user.id(number)를 클라가 String 변환해 박음. **RLS 보안은 시연용으로 관대** — production은 향후 Supabase Auth 통일 시 강화 예정.

### Client

| 파일 | 역할 |
|---|---|
| `utils/supabase.ts` | Supabase 클라이언트 (createClient + 헬퍼) |
| `utils/upload.ts` | base64 → Storage path 변환 헬퍼 |
| `utils/reviews.ts` | 리뷰 store — 함수 시그니처 유지, 내부 Supabase |
| `utils/favorites.ts` | 즐겨찾기 store — 카카오 로그인 사용자 단위 |
| `utils/owner.ts` | 사장님 모드 4개 도메인 통합 store |

모듈 레벨 in-memory cache + `useSyncExternalStore` 패턴. mount 시 fetch, mutation은 optimistic update + rollback on error.

자세한 셋업·MCP 연동·로컬 개발은 [supabase/README.md](../supabase/README.md).

### 점수 산식 의미 변화 (중요)

이전엔 사용자 리뷰가 본인 폰 localStorage에 갇혀서 "사용자 점수 = 본인 별점 평균"이었음. Supabase 도입 후 모든 사용자 리뷰가 한 DB에 모이므로 자동으로 **"전체 사용자 평균"**으로 의미 전환. 코드 변경 X — `useImpactFor()` 호출은 동일하지만 cache가 모든 사용자 리뷰를 가져옴.

→ 시연 시 "여러 사용자 같은 식당에 별점 매기면 평균이 진짜로 합쳐진다"가 가능. 공모전 어필 포인트.

---

## 🛠 갱신 절차

데이터 점수 룰 또는 분류 로직이 바뀌면:

1. (필요 시) 새 CSV 받음 → `_archive/restaurants_with_scores.csv`로 저장
2. `node scripts/split-restaurants.js` 실행 (CSV → 자치구별 JSON 재생성)
   - 또는 CSV 없이 점수만 재계산: `node scripts/recompute-scores.js`
3. (선택) 위생등급 3단계 갱신: 식약처 공지 페이지에서 최신 Excel 다운로드 → JSON 변환 → `node scripts/apply-hygiene-grades.js`
4. (선택) 안심식당 갱신: MAFRA portal에서 받아 → `data/safe-restaurants-mafra.json` → `node scripts/apply-safe-restaurants.js`
5. (선택) 착한가격업소 갱신: data.go.kr CSV 다운 → `data/good-price-restaurants.json` → `node scripts/apply-good-price.js`
6. (선택) 자치구 새올민원 행정처분 갱신: 25개 자치구 새올전자민원창구 페이지 스크래핑 → `data/violations-eminwon.json` → `node scripts/apply-eminwon-violations.js` (ROTTEN 트리거 보강)
6. 산출물 갱신: `data/by-gu/*.json` (25개) + `_index.json` + `restaurants-index.json`
7. **이 문서 + [data/SCORING_AND_SCHEMA.md](../data/SCORING_AND_SCHEMA.md)도 함께 갱신** — 필드·grade 컷·과락·절차 변경 시 필수
8. `git commit` → Vercel 자동 배포

### 위생등급(매우우수/우수/좋음) 갱신 상세

C004 OpenAPI는 등급 구분 없이 `"적합"`만 반환. 식약처가 분기마다 공지 게시판에 Excel을 올린다.

```bash
# 1. 최신 공지 확인 (예: 2025.5.30 기준 = seq=45019)
#    https://www.mfds.go.kr/brd/m_74/list.do?srchWord=위생등급+지정현황
#
# 2. Excel 다운로드 → /tmp/hg_grade.xlsx
curl -sL -o /tmp/hg_grade.xlsx \
  "https://www.mfds.go.kr/brd/m_74/down.do?brd_id=ntc0003&seq=45019&data_tp=A&file_seq=1"

# 3. Excel → JSON (서울만 추출, 자치구 매핑)
python3 -c "
import openpyxl, json, re
wb = openpyxl.load_workbook('/tmp/hg_grade.xlsx', read_only=True, data_only=True)
ws = wb['식약처 지정']
GU = ['종로구','중구','용산구',...,'강동구']  # 25개
GU_RE = re.compile(r'서울(?:특별시|시)?\s+(\S+구)')
records = []
header = False
for r in ws.iter_rows(values_only=True):
    if r[0] == '연번': header = True; continue
    if not header or r[0] is None: continue
    name, addr, grade, no = r[1], r[2], r[3], r[4]
    if not (addr or '').startswith('서울'): continue
    m = GU_RE.match(addr or '')
    gu = m.group(1) if m else None
    if gu in GU:
        records.append({'name': name.strip(), 'addr': addr.strip(), 'gu': gu, 'grade': grade, 'hgNo': no})
json.dump({'meta': {...}, 'records': records}, open('data/hygiene-grades-mfds.json','w'), ensure_ascii=False, indent=2)
"

# 4. by-gu/*.json에 매칭 (이름+도로명, 보수적)
node scripts/apply-hygiene-grades.js
```

매칭률은 일반적으로 85~90% 수준. 미매칭 식당(보통 신규)은 `hygieneGrade` 없이 `hygieneDesignated`만 유지된다.

### 안심식당(MAFRA) 갱신 상세

농림축산식품부 자체 portal에 호스팅됨. 인증키 불필요(비공식 직접 호출).

```bash
# 1. 서울 전체 다운로드 (3,035건, 한 번에)
curl -sX POST "https://data.mafra.go.kr/prent/getRelaxList.do" \
  -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' \
  -H 'Referer: https://data.mafra.go.kr/visualweb/indexRelaxMap.do' \
  --data-urlencode "si_nm=서울특별시" \
  --data-urlencode "sido_nm=" \
  --data-urlencode "cur_page=1" --data-urlencode "rows=5000" \
  -o /tmp/safe_seoul.json

# 2. JSON 정제 → data/safe-restaurants-mafra.json
node -e "
const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('/tmp/safe_seoul.json','utf8'));
const records = raw.data.map(r => ({
  name: r.rstrnt_nm.trim(), addr: r.add.trim(), gu: r.sido_nm.trim(),
  category: r.gubun_detail?.trim() || '', categoryRaw: r.gubun?.trim() || '',
  designatedDate: r.rstrnt_reg_dt || ''
})).filter(r => r.name && r.gu);
fs.writeFileSync('data/safe-restaurants-mafra.json', JSON.stringify({
  meta: { source: 'MAFRA 안심식당', fetchedAt: new Date().toISOString().slice(0,10), seoulTotal: records.length },
  records
}, null, 2));
"

# 3. by-gu/*.json 매칭
node scripts/apply-safe-restaurants.js
```

매칭률 ~72%. 자발적 참여 프로그램이라 강남·광진·금천·노원구는 0건이 정상.

> MAFRA 명명 주의: API 응답에서 `si_nm`이 시도(서울특별시), `sido_nm`이 시군구(강남구). 직관과 반대.

### 착한가격업소(행안부) 갱신 상세

행정안전부가 분기별로 data.go.kr에 CSV 게시. 인증키 불필요.

```bash
# 1. 다운로드 (분기별 atchFileId 변경됨, 페이지에서 최신 ID 확인)
curl -sL -o /tmp/goodprice.csv \
  "https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000003632724&fileDetailSn=1&insertDataPrcus=N"

# 2. CP949 → UTF-8 변환
iconv -f cp949 -t utf-8 /tmp/goodprice.csv > /tmp/goodprice_utf8.csv

# 3. JSON 정제 (서울만, 메뉴1~4 컬럼은 6+m*2/7+m*2 인덱스 — off-by-one 주의)
node scripts/build-goodprice-json.js  # 또는 인라인 (docs 본문 예시 참조)

# 4. 매칭
node scripts/apply-good-price.js
```

매칭률 ~90% (셋 중 가장 높음). 식당 외 업종(미용/이용/세탁 등)은 우리 마스터에 없으므로 매칭 시도 안 함.

#### 지정 기준 — 식탐정의 위생 시그널 활용 가치

행정안전부 평가표(100점 만점) 중 **위생·청결 30점**이 별도 배점됨. 평가 항목:
- 주방·매장·화장실 청결도, 바닥 내수처리/배수
- 위생복·장갑·모자·마스크 착용
- 행주 용도별 사용, 소독용품/손씻기 시설
- 정수기 위생관리, 환기/방충 시설
- 창고·벽·천장 청결관리

→ 식약처 위생등급제(C004)와 평가 영역이 겹치지만 **평가 주체(자치구 vs 식약처)·기준이 달라** 보조 위생 시그널로 가치 있음. 자세한 평가표는 [data/DATA_SOURCES.md ⑥](../data/DATA_SOURCES.md) 참조.

---

## ⚠️ 한계

- **사용자 데이터 백엔드** — PR `feat/db-supabase`부터 Supabase Postgres + Storage. 멀티 기기·멀티 사용자 동기화 가능 (자세한 스키마는 [§4 사용자 데이터](#4️⃣-사용자-데이터-supabase-백엔드)).
- **사장님 모드** — PR #7로 4개 도메인 구현, PR `feat/db-supabase`로 백엔드 도입.
- **정적 스냅샷** — 신규 식당·신규 행정처분 즉시 반영 X (재빌드 필요)
- **GOLDEN은 귀함 (2.6%)** (2026-05-10) — 위생등급 + 가산 인증(모범/안심/착한) 받은 식당만 데이터만으로 GOLDEN 진입. 위생등급 단독 식당은 SILVER, 활동 점수가 더해지면 GOLDEN으로 격상 가능.
- **위생등급 3단계 미반영(점수)** — `flags.hygieneGrade`로 매우우수/우수/좋음을 저장만 하고 점수 산식은 동일하게 +20점. 점수 차등화는 향후 별도 작업.
- **안심식당 미반영(점수)** — `flags.safeRestaurant`로 표시만 하고 점수 산식 미반영. 점수 가산(예: +3 또는 +5) 여부는 향후 결정.
- **착한가격업소 미반영(점수)** — `flags.goodPrice` + 메뉴/가격 정보를 표시만 하고 점수 미반영. 위생·청결 30점 평가를 통과한 식당이라는 점에서 위생 보조 시그널로 활용 여지.
- **메인 hero 위험지수는 별개** — 환경·식중독은 추후 외부 API 예정
- **RLS 보안 약함 (시연용)** — anon key + 클라가 박은 user_id 신뢰. 악의적 사용자가 다른 user_id로 위변조 가능. production은 Supabase Auth 통일 + auth.uid() 기반 RLS로 강화 필요.

본래 계획은 FastAPI + PostgreSQL + PostGIS 백엔드. 현재는 **Supabase Postgres + Storage (사용자 생성 데이터) + 정적 JSON (식당 마스터)** hybrid.
