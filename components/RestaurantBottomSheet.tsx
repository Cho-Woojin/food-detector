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
import { toUIRestaurant } from '@/utils/adapter';
import { useIsLiked, toggleLike } from '@/utils/favorites';
import { AnimatedHeart } from '@/components/ui';

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

// 2단계: 작은 카드 / 중간 확장(5축 + CTA). 상세는 CTA 버튼으로 접근
const SNAP_POINTS = ['16%', '30%'];

// 5축 아이콘·라벨 매핑
type AxisKey = 'hygiene' | 'admin' | 'trust' | 'review' | 'gap';
const AXIS_DISPLAY: { key: AxisKey; label: string; icon: string }[] = [
  { key: 'hygiene', label: '위생등급',   icon: 'logo' },
  { key: 'admin',   label: '행정처분',   icon: 'warning' },
  { key: 'trust',   label: '사장님 인증', icon: 'star' },
  { key: 'review',  label: '리뷰 분석',   icon: 'chat' },
  { key: 'gap',     label: '메뉴 안전도', icon: 'leaf' },
];

const TONE_COLOR: Record<string, string> = {
  green: '#22C55E',
  yellow: '#F59E0B',
  red: '#EF4444',
};

// rating → 짧은 상태 라벨
const shortStatus = (key: AxisKey, rating: string): string => {
  if (rating === '데이터 부족') return '—';
  if (key === 'hygiene') return rating === '보유' ? 'A' : '—';
  if (key === 'admin') return rating === '이력 없음' ? '없음' : rating;
  if (key === 'trust') {
    if (rating === '미인증') return '미인증';
    return '인증';
  }
  return rating; // 좋음/양호/주의/보통 등
};

const RISK_LABEL: Partial<Record<RiskTag, string>> = {
  raw_fish: '날생선 취급',
  raw_meat: '육회·생고기',
  shellfish_raw: '생굴·조개',
  egg_raw: '날달걀',
  fugu: '복어 취급',
  raw_chicken: '닭회',
};

// 등급별 표시 메타. 치즈 갯수 + 라벨 + 한줄평
const GRADE_META: Record<GradeKey, { count: number; label: string; phrase: string }> = {
  GOLDEN:        { count: 3, label: '골든 치즈',     phrase: '위생·신뢰 모두 우수' },
  SILVER:        { count: 2, label: '실버 치즈',     phrase: '최근 위생 상태 양호' },
  BRONZE:        { count: 1, label: '브론즈 치즈',    phrase: '일부 항목 개선 필요' },
  WARNING:       { count: 0, label: '주의',         phrase: '행정처분 이력 있음' },
  INVESTIGATING: { count: 0, label: '조사 중',       phrase: '식탐정이 모니터링 중' },
  NEEDS_DATA:    { count: 0, label: '데이터 수집 중', phrase: '추가 정보 수집 필요' },
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

    // 단일 BottomSheet 인스턴스를 항상 마운트해두고 contents만 조건부.
    // 이전엔 if-early-return으로 두 BottomSheet를 분기 렌더했는데, restaurant 토글 시
    // 한쪽이 unmount → onClose fire → setSelected(null) 사이클로 시트가 떴다 사라짐.
    const cheeseFg = ui ? (color.cheese[ui.grade]?.fg ?? color.text.primary) : color.text.primary;
    const meta = ui ? (GRADE_META[ui.grade] ?? GRADE_META.NEEDS_DATA) : GRADE_META.NEEDS_DATA;
    const cheeseImg = !ui ? Cheese.bronze
      : ui.grade === 'GOLDEN' ? Cheese.gold
        : ui.grade === 'SILVER' ? Cheese.silver
        : Cheese.bronze;

    const goDetail = () => { if (restaurant) router.push(`/restaurant/${restaurant.id}` as any); };
    const risks = restaurant?.riskTags ?? [];

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

          {/* 점수 + 치즈 (이름보다 아래·작게) */}
          <View style={styles.scoreRow}>
            <Text style={[styles.score, { color: cheeseFg }]}>{ui.score}점</Text>
            {meta.count > 0 && (
              <Image source={cheeseImg} style={styles.cheeseIcon} resizeMode="contain" />
            )}
          </View>

          {/* 한줄 요약 (체크 아이콘 + 텍스트) */}
          <View style={styles.phraseRow}>
            <View style={styles.phraseDot}>
              <Icon name="logo" size={12} color={'#fff'} />
            </View>
            <Text style={styles.phrase}>{meta.phrase}</Text>
          </View>

          {/* === 중간 확장 — 5축 아이콘 분석 === */}
          <View style={styles.divider} />

          <Text style={styles.axisTitle}>식탐정 5가지 분석</Text>

          <View style={styles.axisRow}>
            {AXIS_DISPLAY.map((ax) => {
              const axData = ui.axes.find((a) => a.key === ax.key);
              const tone = (axData?.tone ?? 'yellow') as keyof typeof TONE_COLOR;
              const status = axData ? shortStatus(ax.key, axData.rating) : '—';
              return (
                <View key={ax.key} style={styles.axisItem}>
                  <View style={[styles.axisIconBox, { borderColor: TONE_COLOR[tone] }]}>
                    <Icon name={ax.icon as any} size={18} color={TONE_COLOR[tone]} />
                  </View>
                  <Text style={[styles.axisStatus, { color: TONE_COLOR[tone] }]} numberOfLines={1}>{status}</Text>
                  <Text style={styles.axisLabel} numberOfLines={1}>{ax.label}</Text>
                </View>
              );
            })}
          </View>

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

  // ===== 한줄평 =====
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.s,
    backgroundColor: 'rgba(34,197,94,0.08)',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: radius.m,
    alignSelf: 'flex-start',
  },
  phraseDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center',
  },
  phrase: { ...typography.footnote, color: color.text.primary, fontWeight: '600' },

  // ===== divider =====
  divider: {
    height: 1, backgroundColor: color.border.default,
    marginVertical: spacing.m,
  },

  // ===== 5축 분석 =====
  axisTitle: {
    ...typography.subheadlineEmphasized,
    color: color.text.primary,
    marginBottom: spacing.m,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  axisIconBox: {
    width: 44, height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: color.surface.subtle,
  },
  axisStatus: { ...typography.captionEmphasized },
  axisLabel: { ...typography.caption, color: color.text.secondary },

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
