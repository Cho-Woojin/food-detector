import { Icon, IconName } from '@/components/Icon';
import { palette } from '@/constants/Colors';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type MenuItem = { icon: IconName; label: string; value?: string };

const MENU_SECTIONS: { title: string; items: MenuItem[] }[] = [
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
      { icon: 'location', label: '지역 설정', value: '종로구' },
      { icon: 'bell', label: '알림 설정' },
      { icon: 'moon', label: '다크 모드', value: 'OFF' },
    ],
  },
  {
    title: '식탐정',
    items: [
      { icon: 'storefront', label: '사장님 모드' },
      { icon: 'doc', label: '서비스 약관' },
      { icon: 'chat', label: '문의하기' },
    ],
  },
];

export default function ProfileScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Icon name="user" size={28} color={palette.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>식탐정 게스트</Text>
          <Text style={styles.email}>로그인하고 더 많은 기능을 사용하세요</Text>
        </View>
        <Pressable style={styles.loginBtn}>
          <Text style={styles.loginBtnText}>로그인</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>5</Text>
          <Text style={styles.statLabel}>좋아요</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>리뷰</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>8</Text>
          <Text style={styles.statLabel}>사진</Text>
        </View>
      </View>

      {MENU_SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.menuGroup}>
            {section.items.map((item, i) => (
              <Pressable
                key={item.label}
                style={[styles.menuItem, i < section.items.length - 1 && styles.menuItemBorder]}>
                <Icon name={item.icon} size={18} color={palette.text2} style={styles.menuIcon} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.value ? <Text style={styles.menuValue}>{item.value}</Text> : null}
                <Icon name="forward" size={16} color={palette.text3} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Text style={styles.version}>식탐정 v1.0.0</Text>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { padding: 16 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  name: { fontSize: 16, fontWeight: '700', color: palette.text1, marginBottom: 2 },
  email: { fontSize: 11, color: palette.text2 },
  loginBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: palette.accent,
    borderRadius: 8,
  },
  loginBtnText: { fontSize: 12, fontWeight: '600', color: palette.white },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: palette.border,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: palette.text1 },
  statLabel: { fontSize: 11, color: palette.text3, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: palette.border },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.text2,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuGroup: {
    backgroundColor: palette.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  menuIcon: { marginRight: 12, width: 22 },
  menuLabel: { flex: 1, fontSize: 14, color: palette.text1 },
  menuValue: { fontSize: 12, color: palette.text3, marginRight: 6 },

  version: { fontSize: 11, color: palette.text3, textAlign: 'center', marginTop: 8 },
});
