import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { color, elevation, radius, spacing, typography } from '@/constants/tokens';

type Tone = 'success' | 'warning' | 'danger' | 'neutral';
type Size = 'sm' | 'md';

const TONE_BG: Record<Tone, string> = {
  success: color.status.successSoft,
  warning: color.status.warningSoft,
  danger:  color.status.dangerSoft,
  neutral: color.fill.tertiary,
};

const TONE_FG: Record<Tone, string> = {
  success: color.status.success,
  warning: color.status.warning,
  danger:  color.status.danger,
  neutral: color.text.secondary,
};

export type MetricCardProps = {
  icon: IconName;
  label: string;
  value: string;
  tone?: Tone;
  size?: Size;
  style?: ViewStyle;
};

export function MetricCard({
  icon,
  label,
  value,
  tone = 'neutral',
  size = 'sm',
  style,
}: MetricCardProps) {
  const fg = TONE_FG[tone];
  const bg = TONE_BG[tone];
  const isMd = size === 'md';

  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: bg,
          paddingVertical: isMd ? spacing.l : spacing.m + 2,
          paddingHorizontal: spacing.s,
          borderRadius: isMd ? radius.l : radius.m,
        },
        style,
      ]}>
      <Icon name={icon} size={isMd ? 18 : 14} color={fg} />
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
      <Text style={[styles.value, { color: fg }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    ...(elevation.subtle as ViewStyle),
  },
  label: { ...typography.caption, fontWeight: '600' },
  value: { ...typography.captionEmphasized, marginTop: spacing.xxs },
});
