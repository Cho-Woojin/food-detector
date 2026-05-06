import { Image, StyleSheet, Text, View } from 'react-native';
import { Mascots, type MascotKey } from '@/constants/Assets';
import { color, mascotSize, spacing, typography, type SpacingKey } from '@/constants/tokens';
import { Button } from './Button';

type MascotSize = 'sm' | 'md' | 'lg';
const MASCOT_DIM: Record<MascotSize, number> = {
  sm: mascotSize.inline,    // 56
  md: mascotSize.featured,  // 120
  lg: mascotSize.hero,      // 180
};

export type EmptyStateProps = {
  mascot?: MascotKey;
  mascotSize?: MascotSize;
  title: string;
  body?: string;
  cta?: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' };
  paddingY?: SpacingKey;
};

export function EmptyState({
  mascot = 'empty',
  mascotSize: msz = 'md',
  title,
  body,
  cta,
  paddingY = 'xxxxl',
}: EmptyStateProps) {
  const dim = MASCOT_DIM[msz];
  return (
    <View style={[styles.root, { paddingVertical: spacing[paddingY] }]}>
      <Image source={Mascots[mascot]} style={{ width: dim, height: dim, marginBottom: spacing.l }} resizeMode="contain" />
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {cta ? (
        <View style={{ marginTop: spacing.l }}>
          <Button variant={cta.variant ?? 'secondary'} size="md" onPress={cta.onPress}>
            {cta.label}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.headline, color: color.text.primary, marginBottom: spacing.xs, textAlign: 'center' },
  body: { ...typography.subheadline, color: color.text.secondary, textAlign: 'center', maxWidth: 280 },
});
