import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { color, spacing, typography, type SpacingKey } from '@/constants/tokens';

export type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  trailing?: { label: string; onPress?: () => void; icon?: IconName };
  marginTop?: SpacingKey;
  marginBottom?: SpacingKey;
  style?: ViewStyle;
};

export function SectionHeader({
  title,
  subtitle,
  trailing,
  marginTop,
  marginBottom = 'm',
  style,
}: SectionHeaderProps) {
  return (
    <View
      style={[
        styles.row,
        marginTop ? { marginTop: spacing[marginTop] } : null,
        { marginBottom: spacing[marginBottom] },
        style,
      ]}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ? (
        <Pressable
          onPress={trailing.onPress}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={trailing.label}
          style={styles.trailing}>
          <Text style={styles.trailingText}>{trailing.label}</Text>
          {trailing.icon ? (
            <Icon name={trailing.icon} size={11} color={color.text.tertiary} />
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.s,
  },
  left: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.s, flex: 1 },
  title: { ...typography.headline, color: color.text.primary },
  subtitle: { ...typography.footnote, color: color.text.tertiary },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  trailingText: { ...typography.caption, color: color.text.secondary },
});
