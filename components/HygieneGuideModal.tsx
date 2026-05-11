// 식중독 위험 태그(raw_fish/fugu/raw_meat 등) 클릭 시 표시되는 가이드 모달.
// data/hygiene-guides.json의 컨텐츠를 카드 형태로 노출.

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { RiskTag } from '@/constants/Restaurant';
import { color, radius, spacing, typography } from '@/constants/tokens';
import guides from '@/data/hygiene-guides.json';

type Guide = {
  title: string;
  subtitle: string;
  tone: 'caution' | 'warning' | 'danger';
  risks: { name: string; desc: string }[];
  tips: string[];
};

interface Props {
  tag: RiskTag | null;
  onClose: () => void;
}

// 가이드 톤 — 따뜻한 호박/테라코타/코랄 (status 토큰과 동기화)
const TONE_COLOR: Record<Guide['tone'], { fg: string; bg: string }> = {
  caution: { fg: '#F5C037', bg: 'rgba(245,192,55,0.14)' },
  warning: { fg: '#F08A4B', bg: 'rgba(240,138,75,0.14)' },
  danger:  { fg: '#EF5B4C', bg: 'rgba(239,91,76,0.14)' },
};

export function HygieneGuideModal({ tag, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const guide = (tag ? (guides as Record<string, Guide>)[tag] : null) ?? null;

  return (
    <Modal
      visible={!!tag}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="닫기" />
        <View style={[styles.sheet, { paddingBottom: spacing.xxl + insets.bottom }]}>
          {/* 핸들 */}
          <View style={styles.handle} />

          {guide ? (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {/* 헤더 */}
              <View style={[styles.header, { backgroundColor: TONE_COLOR[guide.tone].bg }]}>
                <View style={[styles.headerIcon, { backgroundColor: TONE_COLOR[guide.tone].fg }]}>
                  <Icon name="warning" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{guide.title}</Text>
                  <Text style={styles.subtitle}>{guide.subtitle}</Text>
                </View>
              </View>

              {/* 주요 위험 */}
              <Text style={styles.sectionTitle}>주요 위험</Text>
              <View style={styles.risksBlock}>
                {guide.risks.map((r) => (
                  <View key={r.name} style={styles.riskCard}>
                    <Text style={[styles.riskName, { color: TONE_COLOR[guide.tone].fg }]}>{r.name}</Text>
                    <Text style={styles.riskDesc}>{r.desc}</Text>
                  </View>
                ))}
              </View>

              {/* 안전하게 먹기 */}
              <Text style={styles.sectionTitle}>안전하게 먹는 법</Text>
              <View style={styles.tipsBlock}>
                {guide.tips.map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <View style={[styles.tipDot, { backgroundColor: TONE_COLOR[guide.tone].fg }]} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.disclaimer}>
                일반 정보 안내용으로, 의학적 자문이 아니에요. 증상이 있으면 의료기관 상담 권장.
              </Text>
            </ScrollView>
          ) : null}

          {/* 닫기 버튼 */}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="닫기"
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.85 }]}>
            <Text style={styles.closeText}>확인했어요</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: color.surface.subtle,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.border.default,
    marginTop: spacing.s,
    marginBottom: spacing.m,
  },
  content: { paddingHorizontal: spacing.l, paddingBottom: spacing.l },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    padding: spacing.m,
    borderRadius: radius.l,
    marginBottom: spacing.l,
  },
  headerIcon: {
    width: 36, height: 36,
    borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { ...typography.title, color: color.text.primary, marginBottom: 2 },
  subtitle: { ...typography.footnote, color: color.text.secondary },

  sectionTitle: {
    ...typography.subheadlineEmphasized,
    color: color.text.primary,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },

  risksBlock: { gap: spacing.s },
  riskCard: {
    backgroundColor: color.surface.canvas,
    padding: spacing.m,
    borderRadius: radius.m,
  },
  riskName: { ...typography.bodyEmphasized, marginBottom: spacing.xxs },
  riskDesc: { ...typography.footnote, color: color.text.secondary, lineHeight: 19 },

  tipsBlock: { gap: spacing.s, marginBottom: spacing.l },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s },
  tipDot: {
    width: 6, height: 6, borderRadius: 3,
    marginTop: 7,
  },
  tipText: { flex: 1, ...typography.subheadline, color: color.text.primary, lineHeight: 22 },

  disclaimer: {
    ...typography.caption,
    color: color.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.m,
  },

  closeBtn: {
    marginHorizontal: spacing.l,
    marginTop: spacing.m,
    paddingVertical: spacing.m,
    borderRadius: radius.l,
    backgroundColor: color.brand.primary,
    alignItems: 'center',
  },
  closeText: { ...typography.bodyEmphasized, color: color.surface.subtle },
});
