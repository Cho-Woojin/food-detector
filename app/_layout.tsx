import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppSplash } from '@/components/AppSplash';
import { MobileFrame } from '@/components/MobileFrame';
import { useColorScheme } from '@/components/useColorScheme';
import { fontFamilies } from '@/constants/tokens';

const fontFamily = fontFamilies.default;
import { ensureRecomputedIndex } from '@/utils/dataStore';
import { shouldShowLanding } from '@/utils/landing';
import { useKakaoUser } from '@/utils/kakaoAuth';
import { router } from 'expo-router';

// 모든 Text/TextInput 기본 폰트를 Pretendard로 (웹) / 시스템 (네이티브)
const TextAny = Text as any;
TextAny.defaultProps = TextAny.defaultProps || {};
TextAny.defaultProps.style = [{ fontFamily }, TextAny.defaultProps.style];

const InputAny = TextInput as any;
InputAny.defaultProps = InputAny.defaultProps || {};
InputAny.defaultProps.style = [{ fontFamily }, InputAny.defaultProps.style];

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const [dataReady, setDataReady] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const kakaoUser = useKakaoUser();

  // 인덱스 + 자치구 식당 데이터 미리 로드 (홈/검색/지도가 즉시 동작하도록)
  useEffect(() => {
    let cancelled = false;
    ensureRecomputedIndex()
      .catch(() => null)
      .then(() => {
        if (!cancelled) setDataReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 첫 진입 + 비로그인 + skip 안 한 사용자는 랜딩으로 리다이렉트.
  // 데이터 + 스플래시가 다 사라진 후에 처리해야 깜빡임 없음.
  useEffect(() => {
    if (!dataReady || !splashGone) return;
    if (kakaoUser) return; // 로그인 상태면 랜딩 건너뜀
    if (shouldShowLanding()) router.replace('/landing' as any);
  }, [dataReady, splashGone, kakaoUser]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <MobileFrame>
        <View style={{ flex: 1 }}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            <Stack.Screen
              name="search"
              options={{
                headerShown: false,
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen name="restaurant/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="auth/kakao" options={{ headerShown: false }} />
            <Stack.Screen name="landing" options={{ headerShown: false, animation: 'fade' }} />
          </Stack>

          {!splashGone && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999,
              }}
              pointerEvents={dataReady ? 'none' : 'auto'}>
              <AppSplash
                ready={dataReady}
                onFinish={() => setSplashGone(true)}
                minDurationMs={1400}
              />
            </View>
          )}
        </View>
        </MobileFrame>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
