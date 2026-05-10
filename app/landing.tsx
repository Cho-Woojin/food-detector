// 첫 앱 진입 시 표시되는 5단계 온보딩.
// 1) 문제 공감 → 2) 검색 경험 → 3) 데이터 신뢰 → 4) 사용자 제보 가치 → 5) 소셜 로그인
//
// 각 단계 진입 시 image + text가 동시에 fade-in down (Reanimated FadeInDown).

import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Cheese, Logos, Mascots, Onboarding } from '@/constants/Assets';
import { color, mascotSize, radius, spacing, typography } from '@/constants/tokens';
import { loginWithKakao } from '@/utils/kakaoAuth';
import { markLandingSkipped } from '@/utils/landing';
import { ensureRecomputedIndex, RecomputedRow } from '@/utils/dataStore';

const KAKAO_YELLOW = '#FEE500';
const KAKAO_TEXT = '#191919';

type Step = 1 | 2 | 3 | 4 | 5;
const TOTAL_STEPS = 5;

// 진입 애니메이션 — 모든 step 콘텐츠에 동일 적용
const ENTER = FadeInDown.duration(500).springify().damping(18);

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [allRows, setAllRows] = useState<RecomputedRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    ensureRecomputedIndex().then((rows) => {
      if (!cancelled) setAllRows(rows);
    });
    return () => { cancelled = true; };
  }, []);

  const next = () => setStep((s) => Math.min(TOTAL_STEPS, (s + 1)) as Step);
  const back = () => setStep((s) => Math.max(1, (s - 1)) as Step);
  const goEnter = () => {
    markLandingSkipped();
    router.replace('/(tabs)' as any);
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
        {step === 1 && <StepProblem onNext={next} />}
        {step === 2 && <StepSearch
          rows={allRows}
          query={searchQuery}
          setQuery={setSearchQuery}
          onNext={next}
        />}
        {step === 3 && <StepTrust onNext={next} />}
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

// ===== Step 1: 문제 공감 =====
function StepProblem({ onNext }: { onNext: () => void }) {
  return (
    <>
      <View style={styles.textTop}>
        <View style={styles.brandRow}>
          <Image source={Logos.symbol} style={styles.brandSymbol} resizeMode="contain" />
          <Text style={styles.brand}>식탐정</Text>
        </View>
        <Text style={styles.bigQuote2}>
          오늘 먹는 음식,{'\n'}정말 안전할까요?
        </Text>
        <Text style={styles.subBodyLeft}>
          식약처 위생등급·행정처분 데이터로 서울 12만 식당의 위생을 알려드려요.
        </Text>
      </View>
      <View style={styles.imageBelow}>
        <Image source={Mascots.warning} style={styles.heroMascot} resizeMode="contain" />
      </View>
      <PrimaryNext label="시작하기" onPress={onNext} />
    </>
  );
}

// ===== Step 2: 검색 경험 =====
function StepSearch({
  rows, query, setQuery, onNext,
}: {
  rows: RecomputedRow[];
  query: string;
  setQuery: (s: string) => void;
  onNext: () => void;
}) {
  const q = query.trim();
  const hits = q.length === 0 ? [] : rows.filter((r) => r.n.includes(q)).slice(0, 3);

  return (
    <>
      <View style={styles.textTop}>
        <Text style={styles.bigQuote2}>안전한 식당을 한눈에</Text>
        <Text style={styles.subBodyLeft}>
          식당명을 입력하면 식탐정의 위생 등급을 바로 확인할 수 있어요.
        </Text>
      </View>

      <View style={{ gap: spacing.s }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="식당 이름을 입력해보세요"
          placeholderTextColor={color.text.tertiary}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {q.length > 0 && hits.length === 0 && (
          <Text style={styles.searchEmpty}>매칭되는 식당이 없어요</Text>
        )}
        {hits.map((r) => {
          const cheeseSrc =
            r.gr === 'GOLDEN' ? Cheese.gold
              : r.gr === 'SILVER' ? Cheese.silver
              : r.gr === 'BRONZE' ? Cheese.bronze
              : null;
          return (
            <View key={r.i} style={styles.searchItem}>
              {cheeseSrc ? (
                <Image source={cheeseSrc} style={styles.searchCheese} resizeMode="contain" />
              ) : (
                <View style={styles.searchCheese} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.searchName} numberOfLines={1}>{r.n}</Text>
                <Text style={styles.searchMeta}>{r.c} · {r.g}</Text>
              </View>
              <Text style={styles.searchScore}>
                {r.gr === 'GOLDEN' ? '골든'
                  : r.gr === 'SILVER' ? '실버'
                  : r.gr === 'BRONZE' ? '브론즈'
                  : '트랩'}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.imageBelow}>
        <Image source={Onboarding.investigate} style={styles.illustration} resizeMode="contain" />
      </View>
      <PrimaryNext label="다음" onPress={onNext} />
    </>
  );
}

// ===== Step 3: 데이터 신뢰 =====
function StepTrust({ onNext }: { onNext: () => void }) {
  return (
    <>
      <View style={styles.textTop}>
        <Text style={styles.bigQuote2}>식약처 공식 데이터 기반</Text>
        <Text style={styles.subBodyLeft}>
          12만 식당의 위생등급·행정처분·모범음식점 인증 정보를 모두 검증해 평가해요.
        </Text>
      </View>

      <View style={styles.trustGrid}>
        <TrustCard emoji="🛡️" title="위생등급제" sub="식약처 공식 인증" />
        <TrustCard emoji="⚖️" title="행정처분 이력" sub="자치구·식약처" />
        <TrustCard emoji="🏆" title="모범음식점" sub="자치구 인증" />
        <TrustCard emoji="🤝" title="사장님 인증" sub="직접 등록" />
      </View>

      <View style={styles.imageBelow}>
        <Image source={Mascots.badge} style={styles.heroMascot} resizeMode="contain" />
      </View>
      <PrimaryNext label="다음" onPress={onNext} />
    </>
  );
}

function TrustCard({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <View style={styles.trustCard}>
      <Text style={styles.trustEmoji}>{emoji}</Text>
      <Text style={styles.trustTitle}>{title}</Text>
      <Text style={styles.trustSub}>{sub}</Text>
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
          직접 방문한 식당, 위생 상태를 알려주세요.{'\n'}
          3초 체크만으로도 다른 사람에게 도움이 돼요.
        </Text>
      </View>

      <View style={{ gap: spacing.s }}>
        <View style={styles.starDemo}>
          <StarRow rating={5} size={32} />
          <Text style={styles.starDemoLabel}>5점 만점 — 매우 위생적</Text>
        </View>
        <View style={styles.reviewSampleList}>
          <ReviewSample stars={5} text="주방이 깨끗했어요" />
          <ReviewSample stars={4} text="식기가 위생적이었어요" />
          <ReviewSample stars={2} text="식기에 음식 자국" />
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
function StepSignup({ onSkip }: { onSkip: () => void }) {
  return (
    <>
      <View style={styles.textTop}>
        <Text style={styles.brand}>준비 완료!</Text>
        <Text style={styles.subBodyLeft}>이제 식탐정과 함께 안전한 식사를 시작해보세요.</Text>
      </View>

      <View style={styles.imageBelow}>
        <Image source={Mascots.thanks} style={styles.heroMascot} resizeMode="contain" />
      </View>

      <View style={styles.signupCta}>
        <Pressable
          onPress={() => loginWithKakao()}
          accessibilityRole="button"
          accessibilityLabel="카카오로 시작하기"
          style={({ pressed }) => [styles.kakaoBtn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.kakaoIcon}>💬</Text>
          <Text style={styles.kakaoText}>카카오로 시작하기</Text>
        </Pressable>

        <Pressable onPress={onSkip} style={({ pressed }) => [styles.guestBtn, pressed && { opacity: 0.6 }]}>
          <Text style={styles.guestText}>비회원으로 사용하기</Text>
        </Pressable>

        <Text style={styles.terms}>
          시작 시 <Text style={styles.termsLink}>약관</Text> 및{' '}
          <Text style={styles.termsLink}>개인정보 처리방침</Text>에 동의하게 돼요.
        </Text>
      </View>
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

  // Step 2 검색
  searchInput: {
    height: 52,
    borderRadius: radius.l,
    borderWidth: 0,
    backgroundColor: color.surface.subtle,
    paddingHorizontal: spacing.m,
    fontSize: 16,
    color: color.text.primary,
    marginBottom: spacing.m,
  },
  searchResults: { gap: spacing.xs },
  searchEmpty: { ...typography.subheadline, color: color.text.tertiary, textAlign: 'center', paddingVertical: spacing.m },
  searchItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.m,
    paddingVertical: spacing.s + 2, paddingHorizontal: spacing.m,
    backgroundColor: color.surface.subtle, borderRadius: radius.m,
  },
  searchCheese: { width: 32, height: 32 },
  searchName: { ...typography.bodyEmphasized, color: color.text.primary, marginBottom: 2 },
  searchMeta: { ...typography.caption, color: color.text.secondary },
  searchScore: { ...typography.bodyEmphasized, color: color.brand.primary },

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
  trustEmoji: { fontSize: 28, marginBottom: spacing.xs },
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
  signupCta: { gap: spacing.m, alignItems: 'center' },
  kakaoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.s, width: '100%', height: 52,
    borderRadius: radius.l, backgroundColor: KAKAO_YELLOW,
  },
  kakaoIcon: { fontSize: 18 },
  kakaoText: { ...typography.bodyEmphasized, color: KAKAO_TEXT, fontSize: 16 },
  guestBtn: { paddingVertical: spacing.m, paddingHorizontal: spacing.l },
  guestText: { ...typography.subheadline, color: color.text.secondary, textDecorationLine: 'underline' },
  terms: { ...typography.caption, color: color.text.tertiary, textAlign: 'center', marginTop: spacing.s },
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
