// 지도 탭에서 마커 클릭 시 노출되는 바텀시트.
// 캐치테이블/네이버 지도 패턴 — 작은 카드 ↔ 큰 카드(요약+점수 결과) 스냅.
// 더 자세한 정보는 "상세 보고서 보기" 버튼으로 /restaurant/[id]로 이동.

import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Icon } from '@/components/Icon';
import { Cheese } from '@/constants/Assets';
import { HygieneGuideModal } from '@/components/HygieneGuideModal';
import { Restaurant as DataRestaurant, GradeKey, RiskTag } from '@/constants/Restaurant';
import { color, radius, spacing, typography } from '@/constants/tokens';
import { deriveGrade, toUIRestaurant } from '@/utils/adapter';
import { useIsLiked, toggleLike } from '@/utils/favorites';
import { AnimatedHeart, Chip } from '@/components/ui';
import { BottomSheetSymbols } from '@/components/score/BottomSheetSymbols';
import { useOwnerImpactFor } from '@/utils/owner';
import { computeReviewImpact, useReviewsFor } from '@/utils/reviews';
import { totalScoreOf } from '@/utils/scoring';

interface Props {
  /** 선택된 식당 (null이면 시트 닫힘) */
  restaurant: DataRestaurant | null;
  /** 시트 닫기 콜백 */
  onClose?: () => void;
}

export type RestaurantBottomSheetHandle = {
  expand: () => void;
  collapse: () => void;
  close: () => void;
};

// 2단계: 작은 카드 / 중간 확장(점수 구성 + CTA). 상세는 CTA 버튼으로 접근
const SNAP_POINTS = ['16%', '30%'];

const RISK_LABEL: Partial<Record<RiskTag, string>> = {
  raw_fish: '날생선 취급',
  raw_meat: '육회·생고기',
  shellfish_raw: '생굴·조개',
  egg_raw: '날달걀',
  fugu: '복어 취급',
  raw_chicken: '닭회',
};

// 등급별 표시 메타. 치즈 갯수 + 라벨. (한줄평은 buildSignalPhrase로 동적 생성)
const GRADE_META: Record<GradeKey, { count: number; label: string }> = {
  GOLDEN: { count: 3, label: '골드 치즈' },
  SILVER: { count: 2, label: '실버 치즈' },
  BRONZE: { count: 1, label: '브론즈 치즈' },
  ROTTEN: { count: 0, label: '트랩 치즈' },
};

// 시그널 기반 한줄평. 시그널이 없으면 null — phrase 영역 자체 미노출.
// 우선순위: 부정 시그널 > 복합 긍정 > 단일 긍정 > 평가 등급 > 약한 부정
type Phrase = { text: string; tone: 'success' | 'danger' | 'warning' | 'neutral' };
function buildSignalPhrase(r: DataRestaurant): Phrase | null {
  if (r.hygieneViolation) return { text: '식약처 위생 직결 위반 이력', tone: 'danger' };

  const hyg = r.hyg === 1;
  const mod = r.mod === 1;
  if (hyg && mod) return { text: '위생등급 지정 + 모범음식점', tone: 'success' };
  if (hyg) return { text: '식약처 위생등급 지정업소', tone: 'success' };
  if (mod) return { text: '모범음식점 지정', tone: 'success' };

  if ((r.pun ?? 0) > 0) {
    const firstPunish = (r.punishTypes ?? '').split('|').filter(Boolean)[0];
    return {
      text: firstPunish ? `${firstPunish} 이력 있음` : '행정처분 이력 있음',
      tone: 'warning',
    };
  }

  return null;
}

const PHRASE_TONE_STYLE: Record<Phrase['tone'], { bg: string; fg: string; icon: 'logo' | 'warning' | 'alert' | 'check' }> = {
  success: { bg: 'rgba(34,197,94,0.10)',  fg: '#16A34A', icon: 'logo' },
  danger:  { bg: 'rgba(255,59,48,0.10)',  fg: '#DC2626', icon: 'warning' },
  warning: { bg: 'rgba(255,149,0,0.10)',  fg: '#B45309', icon: 'alert' },
  neutral: { bg: 'rgba(120,120,128,0.10)', fg: '#475569', icon: 'check' },
};


