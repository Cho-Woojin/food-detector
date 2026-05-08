// 랜딩 페이지 표시 여부 관리 (localStorage 플래그).
// 로그인했거나 "비회원으로 사용하기" 클릭하면 markLandingSkipped()로 플래그 셋.
// 다음 진입부턴 랜딩 건너뛰고 (tabs)로 직행.

const STORAGE_KEY = 'food-detector:landing-skipped';

export function shouldShowLanding(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) !== '1';
}

export function markLandingSkipped(): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
}

export function resetLandingFlag(): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
