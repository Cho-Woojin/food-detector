import { Cheese, Mascots } from '@/constants/Assets';
import { palette, riskLevels } from '@/constants/Colors';
import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

/**
 * SCR-01 메인 페이지 (Hero 1)
 */
export default function HomeScreen() {
  const currentDistrict = '종로구 청운효자동';
  const currentRiskLevel = 4 as 1 | 2 | 3 | 4 | 5;
  const risk = riskLevels[currentRiskLevel];

  const environment = {
    temp: 28,
    humidity: 85,
    pm25: 73,
    pm25Status: '나쁨',
    foodPoisoning: 1,
  };

  const favorites = [
    { name: '진미냉면', grade: 'GOLDEN', score: 95 },
    { name: '송도식당', grade: 'SILVER', score: 87 },
    { name: '동성반점', grade: 'BRONZE', score: 76 },
  ];

  const [showClipboardToast, setShowClipboardToast] = useState(true);
  const clipboardKeyword = '송도떡볶이';

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.logo}>🐭 Food Detector</Text>
          <Text style={styles.headerIcon}>🔔</Text>
        </View>

        {/* 위치 */}
        <View style={styles.locationRow}>
          <Text style={styles.locationText}>📍 {currentDistrict}</Text>
          <Text style={styles.locationChange}>변경</Text>
        </View>

        {/* 검색바 (Hero) */}
        <TouchableOpacity activeOpacity={0.8} style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchTitle}>식당을 검색해보세요</Text>
          <Text style={styles.searchSubtitle}>위생 점수로 안전한 식당 찾기</Text>
        </TouchableOpacity>

        {/* 클립보드 토스트 */}
        {showClipboardToast && (
          <View style={styles.clipboardToast}>
            <Text style={styles.clipboardEmoji}>💡</Text>
            <Text style={styles.clipboardText}>
              "{clipboardKeyword}"로 검색할까요?
            </Text>
            <TouchableOpacity>
              <Text style={styles.clipboardAction}>검색</Text>
            </TouchableOpacity>
            <Pressable
              onPress={() => setShowClipboardToast(false)}
              style={styles.clipboardClose}>
              <Text style={styles.clipboardCloseText}>✕</Text>
            </Pressable>
          </View>
        )}

        {/* ⭐ 마스코트 위험 지수 카드 */}
        <View
          style={[
            styles.mascotCard,
            { backgroundColor: palette.mascotBg, borderColor: palette.mascotBorder },
          ]}>
          <Text style={styles.mascotCardLabel}>오늘의 식중독 위험</Text>
          
          <View style={styles.mascotRow}>
            <Image
              source={Mascots[risk.mascot]}
              style={styles.mascotImage}
              resizeMode="contain"
            />
            
            <View style={styles.riskInfo}>
              <View style={styles.riskBadgeRow}>
                <Text style={styles.riskEmoji}>{risk.emoji}</Text>
                <Text style={[styles.riskLabel, { color: risk.color }]}>
                  {risk.label}
                </Text>
              </View>
              <Text style={styles.riskStage}>
                5단계 중 {currentRiskLevel}단계
              </Text>
              <Text style={styles.riskMessage}>"{risk.message}"</Text>
            </View>
          </View>

          <View style={styles.indicatorRow}>
            {[1, 2, 3, 4, 5].map((level) => {
              const isActive = level === currentRiskLevel;
              const stage = riskLevels[level as 1 | 2 | 3 | 4 | 5];
              return (
                <View key={level} style={styles.indicatorItem}>
                  <View
                    style={[
                      styles.indicatorDot,
                      isActive && {
                        backgroundColor: stage.color,
                        width: 12,
                        height: 12,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.indicatorLabel,
                      isActive && {
                        color: stage.color,
                        fontWeight: '600',
                      },
                    ]}>
                    {stage.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 환경 데이터 미니 행 */}
        <View style={styles.envRow}>
          <View style={styles.envItem}>
            <Text style={styles.envEmoji}>🌡️</Text>
            <View>
              <Text style={styles.envValue}>
                {environment.temp}° / 습도 {environment.humidity}%
              </Text>
              <Text style={styles.envSub}>
                PM2.5 {environment.pm25} ({environment.pm25Status})
              </Text>
            </View>
          </View>
          <View style={styles.envDivider} />
          <View style={styles.envItem}>
            <Text style={styles.envEmoji}>🦠</Text>
            <View>
              <Text style={styles.envValue}>식중독 {environment.foodPoisoning}건</Text>
              <Text style={styles.envSub}>30일 이내</Text>
            </View>
          </View>
        </View>

        <Text style={styles.dataSource}>
          💡 식약처 식중독 예측 + 서울시 환경 데이터 분석
        </Text>

        {/* 좋아요한 식당 */}
        <View style={styles.favHeader}>
          <Text style={styles.favTitle}>❤ 좋아요한 식당</Text>
          <Text style={styles.favMore}>전체 →</Text>
        </View>

        <View style={styles.favRow}>
          {favorites.map((fav, i) => (
            <TouchableOpacity key={i} style={styles.favCard}>
              {fav.grade === 'GOLDEN' && (
                <Image source={Cheese.gold} style={styles.favCheeseImage} resizeMode="contain" />
              )}
              {fav.grade === 'SILVER' && (
                <Image source={Cheese.silver} style={styles.favCheeseImage} resizeMode="contain" />
              )}
              {fav.grade === 'BRONZE' && (
                <Image source={Cheese.bronze} style={styles.favCheeseImage} resizeMode="contain" />
              )}
              <Text style={styles.favName}>{fav.name}</Text>
              <Text style={styles.favScore}>{fav.score}점</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.white },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  logo: { fontSize: 14, fontWeight: '500', color: palette.text1 },
  headerIcon: { fontSize: 18 },

  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  locationText: { fontSize: 15, fontWeight: '600', color: palette.text1 },
  locationChange: { fontSize: 12, color: palette.text3 },

  searchBar: {
    backgroundColor: palette.accentLight,
    borderWidth: 1.5,
    borderColor: palette.accent,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  searchIcon: { fontSize: 22, marginBottom: 4 },
  searchTitle: { fontSize: 16, fontWeight: '600', color: palette.text1, marginBottom: 4 },
  searchSubtitle: { fontSize: 11, color: palette.text2 },

  clipboardToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.text1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  clipboardEmoji: { fontSize: 16, marginRight: 8 },
  clipboardText: { flex: 1, fontSize: 13, fontWeight: '500', color: palette.white },
  clipboardAction: { fontSize: 13, fontWeight: '600', color: palette.accent, marginRight: 8 },
  clipboardClose: { paddingHorizontal: 4 },
  clipboardCloseText: { fontSize: 13, color: palette.text3 },

  mascotCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  mascotCardLabel: { fontSize: 12, fontWeight: '500', color: palette.text2, marginBottom: 8 },
  mascotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  mascotImage: { width: 96, height: 96, marginRight: 16 },
  riskInfo: { flex: 1 },
  riskBadgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  riskEmoji: { fontSize: 32, marginRight: 4 },
  riskLabel: { fontSize: 28, fontWeight: '600' },
  riskStage: { fontSize: 11, color: palette.text3, marginBottom: 8 },
  riskMessage: { fontSize: 12, fontWeight: '500', color: palette.text1, lineHeight: 18 },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  indicatorItem: { alignItems: 'center', flex: 1 },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: palette.border,
    marginBottom: 6,
  },
  indicatorLabel: { fontSize: 9, color: palette.text3 },

  envRow: {
    flexDirection: 'row',
    backgroundColor: palette.infoLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  envItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  envEmoji: { fontSize: 20, marginRight: 8 },
  envValue: { fontSize: 12, fontWeight: '500', color: palette.text1 },
  envSub: { fontSize: 11, color: palette.text2, marginTop: 2 },
  envDivider: { width: 1, backgroundColor: palette.border, opacity: 0.6 },
  dataSource: { fontSize: 10, color: palette.text3, textAlign: 'center', marginBottom: 24 },

  favHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  favTitle: { fontSize: 12, color: palette.text3 },
  favMore: { fontSize: 11, color: palette.text3 },
  favRow: { flexDirection: 'row', justifyContent: 'space-between' },
  favCard: {
    flex: 1,
    backgroundColor: palette.bgCard,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  favCheeseImage: { width: 32, height: 32, marginBottom: 4 },
  favName: { fontSize: 11, color: palette.text2, marginBottom: 2 },
  favScore: { fontSize: 10, color: palette.text3 },
});