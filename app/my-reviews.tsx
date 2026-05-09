import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { HygieneReviewCard } from '@/components/HygieneReviewCard';
import { Button, IconButton } from '@/components/ui';
import { color, spacing, typography } from '@/constants/tokens';
import { useKakaoUser } from '@/utils/kakaoAuth';
import { removeReview, useMyReviews } from '@/utils/reviews';

export default function MyReviewsScreen() {
  const insets = useSafeAreaInsets();
  const reviews = useMyReviews();
  const kakaoUser = useKakaoUser();
  const nickname = kakaoUser?.nickname ?? '나';

  const handleDelete = (id: string) => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (!window.confirm('이 리뷰를 삭제할까요?')) return;
    }
    removeReview(id);
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <IconButton icon="back" size="md" accessibilityLabel="뒤로 가기" onPress={() => router.back()} />
        <Text style={styles.topTitle}>내 위생 리뷰</Text>
        <View style={{ width: 40 }} />
      </View>

      {reviews.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Icon name="pencil" size={36} color={color.text.tertiary} />
          <Text style={styles.emptyTitle}>아직 작성한 위생 리뷰가 없어요</Text>
          <Text style={styles.emptyBody}>
            식당 상세 페이지에서 다녀온 곳의 위생 상태를 알려주세요
          </Text>
          <View style={{ width: 240, marginTop: spacing.l }}>
            <Button variant="primary" size="md" fullWidth leftIcon="search" onPress={() => router.push('/search')}>
              식당 검색하러 가기
            </Button>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryCount}>총 {reviews.length}건</Text>
          </View>
          {reviews.map((rv) => (
            <HygieneReviewCard
              key={rv.id}
              review={rv}
              nickname={nickname}
              totalReviews={reviews.length}
              onDelete={() => handleDelete(rv.id)}
              subjectName={rv.restaurantName || '식당'}
              onSubjectPress={() => router.push(`/restaurant/${rv.restaurantId}` as any)}
            />
          ))}
        </ScrollView>
      )}
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
    paddingTop: spacing.s,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.s,
  },
  summaryCount: {
    ...typography.bodyEmphasized,
    color: color.text.primary,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.headline,
    color: color.text.primary,
    marginTop: spacing.s,
  },
  emptyBody: {
    ...typography.subheadline,
    color: color.text.secondary,
    textAlign: 'center',
  },
});
