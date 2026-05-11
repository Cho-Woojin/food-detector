# Supabase 백엔드

식탐정의 사용자 생성 데이터(리뷰·즐겨찾기·사장님 모드)를 저장하는 백엔드. PR `feat/db-supabase`로 도입.

식당 마스터 데이터(`data/by-gu/*.json`)는 정적 JSON 그대로. **Supabase는 사용자 생성 데이터만**.

---

## 환경

- Supabase 프로젝트: `xtawvmnowaiqzkwfhzdh.supabase.co` (Region: ap-northeast-2 / Seoul)
- 클라이언트: `@supabase/supabase-js` v2
- 환경변수 (Expo 클라이언트):
  - `EXPO_PUBLIC_SUPABASE_URL` — 프로젝트 URL
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — anon public key (RLS로 보호)

`.env.local` 또는 Vercel env에 박혀 있어야 함. 자세한 셋업은 `.env.example` 참조.

---

## 테이블 스키마

전부 `supabase/migrations/*.sql`에 정의. 새 환경 셋업 시 순서대로 실행.

### `reviews` (`0001_init_user_data.sql`)

| 칼럼 | 타입 | 비고 |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | text NOT NULL | 카카오 user.id를 String 변환 |
| `user_nickname` | text | 작성 시점 카카오 nickname (denormalize) |
| `user_profile_image` | text | |
| `restaurant_id` | text NOT NULL | 식당 id (data/by-gu의 id 그대로) |
| `restaurant_name` | text NOT NULL | snapshot |
| `rating` | int NOT NULL CHECK 1..5 | 별점 |
| `tags` | text[] DEFAULT '{}' | 긍정/부정 태그 (utils/reviews의 POSITIVE/NEGATIVE_TAGS) |
| `foreign_objects` | text[] DEFAULT '{}' | 이물질 발견 |
| `body` | text | 한줄평 |
| `photo_paths` | text[] DEFAULT '{}' | Supabase Storage path 배열 |
| `visit_date` | date NOT NULL | 'YYYY-MM-DD' |
| `created_at` | timestamptz DEFAULT now() | |

인덱스: `restaurant_id`, `user_id`, `created_at DESC`.

### `favorites` (`0001_init_user_data.sql`)

| 칼럼 | 타입 | 비고 |
|---|---|---|
| `user_id` | text NOT NULL | PK 일부 |
| `restaurant_id` | text NOT NULL | PK 일부 |
| `created_at` | timestamptz DEFAULT now() | |

PK = (user_id, restaurant_id). 인덱스: `user_id`.

### `restaurant_ownership` (`0003_owner_mode.sql`)

| 칼럼 | 타입 | 비고 |
|---|---|---|
| `restaurant_id` | text PK | 1:1 with restaurant |
| `user_id` | text NOT NULL | 사장님 카카오 user.id (String) |
| `created_at` | timestamptz DEFAULT now() | |

### `owner_posts` (`0003_owner_mode.sql`)

사장님 인증 게시글.

| 칼럼 | 타입 | 비고 |
|---|---|---|
| `id` | uuid PK | |
| `restaurant_id` | text NOT NULL | |
| `user_id` | text NOT NULL | 작성자 (사장님) |
| `body` | text NOT NULL | |
| `photo_path` | text | Storage path (단수) |
| `created_at` | timestamptz | |

### `owner_edits` (`0003_owner_mode.sql`)

사장님이 수정한 가게 정보 (1:1 with restaurant).

| 칼럼 | 타입 | 비고 |
|---|---|---|
| `restaurant_id` | text PK | |
| `address` | text | |
| `phone` | text | |
| `hours` | text | |
| `closed_day` | text | |
| `intro` | text | 가게 소개 (장문) |
| `updated_at` | timestamptz | |

### `review_replies` (`0003_owner_mode.sql`)

리뷰 답글 (1리뷰 1답글).

| 칼럼 | 타입 | 비고 |
|---|---|---|
| `review_id` | uuid PK | reviews.id 참조, ON DELETE CASCADE |
| `user_id` | text NOT NULL | 사장님 |
| `body` | text NOT NULL | |
| `updated_at` | timestamptz | |

---

