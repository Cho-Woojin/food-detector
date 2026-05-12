// 카카오 공식 로그인 버튼 — Kakao Developers 자산 (kakao_login_large_wide.png 600×90, 6.67:1).
// 자체 배경·심볼·텍스트가 포함된 PNG라 별도 색상/아이콘 스타일링 불필요.
// Pressable은 투명 wrapper로만 사용.

import { Kakao } from '@/constants/Assets';
import { Image, Pressable, StyleSheet, ViewStyle } from 'react-native';

export type KakaoLoginButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

export function KakaoLoginButton({
  onPress,
  accessibilityLabel,
  style,
}: KakaoLoginButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? '카카오로 로그인'}
      style={({ pressed }) => [styles.btn, style, pressed && { opacity: 0.85 }]}>
      <Image source={Kakao.loginMediumWide} style={styles.image} resizeMode="contain" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', aspectRatio: 600 / 90 },
});
