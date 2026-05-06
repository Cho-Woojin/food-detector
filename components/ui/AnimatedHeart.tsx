import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ViewStyle } from 'react-native';
import { Icon } from '@/components/Icon';
import { color, motion } from '@/constants/tokens';

export type AnimatedHeartProps = {
  active: boolean;
  size?: number;
  hitSize?: number;
  onPress: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

/** Heart toggle with bounce animation on activate. */
export function AnimatedHeart({
  active,
  size = 22,
  hitSize = 44,
  onPress,
  accessibilityLabel,
  style,
}: AnimatedHeartProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const prev = useRef(active);

  useEffect(() => {
    if (prev.current === active) return;
    prev.current = active;
    if (active) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.25, duration: motion.duration.fast, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: motion.duration.fast, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [active, scale]);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (active ? '좋아요 취소' : '좋아요')}
      accessibilityState={{ selected: active }}
      style={[
        {
          width: hitSize,
          height: hitSize,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon
          name={active ? 'heart' : 'heartOutline'}
          size={size}
          color={active ? color.brand.primary : color.text.secondary}
        />
      </Animated.View>
    </Pressable>
  );
}
