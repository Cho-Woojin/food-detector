import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { StageGauge } from '@/components/StageGauge';
import { Cheese, Logos, Mascots } from '@/constants/Assets';
import { riskLevels } from '@/constants/Colors';
import { color, elevation, radius, spacing, typography, type RiskLevel } from '@/constants/tokens';
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
  humidityTone,
  pm10Label,
  pm10Tone,
  tempTone,
  type Tone,
} from '@/utils/riskCalculator';


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

        <Header district={locationLabel} />

        <SearchBar
          variant="button"
          placeholder="식당명·메뉴·자치구"
          onPress={() => router.push('/search')}
          accessibilityLabel="식당 검색"
          style={{ marginBottom: spacing.l }}
        />

        {/* Risk hero card — 게이지 바늘은 식약처 식중독 지수 점수(0~100) 기반 */}
        <RiskCard
          score={env ? env.foodPoison.today : undefined}
          district={locationLabel}
          regDatetime={env ? env.foodPoison.regDatetime : undefined}
          accent={risk.color}
          bgColor={risk.bgColor}
          labelKr={risk.labelKr}
          mascotKey={risk.mascot}
        />

        {/* 환경 카드 — 3개 고정 (기온/습도/미세먼지) */}
        <EnvCardsRow env={env} />

        {/* AI 메뉴 가이드 — 위험 단계 기반 추천/회피 메뉴 */}
        <SectionHeader title="오늘의 식탐정 메뉴 가이드" subtitle="식중독 위험 단계 기반" marginTop="xxl" />
        <TodayMenuCard riskLevel={riskLevel} district={locationLabel} />

        {/* 2. 내 동네 추천 — 사용자 자치구 안 인기 식당 (서울 한정) */}
        {seoulGu && districtPicks.length > 0 ? (
          <>
            <SectionHeader
              title={`${seoulGu} 식탐정 추천`}
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
          title="식탐정 인증 식당"
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

// ===== Header — 로고 + 식탐정 + 위치 (좌측 묶음) + 알림 (우측) =====

function Header({ district }: { district: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Image source={Logos.symbol} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.logo}>식탐정</Text>
        <View style={styles.headerLocation}>
          <Icon name="location" size={12} color={color.text.secondary} />
          <Text style={styles.headerLocationText} numberOfLines={1}>{district}</Text>
        </View>
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
  score?: number;
  accent: string;
  bgColor: string;
  labelKr: string;
  mascotKey: keyof typeof Mascots;
  district: string;
  regDatetime?: string;   // env.foodPoison.regDatetime (예: "2026-05-091700")
}) {
  const { score, accent, bgColor, labelKr, mascotKey, district, regDatetime } = props;
  const time = formatRegTime(regDatetime);

  return (
    <Card
      variant="tinted"
      bgColor={bgColor}
      padding="l"
      radius="xxl"
      style={{ ...(styles.riskCardSurface as object), overflow: 'hidden' }}>
      {/* 마스코트 — 카드 우측 상단에 꽉 차게 배치 (살짝 카드 밖으로) */}
      <Image
        source={Mascots[mascotKey]}
        style={styles.bigMascot}
        resizeMode="contain"
      />

      {/* 제목 — 2줄 구조: 1줄 메인 heading + 2줄 위치·시각 메타 */}
      <View style={styles.headingBlock}>
        <Text style={styles.cardHeading}>오늘의 식중독 예측 단계</Text>
        <Text style={styles.cardHeadingSub}>{district} · {time}</Text>
      </View>

      {/* 게이지 — 좌측 컴팩트(140px). 바늘은 score 기반 연속 위치, 눈금은 4단계 경계 */}
      <View style={styles.gaugeWrap}>
        <StageGauge score={score} labelKr={labelKr} accent={accent} width={140} />
      </View>

      {/* 데이터 출처 — 카드 하단 작은 글씨. "데이터:" 프리픽스 없이 기관명만 */}
      <Text style={styles.dataSource}>식품의약품안전처 · 기상청 · 국립환경과학원</Text>
    </Card>
  );
}

// "2026-05-091700" → "17:00" — env.foodPoison.regDatetime 표시용
function formatRegTime(s?: string): string {
  if (!s) return '--:--';
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})(\d{2})(\d{2})/);
  if (!m) return '--:--';
  return `${m[4]}:${m[5]}`;
}

