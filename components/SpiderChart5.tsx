import { color, typography } from '@/constants/tokens';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';

export type Axis5 = {
  key: string;
  label: string;
  score: number;
  max: number;
};

/**
 * 식탐정 평가 거미줄(레이더) 차트.
 * 평균 점수 등급별 단일 색으로 폴리곤이 채워지고, 각 정점 점은 해당 축 점수의
 * 등급 색을 띤다. 빨강 대신 주홍 계열로 톤다운.
 *  - ≥ 75% → 식탐정 그린
 *  - ≥ 60% → 주홍(warning)
 *  - 그 외 → 진한 주홍
 */
export function SpiderChart5({
  axes,
  size = 260,
  centerLabel,
}: {
  axes: Axis5[];
  size?: number;
  centerLabel?: string;
}) {
  if (axes.length !== 5) {
    return null;
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;

  // 정점 5개 각도 (12시 방향 시작, 시계방향)
  const angles = axes.map((_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / 5);

  const point = (angle: number, r: number) => ({
    x: cx + Math.cos(angle) * r,
    y: cy + Math.sin(angle) * r,
  });

  // ───── 점수 등급별 단일 색 ─────
  const totalScore = axes.reduce((sum, a) => sum + a.score, 0);
  const totalMax = axes.reduce((sum, a) => sum + a.max, 0);
  const avgRatio = totalMax > 0 ? totalScore / totalMax : 0;
  const baseColor = scoreColor(avgRatio);

  // 그리드 (3겹)
  const gridLevels = [0.33, 0.66, 1];
  const gridPolygons = gridLevels.map((lvl) =>
    angles
      .map((a) => {
        const p = point(a, radius * lvl);
        return `${p.x},${p.y}`;
      })
      .join(' ')
  );

  // 점수 폴리곤
  const scorePoints = axes
    .map((axis, i) => {
      const ratio = axis.score / axis.max;
      const p = point(angles[i], radius * Math.max(0, Math.min(1, ratio)));
      return `${p.x},${p.y}`;
    })
    .join(' ');

  // 라벨 위치
  const labelPositions = axes.map((axis, i) => {
    const p = point(angles[i], radius + 26);
    return { ...axis, x: p.x, y: p.y, angle: angles[i] };
  });

  return (
    <View style={[styles.container, { width: size, height: size + 8 }]}>
      <Svg width={size} height={size}>
        {/* Grid polygons */}
        {gridPolygons.map((pts, i) => (
          <Polygon
            key={i}
            points={pts}
            fill="none"
            stroke={color.border.default}
            strokeWidth={1}
          />
        ))}

        {/* Axis guide lines */}
        {angles.map((a, i) => {
          const p = point(a, radius);
          return (
            <Line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke={color.border.default}
              strokeWidth={0.5}
            />
          );
        })}

        {/* Score polygon — single grade color, soft fill */}
        <Polygon
          points={scorePoints}
          fill={baseColor}
          fillOpacity={0.18}
          stroke={baseColor}
          strokeWidth={2}
        />

        {/* Vertex dots — colored per axis score */}
        {axes.map((axis, i) => {
          const ratio = axis.score / axis.max;
          const p = point(angles[i], radius * Math.max(0, Math.min(1, ratio)));
          const dotColor = scoreColor(ratio);
          return (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={color.surface.subtle}
              stroke={dotColor}
              strokeWidth={2}
            />
          );
        })}
      </Svg>

      {/* Center label */}
      {centerLabel ? (
        <View style={[styles.centerLabel, { top: cy - 14, left: 0, width: size }]}>
          <Text style={[styles.centerLabelText, { color: baseColor }]}>{centerLabel}</Text>
        </View>
      ) : null}

      {/* Axis labels */}
      {labelPositions.map((lp) => {
        const labelColor = scoreColor(lp.score / lp.max);
        return (
          <View
            key={lp.key}
            style={[
              styles.axisLabel,
              { left: lp.x - 40, top: lp.y - 14, width: 80 },
            ]}>
            <Text style={styles.axisLabelText} numberOfLines={1}>{lp.label}</Text>
            <Text style={[styles.axisValueText, { color: labelColor }]}>
              {lp.score}/{lp.max}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ───── Helpers ─────

/** Map a 0-1 ratio to a single grade color (no red, only orange family). */
function scoreColor(ratio: number): string {
  if (ratio >= 0.75) return color.brand.primary;     // 그린 — 좋음
  if (ratio >= 0.6) return color.status.warning;      // 주홍 — 보통
  return '#E25822';                                    // 진한 주홍 — 요주의
}

const styles = StyleSheet.create({
  container: { position: 'relative', alignSelf: 'center' },
  axisLabel: { position: 'absolute', alignItems: 'center' },
  axisLabelText: { ...typography.footnote, color: color.text.secondary },
  axisValueText: { ...typography.captionEmphasized, marginTop: 1 },
  centerLabel: { position: 'absolute', alignItems: 'center' },
  centerLabelText: { ...typography.title },
});
