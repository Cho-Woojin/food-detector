// 식당 상세 페이지 공유 시트 — 링크 복사 / 메시지 / 카카오톡 친구 공유 선택
//
// iOS Safari 등 일부 브라우저는 navigator.share 지원하므로 시스템 공유 시트 활용 가능.
// 그 외엔 카카오톡 / 링크 복사 / SMS 옵션을 직접 제공.

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

import { Icon } from '@/components/Icon';
import { color, radius, spacing, typography } from '@/constants/tokens';
import { shareRestaurantToKakao } from '@/utils/kakaoShare';

export type ShareTarget = {
  id: string;
  name: string;
  cat: string;
  gu: string;
  score: number;
  grade: 'GOLDEN' | 'SILVER' | 'BRONZE' | 'ROTTEN';
};

interface Props {
  visible: boolean;
  target: ShareTarget | null;
  onClose: () => void;
}

export function ShareSheet({ visible, target, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

  if (!target) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </View>
      </Modal>
    );
  }

  const url = (typeof window !== 'undefined' ? window.location.origin : '') + `/restaurant/${target.id}`;
  const gradeKr = target.grade === 'GOLDEN' ? '골드 치즈'
    : target.grade === 'SILVER' ? '실버 치즈'
    : target.grade === 'BRONZE' ? '브론즈 치즈'
    : '트랩 치즈';
  const shareText = `${target.name} — 식탐정 ${gradeKr} (${target.cat} · ${target.gu})`;

  const onCopy = async () => {
    try {
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        // fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => { setCopied(false); onClose(); }, 1200);
    } catch (e) {
      if (__DEV__) console.warn('[ShareSheet] copy 실패', e);
    }
  };

  const onMessage = () => {
    // SMS 링크 — 모바일에선 메시지 앱 열림. 데스크톱은 무시될 수 있음
    const body = encodeURIComponent(`${shareText}\n${url}`);
    if (typeof window !== 'undefined') {
      window.location.href = `sms:?&body=${body}`;
    }
    onClose();
  };

  const onKakao = async () => {
    await shareRestaurantToKakao(target);
    onClose();
  };

  const onSystemShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: target.name, text: shareText, url });
      } catch {}
      onClose();
    }
  };

  const hasSystemShare = typeof navigator !== 'undefined' && !!(navigator as any).share;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="닫기" />
        <View style={[styles.sheet, { paddingBottom: spacing.l + insets.bottom }]}>
          <View style={styles.handle} />
          <Text style={styles.title} numberOfLines={1}>{target.name}</Text>
          <Text style={styles.subtitle}>이 식당을 어떻게 공유할까요?</Text>

          <View style={styles.options}>
            <ShareOption
              icon="💬"
              label="카카오톡 친구"
              onPress={onKakao}
            />
            <ShareOption
              icon="🔗"
              label={copied ? '복사됐어요!' : '링크 복사'}
              onPress={onCopy}
              highlight={copied}
            />
            <ShareOption
              icon="✉️"
              label="메시지"
              onPress={onMessage}
            />
            {hasSystemShare && (
              <ShareOption
                icon="📤"
                label="다른 앱으로"
                onPress={onSystemShare}
              />
            )}
          </View>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="닫기"
            style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}>
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ShareOption({
  icon, label, onPress, highlight,
}: { icon: string; label: string; onPress: () => void; highlight?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.option,
        pressed && { backgroundColor: color.fill.tertiary },
      ]}>
      <View style={styles.optionIcon}>
        <Text style={styles.optionEmoji}>{icon}</Text>
      </View>
      <Text style={[styles.optionLabel, highlight && { color: color.brand.primary, fontWeight: '700' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: color.surface.subtle,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.s,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: color.border.default,
    marginBottom: spacing.l,
  },
  title: { ...typography.title, color: color.text.primary, marginBottom: spacing.xxs },
  subtitle: { ...typography.subheadline, color: color.text.secondary, marginBottom: spacing.l },

  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    marginBottom: spacing.m,
  },
  option: {
    flexBasis: '22%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: spacing.m,
    borderRadius: radius.l,
  },
  optionIcon: {
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: color.surface.canvas,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  optionEmoji: { fontSize: 26 },
  optionLabel: { ...typography.caption, color: color.text.primary },

  cancel: {
    paddingVertical: spacing.m,
    alignItems: 'center',
    marginTop: spacing.s,
  },
  cancelText: { ...typography.bodyEmphasized, color: color.text.secondary },
});
