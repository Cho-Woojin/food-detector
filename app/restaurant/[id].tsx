import { Icon } from '@/components/Icon';
import { SpiderChart5 } from '@/components/SpiderChart5';
import { Cheese, Mascots } from '@/constants/Assets';
import { palette } from '@/constants/Colors';
import { AxisScore, Grade, Restaurant } from '@/constants/MockData';
import { findRestaurantById } from '@/utils/dataStore';
import { toUIRestaurant } from '@/utils/adapter';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = ['평가 요약', '상세 분석', '리뷰', '가게 정보'] as const;

const GRADE_LABEL: Record<Grade, string> = {
  GOLDEN: '골든 치즈',
  SILVER: '실버 치즈',
  BRONZE: '브론즈 치즈',
  INVESTIGATING: '수사 중',
};

const GRADE_CHEESE_COUNT: Record<Grade, number> = {
  GOLDEN: 3,
  SILVER: 2,
  BRONZE: 1,
  INVESTIGATING: 0,
};

export default function RestaurantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<(typeof TABS)[number]>('평가 요약');
  const [liked, setLiked] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    findRestaurantById(String(id ?? '')).then((r) => {
      if (cancelled) return;
      setRestaurant(r ? toUIRestaurant(r) : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 12, paddingHorizontal: 18 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.iconBtn}>
          <Icon name="back" size={22} color={palette.text1} />
        </Pressable>
        <View style={styles.notFound}>
          <Text style={styles.notFoundBody}>불러오는 중…</Text>
        </View>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 12, paddingHorizontal: 18 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.iconBtn}>
          <Icon name="back" size={22} color={palette.text1} />
        </Pressable>
        <View style={styles.notFound}>
          <Image source={Mascots.empty} style={styles.notFoundMascot} resizeMode="contain" />
          <Text style={styles.notFoundTitle}>식당을 찾을 수 없어요</Text>
          <Text style={styles.notFoundBody}>다시 검색해주세요</Text>
        </View>
      </View>
    );
  }

  const cheeseCount = GRADE_CHEESE_COUNT[restaurant.grade];
  const cheeseSource =
    restaurant.grade === 'GOLDEN' ? Cheese.gold :
    restaurant.grade === 'SILVER' ? Cheese.silver : Cheese.bronze;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 상단 바 */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.iconBtn}>
          <Icon name="back" size={22} color={palette.text1} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable hitSlop={8} style={styles.iconBtn}>
          <Icon name="forward" size={20} color={palette.text1} />
        </Pressable>
        <Pressable onPress={() => setLiked((v) => !v)} hitSlop={8} style={styles.iconBtn}>
          <Icon
            name={liked ? 'heart' : 'heartOutline'}
            size={20}
            color={liked ? palette.accent : palette.text1}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Hero: 이름 + 점수 + 등급 */}
        <View style={styles.heroHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{restaurant.name}</Text>
              {cheeseCount > 0 && (
                <View style={styles.cheeseRow}>
                  {Array.from({ length: cheeseCount }).map((_, i) => (
                    <Image
                      key={i}
                      source={cheeseSource}
                      style={styles.cheeseEmoji}
                      resizeMode="contain"
                    />
                  ))}
                </View>
              )}
              <Text style={styles.gradeLabel}>{GRADE_LABEL[restaurant.grade]}</Text>
            </View>
            <Text style={styles.metaLine}>
              {restaurant.district} · {restaurant.category} ·{' '}
              <Text style={styles.statusOpen}>{restaurant.status}</Text>
            </Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreNum}>{restaurant.score}</Text>
            <Text style={styles.scoreUnit}>점</Text>
          </View>
        </View>

        {/* 마스코트 + 말풍선 */}
        <View style={styles.mascotArea}>
          <Image source={Mascots.thanks} style={styles.mascot} resizeMode="contain" />
          <View style={styles.mascotBubble}>
            <Text style={styles.mascotBubbleText}>{restaurant.scoreSummary}</Text>
            <View style={styles.mascotTailBorder} />
            <View style={styles.mascotTail} />
          </View>
        </View>

        {/* 탭 */}
        <View style={styles.tabsBar}>
          {TABS.map((t) => {
            const active = tab === t;
            return (
              <Pressable key={t} onPress={() => setTab(t)} style={styles.tabBtn}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
                {active && <View style={styles.tabIndicator} />}
              </Pressable>
            );
          })}
        </View>

        {/* 탭 컨텐츠 */}
        {tab === '평가 요약' && <SummaryTab restaurant={restaurant} />}
        {tab === '상세 분석' && <DetailTab restaurant={restaurant} />}
        {tab === '리뷰' && <ReviewTab restaurant={restaurant} />}
        {tab === '가게 정보' && <InfoTab restaurant={restaurant} />}

        <View style={{ height: 96 }} />
      </ScrollView>

      {/* 하단 CTA */}
      <View style={[styles.bottomCta, { paddingBottom: 12 + insets.bottom }]}>
        <Pressable style={styles.ctaBtn}>
          <Image source={Mascots.search} style={styles.ctaMascot} resizeMode="contain" />
          <Text style={styles.ctaText}>배달의민족에서 주문하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SummaryTab({ restaurant }: { restaurant: Restaurant }) {
  return (
    <View>
      <AIMenuGuideCard guide={restaurant.menuGuide} />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>5축 평가 요약</Text>
        <SpiderChart5
          axes={restaurant.axes.map((a) => ({
            key: a.key,
            label: a.label,
            score: a.score,
            max: a.max,
          }))}
          size={260}
          centerLabel={`${restaurant.score}점`}
        />
      </View>
    </View>
  );
}