## Storage

### `photos` bucket (`0002_storage_photos_bucket.sql`)

- public bucket — 누구나 URL로 사진 조회 가능
- 5MB 제한, jpeg/png/webp 만 허용 (HEIC 등은 클라가 jpeg로 변환 후 업로드)
- 폴더 분리:
  - `reviews/` — 리뷰 사진 (다수)
  - `verifications/` — 사장님 인증 사진 (단수)

업로드/표시는 `utils/upload.ts`의 `uploadPhoto/uploadPhotos/publicUrlFor` 헬퍼 사용.

---

## RLS 정책 (시연용)

모든 테이블 RLS 활성. **현재는 anon/authenticated 모두에 SELECT/INSERT/UPDATE/DELETE 허용** (시연용 관대 정책).

```sql
CREATE POLICY "<table>_<op>" ON public.<table>
  FOR <SELECT|INSERT|UPDATE|DELETE> TO anon, authenticated
  USING (true) WITH CHECK (true);
```

### 보안 한계 (현재)

- 클라가 `user_id` 컬럼을 직접 박는 패턴이라 **악의적 사용자가 다른 user_id로 위변조 가능**.
- DELETE/UPDATE도 anon 허용이라 **남의 리뷰 삭제 가능**.
- 시연·공모전 단계에서는 OK. **production 절대 금지**.

### 향후 강화 (별도 PR)

옵션 A: Supabase Auth로 통일 + 카카오 OIDC connector 등록 → RLS는 `auth.uid()` 기반.
옵션 B: 익명 Supabase 세션 + 카카오 metadata 매핑 → 현재 구조 유지하면서 RLS 보강.

---

## 클라이언트 (utils/)

| 파일 | 역할 |
|---|---|
| `utils/supabase.ts` | createClient + `userIdFromKakao(kakaoId)` 헬퍼 |
| `utils/upload.ts` | base64 dataURL → Storage 업로드, publicUrl 변환 |
| `utils/reviews.ts` | 리뷰 store (시그니처 유지, 내부 Supabase + cache) |
| `utils/favorites.ts` | 즐겨찾기 store (사용자별, 카카오 로그인 변경 시 자동 refetch) |
| `utils/owner.ts` | 사장님 모드 4개 도메인 통합 store |

공통 패턴:
- 모듈 레벨 in-memory cache + `useSyncExternalStore`
- mount 시 `ensureLoaded()` → background fetch
- mutation: optimistic update + emit, 실패 시 rollback
- 함수 시그니처는 PR #7 시점 그대로 (호출 측 코드 변경 최소)

---

## Claude Code MCP 연동

개발 중에는 Claude가 직접 SQL·테이블·Storage 조작할 수 있도록 Supabase 공식 MCP를 ~/.claude.json에 등록:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=xtawvmnowaiqzkwfhzdh",
      "headers": { "Authorization": "Bearer <PERSONAL_ACCESS_TOKEN>" }
    }
  }
}
```

PAT은 [Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens)에서 발급.

활용 예 (Claude가 직접 호출 가능):
- `mcp__supabase__list_tables` — 스키마 검사
- `mcp__supabase__apply_migration` — 마이그레이션 SQL 적용
- `mcp__supabase__execute_sql` — 데이터 조회·디버그
- `mcp__supabase__get_logs` — 빌트인 로그 (auth/storage/postgres)

---

## 마이그레이션 적용

새 환경 셋업 시 `supabase/migrations/` 안의 SQL을 순서대로 실행. 옵션:

1. **MCP `apply_migration`** (개발 중 권장) — Claude가 직접 적용
2. **Supabase Dashboard SQL Editor** — 사용자가 수동 복붙
3. **Supabase CLI** — `supabase db push` (별도 셋업 필요)

---

## 점수 산식 의미 변화

이전엔 사용자 리뷰가 본인 폰 localStorage에 갇혀 사용자 점수가 사실상 "본인 평균"이었음. Supabase 도입 후 자동으로 **"전체 사용자 평균"**으로 의미 전환. 코드 변경 X.

자세한 점수 룰은 [data/SCORING_AND_SCHEMA.md](../data/SCORING_AND_SCHEMA.md).
