import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Cheese, Logos, Mascots } from '@/constants/Assets';
import { buildRiskMessage, riskLevels } from '@/constants/Colors';
import { color, radius, spacing, typography, type RiskLevel } from '@/constants/tokens';
import {
  Card,
  Chip,
  IconButton,
  SearchBar,
  SectionHeader,
} from '@/components/ui';
import { ensureRecomputedIndex } from '@/utils/dataStore';
import { fetchEnvData, type EnvData } from '@/utils/api/env';
import { getCachedLocation, requestUserLocation } from '@/utils/location';
import type { GuKey } from '@/constants/Restaurant';
import {
  calculateRiskLevel,
  humidityLabel,
  humidityTone,
  pm10Label,
  pm10Tone,
  tempLabel,
  tempTone,
  type Tone,
} from '@/utils/riskCalculator';

// "2026-05-091700" → "17시" — RiskCard 갱신 시각 표시용
function formatRegDatetime(s: string): string {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})(\d{2})(\d{2})/);
  if (!m) return s;
  return `${m[4]}시`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  // 위치 — 초기 paint는 캐시값으로 빠르게, 마운트마다 fresh 요청 + Kakao 역지오코딩.
  // locationLabel: UI 표시용 ("서울시 마포구" / "세종시 한솔동" 등 지역 무관)
  // seoulGu: env API·동네 추천 식당용. 서울 밖이면 null → 해당 섹션 스킵.
  // 캐시가 있으면 그대로(seoulGu null 인 비서울 사용자는 null 유지),
  // 없으면 강남구 fallback. ??로 합치면 null이 강남구로 떨어지므로 명시적 분기.
  const [locationLabel, setLocationLabel] = useState<string>(() => {
    const c = getCachedLocation();
    return c?.displayLabel ?? '서울시 강남구';
  });
  const [seoulGu, setSeoulGu] = useState<GuKey | null>(() => {
    const c = getCachedLocation();
    return c ? c.seoulGu : '강남구';
  });

  useEffect(() => {
    let cancelled = false;
    requestUserLocation().then((loc) => {
      if (cancelled || !loc) return;
      setLocationLabel((prev) => (prev === loc.displayLabel ? prev : loc.displayLabel));
      setSeoulGu((prev) => (prev === loc.seoulGu ? prev : loc.seoulGu));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [env, setEnv] = useState<EnvData | null>(null);
  const riskLevel: RiskLevel = env ? calculateRiskLevel(env) : 2;
  const risk = riskLevels[riskLevel];
  const riskMessage = env
    ? buildRiskMessage(riskLevel, locationLabel, {
        temp: env.weather.temperature,
        humidity: env.weather.humidity,
      })
    : risk.message;

  const [goldenCheese, setGoldenCheese] = useState<
    { id: string; name: string; score: number; district: string }[]
  >([]);
  const [districtPicks, setDistrictPicks] = useState<
    { id: string; name: string; score: number; category: string; grade: 'GOLDEN' | 'SILVER' | 'BRONZE' }[]
  >([]);

  useEffect(() => {
    // env API(poisonmap)는 서울 25개 자치구 키만 지원. 비서울이면 호출 안 함.
    if (!seoulGu) {
      setEnv(null);
      return;
    }
    let cancelled = false;
    fetchEnvData(seoulGu).then((data) => {
      if (cancelled) return;
      setEnv(data);
    });
    return () => {
      cancelled = true;
    };
  }, [seoulGu]);

  useEffect(() => {
    let cancelled = false;
    ensureRecomputedIndex().then((rows) => {
      if (cancelled) return;

      // GOLDEN은 사장님·사용자 활동 후에야 가능 (데이터 만점 50/100). MVP에서는 비어있음.
      // 대신 "데이터 점수 우수" 식당 (45+) 을 노출 — 위생등급 보유한 식당.
      const golden = rows
        .filter((r) => r.s >= 45)
        .sort((a, b) => b.s - a.s)
        .slice(0, 6)
        .map((r) => ({ id: r.i, name: r.n, score: r.s, district: r.g }));
      setGoldenCheese(golden);

      // 동네 추천도 서울 자치구 한정. 비서울이면 빈 배열.
      const picks = seoulGu
        ? rows
            .filter((r) => r.g === seoulGu && (r.gr === 'GOLDEN' || r.gr === 'SILVER' || r.gr === 'BRONZE'))
            .sort((a, b) => b.s - a.s)
            .slice(0, 3)
            .map((r) => ({
              id: r.i,
              name: r.n,
              score: r.s,
              category: r.c,
              grade: r.gr as 'GOLDEN' | 'SILVER' | 'BRONZE',
            }))
        : [];
      setDistrictPicks(picks);
    });
    return () => {
      cancelled = true;
    };
  }, [seoulGu]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: spacing.s + insets.top }]}
        showsVerticalScrollIndicator={false}>

        <Header />

        <SearchBar
          variant="button"
          placeholder="식당명·메뉴·자치구"
          onPress={() => router.push('/search')}
          accessibilityLabel="식당 검색"
          style={{ marginBottom: spacing.l }}
        />

        {/* Risk hero card */}
        <RiskCard
          district={locationLabel}
          riskLevel={riskLevel}
          score={env ? Math.round(env.foodPoison.today) : null}
          accent={risk.color}
          bgColor={risk.bgColor}
          labelKr={risk.labelKr}
          mascotKey={risk.mascot}
          message={riskMessage}
          updatedAt={env ? formatRegDatetime(env.foodPoison.regDatetime) : '갱신 중'}
        />

        {/* 환경 카드 — 기온·습도·대기질 3개 균등 배치. 비서울이면 미지원 표시 */}
        <EnvCardsRow env={env} seoulSupported={!!seoulGu} />

        {/* 1. Today's menu guide — 위험 단계 기반 추천 (액션 가이드) */}
        <SectionHeader title="오늘 추천 메뉴" subtitle="위험 단계 기반" marginTop="xxl" />
        <TodayMenuCard riskLevel={riskLevel} district={locationLabel} />

        {/* 2. 내 동네 추천 — 사용자 자치구 안 인기 식당 (서울 한정) */}
        {seoulGu && districtPicks.length > 0 ? (
          <>
            <SectionHeader
              title={`${seoulGu} 인기 식당`}
              subtitle="내 동네에서 평가 높은 식당"
              trailing={{ label: '전체보기', icon: 'forward' }}
              marginTop="xxl"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardScroll}>
              {districtPicks.map((r) => (
                <RestaurantCard
                  key={r.id}
                  name={r.name}
                  meta={r.category}
                  grade={r.grade}
                  onPress={() => router.push(`/restaurant/${r.id}` as any)}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* 3. 데이터 점수 우수 — 위생등급+모범 등 강한 시그널 보유 (사장님·사용자 활동 전이라도) */}
        <SectionHeader
          title="데이터 검증 우수 식당"
          subtitle="식약처 위생등급·모범음식점 등 인증 보유"
          trailing={{ label: '더보기', icon: 'forward' }}
          marginTop="xxl"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardScroll}>
          {goldenCheese.map((r) => (
            <RestaurantCard
              key={r.id}
              name={r.name}
              meta={r.district}
              grade="GOLDEN"
              onPress={() => router.push(`/restaurant/${r.id}` as any)}
            />
          ))}
        </ScrollView>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </View>
  );
}

// ===== Header =====

function Header() {
  return (
    <View style={styles.header}>
      <View style={styles.logoRow}>
        <Image source={Logos.symbol} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.logo}>식탐정</Text>
      </View>
      <View style={{ position: 'relative' }}>
        <IconButton
          icon="bell"
          size="md"
          tone="fill"
          accessibilityLabel="알림"
          onPress={() => {}}
        />
        <View style={styles.notiDot} />
      </View>
    </View>
  );
}

// ===== Risk Card (Toss-style hero) =====

function RiskCard(props: {
  district: string;
  riskLevel: RiskLevel;
  score: number | null;
  accent: string;
  bgColor: string;
  labelKr: string;
  mascotKey: keyof typeof Mascots;
  message: string;
  updatedAt: string;
}) {
  const { district, riskLevel, score, accent, bgColor, labelKr, mascotKey, message, updatedAt } = props;

  return (
    <Card variant="tinted" bgColor={bgColor} padding="l" radius="xxl" style={{ borderRadius: radius.xxl }}>
      <View style={styles.locationRow}>
        <Icon name="location" size={13} color={color.text.secondary} />
        <Text style={styles.locationText}>{district} · {updatedAt} 기준</Text>
      </View>
      <Text style={styles.cardHeading}>오늘의 식중독 위험</Text>

      <View style={styles.stageRow}>
        <View style={styles.stageCol}>
          {/* 위험 단계 시각 바 — 식약처 4단계 */}
          <View style={styles.levelDots}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.levelDot,
                  { backgroundColor: i <= riskLevel ? accent : 'rgba(0,0,0,0.08)' },
                ]}
              />
            ))}
          </View>
          <View style={styles.bigStageLabelRow}>
            <Text style={[styles.bigStageLabel, { color: accent }]}>{labelKr}</Text>
            {score !== null ? (
              <Text style={[styles.bigStageScore, { color: accent }]}>{score}점</Text>
            ) : null}
          </View>
          <Text style={[styles.bigStageSub, { color: accent }]}>{riskLevel}단계 / 4단계</Text>
        </View>
        <Image source={Mascots[mascotKey]} style={styles.bigMascot} resizeMode="contain" />
      </View>

      {/* 한줄 가이드 */}
      <View style={styles.guidanceRow}>
        <Icon name="bulb" size={16} color={accent} />
        <Text style={[styles.guidanceText, { color: color.text.primary }]}>{message}</Text>
      </View>
    </Card>
  );
}

