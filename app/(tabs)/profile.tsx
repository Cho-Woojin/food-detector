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

type GradeBreakdown = { GOLDEN: number; SILVER: number; BRONZE: number; OTHER: number };

export default function ProfileScreen() {
  const likedIds = useLikedIds();
  const likedCount = likedIds.size;
  const kakaoUser = useKakaoUser();
  const reviewCount = useMyReviews().length;
  const ownedIds = useMyOwnedRestaurantIds(kakaoUser?.id ?? null);
  const [breakdown, setBreakdown] = useState<GradeBreakdown>({ GOLDEN: 0, SILVER: 0, BRONZE: 0, OTHER: 0 });
  const [singleOwnedName, setSingleOwnedName] = useState<string | null>(null);
  const [guideListOpen, setGuideListOpen] = useState(false);

  // 좋아요한 식당의 등급별 분포 계산 — 데이터 로드 후 1회
  useEffect(() => {
    if (likedCount === 0) { setBreakdown({ GOLDEN: 0, SILVER: 0, BRONZE: 0, OTHER: 0 }); return; }
    let cancelled = false;
    ensureRecomputedById().then((map) => {
      if (cancelled) return;
      const next: GradeBreakdown = { GOLDEN: 0, SILVER: 0, BRONZE: 0, OTHER: 0 };
      for (const id of likedIds) {
        const row = map.get(id);
        const gr = row?.gr;
        if (gr === 'GOLDEN') next.GOLDEN++;
        else if (gr === 'SILVER') next.SILVER++;
        else if (gr === 'BRONZE') next.BRONZE++;
        else next.OTHER++;
      }
      setBreakdown(next);
    });
    return () => { cancelled = true; };
  }, [likedIds]);

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

  const sections: MenuSection[] = [
    {
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
        { icon: 'camera', label: '업로드한 사진', comingSoon: true, disabled: true },
      ],
    },
    {
      title: '사장님',
      items: [ownerMenuItem],
    },
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
      title: '설정',
      items: [
        { icon: 'location', label: '지역 설정', value: '서울 전체', comingSoon: true, disabled: true },
        { icon: 'bell', label: '알림 설정', comingSoon: true, disabled: true },
        { icon: 'moon', label: '다크 모드', comingSoon: true, disabled: true },
      ],
    },
    {
      title: '식탐정',
      items: [
        { icon: 'doc', label: '서비스 약관', onPress: () => {} },
        { icon: 'doc', label: '개인정보 처리방침', onPress: () => {} },
        { icon: 'chat', label: '문의하기', onPress: () => {} },
        { icon: 'sparkles', label: '데이터 출처', value: '식약처·카카오', onPress: () => {} },
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
          onLogout={() => logoutFromKakao()}
        />
      ) : (
        <GuestCard
          likedCount={likedCount}
          onLogin={async () => { await loginWithKakao(); }}
        />
      )}

      {/* 좋아요 등급별 분포 — 데이터 있을 때만 */}
      {likedCount > 0 && <LikedBreakdownCard breakdown={breakdown} total={likedCount} />}

      {/* Owner-mode banner */}
      <OwnerBanner />

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

      <HygieneGuideListModal visible={guideListOpen} onClose={() => setGuideListOpen(false)} />
    </Screen>
  );
}

function LikedBreakdownCard({ breakdown, total }: { breakdown: GradeBreakdown; total: number }) {
  // 가로 비율 바 — 골드/실버/브론즈/기타
  const data = [
    { key: 'GOLDEN', count: breakdown.GOLDEN, label: '골든', fg: color.cheese.GOLDEN.fg },
    { key: 'SILVER', count: breakdown.SILVER, label: '실버', fg: color.cheese.SILVER.fg },
    { key: 'BRONZE', count: breakdown.BRONZE, label: '브론즈', fg: color.cheese.BRONZE.fg },
    { key: 'OTHER', count: breakdown.OTHER, label: '기타', fg: color.text.tertiary },
  ];
  return (
    <Card variant="elevated" padding="l" style={{ marginTop: spacing.l }}>
      <View style={styles.statHeader}>
        <Text style={styles.statTitle}>나의 좋아요 분포</Text>
        <Text style={styles.statTotal}>총 {total}곳</Text>
      </View>
      <View style={styles.statBar}>
        {data.map((d) =>
          d.count > 0 ? (
            <View key={d.key} style={[styles.statBarSeg, { flex: d.count, backgroundColor: d.fg }]} />
          ) : null
        )}
      </View>
      <View style={styles.statLegend}>
        {data.map((d) => (
          <View key={d.key} style={styles.statChip}>
            <View style={[styles.statDot, { backgroundColor: d.fg }]} />
            <Text style={styles.statChipText}>{d.label} {d.count}</Text>
          </View>
        ))}
      </View>
    </Card>
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
  nickname, profileImage, onLogout,
}: { nickname: string; profileImage?: string; onLogout: () => void }) {
  const likedCount = useLikedIds().size;
  const reviewCount = useMyReviews().length;
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
          <Text style={styles.guestName}>{nickname}</Text>
          <Text style={styles.emailText}>카카오 계정 연결됨</Text>
        </View>
        <Button variant="ghost" size="sm" onPress={onLogout}>
          로그아웃
        </Button>
      </View>

      <View style={styles.statsRow}>
        <Stat value={String(likedCount)} label="좋아요" />
        <View style={styles.statDivider} />
        <Stat value={String(reviewCount)} label="리뷰" />
        <View style={styles.statDivider} />
        <Stat value="—" label="사진" />
      </View>
    </Card>
  );
}

function OwnerBanner() {
  return (
    <Card
      variant="elevated"
      padding="l"
      bgColor={color.surface.ownerBg}
      style={{ marginTop: spacing.l }}>
      <View style={styles.ownerRow}>
        <Image source={Mascots.badge} style={styles.ownerMascot} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <View style={styles.ownerTitleRow}>
            <Text style={styles.ownerTitle}>내 가게 입증하기</Text>
            <View style={styles.soonBadge}>
              <Text style={styles.soonBadgeText}>준비 중</Text>
            </View>
          </View>
          <Text style={styles.ownerBody}>
            사장님이 식탐정에서 가게 위생을 직접 인증해보세요
          </Text>
        </View>
      </View>
    </Card>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  ownerMascot: { width: mascotSize.inline, height: mascotSize.inline },
  ownerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xxs },
  ownerTitle: { ...typography.bodyEmphasized, color: color.text.primary },
  ownerBody: { ...typography.caption, color: color.text.secondary },

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
    marginBottom: spacing.xxl,
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
