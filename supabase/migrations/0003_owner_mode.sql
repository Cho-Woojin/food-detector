-- PR #7 owner-mode 도메인 마이그레이션
-- 기존 owner_verifications 테이블은 PR #7에서 안 쓰므로 drop.
-- 4개 새 테이블: restaurant_ownership, owner_posts, owner_edits, review_replies
--
-- 모든 테이블 RLS 시연용 관대 (anon/authenticated 모두 CRUD). user_id 검증은 클라.

DROP TABLE IF EXISTS public.owner_verifications;

-- =====================================================
-- 1. restaurant_ownership: 식당 → 사장님 (1:1)
-- =====================================================
CREATE TABLE public.restaurant_ownership (
  restaurant_id text PRIMARY KEY,
  user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX restaurant_ownership_user_id_idx ON public.restaurant_ownership(user_id);

ALTER TABLE public.restaurant_ownership ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ownership_select" ON public.restaurant_ownership FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ownership_insert" ON public.restaurant_ownership FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "ownership_update" ON public.restaurant_ownership FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ownership_delete" ON public.restaurant_ownership FOR DELETE TO anon, authenticated USING (true);

-- =====================================================
-- 2. owner_posts: 사장님 인증 게시글
-- =====================================================
CREATE TABLE public.owner_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id text NOT NULL,
  user_id text NOT NULL,
  body text NOT NULL,
  photo_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX owner_posts_restaurant_id_idx ON public.owner_posts(restaurant_id);
CREATE INDEX owner_posts_user_id_idx ON public.owner_posts(user_id);
CREATE INDEX owner_posts_created_at_idx ON public.owner_posts(created_at DESC);

ALTER TABLE public.owner_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_posts_select" ON public.owner_posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owner_posts_insert" ON public.owner_posts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "owner_posts_update" ON public.owner_posts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_posts_delete" ON public.owner_posts FOR DELETE TO anon, authenticated USING (true);

-- =====================================================
-- 3. owner_edits: 가게 정보 수정 (영업시간/전화 등) (1:1 with restaurant)
-- =====================================================
CREATE TABLE public.owner_edits (
  restaurant_id text PRIMARY KEY,
  address text,
  phone text,
  hours text,
  closed_day text,
  intro text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.owner_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_edits_select" ON public.owner_edits FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owner_edits_insert" ON public.owner_edits FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "owner_edits_update" ON public.owner_edits FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_edits_delete" ON public.owner_edits FOR DELETE TO anon, authenticated USING (true);

-- =====================================================
-- 4. review_replies: 리뷰 답글 (1:1 with review, ON DELETE CASCADE)
-- =====================================================
CREATE TABLE public.review_replies (
  review_id uuid PRIMARY KEY REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  body text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX review_replies_user_id_idx ON public.review_replies(user_id);

ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_replies_select" ON public.review_replies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "review_replies_insert" ON public.review_replies FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "review_replies_update" ON public.review_replies FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "review_replies_delete" ON public.review_replies FOR DELETE TO anon, authenticated USING (true);
