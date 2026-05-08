import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { SpiderChart5 } from '@/components/SpiderChart5';
import { Cheese, Mascots, type MascotKey } from '@/constants/Assets';
import { AxisScore, Grade, Restaurant } from '@/constants/MockData';
import { color, elevation, mascotSize, motion, radius, spacing, typography } from '@/constants/tokens';
import { AnimatedHeart, Button, Card, CheeseBadge, Chip, IconButton, SkeletonCard } from '@/components/ui';
import { findRestaurantById } from '@/utils/dataStore';
import { toUIRestaurant } from '@/utils/adapter';
import { toggleLike, useIsLiked } from '@/utils/favorites';
import { shareRestaurantToKakao } from '@/utils/kakaoShare';

const TABS = ['평가', '리뷰', '정보'] as const;
type Tab = (typeof TABS)[number];

const MASCOT_BY_GRADE: Record<Grade, MascotKey> = {
  GOLDEN: 'ceremony',
  SILVER: 'thanks',
  BRONZE: 'thanks',
  INVESTIGATING: 'search',
};

export default function RestaurantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('평가');
  const liked = useIsLiked(typeof id === 'string' ? id : null);
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

  if (loading) return <LoadingState />;
  if (!restaurant) return <NotFoundState />;

  const mascot = MASCOT_BY_GRADE[restaurant.grade];
  const cheeseFg = color.cheese[restaurant.grade].fg;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <IconButton icon="back" size="md" accessibilityLabel="뒤로 가기" onPress={() => router.back()} />
        <View style={{ flex: 1 }} />
        <IconButton
          icon="share"
          size="md"
          accessibilityLabel="카카오톡으로 공유하기"
          onPress={() => {
            // restaurant는 UIRestaurant — district에서 자치구 추출
            const gu = restaurant.district.split(' ')[0] || '';
            shareRestaurantToKakao({
              id: restaurant.id,
              name: restaurant.name,
              cat: restaurant.category,
              gu,
              score: restaurant.score,
              grade: restaurant.grade as any,
            });
          }}
        />
        <IconButton icon="search" size="md" accessibilityLabel="검색" onPress={() => router.push('/search')} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* 1. 검사 결과 종합 카드 — 점수와 등급에 시선 집중 */}
        <Card variant="elevated" padding="xl" radius="xl" style={styles.summaryCard}>
          <Image source={Mascots[mascot]} style={styles.summaryMascot} resizeMode="contain" />
          <Text style={styles.summaryLabel}>검사 결과 종합</Text>
          <View style={styles.summaryScoreRow}>
            <Text style={[styles.summaryScore, { color: cheeseFg }]}>{restaurant.score}</Text>
            <Text style={styles.summaryScoreUnit}>/ 100점</Text>
          </View>
          <CheeseBadge grade={restaurant.grade} size="md" showLabel style={styles.summaryBadge} />
        </Card>

        {/* 2. 음식점 명 + 카테고리 — 가운데 정렬, 좋아요는 이름 옆 */}
        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.nameCenter} numberOfLines={2}>{restaurant.name}</Text>
            <AnimatedHeart
              active={liked}
              size={22}
              hitSize={36}
              onPress={() => restaurant && toggleLike(restaurant.id)}
            />
          </View>
          <Text style={styles.categoryCenter}>{restaurant.category}</Text>
        </View>

        {/* 3. 위치 정보 */}
        <View style={styles.locationBlock}>
          <Icon name="location" size={14} color={color.text.secondary} />
          <Text style={styles.locationText}>{restaurant.district}</Text>
          <Text style={styles.locationDot}>·</Text>
          <Text style={styles.locationStatus}>{restaurant.status}</Text>
        </View>

        {/* 4. 탭 */}
        <View style={styles.tabsBar}>
          {TABS.map((t) => {
            const active = tab === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t}
                style={({ pressed }) => [styles.tabBtn, pressed && { opacity: motion.press.opacity }]}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
                {active ? <View style={styles.tabIndicator} /> : null}
              </Pressable>
            );
          })}
        </View>

        {/* Tab content */}
        {tab === '평가' && <SummaryTab restaurant={restaurant} />}
        {tab === '리뷰' && <ReviewTab restaurant={restaurant} />}
        {tab === '정보' && <InfoTab restaurant={restaurant} />}

        <View style={{ height: 96 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.bottomCta, { paddingBottom: spacing.m + insets.bottom }]}>
        <Button
          variant="ghost"
          size="md"
          leftIcon="map"
          onPress={() =>
            router.replace({ pathname: '/(tabs)/map', params: { id: restaurant.id } } as any)
          }>
          지도 보기
        </Button>
        <View style={{ flex: 1 }}>
          <Button
            variant="primary"
            size="md"
            mascotIcon="search"
            fullWidth
            onPress={() => Linking.openURL(`tel:${restaurant.phone.replace(/[^\d]/g, '')}`)}>
            전화 걸기
          </Button>
        </View>
      </View>
    </View>
  );
}

