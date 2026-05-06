import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Cheese, Logos, Mascots } from '@/constants/Assets';
import { riskLevels } from '@/constants/Colors';
import { color, elevation, radius, spacing, typography, type RiskLevel } from '@/constants/tokens';
import {
  Card,
  Chip,
  IconButton,
  MetricCard,
  SearchBar,
  SectionHeader,
} from '@/components/ui';
import { ensureRecomputedIndex } from '@/utils/dataStore';

const DISTRICT = '강남구';
const RISK_LEVEL: RiskLevel = 3;
const ENV = { temp: 28.6, humidity: 65, foodPoisoning: '주의' };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const risk = riskLevels[RISK_LEVEL];

  const [goldenCheese, setGoldenCheese] = useState<
    { id: string; name: string; score: number; district: string }[]
  >([]);
  const [districtPicks, setDistrictPicks] = useState<
    { id: string; name: string; score: number; category: string; grade: 'GOLDEN' | 'SILVER' | 'BRONZE' }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    ensureRecomputedIndex().then((rows) => {
      if (cancelled) return;

      const golden = rows
        .filter((r) => r.gr === 'GOLDEN')
        .sort((a, b) => b.s - a.s)
        .slice(0, 6)
        .map((r) => ({ id: r.i, name: r.n, score: r.s, district: r.g }));
      setGoldenCheese(golden);

      const picks = rows
        .filter((r) => r.g === DISTRICT && (r.gr === 'GOLDEN' || r.gr === 'SILVER' || r.gr === 'BRONZE'))
        .sort((a, b) => b.s - a.s)
        .slice(0, 3)
        .map((r) => ({
          id: r.i,
          name: r.n,
          score: r.s,
          category: r.c,
          grade: r.gr as 'GOLDEN' | 'SILVER' | 'BRONZE',
        }));
      setDistrictPicks(picks);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

        {/* Risk card */}
        <RiskCard
          district={DISTRICT}
          riskLevel={RISK_LEVEL}
          accent={risk.color}
          bgColor={risk.bgColor}
          labelKr={risk.labelKr}
          mascotKey={risk.mascot}
          env={ENV}
        />

        {/* 1. Today's menu guide — 위험 단계 기반 추천 (액션 가이드) */}
        <SectionHeader title="오늘 추천 메뉴" subtitle="위험 단계 기반" marginTop="xxl" />
        <TodayMenuCard riskLevel={RISK_LEVEL} district={DISTRICT} />

        {/* 2. 내 동네 추천 — 사용자 자치구 안 인기 식당 */}
        {districtPicks.length > 0 ? (
          <>
            <SectionHeader
              title={`${DISTRICT} 인기 식당`}
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
                  score={r.score}
                  meta={r.category}
                  grade={r.grade}
                  onPress={() => router.push(`/restaurant/${r.id}` as any)}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* 3. 골든 치즈 — 식탐정 90점+ 인증 식당 (전국 베스트) */}
        <SectionHeader
          title="골든 치즈 식당"
          subtitle="식탐정이 90점 이상으로 인증한 식당"
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
              score={r.score}
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

// ===== Risk Card =====

function RiskCard(props: {
  district: string;
  riskLevel: RiskLevel;
  accent: string;
  bgColor: string;
  labelKr: string;
  mascotKey: keyof typeof Mascots;
  env: { temp: number; humidity: number; foodPoisoning: string };
}) {
  const { district, riskLevel, accent, bgColor, labelKr, mascotKey, env } = props;

  return (
    <View style={styles.cardWrapper}>
      <Card variant="tinted" bgColor={bgColor} padding="xxl" radius="xl" style={(elevation.card as any)}>
        <Text style={styles.cardHeading}>오늘의 식중독 위험 단계</Text>
        <View style={styles.locationRow}>
          <Icon name="location" size={13} color={color.text.secondary} />
          <Text style={styles.locationText}>{district}</Text>
        </View>

        <View style={styles.stageRow}>
          <View style={styles.stageCol}>
            <Text style={[styles.bigStageLabel, { color: accent }]}>{labelKr}</Text>
            <Text style={[styles.bigStageSub, { color: accent }]}>{riskLevel}단계 / 5단계</Text>
            <Text style={styles.time}>12:00 기준</Text>
          </View>
          <Image source={Mascots[mascotKey]} style={styles.bigMascot} resizeMode="contain" />
        </View>
      </Card>

      <View style={styles.metricsRow}>
        <MetricCard icon="thermometer" label="기온" value={`${env.temp}°C`} tone={tempTone(env.temp)} />
        <MetricCard icon="water" label="습도" value={`${env.humidity}%`} tone={humidityTone(env.humidity)} />
        <MetricCard icon="bug" label="식중독 발생" value={env.foodPoisoning} tone={statusTone(env.foodPoisoning)} />
      </View>
    </View>
  );
}

// ===== Restaurant Card (shared across home sections) =====

function RestaurantCard({
  name,
  score,
  meta,
  grade,
  onPress,
}: {
  name: string;
  score: number;
  meta: string;
  grade: 'GOLDEN' | 'SILVER' | 'BRONZE';
  onPress: () => void;
}) {
  const cheeseSrc = grade === 'GOLDEN' ? Cheese.gold : grade === 'SILVER' ? Cheese.silver : Cheese.bronze;
  const cheeseFg = color.cheese[grade].fg;
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
        <Text style={[styles.cardScore, { color: cheeseFg }]}>{score}점</Text>
        <Text style={styles.cardMetaSep}>·</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{meta}</Text>
      </View>
    </Card>
  );
}

// ===== Today Menu Guide Card =====

const MENU_BY_LEVEL: Record<RiskLevel, { recommend: string[]; avoid: string[]; tip: string }> = {
  1: { recommend: ['회', '비빔국수', '냉채', '구이'], avoid: [], tip: '오늘은 마음 편히 골라봐요.' },
  2: { recommend: ['비빔밥', '국수', '구이'], avoid: [], tip: '평소처럼 즐겨도 좋아요.' },
  3: { recommend: ['칼국수', '국밥', '전골', '찜'], avoid: ['회', '육회'], tip: '따끈한 가열 메뉴를 추천해요.' },
  4: { recommend: ['국밥', '전골', '찜', '구이'], avoid: ['사시미', '육회', '생굴'], tip: '충분히 가열한 메뉴가 안전해요.' },
  5: { recommend: ['집밥', '전골'], avoid: ['회', '육회', '생굴', '뷔페'], tip: '오늘은 직접 조리하면 가장 안전해요.' },
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

// ===== Tone helpers =====

type Tone = 'success' | 'warning' | 'danger';
function tempTone(t: number): Tone {
  if (t >= 30) return 'danger';
  if (t >= 25) return 'warning';
  return 'success';
}
function humidityTone(h: number): Tone {
  if (h >= 80) return 'danger';
  if (h >= 60) return 'warning';
  return 'success';
}
function statusTone(s: string): Tone {
  if (s.includes('위험')) return 'danger';
  if (s.includes('주의') || s.includes('경계')) return 'warning';
  return 'success';
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
    gap: spacing.m,
    marginTop: spacing.l,
  },
  stageCol: { flex: 1, minHeight: 160, justifyContent: 'center' },
  bigMascot: { width: 160, height: 160 },
  bigStageLabel: { ...typography.display, marginTop: spacing.s },
  bigStageSub: { ...typography.subheadlineEmphasized, marginTop: spacing.xs },
  time: { ...typography.caption, color: color.text.tertiary, marginTop: spacing.s },

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

