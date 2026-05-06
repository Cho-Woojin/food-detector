import { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logos } from '@/constants/Assets';
import { color, glass, spacing, typography } from '@/constants/tokens';
import { Icon } from '@/components/Icon';
import { IconButton } from './IconButton';

type Variant = 'default' | 'large';
type LeadingPreset = 'back' | 'logo' | 'none';

export type AppHeaderProps = {
  title?: string;
  subtitle?: string;
  leading?: LeadingPreset | ReactNode;
  trailing?: ReactNode;
  variant?: Variant;
  transparent?: boolean;
  withSafeArea?: boolean;
  style?: ViewStyle;
};

export function AppHeader({
  title,
  subtitle,
  leading = 'logo',
  trailing,
  variant = 'default',
  transparent = false,
  withSafeArea = true,
  style,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const isLarge = variant === 'large';

  const bg = transparent
    ? { backgroundColor: 'transparent' }
    : isLarge
      ? { backgroundColor: color.surface.canvas }
      : (glass.regular as ViewStyle);

  return (
    <View
      style={[
        styles.root,
        bg,
        { paddingTop: (withSafeArea ? insets.top : 0) + spacing.xs, paddingBottom: spacing.s },
        style,
      ]}>
      <View style={styles.row}>
        <View style={styles.leading}>{renderLeading(leading)}</View>

        {!isLarge && title ? (
          <Text style={styles.titleCenter} numberOfLines={1}>
            {title}
          </Text>
        ) : null}

        <View style={styles.trailing}>{trailing}</View>
      </View>

      {isLarge && (title || subtitle) ? (
        <View style={styles.largeBlock}>
          {title ? <Text style={styles.titleLarge}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function renderLeading(leading: LeadingPreset | ReactNode) {
  if (leading === 'none') return null;
  if (leading === 'back') {
    return (
      <IconButton
        icon="back"
        size="md"
        accessibilityLabel="뒤로 가기"
        onPress={() => router.back()}
      />
    );
  }
  if (leading === 'logo') {
    return (
      <Pressable style={styles.logoRow} accessibilityRole="header">
        <Image source={Logos.symbol} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.logoText}>식탐정</Text>
      </Pressable>
    );
  }
  return leading as ReactNode;
}

export function AppHeaderLogo() {
  return renderLeading('logo');
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.l,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s,
  },
  leading: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  titleCenter: {
    ...typography.headline,
    color: color.text.primary,
    flex: 1,
    textAlign: 'center',
  },

  largeBlock: {
    paddingTop: spacing.s,
    paddingBottom: spacing.xs,
  },
  titleLarge: {
    ...typography.title,
    color: color.text.primary,
  },
  subtitle: {
    ...typography.subheadline,
    color: color.text.secondary,
    marginTop: spacing.xxs,
  },

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, minHeight: 44 },
  logoImage: { width: 28, height: 28 },
  logoText: { ...typography.headline, color: color.text.primary, letterSpacing: -0.3 },
});

// Used so Icon stays imported for future leading variants.
const _IconExportShim: typeof Icon = Icon;
void _IconExportShim;