// ===== Sub views =====

function LoadingState() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.m, paddingHorizontal: spacing.l }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <IconButton icon="back" size="md" accessibilityLabel="뒤로" onPress={() => router.back()} />
      <View style={{ marginTop: spacing.l, gap: spacing.m }}>
        <SkeletonCard height={180} />
        <SkeletonCard height={120} />
        <SkeletonCard height={240} />
      </View>
    </View>
  );
}

function NotFoundState() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.m, paddingHorizontal: spacing.l }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <IconButton icon="back" size="md" accessibilityLabel="뒤로" onPress={() => router.back()} />
      <View style={styles.notFound}>
        <Image source={Mascots.empty} style={styles.notFoundMascot} resizeMode="contain" />
        <Text style={styles.notFoundTitle}>식당 정보를 가져오지 못했어요</Text>
        <Text style={styles.notFoundBody}>검색에서 다시 시도해봐요</Text>
      </View>
    </View>
  );
}

function SummaryTab({ restaurant }: { restaurant: Restaurant }) {
  return (
    <View>
      <AIMenuGuideCard guide={restaurant.menuGuide} />

      <Card variant="elevated" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
        <Text style={styles.cardTitle}>식탐정 평가 요약</Text>
        <View style={{ alignItems: 'center', marginTop: spacing.m }}>
          <SpiderChart5
            axes={restaurant.axes.map((a) => ({
              key: a.key,
              label: a.label,
              score: a.score,
              max: a.max,
            }))}
            size={240}
            centerLabel={`${restaurant.score}점`}
          />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>식탐정 평가 상세</Text>
      <Card variant="elevated" padding="none" radius="l">
        {restaurant.axes.map((a, i) => (
          <AxisRow key={a.key} axis={a} index={i} showDivider={i < restaurant.axes.length - 1} />
        ))}
      </Card>

      {restaurant.adminActions.length > 0 ? (
        <AdminActionsCard actions={restaurant.adminActions} />
      ) : (
        <View style={styles.adminEmpty}>
          <Icon name="sparkles" size={14} color={color.brand.primary} />
          <Text style={styles.adminEmptyText}>최근 1년간 깨끗한 운영을 이어왔어요</Text>
        </View>
      )}
    </View>
  );
}

function AIMenuGuideCard({ guide }: { guide: import('@/constants/MockData').MenuGuide }) {
  return (
    <View style={{ marginBottom: spacing.l }}>
      <Card variant="elevated" padding="l" radius="l">
        <View style={styles.aiHeader}>
          <View style={styles.aiBadge}>
            <Icon name="sparkles" size={11} color={color.text.onBrand} />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
          <Text style={styles.aiTitle}>오늘 안전한 메뉴 가이드</Text>
          <Text style={styles.aiUpdated}>{guide.updatedAt}</Text>
        </View>
        <Text style={styles.aiContext}>{guide.contextLine}</Text>

        <View style={styles.aiBlock}>
          <Text style={styles.aiBlockLabel}>오늘 추천</Text>
          <View style={styles.chipsRow}>
            {guide.recommend.map((m) => (
              <Chip key={m} variant="info" size="sm" tone="success">{m}</Chip>
            ))}
          </View>
        </View>

        <View style={styles.aiBlock}>
          <Text style={styles.aiBlockLabel}>다음 기회에</Text>
          <View style={styles.chipsRow}>
            {guide.avoid.map((m) => (
              <Chip key={m} variant="info" size="sm" tone="danger">{m}</Chip>
            ))}
          </View>
        </View>

        <Text style={styles.aiGuidelineText}>{guide.guideline}</Text>
      </Card>
    </View>
  );
}

