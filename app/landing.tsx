// 첫 앱 진입 시 표시되는 랜딩 페이지.
// 카카오로 시작하기 / 비회원으로 사용하기 두 가지 진입점.

import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mascots } from '@/constants/Assets';
import { color, mascotSize, radius, spacing, typography } from '@/constants/tokens';
import { loginWithKakao } from '@/utils/kakaoAuth';
import { markLandingSkipped } from '@/utils/landing';

const KAKAO_YELLOW = '#FEE500';
const KAKAO_TEXT = '#191919';

export default function LandingScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xl }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 상단: 마스코트 + 타이틀 + 부제 */}
      <View style={styles.hero}>
        <Image source={Mascots.search} style={styles.mascot} resizeMode="contain" />
        <Text style={styles.brand}>식탐정</Text>
        <Text style={styles.tagline}>
          서울 식당의 위생을{'\n'}한눈에 확인하세요
        </Text>

        <View style={styles.featureList}>
          <FeatureRow icon="🔍" label="12만 곳의 식약처 위생 데이터" />
          <FeatureRow icon="🧀" label="치즈 등급으로 한눈에 안전도 확인" />
          <FeatureRow icon="❤️" label="좋아요로 단골집 모으기" />
        </View>
      </View>

      {/* 하단: 카카오 로그인 + 비회원 진입 */}
      <View style={styles.cta}>
        <Pressable
          onPress={() => loginWithKakao()}
          accessibilityRole="button"
          accessibilityLabel="카카오로 시작하기"
          style={({ pressed }) => [styles.kakaoBtn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.kakaoIcon}>💬</Text>
          <Text style={styles.kakaoText}>카카오로 시작하기</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            markLandingSkipped();
            router.replace('/(tabs)' as any);
          }}
          accessibilityRole="button"
          accessibilityLabel="비회원으로 사용하기"
          style={({ pressed }) => [styles.guestBtn, pressed && { opacity: 0.6 }]}>
          <Text style={styles.guestText}>비회원으로 사용하기</Text>
        </Pressable>

        <Text style={styles.terms}>
          시작 시 <Text style={styles.termsLink}>서비스 약관</Text> 및{' '}
          <Text style={styles.termsLink}>개인정보 처리방침</Text>에 동의하게 돼요.
        </Text>
      </View>
    </View>
  );
}

function FeatureRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.surface.subtle,
    paddingHorizontal: spacing.xl,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascot: { width: mascotSize.hero, height: mascotSize.hero, marginBottom: spacing.l },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: color.text.primary,
    marginBottom: spacing.s,
  },
  tagline: {
    ...typography.body,
    color: color.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
    lineHeight: 24,
  },
  featureList: {
    width: '100%',
    gap: spacing.s + 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingVertical: spacing.xs + 2,
  },
  featureIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  featureText: { ...typography.subheadline, color: color.text.primary },

  cta: { gap: spacing.m, alignItems: 'center' },
  kakaoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    width: '100%',
    height: 52,
    borderRadius: radius.l,
    backgroundColor: KAKAO_YELLOW,
  },
  kakaoIcon: { fontSize: 18 },
  kakaoText: { ...typography.bodyEmphasized, color: KAKAO_TEXT, fontSize: 16 },

  guestBtn: {
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
  },
  guestText: {
    ...typography.subheadline,
    color: color.text.secondary,
    textDecorationLine: 'underline',
  },

  terms: {
    ...typography.caption,
    color: color.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.s,
  },
  termsLink: {
    color: color.text.secondary,
    textDecorationLine: 'underline',
  },
});
