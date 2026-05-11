// 약관·개인정보·문의·데이터 출처 페이지가 공유하는 레이아웃.
// 상단 뒤로 버튼 + 제목, 본문은 자식이 렌더.

import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui';
import { color, spacing, typography } from '@/constants/tokens';

export function LegalScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <IconButton icon="back" size="md" accessibilityLabel="뒤로 가기" onPress={() => router.back()} />
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
    </View>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      {children}
    </View>
  );
}

export function LegalParagraph({ children }: { children: ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

export function LegalBullet({ children }: { children: ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>·</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.canvas },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.s,
    backgroundColor: color.surface.canvas,
  },
  title: { flex: 1, ...typography.title, fontSize: 18, lineHeight: 24, color: color.text.primary, textAlign: 'center' },
  scroll: { paddingHorizontal: spacing.l, paddingTop: spacing.m },
  subtitle: { ...typography.caption, color: color.text.tertiary, marginBottom: spacing.l },
  section: { marginBottom: spacing.xl },
  sectionHeading: {
    ...typography.subheadlineEmphasized,
    color: color.text.primary,
    marginBottom: spacing.s,
  },
  paragraph: {
    ...typography.subheadline,
    color: color.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.s,
  },
  bulletRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  bulletDot: { ...typography.subheadline, color: color.text.tertiary, lineHeight: 22 },
  bulletText: { flex: 1, ...typography.subheadline, color: color.text.secondary, lineHeight: 22 },
});
