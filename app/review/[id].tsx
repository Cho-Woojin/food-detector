// 위생 리뷰 작성 — 4개 항목 별점 + 방문 시점 + 한 줄 메모 + 사진 (최대 3장).
// 데이터 모델은 utils/reviews.ts의 HygieneReview (axisRatings/visitWindow 옵셔널).

import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  UtensilsCrossed,
  Soup,
  ChefHat,
  ShowerHead,
  CalendarDays,
  MessageCircle,
  Camera as CameraIcon,
  type LucideIcon,
} from 'lucide-react-native';

import { Icon } from '@/components/Icon';
import { Button, Card, IconButton, KakaoLoginButton } from '@/components/ui';
import { Cheese, Mascots } from '@/constants/Assets';
import type { Restaurant as RawRestaurant, GradeKey } from '@/constants/Restaurant';
import { color, radius, spacing, typography } from '@/constants/tokens';
import { findRestaurantById } from '@/utils/dataStore';
import { loginWithKakao, useKakaoUser } from '@/utils/kakaoAuth';
import { useIsOwnerOf } from '@/utils/owner';
import { addReview, useMyReviews, type AxisRating, type VisitWindow } from '@/utils/reviews';

const GRADE_KR_LABEL: Record<GradeKey, string> = {
  GOLDEN: '골드 치즈',
  SILVER: '실버 치즈',
  BRONZE: '브론즈 치즈',
  ROTTEN: '트랩 치즈',
};

const MAX_PHOTOS = 3;
const BODY_COUNTER_FROM = 50;   // 50자부터 카운터 표시
const BODY_MAX = 200;
const BODY_MIN_HEIGHT = 60;
const BODY_MAX_HEIGHT = 200;

type AxisKey = keyof AxisRating;
type AxisDef = {
  key: AxisKey;
  Icon: LucideIcon;
  question: string;     // 토스 스타일 질문형 라벨
  required: boolean;
};

const AXES: AxisDef[] = [
  { key: 'table',    Icon: UtensilsCrossed, question: '테이블·식기는 깨끗했나요?', required: true },
  { key: 'food',     Icon: Soup,            question: '음식은 신선했나요?',         required: true },
  { key: 'staff',    Icon: ChefHat,         question: '직원 위생은 만족스러웠나요?', required: true },
  { key: 'restroom', Icon: ShowerHead,      question: '화장실은 깨끗했나요?',       required: false },
];

const RATING_LABEL: Record<number, string> = {
  1: '많이 아쉬워요',
  2: '아쉬워요',
  3: '보통이에요',
  4: '깨끗해요',
  5: '매우 깨끗',
};

const VISIT_WINDOW_OPTIONS: { key: VisitWindow; label: string }[] = [
  { key: 'today', label: '오늘·어제' },
  { key: 'week',  label: '1주일' },
  { key: 'older', label: '1주일+' },
];

