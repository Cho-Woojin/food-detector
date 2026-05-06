import { Icon, IconName } from '@/components/Icon';
import { Typewriter } from '@/components/Typewriter';
import { Cheese, Logos, Mascots } from '@/constants/Assets';
import { buildRiskMessage, palette, riskLevels } from '@/constants/Colors';
import { ensureRecomputedIndex } from '@/utils/dataStore';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const district = '강남구';
  const riskLevel = 3 as 1 | 2 | 3 | 4 | 5;
  const risk = riskLevels[riskLevel];
  const env = { temp: 28.6, humidity: 65, foodPoisoning: '주의' };

  const [goldenCheese, setGoldenCheese] = useState<
    { id: string; name: string; score: number; district: string }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    ensureRecomputedIndex().then((rows) => {
      if (cancelled) return;
      const cards = rows
        .filter((r) => r.gr === 'GOLDEN')
        .sort((a, b) => b.s - a.s)
        .slice(0, 6)
        .map((r) => ({ id: r.i, name: r.n, score: r.s, district: r.g }));
      setGoldenCheese(cards);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const goSearch = () => router.push('/search');

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: 8 + insets.top }]}
        showsVerticalScrollIndicator={false}>

        {/* 1. 헤더 */}
        <Header />

        {/* 2. 검색바 */}
        <Pressable onPress={goSearch} style={styles.searchBar}>
          <Icon name="search" size={18} color={palette.accent} />
          <Text style={styles.searchPlaceholder}>식당 이름을 입력하세요</Text>
          <Icon name="camera" size={18} color={palette.text2} />
        </Pressable>

        {/* 3. 위험 지수 카드 (마스코트 absolute) */}
        <RiskCard
          district={district}
          riskLevel={riskLevel}
          color={risk.color}
          bgColor={risk.bgColor}
          labelKr={risk.labelKr}
          message={buildRiskMessage(riskLevel, district, env)}
          mascotKey={risk.mascot}
          env={env}
        />

        {/* 4. 골든 치즈 식당 (가로 스크롤) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>골든 치즈 식당</Text>
          <Pressable style={styles.sectionMore}>
            <Text style={styles.sectionMoreText}>더보기</Text>
            <Icon name="forward" size={11} color={palette.text3} />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.goldenScroll}>
          {goldenCheese.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => router.push(`/restaurant/${r.id}` as any)}
              style={styles.goldCard}>
              <View style={styles.goldThumb}>
                <Image source={Cheese.gold} style={styles.goldThumbCheese} resizeMode="contain" />
              </View>
              <Text style={styles.goldName} numberOfLines={1}>{r.name}</Text>
              <Text style={styles.goldMeta} numberOfLines={1}>
                {r.score}점 · {r.district}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ===== 섹션 컴포넌트 =====

function Header() {
  return (
    <View style={styles.header}>
      <View style={styles.logoRow}>
        <Image source={Logos.symbol} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.logo}>식탐정</Text>
      </View>
      <Pressable style={styles.bellBtn}>
        <Icon name="bell" size={20} color={palette.text1} />
      </Pressable>
    </View>
  );
}

function RiskCard(props: {
  district: string;
  riskLevel: number;
  color: string;
  bgColor: string;
  labelKr: string;
  message: string;
  mascotKey: keyof typeof Mascots;
  env: { temp: number; humidity: number; foodPoisoning: string };
}) {
  const { district, riskLevel, color, bgColor, labelKr, message, mascotKey, env } = props;

  return (
    <View>
      {/* 말풍선 — 카드 위쪽, 좌측. 꼬리는 우측의 마스코트를 향함 */}
      <View style={[styles.bubble, { borderColor: color }]}>
        <Typewriter
          key={message}
          text={message}
          speed={45}
          startDelay={500}
          style={styles.bubbleText}
          cursorStyle={{ color, fontWeight: '700' }}
        />
        <View style={[styles.bubbleTailBorder, { borderLeftColor: color }]} />
        <View style={[styles.bubbleTail, { borderLeftColor: palette.white }]} />
      </View>

      {/* 카드 (상단 + 하단, 마스코트가 사이에 위치) */}
      <View style={styles.cardWrapper}>
        {/* 상단 카드 — 위험 단계 색상 틴트 */}
        <View style={[styles.cardTop, { backgroundColor: bgColor, borderColor: color }]}>
          <View style={styles.cardLeft}>
            <View style={styles.titleRow}>
              <Icon name="location" size={12} color={palette.text2} />
              <Text style={styles.title}>{district} 오늘의 식중독 위험 단계</Text>
            </View>

            {/* 큰 단계 라벨 (점수 제거) */}
            <Text style={[styles.bigStageLabel, { color }]}>{labelKr}</Text>
            <Text style={[styles.bigStageSub, { color }]}>{riskLevel}단계 / 5단계</Text>
            <Text style={styles.time}>12:00 기준</Text>
          </View>
        </View>

        {/* 마스코트 — 상단/하단 사이에 absolute로 떠있음 */}
        <Image
          source={Mascots[mascotKey]}
          style={styles.mascot}
          resizeMode="contain"
        />

        {/* 하단 카드 — 환경 지표 (각 메트릭 개별 톤 색상) */}
        <View style={styles.cardBottom}>
          <ColoredMetric
            icon="thermometer"
            label="기온"
            value={`${env.temp}°C`}
            tone={tempTone(env.temp)}
          />
          <ColoredMetric
            icon="water"
            label="습도"
            value={`${env.humidity}%`}
            tone={humidityTone(env.humidity)}
          />
          <ColoredMetric
            icon="bug"
            label="식중독 발생"
            value={env.foodPoisoning}
            tone={statusTone(env.foodPoisoning)}
          />
        </View>
      </View>
    </View>
  );
}

