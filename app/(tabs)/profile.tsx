import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Icon, IconName } from '@/components/Icon';
import { Mascots } from '@/constants/Assets';
import { color, mascotSize, radius, spacing, typography } from '@/constants/tokens';
import { AppHeader, Button, Card, Screen } from '@/components/ui';
import { HygieneGuideListModal } from '@/components/HygieneGuideListModal';
import { router } from 'expo-router';
import { useLikedIds } from '@/utils/favorites';
import { ensureRecomputedById } from '@/utils/dataStore';
import { loginWithKakao, logoutFromKakao, useKakaoUser } from '@/utils/kakaoAuth';
import { useMyReviews } from '@/utils/reviews';
import { useMyOwnedRestaurantIds } from '@/utils/owner';


type MenuItem = {
  icon: IconName;
  label: string;
  value?: string;
  disabled?: boolean;
  comingSoon?: boolean;
  onPress?: () => void;
};
type MenuSection = { title: string; items: MenuItem[] };

export default function ProfileScreen() {
  const likedIds = useLikedIds();
  const likedCount = likedIds.size;
  const kakaoUser = useKakaoUser();
  const reviewCount = useMyReviews().length;
  const ownedIds = useMyOwnedRestaurantIds(kakaoUser?.id ?? null);
  const [singleOwnedName, setSingleOwnedName] = useState<string | null>(null);
  const [guideListOpen, setGuideListOpen] = useState(false);

  // 가게 1곳만 등록된 경우 — 메뉴에 가게명 미리보기 노출용
  useEffect(() => {
    if (ownedIds.length !== 1) { setSingleOwnedName(null); return; }
    let cancelled = false;
    ensureRecomputedById().then((map) => {
      if (cancelled) return;
      setSingleOwnedName(map.get(ownedIds[0])?.n ?? null);
    });
    return () => { cancelled = true; };
  }, [ownedIds]);

  // 사장님 메뉴 항목 — 가게 0개: 입증, 1개: 해당 가게 상세, 2개+: 리스트
  const ownerMenuItem: MenuItem = (() => {
    if (ownedIds.length === 0) {
      return {
        icon: 'logo',
        label: '내 가게 입증하기',
        value: '신청',
        onPress: () => router.push('/owner/apply' as any),
      };
    }
    if (ownedIds.length === 1) {
      return {
        icon: 'logo',
        label: '내 가게 관리',
        value: singleOwnedName ?? '1곳',
        onPress: () => router.push(`/restaurant/${ownedIds[0]}` as any),
      };
    }
    return {
      icon: 'logo',
      label: '내 가게 관리',
      value: `${ownedIds.length}곳`,
      onPress: () => router.push('/my-stores' as any),
    };
  })();

  const isOwner = ownedIds.length > 0;
  const ownerSection: MenuSection = { title: '사장님', items: [ownerMenuItem] };
  const activitySection: MenuSection = {
    title: '활동',
    items: [
      {
        icon: 'heart',
        label: '좋아요한 식당',
        value: String(likedCount),
        onPress: () => router.push('/(tabs)/favorites' as any),
      },
      {
        icon: 'pencil',
        label: '내 위생 리뷰',
        value: String(reviewCount),
        onPress: () => router.push('/my-reviews' as any),
      },
    ],
  };

  const sections: MenuSection[] = [
    // 사장님 권한 보유 시 가게 관리가 가장 위 — 활동보다 우선
    ...(isOwner ? [ownerSection, activitySection] : [activitySection, ownerSection]),
    {
      title: '안전 가이드',
      items: [
        {
          icon: 'leaf',
          label: '위생 가이드 라이브러리',
          onPress: () => setGuideListOpen(true),
        },
      ],
    },
    {
      title: '식탐정',
      items: [
        { icon: 'doc', label: '서비스 약관', onPress: () => router.push('/legal/terms' as any) },
        { icon: 'doc', label: '개인정보 처리방침', onPress: () => router.push('/legal/privacy' as any) },
        { icon: 'chat', label: '문의하기', onPress: () => router.push('/legal/contact' as any) },
        { icon: 'sparkles', label: '데이터 출처', onPress: () => router.push('/legal/data-sources' as any) },
      ],
    },
  ];

  return (
    <Screen variant="canvas" edges={['top']} scroll paddingHorizontal="l">
      <AppHeader
        title="내정보"
        variant="large"
        leading="none"
        withSafeArea={false}
      />

      {/* Guest / logged-in profile card */}
      {kakaoUser ? (
        <LoggedInCard
          nickname={kakaoUser.nickname}
          profileImage={kakaoUser.profileImage}
          ownedCount={ownedIds.length}
        />
      ) : (
        <GuestCard
          likedCount={likedCount}
          onLogin={async () => { await loginWithKakao(); }}
        />
      )}

      {/* Menu sections */}
      {sections.map((section, sIdx) => (
        <View key={section.title} style={[styles.section, sIdx === 0 && { marginTop: spacing.xxl }]}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Card variant="outlined" padding="none" radius="l" style={{ overflow: 'hidden' }}>
            {section.items.map((item, i) => (
              <MenuRow
                key={item.label}
                item={item}
                showDivider={i < section.items.length - 1}
              />
            ))}
          </Card>
        </View>
      ))}

      <Text style={styles.version}>식탐정 v1.0.0 · 식약처 LOCALDATA 기반</Text>

      {/* 로그아웃 — 페이지 가장 아래 눈에 띄지 않는 텍스트 링크 */}
      {kakaoUser ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="로그아웃"
          onPress={() => logoutFromKakao()}
          hitSlop={8}
          style={({ pressed }) => [styles.logoutLink, pressed && { opacity: 0.5 }]}>
          <Text style={styles.logoutLinkText}>로그아웃</Text>
        </Pressable>
      ) : null}

      <HygieneGuideListModal visible={guideListOpen} onClose={() => setGuideListOpen(false)} />
    </Screen>
  );
}

