import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { color, elevation, motion, radius, spacing, type RadiusKey, type SpacingKey } from '@/constants/tokens';

type Variant = 'elevated' | 'outlined' | 'tinted' | 'flat' | 'edge';
type Tint = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral';

const TINT_BG: Record<Tint, string> = {
  success: color.status.successSoft,
  warning: color.status.warningSoft,
  danger:  color.status.dangerSoft,
  info:    color.status.infoSoft,
  brand:   color.brand.primarySoft,
  neutral: color.fill.tertiary,
};

export type CardProps = {
  variant?: Variant;
  tint?: Tint;
  bgColor?: string;
  padding?: SpacingKey | 'none';
  radius?: Extract<RadiusKey, 'm' | 'l' | 'xl' | 'xxl'>;
  pressable?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
  children: ReactNode;
};

export function Card({
  variant = 'elevated',
  tint,
  bgColor,
  padding = 'l',
  radius: radiusKey = 'xl',
  pressable = false,
  onPress,
  accessibilityLabel,
  style,
  children,
}: CardProps) {
  const bg = bgColor
    ?? (variant === 'tinted' ? TINT_BG[tint ?? 'neutral'] : color.surface.subtle);

  // flat = 토스 스타일. border/shadow 없이 흰색 박스 + radius만. 카드 사이는 페이지 배경(회색)으로 분리.
  const elev: ViewStyle =
    variant === 'elevated' ? (elevation.card as ViewStyle)
      : variant === 'outlined' ? (elevation.flat as ViewStyle)
      : {};

  // edge = 토스 스타일 풀 너비 카드. 라운드 없이 페이지 가장자리까지 stretch.
  const effectiveRadius = variant === 'edge' ? 0 : radius[radiusKey];
  const baseStyle: ViewStyle = {
    backgroundColor: bg,
    padding: padding === 'none' ? 0 : spacing[padding],
    borderRadius: effectiveRadius,
    ...elev,
  };

  if (pressable && onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          baseStyle,
          pressed && { opacity: motion.press.opacity, transform: [{ scale: motion.press.scale }] },
          style,
        ]}>
        {children}
      </Pressable>
    );
  }

  return <View style={[baseStyle, style]}>{children}</View>;
}

const _styles = StyleSheet.create({}); // reserved
void _styles;
