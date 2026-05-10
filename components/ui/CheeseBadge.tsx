import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Cheese } from '@/constants/Assets';
import { color, mascotSize, spacing, typography, type CheeseGradeKey } from '@/constants/tokens';

const LABEL: Record<CheeseGradeKey, string> = {
  GOLDEN: '골드 치즈',
  SILVER: '실버 치즈',
  BRONZE: '브론즈 치즈',
  ROTTEN: '썩은 치즈',
};

const DEFAULT_COUNT: Record<CheeseGradeKey, number> = {
  GOLDEN: 3,
  SILVER: 2,
  BRONZE: 1,
  ROTTEN: 0,
};

type Size = 'xs' | 'sm' | 'md' | 'lg';
const SIZE: Record<Size, number> = {
  xs: 14,
  sm: mascotSize.badge,    // 18
  md: mascotSize.micro,    // 28
  lg: 44,
};

const CHEESE_SRC = (g: CheeseGradeKey) => {
  if (g === 'GOLDEN') return Cheese.gold;
  if (g === 'SILVER') return Cheese.silver;
  if (g === 'BRONZE') return Cheese.bronze;
  return null;
};

export type CheeseBadgeProps = {
  grade: CheeseGradeKey;
  count?: number;
  size?: Size;
  showLabel?: boolean;
  style?: ViewStyle;
};

export function CheeseBadge({
  grade,
  count,
  size = 'sm',
  showLabel = false,
  style,
}: CheeseBadgeProps) {
  const dim = SIZE[size];
  const src = CHEESE_SRC(grade);
  const n = count ?? DEFAULT_COUNT[grade];
  const fg = color.cheese[grade].fg;

  if (!src) {
    return (
      <View style={[styles.row, style]}>
        <Text style={[typography.captionEmphasized, { color: fg }]}>{LABEL[grade]}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.row, style]}>
      {n > 0 ? (
        <View style={styles.cheeseRow}>
          {Array.from({ length: n }).map((_, i) => (
            <Image key={i} source={src} style={{ width: dim, height: dim, marginRight: -dim * 0.2 }} resizeMode="contain" />
          ))}
        </View>
      ) : null}
      {showLabel ? (
        <Text style={[typography.captionEmphasized, { color: fg, marginLeft: spacing.xs + 2 }]}>
          {LABEL[grade]}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  cheeseRow: { flexDirection: 'row', alignItems: 'center' },
});
