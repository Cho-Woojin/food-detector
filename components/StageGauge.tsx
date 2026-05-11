// 식중독 위험 단계 시각화 — 식약처 poisonmap.mfds.go.kr 스타일.
// 호를 45°씩 4 segment로 분할해 각자 그라데이션(밝은→진한)을 입히고,
// 단계 경계마다 흰 눈금으로 구분. 바늘은 score 기반 piecewise 매핑.

import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { color, typography } from '@/constants/tokens';

export type StageGaugeProps = {
  /** 식중독 지수 점수 (0~100) — 바늘 위치 결정. undefined 시 바늘 미노출. */
  score?: number;
  /** 현재 단계 한글 라벨 — 중앙 원 안 표기 (관심/주의/경고/위험) */
  labelKr: string;
  /** 현재 단계 색상 — 중앙 원 채움 */
  accent: string;
  /** 게이지 폭 (기본 160 — 컴팩트) */
  width?: number;
};

// 4단계 경계 점수 — utils/riskCalculator.scoreToRiskLevel과 동기화
// (1단계 관심: <55, 2단계 주의: 55-70, 3단계 경고: 71-85, 4단계 위험: ≥86)
const STAGE_BOUNDARIES = [0, 55, 71, 86, 100] as const;

// 시각 분할은 4등분(45°씩). score → angle은 단계 경계마다 piecewise linear로 매핑.
const STAGE_TICKS = [0, 25, 50, 75, 100] as const; // 게이지 위치 비율(%)

// 4단계 각 segment의 그라데이션 (light → dark). 호를 따라 자연스럽게 색이 깊어짐.
const SEG_GRADIENTS: Array<[string, string]> = [
  ['#5DDB85', '#22C55E'],   // 관심
  ['#F8D86A', '#F5C037'],   // 주의
  ['#FFAA6B', '#F08A4B'],   // 경고
  ['#FF8273', '#EF5B4C'],   // 위험
];

