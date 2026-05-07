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
    title: '지도에서 한눈에',
    body: '서울 25개 자치구 식당의\n위생 등급을 치즈 마커로 보여줘요',
  },
  {
    image: null,
    fallback: Mascots.badge,
    title: '5가지 기준으로 검증',
    body: '위생등급·행정처분·인증·리뷰·메뉴 안전\n다섯 축으로 식당을 분석해요',
  },
  {
    image: Onboarding.celebrate,
    fallback: Mascots.ceremony,
    title: '안전한 단골집 모으기',
    body: '좋아요로 위생 좋은 식당을 저장하고\n위험 메뉴는 미리 안내받아요',
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
