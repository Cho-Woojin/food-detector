// 사장님 인증 활동 카드. 점수는 노출하지 않고 인증 건수·활성 상태만.
// 점수 룰은 data/SCORING_AND_SCHEMA.md §2 (UI는 점수 미노출).

import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/Icon';
import { color, spacing, typography } from '@/constants/tokens';
import { useOwnerImpactFor } from '@/utils/owner';

export type OwnerScoreCardProps = {
  restaurantId: string;
};

export function OwnerScoreCard({ restaurantId }: OwnerScoreCardProps) {
  const impact = useOwnerImpactFor(restaurantId);
  const active = impact.postCount > 0;

  return (
    <Card variant="flat" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
      <View style={styles.header}>
        <Text style={styles.title}>사장님 인증</Text>
        <View style={[styles.statusPill, active ? styles.pillActive : styles.pillInactive]}>
          <Icon
            name={active ? 'check' : 'dot'}
            size={12}
            color={active ? color.status.success : color.text.tertiary}
          />
          <Text
            style={[
              styles.statusText,
              { color: active ? color.status.success : color.text.tertiary },
            ]}>
            {active ? '활성' : '대기중'}
          </Text>
        </View>
      </View>
      <Text style={styles.subtitle}>최근 30일 청소 인증</Text>

      {active ? (
        <Text style={styles.activeBody}>
          최근 30일 인증 <Text style={styles.activeCount}>{impact.postCount}건</Text>
          {impact.totalPostCount > impact.postCount
            ? ` (누적 ${impact.totalPostCount}건)`
            : ''}
        </Text>
      ) : (
        <Text style={styles.placeholder}>
          사장님이 아직 청소 인증을 시작하지 않았어요
        </Text>
      )}
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
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillActive: {
    backgroundColor: color.status.successSoft,
  },
  pillInactive: {
    backgroundColor: color.fill.quaternary,
  },
  statusText: {
    ...typography.captionEmphasized,
  },
  subtitle: {
    ...typography.caption,
    color: color.text.secondary,
    marginTop: 2,
  },
  activeBody: {
    ...typography.subheadline,
    color: color.text.primary,
    marginTop: spacing.m,
  },
  activeCount: {
    ...typography.subheadlineEmphasized,
    color: color.status.success,
  },
  placeholder: {
    ...typography.subheadline,
    color: color.text.tertiary,
    marginTop: spacing.m,
  },
});
