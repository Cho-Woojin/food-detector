// 종합 점수 100점을 데이터(50)·사장님(25)·사용자(25) 세 세그먼트로 분할 표시.
// 점수 모델은 data/SCORING_AND_SCHEMA.md, 산식은 utils/scoring.ts 참고.

import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { color, radius, spacing, typography } from '@/constants/tokens';
import { SCORE_MAX } from '@/utils/scoring';

type Variant = 'compact' | 'full';

export type TripartiteScoreBarProps = {
  data: number;   // 0~50
  owner: number;  // 0~25
  user: number;   // 0~25
  variant?: Variant;
  style?: ViewStyle;
};

const SEG_COLOR = {
  data:  color.brand.primary,        // 그린 — 데이터(공공) 시그널
  owner: color.cheese.GOLDEN.fg,     // 노랑 — 사장님 인증
  user:  color.status.info,          // 블루 — 사용자 평가
} as const;

const TRACK_BG = color.fill.quaternary;
const BAR_HEIGHT = 10;
const BAR_HEIGHT_COMPACT = 6;

export function TripartiteScoreBar({
  data,
  owner,
  user,
  variant = 'full',
  style,
}: TripartiteScoreBarProps) {
  const d = clamp(data, SCORE_MAX.DATA);
  const o = clamp(owner, SCORE_MAX.OWNER);
  const u = clamp(user, SCORE_MAX.USER);
  const total = Math.round(d + o + u);

  // 폭 비율 = 만점(50:25:25) — 채워지지 않은 영역도 폭은 유지
  const widths = {
    data:  `${(SCORE_MAX.DATA  / SCORE_MAX.TOTAL) * 100}%`,
    owner: `${(SCORE_MAX.OWNER / SCORE_MAX.TOTAL) * 100}%`,
    user:  `${(SCORE_MAX.USER  / SCORE_MAX.TOTAL) * 100}%`,
  } as const;

  const fills = {
    data:  `${(d / SCORE_MAX.DATA)  * 100}%`,
    owner: `${(o / SCORE_MAX.OWNER) * 100}%`,
    user:  `${(u / SCORE_MAX.USER)  * 100}%`,
  } as const;

  const barH = variant === 'compact' ? BAR_HEIGHT_COMPACT : BAR_HEIGHT;

  return (
    <View
      style={[styles.root, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={`종합 ${total}점, 데이터 ${Math.round(d)}점, 사장님 ${Math.round(o)}점, 사용자 ${Math.round(u)}점`}>
      <View style={[styles.track, { height: barH, borderRadius: barH / 2 }]}>
        <Segment width={widths.data}  fill={fills.data}  fg={SEG_COLOR.data}  />
        <SegmentDivider />
        <Segment width={widths.owner} fill={fills.owner} fg={SEG_COLOR.owner} />
        <SegmentDivider />
        <Segment width={widths.user}  fill={fills.user}  fg={SEG_COLOR.user}  />
      </View>

      {variant === 'full' ? (
        <View style={styles.legend}>
          <LegendItem swatch={SEG_COLOR.data}  label="데이터" value={Math.round(d)} max={SCORE_MAX.DATA} />
          <LegendItem swatch={SEG_COLOR.owner} label="사장님" value={Math.round(o)} max={SCORE_MAX.OWNER} />
          <LegendItem swatch={SEG_COLOR.user}  label="사용자" value={Math.round(u)} max={SCORE_MAX.USER} />
        </View>
      ) : null}
    </View>
  );
}

function Segment({ width, fill, fg }: { width: string; fill: string; fg: string }) {
  return (
    <View style={{ width: width as any, backgroundColor: TRACK_BG, height: '100%' }}>
      <View style={{ width: fill as any, backgroundColor: fg, height: '100%' }} />
    </View>
  );
}

function SegmentDivider() {
  return <View style={styles.divider} />;
}

function LegendItem({ swatch, label, value, max }: { swatch: string; label: string; value: number; max: number }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: swatch }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}<Text style={styles.legendMax}>/{max}</Text></Text>
    </View>
  );
}

function clamp(v: number, max: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.min(v, max);
}

const styles = StyleSheet.create({
  root: { width: '100%' },
  track: {
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: TRACK_BG,
    borderRadius: radius.s,
  },
  divider: {
    width: 2,
    height: '100%',
    backgroundColor: color.surface.subtle,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.s,
    gap: spacing.s,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  legendSwatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendLabel: {
    ...typography.caption,
    color: color.text.secondary,
  },
  legendValue: {
    ...typography.captionEmphasized,
    color: color.text.primary,
    marginLeft: 'auto',
  },
  legendMax: {
    ...typography.caption,
    color: color.text.tertiary,
    fontWeight: '400',
  },
});
