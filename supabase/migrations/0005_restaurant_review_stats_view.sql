-- 식당별 리뷰 집계 view (lazy fetch 패턴용)
--
-- 배경: 사용자 데이터가 Supabase로 이동 후 reviews.ts가 "전체 리뷰를 메모리에 캐시"하는
--      옛 localStorage 패턴을 유지하던 흔적. 시드 23k+ 건에서 PostgREST 1000행 limit에
--      걸려 production에서 가게별 리뷰가 안 보이는 문제 발생.
--
-- 해결: 가게 상세는 그 가게의 리뷰만 lazy fetch (WHERE restaurant_id = ?).
--      지도 마커는 모든 가게의 사용자 점수가 필요 → 가벼운 집계 view 한 번만 받음.
--
-- regular view (materialized X) — reviews 변경 즉시 반영.
-- reviews_restaurant_id_idx가 이미 있어 GROUP BY 빠름.
-- RLS는 base table(reviews)의 reviews_select 정책 상속 — anon/authenticated 모두 SELECT OK.

CREATE OR REPLACE VIEW public.restaurant_review_stats AS
SELECT
  restaurant_id,
  COUNT(*)::int AS review_count,
  ROUND(AVG(rating)::numeric, 2) AS avg_rating,
  COUNT(*) FILTER (WHERE array_length(foreign_objects, 1) > 0)::int AS foreign_reports,
  COALESCE(SUM(array_length(foreign_objects, 1))::int, 0) AS foreign_total,
  MAX(created_at) AS last_review_at
FROM public.reviews
GROUP BY restaurant_id;

GRANT SELECT ON public.restaurant_review_stats TO anon, authenticated;
