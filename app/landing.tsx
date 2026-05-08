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

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
const TOTAL_STEPS = 8;

// 데모용 — 실제 환경 지수는 추후 기상·식약처·대기 데이터 연동
const MOCK_ENV = {
  risk: { level: '주의', emoji: '🟡', tone: '#F59E0B' as const },
  guidance: '차가운 음식 주의하세요',
  detail: '여름철 해수 온도 상승으로 회·생굴의 비브리오 위험이 평소보다 높아요.',
  weather: { temp: 28, humidity: 65, label: '구름 조금', emoji: '⛅' },
  airQuality: { label: '보통', value: 'PM10 45', emoji: '🌫️' },
  foodPoison: { label: '주의', desc: '비브리오 ↑ · 살모넬라 ↑', emoji: '🦠' },
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
  const back = () => setStep((s) => Math.max(1, (s - 1)) as Step);
  const goSkip = () => {
    markLandingSkipped();
    router.replace('/(tabs)' as any);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.l, paddingBottom: insets.bottom + spacing.l }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 상단: 뒤로 가기 (Splash 제외) + 진행 바 */}
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
        {step >= 2 && step <= 7 ? (
          <ProgressBar step={step} total={TOTAL_STEPS} />
        ) : <View style={{ flex: 1 }} />}
        <View style={styles.backBtn} />
      </View>

      <View style={styles.body}>
        {step === 1 && <StepSplash />}
        {step === 2 && <StepProblem onNext={next} onSkip={goSkip} />}
        {step === 3 && <StepLocation onNext={(gu) => { if (gu) setLocationGu(gu); next(); }} />}
        {step === 4 && <StepEnvironment gu={locationGu} rows={allRows} onNext={next} />}
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
        {step === 7 && <StepHygieneReview onNext={next} onSkip={next} />}
        {step === 8 && <StepSignup onSkip={goSkip} />}
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
  const cached = getCachedLocation();
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = async () => {
    setRequesting(true);
    setError(null);
    // 캐시 있으면 즉시 사용. 없을 때만 권한 요청.
    if (cached) {
      setRequesting(false);
      onNext(cached.gu);
      return;
    }
    const loc = await requestUserLocation();
    setRequesting(false);
    if (loc) {
      onNext(loc.gu);
    } else {
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
        label={requesting ? '위치 확인 중...' : cached ? '이전 위치로 계속' : '현재 위치 사용'}
        onPress={requestLocation}
        disabled={requesting}
      />
      <SkipButton onPress={() => onNext()} />
    </>
  );
}

