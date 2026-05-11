// 사장님 인증 게시글 작성 모달 — 텍스트 + (선택) 사진 1장
// 사진은 canvas 리사이즈로 base64 압축 후 localStorage 저장.

import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui';
import { color, radius, spacing, typography } from '@/constants/tokens';
import { addOwnerPost } from '@/utils/owner';

export type OwnerPostComposeModalProps = {
  visible: boolean;
  restaurantId: string;
  userId: number;
  onClose: () => void;
};

const MAX_BODY = 500;
const MAX_IMG_WIDTH = 1280;
const IMG_QUALITY = 0.78;

export function OwnerPostComposeModal({
  visible,
  restaurantId,
  userId,
  onClose,
}: OwnerPostComposeModalProps) {
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!visible) {
      setBody('');
      setPhoto(null);
      setBusy(false);
    }
  }, [visible]);

  const valid = body.trim().length >= 1;

  const handlePickPhoto = () => {
    if (Platform.OS !== 'web') return;
    if (!fileRef.current) {
      // 입력 element를 매 호출마다 새로 만들면 onchange 안 잡히는 케이스 회피
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = handleFileChange;
      fileRef.current = input;
    }
    fileRef.current.value = '';
    fileRef.current.click();
  };

  const handleFileChange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, MAX_IMG_WIDTH, IMG_QUALITY);
      setPhoto(dataUrl);
    } catch {
      if (typeof window !== 'undefined') window.alert('사진을 불러오지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = () => {
    if (!valid) return;
    addOwnerPost({
      restaurantId,
      userId,
      body: body.trim(),
      photo: photo ?? undefined,
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
            <Text style={styles.title}>사장님 게시글</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>내용</Text>
            <TextInput
              value={body}
              onChangeText={(t) => setBody(t.slice(0, MAX_BODY))}
              multiline
              numberOfLines={5}
              placeholder="조리대 청소, 식재료 입고, 위생 점검 등 가게의 노력을 자유롭게 적어주세요"
              placeholderTextColor={color.text.tertiary}
              style={styles.textarea}
              accessibilityLabel="게시글 내용"
            />
            <Text style={styles.counter}>
              {body.length} / {MAX_BODY}
            </Text>

            <Text style={[styles.label, { marginTop: spacing.l }]}>사진 (선택)</Text>
            {photo ? (
              <View style={styles.photoWrap}>
                <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
                <Pressable
                  onPress={() => setPhoto(null)}
                  accessibilityRole="button"
                  accessibilityLabel="사진 제거"
                  style={styles.photoRemove}>
                  <Icon name="close" size={14} color={color.surface.subtle} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handlePickPhoto}
                accessibilityRole="button"
                accessibilityLabel="사진 추가"
                style={({ pressed }) => [styles.photoPicker, pressed && { opacity: 0.7 }]}>
                {busy ? (
                  <ActivityIndicator color={color.brand.primary} />
                ) : (
                  <>
                    <Icon name="camera" size={20} color={color.brand.primary} />
                    <Text style={styles.photoPickerText}>사진 추가</Text>
                  </>
                )}
              </Pressable>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={!valid || busy}
              onPress={handleSubmit}>
              게시하기
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// 동일 helper가 review/[id].tsx에도 있음 — 추후 utils/image.ts로 통합 검토
function fileToCompressedDataUrl(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const ratio = Math.min(1, maxWidth / img.width);
        const w = Math.max(1, Math.round(img.width * ratio));
        const h = Math.max(1, Math.round(img.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas 2d context unavailable'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('image load failed'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(reader.error ?? new Error('file read failed'));
    reader.readAsDataURL(file);
  });
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
  title: { ...typography.title, fontSize: 18, lineHeight: 24, color: color.text.primary },
  cancel: { ...typography.body, color: color.text.secondary },

  content: { paddingHorizontal: spacing.l, paddingTop: spacing.s, paddingBottom: spacing.xl },
  label: { ...typography.subheadlineEmphasized, color: color.text.primary, marginBottom: spacing.s },
  // 입력 톤은 리뷰 작성의 memoInput과 동일 (surface.subtle + 1px border)
  textarea: {
    minHeight: 120,
    backgroundColor: color.surface.subtle,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    ...typography.body,
    color: color.text.primary,
    textAlignVertical: 'top',
  },
  counter: {
    ...typography.footnote,
    color: color.text.tertiary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  photoPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.l,
    borderRadius: radius.m,
    backgroundColor: color.surface.subtle,
    borderWidth: 1,
    borderColor: color.border.default,
    borderStyle: 'dashed',
  },
  photoPickerText: { ...typography.bodyEmphasized, color: color.brand.primary },

  photoWrap: { position: 'relative' },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.m,
    backgroundColor: color.fill.quaternary,
  },
  photoRemove: {
    position: 'absolute',
    top: spacing.s,
    right: spacing.s,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  footer: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.s,
    borderTopWidth: 1,
    borderTopColor: color.border.default,
  },
});