export default function ReviewComposeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const kakaoUser = useKakaoUser();
  const isOwnerOfThisStore = useIsOwnerOf(typeof id === 'string' ? id : null, kakaoUser?.id ?? null);

  const [restaurantName, setRestaurantName] = useState<string>('');
  const [restaurantMeta, setRestaurantMeta] = useState<string>('');
  const [raw, setRaw] = useState<RawRestaurant | null>(null);
  const [axisRatings, setAxisRatings] = useState<AxisRating>({});
  const [visitWindow, setVisitWindow] = useState<VisitWindow>('today');
  const [body, setBody] = useState('');
  const [bodyHeight, setBodyHeight] = useState(BODY_MIN_HEIGHT);
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    findRestaurantById(String(id ?? '')).then((r) => {
      if (cancelled || !r) return;
      setRaw(r);
      setRestaurantName(r.name ?? '');
      setRestaurantMeta(`${r.cat ?? ''}${r.gu ? ` · ${r.gu}` : ''}`);
    });
    return () => { cancelled = true; };
  }, [id]);

  // 평균 평점 (입력된 항목만)
  const ratingValues = Object.values(axisRatings).filter((v): v is number => typeof v === 'number' && v > 0);
  const ratingAvg = ratingValues.length > 0
    ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
    : 0;
  const hasAnyRating = ratingValues.length >= 1;
  // 선택 영역은 별점 1개+ 후 등장, 등록은 필수 항목(table/food/staff)이 모두 채워져야 가능
  const allRequiredRated = AXES
    .filter((a) => a.required)
    .every((a) => (axisRatings[a.key] ?? 0) > 0);
  const canSubmit = allRequiredRated && !submitting;

  const setAxis = (key: AxisKey, v: number) => {
    setAxisRatings((prev) => ({ ...prev, [key]: prev[key] === v ? 0 : v }));
  };

  const pickPhotos = async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;

    // 권한 요청 — iOS/Android는 ImagePicker 자체에서 처리, 웹은 always granted
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      const msg = '사진 첨부를 위해 사진 접근 권한이 필요해요. 설정에서 허용해 주세요.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('권한이 필요해요', msg);
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.82,
      base64: false,
    });
    if (result.canceled || !result.assets?.length) return;

    // 웹은 uri가 blob, 모바일은 file://. 둘 다 Image source로 표시 OK.
    // 로컬 storage 부담 줄이기 위해 웹에서는 추가 압축 적용.
    const urls = await Promise.all(
      result.assets.slice(0, remaining).map(async (a) => {
        if (Platform.OS === 'web' && a.uri.startsWith('blob:') && typeof fetch !== 'undefined') {
          try {
            const blob = await fetch(a.uri).then((r) => r.blob());
            return await blobToCompressedDataUrl(blob, 1024, 0.82);
          } catch {
            return a.uri;
          }
        }
        return a.uri;
      })
    );
    setPhotos((prev) => [...prev, ...urls].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const result = await addReview({
      userId: kakaoUser?.id != null ? String(kakaoUser.id) : null,
      userNickname: kakaoUser?.nickname ?? null,
      userProfileImage: kakaoUser?.profileImage ?? null,
      restaurantId: String(id ?? ''),
      restaurantName,
      rating: Math.round(ratingAvg),
      tags: [],
      foreignObjects: [],
      body: body.trim(),
      photos,
      visitDate: visitDateFromWindow(visitWindow),
      axisRatings,
      visitWindow,
    });
    setSubmitting(false);
    if (!result) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('리뷰 등록에 실패했어요. 잠시 후 다시 시도해주세요.');
      } else {
        Alert.alert('실패', '리뷰 등록에 실패했어요. 잠시 후 다시 시도해주세요.');
      }
      return;
    }
    setSubmitted(true);
  };

  if (!kakaoUser) {
    return <Gate id={typeof id === 'string' ? id : undefined} insets={insets} />;
  }
  if (isOwnerOfThisStore) {
    return <OwnerBlocked id={typeof id === 'string' ? id : undefined} insets={insets} />;
  }
  if (submitted) {
    return (
      <Completed
        ratingAvg={ratingAvg}
        restaurantName={restaurantName}
        restaurantId={typeof id === 'string' ? id : ''}
        insets={insets}
      />
    );
  }

  const grade: GradeKey = (raw?.grade as GradeKey) ?? 'BRONZE';
  const heroCheeseImg =
    grade === 'GOLDEN' ? Cheese.gold
      : grade === 'SILVER' ? Cheese.silver
      : grade === 'BRONZE' ? Cheese.bronze
      : null;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar — 뒤로 */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <IconButton icon="back" size="md" accessibilityLabel="뒤로 가기" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Hero — 상세 보고서와 동일한 좌(치즈) / 우(이름·메타) 2분할 카드 */}
        <Card variant="flat" padding="l" radius="l" style={styles.heroCard}>
          <View style={styles.heroLeft}>
            {heroCheeseImg ? (
              <Image source={heroCheeseImg} style={styles.heroCheese} resizeMode="contain" />
            ) : (
              <View style={[styles.heroCheese, styles.heroCheeseRotten]}>
                <Icon name="warning" size={36} color={color.status.danger} />
              </View>
            )}
            <Text style={[styles.heroGradeLabel, { color: color.cheese[grade].fg }]}>
              {GRADE_KR_LABEL[grade]}
            </Text>
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.heroEyebrow}>위생 리뷰 작성</Text>
            <Text style={styles.heroName} numberOfLines={2}>{restaurantName || '식당'}</Text>
            {restaurantMeta ? <Text style={styles.heroMeta} numberOfLines={1}>{restaurantMeta}</Text> : null}
          </View>
        </Card>

        {/* 4개 위생 항목 — 1개 카드 안 4 row + 각 row 라벨 옆 필수/선택 */}
        <Card variant="elevated" padding="l" radius="l" style={{ marginBottom: spacing.m }}>
          {AXES.map((ax, idx) => {
            const rated = axisRatings[ax.key] ?? 0;
            return (
              <View
                key={ax.key}
                style={[styles.axisRow, idx < AXES.length - 1 && styles.axisRowDivider]}>
                <View style={styles.axisIconBox}>
                  <ax.Icon size={18} color={color.brand.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.axisLabelRow}>
                    <Text style={styles.axisCardLabel}>{ax.question}</Text>
                    <Text style={ax.required ? styles.axisRequired : styles.axisOptional}>
                      {ax.required ? '필수' : '선택'}
                    </Text>
                  </View>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Pressable
                        key={i}
                        onPress={() => setAxis(ax.key, i)}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={`${ax.question} ${i}점`}
                        accessibilityState={{ selected: rated >= i }}
                        style={styles.starBtn}>
                        <Icon
                          name="star"
                          size={18}
                          color={rated >= i ? color.brand.primary : color.border.default}
                        />
                      </Pressable>
                    ))}
                    {rated ? (
                      <Text style={styles.ratingInline}>
                        <Text style={styles.ratingInlineNum}>{rated}</Text>
                        <Text style={styles.ratingInlineLabel}> · {RATING_LABEL[rated]}</Text>
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </Card>

        {/* 선택 항목 — 별점 1개+ 입력 후 등장. 별점 카드와 동일한 톤. */}
        {hasAnyRating ? (
          <>
            {/* 방문 시점 — 라벨 옆 칩 3개 + 우측 "선택" */}
            <Card variant="elevated" padding="m" radius="l" style={styles.optCard}>
              <View style={styles.optHeaderRow}>
                <View style={styles.optHeaderLeft}>
                  <View style={styles.optIconBox}>
                    <CalendarDays size={16} color={color.brand.primary} />
                  </View>
                  <Text style={styles.optLabel}>방문 시점</Text>
                  <Text style={styles.optBadge}>선택</Text>
                </View>
              </View>
              <View style={styles.chipsRow}>
                {VISIT_WINDOW_OPTIONS.map((opt) => {
                  const selected = visitWindow === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setVisitWindow(opt.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={({ pressed }) => [
                        styles.windowChip,
                        selected ? styles.windowChipSelected : styles.windowChipIdle,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={[styles.windowChipText, selected && styles.windowChipTextSelected]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            {/* 한 줄 위생 메모 */}
            <Card variant="elevated" padding="m" radius="l" style={styles.optCard}>
              <View style={styles.optHeaderRow}>
                <View style={styles.optHeaderLeft}>
                  <View style={styles.optIconBox}>
                    <MessageCircle size={16} color={color.brand.primary} />
                  </View>
                  <Text style={styles.optLabel}>위생 리뷰를 작성해주세요</Text>
                  <Text style={styles.optBadge}>선택</Text>
                </View>
              </View>
              <TextInput
                value={body}
                onChangeText={(t) => setBody(t.slice(0, BODY_MAX))}
                placeholder="위생 관련 경험을 알려주세요 (예: 테이블 깨끗, 화장실 청결, 직원 마스크 착용 등)"
                placeholderTextColor={color.text.tertiary}
                multiline
                textAlignVertical="top"
                onContentSizeChange={(e) => {
                  const h = Math.min(
                    BODY_MAX_HEIGHT,
                    Math.max(BODY_MIN_HEIGHT, e.nativeEvent.contentSize.height),
                  );
                  setBodyHeight(h);
                }}
                style={[styles.memoInput, { height: bodyHeight }]}
                accessibilityLabel="한 줄 위생 메모"
              />
              <Text style={[
                styles.memoCounter,
                body.length >= BODY_COUNTER_FROM && styles.memoCounterActive,
              ]}>
                {body.length} / {BODY_MAX}
              </Text>
            </Card>

            {/* 사진 (최대 3장) — 모두 같은 크기 64x64 */}
            <Card variant="elevated" padding="m" radius="l" style={styles.optCard}>
              <View style={styles.optHeaderRow}>
                <View style={styles.optHeaderLeft}>
                  <View style={styles.optIconBox}>
                    <CameraIcon size={16} color={color.brand.primary} />
                  </View>
                  <Text style={styles.optLabel}>사진을 추가해주세요</Text>
                  <Text style={styles.optBadge}>선택</Text>
                </View>
              </View>
              <View style={styles.photosRow}>
                {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
                  const src = photos[i];
                  if (src) {
                    return (
                      <View key={`p-${i}`} style={styles.photoThumbWrap}>
                        <Image source={{ uri: src }} style={styles.photoThumb} />
                        <Pressable
                          onPress={() => removePhoto(i)}
                          style={({ pressed }) => [
                            styles.photoRemoveBtn,
                            pressed && styles.pressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`사진 ${i + 1} 제거`}
                          hitSlop={6}>
                          <Icon name="close" size={12} color="#fff" />
                        </Pressable>
                      </View>
                    );
                  }
                  return (
                    <Pressable
                      key={`p-${i}`}
                      onPress={pickPhotos}
                      style={({ pressed }) => [
                        styles.photoAddBtn,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="사진 추가">
                      <Icon name="add" size={20} color={color.text.tertiary} />
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          </>
        ) : null}
      </ScrollView>

      {/* Sticky 하단 등록 버튼 */}
      <View style={[styles.submitBar, { paddingBottom: insets.bottom + spacing.m }]}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!canSubmit}
          loading={submitting}
          leftIcon="check"
          onPress={handleSubmit}>
          리뷰 등록
        </Button>
      </View>
    </View>
  );
}

// ===== 별도 상태 화면 =====

function Gate({ id, insets }: { id?: string; insets: ReturnType<typeof useSafeAreaInsets> }) {
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <IconButton icon="back" size="md" accessibilityLabel="뒤로 가기" onPress={() => router.back()} />
        <Text style={styles.gateTopTitle}>위생 리뷰 작성</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.gateWrap}>
        <Icon name="logo" size={44} color={color.brand.primary} />
        <Text style={styles.gateTitle}>로그인하고 위생 리뷰 작성</Text>
        <Text style={styles.gateBody}>
          리뷰는 다른 사용자의 식당 선택에 영향을 줘요. 책임 있는 리뷰를 위해 카카오 로그인이 필요해요.
        </Text>
        <View style={{ width: '100%', marginTop: spacing.l }}>
          <KakaoLoginButton
            accessibilityLabel="카카오로 로그인"
            onPress={() => {
              if (typeof sessionStorage !== 'undefined' && id) {
                sessionStorage.setItem('food-detector:pending-review', String(id));
              }
              loginWithKakao();
            }}
          />
        </View>
      </View>
    </View>
  );
}

function OwnerBlocked({ id, insets }: { id?: string; insets: ReturnType<typeof useSafeAreaInsets> }) {
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <IconButton icon="back" size="md" accessibilityLabel="뒤로 가기" onPress={() => router.back()} />
        <Text style={styles.gateTopTitle}>위생 리뷰 작성</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.gateWrap}>
        <Icon name="logo" size={44} color={color.brand.primary} />
        <Text style={styles.gateTitle}>내 가게에는 리뷰를 작성할 수 없어요</Text>
        <Text style={styles.gateBody}>
          대신 고객님 리뷰에 답글을 남기거나, 정보 탭에서 사장님 인증 게시글로 가게의 노력을 알려주세요.
        </Text>
        <View style={{ width: '100%', marginTop: spacing.l }}>
          <Button variant="primary" size="lg" fullWidth onPress={() => router.replace(`/restaurant/${id}` as any)}>
            가게 페이지로 돌아가기
          </Button>
        </View>
      </View>
    </View>
  );
}

// 등록 완료 화면 — 능동적 메시지 + 평균 별점 채움 + 마스코트 spring 애니메이션
function Completed({
  ratingAvg,
  restaurantName,
  restaurantId,
  insets,
}: {
  ratingAvg: number;
  restaurantName: string;
  restaurantId: string;
  insets: ReturnType<typeof useSafeAreaInsets>;
}) {
  const filled = Math.round(ratingAvg); // 0~5
  const myReviews = useMyReviews();
  const nth = myReviews.length; // submit 후라 새 리뷰 포함
  // 닫기: 작성 직전 화면(상세보고서)으로 복귀 — replace로 /review/[id] 스택 정리
  const onClose = () => router.replace(`/restaurant/${restaurantId}` as any);
  // 본 액션: 지도 탭으로 이동 + 현위치 중심 (해당 가게 선택)
  const onExploreMap = () =>
    router.replace(`/(tabs)/map?id=${encodeURIComponent(restaurantId)}&focus=me` as any);
  const mascotScale = useRef(new Animated.Value(0.5)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(mascotScale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }),
      Animated.timing(mascotOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 320,
        delay: 180,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 320,
        delay: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [mascotScale, mascotOpacity, contentOpacity, contentTranslateY]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* 우상단 닫기 X — 좌상단 뒤로 버튼은 중복이라 제거 */}
      <View style={[styles.completedTopBar, { paddingTop: insets.top + spacing.xs }]}>
        <View style={{ flex: 1 }} />
        <IconButton icon="close" size="md" accessibilityLabel="닫기" onPress={onClose} />
      </View>
      <View style={styles.completedWrap}>
        <Animated.Image
          source={Mascots.ceremony}
          style={[
            styles.completedMascot,
            { transform: [{ scale: mascotScale }], opacity: mascotOpacity },
          ]}
          resizeMode="contain"
        />
        <Animated.View
          style={{
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
            width: '100%',
            alignItems: 'center',
          }}>
          <Text style={styles.completedHeadline}>{nth}번째 위생 리뷰를 작성했어요!</Text>
          <Text style={styles.completedBody}>
            <Text style={styles.completedRestaurant}>{restaurantName}</Text>의 위생 안전에 보탰어요.
          </Text>
        </Animated.View>

        <Animated.View
          style={{
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
            alignSelf: 'stretch',
          }}>
          <View style={styles.completedAvgBox}>
            <Text style={styles.completedAvgLabel}>내가 준 평균</Text>
            <View style={styles.completedStarsRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Icon
                  key={i}
                  name="star"
                  size={28}
                  color={i <= filled ? color.brand.primary : color.border.default}
                />
              ))}
            </View>
            <Text style={styles.completedAvgNum}>{ratingAvg.toFixed(1)}</Text>
          </View>

          <View style={{ width: '100%', marginTop: spacing.xl }}>
            <Button variant="primary" size="lg" leftIcon="map" fullWidth onPress={onExploreMap}>
              지도에서 가게 살펴보기
            </Button>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

// ===== Helpers =====

function visitDateFromWindow(w: VisitWindow): string {
  const d = new Date();
  if (w === 'today') d.setDate(d.getDate() - 0);
  else if (w === 'week') d.setDate(d.getDate() - 4);   // 1주일 내 중간값
  else d.setDate(d.getDate() - 10);                    // 1주일+
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function blobToCompressedDataUrl(blob: Blob, maxWidth: number, quality: number): Promise<string> {
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
    reader.onerror = () => reject(reader.error ?? new Error('blob read failed'));
    reader.readAsDataURL(blob);
  });
}

// ===== Styles =====

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.canvas },

  // Top bar — 뒤로 버튼만
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingBottom: spacing.xs,
    backgroundColor: color.surface.canvas,
  },

  // Hero — 상세 보고서와 동일한 좌우 2분할 (치즈 / 이름·메타)
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.l,
    marginBottom: spacing.m,
  },
  heroLeft: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 88,
  },
  heroCheese: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCheeseRotten: {
    backgroundColor: color.status.dangerSoft,
    borderRadius: radius.l,
  },
  heroGradeLabel: {
    ...typography.captionEmphasized,
    textAlign: 'center',
  },
  heroRight: {
    flex: 1,
    gap: 2,
  },
  heroEyebrow: {
    ...typography.caption,
    color: color.brand.primary,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  heroName: {
    ...typography.title,
    fontSize: 20,
    lineHeight: 26,
    color: color.text.primary,
  },
  heroMeta: {
    ...typography.caption,
    color: color.text.secondary,
  },

  scroll: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
  },

  // 위생 항목 1박스 4 row — 통합 카드 안 row 구분선
  axisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s + 2,
    paddingVertical: spacing.s + 2,
  },
  axisRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border.default,
  },
  axisIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: color.brand.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  axisCardLabel: {
    ...typography.subheadlineEmphasized,
    color: color.text.primary,
  },
  axisRequired: {
    ...typography.footnote,
    color: color.brand.primary,
    fontWeight: '700',
  },
  axisOptional: {
    ...typography.footnote,
    color: color.text.tertiary,
    fontWeight: '600',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starBtn: { padding: 1 },
  ratingInline: {
    marginLeft: spacing.s,
    ...typography.captionEmphasized,
  },
  ratingInlineNum: {
    fontSize: 14,
    fontWeight: '700',
    color: color.brand.primary,
  },
  ratingInlineLabel: {
    color: color.text.secondary,
  },

  // 선택 카드 — 별점 카드와 동일한 톤 (흰 elevated)
  optCard: {
    marginBottom: spacing.m,
  },
  optHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  optHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    flexShrink: 0,
  },
  optIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: color.brand.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optLabel: {
    ...typography.subheadlineEmphasized,
    color: color.text.primary,
  },
  optBadge: {
    ...typography.footnote,
    color: color.text.tertiary,
    fontWeight: '600',
  },

  // 방문 시점 칩 — 헤더 row 안 라벨 다음에 위치. 더 작게.
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.s,
    flexWrap: 'wrap',
  },
  windowChip: {
    paddingHorizontal: spacing.s + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  windowChipIdle: {
    backgroundColor: color.surface.subtle,
    borderWidth: 1,
    borderColor: color.border.default,
  },
  windowChipSelected: {
    backgroundColor: color.brand.primary,
  },
  windowChipText: {
    ...typography.caption,
    color: color.text.secondary,
  },
  windowChipTextSelected: {
    color: color.text.onBrand,
    fontWeight: '700',
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },

  // 메모 — 카드 안에 직접 입력
  memoInput: {
    ...typography.subheadline,
    color: color.text.primary,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: color.surface.subtle,
  },
  memoCounter: {
    ...typography.caption,
    color: color.text.tertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  memoCounterActive: {
    color: color.text.secondary,
  },

  // 사진 — 64x64 통일
  photosRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  photoAddBtn: {
    width: 64,
    height: 64,
    borderRadius: radius.m,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface.subtle,
  },
  photoThumbWrap: {
    width: 64,
    height: 64,
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
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sticky submit
  submitBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
    backgroundColor: color.surface.subtle,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border.default,
  },

  gateTopTitle: {
    flex: 1,
    textAlign: 'center',
    ...typography.headline,
    color: color.text.primary,
  },

  // 등록 완료 화면 — 우상단 X 닫기
  completedTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingBottom: spacing.xs,
    backgroundColor: color.surface.canvas,
  },
  completedWrap: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
  },
  completedMascot: {
    width: 140,
    height: 140,
    marginBottom: spacing.m,
  },
  completedHeadline: {
    ...typography.title,
    fontSize: 22,
    lineHeight: 28,
    color: color.text.primary,
    textAlign: 'center',
  },
  completedBody: {
    ...typography.subheadline,
    color: color.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  completedRestaurant: {
    ...typography.subheadlineEmphasized,
    color: color.text.primary,
  },
  completedAvgBox: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.l,
    backgroundColor: color.brand.primarySoft,
    gap: spacing.xs,
    alignSelf: 'stretch',
  },
  completedAvgLabel: {
    ...typography.captionEmphasized,
    color: color.brand.primary,
    letterSpacing: 0.3,
  },
  completedStarsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  completedAvgNum: {
    ...typography.title,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    color: color.brand.primary,
  },

  // Login / owner gate
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
});
