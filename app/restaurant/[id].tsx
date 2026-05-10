import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Cheese, Mascots } from '@/constants/Assets';
import { Grade, Restaurant } from '@/constants/MockData';
import type { Restaurant as RawRestaurant } from '@/constants/Restaurant';
import { color, elevation, mascotSize, motion, radius, spacing, typography } from '@/constants/tokens';
import { AnimatedHeart, Button, Card, CheeseBadge, Chip, IconButton, SkeletonCard } from '@/components/ui';
import { BottomSheetSymbols } from '@/components/score/BottomSheetSymbols';
import { UserScoreCard } from '@/components/score/UserScoreCard';
import { findRestaurantById } from '@/utils/dataStore';
import { deriveGrade, toUIRestaurant } from '@/utils/adapter';
import { toggleLike, useIsLiked } from '@/utils/favorites';
import { loginWithKakao, useKakaoUser } from '@/utils/kakaoAuth';
import {
  computeReviewImpact,
  removeReview,
  useImpactFor,
  useMyReviews,
  useMyReviewsFor,
  useReviewsFor,
} from '@/utils/reviews';
import { totalScoreOf } from '@/utils/scoring';
import { useIsAdmin } from '@/utils/admin';
import {
  removeOwnerPost,
  removeReviewReply,
  setReviewReply,
  useIsOwnerOf,
  useOwnerEditFor,
  useOwnerImpactFor,
  useOwnerPostsFor,
  useReviewReply,
} from '@/utils/owner';
import { ShareSheet } from '@/components/ShareSheet';
import { HygieneReviewCard } from '@/components/HygieneReviewCard';
import { OwnerEditModal } from '@/components/OwnerEditModal';
import { OwnerGrantModal } from '@/components/OwnerGrantModal';
import { OwnerPostCard } from '@/components/OwnerPostCard';
import { OwnerPostComposeModal } from '@/components/OwnerPostComposeModal';

const TABS = ['홈', '평가', '리뷰', '정보'] as const;
type Tab = (typeof TABS)[number];

// Hero 카드에 노출되는 등급 한글 라벨 (단일 원본 — utils/scoring.ts와 별개로 표시 사이즈 다름)
const GRADE_KR_LABEL: Record<Grade, string> = {
  GOLDEN: '골드 치즈',
  SILVER: '실버 치즈',
  BRONZE: '브론즈 치즈',
  ROTTEN: '트랩 치즈',
};