// ===== 환경 카드 row — 기온·습도·대기질 3개 균등 배치 =====
// 식중독은 위 RiskCard에 이미 점수로 표시되어 제외. 자외선은 데이터 소스 없어 제외.

type EnvCardItem = { icon: string; value: string; label: string; sub: string; tone: Tone };

function buildEnvCardItems(env: EnvData | null, seoulSupported: boolean): EnvCardItem[] {
  if (!env) {
    // 비서울이면 영구히 "불러오는 중"으로 보이지 않도록 미지원 라벨로 대체.
    const placeholder = seoulSupported
      ? { value: '—', sub: '불러오는 중', tone: 'success' as Tone }
      : { value: '—', sub: '서울만 지원', tone: 'warning' as Tone };
    return [
      { icon: '🌡️', label: '기온', ...placeholder },
      { icon: '💧', label: '습도', ...placeholder },
      { icon: '🌫️', label: '대기질', ...placeholder },
    ];
  }
  const { weather } = env;
  return [
    { icon: '🌡️', value: `${weather.temperature.toFixed(1)}°C`, label: '기온',
      sub: tempLabel(weather.temperature), tone: tempTone(weather.temperature) },
    { icon: '💧', value: `${weather.humidity}%`, label: '습도',
      sub: humidityLabel(weather.humidity), tone: humidityTone(weather.humidity) },
    { icon: '🌫️', value: pm10Label(weather.pm10), label: '대기질',
      sub: `PM10 ${weather.pm10}`, tone: pm10Tone(weather.pm10) },
  ];
}

