// 사장님 인증 게시글 카드 — 정보 탭 하단 "사장님 이야기" 섹션에서 모든 사용자에게 표시
// 본인이 작성자(사장님)일 때만 onDelete 노출

import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { color, radius, spacing, typography } from '@/constants/tokens';
import type { OwnerPost } from '@/utils/owner';

export type OwnerPostCardProps = {
  post: OwnerPost;
  authorName: string;
  onDelete?: () => void;
};

export function OwnerPostCard({ post, authorName, onDelete }: OwnerPostCardProps) {
  const dateLabel = formatDate(post.createdAt);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Icon name="logo" size={11} color={color.text.onBrand} />
          <Text style={styles.badgeText}>사장님</Text>
        </View>
        <Text style={styles.author} numberOfLines={1}>{authorName}</Text>
        <Text style={styles.date}>{dateLabel}</Text>
        {onDelete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="게시글 삭제"
            onPress={onDelete}
            hitSlop={6}
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.5 }]}>
            <Icon name="close" size={14} color={color.text.tertiary} />
          </Pressable>
        ) : null}
      </View>

      {post.body ? <Text style={styles.body}>{post.body}</Text> : null}

      {post.photo ? (
        <Image source={{ uri: post.photo }} style={styles.photo} resizeMode="cover" />
      ) : null}
    </View>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.m,
    borderTopWidth: 1,
    borderTopColor: color.border.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: color.brand.primary,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeText: {
    ...typography.footnote,
    fontWeight: '700',
    color: color.text.onBrand,
    letterSpacing: 0.3,
  },
  author: { flex: 1, ...typography.subheadlineEmphasized, color: color.text.primary },
  date: { ...typography.footnote, color: color.text.tertiary },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.fill.tertiary,
  },
  body: {
    ...typography.subheadline,
    color: color.text.primary,
    marginTop: spacing.xs,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.m,
    marginTop: spacing.s,
    backgroundColor: color.fill.quaternary,
  },
});
