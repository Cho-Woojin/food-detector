// /my-stores — 내가 사장님으로 지정된 가게 리스트
// 1개일 때는 profile에서 직접 상세로 이동하지만, 다수 보유 시 이 페이지로 진입.
// 카드 탭 → 가게 상세 분석 페이지(/restaurant/[id])로 이동.

import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Cheese } from '@/constants/Assets';
import { color, radius, spacing, typography } from '@/constants/tokens';
import { Button, Card, EmptyState, IconButton } from '@/components/ui';
import {
  ensureRecomputedById,
  type RecomputedRow,
} from '@/utils/dataStore';
import { useKakaoUser } from '@/utils/kakaoAuth';
import { useMyOwnedRestaurantIds, useOwnerImpactMap, useOwnerPostsFor } from '@/utils/owner';

type StoreRow = RecomputedRow & { postCount: number };

export default function MyStoresScreen() {
  const insets = useSafeAreaInsets();
  const kakaoUser = useKakaoUser();
  const ownedIds = useMyOwnedRestaurantIds(kakaoUser?.id ?? null);
  const ownerImpact = useOwnerImpactMap();
  const [rows, setRows] = useState<StoreRow[]>([]);

  // ownership 변경(추가/해제) 시 행 재계산
  useEffect(() => {
    let cancelled = false;
    if (ownedIds.length === 0) {
      setRows([]);
      return;
    }
    ensureRecomputedById().then((map) => {
      if (cancelled) return;
      const list: StoreRow[] = ownedIds
        .map((id) => map.get(id))
        .filter((r): r is RecomputedRow => !!r)
        .map((r) => ({ ...r, postCount: ownerImpact.get(r.i)?.postCount ?? 0 }));
      setRows(list);
    });
    return () => { cancelled = true; };
  }, [ownedIds, ownerImpact]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topBar}>
        <IconButton icon="back" size="md" accessibilityLabel="뒤로" onPress={() => router.back()} />
        <Text style={styles.topTitle}>내 가게 관리</Text>
        <View style={{ width: 44 }} />
      </View>

      {!kakaoUser ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            mascot="search"
            mascotSize="md"
            title="로그인이 필요해요"
            body="카카오 로그인 후 내 가게를 관리할 수 있어요"
          />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            mascot="search"
            mascotSize="md"
            title="등록된 가게가 없어요"
            body="사장님 인증을 신청하면 식탐정 운영팀이 검토 후 권한을 부여해 드려요"
            cta={{
              label: '내 가게 입증하기',
              onPress: () => router.push('/owner/apply' as any),
              variant: 'primary',
            }}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.summary}>총 {rows.length}곳</Text>
          {rows.map((r) => (
            <StoreRowCard key={r.i} row={r} />
          ))}

          {/* 추가 가게 입증 진입점 */}
          <View style={{ marginTop: spacing.l }}>
            <Button
              variant="ghost"
              size="md"
              leftIcon="logo"
              fullWidth
              onPress={() => router.push('/owner/apply' as any)}>
              다른 가게도 인증 신청하기
            </Button>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function StoreRowCard({ row }: { row: StoreRow }) {
  const cheeseSrc =
    row.gr === 'GOLDEN' ? Cheese.gold : row.gr === 'SILVER' ? Cheese.silver : Cheese.bronze;
  const cheeseFg = color.cheese[row.gr]?.fg ?? color.text.primary;
  const posts = useOwnerPostsFor(row.i);

  return (
    <Pressable
      onPress={() => router.push(`/restaurant/${row.i}` as any)}
      accessibilityRole="button"
      accessibilityLabel={`${row.n} 관리 페이지 열기`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.fill.quaternary }]}>
      <View style={styles.thumb}>
        <Image source={cheeseSrc} style={styles.thumbImg} resizeMode="contain" />
      </View>

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>{row.n}</Text>
          <View style={styles.ownerBadge}>
            <Icon name="logo" size={10} color={color.text.onBrand} />
            <Text style={styles.ownerBadgeText}>사장님</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.score, { color: cheeseFg }]}>{row.s}점</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.category}>{row.c}</Text>
          <Text style={styles.dot}>·</Text>
          <Icon name="location" size={11} color={color.text.tertiary} />
          <Text style={styles.district}>{row.g}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Icon name="chat" size={12} color={color.brand.primary} />
            <Text style={styles.statText}>게시글 {posts.length}건</Text>
          </View>
          <Icon name="forward" size={14} color={color.text.tertiary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.canvas },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  topTitle: { ...typography.headline, color: color.text.primary },

  emptyWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.l },

  scroll: { paddingHorizontal: spacing.l, paddingTop: spacing.s },
  summary: { ...typography.captionEmphasized, color: color.text.secondary, marginBottom: spacing.s },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: color.border.default,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.m,
    backgroundColor: color.fill.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: { width: 44, height: 44 },

  info: { flex: 1, gap: spacing.xxs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { flex: 1, ...typography.bodyEmphasized, color: color.text.primary },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: color.brand.primary,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  ownerBadgeText: { ...typography.footnote, fontWeight: '700', color: color.text.onBrand, letterSpacing: 0.3 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  score: { ...typography.captionEmphasized },
  dot: { ...typography.caption, color: color.text.tertiary },
  category: { ...typography.caption, color: color.text.secondary },
  district: { ...typography.caption, color: color.text.tertiary },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xxs,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { ...typography.footnote, color: color.brand.primary, fontWeight: '600' },
});