function DetailTab({ restaurant }: { restaurant: Restaurant }) {
  return (
    <View>
      {/* 5축 평가 상세 */}
      <Text style={styles.sectionTitle}>5축 평가 상세</Text>
      {restaurant.axes.map((a, i) => (
        <AxisRow key={a.key} axis={a} index={i} />
      ))}

      {/* AI 행정처분 번역 */}
      {restaurant.adminActions.length > 0 ? (
        <AdminActionsCard actions={restaurant.adminActions} />
      ) : (
        <View style={styles.adminEmpty}>
          <Icon name="sparkles" size={14} color={palette.primaryGreen} />
          <Text style={styles.adminEmptyText}>최근 1년간 행정처분 이력이 없어요</Text>
        </View>
      )}
    </View>
  );
}

function AIMenuGuideCard({ guide }: { guide: import('@/constants/MockData').MenuGuide }) {
  return (
    <View style={styles.aiCard}>
      <View style={styles.aiHeader}>
        <View style={styles.aiBadge}>
          <Icon name="sparkles" size={11} color={palette.white} />
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
        <Text style={styles.aiTitle}>오늘 안전한 메뉴 가이드</Text>
        <Text style={styles.aiUpdated}>{guide.updatedAt}</Text>
      </View>
      <Text style={styles.aiContext}>{guide.contextLine}</Text>

      <View style={styles.aiBlock}>
        <Text style={styles.aiBlockLabel}>👍 추천</Text>
        <View style={styles.aiChipsRow}>
          {guide.recommend.map((m) => (
            <View key={m} style={[styles.aiChip, styles.aiChipOk]}>
              <Text style={[styles.aiChipText, { color: palette.primaryGreen }]}>{m}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.aiBlock}>
        <Text style={styles.aiBlockLabel}>👎 오늘은 피하세요</Text>
        <View style={styles.aiChipsRow}>
          {guide.avoid.map((m) => (
            <View key={m} style={[styles.aiChip, styles.aiChipWarn]}>
              <Text style={[styles.aiChipText, { color: palette.alertRed }]}>{m}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.aiGuideline}>
        <Text style={styles.aiGuidelineText}>{guide.guideline}</Text>
      </View>
    </View>
  );
}

function AdminActionsCard({ actions }: { actions: import('@/constants/MockData').AdminAction[] }) {
  return (
    <View style={styles.adminCard}>
      <View style={styles.aiHeader}>
        <View style={styles.aiBadge}>
          <Icon name="sparkles" size={11} color={palette.white} />
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
        <Text style={styles.aiTitle}>행정처분 시민 언어 번역</Text>
      </View>
      <Text style={styles.adminHint}>전문 용어를 일반 시민이 이해하기 쉽게 풀어드려요</Text>

      {actions.map((a, i) => (
        <View key={i} style={styles.adminItem}>
          <View style={styles.adminTopRow}>
            <Text style={styles.adminDate}>{a.date}</Text>
            <View style={[styles.adminSeverity, severityStyle(a.severity)]}>
              <Text style={[styles.adminSeverityText, { color: severityColor(a.severity) }]}>
                {severityLabel(a.severity)}
              </Text>
            </View>
            <Text style={styles.adminImpact}>{a.impact}</Text>
          </View>
          <Text style={styles.adminOriginal}>원문: {a.original}</Text>
          <View style={styles.adminTranslated}>
            <Icon name="sparkles" size={12} color={palette.accent} />
            <Text style={styles.adminTranslatedText}>{a.translated}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function ReviewTab({ restaurant }: { restaurant: Restaurant }) {
  return (
    <View>
      <View style={styles.reviewSummary}>
        <Text style={styles.reviewCount}>총 {restaurant.reviewCount}건</Text>
        <Text style={styles.reviewHygiene}>위생 리뷰 {restaurant.hygieneReviewCount}건</Text>
      </View>
      {restaurant.reviews.map((rv) => (
        <View key={rv.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewAuthor}>{rv.author}</Text>
            <View style={styles.reviewStarsRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Icon
                  key={i}
                  name="star"
                  size={11}
                  color={i < rv.rating ? palette.primaryYellow : palette.border}
                />
              ))}
            </View>
            <Text style={styles.reviewDate}>{rv.date}</Text>
          </View>
          <Text style={styles.reviewBody}>{rv.body}</Text>
          {rv.hygieneTags.length > 0 && (
            <View style={styles.reviewTagsRow}>
              {rv.hygieneTags.map((t) => (
                <View key={t} style={styles.reviewTag}>
                  <Text style={styles.reviewTagText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function severityLabel(s: 'low' | 'medium' | 'high') {
  return s === 'high' ? '중대' : s === 'medium' ? '주의' : '경미';
}

function severityColor(s: 'low' | 'medium' | 'high') {
  return s === 'high' ? palette.alertRed : s === 'medium' ? '#A16207' : palette.primaryGreen;
}

function severityStyle(s: 'low' | 'medium' | 'high') {
  if (s === 'high') return { backgroundColor: palette.alertRedLight };
  if (s === 'medium') return { backgroundColor: palette.lightYellow };
  return { backgroundColor: palette.lightGreen };
}

function AxisRow({ axis, index }: { axis: AxisScore; index: number }) {
  return (
    <View style={styles.axisCard}>
      <View style={[styles.axisLetter, { backgroundColor: toneBg(axis.tone) }]}>
        <Text style={[styles.axisLetterText, { color: toneFg(axis.tone) }]}>
          {String.fromCharCode(65 + index)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.axisHeaderRow}>
          <Text style={styles.axisName}>{axis.label}</Text>
          <Text style={styles.axisSource}>({axis.source})</Text>
        </View>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${(axis.score / axis.max) * 100}%`, backgroundColor: toneFg(axis.tone) },
            ]}
          />
        </View>
      </View>
      <View style={styles.axisRight}>
        <Text style={styles.axisScore}>
          {axis.score}<Text style={styles.axisMax}> / {axis.max}</Text>
        </Text>
        <Text style={[styles.axisRating, { color: toneFg(axis.tone) }]}>{axis.rating}</Text>
      </View>
    </View>
  );
}

function InfoTab({ restaurant }: { restaurant: Restaurant }) {
  return (
    <View style={styles.infoCard}>
      <InfoRow label="주소" value={restaurant.address} />
      <InfoRow label="전화" value={restaurant.phone} />
      <InfoRow label="영업" value={restaurant.hours} />
      <InfoRow label="휴무" value={restaurant.closedDay} />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}


function toneBg(tone: 'green' | 'yellow' | 'red') {
  if (tone === 'green') return palette.lightGreen;
  if (tone === 'yellow') return palette.lightYellow;
  return palette.alertRedLight;
}

function toneFg(tone: 'green' | 'yellow' | 'red') {
  if (tone === 'green') return palette.primaryGreen;
  if (tone === 'yellow') return '#A16207';
  return palette.alertRed;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.white },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  notFound: { alignItems: 'center', paddingVertical: 60 },
  notFoundMascot: { width: 120, height: 120, marginBottom: 12 },
  notFoundTitle: { fontSize: 14, fontWeight: '700', color: palette.text1, marginBottom: 4 },
  notFoundBody: { fontSize: 12, color: palette.text3 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18 },

  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    marginBottom: 8,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  name: { fontSize: 22, fontWeight: '800', color: palette.text1, marginRight: 4 },
  cheeseRow: { flexDirection: 'row', gap: -4, alignItems: 'center' },
  cheeseEmoji: { width: 18, height: 18 },
  gradeLabel: { fontSize: 12, fontWeight: '600', color: palette.text2, marginLeft: 4 },
  metaLine: { fontSize: 12, color: palette.text2, marginTop: 4 },
  statusOpen: { color: palette.accent, fontWeight: '600' },
  scoreBox: { flexDirection: 'row', alignItems: 'baseline', marginLeft: 8 },
  scoreNum: { fontSize: 28, fontWeight: '800', color: palette.accent },
  scoreUnit: { fontSize: 14, color: palette.accent, marginLeft: 2 },

  mascotArea: {
    alignItems: 'center',
    marginVertical: 12,
  },
  mascot: { width: 180, height: 180 },
  mascotBubble: {
    backgroundColor: palette.lightGreen,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: palette.accent,
    marginTop: -8,
    position: 'relative',
  },
  mascotBubbleText: { fontSize: 13, fontWeight: '700', color: palette.accentDark },
  mascotTail: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -7,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: palette.lightGreen,
  },
  mascotTailBorder: {
    position: 'absolute',
    top: -10,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: palette.accent,
  },

  // 탭 바
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    marginTop: 8,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabText: { fontSize: 12, color: palette.text3, fontWeight: '500' },
  tabTextActive: { color: palette.accent, fontWeight: '700' },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    height: 2,
    width: '60%',
    backgroundColor: palette.accent,
    borderRadius: 1,
  },

  // 요약 탭
  summaryCard: {
    backgroundColor: palette.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: palette.text1, marginBottom: 12 },

  // 5축 평가 탭
  sectionTitle: { fontSize: 15, fontWeight: '700', color: palette.text1, marginBottom: 12 },
  axisCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    gap: 12,
  },
  axisLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisLetterText: { fontSize: 13, fontWeight: '800' },
  axisHeaderRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 6 },
  axisName: { fontSize: 13, fontWeight: '700', color: palette.text1 },
  axisSource: { fontSize: 11, color: palette.text3 },
  barTrack: {
    height: 6,
    backgroundColor: palette.bgCard,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  axisRight: { alignItems: 'flex-end', minWidth: 60 },
  axisScore: { fontSize: 14, fontWeight: '800', color: palette.text1 },
  axisMax: { fontSize: 11, color: palette.text3, fontWeight: '500' },
  axisRating: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  finalCard: {
    backgroundColor: palette.bgCard,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  finalLabel: { fontSize: 13, color: palette.text2, marginBottom: 6 },
  finalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  finalScore: { fontSize: 36, fontWeight: '800', color: palette.text1 },
  finalDenom: { fontSize: 14, color: palette.text3 },
  finalGrade: { flexDirection: 'row', gap: -4, marginTop: 8 },
  finalCheese: { width: 26, height: 26 },
  finalGradeLabel: { fontSize: 12, fontWeight: '700', color: palette.accent, marginTop: 4 },
  criteriaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  criteriaBtnText: { fontSize: 12, color: palette.text2, fontWeight: '500' },

  // 정보 탭
  infoCard: {
    backgroundColor: palette.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  infoRow: { flexDirection: 'row', paddingVertical: 8 },
  infoLabel: { fontSize: 12, color: palette.text3, width: 60 },
  infoValue: { flex: 1, fontSize: 12, color: palette.text1 },

  // AI 메뉴 가이드
  aiCard: {
    backgroundColor: palette.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: palette.accent,
    padding: 14,
    marginBottom: 18,
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: palette.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: palette.white, letterSpacing: 0.5 },
  aiTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: palette.text1 },
  aiUpdated: { fontSize: 10, color: palette.text3 },
  aiContext: { fontSize: 11, color: palette.text2, marginBottom: 12, fontStyle: 'italic' },
  aiBlock: { marginBottom: 10 },
  aiBlockLabel: { fontSize: 12, fontWeight: '700', color: palette.text1, marginBottom: 6 },
  aiChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  aiChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  aiChipOk: { backgroundColor: palette.lightGreen, borderColor: palette.primaryGreen },
  aiChipWarn: { backgroundColor: palette.alertRedLight, borderColor: palette.alertRed },
  aiChipText: { fontSize: 11, fontWeight: '600' },
  aiGuideline: {
    backgroundColor: palette.bgCard,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  aiGuidelineText: { fontSize: 12, color: palette.text1, lineHeight: 18, fontWeight: '500' },

  // 행정처분 AI 번역
  adminCard: {
    backgroundColor: palette.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: palette.accent,
    padding: 14,
    marginTop: 18,
  },
  adminHint: { fontSize: 11, color: palette.text2, marginBottom: 12 },
  adminEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
  },
  adminEmptyText: { fontSize: 12, color: palette.text2, fontWeight: '500' },
  adminItem: {
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  adminTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  adminDate: { fontSize: 11, color: palette.text3, fontWeight: '600' },
  adminSeverity: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  adminSeverityText: { fontSize: 10, fontWeight: '700' },
  adminImpact: { fontSize: 11, color: palette.text2, fontWeight: '600', marginLeft: 'auto' },
  adminOriginal: { fontSize: 11, color: palette.text3, marginBottom: 8, lineHeight: 16 },
  adminTranslated: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: palette.lightGreen,
    borderRadius: 10,
    padding: 10,
  },
  adminTranslatedText: { flex: 1, fontSize: 12, color: palette.text1, lineHeight: 18, fontWeight: '500' },

  // 리뷰
  reviewSummary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  reviewCount: { fontSize: 14, fontWeight: '700', color: palette.text1 },
  reviewHygiene: { fontSize: 12, color: palette.accent, fontWeight: '600' },
  reviewCard: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  reviewAuthor: { fontSize: 13, fontWeight: '600', color: palette.text1 },
  reviewStarsRow: { flexDirection: 'row', gap: 1 },
  reviewDate: { fontSize: 11, color: palette.text3, marginLeft: 'auto' },
  reviewBody: { fontSize: 12, color: palette.text1, lineHeight: 18, marginBottom: 6 },
  reviewTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  reviewTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: palette.bgCard,
  },
  reviewTagText: { fontSize: 10, color: palette.text2, fontWeight: '500' },

  // 하단 CTA
  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  ctaMascot: { width: 28, height: 28 },
  ctaText: { fontSize: 14, fontWeight: '700', color: palette.white },
});
