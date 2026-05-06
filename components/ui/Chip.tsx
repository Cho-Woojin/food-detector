import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { color, motion, radius, spacing, typography } from '@/constants/tokens';

type Variant = 'filter' | 'tag' | 'recent' | 'info';
type Size = 'sm' | 'md';
type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

export type ChipProps = {
  variant?: Variant;
  size?: Size;
  tone?: Tone;
  selected?: boolean;
  leftIcon?: IconName;
  onPress?: () => void;
  onRemove?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
  children: string;
};

const SIZE: Record<Size, { h: number; px: number; font: any; iconSize: number; gap: number }> = {
  sm: { h: 24, px: spacing.s + 2, font: typography.footnote, iconSize: 12, gap: spacing.xs },
  md: { h: 32, px: spacing.m + 2, font: typography.captionEmphasized, iconSize: 14, gap: spacing.xs + 2 },
};

const TONE: Record<Tone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: color.surface.subtle, fg: color.text.secondary, border: color.border.default },
  success: { bg: color.status.successSoft, fg: color.status.success, border: color.status.success },
  warning: { bg: color.status.warningSoft, fg: color.status.warning, border: color.status.warning },
  danger:  { bg: color.status.dangerSoft,  fg: color.status.danger,  border: color.status.danger  },
  brand:   { bg: color.brand.primarySoft,  fg: color.brand.primary,  border: color.brand.primary  },
};

export function Chip({
  variant = 'filter',
  size = 'md',
  tone = 'neutral',
  selected = false,
  leftIcon,
  onPress,
  onRemove,
  accessibilityLabel,
  style,
  children,
}: ChipProps) {
  const dim = SIZE[size];

  let bg: string; let fg: string; let border: string;
  if (variant === 'filter') {
    if (selected) {
      bg = color.brand.primary;
      fg = color.text.onBrand;
      border = color.brand.primary;
    } else {
      bg = color.surface.subtle;
      fg = color.text.secondary;
      border = color.border.default;
    }
  } else if (variant === 'recent') {
    bg = color.surface.subtle;
    fg = color.text.primary;
    border = color.border.default;
  } else {
    const t = TONE[tone];
    bg = t.bg;
    fg = t.fg;
    border = t.border;
  }

  const Container: any = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? children}
      style={({ pressed }: { pressed?: boolean } = {}) => [
        styles.base,
        {
          height: dim.h,
          paddingHorizontal: dim.px,
          gap: dim.gap,
          backgroundColor: bg,
          borderColor: border,
          // `info` variant is for soft pills (recommend / avoid lists) — no harsh outline
          borderWidth: variant === 'info' ? 0 : 1,
        },
        pressed && { opacity: motion.press.opacity },
        style,
      ]}>
      {leftIcon ? <Icon name={leftIcon} size={dim.iconSize} color={fg} /> : null}
      <Text style={[dim.font, { color: fg }]} numberOfLines={1}>
        {children}
      </Text>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${children} 삭제`}>
          <Icon name="close" size={dim.iconSize - 1} color={fg} />
        </Pressable>
      ) : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
});