function EnvCardsRow({ env, seoulSupported }: { env: EnvData | null; seoulSupported: boolean }) {
  const items = buildEnvCardItems(env, seoulSupported);
  return (
    <View style={styles.envRow}>
      {items.map((it) => (
        <View key={it.label} style={[styles.envCard, { backgroundColor: TONE_BG[it.tone] }]}>
          <Text style={styles.envEmoji}>{it.icon}</Text>
          <Text style={[styles.envValue, { color: TONE_FG[it.tone] }]}>{it.value}</Text>
          <Text style={styles.envLabel}>{it.label}</Text>
          <Text style={styles.envSub}>{it.sub}</Text>
        </View>
      ))}
    </View>
  );
}

const TONE_BG: Record<'success' | 'warning' | 'danger', string> = {
  success: 'rgba(34,197,94,0.10)',
  warning: 'rgba(245,158,11,0.10)',
  danger:  'rgba(239,68,68,0.10)',
};
const TONE_FG: Record<'success' | 'warning' | 'danger', string> = {
  success: '#22C55E',
  warning: '#F59E0B',
  danger:  '#EF4444',
};

// ===== Restaurant Card (shared across home sections) =====

function RestaurantCard({
  name,
  meta,
  grade,
  onPress,
}: {
  name: string;
  meta: string;
  grade: 'GOLDEN' | 'SILVER' | 'BRONZE';
  onPress: () => void;
}) {
  const cheeseSrc = grade === 'GOLDEN' ? Cheese.gold : grade === 'SILVER' ? Cheese.silver : Cheese.bronze;
  const cheeseFg = color.cheese[grade].fg;
  const gradeLabel = grade === 'GOLDEN' ? '골든 치즈' : grade === 'SILVER' ? '실버 치즈' : '브론즈 치즈';
  return (
    <Card
      variant="elevated"
      padding="m"
      radius="l"
      pressable
      onPress={onPress}
      accessibilityLabel={`${name} 상세 보기`}
      style={styles.restaurantCard}>
      <View style={styles.cardCheeseRow}>
        <Image source={cheeseSrc} style={styles.cardCheese} resizeMode="contain" />
      </View>
      <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
      <View style={styles.cardMetaRow}>
        <Text style={[styles.cardScore, { color: cheeseFg }]}>{gradeLabel}</Text>
        <Text style={styles.cardMetaSep}>·</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{meta}</Text>
      </View>
    </Card>
  );
}

