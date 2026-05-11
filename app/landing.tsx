// 첫 앱 진입 시 표시되는 5단계 온보딩.
// 1) 문제 공감 → 2) 위치 기반 안전 정보(권한 요청 포함) → 3) 데이터 신뢰 → 4) 별점·리뷰 → 5) 소셜 로그인
//
// 위치 권한은 진입 즉시 X — Step 2에서 컨텍스트와 함께 요청.
// 각 단계 진입 시 image + text가 동시에 fade-in down (Reanimated FadeInDown).

import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image, Pressable, StyleSheet, Text, View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconName } from '@/components/Icon';
import { KakaoLoginButton } from '@/components/ui';
import { Logos, Mascots, Onboarding } from '@/constants/Assets';
import { color, mascotSize, radius, spacing, typography } from '@/constants/tokens';
import { loginWithKakao } from '@/utils/kakaoAuth';
import { markLandingSkipped } from '@/utils/landing';
import { loadIndex } from '@/utils/loadData';
import { requestUserLocation } from '@/utils/location';

type Step = 1 | 2 | 3 | 4 | 5;
const TOTAL_STEPS = 5;

// 진입 애니메이션 — 모든 step 콘텐츠에 동일 적용
const ENTER = FadeInDown.duration(500).springify().damping(18);

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(1);
  const [locationRequested, setLocationRequested] = useState(false);
  // 식당 총 개수 — restaurants-index.json meta.totalCount (데이터 갱신 시 자동 반영)
  const [totalCount, setTotalCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadIndex()
      .then((idx) => { if (!cancelled) setTotalCount(idx.meta.totalCount); })
      .catch(() => { /* silently fall back to '152,238개' fallback in display */ });
    return () => { cancelled = true; };
  }, []);

  const next = () => setStep((s) => Math.min(TOTAL_STEPS, (s + 1)) as Step);
  const back = () => setStep((s) => Math.max(1, (s - 1)) as Step);
  const goEnter = () => {
    markLandingSkipped();
    router.replace('/(tabs)' as any);
  };

  // Step 2 — 위치 권한 요청 후 다음 단계로. 권한 거부 시에도 진행 (기본 지역 fallback).
  const requestLocationAndNext = async () => {
    if (locationRequested) {
      next();
      return;
    }
    setLocationRequested(true);
    try {
      await requestUserLocation();
    } catch {
      // 거부·실패 시에도 다음 단계로 — 비서울/캐시 fallback이 이미 동작
    }
    next();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.l, paddingBottom: insets.bottom + spacing.l }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topRow}>
        {step > 1 ? (
          <Pressable
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel="이전 단계로"
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
        ) : <View style={styles.backBtn} />}
        <ProgressBar step={step} total={TOTAL_STEPS} />
        <View style={styles.backBtn} />
      </View>

      {/* 단계 변경 시 key로 remount → entering 애니메이션 재실행 */}
      <Animated.View key={step} entering={ENTER} style={styles.body}>
        {step === 1 && <StepProblem onNext={next} totalCount={totalCount} />}
        {step === 2 && <StepLocation onAllow={requestLocationAndNext} />}
        {step === 3 && <StepTrust onNext={next} totalCount={totalCount} />}
        {step === 4 && <StepReport onNext={next} />}
        {step === 5 && <StepSignup onSkip={goEnter} />}
      </Animated.View>
    </View>
  );
}

// ===== 진행 표시 =====
function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressSeg,
            i < step ? styles.progressSegActive : styles.progressSegIdle,
          ]}
        />
      ))}
    </View>
  );
}

// 식당 수 — 데이터에서 로드된 수치 우선, 로딩 전이면 fallback 텍스트
function formatCount(n: number | null): string {
  if (n == null) return '15만';
  return n.toLocaleString('ko-KR');
}

// ===== Step 1: 문제 공감 =====
function StepProblem({ onNext, totalCount }: { onNext: () => void; totalCount: number | null }) {
  return (
    <>
      <View style={styles.textTop}>
        <View style={styles.brandRow}>
          <Image source={Logos.symbol} style={styles.brandSymbol} resizeMode="contain" />
          <Text style={styles.brand}>식탐정</Text>
        </View>
        <Text style={styles.bigQuote2}>
          오늘 방문할 음식점,{'\n'}안전할까요?
        </Text>
        <Text style={styles.subBodyLeft}>
          서울 25개 자치구 {formatCount(totalCount)}개 음식점의 위생 안전을 조사해요.
          식탐정이 안전한 식당을 골라드릴게요.
        </Text>
      </View>
      <View style={styles.imageBelow}>
        <Image source={Onboarding.investigate} style={styles.illustration} resizeMode="contain" />
      </View>
      <PrimaryNext label="시작하기" onPress={onNext} />
    </>
  );
}

