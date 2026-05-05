import { palette } from '@/constants/Colors';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';

export type Axis5 = {
  key: string;
  label: string;
  score: number;
  max: number;
};

/**
 * 5축 거미줄(레이더) 차트.
 * 정오각형 그리드 + 점수 폴리곤 + 정점 라벨.
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

  // 정점 5개의 (각도, x, y) 계산. 12시 방향(상단)에서 시작, 시계방향.
  const angles = axes.map((_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / 5);

  const point = (angle: number, r: number) => ({
    x: cx + Math.cos(angle) * r,
    y: cy + Math.sin(angle) * r,
  });

  // 그리드 (3겹: 33%, 66%, 100%)
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

  // 라벨 위치 (정점에서 바깥으로 약간)
  const labelPositions = axes.map((axis, i) => {
    const p = point(angles[i], radius + 26);
    return { ...axis, x: p.x, y: p.y, angle: angles[i] };
  });

  return (
    <View style={[styles.container, { width: size, height: size + 8 }]}>
      <Svg width={size} height={size}>
        {/* 그리드 폴리곤 */}
        {gridPolygons.map((pts, i) => (
          <Polygon
            key={i}
            points={pts}
            fill={i === gridLevels.length - 1 ? palette.lightGreen : 'none'}
            fillOpacity={i === gridLevels.length - 1 ? 0.15 : 0}
            stroke={palette.border}
            strokeWidth={1}
          />
        ))}

        {/* 정점까지 가이드 라인 */}
        {angles.map((a, i) => {
          const p = point(a, radius);
          return (
            <Line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke={palette.border}
              strokeWidth={0.5}
            />
          );
        })}

        {/* 점수 폴리곤 */}
        <Polygon
          points={scorePoints}
          fill={palette.accent}
          fillOpacity={0.35}
          stroke={palette.accent}
          strokeWidth={2}
        />

        {/* 정점 점 */}
        {axes.map((axis, i) => {
          const ratio = axis.score / axis.max;
          const p = point(angles[i], radius * Math.max(0, Math.min(1, ratio)));
          return (
            <Circle key={i} cx={p.x} cy={p.y} r={3} fill={palette.accent} />
          );
        })}
      </Svg>

      {/* 중앙 라벨 (선택) */}
      {centerLabel ? (
        <View style={[styles.centerLabel, { top: cy - 14, left: 0, width: size }]}>
          <Text style={styles.centerLabelText}>{centerLabel}</Text>
        </View>
      ) : null}

      {/* 정점 라벨 */}
      {labelPositions.map((lp) => (
        <View
          key={lp.key}
          style={[
            styles.axisLabel,
            {
              left: lp.x - 40,
              top: lp.y - 14,
              width: 80,
            },
          ]}>
          <Text style={styles.axisLabelText} numberOfLines={1}>
            {lp.label}
          </Text>
          <Text style={styles.axisValueText}>
            {lp.score}/{lp.max}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', alignSelf: 'center' },
  axisLabel: {
    position: 'absolute',
    alignItems: 'center',
  },
  axisLabelText: { fontSize: 11, color: palette.text2, fontWeight: '600' },
  axisValueText: { fontSize: 10, color: palette.text1, fontWeight: '700', marginTop: 1 },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
  },
  centerLabelText: { fontSize: 24, fontWeight: '800', color: palette.text1 },
});
