import { Mascots, Onboarding } from '@/constants/Assets';
import { palette } from '@/constants/Colors';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SLIDES = [
  {
    image: Onboarding.investigate,
    fallback: Mascots.search,
    title: '식탐정이 추적합니다',
    body: '인증 마크가 아니라\n지금도 믿을 수 있는 식당을 알려드려요',
  },
  {
    image: null,
    fallback: Mascots.weather,
    title: '오늘의 위험을 알려드려요',
    body: '식약처 식중독 예측 + 서울시 환경 데이터로\n오늘 안전한 메뉴를 제안합니다',
  },
  {
    image: Onboarding.celebrate,
    fallback: Mascots.ceremony,
    title: '골든 치즈 등급',
    body: '5축 위생 평가로 검증한 식당에\n식탐정이 직접 등급을 부여합니다',
  },
];

const PHONE_WIDTH = 430;

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
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        <Pressable onPress={() => router.replace('/(tabs)')} style={styles.skipBtn}>
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

      <View style={[styles.cta, { paddingBottom: 16 + insets.bottom }]}>
        <Pressable onPress={goNext} style={styles.ctaBtn}>
          <Text style={styles.ctaBtnText}>
            {page === SLIDES.length - 1 ? '식탐정 시작하기' : '다음'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.white },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.border },
  dotActive: { width: 18, backgroundColor: palette.accent },
  skipBtn: { width: 60, alignItems: 'flex-end' },
  skipText: { fontSize: 13, color: palette.text3 },

  slidesScroll: { flex: 1 },
  slide: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideImage: { width: 240, height: 240, marginBottom: 32 },
  slideTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.text1,
    marginBottom: 12,
    textAlign: 'center',
  },
  slideBody: {
    fontSize: 14,
    color: palette.text2,
    textAlign: 'center',
    lineHeight: 22,
  },

  cta: { paddingHorizontal: 20, paddingTop: 12 },
  ctaBtn: {
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: palette.white },
});
