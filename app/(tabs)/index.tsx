import { Icon } from '@/components/Icon';
import { Cheese, Logos, Mascots } from '@/constants/Assets';
import { palette, riskLevels } from '@/constants/Colors';
import { ensureRecomputedIndex } from '@/utils/dataStore';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
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

  const goSearch = (q?: string) =>
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: 8 + insets.top }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image source={Logos.symbol} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.logo}>식탐정</Text>
          </View>
          <Pressable style={styles.bellBtn}>
            <Icon name="bell" size={20} color={palette.text1} />
          </Pressable>
        </View>

        {/* 검색바 (탭 → /search 모달로 이동) */}
        <Pressable onPress={() => goSearch()} style={styles.searchBar}>
          <Icon name="search" size={18} color={palette.accent} />
          <Text style={styles.searchPlaceholder}>식당 이름을 입력하세요</Text>
          <Icon name="camera" size={18} color={palette.text2} />
        </Pressable>

        <>
            {/* 1. 위험 지수 카드 (마스코트 + 말풍선) */}
            <View style={[styles.riskCard, { backgroundColor: risk.bgColor, borderColor: risk.color }]}>
              <View style={styles.riskCardTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.riskTitleRow}>
                    <Icon name="location" size={12} color={palette.text2} />
                    <Text style={styles.riskTitle}>{district} 오늘의 위험</Text>
                  </View>
                  <Text style={[styles.riskLabel, { color: risk.color }]}>{risk.labelKr}</Text>

                  <View style={[styles.bubble, { borderColor: risk.color }]}>
                    <Text style={styles.bubbleText}>{risk.message}</Text>
                    <View style={[styles.bubbleTailBorder, { borderLeftColor: risk.color }]} />
                    <View style={[styles.bubbleTail, { borderLeftColor: palette.white }]} />
                  </View>
                </View>
                <Image source={Mascots[risk.mascot]} style={styles.riskMascot} resizeMode="contain" />
              </View>

              <View style={styles.envRow}>
                <EnvCol icon="thermometer" label="기온" value={`${env.temp}°C`} />
                <View style={styles.envDivider} />
                <EnvCol icon="water" label="습도" value={`${env.humidity}%`} />
                <View style={styles.envDivider} />
                <EnvCol icon="bug" label="식중독" value={env.foodPoisoning} />
              </View>
            </View>

            {/* 2. 골든 치즈 식당 */}
            <View style={[styles.sectionHeader, { marginTop: 18 }]}>
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
          </>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function EnvCol({
  icon,
  label,
  value,
}: {
  icon: 'thermometer' | 'water' | 'bug';
  label: string;
  value: string;
}) {
  return (
    <View style={styles.envCol}>
      <Icon name={icon} size={14} color={palette.accent} />
      <Text style={styles.envLabel}>{label}</Text>
      <Text style={styles.envValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.white },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8 },

  // 헤더
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 10,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoImage: { width: 28, height: 28 },
  logo: { fontSize: 19, fontWeight: '700', color: palette.text1 },
  bellBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // 검색바
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: palette.accent,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: palette.text1, paddingVertical: 0 },
  searchPlaceholder: { flex: 1, fontSize: 14, color: palette.text3 },

  // 검색 결과
  searchCount: { fontSize: 12, color: palette.text3, marginBottom: 8 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  resultCheese: { width: 40, height: 40, marginRight: 10 },
  invest: {
    backgroundColor: palette.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  investText: { fontSize: 18, color: palette.text3 },
  resultTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  resultName: { fontSize: 14, fontWeight: '600', color: palette.text1 },
  resultScore: { fontSize: 12, fontWeight: '700', color: palette.accent },
  resultMeta: { fontSize: 11, color: palette.text2, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyMascot: { width: 96, height: 96, marginBottom: 12 },
  emptyTitle: { fontSize: 13, fontWeight: '600', color: palette.text1, marginBottom: 4 },
  emptyBody: { fontSize: 12, color: palette.text3 },

  // 인사 말풍선
  greetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: palette.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
    position: 'relative',
    borderWidth: 1,
  },
  bubbleText: { fontSize: 12, color: palette.text1, lineHeight: 18, fontWeight: '500' },
  bubbleTail: {
    position: 'absolute',
    right: -7,
    top: 12,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    zIndex: 2,
  },
  bubbleTailBorder: {
    position: 'absolute',
    right: -9,
    top: 11,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 9,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    zIndex: 1,
  },
  greetMascot: { width: 88, height: 88 },

  // 위험 지수 카드
  riskCard: {
    backgroundColor: palette.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  riskCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  riskMascot: { width: 90, height: 90, marginLeft: 8 },
  riskLabel: { fontSize: 30, fontWeight: '800', marginTop: 6, marginBottom: 4, letterSpacing: -0.5 },
  riskMessage: { fontSize: 12, color: palette.text1, fontWeight: '500', lineHeight: 17 },

  // 칩 블록
  chipsBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  chipsBlockLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.text2,
    width: 28,
  },
  chipsScroll: { gap: 6, paddingRight: 8 },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  riskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  riskTitle: { fontSize: 13, fontWeight: '600', color: palette.text1 },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  riskBadgeText: { fontSize: 11, fontWeight: '700' },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  scoreNumRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  scoreNum: { fontSize: 32, fontWeight: '800', color: palette.text1 },
  scoreDenom: { fontSize: 14, color: palette.text3 },
  scoreTime: { fontSize: 10, color: palette.text3, marginTop: 2 },
  scoreBarWrap: { flex: 1 },
  scoreBarTrack: {
    height: 6,
    backgroundColor: palette.bgCard,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  scoreBarFill: { height: '100%', borderRadius: 3 },
  scoreTicks: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreTick: { fontSize: 9, color: palette.text3 },

  envRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  envCol: { flex: 1, alignItems: 'center', gap: 3 },
  envLabel: { fontSize: 10, color: palette.text3, marginTop: 2 },
  envValue: { fontSize: 12, fontWeight: '700', color: palette.text1 },
  envDivider: { width: 1, height: 24, backgroundColor: palette.border },

  riskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  riskFooterText: { fontSize: 12, fontWeight: '600', color: palette.accent },

  // 섹션
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: palette.text1 },
  sectionMore: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionMoreText: { fontSize: 11, color: palette.text3 },

  // 칩
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
  },
  recentChipText: { fontSize: 12, color: palette.text1, fontWeight: '500' },
  popChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: palette.bgCard,
  },
  popChipRank: { fontSize: 11, fontWeight: '800', color: palette.text2, minWidth: 10 },
  popChipText: { fontSize: 12, color: palette.text1, fontWeight: '500' },

  // 골든 치즈 (가로)
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
  goldGradeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  goldGradeCheese: { width: 12, height: 12 },
  goldGrade: { fontSize: 11, color: palette.text2, fontWeight: '500' },
  goldMeta: { fontSize: 10, color: palette.text3 },

  // 내 주변 추천 (세로 리스트)
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  listCheese: { width: 40, height: 40, marginRight: 12 },
  listName: { fontSize: 14, fontWeight: '600', color: palette.text1, marginBottom: 2 },
  listMeta: { fontSize: 11, color: palette.text2 },
  listRight: { alignItems: 'baseline', flexDirection: 'row', gap: 2, marginLeft: 8 },
  listScore: { fontSize: 18, fontWeight: '800', color: palette.accent },
  listScoreLabel: { fontSize: 10, color: palette.text3 },

  dataSource: { fontSize: 10, color: palette.text3, textAlign: 'center', marginTop: 16 },
});