function GuestCard({ likedCount, onLogin }: { likedCount: number; onLogin: () => void }) {
  const sub = likedCount > 0
    ? `이 기기에 좋아요 ${likedCount}곳이 저장돼있어요. 로그인하면 다른 기기에서도 볼 수 있어요.`
    : '카카오로 로그인하면 좋아요·리뷰가 모든 기기에서 동기화돼요.';
  return (
    <Card variant="elevated" padding="l" style={{ marginTop: spacing.l }}>
      <View style={styles.guestRow}>
        <Image source={Mascots.search} style={styles.guestMascot} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={styles.guestName}>식탐정 게스트</Text>
          <Text style={styles.guestBody}>{sub}</Text>
        </View>
      </View>
      <View style={{ marginTop: spacing.m }}>
        <Button variant="kakao" size="md" fullWidth leftIcon="chat" onPress={onLogin}>
          카카오로 시작하기
        </Button>
      </View>
    </Card>
  );
}

function LoggedInCard({
  nickname, profileImage, ownedCount,
}: {
  nickname: string;
  profileImage?: string;
  ownedCount: number;
}) {
  const isOwner = ownedCount > 0;
  return (
    <Card variant="elevated" padding="l" style={{ marginTop: spacing.l }}>
      <View style={styles.guestRow}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={[styles.avatar, { backgroundColor: 'transparent' }]} />
        ) : (
          <View style={styles.avatar}>
            <Icon name="user" size={28} color={color.brand.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.profileNameRow}>
            <Text style={styles.guestName} numberOfLines={1}>{nickname}</Text>
            {isOwner ? (
              <View style={styles.profileOwnerBadge} accessibilityLabel="사장님 인증 계정">
                <Icon name="logo" size={11} color={color.text.onBrand} />
                <Text style={styles.profileOwnerBadgeText}>
                  사장님{ownedCount > 1 ? ` ${ownedCount}곳` : ''}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

function MenuRow({ item, showDivider }: { item: MenuItem; showDivider: boolean }) {
  const muted = item.disabled;
  const interactive = !item.disabled && !!item.onPress;

  const inner = (
    <>
      <Icon name={item.icon} size={20} color={muted ? color.text.tertiary : color.text.secondary} style={styles.menuIcon} />
      <Text style={[styles.menuLabel, muted && { color: color.text.tertiary }]}>{item.label}</Text>
      {item.comingSoon ? (
        <View style={styles.soonBadge}>
          <Text style={styles.soonBadgeText}>준비 중</Text>
        </View>
      ) : (
        <>
          {item.value ? <Text style={styles.menuValue}>{item.value}</Text> : null}
          {interactive && <Icon name="forward" size={16} color={color.text.tertiary} />}
        </>
      )}
    </>
  );

  // Pressable은 함수형 style 지원, View는 배열 style만 지원 — 분기해서 렌더
  if (interactive) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.label}
        onPress={item.onPress}
        style={({ pressed }) => [
          styles.menuItem,
          showDivider && styles.menuItemBorder,
          pressed && { backgroundColor: color.fill.tertiary },
        ]}>
        {inner}
      </Pressable>
    );
  }
  return (
    <View
      accessibilityLabel={item.label}
      style={[styles.menuItem, showDivider && styles.menuItemBorder]}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  // Guest / logged in
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  guestMascot: { width: mascotSize.inline, height: mascotSize.inline },
  guestName: { ...typography.bodyEmphasized, color: color.text.primary, marginBottom: spacing.xxs },
  guestBody: { ...typography.caption, color: color.text.secondary },
  emailText: { ...typography.caption, color: color.text.secondary },

  // 프로필 카드 — 닉네임 옆 사장님 뱃지
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  profileOwnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: color.brand.primary,
  },
  profileOwnerBadgeText: {
    ...typography.footnote,
    fontWeight: '700',
    color: color.text.onBrand,
    letterSpacing: 0.3,
  },

  avatar: {
    width: mascotSize.inline,
    height: mascotSize.inline,
    borderRadius: radius.pill,
    backgroundColor: color.brand.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.l,
    paddingTop: spacing.l,
    borderTopWidth: 1,
    borderTopColor: color.border.default,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.title, color: color.text.primary },
  statLabel: { ...typography.caption, color: color.text.secondary, marginTop: spacing.xxs },
  statDivider: { width: 1, backgroundColor: color.border.default },

  // Owner banner

  // 좋아요 분포 카드
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.s },
  statTitle: { ...typography.subheadlineEmphasized, color: color.text.primary },
  statTotal: { ...typography.caption, color: color.text.secondary },
  statBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: color.fill.tertiary },
  statBarSeg: { height: '100%' },
  statLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s + 4, marginTop: spacing.m },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statChipText: { ...typography.caption, color: color.text.secondary },

  // 공통 "준비 중" 뱃지
  soonBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: color.fill.tertiary,
  },
  soonBadgeText: { ...typography.footnote, color: color.text.tertiary, fontWeight: '600' },

  // Menu sections
  section: { marginTop: spacing.xl },
  sectionTitle: {
    ...typography.captionEmphasized,
    color: color.text.secondary,
    marginBottom: spacing.s,
    paddingHorizontal: spacing.xs,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m + 2,
    minHeight: 48,
    backgroundColor: color.surface.subtle,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: color.border.default,
  },
  menuIcon: { marginRight: spacing.m, width: 22 },
  menuLabel: { flex: 1, ...typography.subheadline, color: color.text.primary },
  menuValue: { ...typography.caption, color: color.text.tertiary, marginRight: spacing.xs + 2 },

  version: {
    ...typography.footnote,
    color: color.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.m,
  },

  // 로그아웃 — 페이지 가장 아래 텍스트 링크 (작고 흐릿)
  logoutLink: {
    alignSelf: 'center',
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    marginBottom: spacing.xl,
  },
  logoutLinkText: {
    ...typography.footnote,
    color: color.text.tertiary,
    textDecorationLine: 'underline',
  },

  // 내 위생 리뷰 row
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
    paddingVertical: spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border.default,
  },
  reviewRowHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.s,
  },
  reviewRowName: {
    flex: 1,
    ...typography.bodyEmphasized,
    color: color.text.primary,
  },
  reviewRowDate: { ...typography.caption, color: color.text.tertiary },
  reviewRowStars: {
    flexDirection: 'row',
    gap: 1,
    marginTop: spacing.xxs,
  },
  reviewRowAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: radius.s,
    backgroundColor: color.status.dangerSoft,
    alignSelf: 'flex-start',
  },
  reviewRowAlertText: { ...typography.captionEmphasized, color: color.status.danger },
  reviewRowTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  reviewRowChip: {
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
  },
  reviewRowChipText: { ...typography.captionEmphasized },
  reviewRowBody: {
    ...typography.subheadline,
    color: color.text.secondary,
    marginTop: spacing.xs,
  },
  reviewRowDelete: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.fill.tertiary,
  },
});