export const RestaurantBottomSheet = forwardRef<RestaurantBottomSheetHandle, Props>(
  function RestaurantBottomSheet({ restaurant, onClose }, ref) {
    const sheetRef = useRef<BottomSheet>(null);
    const liked = useIsLiked(restaurant?.id);
    const [guideTag, setGuideTag] = useState<RiskTag | null>(null);

    useImperativeHandle(ref, () => ({
      expand: () => sheetRef.current?.snapToIndex(1),
      collapse: () => sheetRef.current?.snapToIndex(0),
      close: () => sheetRef.current?.close(),
    }));

    // restaurant 변경되면 시트 열기 (인덱스 0=collapsed)
    React.useEffect(() => {
      if (restaurant) sheetRef.current?.snapToIndex(0);
      else sheetRef.current?.close();
    }, [restaurant?.id]);

    const ui = useMemo(() => (restaurant ? toUIRestaurant(restaurant) : null), [restaurant]);

    // 동적 점수: 사장님 인증 + 사용자 리뷰 → 종합 점수·등급 갱신.
    // 지도 마커 색상은 raw.grade 기준이지만 시트는 동적 등급으로 라벨/색 노출.
    const ownerImpact = useOwnerImpactFor(restaurant?.id ?? null);
    const reviews = useReviewsFor(restaurant?.id ?? null);
    const reviewImpact = useMemo(() => computeReviewImpact(reviews), [reviews]);

    const dataScore = restaurant?.dataScore ?? 0;
    const adjustedScore = restaurant
      ? totalScoreOf(dataScore, ownerImpact.delta, reviewImpact.userScore)
      : 0;
    const adjustedGrade: GradeKey = restaurant
      ? deriveGrade({
          score: adjustedScore,
          flags: {
            punishTypes: restaurant.punishTypes,
            hygieneViolation: restaurant.hygieneViolation,
          },
          userScore: reviewImpact.userScore,
          userReviewCount: reviewImpact.reviewCount,
        }) as GradeKey
      : 'BRONZE';

    // 단일 BottomSheet 인스턴스를 항상 마운트해두고 contents만 조건부.
    // 이전엔 if-early-return으로 두 BottomSheet를 분기 렌더했는데, restaurant 토글 시
    // 한쪽이 unmount → onClose fire → setSelected(null) 사이클로 시트가 떴다 사라짐.
    const cheeseFg = color.cheese[adjustedGrade]?.fg ?? color.text.primary;
    const meta = GRADE_META[adjustedGrade] ?? GRADE_META.BRONZE;
    const cheeseImg = adjustedGrade === 'GOLDEN' ? Cheese.gold
      : adjustedGrade === 'SILVER' ? Cheese.silver
      : adjustedGrade === 'BRONZE' ? Cheese.bronze
      : null; // ROTTEN — 치즈 이미지 X (텍스트 라벨로 표시)

    const goDetail = () => { if (restaurant) router.push(`/restaurant/${restaurant.id}` as any); };
    const risks = restaurant?.riskTags ?? [];

    // ROTTEN(트랩 치즈) 사유 — 50점 미만 + 과락 충족 시 노출
    const rottenReasons: string[] = [];
    if (adjustedGrade === 'ROTTEN' && restaurant) {
      if (restaurant.hygieneViolation) rottenReasons.push('위생 직결 위반');
      if (reviewImpact.reviewCount >= 10 && reviewImpact.userScore <= 10) {
        rottenReasons.push('사용자 평점 낮음');
      }
    }

    // 시그널 기반 한줄평 — 시그널 없으면 null. ROTTEN은 사유 칩이 더 자세해 phrase 생략.
    const phrase: Phrase | null = restaurant && adjustedGrade !== 'ROTTEN'
      ? buildSignalPhrase(restaurant)
      : null;
    const phraseStyle = phrase ? PHRASE_TONE_STYLE[phrase.tone] : PHRASE_TONE_STYLE.neutral;

    return (
      <>
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={SNAP_POINTS}
        enablePanDownToClose
        onClose={onClose}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.bg}
      >
        <BottomSheetView style={styles.content}>
          {!restaurant || !ui ? null : (<>
          {/* === 작은 카드 영역 (모든 스냅에서 보임) === */}
          {/* 가게 이름 + 좋아요 (최상단) */}
          <View style={styles.headerRow}>
            <Text style={styles.name} numberOfLines={2}>{restaurant.name}</Text>
            <AnimatedHeart
              active={liked}
              size={22}
              hitSize={36}
              onPress={() => toggleLike(restaurant.id)}
            />
          </View>

          {/* 메타 — 영업중 여부는 실시간 데이터 부재로 표기하지 않음 */}
          <View style={styles.metaRow}>
            <Text style={styles.subtitle} numberOfLines={1}>
              {restaurant.cat} · {ui.district}
            </Text>
          </View>

          {/* 등급 — 치즈 이미지 + 라벨 (점수는 내부 산정 수단, 미노출) */}
          <View style={styles.scoreRow}>
            {cheeseImg ? (
              <Image source={cheeseImg} style={styles.cheeseIcon} resizeMode="contain" />
            ) : (
              <Icon name="warning" size={16} color={cheeseFg} />
            )}
            <Text style={[styles.score, { color: cheeseFg }]}>{meta.label}</Text>
          </View>

          {/* 시그널 기반 한줄평 — 시그널 없거나 ROTTEN(아래 사유 칩으로 대체)이면 미노출 */}
          {phrase ? (
            <View style={[styles.phraseRow, { backgroundColor: phraseStyle.bg }]}>
              <View style={[styles.phraseDot, { backgroundColor: phraseStyle.fg }]}>
                <Icon name={phraseStyle.icon} size={12} color={'#fff'} />
              </View>
              <Text style={[styles.phrase, { color: phraseStyle.fg }]}>{phrase.text}</Text>
            </View>
          ) : null}

          {/* === 중간 확장 — 5심볼 (등급 강조) === */}
          <View style={styles.divider} />

          <Text style={styles.axisTitle}>식탐정 5가지 분석</Text>

          <View style={styles.scoreBarBlock}>
            <BottomSheetSymbols
              input={{
                hygieneDesignated: restaurant.hyg === 1,
                hygieneViolation: !!restaurant.hygieneViolation,
                punishCount: restaurant.pun ?? 0,
                punishTypes: restaurant.punishTypes,
                hasModel: restaurant.mod === 1,
                ownerDelta: ownerImpact.delta,
                ownerPostCount: ownerImpact.postCount,
                reviewCount: reviewImpact.reviewCount,
                reviewAvg: reviewImpact.rawAvg,
                foreignTotal: reviewImpact.foreignTotal,
              }}
            />
          </View>

          {/* ROTTEN 사유 칩 */}
          {rottenReasons.length > 0 && (
            <View style={styles.rottenReasonRow}>
              {rottenReasons.map((r) => (
                <Chip key={r} variant="info" size="sm" tone="danger">{r}</Chip>
              ))}
            </View>
          )}

          {/* 위험 태그 — 클릭하면 위생 가이드 모달 */}
          {risks.length > 0 && (
            <View style={styles.tagsBlock}>
              {risks.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setGuideTag(t)}
                  accessibilityRole="button"
                  accessibilityLabel={`${RISK_LABEL[t] ?? t} 위생 가이드 보기`}
                  style={({ pressed }) => [styles.tag, styles.tagRisk, pressed && { opacity: 0.7 }]}>
                  <Icon name="warning" size={12} color={color.status.danger} />
                  <Text style={styles.tagRiskText}>{RISK_LABEL[t] ?? t}</Text>
                  <Icon name="forward" size={11} color={color.status.danger} />
                </Pressable>
              ))}
            </View>
          )}

          {/* 상세 보고서 CTA */}
          <Pressable
            onPress={goDetail}
            accessibilityRole="button"
            accessibilityLabel="상세 보고서 보기"
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}>
            <Text style={styles.ctaText}>상세 보고서 보기</Text>
            <Icon name="forward" size={16} color={color.surface.subtle} />
          </Pressable>
          </>)}
        </BottomSheetView>
      </BottomSheet>
      <HygieneGuideModal tag={guideTag} onClose={() => setGuideTag(null)} />
      </>
    );
  }
);

