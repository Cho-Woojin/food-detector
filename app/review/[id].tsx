import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Button, Card, Chip, IconButton } from '@/components/ui';
import { color, radius, spacing, typography } from '@/constants/tokens';
import { findRestaurantById } from '@/utils/dataStore';
import { loginWithKakao, useKakaoUser } from '@/utils/kakaoAuth';
import { FOREIGN_OBJECTS, addReview, sentimentFromRating, tagsFor, type ReviewSentiment } from '@/utils/reviews';

const RATING_LABEL: Record<number, string> = {
  1: '많이 아쉬워요',
  2: '아쉬워요',
  3: '보통이에요',
  4: '괜찮아요',
  5: '아주 좋아요',
};

const SENTIMENT_QUESTION: Record<ReviewSentiment, string> = {
  positive: '어떤 점이 좋았나요?',
  negative: '어떤 점이 아쉬웠나요?',
};

const MAX_PHOTOS = 4;

export default function ReviewComposeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const kakaoUser = useKakaoUser();
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [foreign, setForeign] = useState<Set<string>>(new Set());
  const [visitDate, setVisitDate] = useState<string>(todayISO());
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    findRestaurantById(String(id ?? '')).then((r) => {
      if (cancelled) return;
      setRestaurantName(r?.name ?? '');
    });
    return () => { cancelled = true; };
  }, [id]);

  const sentiment = sentimentFromRating(rating);
  const availableTags = useMemo(
    () => (sentiment ? tagsFor(sentiment) : []),
    [sentiment],
  );

  // 별점 분기가 바뀌면 (긍↔부) 이전 선택 태그를 떨어뜨려서 잘못된 응답 방지
  useEffect(() => {
    setTags((prev) => {
      const allowed = new Set(availableTags);
      const filtered = [...prev].filter((t) => allowed.has(t));
      return filtered.length === prev.size ? prev : new Set(filtered);
    });
  }, [availableTags]);

  const canSubmit = rating > 0 && tags.size >= 1 && isValidDate(visitDate) && !submitting;

  const toggleTag = (t: string) => {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  const toggleForeign = (t: string) => {
    setForeign((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  const pickPhotos = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      Alert.alert('웹에서만 지원', '모바일 사진 첨부는 준비 중이에요.');
      return;
    }
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []).slice(0, remaining);
      const urls = await Promise.all(files.map((f) => fileToCompressedDataUrl(f, 1024, 0.82)));
      setPhotos((prev) => [...prev, ...urls].slice(0, MAX_PHOTOS));
    };
    input.click();
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setTimeout(() => {
      addReview({
        userId: kakaoUser?.id != null ? String(kakaoUser.id) : null,
        restaurantId: String(id ?? ''),
        restaurantName,
        rating,
        tags: [...tags],
        foreignObjects: [...foreign],
        body: body.trim(),
        photos,
        visitDate,
      });
      setSubmitting(false);
      // web의 Alert.alert는 버튼 콜백을 지원 안 함 → 직접 분기
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('리뷰가 등록됐어요. 식탐정이 검토 후 반영해요.');
      } else {
        Alert.alert('리뷰가 등록됐어요', '식탐정이 검토 후 반영해요.');
      }
      router.back();
    }, 300);
  };

  const ratingHint = rating > 0 ? RATING_LABEL[rating] : '별점을 먼저 선택해주세요';

  if (!kakaoUser) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
          <IconButton icon="back" size="md" accessibilityLabel="뒤로 가기" onPress={() => router.back()} />
          <Text style={styles.topTitle}>위생 리뷰 작성</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.gateWrap}>
          <Icon name="logo" size={44} color={color.brand.primary} />
          <Text style={styles.gateTitle}>로그인하고 위생 리뷰 작성</Text>
          <Text style={styles.gateBody}>
            리뷰는 다른 사용자의 식당 선택에 영향을 줘요. 책임 있는 리뷰를 위해 카카오 로그인이 필요해요.
          </Text>
          <View style={{ width: '100%', marginTop: spacing.l }}>
            <Button
              variant="kakao"
              size="lg"
              fullWidth
              leftIcon="chat"
              onPress={() => {
                if (typeof sessionStorage !== 'undefined' && id) {
                  sessionStorage.setItem('food-detector:pending-review', String(id));
                }
                loginWithKakao();
              }}>
              카카오로 로그인
            </Button>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <IconButton icon="back" size="md" accessibilityLabel="뒤로 가기" onPress={() => router.back()} />
        <Text style={styles.topTitle}>위생 리뷰 작성</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* 식당 헤더 */}
        <Card variant="tinted" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
          <Text style={styles.subjectLabel}>리뷰 대상</Text>
          <Text style={styles.subjectName} numberOfLines={1}>{restaurantName || '식당'}</Text>
        </Card>

        {/* 별점 */}
        <Card variant="elevated" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
          <Text style={styles.blockTitle}>전체 만족도</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Pressable
                key={i}
                onPress={() => setRating(i)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`${i}점`}
                accessibilityState={{ selected: rating >= i }}
                style={styles.starBtn}>
                <Icon
                  name="star"
                  size={36}
                  color={i <= rating ? color.brand.secondary : color.border.default}
                />
              </Pressable>
            ))}
          </View>
          <Text style={[styles.ratingHint, rating > 0 && styles.ratingHintActive]}>
            {ratingHint}
          </Text>
        </Card>

        {/* 방문일 (필수) */}
        <Card variant="elevated" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
          <View style={styles.blockHeader}>
            <Text style={styles.blockTitle}>방문일</Text>
            <Text style={styles.requiredBadge}>필수</Text>
          </View>
          <Text style={styles.blockHint}>다녀온 날짜를 골라주세요</Text>
          {Platform.OS === 'web' ? (
            // RN-Web에서 native date picker 사용 (TextInput type=date 미지원)
            <input
              type="date"
              value={visitDate}
              max={todayISO()}
              onChange={(e: any) => setVisitDate(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 14,
                border: `1px solid ${color.border.default}`,
                fontSize: 17,
                fontFamily: 'inherit',
                background: color.surface.subtle,
                color: color.text.primary,
                boxSizing: 'border-box',
              }}
            />
          ) : (
            <TextInput
              value={visitDate}
              onChangeText={setVisitDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={color.text.tertiary}
              style={styles.input}
              accessibilityLabel="방문일"
            />
          )}
        </Card>

        {/* Chip 분기 */}
        {sentiment ? (
          <Card variant="elevated" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
            <View style={styles.blockHeader}>
              <Text style={styles.blockTitle}>{SENTIMENT_QUESTION[sentiment]}</Text>
              <Text style={styles.requiredBadge}>필수</Text>
            </View>
            <Text style={styles.blockHint}>해당하는 항목을 모두 골라주세요 (1개 이상)</Text>
            <View style={styles.tagsRow}>
              {availableTags.map((t) => (
                <Chip
                  key={t}
                  variant="filter"
                  size="md"
                  selected={tags.has(t)}
                  onPress={() => toggleTag(t)}>
                  {t}
                </Chip>
              ))}
            </View>
          </Card>
        ) : (
          <Card variant="outlined" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
            <Text style={styles.placeholderText}>별점을 매기면 위생 항목 선택지가 나타나요</Text>
          </Card>
        )}

        {/* 이물질 발견 (별점 무관, 항상 노출) */}
        {rating > 0 && (
          <Card variant="elevated" padding="l" radius="l" style={{ ...styles.alertCard, marginBottom: spacing.l }}>
            <View style={styles.blockHeader}>
              <View style={styles.alertTitleRow}>
                <Icon name="warning" size={18} color={color.status.danger} />
                <Text style={styles.blockTitle}>이물질 발견 여부</Text>
              </View>
              <Text style={styles.optionalBadge}>선택</Text>
            </View>
            <Text style={styles.blockHint}>발견한 항목이 있다면 모두 표시해주세요</Text>
            <View style={styles.tagsRow}>
              {FOREIGN_OBJECTS.map((t) => {
                const selected = foreign.has(t);
                return (
                  <Pressable
                    key={t}
                    onPress={() => toggleForeign(t)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.alertChip,
                      selected && styles.alertChipSelected,
                    ]}>
                    <Text
                      style={[
                        styles.alertChipLabel,
                        selected && styles.alertChipLabelSelected,
                      ]}>
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        )}

        {/* 사진 첨부 (선택) */}
        <Card variant="elevated" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
          <View style={styles.blockHeader}>
            <Text style={styles.blockTitle}>사진 첨부</Text>
            <Text style={styles.optionalBadge}>{photos.length}/{MAX_PHOTOS}</Text>
          </View>
          <Text style={styles.blockHint}>위생 상태가 보이는 사진 (선택)</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.s }}>
            <View style={styles.photosRow}>
              {photos.length < MAX_PHOTOS && (
                <Pressable onPress={pickPhotos} style={styles.photoAddBtn} accessibilityRole="button" accessibilityLabel="사진 추가">
                  <Icon name="camera" size={26} color={color.text.secondary} />
                  <Text style={styles.photoAddLabel}>추가</Text>
                </Pressable>
              )}
              {photos.map((src, i) => (
                <View key={`${i}-${src.slice(-12)}`} style={styles.photoThumbWrap}>
                  <Image source={{ uri: src }} style={styles.photoThumb} />
                  <Pressable
                    onPress={() => removePhoto(i)}
                    style={styles.photoRemoveBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`사진 ${i + 1} 제거`}
                    hitSlop={6}>
                    <Icon name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        </Card>

        {/* 한줄평 (선택) */}
        <Card variant="elevated" padding="l" radius="l" style={{ marginBottom: spacing.l }}>
          <View style={styles.blockHeader}>
            <Text style={styles.blockTitle}>한줄평</Text>
            <Text style={styles.optionalBadge}>선택</Text>
          </View>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="더 자세한 설명을 적어주세요"
            placeholderTextColor={color.text.tertiary}
            multiline
            textAlignVertical="top"
            maxLength={500}
            style={styles.input}
            accessibilityLabel="리뷰 본문"
          />
          <Text style={styles.charCount}>{body.length} / 500</Text>
        </Card>
      </ScrollView>

      <View style={[styles.submitBar, { paddingBottom: insets.bottom + spacing.m }]}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!canSubmit}
          loading={submitting}
          leftIcon="pencil"
          onPress={handleSubmit}>
          리뷰 등록하기
        </Button>
      </View>
    </View>
  );
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  if (isNaN(d.getTime())) return false;
  // 미래 날짜 차단
  return d.getTime() <= Date.now() + 24 * 60 * 60 * 1000;
}

// 웹 전용: File → 리사이즈된 JPEG data URL (localStorage 부담 줄임)
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
  root: { flex: 1, backgroundColor: color.surface.canvas },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.s,
    gap: spacing.xs,
    backgroundColor: color.surface.canvas,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    ...typography.headline,
    color: color.text.primary,
  },
  scroll: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
  },
  subjectLabel: {
    ...typography.caption,
    color: color.text.tertiary,
    marginBottom: spacing.xxs,
  },
  subjectName: {
    ...typography.bodyEmphasized,
    color: color.text.primary,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxs,
  },
  blockTitle: {
    ...typography.headline,
    color: color.text.primary,
  },
  blockHint: {
    ...typography.caption,
    color: color.text.tertiary,
    marginBottom: spacing.s,
  },
  requiredBadge: {
    ...typography.captionEmphasized,
    color: color.status.danger,
  },
  optionalBadge: {
    ...typography.caption,
    color: color.text.tertiary,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.xs,
  },
  starBtn: { padding: 4 },
  ratingHint: {
    ...typography.subheadline,
    color: color.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  ratingHintActive: {
    ...typography.subheadlineEmphasized,
    color: color.brand.primary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  placeholderText: {
    ...typography.subheadline,
    color: color.text.tertiary,
    textAlign: 'center',
    paddingVertical: spacing.s,
  },

  // Foreign object alert section
  alertCard: {
    borderWidth: 1,
    borderColor: color.status.dangerSoft,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertChip: {
    paddingHorizontal: spacing.m + 2,
    paddingVertical: 6,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.subtle,
  },
  alertChipSelected: {
    backgroundColor: color.status.dangerSoft,
    borderColor: color.status.danger,
  },
  alertChipLabel: {
    ...typography.captionEmphasized,
    color: color.text.secondary,
  },
  alertChipLabelSelected: {
    color: color.status.danger,
  },

  // Photos
  photosRow: {
    flexDirection: 'row',
    gap: spacing.s,
    paddingRight: spacing.l,
  },
  photoAddBtn: {
    width: 88,
    height: 88,
    borderRadius: radius.m,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: color.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface.subtle,
    gap: 4,
  },
  photoAddLabel: {
    ...typography.caption,
    color: color.text.secondary,
  },
  photoThumbWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.m,
    overflow: 'hidden',
    backgroundColor: color.fill.quaternary,
    position: 'relative',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Body input
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.m,
    padding: spacing.m,
    ...typography.body,
    color: color.text.primary,
    backgroundColor: color.surface.subtle,
  },
  charCount: {
    ...typography.caption,
    color: color.text.tertiary,
    textAlign: 'right',
    marginTop: spacing.xxs,
  },

  // Login gate
  gateWrap: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
  },
  gateTitle: {
    ...typography.headline,
    color: color.text.primary,
    marginTop: spacing.m,
  },
  gateBody: {
    ...typography.subheadline,
    color: color.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Submit bar
  submitBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
    backgroundColor: color.surface.canvas,
    borderTopWidth: 1,
    borderTopColor: color.border.default,
  },
});