// ===== 환경 카드 row — 5개 가로 스크롤 =====

type EnvCardItem = {
  label: string;     // 카드 상단 컬러 텍스트 — 기온/습도/미세먼지
  icon: import('@/components/Icon').IconName;
  value: string;     // 하단 값 — 숫자(17°C) 또는 평가어(좋음/보통/나쁨)
  tone: Tone;
};

// 3개 고정: 기온·습도·미세먼지. 데이터 없을 때 값은 '-' (small dash).
function buildEnvCardItems(env: EnvData | null): EnvCardItem[] {
  if (!env) {
    return [
      { label: '기온',    icon: 'thermometer', value: '-', tone: 'success' },
      { label: '습도',    icon: 'water',       value: '-', tone: 'success' },
      { label: '미세먼지', icon: 'happy',       value: '-', tone: 'success' },
    ];
  }
  const { weather } = env;
  return [
    { label: '기온', icon: 'thermometer',
      value: `${Math.round(weather.temperature)}°C`,
      tone: tempTone(weather.temperature) },
    { label: '습도', icon: 'water',
      value: `${weather.humidity}%`,
      tone: humidityTone(weather.humidity) },
    { label: '미세먼지', icon: pm10FaceIcon(weather.pm10),
      value: pm10Label(weather.pm10),
      tone: pm10Tone(weather.pm10) },
  ];
}

// PM10 수치 → 표정 아이콘 (happy / sad). 좋음·보통은 웃는 얼굴, 나쁨 이상은 슬픈 얼굴.
function pm10FaceIcon(pm10: number): import('@/components/Icon').IconName {
  return pm10 >= 81 ? 'sad' : 'happy';
}

// 환경 카드 row — 3개 고정 flex (스크롤 없음)
function EnvCardsRow({ env }: { env: EnvData | null }) {
  const items = buildEnvCardItems(env);
  return (
    <View style={styles.envRow}>
      {items.map((it) => (
        <EnvCard key={it.label} item={it} />
      ))}
    </View>
  );
}

// 환경 카드 — 흰 배경 + 중앙 정렬. 톤은 라벨/아이콘 색상으로만 표현.
function EnvCard({ item }: { item: EnvCardItem }) {
  const fg = TONE_SOLID[item.tone];
  return (
    <View style={styles.envCard}>
      <Text style={[styles.envLabel, { color: fg }]} numberOfLines={1}>{item.label}</Text>
      <Icon name={item.icon} size={28} color={fg} />
      <Text style={styles.envValue} numberOfLines={1}>{item.value}</Text>
    </View>
  );
}

// 환경 카드 강조색 — 라벨·아이콘에만 적용. 카드 배경은 흰색 유지.
type EnvTone = 'success' | 'warning' | 'danger';
const TONE_SOLID: Record<EnvTone, string> = {
  success: '#22C55E',
  warning: '#F08A4B',
  danger:  '#EF5B4C',
};

// ===== Today Menu Guide Card =====
// 위험 단계별 추천/회피 메뉴. 식중독 점수에 따라 콘텐츠가 바뀜.

const MENU_BY_LEVEL: Record<RiskLevel, { recommend: string[]; avoid: string[]; tip: string }> = {
  1: { recommend: ['회', '비빔국수', '냉채', '구이'], avoid: [], tip: '오늘은 마음 편히 골라봐요.' },
  2: { recommend: ['칼국수', '국밥', '전골', '찜'], avoid: ['회', '육회'], tip: '따끈한 가열 메뉴를 추천해요.' },
  3: { recommend: ['국밥', '전골', '찜', '구이'], avoid: ['사시미', '육회', '생굴'], tip: '충분히 가열한 메뉴가 안전해요.' },
  4: { recommend: ['집밥', '전골'], avoid: ['회', '육회', '생굴', '뷔페'], tip: '오늘은 직접 조리하면 가장 안전해요.' },
};

