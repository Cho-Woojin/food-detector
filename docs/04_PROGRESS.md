# 04. 작업 진척

> 8일 일정 (D-7 ~ D-Day) 체크리스트.

## 📅 일정 개요

- **시작**: D-7 (5/2)
- **현재**: D-4 (5/9)
- **시제품 마감**: D-Day (5/13)
- **남은 작업**: 위생 리뷰 정식 라우트 + 사장님 입구 + 카카오 심사 매듭 + 시연 검증

## ✅ D-7 ~ D-5 완료 (인프라 + 핵심 화면)

### 데이터·인프라
- [x] Expo + expo-router 셋업
- [x] 식약처 LOCALDATA(12만 건) → 25개 자치구 JSON 분할
- [x] 좌표 EPSG:5174 정확도 검증 (~85m)
- [x] 카테고리 17종 재분류
- [x] 식중독 위험 태그 + 메뉴 추정
- [x] 위치 권한·자치구 reverse-geocoding (`utils/location.ts`)
- [x] 좋아요 localStorage 영속 + reactive 스토어 (`utils/favorites.ts`)
- [x] 디자인 토큰 토스 톤 (radius 24/32, soft shadow, tinted canvas)
- [x] Vercel canonical 도메인 redirect (`vercel.json`)

### 화면
- [x] **SCR-01 메인 페이지** — 식중독 hero + 환경 5카드 (`app/(tabs)/index.tsx`)
- [x] **SCR-02 수사 보고서** — 5축·리뷰·행정·카카오톡 공유 (`app/restaurant/[id].tsx`) → 50/25/25 모델로 리디자인 진행 중
- [x] **SCR-03 검색** — 카테고리 상단 + 인기·최근 (`app/search.tsx`)
- [x] **SCR-04 온보딩 (legacy)** — 랜딩으로 대체 (`app/onboarding.tsx`)
- [x] **SCR-05 로그인** — 5단계 랜딩 + 카카오 OAuth redirect (`app/landing.tsx`, `app/auth/kakao.tsx`)
- [x] **SCR-06 지도** — 가상화·필터·이 지역 검색·현위치 파란 마커 (`app/(tabs)/map.tsx`, `components/KakaoMap.tsx`)
- [x] **SCR-08 좋아요 리스트** — 필터·정렬·빈 상태 (`app/(tabs)/favorites.tsx`)
- [x] **SCR-09 내정보** — 좋아요 등급 분포·가이드 라이브러리 (`app/(tabs)/profile.tsx`)
- [x] **SCR-09b 비로그인 변형** — Profile 안에 GuestCard 분기

### 보너스
- [x] 위험 태그 → 위생 가이드 모달 + 라이브러리 (`HygieneGuideModal`, `HygieneGuideListModal`)
- [x] 카카오톡 공유 시트 (4-way: 카톡·링크·메시지·시스템) (`ShareSheet`, `kakaoShare.ts`)
- [x] 카카오 로그인 redirect 콜백 + 자동 redirect 설정

## 🔥 D-4 (오늘) 작업 우선순위

### P0 (반드시)
- [ ] **SCR-07 위생 리뷰 작성 정식 라우트**
  - 별점(1~5) + 항목 체크(주방·식기·재료) + 한줄평
  - `utils/reviews.ts` (favorites.ts 패턴) — localStorage 영속
  - 상세 페이지 + 랜딩 Step 4 진입
- [ ] Vercel 환경변수 검증 + production URL 동작 확인

### P1 (가능하면)
- [ ] 빈/로딩/에러 상태 일관성 검증
- [ ] 모바일 실기 테스트 (iOS Safari / Android Chrome)

## ⏳ D-3 ~ D-2 작업 예정

- [ ] 카카오 본 앱 권한 심사 통과 후 production 키 교체
- [ ] **SCR-10 사장님 시작** — 안내 모달 정도라도 붙임
- [ ] **SCR-11 위생 사진 업로드** (P2 — 시간 여유 시)
- [ ] 시드 데이터 분포 점검
- [ ] **새 점수체계 리디자인** (`.claude/plans/sunny-mapping-matsumoto.md`)
  - [ ] 워딩 변경: "썩은 치즈" → "트랩 치즈" (한글 라벨만, 코드 식별자 ROTTEN 유지)
  - [ ] `TripartiteScoreBar` / `DataBreakdownCard` / `OwnerScoreCard` / `UserScoreCard` 신규 컴포넌트
  - [ ] SCR-02 수사 보고서: 5축 스파이더 폐기 + 50/25/25 세그먼트 + breakdown 카드
  - [ ] SCR-06 지도: ROTTEN 전용 ⚠️ 경고 마커 추가 (`KakaoMap.tsx` GRADE_STYLE/GRADE_ICON)
  - [ ] 바텀시트: TripartiteScoreBar(compact) + ROTTEN 사유 칩
  - [ ] `utils/adapter.ts` 5축 헬퍼·`SpiderChart5` 잔재 정리

## ⏳ D-1 ~ D-Day (5/13)

- [ ] 시연 시나리오 리허설 (랜딩 → 지도 → 마커 → 시트 → 가이드 → 공유)
- [ ] 빅데이터캠퍼스 방문 인증
- [ ] 기획서 PDF 최종 검수
- [ ] 시제품 URL 검증
- [ ] 제출

## 🚨 리스크

| 리스크 | 대응 |
|---|---|
| 카카오 본 앱 심사 D-Day까지 미통과 | 테스트 앱 키 + canonical redirect 그대로 두고 시연 |
| 모바일 카카오맵 SDK 호환 이슈 | KakaoMap.tsx에서 'web only' 폴백 메시지 (이미 적용) |
| Vercel 빌드 캐시 문제 | --clear 강제 재배포 |
| 위생 리뷰 백엔드 부재 | localStorage로 시연 (favorites와 동일 패턴) |
| 사장님 모드 미완 | "준비 중" 안내 모달로 대체 |

## 📊 진척도

[███████████████░░░░░] **75%** (P0 8개 + P1 일부 + 인프라 완료)

## 🎯 마일스톤

- ~~5/6 (D-6): SCR-02 + SCR-04 완료~~ ✅ 초과 달성
- ~~5/8 (D-5): P0 8개 완료~~ ✅ 달성
- **5/9 (D-4)**: SCR-07 위생 리뷰 라우트 + Vercel/카카오 매듭
- **5/11 (D-2)**: 모바일 검증 + SCR-10 입구
- **5/13 (D-Day)**: 시연 리허설 + 제출
