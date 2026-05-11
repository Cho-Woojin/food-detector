// /owner/apply — 사장님 인증 신청 안내
// 백엔드 부재 시연 단계에선 메일 안내 + mailto 딥링크. 사용자가 서류 첨부해 보내면
// 관리자가 식당 상세 페이지에서 수동으로 사장님 권한 부여.

import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Button, Card, IconButton } from '@/components/ui';
import { color, radius, spacing, typography } from '@/constants/tokens';

const SUPPORT_EMAIL = 'choworkin@gmail.com';

const REQUIRED_DOCS = [
  { icon: 'logo' as const, label: '사업자등록증 사본', hint: '국세청 발급, 최근 6개월 이내' },
  { icon: 'star' as const, label: '대표자 신분증 사본', hint: '주민등록증 또는 운전면허증' },
  { icon: 'camera' as const, label: '가게 외관 사진', hint: '간판이 보이도록 1장' },
] as const;

export default function OwnerApplyScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const restaurantId = typeof params.id === 'string' ? params.id : '';
  const restaurantName = typeof params.name === 'string' ? params.name : '';

  const subject = restaurantName
    ? `[식탐정] 사장님 인증 신청 — ${restaurantName}`
    : '[식탐정] 사장님 인증 신청';
  const bodyLines = [
    '안녕하세요, 식탐정 운영팀.',
    '',
    '아래 정보로 사장님 인증을 신청합니다.',
    '',
    `- 가게: ${restaurantName || '(가게명 입력)'}`,
    `- 식탐정 ID: ${restaurantId || '(식당 ID 입력)'}`,
    '- 대표자명: ',
    '- 연락처: ',
    '',
    '※ 첨부: 사업자등록증, 신분증, 가게 외관 사진',
  ];
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <IconButton icon="back" size="md" accessibilityLabel="뒤로" onPress={() => router.back()} />
        <Text style={styles.topTitle}>사장님 인증 신청</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {restaurantName ? (
          <Card variant="tinted" padding="m" radius="l" style={styles.targetCard}>
            <Icon name="logo" size={16} color={color.brand.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.targetLabel}>신청 대상</Text>
              <Text style={styles.targetName} numberOfLines={1}>{restaurantName}</Text>
            </View>
          </Card>
        ) : null}

        <Text style={styles.heading}>아래 서류를 메일로 보내주세요</Text>
        <Text style={styles.subhead}>
          운영팀에서 확인 후 1~2영업일 안에 사장님 권한을 부여해드려요.
        </Text>

        <Card variant="elevated" padding="l" radius="l" style={{ marginTop: spacing.m }}>
          {REQUIRED_DOCS.map((doc, i) => (
            <View key={doc.label} style={[styles.docRow, i > 0 && styles.docRowDivider]}>
              <View style={styles.docIcon}>
                <Icon name={doc.icon} size={16} color={color.brand.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docLabel}>{doc.label}</Text>
                <Text style={styles.docHint}>{doc.hint}</Text>
              </View>
            </View>
          ))}
        </Card>

        <View style={styles.emailBlock}>
          <Text style={styles.emailLabel}>받는 메일</Text>
          <Pressable
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            accessibilityRole="link"
            accessibilityLabel={`이메일 ${SUPPORT_EMAIL} 열기`}
            style={({ pressed }) => [styles.emailRow, pressed && { opacity: 0.7 }]}>
            <Icon name="chat" size={14} color={color.brand.primary} />
            <Text style={styles.emailValue}>{SUPPORT_EMAIL}</Text>
          </Pressable>
        </View>

        <Card variant="tinted" padding="m" radius="m" style={styles.tipCard}>
          <Icon name="bulb" size={14} color={color.status.warning} />
          <Text style={styles.tipText}>
            사진은 글씨가 또렷하게 보이도록 촬영해 주세요. 파일 크기는 한 장당 5MB 이하 권장.
          </Text>
        </Card>

        <View style={{ height: spacing.l }} />

        <Button
          variant="primary"
          size="md"
          leftIcon="chat"
          fullWidth
          onPress={() => Linking.openURL(mailto)}>
          메일 작성하기
        </Button>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
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

  scroll: { paddingHorizontal: spacing.l, paddingTop: spacing.s },

  targetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.l,
  },
  targetLabel: { ...typography.caption, color: color.text.tertiary },
  targetName: { ...typography.bodyEmphasized, color: color.text.primary },

  heading: { ...typography.title, color: color.text.primary, marginTop: spacing.s },
  subhead: { ...typography.subheadline, color: color.text.secondary, marginTop: spacing.xs },

  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: spacing.m,
  },
  docRowDivider: { borderTopWidth: 1, borderTopColor: color.border.default },
  docIcon: {
    width: 36, height: 36, borderRadius: radius.pill,
    backgroundColor: color.brand.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  docLabel: { ...typography.bodyEmphasized, color: color.text.primary },
  docHint: { ...typography.caption, color: color.text.tertiary, marginTop: 2 },

  emailBlock: { marginTop: spacing.l },
  emailLabel: { ...typography.captionEmphasized, color: color.text.secondary, marginBottom: spacing.xs },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: color.brand.primarySoft,
    borderRadius: radius.m,
    alignSelf: 'flex-start',
  },
  emailValue: { ...typography.bodyEmphasized, color: color.brand.primary },

  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginTop: spacing.m,
  },
  tipText: { flex: 1, ...typography.caption, color: color.text.secondary },
});
