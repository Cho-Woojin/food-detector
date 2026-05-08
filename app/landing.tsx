// 첫 앱 진입 시 표시되는 7단계 온보딩 플로우.
// 1) Splash → 2) 문제 공감 → 3) 위치 허용 → 4) 위험지수 체험 →
// 5) 식당 검색 → 6) 결과 맛보기 → 7) Soft 가입(카카오 / 비회원)

import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mascots } from '@/constants/Assets';
import { color, mascotSize, radius, spacing, typography } from '@/constants/tokens';
import { loginWithKakao } from '@/utils/kakaoAuth';
import { markLandingSkipped } from '@/utils/landing';
import { ensureRecomputedIndex, RecomputedRow } from '@/utils/dataStore';
import { requestUserLocation, getCachedLocation } from '@/utils/location';

const KAKAO_YELLOW = '#FEE500';
const KAKAO_TEXT = '#191919';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
const TOTAL_STEPS = 7;

// 데모용 — 실제 위험 지수는 추후 외부 데이터(기상·식약처 알림) 연동
const MOCK_RISK = {
  level: '주의' as const,
  emoji: '🟡',
  guidance: '차가운 음식 주의하세요',
  detail: '여름철 해수 온도 상승으로 회·생굴 비브리오 위험이 높아요.',
};

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(1);
  const [locationGu, setLocationGu] = useState<string>('강남구'); // 위치 허용 시 채워짐
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPicked, setSearchPicked] = useState<RecomputedRow | null>(null);
  const [allRows, setAllRows] = useState<RecomputedRow[]>([]);

  // Splash 자동 전환
  useEffect(() => {
    if (step !== 1) return;
    const t = setTimeout(() => setStep(2), 1800);
    return () => clearTimeout(t);
  }, [step]);

  // 데이터 사전 로드 — 4·5단계에서 사용
  useEffect(() => {
    let cancelled = false;
    ensureRecomputedIndex().then((rows) => {
      if (!cancelled) setAllRows(rows);
    });
    return () => { cancelled = true; };
  }, []);

  const next = () => setStep((s) => Math.min(TOTAL_STEPS, (s + 1)) as Step);
  const goSkip = () => {
    markLandingSkipped();
    router.replace('/(tabs)' as any);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.l, paddingBottom: insets.bottom + spacing.l }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 진행 표시 — Splash·결과·가입 단계는 숨김 */}
      {step >= 2 && step <= 6 && <ProgressBar step={step} total={TOTAL_STEPS} />}

      <View style={styles.body}>
        {step === 1 && <StepSplash />}
        {step === 2 && <StepProblem onNext={next} onSkip={goSkip} />}
        {step === 3 && <StepLocation onNext={(gu) => { if (gu) setLocationGu(gu); next(); }} />}
        {step === 4 && <StepRisk gu={locationGu} rows={allRows} onNext={next} />}
        {step === 5 && (
          <StepSearch
            rows={allRows}
            query={searchQuery}
            setQuery={setSearchQuery}
            onPick={(r) => { setSearchPicked(r); next(); }}
            onSkip={next}
          />
        )}
        {step === 6 && <StepResult picked={searchPicked} onNext={next} />}
        {step === 7 && <StepSignup onSkip={goSkip} />}
      </View>
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

// ===== Step 1: Splash =====
function StepSplash() {
  return (
    <View style={styles.center}>
      <Image source={Mascots.search} style={styles.mascot} resizeMode="contain" />
      <Text style={styles.brand}>식탐정</Text>
      <Text style={styles.splashTagline}>오늘 안전한 식당 찾기</Text>
    </View>
  );
}

// ===== Step 2: 문제 공감 =====
function StepProblem({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <>
      <View style={styles.center}>
        <Text style={styles.questionEmoji}>🤔</Text>
        <Text style={styles.bigQuote}>
          오늘 먹는 음식,{'\n'}정말 안전할까요?
        </Text>
        <Text style={styles.subBody}>
          식약처 위생등급·행정처분·인증 데이터로{'\n'}서울 12만 식당의 위생을 알려드려요.
        </Text>
      </View>
      <PrimaryNext label="알아보기" onPress={onNext} />
      <SkipButton onPress={onSkip} />
    </>
  );
}

