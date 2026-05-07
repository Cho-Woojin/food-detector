import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, IconName } from '@/components/Icon';
import { Mascots } from '@/constants/Assets';
import { color, mascotSize, radius, spacing, typography } from '@/constants/tokens';
import { AppHeader, Button, Card, Screen } from '@/components/ui';
import { router } from 'expo-router';
import { useLikedIds } from '@/utils/favorites';

const GUEST = true; // 로그인 시스템 도입 전까지 게스트 고정

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
  const likedCount = useLikedIds().size;

  // 활동 섹션은 게스트일 땐 좋아요만 의미 있음 (리뷰·사진은 미구현 → '준비 중'으로 표시)
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
        { icon: 'pencil', label: '내가 쓴 위생 리뷰', comingSoon: true, disabled: true },
        { icon: 'camera', label: '업로드한 사진', comingSoon: true, disabled: true },
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
      {GUEST ? <GuestCard likedCount={likedCount} /> : <LoggedInCard />}

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

      <Text style={styles.version}>식탐정 v1.0.0</Text>
    </Screen>
  );
}

function GuestCard({ likedCount }: { likedCount: number }) {
  // 좋아요 상태로 안내 문구 차별화 — 비회원도 캐시로 좋아요 사용 가능
  const sub = likedCount > 0
    ? `이 기기에 좋아요 ${likedCount}곳이 저장돼있어요. 로그인하면 다른 기기에서도 볼 수 있어요.`
    : '로그인하면 좋아요·리뷰가 모든 기기에서 동기화돼요.';
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
        <Button variant="primary" size="md" fullWidth onPress={() => {}}>
          로그인 / 회원가입 (준비 중)
        </Button>
      </View>
    </Card>
  );
}

function LoggedInCard() {
  return (
    <Card variant="elevated" padding="l" style={{ marginTop: spacing.l }}>
      <View style={styles.guestRow}>
        <View style={styles.avatar}>
          <Icon name="user" size={28} color={color.brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.guestName}>식탐정 사용자</Text>
          <Text style={styles.emailText}>user@example.com</Text>
        </View>
        <Button variant="ghost" size="sm" onPress={() => {}}>
          편집
        </Button>
      </View>

      <View style={styles.statsRow}>
        <Stat value="5" label="좋아요" />
        <View style={styles.statDivider} />
        <Stat value="12" label="리뷰" />
        <View style={styles.statDivider} />
        <Stat value="8" label="사진" />
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
  const Wrapper: any = interactive ? Pressable : View;
  return (
    <Wrapper
      accessibilityRole={interactive ? 'button' : undefined}
      accessibilityLabel={item.label}
      onPress={interactive ? item.onPress : undefined}
      style={({ pressed }: { pressed?: boolean } = {}) => [
        styles.menuItem,
        showDivider && styles.menuItemBorder,
        pressed && interactive && { backgroundColor: color.fill.tertiary },
      ]}>
      <Icon name={item.icon} size={20} color={muted ? color.text.tertiary : color.text.secondary} style={styles.menuIcon} />
      <Text style={[styles.menuLabel, muted && { color: color.text.tertiary }]}>
        {item.label}
      </Text>
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
    </Wrapper>
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
});
