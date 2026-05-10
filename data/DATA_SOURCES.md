# 식탐정 데이터 출처 명세서

본 문서는 식탐정(food-detector) 프로젝트에서 식당 위생/안전 평가에 활용한 데이터의 공식 출처를 정리한 문서다. 같은 데이터가 여러 정부 사이트에서 제공되는 경우, **공공데이터포털 카탈로그 등록을 우선 출처로 표기**한다.

마지막 업데이트: 2026-05-09

---

## 📑 목차

| # | 출처 | 데이터셋 수 | 사용 |
|---|---|---|---|
| 1️⃣ | 공공데이터포털 (data.go.kr) | **4** | 식당 마스터 + 위생 시그널 |
| 2️⃣ | 식품안전나라 (식약처 자체 OpenAPI) | **2** | 평가 등급 + 행정처분 |
| 3️⃣ | 서울 열린데이터광장 (data.seoul.go.kr) | **1** | 상권/인구 (확장 예정) |
| 4️⃣ | 카카오 (developers.kakao.com) | **3 API + 1 SDK** | 좌표 보강 + 신규 식당 + 지도 |
| **합계** | — | **10 데이터셋 + 1 SDK** | |

---

## 1️⃣ 공공데이터포털 (data.go.kr)

> 같은 데이터가 다른 정부 사이트(LOCALDATA, 식품안전나라)에서도 다운로드 가능하지만, **공공데이터포털에 카탈로그 등록된 데이터셋은 공식 출처를 공공데이터포털로 표기**.

### ① 전국일반음식점표준데이터 (`15096283`) ⭐ 식당 마스터

- **URL**: https://www.data.go.kr/data/15096283/standard.do
- **운영기관**: 행정안전부 (지방자치단체 통합)
- **한 줄**: 전국 자치단체 일반음식점 인허가 정보 통합 표준데이터
- **디테일**:
  - 다운로드 경로: LOCALDATA bulk (`07_24_04_P_CSV.zip`, 211MB)
  - 압축해제 940MB / 서울 영업·정상 **121,526건**
  - 47개 컬럼: 관리번호, 사업장명, 인허가일자, 영업상태명, 폐업일자, 소재지·도로명 주소, 좌표(EPSG 5174), 업태구분명(한식/일식/중식 등), 소재지전화 등
  - **식탐정 식당 마스터의 베이스**
  - 술 판매가 가능한 음식점

### ② 행정안전부_휴게음식점 (`15006730`)

- **URL**: https://www.data.go.kr/data/15006730/fileData.do
- **운영기관**: 행정안전부
- **한 줄**: 전국 휴게음식점 (커피숍·분식·패스트푸드·디저트) 인허가
- **디테일**:
  - 다운로드 경로: LOCALDATA bulk (`07_24_05_P_CSV.zip`, 61MB)
  - 서울 영업·정상 37,177건 → 편의점 6,008 제외 후 **31,016건**
  - 동일 LOCALDATA 스키마 (47개 컬럼)
  - 카테고리: 커피숍 14,754, 일반조리판매 4,039, 패스트푸드 1,648, 다방 990 등
  - 술 판매가 불가능한 음식점

### ③ 전국모범음식점표준데이터 (`15096282`)

- **URL**: https://www.data.go.kr/data/15096282/standard.do
- **운영기관**: 행정안전부 (식약처 식중독예방과 소관)
- **한 줄**: 자치단체 지정 모범음식점 (일반음식점의 5% 이내)
- **디테일**:
  - 다운로드 경로: 식품안전나라 OpenAPI `I1590` (사용자 키 사용)
  - 전국 23,137건 / 서울 4,369건
  - 컬럼: BSSH_NM, SIGNGU_NM, LCNS_NO, OPERT_DT, PNCPL_FOOD_NM
  - **데이터 점수에서 +5점** 가산 (자세한 룰은 [SCORING_AND_SCHEMA.md](./SCORING_AND_SCHEMA.md))
  - 10,499건 매칭

### ④ 식품의약품안전처_식품접객업소 위생등급 지정현황 (`15060883`) ⭐ 핵심 위생 시그널