function AdminActionsCard({ actions }: { actions: import('@/constants/MockData').AdminAction[] }) {
  return (
    <View style={{ marginTop: spacing.l }}>
      <Card variant="elevated" padding="l" radius="l">
        <View style={styles.aiHeader}>
          <View style={styles.aiBadge}>
            <Icon name="sparkles" size={11} color={color.text.onBrand} />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
          <Text style={styles.aiTitle}>행정처분 시민 언어 번역</Text>
        </View>
        <Text style={styles.adminHint}>전문 용어를 누구나 이해하기 쉽게 풀어줘요</Text>

        {actions.map((a, i) => (
          <View key={i} style={[styles.adminItem, i > 0 && styles.adminItemBorder]}>
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
              <Icon name="sparkles" size={12} color={color.brand.primary} />
              <Text style={styles.adminTranslatedText}>{a.translated}</Text>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

const HYGIENE_TAGS = [
  '주방 깨끗',
  '직원 위생',
  '식기 청결',
  '재료 신선',
  '냄새 없음',
  '벌레 없음',
];

function ReviewComposeCard({ restaurantName }: { restaurantName: string }) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = rating > 0 && body.trim().length >= 5 && !submitting;

  const toggleTag = (t: string) => {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setTimeout(() => {
      Alert.alert('리뷰가 등록됐어요', `${restaurantName}에 위생 리뷰를 남겼어요. 식탐정이 검토 후 반영해요.`);
      setRating(0);
      setBody('');
      setTags(new Set());
      setSubmitting(false);
    }, 400);
  };

  return (
    <Card variant="elevated" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
      <View style={styles.composeHeader}>
        <Text style={styles.composeTitle}>위생 리뷰 남기기</Text>
        <Text style={styles.composeHint}>이 식당 다녀온 분만 남겨주세요</Text>
      </View>

      {/* Rating stars */}
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Pressable
            key={i}
            onPress={() => setRating(i)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${i}점`}
            accessibilityState={{ selected: rating >= i }}
            style={styles.starBtn}>
            <Icon
              name="star"
              size={32}
              color={i <= rating ? color.brand.secondary : color.border.default}
            />
          </Pressable>
        ))}
        {rating > 0 ? (
          <Text style={styles.ratingValue}>{rating}.0</Text>
        ) : null}
      </View>

      {/* Body input */}
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="주방, 직원 위생, 식기 상태 등 본인이 본 그대로 적어주세요 (최소 5자)"
        placeholderTextColor={color.text.tertiary}
        multiline
        textAlignVertical="top"
        style={styles.composeInput}
        accessibilityLabel="리뷰 본문"
      />
      <Text style={styles.charCount}>{body.length} / 500</Text>

      {/* Hygiene tags */}
      <Text style={styles.composeBlockLabel}>위생 태그 (해당하는 것 모두)</Text>
      <View style={styles.composeTagsRow}>
        {HYGIENE_TAGS.map((t) => (
          <Chip
            key={t}
            variant="filter"
            size="sm"
            selected={tags.has(t)}
            onPress={() => toggleTag(t)}>
            {t}
          </Chip>
        ))}
      </View>

      {/* Submit */}
      <View style={{ marginTop: spacing.m }}>
        <Button
          variant="primary"
          size="md"
          fullWidth
          disabled={!canSubmit}
          loading={submitting}
          leftIcon="pencil"
          onPress={handleSubmit}>
          리뷰 등록하기
        </Button>
      </View>
    </Card>
  );
}

function ReviewTab({ restaurant }: { restaurant: Restaurant }) {
  return (
    <View>
      <ReviewComposeCard restaurantName={restaurant.name} />

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
                  color={i < rv.rating ? color.brand.secondary : color.border.default}
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

function InfoTab({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Card variant="outlined" padding="l" radius="l">
      <InfoRow label="주소" value={restaurant.address} />
      <InfoRow label="전화" value={restaurant.phone} />
      <InfoRow label="영업" value={restaurant.hours} />
      <InfoRow label="휴무" value={restaurant.closedDay} />
    </Card>
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

function AxisRow({ axis, index, showDivider }: { axis: AxisScore; index: number; showDivider: boolean }) {
  return (
    <View style={[styles.axisCard, showDivider && styles.axisDivider]}>
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
          <View style={[styles.barFill, { width: `${(axis.score / axis.max) * 100}%`, backgroundColor: toneFg(axis.tone) }]} />
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

// ===== Tone helpers =====

function severityLabel(s: 'low' | 'medium' | 'high') {
  return s === 'high' ? '중대' : s === 'medium' ? '주의' : '경미';
}
function severityColor(s: 'low' | 'medium' | 'high') {
  return s === 'high' ? color.status.danger : s === 'medium' ? color.status.warning : color.status.success;
}
function severityStyle(s: 'low' | 'medium' | 'high') {
  if (s === 'high') return { backgroundColor: color.status.dangerSoft };
  if (s === 'medium') return { backgroundColor: color.status.warningSoft };
  return { backgroundColor: color.status.successSoft };
}
function toneBg(tone: 'green' | 'yellow' | 'red') {
  if (tone === 'green') return color.status.successSoft;
  if (tone === 'yellow') return color.status.warningSoft;
  return color.status.dangerSoft;
}
function toneFg(tone: 'green' | 'yellow' | 'red') {
  if (tone === 'green') return color.status.success;
  if (tone === 'yellow') return color.status.warning;
  return color.status.danger;
}

// ===== Styles =====

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.canvas },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
    backgroundColor: color.surface.canvas,
  },

  notFound: { alignItems: 'center', paddingVertical: spacing.xxxxl + spacing.l },
  notFoundMascot: { width: mascotSize.featured, height: mascotSize.featured, marginBottom: spacing.m },
  notFoundTitle: { ...typography.bodyEmphasized, color: color.text.primary, marginBottom: spacing.xs },
  notFoundBody: { ...typography.caption, color: color.text.tertiary },

  scrollContent: { paddingHorizontal: spacing.l, paddingTop: spacing.s },

  // 1. Summary card (검사 결과 종합)
  summaryCard: { alignItems: 'center', gap: spacing.s },
  summaryMascot: { width: mascotSize.featured, height: mascotSize.featured },
  summaryLabel: {
    ...typography.captionEmphasized,
    color: color.text.secondary,
    letterSpacing: 0.4,
  },
  summaryScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  summaryScore: { ...typography.display, fontSize: 56, lineHeight: 60 },
  summaryScoreUnit: { ...typography.subheadline, color: color.text.tertiary },
  summaryBadge: { marginTop: spacing.xs },

  // 2. Name block (가운데 정렬)
  nameBlock: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.xs },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
  },
  nameCenter: {
    ...typography.title,
    color: color.text.primary,
    textAlign: 'center',
  },
  categoryCenter: {
    ...typography.subheadline,
    color: color.text.secondary,
    textAlign: 'center',
  },

  // 3. Location block
  locationBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.s,
  },
  locationText: { ...typography.caption, color: color.text.secondary },
  locationDot: { ...typography.caption, color: color.text.tertiary },
  locationStatus: { ...typography.captionEmphasized, color: color.brand.primary },

  // Tabs
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: color.border.default,
    marginTop: spacing.xl,
    marginBottom: spacing.l,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.m,
    alignItems: 'center',
    minHeight: 44,
    position: 'relative',
  },
  tabText: { ...typography.subheadline, color: color.text.tertiary },
  tabTextActive: { ...typography.subheadlineEmphasized, color: color.brand.primary },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    height: 3,
    width: 24,
    borderRadius: radius.s,
    backgroundColor: color.brand.primary,
  },

  // Cards / sections
  cardTitle: { ...typography.bodyEmphasized, color: color.text.primary },
  sectionTitle: { ...typography.headline, color: color.text.primary, marginBottom: spacing.m },

  // Axis rows
  axisCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.m + 2,
    paddingHorizontal: spacing.m,
    gap: spacing.m,
  },
  axisDivider: { borderBottomWidth: 1, borderBottomColor: color.border.default },
  axisLetter: {
    width: 28, height: 28, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center',
  },
  axisLetterText: { ...typography.captionEmphasized },
  axisHeaderRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginBottom: spacing.xs + 2 },
  axisName: { ...typography.subheadlineEmphasized, color: color.text.primary },
  axisSource: { ...typography.footnote, color: color.text.tertiary },
  barTrack: {
    height: 6,
    backgroundColor: color.fill.tertiary,
    borderRadius: radius.s,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.s },
  axisRight: { alignItems: 'flex-end', minWidth: 60 },
  axisScore: { ...typography.subheadlineEmphasized, color: color.text.primary },
  axisMax: { ...typography.footnote, color: color.text.tertiary },
  axisRating: { ...typography.footnote, marginTop: 2 },

  // Info tab
  infoRow: { flexDirection: 'row', paddingVertical: spacing.s },
  infoLabel: { ...typography.caption, color: color.text.tertiary, width: 60 },
  infoValue: { flex: 1, ...typography.subheadline, color: color.text.primary },

  // AI guide / admin cards
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginBottom: spacing.xs },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: color.brand.primary,
    paddingHorizontal: spacing.s,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  aiBadgeText: { ...typography.footnote, fontWeight: '700', color: color.text.onBrand, letterSpacing: 0.5 },
  aiTitle: { flex: 1, ...typography.subheadlineEmphasized, color: color.text.primary },
  aiUpdated: { ...typography.footnote, color: color.text.tertiary },
  aiContext: { ...typography.caption, color: color.text.secondary, marginBottom: spacing.m },
  aiBlock: { marginBottom: spacing.m },
  aiBlockLabel: {
    ...typography.caption,
    color: color.text.tertiary,
    marginBottom: spacing.s,
    letterSpacing: 0.2,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  aiGuidelineText: {
    ...typography.subheadline,
    color: color.text.secondary,
    marginTop: spacing.xs,
  },

  adminHint: { ...typography.caption, color: color.text.secondary, marginBottom: spacing.m },
  adminEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.m,
    marginTop: spacing.s,
  },
  adminEmptyText: { ...typography.caption, color: color.text.secondary, fontWeight: '500' },
  adminItem: { paddingTop: spacing.m, paddingBottom: spacing.m },
  adminItemBorder: { borderTopWidth: 1, borderTopColor: color.border.default },
  adminTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginBottom: spacing.xs + 2 },
  adminDate: { ...typography.captionEmphasized, color: color.text.tertiary },
  adminSeverity: { paddingHorizontal: spacing.s, paddingVertical: 2, borderRadius: radius.s },
  adminSeverityText: { ...typography.footnote, fontWeight: '800' },
  adminImpact: { ...typography.captionEmphasized, color: color.text.secondary, marginLeft: 'auto' },
  adminOriginal: { ...typography.caption, color: color.text.tertiary, marginBottom: spacing.s },
  adminTranslated: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    backgroundColor: color.brand.primarySoft,
    borderRadius: radius.m,
    padding: spacing.s + 2,
  },
  adminTranslatedText: { flex: 1, ...typography.subheadline, color: color.text.primary, fontWeight: '500' },

  // Review compose
  composeHeader: { marginBottom: spacing.m },
  composeTitle: { ...typography.bodyEmphasized, color: color.text.primary, marginBottom: spacing.xxs },
  composeHint: { ...typography.caption, color: color.text.secondary },

  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.m,
  },
  starBtn: { padding: 2 },
  ratingValue: {
    ...typography.subheadlineEmphasized,
    color: color.brand.secondary,
    marginLeft: spacing.s,
  },

  composeInput: {
    ...typography.subheadline,
    color: color.text.primary,
    minHeight: 96,
    backgroundColor: color.fill.quaternary,
    borderRadius: radius.m,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
    paddingBottom: spacing.m,
  },
  charCount: {
    ...typography.footnote,
    color: color.text.tertiary,
    textAlign: 'right',
    marginTop: spacing.xxs,
  },

  composeBlockLabel: {
    ...typography.captionEmphasized,
    color: color.text.primary,
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
  composeTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },

  // Reviews
  reviewSummary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.s,
    marginBottom: spacing.m,
  },
  reviewCount: { ...typography.bodyEmphasized, color: color.text.primary },
  reviewHygiene: { ...typography.captionEmphasized, color: color.brand.primary },
  reviewCard: {
    paddingVertical: spacing.m,
    borderTopWidth: 1,
    borderTopColor: color.border.default,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginBottom: spacing.xs + 2 },
  reviewAuthor: { ...typography.subheadlineEmphasized, color: color.text.primary },
  reviewStarsRow: { flexDirection: 'row', gap: 1 },
  reviewDate: { ...typography.footnote, color: color.text.tertiary, marginLeft: 'auto' },
  reviewBody: { ...typography.subheadline, color: color.text.primary, marginBottom: spacing.xs + 2 },
  reviewTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  reviewTag: {
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
    backgroundColor: color.fill.tertiary,
  },
  reviewTagText: { ...typography.footnote, color: color.text.secondary, fontWeight: '500' },

  // Sticky CTA
  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
    backgroundColor: color.surface.subtle,
    borderTopWidth: 1,
    borderTopColor: color.border.default,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    ...(elevation.raised as any),
  },
});
