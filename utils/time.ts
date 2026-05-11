// 시간 관련 공용 유틸. 화면별로 다른 표기로 갈리지 않도록 단일 원본.

/**
 * 절대 timestamp → 상대 시간 한국어 라벨.
 * "방금 전 / N분 전 / N시간 전 / N일 전 / N주 전 / N달 전 / N년 전"
 */
export function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / (60 * 1000));
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  if (d < 30) return `${Math.floor(d / 7)}주 전`;
  if (d < 365) return `${Math.floor(d / 30)}달 전`;
  return `${Math.floor(d / 365)}년 전`;
}
