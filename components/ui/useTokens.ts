import { useColorScheme } from '@/components/useColorScheme';
import { color, darkColor } from '@/constants/tokens';

/**
 * Token resolver hook. v1.0 forces light scheme — dark tokens are wired but
 * the Profile toggle is disabled. Components consume `useTokens()` so that
 * v1.1 dark-mode rollout becomes a single-line change here.
 */
export function useTokens() {
  const scheme = useColorScheme();
  // v1.0: ignore system scheme — return light. Replace with `scheme ?? 'light'` to enable.
  const _ = scheme; // eslint-disable-line @typescript-eslint/no-unused-vars
  const isDark = false;
  return {
    isDark,
    c: isDark
      ? { ...color, ...darkColor }
      : color,
  };
}
