// /admin-claim — 시연용 관리자 권한 셀프 등록 페이지
// 카카오 로그인 후 이 URL을 방문하면 본인 kakao userId가 admin 화이트리스트에 추가됨.
// 이후 식당 상세 페이지에서 "사장님 지정" 권한이 노출.
// 백엔드/RBAC가 없으므로 시연 시연용으로만 사용 — production에선 utils/admin.ts의
// HARDCODED_ADMINS로 이전.

import { Image, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { Mascots } from '@/constants/Assets';
import { color, mascotSize, radius, spacing, typography } from '@/constants/tokens';
import { claimAdmin, isAdmin } from '@/utils/admin';
import { loginWithKakao, useKakaoUser } from '@/utils/kakaoAuth';

export default function AdminClaim() {
  const insets = useSafeAreaInsets();
  const user = useKakaoUser();
  const [done, setDone] = useState(false);

  // 로그인된 상태로 진입하면 즉시 등록
  useEffect(() => {
    if (user && !isAdmin(user.id)) {
      claimAdmin(user.id);
      setDone(true);
    } else if (user && isAdmin(user.id)) {
      setDone(true);
    }
  }, [user]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.l }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <Image source={Mascots.search} style={styles.mascot} resizeMode="contain" />

      {!user ? (
        <>
          <Text style={styles.title}>관리자 등록</Text>
          <Text style={styles.body}>
            먼저 카카오로 로그인하면{'\n'}이 기기를 관리자로 등록할게요.
          </Text>
          <Button
            variant="kakao"
            size="md"
            leftIcon="chat"
            fullWidth
            onPress={() => loginWithKakao()}>
            카카오로 로그인
          </Button>
        </>
      ) : done ? (
        <>
          <Text style={styles.title}>관리자 등록 완료</Text>
          <Text style={styles.body}>
            <Text style={styles.nick}>{user.nickname}</Text> 님 (id: {user.id}){'\n'}
            이제 식당 상세 페이지에서{'\n'}사장님 지정 버튼을 사용할 수 있어요.
          </Text>
          <Button
            variant="primary"
            size="md"
            fullWidth
            onPress={() => router.replace('/(tabs)' as any)}>
            홈으로
          </Button>
        </>
      ) : (
        <Text style={styles.body}>등록 중…</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.l,
    gap: spacing.m,
  },
  mascot: {
    width: mascotSize.featured,
    height: mascotSize.featured,
    marginBottom: spacing.s,
  },
  title: { ...typography.title, color: color.text.primary, textAlign: 'center' },
  body: {
    ...typography.subheadline,
    color: color.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.l,
  },
  nick: { color: color.text.primary, fontWeight: '700' },
});
