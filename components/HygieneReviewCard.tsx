import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { color, radius, spacing, typography } from '@/constants/tokens';
import type { HygieneReview } from '@/utils/reviews';

// 위생 리뷰 카드 — 상세 페이지·내 리뷰 페이지에서 공통 사용
// - subjectName 있으면 상단에 식당명 헤더 (내 리뷰 페이지 케이스)
// - onDelete 있으면 우측 끝 × 버튼 노출 (본인 리뷰)
export type HygieneReviewCardProps = {
  review: HygieneReview;
  nickname: string;
  totalReviews: number;
  onDelete?: () => void;
  subjectName?: string;
  onSubjectPress?: () => void;
};

export function HygieneReviewCard({
  review,
  nickname,
  totalReviews,
  onDelete,
  subjectName,
  onSubjectPress,
}: HygieneReviewCardProps) {
  const photos = review.photos ?? [];
  const tags = review.tags ?? [];
  const foreign = review.foreignObjects ?? [];
  const dateLabel = formatVisitDate(review.visitDate, review.createdAt);

  return (
    <View style={styles.card}>
      {subjectName ? (
        <Pressable
          accessibilityRole={onSubjectPress ? 'button' : undefined}
          accessibilityLabel={`${subjectName} 상세`}
          onPress={onSubjectPress}
          style={({ pressed }) => [styles.subjectRow, pressed && onSubjectPress ? { opacity: 0.6 } : null]}>
          <Text style={styles.subjectName} numberOfLines={1}>{subjectName}</Text>
          {onSubjectPress ? <Icon name="forward" size={14} color={color.text.tertiary} /> : null}
        </Pressable>
      ) : null}

      {foreign.length > 0 && (
        <View style={styles.foreignBanner}>
          <Icon name="warning" size={14} color={color.status.danger} />
          <Text style={styles.foreignBannerText}>이물질 발견: {foreign.join(' · ')}</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.author} numberOfLines={1}>{nickname}</Text>
        <View style={styles.starsRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Icon
              key={i}
              name="star"
              size={11}
              color={i < review.rating ? color.brand.secondary : color.border.default}
            />
          ))}
        </View>
        <Text style={styles.meta}>리뷰 {totalReviews}건</Text>
        <Text style={styles.date}>{dateLabel}</Text>
        {onDelete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="리뷰 삭제"
            onPress={onDelete}
            hitSlop={6}
            style={({ pressed }) => [styles.deleteBtn, { marginLeft: 'auto' }, pressed && { opacity: 0.5 }]}>
            <Icon name="close" size={14} color={color.text.tertiary} />
          </Pressable>
        ) : null}
      </View>

      {tags.length > 0 && (
        <View style={styles.tagsRow}>
          {tags.map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      )}

      {review.body ? <Text style={styles.body}>{review.body}</Text> : null}

      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.s }}>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {photos.map((src, i) => (
              <Image key={`${i}-${src.slice(-12)}`} source={{ uri: src }} style={styles.photo} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function formatVisitDate(visitDate: string | undefined, createdAt: number): string {
  if (visitDate && /^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
    return visitDate.replaceAll('-', '.');
  }
  const d = new Date(createdAt);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.m,
    borderTopWidth: 1,
    borderTopColor: color.border.default,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  subjectName: {
    flex: 1,
    ...typography.bodyEmphasized,
    color: color.text.primary,
  },
  foreignBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
    borderRadius: radius.s,
    backgroundColor: color.status.dangerSoft,
    marginBottom: spacing.xs + 2,
    alignSelf: 'flex-start',
  },
  foreignBannerText: {
    ...typography.captionEmphasized,
    color: color.status.danger,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.xs + 2,
  },
  author: {
    flexShrink: 1,
    ...typography.subheadlineEmphasized,
    color: color.text.primary,
  },
  starsRow: { flexDirection: 'row', gap: 1 },
  meta: { ...typography.footnote, color: color.text.secondary },
  date: { ...typography.footnote, color: color.text.tertiary },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.fill.tertiary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs + 2,
  },
  tag: {
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
    backgroundColor: color.fill.tertiary,
  },
  tagText: { ...typography.footnote, color: color.text.secondary, fontWeight: '500' },
  body: { ...typography.subheadline, color: color.text.primary, marginBottom: spacing.xs + 2 },
  photo: {
    width: 72,
    height: 72,
    borderRadius: radius.s,
    backgroundColor: color.fill.quaternary,
  },
});
