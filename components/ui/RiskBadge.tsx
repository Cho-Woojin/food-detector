import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { color, radius, spacing, typography, type RiskLevel } from '@/constants/tokens';

const LABEL: Record<RiskLevel, string> = {
  1: '관심',
  2: '주의',
  3: '경고',
  4: '위험',
};

type Size = 'sm' | 'md' | 'lg';
const SIZE: Record<Size, { h: number; px: number; font: any; dot: number }> = {
  sm: { h: 22, px: spacing.s,     font: typography.footnote,           dot: 6 },
  md: { h: 28, px: spacing.m,     font: typography.captionEmphasized,  dot: 8 },
  lg: { h: 36, px: spacing.l,     font: typography.subheadlineEmphasized, dot: 10 },
};

export type RiskBadgeProps = {
  level: RiskLevel;
  size?: Size;
  showLabel?: boolean;
  style?: ViewStyle;
};

export function RiskBadge({ level, size = 'md', showLabel = true, style }: RiskBadgeProps) {
  const dim = SIZE[size];
  const fg = color.risk[level].fg;
  const bg = color.risk[level].bg;
  return (
    <View
      style={[
        styles.box,
        { height: dim.h, paddingHorizontal: dim.px, backgroundColor: bg },
        style,
      ]}>
      <View style={{ width: dim.dot, height: dim.dot, borderRadius: dim.dot / 2, backgroundColor: fg }} />
      {showLabel ? (
        <Text style={[dim.font, { color: fg, marginLeft: spacing.xs }]}>
          {LABEL[level]} · {level}단계
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
  },
});
