# 02. 화면 인벤토리 (19개)

> 식탐정 PWA의 모든 화면 명세. 각 화면 작업 시 이 문서 참고.

## P0 — 필수 화면 (8개)

| ID | URL | 화면명 | 권한 | 상태 |
|---|---|---|---|---|
| SCR-01 | `/` | 메인 페이지 (Idle) | 🔓 | ✅ 완료 |
| SCR-01b | `/` (state) | 검색 활성 (Focused) | 🔓 | ⏳ |
| SCR-01c | `/` (state) | 검색 입력 중 (Typing) | 🔓 | ⏳ |
| SCR-02 | `/restaurant/[id]` | 수사 보고서 ⭐ | 🔓 | ⏳ |
| SCR-03 | `/search?q=` | 검색 결과 리스트 | 🔓 | ⏳ |
| SCR-03b | `/search?q=` (empty) | 검색 결과 0건 | 🔓 | ⏳ |
| SCR-04 | `/onboarding` | 온보딩 (3슬라이드) | 🔓 | ⏳ |
| SCR-05 | (overlay) | 로그인 모달 | 🔓 | ⏳ |

## P1 — 출시 포함 화면 (6개)

| ID | URL | 화면명 | 권한 | 상태 |
|---|---|---|---|---|
| SCR-06 | `/map` | 지도 + 치즈 핀 (4단계 + ROTTEN ⚠️ 마커) | 🔓 | ⏳ |
| SCR-07 | `/restaurant/[id]/review` | 위생 리뷰 작성 | 🔒 | ⏳ |
| SCR-08 | `/favorites` | 좋아요 리스트 | 🔒 | ⏳ |
| SCR-09 | `/me` (logged-in) | 내정보 | 🔒 | ⏳ |
| SCR-09b | `/me` (guest) | 내정보 비로그인 | 🔓 | ⏳ |
| SCR-10 | `/me/owner` | 사장님 시작 | 💼 | ⏳ |
| SCR-11 | `/me/owner/upload` | 위생 사진 업로드 | 💼 | ⏳ |

## SCR-01 메인 페이지 ✅ 완료

**구성 요소**:
- 헤더 (로고 + 알림)
- 위치 표시
- Orange 검색바 (Hero)
- 클립보드 토스트 (조건부)
- ⭐ 마스코트 위험 지수 카드 (5단계 라벨 + 5단계 인디케이터)
- 환경 미니 행 (대기질·기온·식중독)
- 좋아요 식당 3개

**API 호출** (현재 더미 데이터):
- `GET /environment/{district_code}`
- `GET /risk-index/{district_code}`
- `GET /favorites/preview`

## SCR-02 수사 보고서 ⭐ 다음 작업

**구성 요소**:
- Top Nav (sticky)
- 식당 기본 정보 (이름·카테고리·위치·영업시간)
- ⭐ Hero (종합 점수 + 치즈 등급 + **TripartiteScoreBar** 50/25/25 세그먼트)
- **DataBreakdownCard** — 데이터 50점 항목별 풀 노출 (기본 25 / 위생등급 +20 / 모범 +5 / 평가± / 행정처분-)
- **OwnerScoreCard** — 사장님 0~25점 + 최근 30일 청소 인증 N건 (0건 시 placeholder)
- **UserScoreCard** — 사용자 0~25점 + 별점 평균·리뷰 N건 (이물질 신고 빨간 배너, 점수 차감 X)
- ROTTEN(트랩 치즈) 시 사유 칩: 중점관리업소 / 위생 직결 위반 / 사용자 평점 낮음
- 위생 리뷰 (1개 압축)
- 사장님 진입점
- ⭐ Sticky 외부 앱 바 (배민 강조 + 다른 3개 작게)

> 옛 5축 레이더 차트(`SpiderChart5`, `utils/adapter.ts:buildAxes`)는 폐기 — 새 점수 모델(50/25/25)과 비율이 어긋남.

**API 호출**:
- `GET /restaurants/{id}/score`
- `GET /restaurants/{id}/reviews?limit=1`

## SCR-04 온보딩 (3슬라이드)

| 슬라이드 | 내용 | 자산 |
|---|---|---|
| 1 | 식탐정 소개 | onboarding/investigate.png |
| 2 | 위치 권한 요청 | mascots/search.png |
| 3 | 알림 안내 → 시작 | onboarding/celebrate.png |

(나머지 화면들은 작업 진행하면서 추가)