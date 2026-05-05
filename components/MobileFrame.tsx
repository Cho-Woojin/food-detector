import { palette } from '@/constants/Colors';
import { ReactNode } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

const PHONE_MAX_WIDTH = 430;
const DESKTOP_BREAKPOINT = 768;

/**
 * 모바일 우선 프레임. 웹/데스크탑(>=768px)에서는 폰 프레임처럼 가운데 정렬되고,
 * 모바일에서는 풀스크린으로 표시된다. 공모전 URL 제출 시 데스크탑 사용자가
 * 모바일 레이아웃 그대로 보게 만들기 위한 래퍼.
 */
export function MobileFrame({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

  if (!isDesktop) {
    return <View style={styles.fullScreen}>{children}</View>;
  }

  return (
    <View style={styles.desktopBg}>
      <View style={styles.phoneFrame}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: palette.white,
  },
  desktopBg: {
    flex: 1,
    backgroundColor: palette.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneFrame: {
    width: PHONE_MAX_WIDTH,
    height: '100%',
    maxHeight: 932,
    backgroundColor: palette.white,
    borderRadius: 32,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
      },
      default: {},
    }),
  },
});
