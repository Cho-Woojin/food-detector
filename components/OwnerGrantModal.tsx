// 관리자 전용 — 사장님 권한 부여 모달
// kakao userId 입력 → setOwner(restaurantId, userId). "내 id로 지정" 단축 버튼 포함.

import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useState } from 'react';

import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui';
import { color, radius, spacing, typography } from '@/constants/tokens';
import { useKakaoUser } from '@/utils/kakaoAuth';
import { clearOwner, getOwnerId, setOwner } from '@/utils/owner';

export type OwnerGrantModalProps = {
  visible: boolean;
  restaurantId: string;
  restaurantName: string;
  onClose: () => void;
};

export function OwnerGrantModal({ visible, restaurantId, restaurantName, onClose }: OwnerGrantModalProps) {
  const me = useKakaoUser();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const currentOwner = visible ? getOwnerId(restaurantId) : null;

  useEffect(() => {
    if (visible) {
      setInput('');
      setError(null);
    }
  }, [visible]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return setError('kakao userId를 입력해 주세요');
    const id = Number(trimmed);
    if (!Number.isFinite(id) || id <= 0) return setError('숫자만 입력해 주세요');
    setOwner(restaurantId, id);
    onClose();
  };

  const handleSelfGrant = () => {
    if (!me) return;
    setOwner(restaurantId, me.id);
    onClose();
  };

  const handleRevoke = () => {
    clearOwner(restaurantId);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconBadge}>
              <Icon name="logo" size={16} color={color.text.onBrand} />
            </View>
            <Text style={styles.title}>사장님 지정</Text>
          </View>

          <Text style={styles.target} numberOfLines={1}>{restaurantName}</Text>

          {currentOwner != null ? (
            <View style={styles.currentRow}>
              <Icon name="star" size={12} color={color.brand.primary} />
              <Text style={styles.currentText}>현재 사장님: id {currentOwner}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>kakao userId</Text>
          <TextInput
            value={input}
            onChangeText={(t) => { setInput(t); setError(null); }}
            placeholder="예: 1234567890"
            placeholderTextColor={color.text.tertiary}
            keyboardType="number-pad"
            style={[styles.input, error ? styles.inputError : null]}
            accessibilityLabel="kakao userId"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {me ? (
            <Pressable
              onPress={handleSelfGrant}
              accessibilityRole="button"
              style={({ pressed }) => [styles.selfBtn, pressed && { opacity: 0.7 }]}>
              <Icon name="forward" size={12} color={color.brand.primary} />
              <Text style={styles.selfText}>
                내 id ({me.id})로 지정 — 시연용
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.actions}>
            {currentOwner != null ? (
              <Button variant="danger" size="md" onPress={handleRevoke}>
                권한 해제
              </Button>
            ) : null}
            <View style={{ flex: 1 }}>
              <Button variant="primary" size="md" fullWidth onPress={handleSubmit}>
                지정하기
              </Button>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="닫기"
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}>
            <Icon name="close" size={16} color={color.text.tertiary} />
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.l,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: color.surface.subtle,
    borderRadius: radius.xl,
    padding: spacing.l,
    position: 'relative',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginBottom: spacing.xs },
  iconBadge: {
    width: 32, height: 32, borderRadius: radius.pill,
    backgroundColor: color.brand.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { ...typography.title, fontSize: 18, lineHeight: 24, color: color.text.primary },

  target: { ...typography.subheadline, color: color.text.secondary, marginBottom: spacing.s },

  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    backgroundColor: color.brand.primarySoft,
    borderRadius: radius.s,
    alignSelf: 'flex-start',
    marginBottom: spacing.m,
  },
  currentText: { ...typography.captionEmphasized, color: color.brand.primary },

  label: { ...typography.subheadlineEmphasized, color: color.text.primary, marginTop: spacing.s, marginBottom: spacing.xs },
  // 입력 톤은 리뷰 작성의 memoInput과 동일 (surface.subtle + 1px border)
  input: {
    backgroundColor: color.surface.subtle,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    ...typography.body,
    color: color.text.primary,
  },
  inputError: { borderColor: color.status.danger },
  errorText: { ...typography.footnote, color: color.status.danger, marginTop: spacing.xxs },

  selfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  selfText: { ...typography.caption, color: color.brand.primary, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.l },

  closeBtn: {
    position: 'absolute',
    top: spacing.m,
    right: spacing.m,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
