import { Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Icon, IconName } from '@/components/Icon';
import { Mascots } from '@/constants/Assets';
import { color, mascotSize, radius, spacing, typography } from '@/constants/tokens';
import { AppHeader, Button, Card, IconButton, Screen } from '@/components/ui';
import { router } from 'expo-router';

const GUEST = true; // Mock — toggle for design preview

type MenuItem = { icon: IconName; label: string; value?: string; disabled?: boolean; comingSoon?: boolean };
type MenuSection = { title: string; items: MenuItem[] };

const MENU_SECTIONS: MenuSection[] = [
  {
    title: '활동',
    items: [
      { icon: 'heart', label: '좋아요한 식당', value: '5' },
      { icon: 'pencil', label: '내가 쓴 위생 리뷰', value: '12' },
      { icon: 'camera', label: '업로드한 사진', value: '8' },
    ],
  },
  {
    title: '설정',
    items: [
      { icon: 'location', label: '지역 설정', value: '강남구' },
      { icon: 'bell', label: '알림 설정' },
      { icon: 'moon', label: '다크 모드', comingSoon: true, disabled: true },
    ],
  },
  {
    title: '식탐정',
    items: [
      { icon: 'doc', label: '서비스 약관' },
      { icon: 'doc', label: '개인정보 처리방침' },
      { icon: 'chat', label: '문의하기' },
    ],
  },
];

export default function ProfileScreen() {
  return (
    <Screen variant="canvas" edges={['top']} scroll paddingHorizontal="l">
      <AppHeader
        title="내정보"
        variant="large"
        leading="none"
        withSafeArea={false}
        trailing={
          <IconButton
            icon="search"
            size="md"
            accessibilityLabel="검색"
            onPress={() => router.push('/search')}
          />
        }
      />

      {/* Guest / logged-in profile card */}
      {GUEST ? <GuestCard /> : <LoggedInCard />}

      {/* Owner-mode banner */}
      <OwnerBanner />

      {/* Menu sections */}
      {MENU_SECTIONS.map((section, sIdx) => (
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

function GuestCard() {
  return (
    <Card variant="elevated" padding="l" style={{ marginTop: spacing.l }}>
      <View style={styles.guestRow}>
        <Image source={Mascots.search} style={styles.guestMascot} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={styles.guestName}>식탐정 게스트</Text>
          <Text style={styles.guestBody}>
            로그인하면 즐겨찾기·리뷰가 동기화돼요
          </Text>
        </View>
      </View>
      <View style={{ marginTop: spacing.m }}>
        <Button variant="primary" size="md" fullWidth onPress={() => {}}>
          로그인 / 회원가입
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
          <Text style={styles.ownerTitle}>내 가게 입증하기</Text>
          <Text style={styles.ownerBody}>식탐정 평가로 가게 위생을 알려줘요</Text>
        </View>
      </View>
      <View style={{ marginTop: spacing.m, alignItems: 'flex-start' }}>
        <Button variant="owner" size="sm" onPress={() => {}}>
          시작하기
        </Button>
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
  const Wrapper: any = item.disabled ? View : Pressable;
  return (
    <Wrapper
      accessibilityRole={item.disabled ? undefined : 'button'}
      accessibilityLabel={item.label}
      style={({ pressed }: { pressed?: boolean } = {}) => [
        styles.menuItem,
        showDivider && styles.menuItemBorder,
        pressed && !item.disabled && { backgroundColor: color.fill.tertiary },
      ]}>
      <Icon name={item.icon} size={20} color={muted ? color.text.tertiary : color.text.secondary} style={styles.menuIcon} />
      <Text style={[styles.menuLabel, muted && { color: color.text.tertiary }]}>
        {item.label}
      </Text>
      {item.comingSoon ? (
        <View style={styles.comingSoonRow}>
          <Text style={styles.comingSoonText}>곧 만나요</Text>
          <Switch value={false} disabled />
        </View>
      ) : (
        <>
          {item.value ? <Text style={styles.menuValue}>{item.value}</Text> : null}
          <Icon name="forward" size={16} color={color.text.tertiary} />
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
  ownerTitle: { ...typography.bodyEmphasized, color: color.text.primary, marginBottom: spacing.xxs },
  ownerBody: { ...typography.caption, color: color.text.secondary },

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
  comingSoonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  comingSoonText: { ...typography.footnote, color: color.text.tertiary },

  version: {
    ...typography.footnote,
    color: color.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
  },
});