// ===== Step 3: 위치 허용 =====
function StepLocation({ onNext }: { onNext: (gu?: string) => void }) {
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이미 권한 받은 적이 있으면 캐시에서 즉시 사용 (24h)
  useEffect(() => {
    const cached = getCachedLocation();
    if (cached) onNext(cached.gu);
    // 의존성 비워서 마운트 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestLocation = async () => {
    setRequesting(true);
    setError(null);
    const loc = await requestUserLocation();
    setRequesting(false);
    if (loc) {
      onNext(loc.gu);
    } else {
      // 거부됐거나 실패 — 사용자에게 안내. 건너뛰기로 계속 가능.
      setError('위치 권한이 거부됐어요. 건너뛰기로 둘러볼 수 있어요.');
    }
  };

  return (
    <>
      <View style={styles.center}>
        <Text style={styles.questionEmoji}>🐭</Text>
        <Text style={styles.bigQuote}>주변 식당 위험도를{'\n'}알려드릴게요</Text>
        <Text style={styles.subBody}>
          현재 위치를 기준으로 가까운 자치구의{'\n'}안전 식당과 위험 알림을 받을 수 있어요.
        </Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
      <PrimaryNext
        label={requesting ? '위치 확인 중...' : '현재 위치 사용'}
        onPress={requestLocation}
        disabled={requesting}
      />
      <SkipButton onPress={() => onNext()} />
    </>
  );
}

// ===== Step 4: 위험지수 체험 =====
function StepRisk({ gu, rows, onNext }: { gu: string; rows: RecomputedRow[]; onNext: () => void }) {
  const goldensInGu = rows.filter((r) => r.gr === 'GOLDEN' && r.g === gu).slice(0, 3);
  const goldensFallback = rows.filter((r) => r.gr === 'GOLDEN').slice(0, 3);
  const list = goldensInGu.length > 0 ? goldensInGu : goldensFallback;

  return (
    <>
      <View style={{ flex: 1, paddingTop: spacing.l }}>
        <Text style={styles.locationTag}>{gu} 오늘 위험지수</Text>
        <View style={styles.riskBadge}>
          <Text style={styles.riskEmoji}>{MOCK_RISK.emoji}</Text>
          <Text style={styles.riskLevel}>{MOCK_RISK.level}</Text>
        </View>
        <Text style={styles.riskGuidance}>"{MOCK_RISK.guidance}"</Text>
        <Text style={styles.riskDetail}>{MOCK_RISK.detail}</Text>

        <Text style={styles.sectionLabel}>골든 치즈 식당 추천</Text>
        <View style={styles.goldList}>
          {list.length === 0 ? (
            <ActivityIndicator color={color.brand.primary} />
          ) : (
            list.map((r) => (
              <View key={r.i} style={styles.goldItem}>
                <Text style={styles.goldEmoji}>🧀</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goldName} numberOfLines={1}>{r.n}</Text>
                  <Text style={styles.goldMeta}>{r.c} · {r.g}</Text>
                </View>
                <Text style={styles.goldScore}>{r.s}점</Text>
              </View>
            ))
          )}
        </View>
      </View>
      <PrimaryNext label="다음" onPress={onNext} />
    </>
  );
}