- **URL**: https://www.data.go.kr/data/15060883/openapi.do
- **운영기관**: 식품의약품안전처
- **한 줄**: 식약처 위생등급제 통과 식당("적합" 인증)
- **디테일**:
  - 다운로드 경로: 식품안전나라 OpenAPI `C004`
  - 전국 43,691건 / 서울 영업·만료전 **8,175건**
  - 컬럼: BSSH_NM, ADDR, HG_ASGN_LV(`적합`), HG_ASGN_NO(지정번호), ASGN_FROM/ASGN_TO(만료일), CLSBIZ_DVS_CD_NM, INDUTY_NM
  - **데이터 점수에서 +20점** (가장 강력한 위생 시그널, 자세한 룰은 [SCORING_AND_SCHEMA.md](./SCORING_AND_SCHEMA.md))
  - 24,578건 매칭

---

## 2️⃣ 식품안전나라 (식품의약품안전처 자체 OpenAPI)

> 공공데이터포털 미등록. 식약처 [`apiMain.do`](https://www.foodsafetykorea.go.kr/apiMain.do)에서 직접 키 발급 + **데이터셋별 활용신청** 후 사용.

### ⑤ 식품위생등급평가관리내역 (`I1540`)

- **URL**: https://www.foodsafetykorea.go.kr/api/openApiInfo.do?service_no=I1540
- **API endpoint**: `http://openapi.foodsafetykorea.go.kr/api/{KEY}/I1540/json/{시작}/{끝}`
- **한 줄**: 식품위생관리 평가 등급 (자율관리/일반관리/중점관리/평가불능)
- **디테일**:
  - 전국 56,731건 / 서울 2,135건
  - 컬럼: BSSH_NM, ADDR, EVL_GRD_CD_NM(평가등급), EVL_SCORE(-234~200), EVL_DT, EVL_TYPE_DVS_CD_NM
  - **데이터 점수에서 +10/+3/-15/-5** (자율/일반/중점/평가불능). 위생등급 지정 있는 식당은 가산 중복 제외.
  - 3,011건 매칭

### ⑥ 행정처분결과(식품접객업) (`I2630`) ⭐ 핵심 위험 시그널

- **URL**: https://www.foodsafetykorea.go.kr/api/openApiInfo.do?service_no=I2630
- **API endpoint**: `http://openapi.foodsafetykorea.go.kr/api/{KEY}/I2630/json/{시작}/{끝}`
- **한 줄**: 식품접객업 행정처분 (영업소폐쇄/영업정지/시정명령) 내역
- **디테일**:
  - 전국 2,918건 / 서울 316건
  - 컬럼: PRCSCITYPOINT_BSSHNM, ADDR, DSPS_TYPECD_NM(처분종류), VILTCN(위반내용), DSPS_BGNDT/ENDDT, LAWORD_CD_NM(법령)
  - **데이터 점수에서 -2 ~ -50점** (영업소폐쇄 -50, 영업정지 -20, 품목제조정지 -15, 과태료/과징금 -8, 시정명령 -3, 경고 -2)
  - 영업소폐쇄는 사실상 인덱스에 안 잡히지만 데이터 시차 안전망 + 트랩 치즈 트리거용으로 유지
  - 2,496건 매칭

---

## 3️⃣ 서울 열린데이터광장 (data.seoul.go.kr)

> 서울시 자체 운영. 발급 키: 사용자 본인.

### ⑦ 서울시 행정동 단위 생활인구(내국인) (`SPOP_LOCAL_RESD_DONG`)

- **URL**: https://data.seoul.go.kr/dataList/OA-14991/F/1/datasetView.do
- **OA 코드**: OA-14991
- **API endpoint**: `http://openapi.seoul.go.kr:8088/{KEY}/json/SPOP_LOCAL_RESD_DONG/1/1000/`
- **한 줄**: 행정동 × 시간대 × 성별 × 연령대별 생활인구 추정치
- **디테일**:
  - 1일치 10,000행
  - 컬럼: STDR_DE_ID(기준일), TMZON_PD_SE(시간대), ADSTRD_CODE_SE(행정동코드), TOT_LVPOP_CO(총생활인구) + 성별·연령 세분화 (10세 단위)
  - 식당 상권 분석·붐비는 시간대 추정에 활용 가능 (현 단계 미연결, 향후 확장 예정)

---

## 4️⃣ 카카오 (developers.kakao.com)

> 카카오 자체 — 발급 키: 사용자 REST 키 + 친구 JS 키.

### ⑧ 카카오 Local API — 키워드 검색

- **URL**: https://dapi.kakao.com/v2/local/search/keyword.json
- **docs**: https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword
- **한 줄**: 키워드(사업장명+자치구)로 장소 검색 → 좌표 보강
- **디테일**: Phase 3-C에서 좌표 결측 762건 중 사업장명+자치구로 검색 → **456건 보완 (가장 효과적인 fallback)**

### ⑨ 카카오 Local API — 주소 검색

- **URL**: https://dapi.kakao.com/v2/local/search/address.json
- **docs**: https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-address
- **한 줄**: 도로명/지번 주소 → WGS84 좌표 변환
- **디테일**: Phase 3-A에서 좌표 결측 2,181건 중 1,419건 보완 (65%) + Phase 3-C retry 12건. LOCALDATA EPSG 5174 좌표 결측 식당의 위경도 채움.

### ⑩ 카카오 Local API — 카테고리 검색 ⭐

- **URL**: https://dapi.kakao.com/v2/local/search/category.json
- **docs**: https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-category
- **한 줄**: FD6(음식점) / CE7(카페) 카테고리 + 좌표·반경으로 장소 검색
- **디테일**:
  - 서울 1,292개 1km 격자 × 2 카테고리 = 2,584 task / 약 6,000 호출 / 68.7초
  - **45,468건 수집** → 카테고리 노이즈/서울외 필터 → 30,879건 유효
  - LOCALDATA 매칭률 **95.9%**
  - 신규 1,268건 추가 + 24,578건에 카카오 ID/URL/세분 카테고리 부착

### ⑪ 카카오맵 JavaScript SDK (앱 측 사용)

- **URL**: https://dapi.kakao.com/v2/maps/sdk.js
- **docs**: https://apis.map.kakao.com/web/guide/
- **한 줄**: 웹/모바일 카카오 지도 표시
- **디테일**:
  - 친구 `components/KakaoMap.tsx` + `utils/kakaoMap.ts`에서 동적 로드
  - 식당 마커 + 등급 색상 + 클러스터링
  - JavaScript 키 (REST 키와 별개, 도메인 제한 보안)

---

## 📋 출처별 합계

| 출처 | 데이터셋 수 | 핵심 사용처 |
|---|---|---|
| **공공데이터포털 (data.go.kr)** | **4** | 일반음식점·휴게음식점·모범음식점·위생등급 지정 |
| **식품안전나라 (식약처 자체)** | **2** | 위생관리평가·행정처분 (공공데이터포털 미등록) |
| **서울 열린데이터광장** | **1** | 생활인구 (확장용) |
| **카카오** | **3 API + 1 SDK** | Local API 3종 + 지도 SDK |
| **합계** | **10 + 1 SDK** | |

---

## 🎯 최종 식당 마스터 구성

```
전국일반음식점 (15096283)               120,970건
+ 행정안전부_휴게음식점 (15006730)         31,016건
+ 카카오 카테고리 검색 신규 (LOCALDATA에 없음)  1,268건
                                       ─────────
                              합계   153,254건

부가 정보 매칭 (식당별 데이터 점수 시그널 — 0~50점 만점):
- 위생등급 지정 (15060883)         → 24,578건  +20점
- 모범음식점 (15096282)            → 10,499건  +5점
- 위생관리평가 (식약처 I1540)      → 3,011건   +10/+3/-15/-5점
- 행정처분 (식약처 I2630)          → 2,496건   -2 ~ -50점

위치/카테고리 보강:
- 카카오 ID/URL/세분 카테고리      → 25,846건
- 좌표 (EPSG 4326)                → 152,960건 (99.8%)
```

---

## 🔑 발급한 API 키

| 키 종류 | 발급처 | 용도 | 보안 |
|---|---|---|---|
| 식품안전나라 인증키 | foodsafetykorea.go.kr | 식약처 데이터셋 4종 | `data/.env`, git 미추적 |
| 서울 열린데이터광장 인증키 | data.seoul.go.kr | 서울 SPOP 데이터 | `data/.env`, git 미추적 |
| 카카오 REST API 키 | developers.kakao.com | Local API 3종 (수집) | `data/.env`, git 미추적 |
| 카카오 JavaScript 키 | developers.kakao.com (친구 앱) | 카카오맵 SDK (앱) | `.env`, git 미추적 |

> 모든 키는 `.gitignore`로 git 추적 차단되어 있어 커밋·PR에 절대 포함되지 않음.
