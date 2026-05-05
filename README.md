# 식탐정 (Food Detector)

> **2026 서울시 빅데이터 활용 경진대회** 출품작 — 창업 부문 (제품·서비스 개발)
> 
> 인증받은 식당이 아닌, 지금도 믿을 수 있는 식당과 오늘 안전한 메뉴를 알려주는 위생 검증 PWA.

## 🎯 한 줄 요약

배민은 인증받은 집을 보여주고, 식탐정은 **지금도 믿을 수 있는 집**과 **오늘 안전한 메뉴**를 알려준다.

## 📅 제출 정보

- **제출 마감**: 2026년 5월 13일(수)
- **시제품 배포 마감**: 2026년 5월 5일 (앱스토어 우회 — Vercel PWA)
- **현재 상태**: D-7 (SCR-01 완성, 18개 화면 잔여)

## 🛠 기술 스택

| Layer | Tech |
|---|---|
| Frontend | React Native + Expo (Web build = PWA) |
| Routing | expo-router (file-based) |
| Styling | StyleSheet + 디자인 토큰 |
| Backend | FastAPI + PostgreSQL + PostGIS |
| AI | Anthropic Claude API |
| External | Kakao Map API, Google Places API |
| Deploy | Vercel (PWA), AWS (Backend) |

## 🚀 로컬 실행

```bash
npm install
npx expo start --web
```

브라우저에서 `http://localhost:8081` 자동 열림.

## 📂 프로젝트 구조