// ===== 톤 =====
type Tone = 'green' | 'yellow' | 'red';

function tempTone(t: number): Tone {
  if (t >= 30) return 'red';
  if (t >= 25) return 'yellow';
  return 'green';
}
function humidityTone(h: number): Tone {
  if (h >= 80) return 'red';
  if (h >= 60) return 'yellow';
  return 'green';
}
function statusTone(s: string): Tone {
  if (s.includes('위험')) return 'red';
  if (s.includes('주의') || s.includes('경계')) return 'yellow';
  return 'green';
}
const TONE_BG: Record<Tone, string> = {
  green: palette.lightGreen,
  yellow: palette.lightYellow,
  red: palette.alertRedLight,
};
const TONE_FG: Record<Tone, string> = {
  green: palette.primaryGreen,
  yellow: '#A16207',
  red: palette.alertRed,
};

function ColoredMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: IconName;
  label: string;
  value: string;
  tone: Tone;
}) {
  return (
    <View style={[styles.coloredMetric, { backgroundColor: TONE_BG[tone] }]}>
      <Icon name={icon} size={14} color={TONE_FG[tone]} />
      <Text style={[styles.coloredMetricLabel, { color: TONE_FG[tone] }]}>{label}</Text>
      <Text style={[styles.coloredMetricValue, { color: TONE_FG[tone] }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.white },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8 },

  // ===== 헤더 =====
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 12,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoImage: { width: 28, height: 28 },
  logo: { fontSize: 20, fontWeight: '800', color: palette.text1, letterSpacing: -0.3 },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bgCard,
  },

  // ===== 검색바 =====
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: palette.accent,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
    marginBottom: 16,
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: palette.text3 },

  // ===== 위험 카드 + 큰 마스코트 (카드 위로 튀어나오고 우측 일부 덮음) =====
  cardWrapper: {
    position: 'relative',
    marginTop: 0, // 상단 여백 제거
    marginBottom: 18,
  },
  // 카드 상단 — radius 20, padding 20, soft shadow
  cardTop: {
    backgroundColor: palette.white,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: palette.border,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  cardLeft: {
    paddingRight: 150, // 마스코트 영역 보호
  },
  // 카드 하단 — 마스코트 다음 렌더, 솔리드 흰 배경으로 덮음
  cardBottom: {
    flexDirection: 'row',
    backgroundColor: palette.white,
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.border,
    gap: 8,
    position: 'relative',
    zIndex: 5,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
      },
    }),
  },

  // 말풍선 (카드 밖 위쪽, 좌측 정렬, 꼬리는 우측 마스코트 향함)
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '62%',
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    marginLeft: 8,
    marginTop: 0, // 상단 여백 제거
    position: 'relative',
    zIndex: 11,
  },
  bubbleText: { fontSize: 13, color: palette.text1, fontWeight: '600', lineHeight: 19 },
  bubbleTail: {
    position: 'absolute',
    right: -8,
    top: 16,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 9,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: palette.white,
    zIndex: 2,
  },
  bubbleTailBorder: {
    position: 'absolute',
    right: -10,
    top: 15,
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderLeftWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: palette.border,
    zIndex: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  title: { fontSize: 13, color: palette.text2, fontWeight: '600' },

  // 큰 단계 라벨 (점수 대신)
  bigStageLabel: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginTop: 8,
    lineHeight: 52,
  },
  bigStageSub: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  time: { color: palette.text3, fontSize: 12, marginTop: 8 },

  // 마스코트 — absolute. zIndex 미지정 → DOM 렌더 순서로 결정 (cardBottom이 위로 덮음)
  mascot: {
    position: 'absolute',
    right: 0,
    top: -60,
    width: 220,
    height: 230,
  },

  // 환경 지표 metric
  // 톤별 색상 메트릭 박스 (각 값에 따라 배경색 차등)
  coloredMetric: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  coloredMetricLabel: { fontSize: 10, fontWeight: '600' },
  coloredMetricValue: { fontSize: 13, fontWeight: '800', marginTop: 2 },

  // ===== 섹션 헤더 =====
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: palette.text1 },
  sectionMore: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionMoreText: { fontSize: 11, color: palette.text3 },

  // ===== 골든 치즈 가로 스크롤 =====
  goldenScroll: { gap: 10, paddingRight: 4 },
  goldCard: { width: 130 },
  goldThumb: {
    width: 130,
    height: 90,
    borderRadius: 10,
    backgroundColor: palette.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  goldThumbCheese: { width: 50, height: 50 },
  goldName: { fontSize: 13, fontWeight: '700', color: palette.text1, marginBottom: 3 },
  goldMeta: { fontSize: 10, color: palette.text3 },
});
