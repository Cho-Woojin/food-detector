-- reviews 테이블: 4축 별점 + 방문 시점 칩 컬럼 추가 (2026-05 새 모델)
--
-- 기존 1행 호환을 위해 모두 nullable.
-- 옛 rating (1~5 int) 컬럼은 호환용으로 보존됨 — 4축 평균을 반올림한 값이 저장됨.
-- HygieneReviewCard는 기존 rating 만 사용하므로 표시에는 영향 없음.

ALTER TABLE public.reviews
  ADD COLUMN axis_table int CHECK (axis_table IS NULL OR (axis_table BETWEEN 1 AND 5)),
  ADD COLUMN axis_food int CHECK (axis_food IS NULL OR (axis_food BETWEEN 1 AND 5)),
  ADD COLUMN axis_staff int CHECK (axis_staff IS NULL OR (axis_staff BETWEEN 1 AND 5)),
  ADD COLUMN axis_restroom int CHECK (axis_restroom IS NULL OR (axis_restroom BETWEEN 1 AND 5)),
  ADD COLUMN visit_window text CHECK (visit_window IS NULL OR visit_window IN ('today', 'week', 'older'));