const styles = StyleSheet.create({
  bg: { backgroundColor: color.surface.subtle, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl },
  handle: { backgroundColor: color.border.default, width: 40, height: 4 },
  content: {
    flex: 1,
    paddingHorizontal: spacing.l,
    paddingTop: 0,
    paddingBottom: spacing.s,
  },

  // ===== 헤더: 이름 + 좋아요 (최상단) =====
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.s,
  },
  // 가게 이름이 최상단·prominent — 18pt + 700
  name: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: color.text.primary,
    flex: 1,
  },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  cheeseIcon: { width: 18, height: 18 },
  // 점수는 이름보다 작게
  score: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  subtitle: { ...typography.footnote, color: color.text.secondary },
  openDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#22C55E', marginLeft: 2 },
  openText: { ...typography.caption, color: '#22C55E', fontWeight: '600' },

  // ===== 한줄평 (시그널 기반, tone에 따라 색은 inline로 덮어씀) =====
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: radius.m,
    alignSelf: 'flex-start',
  },
  phraseDot: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  phrase: { ...typography.footnote, fontWeight: '600' },

  // ===== divider =====
  divider: {
    height: 1, backgroundColor: color.border.default,
    marginVertical: spacing.m,
  },

  // ===== 점수 구성 (50/25/25) =====
  axisTitle: {
    ...typography.subheadlineEmphasized,
    color: color.text.primary,
    marginBottom: spacing.s,
  },
  scoreBarBlock: {
    marginBottom: spacing.s,
  },
  rottenReasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.s,
  },

  // ===== 태그 =====
  tagsBlock: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.m },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.s, paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: color.fill.tertiary,
  },
  tagText: { ...typography.caption, color: color.text.secondary },
  tagRisk: { backgroundColor: 'rgba(255,59,48,0.1)' },
  tagRiskText: { ...typography.captionEmphasized, color: color.status.danger },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: color.brand.primary,
    paddingVertical: spacing.m,
    borderRadius: radius.l,
    marginTop: 'auto', // 시트 하단에 항상 붙임 → CTA 아래 여백 X
  },
  ctaText: { ...typography.bodyEmphasized, color: color.surface.subtle },
});
