// 카카오 로그인 콜백 페이지
// /auth/kakao?code=XXX 로 리다이렉트되어 옴 → code 교환 후 내정보로 이동

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { color, spacing, typography } from '@/constants/tokens';
import { handleKakaoCallback } from '@/utils/kakaoAuth';

export default function KakaoCallback() {
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = typeof params.code === 'string' ? params.code : null;
    const err = typeof params.error === 'string' ? params.error : null;
    if (err) {
      setError(params.error_description || err);
      return;
    }
    if (!code) {
      setError('인증 코드가 없습니다');
      return;
    }
    handleKakaoCallback(code)
      .then((user) => {
        if (user) router.replace('/(tabs)/profile' as any);
        else setError('카카오 로그인에 실패했어요');
      })
      .catch((e) => {
        if (__DEV__) console.warn('[kakaoCallback]', e);
        setError(e?.message ?? '로그인 중 오류가 발생했어요');
      });
  }, [params.code, params.error, params.error_description]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      {error ? (
        <>
          <Text style={styles.title}>로그인 실패</Text>
          <Text style={styles.body}>{error}</Text>
          <Text style={styles.body} onPress={() => router.replace('/(tabs)/profile' as any)}>
            내정보로 돌아가기
          </Text>
        </>
      ) : (
        <>
          <ActivityIndicator color={color.brand.primary} size="large" />
          <Text style={styles.body}>카카오로 로그인 중…</Text>
        </>
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
    gap: spacing.m,
    padding: spacing.l,
  },
  title: { ...typography.title, color: color.text.primary },
  body: { ...typography.subheadline, color: color.text.secondary, textAlign: 'center' },
});
