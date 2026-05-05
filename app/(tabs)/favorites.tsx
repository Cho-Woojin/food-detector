import { Icon } from '@/components/Icon';
import { Cheese } from '@/constants/Assets';
import { palette } from '@/constants/Colors';
import { ensureRecomputedIndex } from '@/utils/dataStore';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Grade = 'GOLDEN' | 'SILVER' | 'BRONZE';
type Favorite = {
  id: string;
  name: string;
  category: string;
  grade: Grade;
  score: number;
  distance: string;
  district: string;
};

const FILTERS = ['전체', 'GOLDEN', 'SILVER', 'BRONZE'] as const;

export default function FavoritesScreen() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('전체');
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  // 임시 좋아요: 재계산 인덱스 상위 점수 일부
  useEffect(() => {
    let cancelled = false;
    ensureRecomputedIndex().then((rows) => {
      if (cancelled) return;
      const list: Favorite[] = rows
        .filter((r) => r.gr === 'GOLDEN' || r.gr === 'SILVER' || r.gr === 'BRONZE')
        .sort((a, b) => b.s - a.s)
        .slice(0, 8)
        .map((r) => ({
          id: r.i,
          name: r.n,
          category: r.c,
          grade: r.gr === 'GOLDEN' ? 'GOLDEN' : r.gr === 'SILVER' ? 'SILVER' : 'BRONZE',
          score: r.s,
          distance: '—',
          district: r.g,
        }));
      setFavorites(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = filter === '전체' ? favorites : favorites.filter((f) => f.grade === filter);

  return (
    <View style={styles.root}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>좋아요한 식당</Text>
        <Text style={styles.headerCount}>{favorites.length}곳</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, active && styles.filterChipActive]}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {filtered.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.7}
            onPress={() => router.push(`/restaurant/${item.id}` as any)}
            style={styles.card}>
            <Image
              source={
                item.grade === 'GOLDEN'
                  ? Cheese.gold
                  : item.grade === 'SILVER'
                  ? Cheese.silver
                  : Cheese.bronze
              }
              style={styles.cheese}
              resizeMode="contain"
            />
            <View style={styles.cardBody}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardScore}>{item.score}점</Text>
              </View>
              <Text style={styles.cardCategory}>
                {item.category} · {item.distance}
              </Text>
              <View style={styles.districtRow}>
                <Icon name="location" size={11} color={palette.text3} />
                <Text style={styles.cardDistrict}>{item.district}</Text>
              </View>
            </View>
            <Icon name="heart" size={16} color={palette.accent} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        ))}

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Icon name="searchOutline" size={36} color={palette.text3} />
            <Text style={styles.emptyText}>해당 등급의 식당이 없어요</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.white },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: palette.text1 },
  headerCount: { fontSize: 13, color: palette.text3 },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
  },
  filterChipActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  filterText: { fontSize: 12, color: palette.text2, fontWeight: '500' },
  filterTextActive: { color: palette.white, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.bg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cheese: { width: 44, height: 44, marginRight: 12 },
  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  cardName: { fontSize: 15, fontWeight: '600', color: palette.text1 },
  cardScore: { fontSize: 13, fontWeight: '600', color: palette.accent },
  cardCategory: { fontSize: 12, color: palette.text2, marginBottom: 2 },
  districtRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardDistrict: { fontSize: 11, color: palette.text3 },

  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: { fontSize: 13, color: palette.text3 },
});
