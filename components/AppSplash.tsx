import { Logos, Mascots } from '@/constants/Assets';
import { palette } from '@/constants/Colors';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

type Props = {
  /** 데이터 로딩이 끝나도 최소 노출되는 시간(ms). 브랜딩 강조용. */
  minDurationMs?: number;
  ready: boolean;
  onFinish: () => void;
};

export function AppSplash({ minDurationMs = 1400, ready, onFinish }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(20)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const startedAt = useRef<number>(Date.now());

  // 진입 애니메이션
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 마스코트 살짝 둥둥
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [bounce, fade, lift]);

  // ready + 최소 노출 시간 충족 시 페이드 아웃
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

  const bounceY = bounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

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

        <Animated.Image
          source={Mascots.search}
          style={[styles.mascot, { transform: [{ translateY: bounceY }] }]}
          resizeMode="contain"
        />

        <Text style={styles.tagline}>오늘 안전한 식당, 식탐정이 찾아드릴게요</Text>
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
    backgroundColor: palette.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  center: { alignItems: 'center', gap: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoImage: { width: 56, height: 56 },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: palette.primaryGreen,
    letterSpacing: -0.5,
  },
  mascot: { width: 180, height: 180 },
  tagline: {
    fontSize: 14,
    color: palette.text2,
    fontWeight: '500',
    textAlign: 'center',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 64,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.primaryGreen,
  },
});