// ===== Step 2: 위치 기반 안전 정보 — 권한 요청 + 미리보기 =====
function StepLocation({ onAllow }: { onAllow: () => void }) {
  return (
    <>
      <View style={styles.textTop}>
        <Text style={styles.bigQuote2}>내 주변 환경에 맞춰{'\n'}오늘의 메뉴를 추천해요</Text>
        <Text style={styles.subBodyLeft}>
          현재 위치의 기상·식중독 위험 단계 예측을 기반으로
          메뉴를 추천해요.
        </Text>
      </View>

      {/* 위치 허용 후 보게 될 콘텐츠 3가지 — 텍스트 리스트로 단순화 */}
      <View style={styles.bullets}>
        <Text style={styles.bulletLine}>· 기온·습도·미세먼지</Text>
        <Text style={styles.bulletLine}>· 오늘의 식중독 위험 단계</Text>
        <Text style={styles.bulletLine}>· 오늘의 식탐정 메뉴 가이드</Text>
      </View>

      <View style={styles.imageBelow}>
        <Image source={Mascots.weather} style={styles.heroMascot} resizeMode="contain" />
      </View>
      <PrimaryNext label="위치 정보 허용하기" onPress={onAllow} />
    </>
  );
}

// ===== Step 3: 데이터 신뢰 =====
function StepTrust({ onNext, totalCount }: { onNext: () => void; totalCount: number | null }) {
  return (
    <>
      <View style={styles.textTop}>
        <Text style={styles.bigQuote2}>
          공공데이터를 종합해{'\n'}식탐정 치즈 등급으로 알려드려요
        </Text>
        <Text style={styles.subBodyLeft}>
          식약처·자치구 공식 데이터를 한 번에 분석해서{'\n'}
          {formatCount(totalCount)}개 식당에 치즈 등급을 매겨요.
        </Text>
      </View>

      <View style={styles.trustGrid}>
        <TrustCard icon="logo" tint={color.brand.primary} title="식품안심업소" />
        <TrustCard icon="alert" tint={color.status.danger} title="행정처분 이력" />
        <TrustCard icon="star" tint={'#F1C40F'} title="모범·안심·착한"  />
        <TrustCard icon="storefront" tint={'#8B5CF6'} title="사장님 신뢰 인증" />
      </View>

      <View style={styles.imageBelow}>
        <Image source={Mascots.badge} style={styles.heroMascot} resizeMode="contain" />
      </View>
      <PrimaryNext label="다음" onPress={onNext} />
    </>
  );
}

function TrustCard({
  icon, tint, title, sub,
}: {
  icon: IconName;
  tint: string;
  title: string;
  sub?: string;
}) {
  return (
    <View style={styles.trustCard}>
      <View style={[styles.trustIconBox, { backgroundColor: tint + '22' }]}>
        <Icon name={icon} size={20} color={tint} />
      </View>
      <Text style={styles.trustTitle}>{title}</Text>
      {sub ? <Text style={styles.trustSub}>{sub}</Text> : null}
    </View>
  );
}

// ===== Step 4: 사용자 제보 가치 =====
function StepReport({ onNext }: { onNext: () => void }) {
  return (
    <>
      <View style={styles.textTop}>
        <Text style={styles.bigQuote2}>
          사용자들의 위생 제보가{'\n'}더 안전한 선택을 만들어요
        </Text>
        <Text style={styles.subBodyLeft}>
          다녀온 식당의 위생 상태를 별점으로 남겨주세요.
          생생한 경험이 치즈 등급에 반영돼요.
        </Text>
      </View>

      <View style={{ gap: spacing.s }}>
        <View style={styles.starDemo}>
          <StarRow rating={5} size={24} />
          <Text style={styles.starDemoLabel}>매우 위생적</Text>
        </View>
        <View style={styles.reviewSampleList}>
          <ReviewSample stars={5} text="주방이 깨끗했어요" />
          <ReviewSample stars={4} text="식기가 위생적이었어요" />
          <ReviewSample stars={2} text="화장실이 지저분해요" />
        </View>
      </View>

      <View style={styles.imageBelow}>
        <Image source={Onboarding.celebrate} style={styles.illustration} resizeMode="contain" />
      </View>
      <PrimaryNext label="다음" onPress={onNext} />
    </>
  );
}

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text
          key={i}
          style={{
            fontSize: size,
            color: i <= rating ? '#FACC15' : color.border.default,
            lineHeight: size * 1.05,
          }}>
          ★
        </Text>
      ))}
    </View>
  );
}

