import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { SpiderChart5 } from '@/components/SpiderChart5';
import { Cheese, Mascots, type MascotKey } from '@/constants/Assets';
import { AxisScore, Grade, Restaurant } from '@/constants/MockData';
import { color, elevation, mascotSize, motion, radius, spacing, typography } from '@/constants/tokens';
import { AnimatedHeart, Button, Card, CheeseBadge, Chip, IconButton, SkeletonCard } from '@/components/ui';
import { findRestaurantById } from '@/utils/dataStore';
import { deriveGrade, toUIRestaurant } from '@/utils/adapter';
import { toggleLike, useIsLiked } from '@/utils/favorites';
import { loginWithKakao, useKakaoUser } from '@/utils/kakaoAuth';
import {
  applyReviewImpact,
  removeReview,
  reviewAxisFromImpact,
  useImpactFor,
  useMyReviews,
  useMyReviewsFor,
} from '@/utils/reviews';
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
      setRestaurant(r ? toUIRestaurant(r) : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // 점수 보정은 모든 사용자 리뷰 (백엔드 집계 시뮬), 표시는 본인 리뷰만 분리
  const reviewImpact = useImpactFor(typeof id === 'string' ? id : null);

  // D축('리뷰 분석')에 사용자 위생 리뷰 반영 + C축('신뢰 인증')에 사장님 게시글 반영
  // 5축 그래프와 합산 점수 일관 유지
  const adjustedAxes = useMemo(() => {
    if (!restaurant) return [];
    let axes = restaurant.axes;
    if (reviewImpact.reviewCount > 0) {
      const reviewAxis = reviewAxisFromImpact(reviewImpact, restaurant.score / 100);
      axes = axes.map((a) => (a.key === 'review' ? { ...a, ...reviewAxis } : a));
    }
    if (ownerImpact.postCount > 0) {
      // C축에 사장님 인증 효과 시각화 — score는 25 max 안에서 비례 가산
      axes = axes.map((a) => {
        if (a.key !== 'trust') return a;
        const boost = Math.min(25 - a.score, ownerImpact.delta);
        const newScore = Math.min(a.max, a.score + boost);
        return { ...a, score: newScore, rating: '사장님 인증', tone: 'green' as const };
      });
    }
    return axes;
  }, [restaurant, reviewImpact, ownerImpact]);

  // 점수는 raw 사전 계산 + 리뷰 delta + 사장님 delta. 지도·좋아요와 동일 산식.
  const adjustedScore = restaurant
    ? Math.max(0, Math.min(100, applyReviewImpact(restaurant.score, reviewImpact) + ownerImpact.delta))
    : 0;
  const adjustedGrade = useMemo(() => deriveGrade(adjustedScore), [adjustedScore]);
  const impactDelta = restaurant ? adjustedScore - restaurant.score : 0;

  if (loading) return <LoadingState />;
  if (!restaurant) return <NotFoundState />;

  const mascot = MASCOT_BY_GRADE[adjustedGrade];
  const cheeseFg = color.cheese[adjustedGrade].fg;

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

        {/* 1. 검사 결과 종합 카드 — 점수와 등급에 시선 집중 */}
        <Card variant="elevated" padding="xl" radius="xl" style={styles.summaryCard}>
          <Image source={Mascots[mascot]} style={styles.summaryMascot} resizeMode="contain" />
          <Text style={styles.summaryLabel}>검사 결과 종합</Text>
          <View style={styles.summaryScoreRow}>
            <Text style={[styles.summaryScore, { color: cheeseFg }]}>{adjustedScore}</Text>
            <Text style={styles.summaryScoreUnit}>/ 100점</Text>
          </View>
          {(reviewImpact.reviewCount > 0 || ownerImpact.postCount > 0) && (
            <View style={styles.summaryDeltaWrap}>
              <Text
                style={[
                  styles.summaryDelta,
                  { color: impactDelta > 0
                      ? color.status.success
                      : impactDelta < 0
                        ? color.status.danger
                        : color.text.secondary },
                ]}>
                {impactDelta > 0 ? '+' : ''}{impactDelta}점 — {
                  reviewImpact.reviewCount > 0 && ownerImpact.postCount > 0
                    ? `위생 리뷰 ${reviewImpact.reviewCount}건·사장님 ${ownerImpact.postCount}건 반영`
                    : reviewImpact.reviewCount > 0
                      ? `위생 리뷰 ${reviewImpact.reviewCount}건 반영`
                      : `사장님 인증 ${ownerImpact.postCount}건 반영`
                }
              </Text>
              <Text style={styles.summaryDeltaSub}>
                {reviewImpact.reviewCount > 0
                  ? `별점 ${reviewImpact.rawAvg.toFixed(1)}${reviewImpact.foreignReports > 0 ? ` · 이물질 ${reviewImpact.foreignTotal}건` : ''}`
                  : ''}
                {reviewImpact.reviewCount > 0 && ownerImpact.postCount > 0 ? ' · ' : ''}
                {ownerImpact.postCount > 0 ? `사장님 ${ownerImpact.postCount}건 (+${ownerImpact.delta})` : ''}
                {' · 기본 '}{restaurant.score}점
              </Text>
            </View>
          )}
          <CheeseBadge grade={adjustedGrade} size="md" showLabel style={styles.summaryBadge} />
        </Card>

        {/* 2. 음식점 명 + 카테고리 — 가운데 정렬, 좋아요는 이름 옆 */}
        {/* 관리자는 가게명 long-press로 사장님 지정 모달 진입 (숨김 입구 — 일반 사용자에게 보이지 않음) */}
        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <Pressable
              onLongPress={() => { if (isAdmin) setGrantOpen(true); }}
              delayLongPress={600}
              accessibilityRole={isAdmin ? 'button' : undefined}
              accessibilityLabel={isAdmin ? '관리자 — 길게 눌러 사장님 지정' : undefined}>
              <Text style={styles.nameCenter} numberOfLines={2}>{restaurant.name}</Text>
            </Pressable>
            <AnimatedHeart
              active={liked}
              size={22}
              hitSize={36}
              onPress={() => restaurant && toggleLike(restaurant.id)}
            />
          </View>
          <Text style={styles.categoryCenter}>{restaurant.category}</Text>
        </View>

        {/* 3. 위치 정보 — 자치구만 표시 (영업주기 데이터 없음) */}
        <View style={styles.locationBlock}>
          <Icon name="location" size={14} color={color.text.secondary} />
          <Text style={styles.locationText}>{restaurant.district}</Text>
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
        {tab === '평가' && (
          <SummaryTab
            restaurant={restaurant}
            axes={adjustedAxes}
            baseScore={restaurant.score}
            adjustedScore={adjustedScore}
            impactDelta={impactDelta}
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

function SummaryTab({
  restaurant,
  axes,
  baseScore,
  adjustedScore,
  impactDelta,
}: {
  restaurant: Restaurant;
  axes: AxisScore[];
  baseScore: number;
  adjustedScore: number;
  impactDelta: number;
}) {
  return (
    <View>
      <AIMenuGuideCard guide={restaurant.menuGuide} />

      <Card variant="elevated" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
        <Text style={styles.cardTitle}>식탐정 평가 요약</Text>
        <View style={{ alignItems: 'center', marginTop: spacing.m }}>
          <SpiderChart5
            axes={axes.map((a) => ({
              key: a.key,
              label: a.label,
              score: a.score,
              max: a.max,
            }))}
            size={240}
            centerLabel={`${adjustedScore}점`}
          />
        </View>
        {impactDelta !== 0 && (
          <View style={styles.scoreFlow}>
            <View style={styles.scoreFlowItem}>
              <Text style={styles.scoreFlowLabel}>5축 합산</Text>
              <Text style={styles.scoreFlowValue}>{baseScore}점</Text>
            </View>
            <Icon name="forward" size={14} color={color.text.tertiary} />
            <View style={styles.scoreFlowItem}>
              <Text style={styles.scoreFlowLabel}>리뷰 보정</Text>
              <Text
                style={[
                  styles.scoreFlowValue,
                  { color: impactDelta > 0 ? color.status.success : color.status.danger },
                ]}>
                {impactDelta > 0 ? '+' : ''}{impactDelta}점
              </Text>
            </View>
            <Icon name="forward" size={14} color={color.text.tertiary} />
            <View style={styles.scoreFlowItem}>
              <Text style={styles.scoreFlowLabel}>종합</Text>
              <Text style={[styles.scoreFlowValueEmphasis]}>{adjustedScore}점</Text>
            </View>
          </View>
        )}
      </Card>

      <Text style={styles.sectionTitle}>식탐정 평가 상세</Text>
      <Card variant="elevated" padding="none" radius="l">
        {axes.map((a, i) => (
          <AxisRow key={a.key} axis={a} index={i} showDivider={i < axes.length - 1} />
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

function ReviewComposeCTA({ restaurantId }: { restaurantId: string }) {
  const kakaoUser = useKakaoUser();
  const loggedIn = !!kakaoUser;
  return (
    <Card variant="elevated" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }}>
        <View style={styles.ctaIconWrap}>
          <Icon name="pencil" size={22} color={color.brand.primary} />
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
  const totalCount = restaurant.reviewCount + myReviews.length;
  const hygieneCount = restaurant.hygieneReviewCount + myReviews.length;
  const myNickname = kakaoUser?.nickname ?? '나';

  const handleDelete = (id: string) => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (!window.confirm('이 리뷰를 삭제할까요?')) return;
    }
    removeReview(id);
  };

  // mock author별 리뷰 수 (이 식당 내에서)
  const mockAuthorCount = new Map<string, number>();
  for (const rv of restaurant.reviews) {
    mockAuthorCount.set(rv.author, (mockAuthorCount.get(rv.author) ?? 0) + 1);
  }

  return (
    <View>
      {isOwner ? (
        <Card variant="tinted" padding="m" radius="l" style={{ marginBottom: spacing.l }}>
          <View style={styles.ownerNoticeRow}>
            <Icon name="logo" size={14} color={color.brand.primary} />
            <Text style={styles.ownerNoticeText}>
              내 가게에는 리뷰를 작성할 수 없어요. 답글로 고객 피드백에 응대해 주세요.
            </Text>
          </View>
        </Card>
      ) : (
        <ReviewComposeCTA restaurantId={restaurant.id} />
      )}

      <View style={styles.reviewSummary}>
        <Text style={styles.reviewCount}>총 {totalCount}건</Text>
        <Text style={styles.reviewHygiene}>위생 리뷰 {hygieneCount}건</Text>
      </View>

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

      {restaurant.reviews.map((rv) => (
        <MockReviewCard
          key={rv.id}
          rv={rv}
          authorCount={mockAuthorCount.get(rv.author) ?? 1}
          isOwner={isOwner}
          ownerUserId={ownerUserId}
        />
      ))}
    </View>
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

  return (
    <View>
      {/* 가게 정보 카드 */}
      <Card variant="outlined" padding="l" radius="l">
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

      {/* 사장님 인증 게시글 섹션 */}
      <View style={styles.ownerSection}>
        <View style={styles.ownerSectionHeader}>
          <View style={styles.ownerSectionTitleRow}>
            <View style={styles.ownerSectionBadge}>
              <Icon name="logo" size={11} color={color.text.onBrand} />
              <Text style={styles.ownerSectionBadgeText}>사장님</Text>
            </View>
            <Text style={styles.ownerSectionTitle}>가게가 들려주는 이야기</Text>
          </View>
          <Text style={styles.ownerSectionSubtitle}>
            사장님이 직접 올리는 위생·운영 인증 게시글이에요. 게시글이 늘면 신뢰 점수에 +가산.
          </Text>
        </View>

        {posts.length === 0 ? (
          <View style={styles.ownerEmpty}>
            <Icon name="chat" size={20} color={color.text.tertiary} />
            <Text style={styles.ownerEmptyText}>
              {isOwner
                ? '첫 게시글을 올려 가게의 노력을 알려주세요'
                : '아직 사장님 게시글이 없어요'}
            </Text>
          </View>
        ) : (
          <Card variant="outlined" padding="none" radius="l">
            {posts.map((p, i) => (
              <View key={p.id} style={i === 0 ? styles.ownerPostFirst : null}>
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
          </Card>
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
      </View>
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
  summaryDeltaWrap: {
    marginTop: spacing.xxs,
    alignItems: 'center',
    gap: 2,
  },
  scoreFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    marginTop: spacing.m,
    paddingTop: spacing.m,
    borderTopWidth: 1,
    borderTopColor: color.border.default,
  },
  scoreFlowItem: { alignItems: 'center', gap: 2 },
  scoreFlowLabel: { ...typography.caption, color: color.text.tertiary },
  scoreFlowValue: { ...typography.subheadlineEmphasized, color: color.text.primary },
  scoreFlowValueEmphasis: { ...typography.bodyEmphasized, color: color.brand.primary },
  summaryDelta: {
    ...typography.captionEmphasized,
  },
  summaryDeltaSub: {
    ...typography.caption,
    color: color.text.tertiary,
    textAlign: 'center',
  },
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

  ownerSection: { marginTop: spacing.xl },
  ownerSectionHeader: { marginBottom: spacing.m },
  ownerSectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginBottom: spacing.xxs },
  ownerSectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: color.brand.primary,
  },
  ownerSectionBadgeText: { ...typography.footnote, fontWeight: '700', color: color.text.onBrand, letterSpacing: 0.3 },
  ownerSectionTitle: { ...typography.headline, color: color.text.primary },
  ownerSectionSubtitle: { ...typography.caption, color: color.text.secondary },

  ownerEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.l,
    borderRadius: radius.l,
    backgroundColor: color.fill.tertiary,
  },
  ownerEmptyText: { flex: 1, ...typography.caption, color: color.text.secondary },
  ownerPostFirst: { borderTopWidth: 0 },

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
