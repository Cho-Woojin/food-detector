import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { color, motion, radius } from '@/constants/tokens';

type Tone = 'default' | 'fill' | 'brand' | 'danger';

const TONE_BG: Record<Tone, string | undefined> = {
  default: undefined,
  fill: color.fill.tertiary,
  brand: color.brand.primarySoft,
  danger: color.status.dangerSoft,
};

const TONE_FG: Record<Tone, string> = {
  default: color.text.primary,
  fill: color.text.primary,
  brand: color.brand.primary,
  danger: color.status.danger,
};

export type IconButtonProps = {
  icon: IconName;
  size?: 'sm' | 'md' | 'lg';
  tone?: Tone;
  active?: boolean;
  accessibilityLabel: string;
  onPress?: () => void;
  style?: ViewStyle;
};

const SIZE: Record<NonNullable<IconButtonProps['size']>, { box: number; icon: number }> = {
  sm: { box: 36, icon: 18 },
  md: { box: 44, icon: 22 },
  lg: { box: 48, icon: 24 },
};

/** Standard square icon button — always meets HIG min touch target. */
export function IconButton({
  icon,
  size = 'md',
  tone = 'default',
  active = false,
  accessibilityLabel,
  onPress,
  style,
}: IconButtonProps) {
  const dim = SIZE[size];
  const bg = TONE_BG[tone];
  const fg = active ? color.brand.primary : TONE_FG[tone];

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.box,
        { width: dim.box, height: dim.box, backgroundColor: bg },
        pressed && { opacity: motion.press.opacity, transform: [{ scale: motion.press.scale }] },
        style,
      ]}>
      <Icon name={icon} size={dim.icon} color={fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
