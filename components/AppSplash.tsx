import { Logos, Mascots } from '@/constants/Assets';
import { color, mascotSize, motion, radius, spacing, typography } from '@/constants/tokens';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

type Props = {
  /** Minimum exposure time even when data is ready (ms) — branding hold. */
  minDurationMs?: number;
  ready: boolean;
  onFinish: () => void;
};

export function AppSplash({ minDurationMs = 1400, ready, onFinish }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(20)).current;
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: motion.duration.splash,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: motion.duration.splash + 40,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, lift]);

  useEffect(() => {
    if (!ready) return;
    const elapsed = Date.now() - startedAt.current;
    const remaining = Math.max(0, minDurationMs - elapsed);
    const t = setTimeout(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: 280,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => onFinish());
    }, remaining);
    return () => clearTimeout(t);
  }, [ready, minDurationMs, fade, onFinish]);

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.center,
          { opacity: fade, transform: [{ translateY: lift }] },
        ]}>
        <View style={styles.logoRow}>
          <Image source={Logos.symbol} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.logoText}>식탐정</Text>
        </View>

        <Image source={Mascots.search} style={styles.mascot} resizeMode="contain" />

        <Text style={styles.tagline}>오늘 안전한 식당, 식탐정이 찾아줄게요</Text>
      </Animated.View>

      <View style={styles.dotsRow}>
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const a = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, {
          toValue: 1,
          duration: 500,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(a, {
          toValue: 0.3,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [a, delay]);
  return <Animated.View style={[styles.dot, { opacity: a }]} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  center: { alignItems: 'center', gap: spacing.xxl },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  logoImage: { width: 56, height: 56 },
  logoText: {
    ...typography.display,
    fontSize: 36,
    lineHeight: 40,
    color: color.brand.primary,
  },
  mascot: { width: mascotSize.hero, height: mascotSize.hero },
  tagline: {
    ...typography.subheadlineEmphasized,
    color: color.text.secondary,
    textAlign: 'center',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 64,
    flexDirection: 'row',
    gap: spacing.s,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: color.brand.primary,
  },
});
