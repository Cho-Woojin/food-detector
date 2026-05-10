// 사용자 위생 리뷰 카드. 점수는 노출하지 않고 별점 평균·리뷰 수·이물질 신고만.
// 점수 룰은 data/SCORING_AND_SCHEMA.md §3 (UI는 점수 미노출).

import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/Icon';
import { color, spacing, typography } from '@/constants/tokens';
import { computeReviewImpact, useReviewsFor } from '@/utils/reviews';

export type UserScoreCardProps = {
  restaurantId: string;
};

export function UserScoreCard({ restaurantId }: UserScoreCardProps) {
  const reviews = useReviewsFor(restaurantId);
  const impact = computeReviewImpact(reviews);
  const has = impact.reviewCount > 0;

  return (
    <Card variant="flat" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
      <View style={styles.header}>
        <Text style={styles.title}>사용자 리뷰</Text>
        {has ? (
          <View style={styles.starPill}>
            <Icon name="star" size={12} color={color.cheese.GOLDEN.fg} />
            <Text style={styles.starText}>{impact.rawAvg.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.subtitle}>방문자 위생 별점</Text>

      {has ? (
        <Text style={styles.body}>
          리뷰 <Text style={styles.bodyEmph}>{impact.reviewCount}건</Text>
        </Text>
      ) : (
        <Text style={styles.placeholder}>첫 위생 리뷰를 남겨보세요</Text>
      )}

      {impact.foreignTotal > 0 ? (
        <View style={styles.foreignBanner}>
          <Icon name="warning" size={14} color={color.status.danger} />
          <Text style={styles.foreignText}>
            이물질 신고 {impact.foreignTotal}건 — 등급에는 영향 없음
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.headline,
    color: color.text.primary,
  },
  starPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: color.cheese.GOLDEN.bg,
  },
  starText: {
    ...typography.captionEmphasized,
    color: color.text.primary,
  },
  subtitle: {
    ...typography.caption,
    color: color.text.secondary,
    marginTop: 2,
  },
  body: {
    ...typography.subheadline,
    color: color.text.primary,
    marginTop: spacing.m,
  },
  bodyEmph: {
    ...typography.subheadlineEmphasized,
  },
  placeholder: {
    ...typography.subheadline,
    color: color.text.tertiary,
    marginTop: spacing.m,
  },
  foreignBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.s,
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
    backgroundColor: color.status.dangerSoft,
    borderRadius: 8,
  },
  foreignText: {
    ...typography.caption,
    color: color.status.danger,
    flex: 1,
  },
});