// 호 path 생성 — 컨벤션: d=0°가 왼쪽 끝, d=180°가 오른쪽 끝 (반원 위쪽으로 그려짐).
//   toRad에서 (180-d)로 변환하면 SVG y-down 좌표에서 시각적으로 좌→상→우 sweep.
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const toRad = (d: number) => ((180 - d) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy - r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy - r * Math.sin(toRad(endDeg));
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

// 점수(0~100) → 게이지 위치 비율(0~100). 단계 경계마다 균등 폭(25%)을 가지도록 piecewise linear.
function scoreToPosPct(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  for (let i = 1; i < STAGE_BOUNDARIES.length; i++) {
    const lo = STAGE_BOUNDARIES[i - 1];
    const hi = STAGE_BOUNDARIES[i];
    if (clamped <= hi) {
      const t = (clamped - lo) / (hi - lo);
      return STAGE_TICKS[i - 1] + t * (STAGE_TICKS[i] - STAGE_TICKS[i - 1]);
    }
  }
  return 100;
}

// 위치 비율(0~100) → 호 각도 (0% = 왼쪽 = d 0°, 100% = 오른쪽 = d 180°)
function posPctToAngle(pct: number): number {
  return (pct / 100) * 180;
}

export function StageGauge({ score, labelKr, accent, width = 160 }: StageGaugeProps) {
  const W = width;
  const H = Math.round(W * 0.62);
  const cx = W / 2;
  const cy = H - 8;
  const outerR = W * 0.44;
  const arcWidth = W * 0.11;
  const centerR = outerR - arcWidth - 6;
  const arcR = outerR - arcWidth / 2; // 호 중심 반지름

  // 바늘 — score 있으면 piecewise 매핑으로 위치 결정, 없으면 미노출
  const hasNeedle = typeof score === 'number';
  const needleAngle = hasNeedle ? posPctToAngle(scoreToPosPct(score!)) : 0;
  const needleRad = ((180 - needleAngle) * Math.PI) / 180;
  const needleLen = outerR - 4;
  const nx = cx + needleLen * Math.cos(needleRad);
  const ny = cy - needleLen * Math.sin(needleRad);

  // 4등분 segment — i=0(관심): d 0°~45° (왼쪽 시작) ... i=3(위험): d 135°~180° (오른쪽 끝)
  const toRad = (d: number) => ((180 - d) * Math.PI) / 180;
  const segments = [0, 1, 2, 3].map((i) => {
    const startDeg = i * 45;
    const endDeg = (i + 1) * 45;
    // 그라데이션 방향 — 호 위 시작점 → 끝점으로 흐르게 (userSpaceOnUse)
    const startX = cx + arcR * Math.cos(toRad(startDeg));
    const startY = cy - arcR * Math.sin(toRad(startDeg));
    const endX = cx + arcR * Math.cos(toRad(endDeg));
    const endY = cy - arcR * Math.sin(toRad(endDeg));
    return {
      path: arcPath(cx, cy, arcR, startDeg, endDeg),
      gradStart: [startX, startY] as [number, number],
      gradEnd: [endX, endY] as [number, number],
      colors: SEG_GRADIENTS[i],
    };
  });

  // 4등분 경계 눈금 — 25%/50%/75% 위치 (가운데 3개만)
  const tickInnerR = outerR - arcWidth;
  const tickOuterR = outerR + 2;
  const ticks = [25, 50, 75].map((pct) => {
    const a = posPctToAngle(pct);
    const rad = toRad(a);
    return {
      x1: cx + tickInnerR * Math.cos(rad),
      y1: cy - tickInnerR * Math.sin(rad),
      x2: cx + tickOuterR * Math.cos(rad),
      y2: cy - tickOuterR * Math.sin(rad),
    };
  });

  return (
    <View style={[styles.wrap, { width: W, height: H + 4 }]}>
      <Svg width={W} height={H + 4} viewBox={`0 0 ${W} ${H + 4}`}>
        <Defs>
          {/* 4 segment 각각 독립 LinearGradient — 호 위 시작점→끝점 방향으로 색이 흐름.
              가로 그라데이션과 달리 segment의 호 진행 방향 따라 자연스럽게 깊어짐. */}
          {segments.map((s, i) => (
            <LinearGradient
              key={`g-${i}`}
              id={`segGrad${i}`}
              x1={String(s.gradStart[0])}
              y1={String(s.gradStart[1])}
              x2={String(s.gradEnd[0])}
              y2={String(s.gradEnd[1])}
              gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor={s.colors[0]} />
              <Stop offset="100%" stopColor={s.colors[1]} />
            </LinearGradient>
          ))}
          {/* 중앙 원 광택 */}
          <RadialGradient id="centerGlow" cx="50%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </RadialGradient>
        </Defs>

        {/* 4단계 호 segment — 각자 자기 그라데이션. 경계는 흰 눈금이 가린다. */}
        <G>
          {segments.map((s, i) => (
            <Path
              key={i}
              d={s.path}
              stroke={`url(#segGrad${i})`}
              strokeWidth={arcWidth}
              strokeLinecap="butt"
              fill="none"
            />
          ))}
        </G>

        {/* 단계 경계 눈금 — 흰 선 (호 위에서 분할선 역할) */}
        <G>
          {ticks.map((t, i) => (
            <Line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.95}
            />
          ))}
        </G>

        {/* 바늘 — score 있을 때만 */}
        {hasNeedle ? (
          <>
            <Path
              d={`M ${cx} ${cy} L ${nx} ${ny}`}
              stroke={color.text.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              opacity={0.85}
            />
            <Circle cx={cx} cy={cy} r={4} fill={color.text.primary} />
          </>
        ) : null}

        {/* 중앙 원 — accent 색상 + 광택 */}
        <Circle cx={cx} cy={cy} r={centerR} fill={accent} />
        <Circle cx={cx} cy={cy} r={centerR} fill="url(#centerGlow)" />
      </Svg>
      {/* 라벨 — SVG foreignObject 회피해 absolute Text로 */}
      <View
        pointerEvents="none"
        style={[
          styles.centerLabel,
          {
            width: centerR * 2,
            height: centerR * 2,
            left: cx - centerR,
            top: cy - centerR,
            borderRadius: centerR,
          },
        ]}>
        <Text style={styles.labelText}>{labelKr}</Text>
        {hasNeedle ? <Text style={styles.subText}>{Math.round(score!)}점</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    ...typography.subheadlineEmphasized,
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
});
