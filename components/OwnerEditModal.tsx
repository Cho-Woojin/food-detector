// 사장님 가게 정보 수정 모달 — 영업시간·전화번호·휴무일 inline edit
// 수정값은 utils/owner.setOwnerEdit으로 localStorage에 저장. 정보 탭에서 raw 값 위에 덮어쓴다.

import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui';
import { color, radius, spacing, typography } from '@/constants/tokens';
import { setOwnerEdit, type OwnerEdit } from '@/utils/owner';

export type OwnerEditModalProps = {
  visible: boolean;
  restaurantId: string;
  // 현재 표시 중인 값 (raw 또는 raw+edit 합성치) — placeholder로 노출
  initial: { phone?: string; hours?: string; closedDay?: string };
  // 이미 저장된 사장님 수정값 (수정 안 된 필드는 비워둠)
  current?: OwnerEdit | null;
  onClose: () => void;
};

const PHONE_RX = /^[0-9-+\s()]*$/;

export function OwnerEditModal({
  visible,
  restaurantId,
  initial,
  current,
  onClose,
}: OwnerEditModalProps) {
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('');
  const [closedDay, setClosedDay] = useState('');

  // 모달 열릴 때 현재 저장된 사장님 수정값으로 초기화
  useEffect(() => {
    if (!visible) return;
    setPhone(current?.phone ?? '');
    setHours(current?.hours ?? '');
    setClosedDay(current?.closedDay ?? '');
  }, [visible, current?.phone, current?.hours, current?.closedDay]);

  const phoneValid = PHONE_RX.test(phone);

  const handleSubmit = () => {
    if (!phoneValid) return;
    setOwnerEdit(restaurantId, {
      phone: phone.trim() || undefined,
      hours: hours.trim() || undefined,
      closedDay: closedDay.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="닫기">
              <Text style={styles.cancel}>취소</Text>
            </Pressable>
            <Text style={styles.title}>가게 정보 수정</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Field
              label="전화번호"
              value={phone}
              onChange={setPhone}
              placeholder={initial.phone ?? '02-1234-5678'}
              keyboardType="phone-pad"
              error={!phoneValid ? '숫자·기호만 입력해 주세요' : undefined}
            />

            <Field
              label="영업시간"
              value={hours}
              onChange={setHours}
              placeholder={initial.hours ?? '11:00 - 22:00'}
            />

            <Field
              label="휴무일"
              value={closedDay}
              onChange={setClosedDay}
              placeholder={initial.closedDay ?? '매주 일요일'}
            />

            <Text style={styles.hint}>
              비워두면 식약처 기본 정보가 표시돼요. 수정한 값은 모든 사용자에게 보입니다.
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={!phoneValid}
              onPress={handleSubmit}>
              저장하기
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
  error?: string;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={color.text.tertiary}
        keyboardType={keyboardType}
        style={[styles.input, error ? styles.inputError : null]}
        accessibilityLabel={label}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: color.surface.subtle,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: '90%',
    paddingBottom: spacing.l,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: color.border.default,
    alignSelf: 'center',
    marginTop: spacing.s,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
  },
  title: { ...typography.headline, color: color.text.primary },
  cancel: { ...typography.body, color: color.text.secondary },

  content: { paddingHorizontal: spacing.l, paddingTop: spacing.s, paddingBottom: spacing.xl },

  fieldBlock: { marginBottom: spacing.l },
  label: { ...typography.captionEmphasized, color: color.text.secondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: color.fill.tertiary,
    borderRadius: radius.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    ...typography.body,
    color: color.text.primary,
  },
  inputError: { borderWidth: 1, borderColor: color.status.danger },
  errorText: { ...typography.footnote, color: color.status.danger, marginTop: spacing.xxs },

  hint: { ...typography.caption, color: color.text.tertiary, marginTop: spacing.s },

  footer: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.s,
    borderTopWidth: 1,
    borderTopColor: color.border.default,
  },
});
