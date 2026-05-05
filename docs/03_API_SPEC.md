# 03. API 명세

> 백엔드 개발자와 합의한 API 인터페이스. 프론트는 이 명세를 기준으로 데이터 호출.

## Base URL
Development: http://localhost:8000/api
Production:  https://api.sikdamjeong.com/api  (가정)


## 인증

Soft Wall 정책. 대부분 엔드포인트는 로그인 없이 호출 가능. 일부만 Bearer 토큰 필요.

