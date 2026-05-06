import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { color, spacing, type SpacingKey } from '@/constants/tokens';

type Variant = 'canvas' | 'surface' | 'mascot';

const BG: Record<Variant, string> = {
  canvas: color.surface.canvas,
  surface: color.surface.subtle,
  mascot: color.surface.mascotBg,
};

export type ScreenProps = {
  variant?: Variant;
  edges?: Edge[];
  scroll?: boolean;
  paddingHorizontal?: SpacingKey | 'none';
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  children: ReactNode;
};

/** Standard route container: SafeArea + background + horizontal padding. */
export function Screen({
  variant = 'canvas',
  edges = ['top'],
  scroll = false,
  paddingHorizontal = 'l',
  contentContainerStyle,
  style,
  children,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padTop = edges.includes('top') ? insets.top : 0;
  const padBottom = edges.includes('bottom') ? insets.bottom : 0;
  const padH = paddingHorizontal === 'none' ? 0 : spacing[paddingHorizontal];

  const rootStyle: ViewStyle = {
    flex: 1,
    backgroundColor: BG[variant],
    paddingTop: padTop,
    paddingBottom: padBottom,
  };

  if (scroll) {
    return (
      <View style={[rootStyle, style]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            { paddingHorizontal: padH, paddingBottom: spacing.xxl },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    );
  }

  return <View style={[rootStyle, { paddingHorizontal: padH }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
});