export default function RestaurantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('홈');
  const liked = useIsLiked(typeof id === 'string' ? id : null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [raw, setRaw] = useState<RawRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  // 사장님 모드 — 권한·게시글·정보 수정·점수 반영을 한 컴포넌트에서 통합
  const kakaoUser = useKakaoUser();
  const isAdmin = useIsAdmin();
  const ridStr = typeof id === 'string' ? id : '';
  const isOwner = useIsOwnerOf(ridStr || null, kakaoUser?.id ?? null);
  const ownerImpact = useOwnerImpactFor(ridStr || null);
  const ownerEdit = useOwnerEditFor(ridStr || null);
  const [grantOpen, setGrantOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [postComposeOpen, setPostComposeOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    findRestaurantById(String(id ?? '')).then((r) => {
      if (cancelled) return;
      setRaw(r);
      setRestaurant(r ? toUIRestaurant(r) : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // 점수 보정은 모든 사용자 리뷰 (백엔드 집계 시뮬), 표시는 본인 리뷰만 분리
  const reviewImpact = useImpactFor(typeof id === 'string' ? id : null);

  // 종합 점수 = 데이터(0~50) + 사장님(0~25) + 사용자(0~25). 지도·좋아요와 동일 산식.
  const dataScore = raw?.dataScore ?? 0;
  const adjustedScore = totalScoreOf(dataScore, ownerImpact.delta, reviewImpact.userScore);
  const adjustedGrade = useMemo(
    () =>
      deriveGrade({
        score: adjustedScore,
        flags: {
          evalGrade: raw?.evalGrade,
          punishTypes: raw?.punishTypes,
          hygieneViolation: raw?.hygieneViolation,
        },
        userScore: reviewImpact.userScore,
        userReviewCount: reviewImpact.reviewCount,
      }),
    [adjustedScore, raw?.evalGrade, raw?.punishTypes, raw?.hygieneViolation, reviewImpact.userScore, reviewImpact.reviewCount],
  );
  const impactDelta = adjustedScore - dataScore;

  if (loading) return <LoadingState />;
  if (!restaurant) return <NotFoundState />;

  // hero 좌측 치즈 이미지 (1개) — ROTTEN은 이미지 없음, fallback ⚠️
  const heroCheeseImg =
    adjustedGrade === 'GOLDEN' ? Cheese.gold
      : adjustedGrade === 'SILVER' ? Cheese.silver
      : adjustedGrade === 'BRONZE' ? Cheese.bronze
      : null;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <IconButton icon="back" size="md" accessibilityLabel="뒤로 가기" onPress={() => router.back()} />
        <View style={{ flex: 1 }} />
        {isOwner ? (
          <View style={styles.ownerBadge} accessibilityLabel="사장님 모드">
            <Icon name="logo" size={11} color={color.text.onBrand} />
            <Text style={styles.ownerBadgeText}>사장님</Text>
          </View>
        ) : null}
        <IconButton
          icon="share"
          size="md"
          accessibilityLabel="공유하기"
          onPress={() => setShareOpen(true)}
        />
        <IconButton icon="search" size="md" accessibilityLabel="검색" onPress={() => router.push('/search')} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Hero 카드 — 결과(이름·등급) + 식탐정 5가지 분석을 한 카드에. 바텀시트와 동일한 인상 */}
        {/* 관리자는 가게명 long-press로 사장님 지정 모달 진입 (숨김 입구) */}
        <Card variant="flat" padding="l" radius="l" style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroLeft}>
              {heroCheeseImg ? (
                <Image source={heroCheeseImg} style={styles.heroCheese} resizeMode="contain" />
              ) : (
                <View style={[styles.heroCheese, styles.heroCheeseRotten]}>
                  <Icon name="warning" size={36} color={color.status.danger} />
                </View>
              )}
              <Text style={[styles.heroGradeLabel, { color: color.cheese[adjustedGrade].fg }]}>
                {GRADE_KR_LABEL[adjustedGrade]}
              </Text>
            </View>
            <View style={styles.heroRight}>
              <View style={styles.heroNameRow}>
                <Pressable
                  style={{ flex: 1 }}
                  onLongPress={() => { if (isAdmin) setGrantOpen(true); }}
                  delayLongPress={600}
                  accessibilityRole={isAdmin ? 'button' : undefined}
                  accessibilityLabel={isAdmin ? '관리자 — 길게 눌러 사장님 지정' : undefined}>
                  <Text style={styles.heroName} numberOfLines={2}>{restaurant.name}</Text>
                </Pressable>
                <AnimatedHeart
                  active={liked}
                  size={20}
                  hitSize={32}
                  onPress={() => restaurant && toggleLike(restaurant.id)}
                />
              </View>
              <Text style={styles.heroMeta} numberOfLines={1}>
                {restaurant.category} · {restaurant.district}
              </Text>
            </View>
          </View>

          {/* divider + 5심볼 */}
          {raw ? (
            <>
              <View style={styles.heroDivider} />
              <BottomSheetSymbols
                input={{
                  hygieneDesignated: raw.hyg === 1,
                  hygieneViolation: !!raw.hygieneViolation,
                  punishCount: raw.pun ?? 0,
                  punishTypes: raw.punishTypes,
                  hasModel: raw.mod === 1,
                  evalGrade: raw.evalGrade,
                  ownerDelta: ownerImpact.delta,
                  ownerPostCount: ownerImpact.postCount,
                  reviewCount: reviewImpact.reviewCount,
                  reviewAvg: reviewImpact.rawAvg,
                  foreignTotal: reviewImpact.foreignTotal,
                }}
              />
            </>
          ) : null}
        </Card>

        {/* AI 메뉴 가이드 — 탭 바 위 (모든 탭에서 공통 노출) */}
        <AIMenuGuideCard guide={restaurant.menuGuide} />

        {/* 탭 */}
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
        {tab === '홈' && raw && (
          <HomeTab
            restaurant={restaurant}
            raw={raw}
            adjustedGrade={adjustedGrade}
            reviewImpact={reviewImpact}
            isOwner={isOwner}
            onEditPress={() => setEditOpen(true)}
            onComposePost={() => setPostComposeOpen(true)}
            ownerUserId={kakaoUser?.id ?? null}
            ownerName={kakaoUser?.nickname ?? '사장님'}
          />
        )}
        {tab === '평가' && raw && (
          <SummaryTab
            restaurant={restaurant}
            raw={raw}
            adjustedGrade={adjustedGrade}
            reviewImpact={reviewImpact}
          />
        )}
        {tab === '리뷰' && (
          <ReviewTab
            restaurant={restaurant}
            isOwner={isOwner}
            ownerUserId={kakaoUser?.id ?? null}
          />
        )}
        {tab === '정보' && (
          <InfoTab
            restaurant={restaurant}
            isOwner={isOwner}
            onEditPress={() => setEditOpen(true)}
            onComposePost={() => setPostComposeOpen(true)}
            ownerUserId={kakaoUser?.id ?? null}
            ownerName={kakaoUser?.nickname ?? '사장님'}
          />
        )}

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

      <ShareSheet
        visible={shareOpen}
        target={{
          id: restaurant.id,
          name: restaurant.name,
          cat: restaurant.category,
          gu: restaurant.district.split(' ')[0] || '',
          score: adjustedScore,
          grade: adjustedGrade as any,
        }}
        onClose={() => setShareOpen(false)}
      />

      {isAdmin ? (
        <OwnerGrantModal
          visible={grantOpen}
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          onClose={() => setGrantOpen(false)}
        />
      ) : null}

      {isOwner && kakaoUser ? (
        <>
          <OwnerEditModal
            visible={editOpen}
            restaurantId={restaurant.id}
            initial={{
              address: restaurant.address,
              phone: restaurant.phone,
              hours: restaurant.hours,
              closedDay: restaurant.closedDay,
            }}
            current={ownerEdit}
            onClose={() => setEditOpen(false)}
          />
          <OwnerPostComposeModal
            visible={postComposeOpen}
            restaurantId={restaurant.id}
            userId={kakaoUser.id}
            onClose={() => setPostComposeOpen(false)}
          />
        </>
      ) : null}
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

// 평가 탭 — 등급 산정 근거 디테일. 5심볼은 hero 카드에 통합되어 있음.
function SummaryTab({
  restaurant,
  raw,
  adjustedGrade,
  reviewImpact,
}: {
  restaurant: Restaurant;
  raw: RawRestaurant;
  adjustedGrade: Grade;
  reviewImpact: { reviewCount: number; userScore: number };
}) {
  return (
    <View>
      {adjustedGrade === 'ROTTEN' ? (
        <RottenReasons raw={raw} reviewImpact={reviewImpact} />
      ) : null}

      {/* 평가 — 헤더 + 4개 항목 row 모두 한 박스에 */}
      <EvaluationCard raw={raw} />

      {restaurant.adminActions.length > 0 ? (
        <AdminActionsCard actions={restaurant.adminActions} />
      ) : null}
    </View>
  );
}

// 홈 탭 — 메뉴 가이드 + 평가 + 사용자 리뷰 + 사장님·가게 정보 카드를 한 화면에 펼침.
// 각 카드의 제목으로 영역이 자연스럽게 구분되므로 별도 섹션 헤더는 두지 않음.
function HomeTab(props: {
  restaurant: Restaurant;
  raw: RawRestaurant;
  adjustedGrade: Grade;
  reviewImpact: { reviewCount: number; userScore: number };
  isOwner: boolean;
  onEditPress: () => void;
  onComposePost: () => void;
  ownerUserId: number | null;
  ownerName: string;
}) {
  const { restaurant, raw, adjustedGrade, reviewImpact, isOwner, onEditPress, onComposePost, ownerUserId, ownerName } = props;
  return (
    <View>
      {/* 1. 평가 — 트랩 사유 + 평가 디테일 + 행정처분 번역 */}
      <SummaryTab
        restaurant={restaurant}
        raw={raw}
        adjustedGrade={adjustedGrade}
        reviewImpact={reviewImpact}
      />

      {/* 2. 사용자 리뷰 (요약) — AI 메뉴 가이드는 탭 바 위 공통 영역에 있음 */}
      <UserScoreCard restaurantId={raw.id} />

      {/* 3. 사장님·가게 정보 */}
      <InfoTab
        restaurant={restaurant}
        isOwner={isOwner}
        onEditPress={onEditPress}
        onComposePost={onComposePost}
        ownerUserId={ownerUserId}
        ownerName={ownerName}
      />
    </View>
  );
}

function RottenReasons({
  raw,
  reviewImpact,
}: {
  raw: RawRestaurant;
  reviewImpact: { reviewCount: number; userScore: number };
}) {
  const reasons: string[] = [];
  if (raw.evalGrade === '중점관리업소') reasons.push('중점관리업소');
  if (raw.hygieneViolation) reasons.push('위생 직결 위반');
  if (reviewImpact.reviewCount >= 10 && reviewImpact.userScore <= 10) {
    reasons.push('사용자 평점 낮음');
  }
  if (reasons.length === 0) return null;

  return (
    <Card
      variant="tinted"
      tint="danger"
      padding="m"
      radius="l"
      style={{ marginBottom: spacing.l }}>
      <View style={styles.rottenHeader}>
        <Icon name="warning" size={16} color={color.status.danger} />
        <Text style={styles.rottenTitle}>트랩 치즈로 분류된 이유</Text>
      </View>
      <View style={styles.rottenChips}>
        {reasons.map((r) => (
          <Chip key={r} variant="info" size="sm" tone="danger">
            {r}
          </Chip>
        ))}
      </View>
    </Card>
  );
}

// 평가 카드 — 헤더 + 4개 row(위생등급/모범/평가/처분)를 한 박스에
type EvalTone = 'good' | 'caution' | 'warn' | 'none';

function evalTone(g?: string): EvalTone {
  if (g === '자율관리업소') return 'good';
  if (g === '일반관리업소') return 'caution';
  if (g === '중점관리업소' || g === '평가불능업소') return 'warn';
  return 'none';
}

const EVAL_TONE_FG: Record<EvalTone, string> = {
  good: color.status.success,
  caution: color.status.warning,
  warn: color.status.danger,
  none: color.text.tertiary,
};

function EvaluationCard({ raw }: { raw: RawRestaurant }) {
  const punishList = (raw.punishTypes ?? '').split('|').filter(Boolean);
  const punishReasons = (raw.punishReasons ?? '').split('|').filter(Boolean);
  return (
    <Card variant="flat" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
      <Text style={styles.cardSectionTitle}>평가</Text>
      <Text style={styles.cardSectionSubtitle}>식약처·행안부 공공 데이터에서 받은 인증·이력</Text>

      <View style={styles.evalRowList}>
        <EvalRow
          label="위생등급"
          state={raw.hyg === 1 ? '지정업소' : '미지정'}
          tone={raw.hyg === 1 ? 'good' : 'none'}
          source="식약처 위생등급 지정 (C004)"
          note={raw.hyg === 1 ? '세부 등급(매우우수/우수/좋음)·지정일자는 데이터 보강 필요' : undefined}
        />
        <EvalRow
          label="모범음식점"
          state={raw.mod === 1 ? '지정' : '미지정'}
          tone={raw.mod === 1 ? 'good' : 'none'}
          source="전국모범음식점 표준데이터 (행안부)"
        />
        <EvalRow
          label="위생관리 평가"
          state={raw.evalGrade && raw.evalGrade.length > 0 ? raw.evalGrade : '미평가'}
          tone={evalTone(raw.evalGrade)}
          source="식약처 위생관리 평가 (I1540)"
        />
        <EvalRow
          label="행정처분"
          state={raw.pun === 0 ? '이력 없음' : `${raw.pun}건`}
          tone={raw.pun === 0 ? 'good' : raw.hygieneViolation ? 'warn' : 'caution'}
          source="식약처 I2630 + AI 분류 (claude-opus-4-7)"
          punishList={punishList}
          punishReasons={punishReasons}
          hygieneViolation={!!raw.hygieneViolation}
          isLast
        />
      </View>
    </Card>
  );
}

function EvalRow({
  label,
  state,
  tone,
  source,
  note,
  punishList,
  punishReasons,
  hygieneViolation,
  isLast,
}: {
  label: string;
  state: string;
  tone: EvalTone;
  source: string;
  note?: string;
  punishList?: string[];
  punishReasons?: string[];
  hygieneViolation?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.evalRow, !isLast && styles.evalRowDivider]}>
      <View style={styles.evalRowHeader}>
        <Text style={styles.evalRowLabel}>{label}</Text>
        <Text style={[styles.evalRowState, { color: EVAL_TONE_FG[tone] }]}>{state}</Text>
      </View>
      <Text style={styles.evalRowSource}>{source}</Text>
      {note ? <Text style={styles.evalRowNote}>{note}</Text> : null}

      {punishList && punishList.length > 0 ? (
        <View style={styles.evalPunishList}>
          {punishList.map((t, i) => (
            <View key={i} style={styles.evalPunishRow}>
              <Icon name="minus" size={12} color={color.status.danger} />
              <Text style={styles.evalPunishType}>{t}</Text>
              {punishReasons && punishReasons[i] ? (
                <Text style={styles.evalPunishReason} numberOfLines={2}>
                  · {punishReasons[i]}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {hygieneViolation ? (
        <View style={styles.evalHygieneFlag}>
          <Icon name="warning" size={12} color={color.status.danger} />
          <Text style={styles.evalHygieneFlagText}>AI 분류: 식품 위생 직결 위반</Text>
        </View>
      ) : null}
    </View>
  );
}

function AIMenuGuideCard({ guide }: { guide: import('@/constants/MockData').MenuGuide }) {
  return (
    // 메뉴 가이드는 그림자 있는 떠보이는 카드 — 다른 정보 카드와 톤 차별화로 시선 집중.
    // 하단 여백 0 — 바로 아래 탭 바와 가깝게 붙여 그룹핑.
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
    </Card>
  );
}

function AdminActionsCard({ actions }: { actions: import('@/constants/MockData').AdminAction[] }) {
  return (
    <Card variant="flat" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
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
  );
}

function ReviewTab({
  restaurant,
  isOwner,
  ownerUserId,
}: {
  restaurant: Restaurant;
  isOwner: boolean;
  ownerUserId: number | null;
}) {
  const kakaoUser = useKakaoUser();
  const myReviews = useMyReviewsFor(restaurant.id);
  const allMyReviews = useMyReviews();
  const myNickname = kakaoUser?.nickname ?? '나';

  const handleDelete = (id: string) => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (!window.confirm('이 리뷰를 삭제할까요?')) return;
    }
    removeReview(id);
  };

  return (
    <View>
      {/* 사용자 리뷰 통합 카드 — 별점·리뷰 수 + 작성 CTA(또는 카카오 로그인/사장님 안내) */}
      <UserReviewCard restaurantId={restaurant.id} isOwner={isOwner} />

      {myReviews.map((rv) => (
        <ReviewCardWithReply
          key={rv.id}
          reviewId={rv.id}
          isOwner={isOwner}
          ownerUserId={ownerUserId}>
          {(reply, canReply) => (
            <HygieneReviewCard
              review={rv}
              nickname={myNickname}
              totalReviews={allMyReviews.length}
              onDelete={() => handleDelete(rv.id)}
              reply={reply}
              canReply={canReply}
              onSubmitReply={(body) => ownerUserId && setReviewReply(rv.id, ownerUserId, body)}
              onRemoveReply={() => removeReviewReply(rv.id)}
            />
          )}
        </ReviewCardWithReply>
      ))}
    </View>
  );
}

// 사용자 리뷰 헤더 + 메타 + 작성 CTA를 하나의 카드로 통합.
// 리뷰 개수는 useReviewsFor 단일 원본 → 홈 탭의 UserScoreCard와 항상 일치.
function UserReviewCard({
  restaurantId,
  isOwner,
}: {
  restaurantId: string;
  isOwner: boolean;
}) {
  const reviews = useReviewsFor(restaurantId);
  const impact = useMemo(() => computeReviewImpact(reviews), [reviews]);
  const kakaoUser = useKakaoUser();
  const loggedIn = !!kakaoUser;
  const has = impact.reviewCount > 0;

  return (
    <Card variant="flat" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
      <View style={styles.reviewCardHeader}>
        <Text style={styles.reviewCardTitle}>사용자 리뷰</Text>
        {has ? (
          <View style={styles.starPill}>
            <Icon name="star" size={12} color={color.cheese.GOLDEN.fg} />
            <Text style={styles.starPillText}>{impact.rawAvg.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.reviewCardSubtitle}>
        리뷰 {impact.reviewCount}건
        {impact.foreignTotal > 0 ? ` · 이물질 신고 ${impact.foreignTotal}건` : ''}
      </Text>

      {impact.foreignTotal > 0 ? (
        <View style={styles.foreignBanner}>
          <Icon name="warning" size={14} color={color.status.danger} />
          <Text style={styles.foreignBannerText}>
            이물질 신고 {impact.foreignTotal}건 — 등급에는 영향 없음
          </Text>
        </View>
      ) : null}

      <View style={styles.reviewCardDivider} />

      {isOwner ? (
        <View style={styles.ownerNoticeRow}>
          <Icon name="logo" size={14} color={color.brand.primary} />
          <Text style={styles.ownerNoticeText}>
            내 가게에는 리뷰를 작성할 수 없어요. 답글로 고객 피드백에 응대해 주세요.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.composeRow}>
            <View style={styles.ctaIconWrap}>
              <Icon name="pencil" size={20} color={color.brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.composeTitle}>위생 리뷰 남기기</Text>
              <Text style={styles.composeHint}>
                {loggedIn
                  ? '다녀온 곳의 주방·식기·재료 상태를 알려주세요'
                  : '리뷰는 책임을 위해 로그인이 필요해요'}
              </Text>
            </View>
          </View>
          <View style={{ marginTop: spacing.m }}>
            <Button
              variant={loggedIn ? 'primary' : 'kakao'}
              size="md"
              fullWidth
              leftIcon={loggedIn ? 'pencil' : 'chat'}
              onPress={() => {
                if (loggedIn) {
                  router.push(`/review/${restaurantId}`);
                } else {
                  if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.setItem('food-detector:pending-review', restaurantId);
                  }
                  loginWithKakao();
                }
              }}>
              {loggedIn ? '리뷰 작성하기' : '카카오로 로그인'}
            </Button>
          </View>
        </>
      )}
    </Card>
  );
}

// 사용자 리뷰 카드 + 사장님 답글 wiring 헬퍼
function ReviewCardWithReply({
  reviewId,
  isOwner,
  ownerUserId,
  children,
}: {
  reviewId: string;
  isOwner: boolean;
  ownerUserId: number | null;
  children: (reply: ReturnType<typeof useReviewReply>, canReply: boolean) => React.ReactElement;
}) {
  const reply = useReviewReply(reviewId);
  const canReply = isOwner && ownerUserId != null;
  return children(reply, canReply);
}

// mock review (시연용 하드코딩 리뷰) 카드 — 사장님 답글 지원
function MockReviewCard({
  rv,
  authorCount,
  isOwner,
  ownerUserId,
}: {
  rv: import('@/constants/MockData').Review;
  authorCount: number;
  isOwner: boolean;
  ownerUserId: number | null;
}) {
  const reply = useReviewReply(rv.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const canReply = isOwner && ownerUserId != null;

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewAuthor} numberOfLines={1}>{rv.author}</Text>
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
        <Text style={styles.reviewMeta}>리뷰 {authorCount}건</Text>
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

      {/* 사장님 답글 영역 */}
      {editing ? (
        <View style={styles.replyEditBox}>
          <View style={styles.replyHeaderRow}>
            <View style={styles.replyOwnerBadge}>
              <Icon name="logo" size={10} color={color.text.onBrand} />
              <Text style={styles.replyOwnerBadgeText}>사장님</Text>
            </View>
            <Text style={styles.replyEditHint}>답글 작성</Text>
          </View>
          <TextInput
            value={draft}
            onChangeText={(t) => setDraft(t.slice(0, 300))}
            placeholder="고객님께 정중하게 답변해 주세요"
            placeholderTextColor={color.text.tertiary}
            multiline
            style={styles.replyInputArea}
            accessibilityLabel="사장님 답글 입력"
          />
          <View style={styles.replyEditActions}>
            <Pressable
              onPress={() => setEditing(false)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.replyCancelBtn, pressed && { opacity: 0.6 }]}>
              <Text style={styles.replyCancelText}>취소</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!ownerUserId || !draft.trim()) return;
                setReviewReply(rv.id, ownerUserId, draft.trim());
                setEditing(false);
              }}
              disabled={!draft.trim()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.replySaveBtn,
                !draft.trim() && { opacity: 0.4 },
                pressed && draft.trim() ? { opacity: 0.85 } : null,
              ]}>
              <Text style={styles.replySaveText}>{reply ? '수정' : '등록'}</Text>
            </Pressable>
          </View>
        </View>
      ) : reply ? (
        <View style={styles.replyShowBox}>
          <View style={styles.replyHeaderRow}>
            <View style={styles.replyOwnerBadge}>
              <Icon name="logo" size={10} color={color.text.onBrand} />
              <Text style={styles.replyOwnerBadgeText}>사장님 답글</Text>
            </View>
            {canReply ? (
              <View style={styles.replyShowActions}>
                <Pressable
                  onPress={() => { setDraft(reply.body); setEditing(true); }}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="답글 수정"
                  style={({ pressed }) => [styles.replyMiniBtn, pressed && { opacity: 0.5 }]}>
                  <Icon name="pencil" size={11} color={color.text.tertiary} />
                </Pressable>
                <Pressable
                  onPress={() => removeReviewReply(rv.id)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="답글 삭제"
                  style={({ pressed }) => [styles.replyMiniBtn, pressed && { opacity: 0.5 }]}>
                  <Icon name="close" size={11} color={color.text.tertiary} />
                </Pressable>
              </View>
            ) : null}
          </View>
          <Text style={styles.replyShowBody}>{reply.body}</Text>
        </View>
      ) : canReply ? (
        <Pressable
          onPress={() => { setDraft(''); setEditing(true); }}
          accessibilityRole="button"
          accessibilityLabel="답글 달기"
          style={({ pressed }) => [styles.replyPromptBtn, pressed && { opacity: 0.7 }]}>
          <Icon name="chat" size={12} color={color.brand.primary} />
          <Text style={styles.replyPromptText}>사장님 답글 달기</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function InfoTab({
  restaurant,
  isOwner,
  onEditPress,
  onComposePost,
  ownerUserId,
  ownerName,
}: {
  restaurant: Restaurant;
  isOwner: boolean;
  onEditPress: () => void;
  onComposePost: () => void;
  ownerUserId: number | null;
  ownerName: string;
}) {
  const ownerEdit = useOwnerEditFor(restaurant.id);
  const posts = useOwnerPostsFor(restaurant.id);

  // raw + 사장님 수정값 합성. 빈 문자열은 raw 유지.
  const address = ownerEdit?.address || restaurant.address;
  const phone = ownerEdit?.phone || restaurant.phone;
  const hours = ownerEdit?.hours || restaurant.hours;
  const closedDay = ownerEdit?.closedDay || restaurant.closedDay;
  const intro = ownerEdit?.intro || '';
  const isEdited = !!ownerEdit && (ownerEdit.address || ownerEdit.phone || ownerEdit.hours || ownerEdit.closedDay || ownerEdit.intro);

  const ownerImpact = useOwnerImpactFor(restaurant.id);
  const ownerActive = ownerImpact.postCount > 0;

  return (
    <View>
      {/* 사장님 인증 통합 카드 — 가게 정보보다 위. 활동량이 가게 신뢰의 동적 시그널 */}
      <Card variant="flat" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
        {/* 헤더 — 다른 카드(평가/사용자 리뷰)와 통일: 좌측 제목 / 우측 상태 pill */}
        <View style={styles.ownerHeader}>
          <Text style={styles.ownerCardTitle}>사장님 인증</Text>
          <View
            style={[
              styles.ownerStatusPill,
              ownerActive ? styles.ownerStatusActive : styles.ownerStatusInactive,
            ]}>
            <Icon
              name={ownerActive ? 'check' : 'dot'}
              size={12}
              color={ownerActive ? color.status.success : color.text.tertiary}
            />
            <Text
              style={[
                styles.ownerStatusText,
                { color: ownerActive ? color.status.success : color.text.tertiary },
              ]}>
              {ownerActive ? '활성' : '대기중'}
            </Text>
          </View>
        </View>

        <Text style={styles.ownerSubtitle}>
          {ownerActive
            ? `최근 30일 청소 인증 ${ownerImpact.postCount}건${
                ownerImpact.totalPostCount > ownerImpact.postCount
                  ? ` · 누적 ${ownerImpact.totalPostCount}건`
                  : ''
              }`
            : '사장님이 직접 올리는 위생·운영 인증 게시글이에요. 게시글이 늘면 등급이 올라가요.'}
        </Text>

        {posts.length === 0 ? (
          <View style={styles.ownerEmpty}>
            <Icon name="chat" size={20} color={color.text.tertiary} />
            <Text style={styles.ownerEmptyText}>
              {isOwner ? '첫 게시글을 올려 가게의 노력을 알려주세요' : '아직 사장님 게시글이 없어요'}
            </Text>
          </View>
        ) : (
          <View style={styles.ownerPostsBlock}>
            {posts.map((p, i) => (
              <View key={p.id} style={i > 0 ? styles.ownerPostSep : null}>
                <OwnerPostCard
                  post={p}
                  authorName={ownerUserId === p.userId ? ownerName : '사장님'}
                  onDelete={
                    ownerUserId === p.userId
                      ? () => {
                          if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
                            if (!window.confirm('이 게시글을 삭제할까요?')) return;
                          }
                          removeOwnerPost(p.id);
                        }
                      : undefined
                  }
                />
              </View>
            ))}
          </View>
        )}

        {isOwner ? (
          <View style={{ marginTop: spacing.m }}>
            <Button variant="primary" size="md" leftIcon="pencil" fullWidth onPress={onComposePost}>
              사장님 게시글 작성
            </Button>
          </View>
        ) : (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/owner/apply',
                params: { id: restaurant.id, name: restaurant.name },
              } as any)
            }
            accessibilityRole="button"
            accessibilityLabel="사장님 인증 신청 안내 보기"
            style={({ pressed }) => [styles.applyLink, pressed && { opacity: 0.7 }]}>
            <Icon name="forward" size={12} color={color.brand.primary} />
            <Text style={styles.applyLinkText}>이 가게 사장님이신가요? 인증 신청 안내</Text>
          </Pressable>
        )}
      </Card>

      {/* 가게 정보 카드 — 정적 기본 정보 (주소·전화·영업·휴무·소개) */}
      <Card variant="flat" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
        <View style={styles.infoHeader}>
          <Text style={styles.cardTitle}>가게 정보</Text>
          {isEdited ? (
            <View style={styles.editedBadge}>
              <Icon name="pencil" size={10} color={color.brand.primary} />
              <Text style={styles.editedBadgeText}>사장님 업데이트</Text>
            </View>
          ) : null}
        </View>
        <InfoRow label="주소" value={address} />
        <InfoRow label="전화" value={phone} />
        <InfoRow label="영업" value={hours} />
        <InfoRow label="휴무" value={closedDay} />

        {intro ? (
          <View style={styles.introBlock}>
            <Text style={styles.introLabel}>사장님 소개</Text>
            <Text style={styles.introText}>{intro}</Text>
          </View>
        ) : null}

        {isOwner ? (
          <View style={{ marginTop: spacing.m }}>
            <Button variant="ghost" size="sm" leftIcon="pencil" onPress={onEditPress}>
              가게 정보 수정
            </Button>
          </View>
        ) : null}
      </Card>
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

// ===== Severity helpers (행정처분 카드용) =====

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

  // 토스 스타일 — 페이지 회색 배경 + 카드 사이 marginBottom으로 자연 spacer.
  // 좌우 최소 마진(16)으로 카드가 가장자리에 붙지 않게.
  scrollContent: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
  },

  // Hero 카드 — 상단 좌우 분할(등급/이름) + 하단 5심볼 그리드. AI 메뉴 가이드와 회색 spacer로 분리.
  heroCard: {
    marginBottom: spacing.l,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.l,
  },
  heroLeft: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 88,
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: color.border.default,
    marginVertical: spacing.m,
  },
  heroCheese: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCheeseRotten: {
    backgroundColor: color.status.dangerSoft,
    borderRadius: radius.l,
  },
  heroGradeLabel: {
    ...typography.captionEmphasized,
    textAlign: 'center',
  },
  heroRight: {
    flex: 1,
    gap: spacing.xxs,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  heroName: {
    ...typography.title,
    fontSize: 20,
    lineHeight: 26,
    color: color.text.primary,
  },
  heroMeta: {
    ...typography.caption,
    color: color.text.secondary,
  },

  // 식탐정 5가지 분석 — 등급 심볼 그리드 헤더
  fiveAxisTitle: { ...typography.headline, color: color.text.primary },
  fiveAxisSubtitle: {
    ...typography.caption,
    color: color.text.secondary,
    marginTop: 2,
  },

  // 카드 안 섹션 제목 (카드 헤더)
  cardSectionTitle: {
    ...typography.title,
    fontSize: 18,
    lineHeight: 24,
    color: color.text.primary,
  },
  cardSectionSubtitle: {
    ...typography.caption,
    color: color.text.secondary,
    marginTop: 2,
  },

  // 평가 카드 안 4개 row (위생등급/모범/평가/처분)
  evalRowList: {
    marginTop: spacing.m,
  },
  evalRow: {
    paddingVertical: spacing.m,
  },
  evalRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border.default,
  },
  evalRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  evalRowLabel: {
    ...typography.subheadlineEmphasized,
    color: color.text.primary,
  },
  evalRowState: {
    ...typography.subheadlineEmphasized,
  },
  evalRowSource: {
    ...typography.footnote,
    color: color.text.tertiary,
    marginTop: 2,
  },
  evalRowNote: {
    ...typography.footnote,
    color: color.text.secondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  evalPunishList: {
    marginTop: spacing.s,
    gap: spacing.xs,
  },
  evalPunishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  evalPunishType: {
    ...typography.caption,
    color: color.text.primary,
    fontWeight: '600',
  },
  evalPunishReason: {
    ...typography.caption,
    color: color.text.secondary,
    flex: 1,
  },
  evalHygieneFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.s,
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
    backgroundColor: color.status.dangerSoft,
    borderRadius: 8,
  },
  evalHygieneFlagText: {
    ...typography.caption,
    color: color.status.danger,
    fontWeight: '600',
  },

  // ROTTEN(트랩 치즈) 사유 카드
  rottenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.s,
  },
  rottenTitle: {
    ...typography.subheadlineEmphasized,
    color: color.status.danger,
  },
  rottenChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },



  // Tabs
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: color.border.default,
    // 배경 없음 — 페이지 회색 배경이 그대로 보임 (탭이 메뉴 가이드 카드와 분리)
    marginTop: 0,
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

  // Info tab
  infoRow: { flexDirection: 'row', paddingVertical: spacing.s },
  infoLabel: { ...typography.caption, color: color.text.tertiary, width: 60 },
  infoValue: { flex: 1, ...typography.caption, color: color.text.secondary },

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

  // 사용자 리뷰 통합 카드
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewCardTitle: { ...typography.headline, color: color.text.primary },
  reviewCardSubtitle: {
    ...typography.caption,
    color: color.text.secondary,
    marginTop: 2,
  },
  starPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: color.cheese.GOLDEN.bg,
  },
  starPillText: {
    ...typography.captionEmphasized,
    color: color.text.primary,
  },
  reviewCardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: color.border.default,
    marginVertical: spacing.m,
  },
  composeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },

  // Review compose CTA
  composeTitle: { ...typography.bodyEmphasized, color: color.text.primary, marginBottom: spacing.xxs },
  composeHint: { ...typography.caption, color: color.text.secondary },
  ctaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34,197,94,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.fill.tertiary,
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
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginBottom: spacing.xs + 2 },
  reviewAuthor: { flexShrink: 1, ...typography.subheadlineEmphasized, color: color.text.primary },
  reviewStarsRow: { flexDirection: 'row', gap: 1 },
  reviewMeta: { ...typography.footnote, color: color.text.secondary },
  reviewDate: { ...typography.footnote, color: color.text.tertiary },
  reviewBody: { ...typography.subheadline, color: color.text.primary, marginBottom: spacing.xs + 2 },
  reviewTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  reviewTag: {
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
    backgroundColor: color.fill.tertiary,
  },
  reviewTagText: { ...typography.footnote, color: color.text.secondary, fontWeight: '500' },
  foreignBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
    borderRadius: radius.s,
    backgroundColor: color.status.dangerSoft,
    marginBottom: spacing.xs + 2,
  },
  foreignBannerText: {
    ...typography.captionEmphasized,
    color: color.status.danger,
  },
  reviewPhoto: {
    width: 72,
    height: 72,
    borderRadius: radius.s,
    backgroundColor: color.fill.quaternary,
  },

  // ===== 사장님 모드 (Top bar 배지·Info·Reply) =====
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: color.brand.primary,
    marginRight: spacing.xs,
  },
  ownerBadgeText: { ...typography.footnote, fontWeight: '700', color: color.text.onBrand, letterSpacing: 0.3 },

  // Info tab — 가게 정보 카드 헤더 + 사장님 섹션
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  editedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    backgroundColor: color.brand.primarySoft,
    borderRadius: radius.pill,
  },
  editedBadgeText: { ...typography.footnote, fontWeight: '700', color: color.brand.primary },
  introBlock: {
    marginTop: spacing.m,
    paddingTop: spacing.m,
    borderTopWidth: 1,
    borderTopColor: color.border.default,
  },
  introLabel: { ...typography.captionEmphasized, color: color.text.secondary, marginBottom: spacing.xs },
  introText: { ...typography.subheadline, color: color.text.primary, lineHeight: 22 },

  ownerNoticeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  ownerNoticeText: { flex: 1, ...typography.caption, color: color.text.secondary },

  // 사장님 인증 통합 카드 — 헤더 + 활성 상태 + 게시글
  ownerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ownerCardTitle: { ...typography.headline, color: color.text.primary },
  ownerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  ownerStatusActive: { backgroundColor: color.status.successSoft },
  ownerStatusInactive: { backgroundColor: color.fill.quaternary },
  ownerStatusText: { ...typography.captionEmphasized },
  ownerSubtitle: {
    ...typography.caption,
    color: color.text.secondary,
    marginTop: 2,
    marginBottom: spacing.m,
  },
  ownerPostsBlock: {
    borderRadius: radius.m,
    overflow: 'hidden',
    backgroundColor: color.fill.quaternary,
  },
  ownerPostSep: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border.default,
  },
  ownerEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.l,
    borderRadius: radius.m,
    backgroundColor: color.fill.tertiary,
  },
  ownerEmptyText: { flex: 1, ...typography.caption, color: color.text.secondary },

  applyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.m,
    paddingVertical: spacing.s,
    alignSelf: 'flex-start',
  },
  applyLinkText: { ...typography.captionEmphasized, color: color.brand.primary },

  // Mock review reply (HygieneReviewCard와 룩 통일)
  replyHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  replyOwnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: color.brand.primary,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  replyOwnerBadgeText: { ...typography.footnote, fontWeight: '700', color: color.text.onBrand },
  replyEditHint: { ...typography.footnote, color: color.text.tertiary, flex: 1 },

  replyShowBox: {
    marginTop: spacing.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: color.brand.primarySoft,
    borderRadius: radius.m,
    gap: spacing.xs,
  },
  replyShowBody: { ...typography.subheadline, color: color.text.primary },
  replyShowActions: { flexDirection: 'row', gap: spacing.xs },
  replyMiniBtn: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: color.surface.subtle,
  },

  replyEditBox: {
    marginTop: spacing.s,
    padding: spacing.m,
    backgroundColor: color.brand.primarySoft,
    borderRadius: radius.m,
    gap: spacing.xs,
  },
  replyInputArea: {
    backgroundColor: color.surface.subtle,
    borderRadius: radius.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    minHeight: 64,
    ...typography.body,
    color: color.text.primary,
    textAlignVertical: 'top',
  },
  replyEditActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs },
  replyCancelBtn: { paddingHorizontal: spacing.m, paddingVertical: spacing.xs + 2 },
  replyCancelText: { ...typography.captionEmphasized, color: color.text.secondary },
  replySaveBtn: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: color.brand.primary,
  },
  replySaveText: { ...typography.captionEmphasized, color: color.text.onBrand },

  replyPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: color.brand.primarySoft,
    alignSelf: 'flex-start',
  },
  replyPromptText: { ...typography.captionEmphasized, color: color.brand.primary },

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