// ===== Step 5: 식당 검색 =====
function StepSearch({
  rows, query, setQuery, onPick, onSkip,
}: {
  rows: RecomputedRow[];
  query: string;
  setQuery: (s: string) => void;
  onPick: (r: RecomputedRow) => void;
  onSkip: () => void;
}) {
  const q = query.trim();
  const hits = q.length === 0 ? [] : rows.filter((r) => r.n.includes(q)).slice(0, 6);

  return (
    <>
      <View style={{ flex: 1, paddingTop: spacing.l }}>
        <Text style={styles.bigQuote2}>찾아보고 싶은 식당이 있나요?</Text>
        <Text style={styles.subBody}>이름을 입력하면 식탐정의 위생 평가를 보여드릴게요.</Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="식당 이름을 입력하세요"
          placeholderTextColor={color.text.tertiary}
          style={styles.searchInput}
          autoFocus
          returnKeyType="search"
        />

        <View style={styles.searchResults}>
          {hits.map((r) => (
            <Pressable
              key={r.i}
              onPress={() => onPick(r)}
              style={({ pressed }) => [styles.searchItem, pressed && { backgroundColor: color.fill.tertiary }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.searchName} numberOfLines={1}>{r.n}</Text>
                <Text style={styles.searchMeta}>{r.c} · {r.g}</Text>
              </View>
              <Text style={styles.searchScore}>{r.s}점</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <SkipButton label="건너뛰기" onPress={onSkip} />
    </>
  );
}

// ===== Step 6: 결과 맛보기 =====
function StepResult({ picked, onNext }: { picked: RecomputedRow | null; onNext: () => void }) {
  return (
    <>
      <View style={{ flex: 1 }}>
        <Text style={styles.resultLabel}>식탐정의 평가</Text>

        {picked ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultName} numberOfLines={2}>{picked.n}</Text>
            <Text style={styles.resultMeta}>{picked.c} · {picked.g}</Text>
            <Text style={styles.resultScore}>{picked.s}점</Text>
            <Text style={styles.resultGrade}>{gradeLabel(picked.gr)}</Text>
          </View>
        ) : (
          <View style={styles.resultCard}>
            <Text style={styles.resultName}>아직 찾아본 식당이 없어요</Text>
            <Text style={styles.resultMeta}>괜찮아요, 들어가서 자유롭게 둘러보세요.</Text>
          </View>
        )}

        <View style={styles.savePrompt}>
          <Text style={styles.savePromptTitle}>결과 저장하고{'\n'}골든 치즈 식당 받아보세요</Text>
          <Text style={styles.savePromptBody}>
            로그인하면 좋아요·검색 기록을 다른 기기에서도 볼 수 있어요.
          </Text>
        </View>
      </View>
      <PrimaryNext label="시작하기" onPress={onNext} />
    </>
  );
}

// ===== Step 7: Soft 가입 =====
function StepSignup({ onSkip }: { onSkip: () => void }) {
  return (
    <>
      <View style={styles.center}>
        <Image source={Mascots.thanks} style={styles.mascot} resizeMode="contain" />
        <Text style={styles.brand}>준비 완료!</Text>
        <Text style={styles.subBody}>이제 식탐정과 함께 안전한 식사를 시작해보세요.</Text>
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

function SkipButton({ label = '건너뛰기', onPress }: { label?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}>
      <Text style={styles.skipText}>{label}</Text>
    </Pressable>
  );
}

function gradeLabel(g: string): string {
  if (g === 'GOLDEN') return '🧀🧀🧀 골든 치즈';
  if (g === 'SILVER') return '🧀🧀 실버 치즈';
  if (g === 'BRONZE') return '🧀 브론즈 치즈';
  return '데이터 수집중';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.canvas, paddingHorizontal: spacing.xl },

  // 진행 바
  progressRow: { flexDirection: 'row', gap: 4, marginBottom: spacing.l },
  progressSeg: { flex: 1, height: 3, borderRadius: 2 },
  progressSegActive: { backgroundColor: color.brand.primary },
  progressSegIdle: { backgroundColor: color.border.default },

  body: { flex: 1, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // 공통 텍스트
  mascot: { width: mascotSize.hero, height: mascotSize.hero, marginBottom: spacing.l },
  brand: { fontSize: 28, fontWeight: '800', color: color.text.primary, marginBottom: spacing.xs },
  splashTagline: { ...typography.body, color: color.text.secondary },
  questionEmoji: { fontSize: 56, marginBottom: spacing.l },
  bigQuote: { fontSize: 22, fontWeight: '700', color: color.text.primary, textAlign: 'center', lineHeight: 32, marginBottom: spacing.m },
  bigQuote2: { fontSize: 20, fontWeight: '700', color: color.text.primary, marginBottom: spacing.s },
  subBody: { ...typography.body, color: color.text.secondary, textAlign: 'center', lineHeight: 22 },
  errorText: { ...typography.caption, color: color.status.danger, textAlign: 'center', marginTop: spacing.m },

  // Step 4 위험지수
  locationTag: { ...typography.captionEmphasized, color: color.text.secondary, marginBottom: spacing.s },
  riskBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s,
    backgroundColor: 'rgba(245,158,11,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.m, paddingVertical: spacing.s,
    borderRadius: radius.pill, marginBottom: spacing.m,
  },
  riskEmoji: { fontSize: 20 },
  riskLevel: { fontSize: 18, fontWeight: '700', color: '#F59E0B' },
  riskGuidance: { fontSize: 22, fontWeight: '700', color: color.text.primary, marginBottom: spacing.xs },
  riskDetail: { ...typography.subheadline, color: color.text.secondary, marginBottom: spacing.xxl, lineHeight: 22 },

  sectionLabel: { ...typography.subheadlineEmphasized, color: color.text.primary, marginBottom: spacing.m },
  goldList: { gap: spacing.s },
  goldItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.m,
    paddingVertical: spacing.s + 2, paddingHorizontal: spacing.m,
    backgroundColor: color.surface.subtle, borderRadius: radius.l,
  },
  goldEmoji: { fontSize: 22 },
  goldName: { ...typography.bodyEmphasized, color: color.text.primary, marginBottom: 2 },
  goldMeta: { ...typography.caption, color: color.text.secondary },
  goldScore: { ...typography.bodyEmphasized, color: color.cheese.GOLDEN.fg },

  // Step 5 검색
  searchInput: {
    height: 52,
    borderRadius: radius.l,
    borderWidth: 0,
    backgroundColor: color.surface.subtle,
    paddingHorizontal: spacing.m,
    fontSize: 16,
    color: color.text.primary,
    marginTop: spacing.l,
    marginBottom: spacing.m,
  },
  searchResults: { gap: 2 },
  searchItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.m,
    paddingVertical: spacing.s + 2, paddingHorizontal: spacing.m,
    backgroundColor: color.surface.subtle, borderRadius: radius.m,
  },
  searchName: { ...typography.bodyEmphasized, color: color.text.primary, marginBottom: 2 },
  searchMeta: { ...typography.caption, color: color.text.secondary },
  searchScore: { ...typography.bodyEmphasized, color: color.brand.primary },

  // Step 6 결과
  resultLabel: { ...typography.captionEmphasized, color: color.text.secondary, marginTop: spacing.l, marginBottom: spacing.m },
  resultCard: {
    backgroundColor: color.surface.tintBlue,
    padding: spacing.xl,
    borderRadius: radius.xxl,
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  resultName: { fontSize: 20, fontWeight: '700', color: color.text.primary, textAlign: 'center', marginBottom: spacing.xxs },
  resultMeta: { ...typography.subheadline, color: color.text.secondary, marginBottom: spacing.m },
  resultScore: { fontSize: 36, fontWeight: '800', color: color.brand.primary, marginBottom: spacing.xs },
  resultGrade: { ...typography.subheadlineEmphasized, color: color.text.primary },

  savePrompt: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    padding: spacing.l,
    borderRadius: radius.l,
  },
  savePromptTitle: { fontSize: 18, fontWeight: '700', color: color.text.primary, marginBottom: spacing.s, lineHeight: 26 },
  savePromptBody: { ...typography.subheadline, color: color.text.secondary, lineHeight: 22 },

  // Step 7 가입
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
  skipBtn: { paddingVertical: spacing.m, alignItems: 'center', marginTop: spacing.s },
  skipText: { ...typography.subheadline, color: color.text.tertiary, textDecorationLine: 'underline' },
});
