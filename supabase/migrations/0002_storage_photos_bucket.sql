-- Storage bucket: photos
-- 리뷰·사장님 인증 사진 통합. 폴더로 분리 (reviews/, verifications/).
-- public bucket — 누구나 URL로 사진 볼 수 있음.
-- 5MB 제한, jpeg/png/webp만 허용 (HEIC 등은 클라에서 jpeg로 변환).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Storage RLS — bucket 'photos'에 한해 anon/authenticated 모두 read·write·delete 허용.
-- 시연용 관대 정책. 진짜 보안은 Supabase Auth 통일 시 user_id 매칭으로 강화.
CREATE POLICY "photos_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'photos');

CREATE POLICY "photos_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'photos');

CREATE POLICY "photos_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'photos');
