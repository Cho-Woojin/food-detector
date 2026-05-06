import { ActivityIndicator, Image, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Mascots, type MascotKey } from '@/constants/Assets';
import { Icon, type IconName } from '@/components/Icon';
import { color, motion, radius, spacing, typography } from '@/constants/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'owner';
type Size = 'sm' | 'md' | 'lg';

const SIZE: Record<Size, { h: number; px: number; gap: number; r: number; font: any; iconSize: number; mascotSize: number }> = {
  sm: { h: 36, px: spacing.m, gap: spacing.xs, r: radius.m, font: typography.subheadlineEmphasized, iconSize: 16, mascotSize: 20 },
  md: { h: 48, px: spacing.l, gap: spacing.s, r: radius.l, font: typography.subheadlineEmphasized, iconSize: 18, mascotSize: 24 },
  lg: { h: 56, px: spacing.xl, gap: spacing.s, r: radius.l, font: typography.bodyEmphasized,        iconSize: 20, mascotSize: 28 },
};

type Palette = { bg: string; bgPressed: string; fg: string; border?: string };

const VARIANT: Record<Variant, Palette> = {
  primary:   { bg: color.brand.primary,        bgPressed: color.brand.primaryPressed, fg: color.text.onBrand },
  secondary: { bg: color.brand.primarySoft,    bgPressed: color.brand.primarySoftStrong, fg: color.brand.primary },
  ghost:     { bg: 'transparent',               bgPressed: color.fill.tertiary,         fg: color.brand.primary },
  danger:    { bg: color.status.danger,         bgPressed: '#D70015',                   fg: color.text.onDanger },
  owner:     { bg: color.owner.primary,         bgPressed: color.owner.primaryHover,    fg: color.text.onBrand },
};

export type ButtonProps = {
  variant?: Variant;
  size?: Size;
  leftIcon?: IconName;
  rightIcon?: IconName;
  mascotIcon?: MascotKey;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
  children: string;
};

export function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  mascotIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  onPress,
  accessibilityLabel,
  style,
  children,
}: ButtonProps) {
  const dim = SIZE[size];
  const colors = VARIANT[variant];

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height: dim.h,
          paddingHorizontal: dim.px,
          gap: dim.gap,
          borderRadius: dim.r,
          backgroundColor: pressed ? colors.bgPressed : colors.bg,
          opacity: disabled ? 0.4 : 1,
        },
        fullWidth && styles.fullWidth,
        pressed && { transform: [{ scale: motion.press.scale }] },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.fg} />
      ) : (
        <>
          {mascotIcon ? (
            <Image source={Mascots[mascotIcon]} style={{ width: dim.mascotSize, height: dim.mascotSize }} resizeMode="contain" />
          ) : leftIcon ? (
            <Icon name={leftIcon} size={dim.iconSize} color={colors.fg} />
          ) : null}
          <Text style={[dim.font, { color: colors.fg }]} numberOfLines={1}>
            {children}
          </Text>
          {rightIcon ? <Icon name={rightIcon} size={dim.iconSize} color={colors.fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
});