// ===== Step 4: 환경 지수 (위치 기반) =====
function StepEnvironment({ gu, rows, onNext }: { gu: string; rows: RecomputedRow[]; onNext: () => void }) {
  const goldensInGu = rows.filter((r) => r.gr === 'GOLDEN' && r.g === gu).slice(0, 3);
  const goldensFallback = rows.filter((r) => r.gr === 'GOLDEN').slice(0, 3);
  const list = goldensInGu.length > 0 ? goldensInGu : goldensFallback;

  return (
    <>
      <View style={{ flex: 1, paddingTop: spacing.s }}>
        <Text style={styles.locationTag}>{gu} 오늘의 환경 지수</Text>

        {/* 종합 위험 카드 */}
        <View style={[styles.envHero, { backgroundColor: color.surface.tintBlue }]}>
          <View style={styles.envHeroTop}>
            <Text style={styles.envHeroEmoji}>{MOCK_ENV.risk.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.envHeroLevel, { color: MOCK_ENV.risk.tone }]}>{MOCK_ENV.risk.level}</Text>
              <Text style={styles.envHeroGuidance}>{MOCK_ENV.guidance}</Text>
            </View>
          </View>
          <Text style={styles.envHeroDetail}>{MOCK_ENV.detail}</Text>
        </View>

        {/* 환경 지표 그리드 (날씨 / 식중독 / 대기) */}
        <View style={styles.envGrid}>
          <EnvCard
            emoji={MOCK_ENV.weather.emoji}
            title={`${MOCK_ENV.weather.temp}°C · 습도 ${MOCK_ENV.weather.humidity}%`}
            sub={MOCK_ENV.weather.label}
          />
          <EnvCard
            emoji={MOCK_ENV.foodPoison.emoji}
            title={MOCK_ENV.foodPoison.label}
            sub={MOCK_ENV.foodPoison.desc}
          />
          <EnvCard
            emoji={MOCK_ENV.airQuality.emoji}
            title={MOCK_ENV.airQuality.label}
            sub={MOCK_ENV.airQuality.value}
          />
        </View>

        {/* 골든 치즈 식당 */}
        <Text style={styles.sectionLabel}>{gu} 골든 치즈 식당 추천</Text>
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

function EnvCard({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <View style={styles.envCard}>
      <Text style={styles.envCardEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.envCardTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.envCardSub} numberOfLines={1}>{sub}</Text>
      </View>
    </View>
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

// ===== Step 7: 위생 리뷰 활성화 =====
function StepHygieneReview({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <>
      <View style={{ flex: 1 }}>
        <Text style={styles.locationTag}>당신의 한 줄 리뷰가</Text>
        <Text style={styles.bigQuote2}>다른 사용자의 안전을 지켜요</Text>
        <Text style={styles.subBodyLeft}>
          "주방이 깨끗했어요" "재료가 신선했어요" 같은 짧은 위생 리뷰가
          모이면, 식약처 데이터로는 안 보이는 실제 매장 위생 상태가 드러나요.
        </Text>

        <View style={styles.reviewImpactCard}>
          <View style={styles.impactRow}>
            <Text style={styles.impactNumber}>+5</Text>
            <Text style={styles.impactLabel}>리뷰 1개 작성 시{'\n'}식당 위생 점수에 반영</Text>
          </View>
          <View style={styles.impactDivider} />
          <View style={styles.impactRow}>
            <Text style={styles.impactNumber}>12</Text>
            <Text style={styles.impactLabel}>평균적으로 한 리뷰가{'\n'}12명의 선택을 도와요</Text>
          </View>
        </View>

        <View style={styles.reviewExamples}>
          <ReviewChip text="✓ 주방이 깨끗했어요" />
          <ReviewChip text="✓ 재료가 신선했어요" />
          <ReviewChip text="✓ 식기가 위생적이었어요" />
          <ReviewChip text="⚠ 식기에 음식 자국" />
          <ReviewChip text="⚠ 화장실 청결 부족" />
        </View>
      </View>
      <PrimaryNext label="위생 리뷰 활성화" onPress={onNext} />
      <SkipButton label="나중에 할게요" onPress={onSkip} />
    </>
  );
}

function ReviewChip({ text }: { text: string }) {
  return (
    <View style={styles.reviewChip}>
      <Text style={styles.reviewChipText}>{text}</Text>
    </View>
  );
}

// ===== Step 8: Soft 가입 =====
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

  // 상단 바: 뒤로 + 진행
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginBottom: spacing.l },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 28, color: color.text.primary, lineHeight: 28, marginTop: -2 },

  progressRow: { flex: 1, flexDirection: 'row', gap: 4 },
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
  subBodyLeft: { ...typography.body, color: color.text.secondary, lineHeight: 22, marginBottom: spacing.l },
  errorText: { ...typography.caption, color: color.status.danger, textAlign: 'center', marginTop: spacing.m },

  // Step 4 환경 지수
  locationTag: { ...typography.captionEmphasized, color: color.text.secondary, marginBottom: spacing.s },

  // 종합 환경 hero 카드
  envHero: {
    borderRadius: radius.xxl,
    padding: spacing.l,
    marginBottom: spacing.m,
  },
  envHeroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, marginBottom: spacing.s },
  envHeroEmoji: { fontSize: 36 },
  envHeroLevel: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  envHeroGuidance: { fontSize: 16, fontWeight: '700', color: color.text.primary },
  envHeroDetail: { ...typography.subheadline, color: color.text.secondary, lineHeight: 21 },

  // 환경 지표 그리드
  envGrid: { gap: spacing.s, marginBottom: spacing.l },
  envCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: color.surface.subtle,
    borderRadius: radius.l,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s + 2,
  },
  envCardEmoji: { fontSize: 24 },
  envCardTitle: { ...typography.bodyEmphasized, color: color.text.primary, marginBottom: 2 },
  envCardSub: { ...typography.caption, color: color.text.secondary },

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

  // Step 7 위생 리뷰
  reviewImpactCard: {
    flexDirection: 'row',
    backgroundColor: color.surface.tintGreen,
    borderRadius: radius.xl,
    padding: spacing.l,
    marginBottom: spacing.l,
    alignItems: 'center',
  },
  impactRow: { flex: 1, alignItems: 'center' },
  impactNumber: { fontSize: 32, fontWeight: '800', color: color.brand.primary, marginBottom: spacing.xs },
  impactLabel: { ...typography.caption, color: color.text.secondary, textAlign: 'center', lineHeight: 18 },
  impactDivider: { width: 1, height: 48, backgroundColor: color.border.default },

  reviewExamples: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  reviewChip: {
    paddingHorizontal: spacing.s + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: color.surface.subtle,
  },
  reviewChipText: { ...typography.caption, color: color.text.primary },

  // Step 8 가입
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
