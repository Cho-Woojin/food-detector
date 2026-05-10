-- food-detector 백엔드 초기 스키마
-- - reviews: 위생 리뷰 (별점·태그·이물질·사진·한줄평)
-- - owner_verifications: 사장님 청소 인증
-- - favorites: 즐겨찾기 (좋아요)
--
-- Auth 전략: Custom Kakao OAuth + DB만 Supabase
-- → user_id 칼럼은 카카오 user.id (number → text)를 클라가 직접 박음.
-- → RLS는 활성화하되 시연용으로 anon key에 관대하게 허용.
--   진짜 보안은 향후 Supabase Auth 통일 시점에 강화.

-- =====================================================
-- 1. reviews
-- =====================================================
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  user_nickname text,
  user_profile_image text,
  restaurant_id text NOT NULL,
  restaurant_name text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  tags text[] NOT NULL DEFAULT '{}',
  foreign_objects text[] NOT NULL DEFAULT '{}',
  body text,
  photo_paths text[] NOT NULL DEFAULT '{}',
  visit_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_restaurant_id_idx ON public.reviews(restaurant_id);
CREATE INDEX reviews_user_id_idx ON public.reviews(user_id);
CREATE INDEX reviews_created_at_idx ON public.reviews(created_at DESC);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "reviews_update" ON public.reviews FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "reviews_delete" ON public.reviews FOR DELETE TO anon, authenticated USING (true);

-- =====================================================
-- 2. owner_verifications
-- =====================================================
CREATE TABLE public.owner_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id text NOT NULL,
  owner_id text,
  note text,
  photo_paths text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX owner_verifications_restaurant_id_idx ON public.owner_verifications(restaurant_id);
CREATE INDEX owner_verifications_created_at_idx ON public.owner_verifications(created_at DESC);

ALTER TABLE public.owner_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_verifications_select" ON public.owner_verifications FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owner_verifications_insert" ON public.owner_verifications FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "owner_verifications_update" ON public.owner_verifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_verifications_delete" ON public.owner_verifications FOR DELETE TO anon, authenticated USING (true);

-- =====================================================
-- 3. favorites
-- =====================================================
CREATE TABLE public.favorites (
  user_id text NOT NULL,
  restaurant_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, restaurant_id)
);
CREATE INDEX favorites_user_id_idx ON public.favorites(user_id);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_select" ON public.favorites FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "favorites_insert" ON public.favorites FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "favorites_delete" ON public.favorites FOR DELETE TO anon, authenticated USING (true);
