import { Mascots, Onboarding } from '@/constants/Assets';
import { color, mascotSize, motion, radius, spacing, typography } from '@/constants/tokens';
import { Button } from '@/components/ui';
import { Stack, router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SLIDES = [
  {
    image: Onboarding.investigate,
    fallback: Mascots.search,
    title: '식탐정이 추적해요',
    body: '인증 마크가 아니라\n지금 믿을 수 있는 식당을 알려줘요',
  },
  {
    image: null,
    fallback: Mascots.weather,
    title: '오늘의 위험을 알려줘요',
    body: '기상·식약처 데이터로\n오늘 안전한 메뉴를 추천해요',
  },
  {
    image: Onboarding.celebrate,
    fallback: Mascots.ceremony,
    title: '치즈 등급으로 한눈에',
    body: '식탐정이 다섯 가지 기준으로 검증한 식당에\n직접 등급을 매겨요',
  },
];

const PHONE_WIDTH = 430;
const DOT_INACTIVE_W = 6;
const DOT_ACTIVE_W = 24;
const DOT_H = 6;

export default function Onboarding3() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const slideWidth = Math.min(width, PHONE_WIDTH);
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
    if (idx !== page) setPage(idx);
  };

  const goNext = () => {
    if (page < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (page + 1) * slideWidth, animated: true });
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topBar}>
        <View style={{ width: 60 }} />
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Dot key={i} active={i === page} />
          ))}
        </View>
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          accessibilityRole="button"
          accessibilityLabel="온보딩 건너뛰기"
          hitSlop={12}
          style={styles.skipBtn}>
          <Text style={styles.skipText}>건너뛰기</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.slidesScroll}>
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width: slideWidth }]}>
            <Image
              source={slide.image ?? slide.fallback}
              style={styles.slideImage}
              resizeMode="contain"
            />
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideBody}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: spacing.l + insets.bottom }]}>
        <Button variant="primary" size="lg" fullWidth onPress={goNext}>
          {page === SLIDES.length - 1 ? '식탐정 시작하기' : '다음'}
        </Button>
      </View>
    </View>
  );
}

function Dot({ active }: { active: boolean }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? DOT_ACTIVE_W : DOT_INACTIVE_W, { duration: motion.duration.base }),
  }));
  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: active ? color.brand.primary : color.border.default },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: DOT_INACTIVE_W, height: DOT_H, borderRadius: radius.pill, backgroundColor: color.border.default },
  skipBtn: { width: 60, alignItems: 'flex-end', minHeight: 44, justifyContent: 'center' },
  skipText: { ...typography.caption, color: color.text.tertiary },

  slidesScroll: { flex: 1 },
  slide: {
    flex: 1,
    paddingHorizontal: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideImage: { width: mascotSize.hero, height: mascotSize.hero, marginBottom: spacing.xxxl },
  slideTitle: {
    ...typography.title,
    color: color.text.primary,
    marginBottom: spacing.m,
    textAlign: 'center',
  },
  slideBody: {
    ...typography.body,
    color: color.text.secondary,
    textAlign: 'center',
  },

  cta: { paddingHorizontal: spacing.xl, paddingTop: spacing.m },
});
