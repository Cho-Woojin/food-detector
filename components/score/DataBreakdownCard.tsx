// 식약처·행안부 공공데이터 시그널을 항목별 체크로 표기.
// 점수 숫자는 노출하지 않고, 보유/미지정/처분 종류 같은 상태만 보여줌.
// 점수 룰은 data/SCORING_AND_SCHEMA.md §1 참고 (UI에는 점수 미노출).

import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Icon, IconName } from '@/components/Icon';
import { color, spacing, typography } from '@/constants/tokens';

type Breakdown = { hygiene: number; model: number; bonus: number; punish: number };
type Flags = {
  hygieneDesignated?: boolean;
  hasModel?: boolean;
  evalGrade?: string;
  punishCount?: number;
  punishTypes?: string;
};

export type DataBreakdownCardProps = {
  /** breakdown 누락 시 카드 미렌더 */
  breakdown?: Breakdown;
  flags?: Flags;
};

type Tone = 'good' | 'warn' | 'none';
type Row = {
  label: string;
  state: string;     // 짧은 상태 — "보유" / "미지정" / "시정명령" 등
  tone: Tone;
  icon: IconName;
};

export function DataBreakdownCard({ breakdown, flags }: DataBreakdownCardProps) {
  if (!breakdown) return null;

  const rows: Row[] = [
    // 1) 위생등급
    flags?.hygieneDesignated
      ? { label: '위생등급',   state: '지정업소', tone: 'good', icon: 'check' }
      : { label: '위생등급',   state: '미지정',   tone: 'none', icon: 'dot' },
    // 2) 모범음식점
    flags?.hasModel
      ? { label: '모범음식점', state: '지정',     tone: 'good', icon: 'check' }
      : { label: '모범음식점', state: '미지정',   tone: 'none', icon: 'dot' },
    // 3) 위생관리 평가
    evalRow(flags?.evalGrade),
    // 4) 행정처분
    punishRow(flags?.punishCount ?? 0, flags?.punishTypes),
  ];

  return (
    <Card variant="flat" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
      <Text style={styles.title}>공공 데이터 시그널</Text>
      <Text style={styles.subtitle}>식약처·행안부 공공데이터에서 받은 인증·이력</Text>

      <View style={styles.list}>
        {rows.map((r, i) => (
          <Row key={r.label} row={r} showDivider={i < rows.length - 1} />
        ))}
      </View>
    </Card>
  );
}

function Row({ row, showDivider }: { row: Row; showDivider: boolean }) {
  const stateColor =
    row.tone === 'good' ? color.status.success
      : row.tone === 'warn' ? color.status.danger
      : color.text.tertiary;
  const iconColor =
    row.tone === 'good' ? color.status.success
      : row.tone === 'warn' ? color.status.danger
      : color.text.quaternary;

  return (
    <View style={[styles.row, showDivider && styles.rowDivider]}>
      <Icon name={row.icon} size={16} color={iconColor} />
      <Text style={styles.rowLabel}>{row.label}</Text>
      <Text style={[styles.rowState, { color: stateColor }]} numberOfLines={1}>
        {row.state}
      </Text>
    </View>
  );
}

function evalRow(evalGrade?: string): Row {
  switch (evalGrade) {
    case '자율관리업소':
      return { label: '위생관리 평가', state: '자율관리업소', tone: 'good', icon: 'check' };
    case '일반관리업소':
      return { label: '위생관리 평가', state: '일반관리업소', tone: 'none', icon: 'dot' };
    case '중점관리업소':
      return { label: '위생관리 평가', state: '중점관리업소', tone: 'warn', icon: 'minus' };
    case '평가불능업소':
      return { label: '위생관리 평가', state: '평가불능',     tone: 'warn', icon: 'minus' };
    default:
      return { label: '위생관리 평가', state: '미평가',       tone: 'none', icon: 'dot' };
  }
}

function punishRow(count: number, types?: string): Row {
  if (count === 0) {
    return { label: '행정처분', state: '이력없음', tone: 'good', icon: 'check' };
  }
  const list = (types ?? '').split('|').filter(Boolean);
  const first = list[0];
  const state = count > 1 && first ? `${first} 외 ${count - 1}` : first || `${count}건`;
  return { label: '행정처분', state, tone: 'warn', icon: 'minus' };
}

const styles = StyleSheet.create({
  title: {
    ...typography.headline,
    color: color.text.primary,
  },
  subtitle: {
    ...typography.caption,
    color: color.text.secondary,
    marginTop: 2,
  },
  list: {
    marginTop: spacing.m,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s,
    gap: spacing.s,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border.default,
  },
  rowLabel: {
    ...typography.subheadline,
    color: color.text.primary,
    flex: 1,
  },
  rowState: {
    ...typography.subheadlineEmphasized,
  },
});
