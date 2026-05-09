import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { color, radius, spacing, typography } from '@/constants/tokens';
import type { HygieneReview } from '@/utils/reviews';
import type { ReviewReply } from '@/utils/owner';

// 위생 리뷰 카드 — 상세 페이지·내 리뷰 페이지에서 공통 사용
// - subjectName 있으면 상단에 식당명 헤더 (내 리뷰 페이지 케이스)
// - onDelete 있으면 우측 끝 × 버튼 노출 (본인 리뷰)
// - reply 있으면 하단에 사장님 답글 블록
// - canReply=true면 답글 입력 토글 (사장님 본인일 때만 caller가 true 전달)
export type HygieneReviewCardProps = {
  review: HygieneReview;
  nickname: string;
  totalReviews: number;
  onDelete?: () => void;
  subjectName?: string;
  onSubjectPress?: () => void;
  reply?: ReviewReply | null;
  canReply?: boolean;
  onSubmitReply?: (body: string) => void;
  onRemoveReply?: () => void;
};

export function HygieneReviewCard({
  review,
  nickname,
  totalReviews,
  onDelete,
  subjectName,
  onSubjectPress,
  reply,
  canReply,
  onSubmitReply,
  onRemoveReply,
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

      <ReplyBlock
        reply={reply ?? null}
        canReply={!!canReply}
        onSubmit={onSubmitReply}
        onRemove={onRemoveReply}
      />
    </View>
  );
}

function ReplyBlock({
  reply,
  canReply,
  onSubmit,
  onRemove,
}: {
  reply: ReviewReply | null;
  canReply: boolean;
  onSubmit?: (body: string) => void;
  onRemove?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  // 답글이 변경되면 편집 모드 종료 (저장 후 정리)
  useEffect(() => {
    setEditing(false);
    setDraft(reply?.body ?? '');
  }, [reply?.updatedAt]);

  if (!reply && !canReply) return null;

  if (editing) {
    return (
      <View style={styles.replyBlock}>
        <View style={styles.replyHeader}>
          <View style={styles.replyBadge}>
            <Icon name="logo" size={10} color={color.text.onBrand} />
            <Text style={styles.replyBadgeText}>사장님</Text>
          </View>
          <Text style={styles.replyHeaderHint}>답글 작성</Text>
        </View>
        <TextInput
          value={draft}
          onChangeText={(t) => setDraft(t.slice(0, 300))}
          placeholder="고객님께 정중하게 답변해 주세요"
          placeholderTextColor={color.text.tertiary}
          multiline
          style={styles.replyInput}
          accessibilityLabel="사장님 답글 입력"
        />
        <View style={styles.replyActions}>
          <Pressable
            onPress={() => { setEditing(false); setDraft(reply?.body ?? ''); }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.replyBtnGhost, pressed && { opacity: 0.6 }]}>
            <Text style={styles.replyBtnGhostText}>취소</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const t = draft.trim();
              if (!t || !onSubmit) return;
              onSubmit(t);
            }}
            disabled={!draft.trim()}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.replyBtn,
              !draft.trim() && styles.replyBtnDisabled,
              pressed && draft.trim() ? { opacity: 0.85 } : null,
            ]}>
            <Text style={styles.replyBtnText}>{reply ? '수정' : '등록'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (reply) {
    return (
      <View style={styles.replyBlock}>
        <View style={styles.replyHeader}>
          <View style={styles.replyBadge}>
            <Icon name="logo" size={10} color={color.text.onBrand} />
            <Text style={styles.replyBadgeText}>사장님 답글</Text>
          </View>
          <Text style={styles.replyDate}>{formatReplyDate(reply.updatedAt)}</Text>
          {canReply ? (
            <Pressable
              onPress={() => { setDraft(reply.body); setEditing(true); }}
              accessibilityRole="button"
              accessibilityLabel="답글 수정"
              hitSlop={6}
              style={({ pressed }) => [styles.replyEditBtn, pressed && { opacity: 0.5 }]}>
              <Icon name="pencil" size={12} color={color.text.tertiary} />
            </Pressable>
          ) : null}
          {canReply && onRemove ? (
            <Pressable
              onPress={onRemove}
              accessibilityRole="button"
              accessibilityLabel="답글 삭제"
              hitSlop={6}
              style={({ pressed }) => [styles.replyEditBtn, pressed && { opacity: 0.5 }]}>
              <Icon name="close" size={12} color={color.text.tertiary} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.replyBody}>{reply.body}</Text>
      </View>
    );
  }

  // canReply && !reply — 답글 달기 prompt
  return (
    <Pressable
      onPress={() => { setDraft(''); setEditing(true); }}
      accessibilityRole="button"
      accessibilityLabel="답글 달기"
      style={({ pressed }) => [styles.replyPrompt, pressed && { opacity: 0.7 }]}>
      <Icon name="chat" size={12} color={color.brand.primary} />
      <Text style={styles.replyPromptText}>사장님 답글 달기</Text>
    </Pressable>
  );
}

function formatReplyDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
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

  // ===== 사장님 답글 =====
  replyBlock: {
    marginTop: spacing.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: color.brand.primarySoft,
    borderRadius: radius.m,
    gap: spacing.xs,
  },
  replyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  replyHeaderHint: { ...typography.footnote, color: color.text.tertiary, flex: 1 },
  replyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: color.brand.primary,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  replyBadgeText: { ...typography.footnote, fontWeight: '700', color: color.text.onBrand, letterSpacing: 0.3 },
  replyDate: { ...typography.footnote, color: color.text.tertiary, flex: 1 },
  replyEditBtn: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: color.surface.subtle,
  },
  replyBody: { ...typography.subheadline, color: color.text.primary },
  replyInput: {
    backgroundColor: color.surface.subtle,
    borderRadius: radius.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    minHeight: 64,
    ...typography.body,
    color: color.text.primary,
    textAlignVertical: 'top',
  },
  replyActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs },
  replyBtn: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: color.brand.primary,
  },
  replyBtnDisabled: { opacity: 0.4 },
  replyBtnText: { ...typography.captionEmphasized, color: color.text.onBrand },
  replyBtnGhost: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs + 2,
  },
  replyBtnGhostText: { ...typography.captionEmphasized, color: color.text.secondary },
  replyPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: color.brand.primarySoft,
    alignSelf: 'flex-start',
  },
  replyPromptText: { ...typography.captionEmphasized, color: color.brand.primary },
});
