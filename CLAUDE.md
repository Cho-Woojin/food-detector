# food-detector — Claude Code 작업 지침

## 데이터 변경 시 반드시

`data/`, `scripts/split-restaurants.js`, 또는 식당 데이터 스키마/생성 로직과 관련된 변경을 만들 때:

1. **`docs/05_DATA.md`를 먼저 읽고**
2. 변경이 문서와 어긋나면 **md를 함께 업데이트**한 뒤 같은 PR/커밋에 포함

특히 다음이 바뀌면 md 갱신 필수:
- 식당 레코드 필드 (추가·제거·이름 변경)
- 자치구 슬러그·구성
- grade 컷오프 (`gradeFor()`)
- `breakdown` / `flags` 구조
- 데이터 갱신 절차 (input 경로, 산출물, 명령어)
- 한계·전제 (백엔드 연동, 신규 데이터 추가 등)

## 데이터 위치 (요약)

자세한 건 `docs/05_DATA.md`.

- `data/by-gu/` — 자치구별 식당 chunk (서비스 구동, git 추적)
- `data/restaurants-index.json` — 자치구 인덱스 (서비스 구동)
- `data/hygiene-guides.json` — 위생 가이드 콘텐츠 (서비스 구동)
- `_archive/` — 옛 데이터·원본 CSV (gitignore, 서비스 구동에 불필요)
