// 모든 위생 가이드 목록 모달. 항목 클릭 시 HygieneGuideModal로 상세 표시.

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

import { Icon } from '@/components/Icon';
import { HygieneGuideModal } from '@/components/HygieneGuideModal';
import { RiskTag } from '@/constants/Restaurant';
import { color, radius, spacing, typography } from '@/constants/tokens';
import guides from '@/data/hygiene-guides.json';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// 가이드 톤 — 따뜻한 호박/테라코타/코랄 (status 토큰과 동기화)
const TONE_COLOR = {
  caution: '#F5C037',
  warning: '#F08A4B',
  danger:  '#EF5B4C',
};

export function HygieneGuideListModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedTag, setSelectedTag] = useState<RiskTag | null>(null);
  const entries = Object.entries(guides) as [RiskTag, any][];

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="닫기" />
          <View style={[styles.sheet, { paddingBottom: spacing.l + insets.bottom }]}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>위생 가이드</Text>
              <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="닫기">
                <Icon name="close" size={22} color={color.text.secondary} />
              </Pressable>
            </View>

            <Text style={styles.subtitle}>
              날 음식·고위험 식재료별 안전 가이드를 모았어요.
            </Text>

            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {entries.map(([tag, g]) => (
                <Pressable
                  key={tag}
                  onPress={() => setSelectedTag(tag)}
                  accessibilityRole="button"
                  accessibilityLabel={`${g.title} 보기`}
                  style={({ pressed }) => [styles.item, pressed && { backgroundColor: color.fill.tertiary }]}>
                  <View style={[styles.toneBar, { backgroundColor: TONE_COLOR[g.tone as keyof typeof TONE_COLOR] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{g.title}</Text>
                    <Text style={styles.itemSubtitle} numberOfLines={1}>{g.subtitle}</Text>
                  </View>
                  <Icon name="forward" size={18} color={color.text.tertiary} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 항목 클릭 시 표시되는 상세 모달 — list modal 위로 띄움 */}
      <HygieneGuideModal tag={selectedTag} onClose={() => setSelectedTag(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: color.surface.subtle,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: color.border.default,
    marginTop: spacing.s, marginBottom: spacing.m,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    marginBottom: spacing.xs,
  },
  title: { ...typography.title, color: color.text.primary },
  subtitle: {
    ...typography.footnote,
    color: color.text.secondary,
    paddingHorizontal: spacing.l,
    marginBottom: spacing.l,
  },
  list: { paddingHorizontal: spacing.l, paddingBottom: spacing.l, gap: spacing.s },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    borderRadius: radius.l,
    backgroundColor: color.surface.canvas,
  },
  toneBar: { width: 4, height: 36, borderRadius: 2 },
  itemTitle: { ...typography.bodyEmphasized, color: color.text.primary, marginBottom: 2 },
  itemSubtitle: { ...typography.footnote, color: color.text.secondary },
});