function ReviewSample({ stars, text }: { stars: number; text: string }) {
  return (
    <View style={styles.reviewSample}>
      <StarRow rating={stars} size={16} />
      <Text style={styles.reviewSampleText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

// ===== Step 5: 소셜 로그인 =====
// 레이아웃: 상단 텍스트 + 마스코트 — 중앙(카카오 + 약관) — 하단(비회원).
function StepSignup({ onSkip }: { onSkip: () => void }) {
  return (
    <>
      <View style={styles.textTop}>
        <Text style={styles.bigQuote2}>식탐정과 안전한 식사를 시작해보세요</Text>
        <Text style={styles.subBodyLeft}>
          로그인하면 좋아요·리뷰가 모든 기기에서 동기화돼요.
        </Text>
      </View>

      <View style={styles.imageBelow}>
        <Image source={Mascots.thanks} style={styles.heroMascot} resizeMode="contain" />
      </View>
      {/* 중앙 — 카카오 버튼 + 약관 */}
      <View style={styles.signupCenter}>
        <KakaoLoginButton onPress={() => loginWithKakao()} />
        <Text style={styles.terms}>
          시작 시 <Text style={styles.termsLink}>약관</Text> 및{' '}
          <Text style={styles.termsLink}>개인정보 처리방침</Text>에 동의해요.
        </Text>
      </View>

      {/* 하단 — 비회원으로 사용하기 (약관과 동일한 caption 사이즈) */}
      <Pressable onPress={onSkip} style={({ pressed }) => [styles.guestBtn, pressed && { opacity: 0.6 }]}>
        <Text style={styles.guestText}>비회원으로 사용하기</Text>
      </Pressable>
    </>
  );
}

// ===== 공통 컴포넌트 =====
function PrimaryNext({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.primaryBtn,
        pressed && !disabled && { opacity: 0.85 },
        disabled && { opacity: 0.5 },
      ]}>
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.canvas, paddingHorizontal: spacing.xl },

  // 상단 바
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginBottom: spacing.l },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 28, color: color.text.primary, lineHeight: 28, marginTop: -2 },
  progressRow: { flex: 1, flexDirection: 'row', gap: 4 },
  progressSeg: { flex: 1, height: 3, borderRadius: 2 },
  progressSegActive: { backgroundColor: color.brand.primary },
  progressSegIdle: { backgroundColor: color.border.default },

  body: { flex: 1, justifyContent: 'space-between' },
  // 텍스트가 위, 이미지가 아래로 가는 표준 레이아웃
  textTop: { paddingTop: spacing.s },
  imageBelow: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 120 },

  // 공통 텍스트
  heroMascot: { width: mascotSize.hero, height: mascotSize.hero, marginBottom: spacing.l },
  illustration: { width: '100%', height: 180, marginBottom: spacing.l },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.s },
  brandSymbol: { width: 28, height: 28 },
  brand: { fontSize: 26, fontWeight: '800', color: color.text.primary },
  bigQuote: { fontSize: 22, fontWeight: '700', color: color.text.primary, textAlign: 'center', lineHeight: 32, marginVertical: spacing.s },
  bigQuote2: { fontSize: 22, fontWeight: '700', color: color.text.primary, marginBottom: spacing.s, lineHeight: 30 },
  subBody: { ...typography.body, color: color.text.secondary, textAlign: 'center', lineHeight: 22 },
  subBodyLeft: { ...typography.body, color: color.text.secondary, lineHeight: 24, marginBottom: spacing.l },

  // Step 2 위치 기반 안전 정보 — 텍스트 리스트 (카드 없이 간결)
  bullets: { gap: 4, marginTop: spacing.xs },
  bulletLine: { ...typography.body, color: color.text.secondary, lineHeight: 24 },

  // Step 3 데이터 신뢰
  trustGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  trustCard: {
    width: '48%',
    backgroundColor: color.surface.subtle,
    borderRadius: radius.l,
    padding: spacing.l,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  trustIconBox: {
    width: 36, height: 36, borderRadius: radius.m,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  trustTitle: { ...typography.bodyEmphasized, color: color.text.primary },
  trustSub: { ...typography.caption, color: color.text.secondary },

  // Step 4 별점·리뷰
  starDemo: {
    backgroundColor: color.surface.tintGreen,
    borderRadius: radius.xl,
    padding: spacing.l,
    marginBottom: spacing.m,
    alignItems: 'center',
    gap: spacing.s,
  },
  starDemoLabel: { ...typography.subheadlineEmphasized, color: color.brand.primary },
  reviewSampleList: { gap: spacing.xs },
  reviewSample: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.m,
    paddingHorizontal: spacing.m, paddingVertical: spacing.s + 2,
    backgroundColor: color.surface.subtle, borderRadius: radius.l,
  },
  reviewSampleText: { ...typography.subheadline, color: color.text.primary, flex: 1 },

  // Step 5 가입
  // 중앙 묶음 — 카카오 버튼 + 약관. body의 space-between으로 자연스럽게 화면 중앙에 자리잡음.
  signupCenter: { alignItems: 'center', gap: spacing.s },
  // 하단 — 비회원으로 사용하기 (약관과 동일한 caption 사이즈)
  guestBtn: { paddingVertical: spacing.xs, alignItems: 'center' },
  guestText: { ...typography.caption, color: color.text.tertiary, textDecorationLine: 'underline' },
  terms: { ...typography.caption, color: color.text.tertiary, textAlign: 'center' },
  termsLink: { color: color.text.secondary, textDecorationLine: 'underline' },

  // 공통 버튼
  primaryBtn: {
    height: 52,
    borderRadius: radius.l,
    backgroundColor: color.brand.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { ...typography.bodyEmphasized, color: '#fff', fontSize: 16 },
});
