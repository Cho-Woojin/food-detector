import { palette } from '@/constants/Colors';
import { StyleSheet, Text, View } from 'react-native';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗺 지도</Text>
      <Text style={styles.subtitle}>SCR-06 (작업 예정)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
  },
  title: { fontSize: 24, fontWeight: '600', color: palette.text1 },
  subtitle: { fontSize: 14, color: palette.text3, marginTop: 8 },
});