function TodayMenuCard({ riskLevel, district }: { riskLevel: RiskLevel; district: string }) {
  const guide = MENU_BY_LEVEL[riskLevel];
  return (
    <View style={styles.todayMenuCard}>
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
        <View style={styles.menuChipsRow}>
          {guide.recommend.map((m) => (
            <Chip key={m} variant="info" size="sm" tone="success">{m}</Chip>
          ))}
        </View>
      </View>

      {guide.avoid.length > 0 ? (
        <View style={styles.menuBlock}>
          <Text style={styles.menuBlockLabel}>오늘은 다음 기회에</Text>
          <View style={styles.menuChipsRow}>
            {guide.avoid.map((m) => (
              <Chip key={m} variant="info" size="sm" tone="danger">{m}</Chip>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

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
  // 좌측 헤더 묶음 — 로고 + 식탐정 + 위치 정보
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, flex: 1 },
  logoImage: { width: 28, height: 28 },
  logo: { ...typography.headline, color: color.text.primary, letterSpacing: -0.3 },
  headerLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: spacing.xs,
    flexShrink: 1,
  },
  headerLocationText: { ...typography.caption, color: color.text.secondary, fontWeight: '500' },
  notiDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: radius.pill,
    backgroundColor: color.status.danger,
    borderWidth: 1.5, borderColor: color.surface.subtle,
  },

  // Risk card — 제목(위치 + 단계 + 시각) + 반원 게이지 + 데이터 출처
  cardWrapper: { position: 'relative' },
  // tinted 카드에 다른 home 카드들과 동일한 elevation.card 그림자 추가
  riskCardSurface: {
    ...(elevation.card as any),
  },
  headingBlock: { gap: 2 },
  cardHeading: {
    ...typography.headline,
    color: color.text.primary,
  },
  cardHeadingSub: {
    ...typography.caption,
    color: color.text.secondary,
    fontWeight: '500',
  },
  // 마스코트 — 카드 우측 상단에 absolute로 꽉 차게 배치 (살짝 카드 밖으로 튀어나옴)
  bigMascot: {
    position: 'absolute',
    right: -spacing.s,
    top: -spacing.s,
    width: 180,
    height: 180,
  },
  // 게이지(반원 4단계) wrapper — 좌측 정렬 (마스코트는 우측 absolute라 겹치지 않게)
  gaugeWrap: {
    alignSelf: 'flex-start',
    marginTop: spacing.m,
  },
  // 데이터 출처 — 카드 하단 작은 글씨
  dataSource: {
    ...typography.footnote,
    color: color.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.s,
  },

  // 오늘 추천 메뉴 카드 — 다른 home 카드와 동일한 surface + elevation
  todayMenuCard: {
    backgroundColor: color.surface.subtle,
    borderRadius: radius.l,
    padding: spacing.l,
    ...(elevation.card as any),
  },
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
  menuTitle: { ...typography.bodyEmphasized, color: color.text.primary, flexShrink: 1 },
  menuTip: { ...typography.caption, color: color.text.secondary, marginBottom: spacing.m },
  menuBlock: { marginTop: spacing.s },
  menuBlockLabel: { ...typography.captionEmphasized, color: color.text.primary, marginBottom: spacing.s },
  menuChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },

  // 환경 카드 — 3개 고정 flex row, 스크롤 없음. 흰 배경 + 중앙 정렬, 톤은 라벨·아이콘만.
  envRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.m,
  },
  envCard: {
    flex: 1,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.s,
    borderRadius: radius.l,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    backgroundColor: color.surface.subtle,
    // 다른 home 카드(Risk·Restaurant)와 동일: 그림자만, border 없음
    ...(elevation.card as any),
  },
  envLabel: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  envValue: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    color: color.text.primary,
  },

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

});

