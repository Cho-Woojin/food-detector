import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { color, elevation, radius, spacing } from '@/constants/tokens';

export type SkeletonCardProps = {
  height?: number;
  style?: ViewStyle;
};

/** Pulsing placeholder. Use while data is loading. */
export function SkeletonCard({ height = 96, style }: SkeletonCardProps) {
  const a = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0.7, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [a]);

  return (
    <View style={[styles.card, { height }, style]}>
      <Animated.View style={[styles.line, { width: '70%', opacity: a }]} />
      <Animated.View style={[styles.line, { width: '40%', marginTop: spacing.s, opacity: a }]} />
      <Animated.View style={[styles.line, { width: '85%', marginTop: spacing.m, opacity: a }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface.subtle,
    borderRadius: radius.l,
    padding: spacing.l,
    ...(elevation.card as ViewStyle),
  },
  line: {
    height: 12,
    borderRadius: radius.s,
    backgroundColor: color.fill.tertiary,
  },
});