// ===== Today Menu Guide Card =====

const MENU_BY_LEVEL: Record<RiskLevel, { recommend: string[]; avoid: string[]; tip: string }> = {
  1: { recommend: ['회', '비빔국수', '냉채', '구이'], avoid: [], tip: '오늘은 마음 편히 골라봐요.' },
  2: { recommend: ['칼국수', '국밥', '전골', '찜'], avoid: ['회', '육회'], tip: '따끈한 가열 메뉴를 추천해요.' },
  3: { recommend: ['국밥', '전골', '찜', '구이'], avoid: ['사시미', '육회', '생굴'], tip: '충분히 가열한 메뉴가 안전해요.' },
  4: { recommend: ['집밥', '전골'], avoid: ['회', '육회', '생굴', '뷔페'], tip: '오늘은 직접 조리하면 가장 안전해요.' },
};

function TodayMenuCard({ riskLevel, district }: { riskLevel: RiskLevel; district: string }) {
  const guide = MENU_BY_LEVEL[riskLevel];
  return (
    <Card variant="elevated" padding="l" radius="l">
      <View style={styles.menuHeader}>
        <View style={styles.aiBadge}>
          <Icon name="sparkles" size={11} color={color.text.onBrand} />
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
        <Text style={styles.menuTitle}>{district}에 어울리는 메뉴</Text>
      </View>
      <Text style={styles.menuTip}>{guide.tip}</Text>

      <View style={styles.menuBlock}>
        <Text style={styles.menuBlockLabel}>추천 메뉴</Text>
        <View style={styles.chipsRow}>
          {guide.recommend.map((m) => (
            <Chip key={m} variant="info" size="sm" tone="success">{m}</Chip>
          ))}
        </View>
      </View>

      {guide.avoid.length > 0 ? (
        <View style={styles.menuBlock}>
          <Text style={styles.menuBlockLabel}>오늘은 다음 기회에</Text>
          <View style={styles.chipsRow}>
            {guide.avoid.map((m) => (
              <Chip key={m} variant="info" size="sm" tone="danger">{m}</Chip>
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

// ===== Styles =====

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.canvas },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.l, paddingTop: spacing.s, paddingBottom: spacing.xxl },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
    marginBottom: spacing.m,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  logoImage: { width: 28, height: 28 },
  logo: { ...typography.headline, color: color.text.primary, letterSpacing: -0.3 },
  notiDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: radius.pill,
    backgroundColor: color.status.danger,
    borderWidth: 1.5, borderColor: color.surface.subtle,
  },

  // Risk card wrapper
  cardWrapper: { position: 'relative' },
  cardHeading: { ...typography.headline, color: color.text.primary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxs },
  locationText: { ...typography.subheadline, color: color.text.secondary },

  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginTop: spacing.s,
  },
  stageCol: { flex: 1, justifyContent: 'center', gap: spacing.xs },
  bigMascot: { width: 110, height: 110 },
  bigStageLabelRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.s },
  bigStageLabel: { fontSize: 28, fontWeight: '800', lineHeight: 32 },
  bigStageScore: { fontSize: 18, fontWeight: '700', lineHeight: 22 },
  bigStageSub: { ...typography.captionEmphasized },
  time: { ...typography.caption, color: color.text.tertiary, marginTop: spacing.s },

  // 위험 단계 dot 시각화
  levelDots: { flexDirection: 'row', gap: 6 },
  levelDot: { width: 18, height: 6, borderRadius: 3 },

  // 한줄 가이드
  guidanceRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s,
    marginTop: spacing.s,
    backgroundColor: color.surface.subtle,
    paddingHorizontal: spacing.m, paddingVertical: spacing.s,
    borderRadius: radius.m,
  },
  guidanceText: { ...typography.captionEmphasized, flex: 1, color: color.text.primary },

  // 환경 카드 row — 3개 균등 배치
  envRow: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.m },
  envCard: {
    flex: 1,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.s,
    borderRadius: radius.l,
    alignItems: 'center',
    gap: 2,
  },
  envEmoji: { fontSize: 24, marginBottom: spacing.xxs },
  envValue: { fontSize: 16, fontWeight: '700' },
  envLabel: { ...typography.caption, color: color.text.primary, fontWeight: '600' },
  envSub: { ...typography.footnote, color: color.text.secondary },

  bubble: {
    backgroundColor: color.surface.subtle,
    borderWidth: 1,
    borderRadius: radius.l,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    marginTop: spacing.m,
  },
  bubbleText: { ...typography.captionEmphasized, color: color.text.primary },

  metricsRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.m,
  },

  // Restaurant card (shared, horizontal scroll)
  cardScroll: { gap: spacing.m, paddingRight: spacing.xs, paddingVertical: spacing.xs },
  restaurantCard: { width: 160 },
  cardCheeseRow: { alignItems: 'center', justifyContent: 'center', marginBottom: spacing.m },
  cardCheese: { width: 64, height: 64 },
  cardName: { ...typography.subheadlineEmphasized, color: color.text.primary, marginBottom: spacing.xs },
  cardMetaRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  cardScore: { ...typography.captionEmphasized },
  cardMetaSep: { ...typography.caption, color: color.text.tertiary },
  cardMeta: { ...typography.caption, color: color.text.secondary, flex: 1 },

  // Today menu
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginBottom: spacing.s },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: color.brand.primary,
    paddingHorizontal: spacing.s,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  aiBadgeText: { ...typography.footnote, fontWeight: '800', color: color.text.onBrand, letterSpacing: 0.5 },
  menuTitle: { ...typography.bodyEmphasized, color: color.text.primary },
  menuTip: { ...typography.caption, color: color.text.secondary, marginBottom: spacing.m },
  menuBlock: { marginTop: spacing.s },
  menuBlockLabel: { ...typography.captionEmphasized, color: color.text.primary, marginBottom: spacing.s },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
});

