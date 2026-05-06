# 01. 디자인 시스템

> 식탐정의 디자인 토큰과 자산 사용 가이드. 새 화면 만들 때 반드시 이 문서 참고.

## 🎨 색상 시스템

### Brand
- `accent`: `#F97316` (Orange) — 메인 CTA, 검색바, 강조
- `accentLight`: `#FFEDD5` — Orange 배경
- `accentDark`: `#EA580C` — Hover/Active

### Neutral
- `text1`: `#111827` — 주요 텍스트
- `text2`: `#6B7280` — 보조 텍스트
- `text3`: `#9CA3AF` — 약한 텍스트, placeholder
- `bg`: `#FAFAF9` — 페이지 배경
- `bgCard`: `#F5F5F4` — 카드 배경
- `border`: `#E5E7EB` — 구분선

### Cheese Grades
- `gold`: `#EAB308` / `goldLight`: `#FEF08A`
- `silver`: `#94A3B8` / `silverLight`: `#E2E8F0`
- `bronze`: `#CD7F32` / `bronzeLight`: `#F5DEB3`

### Risk Levels
- `riskGreen`: `#22C55E` (평온/양호)
- `riskYellow`: `#FBBF24` (주의)
- `riskOrange`: `#F97316` (경계)
- `riskRed`: `#EF4444` (위험)

### Special
- `mascotBg`: `#FFF8F0` — 마스코트 카드 배경
- `mascotBorder`: `#FED7AA` — 마스코트 카드 테두리
- `purple`: `#8B5CF6` — 사장님 모드

**Import**: `import { palette, riskLevels, cheeseGrades } from '@/constants/Colors';`

## 📐 Typography (RN StyleSheet)

| 위계 | size | weight | 사용처 |
|---|---|---|---|
| Hero | 56 | 600 | 점수 (SCR-02) |
| Title | 22 | 600 | 식당명, 화면 타이틀 |
| Heading | 16 | 600 | 섹션 헤더 |
| Body | 14 | 400 | 일반 본문 |
| Caption | 12 | 400 | 보조 정보 |
| Micro | 10 | 400 | 출처·메타 |

## 🖼 자산 매핑

### 마스코트 7개 (`assets/mascots/`)

| 키 | 파일 | 사용처 |
|---|---|---|
| `ceremony` | ceremony.png | 골든 식당, 축하 |
| `search` | search.png | 검색·수사 중 |
| `warning` | warning.png | 위험·요주의 |
| `thanks` | thanks.png | 리뷰 작성 완료 |
| `empty` | empty.png | 검색 0건, 빈 좋아요 |
| `badge` | badge.png | 사장님 인증 완료 |
| `weather` | weather.png | 메인 위험 지수 (대표) |

### 치즈 트로피 3종 (`assets/cheese/`)
- `gold.png` (90~100점)
- `silver.png` (80~89점)
- `bronze.png` (70~79점)

### 로고 (`assets/logo/`)
- `horizontal.png` — 캐릭터+텍스트 (헤더용) ⚠️ 누락
- `app_icon.png` — 앱 아이콘
- `symbol.png` — 컴팩트 심볼

### 온보딩 (`assets/onboarding/`)
- `investigate.png` — 와이드 일러스트 1
- `celebrate.png` — 와이드 일러스트 2

**Import**: `import { Mascots, Cheese, Logos, Onboarding } from '@/constants/Assets';`

## 📱 컴포넌트 패턴

### 마스코트 카드 (위험 지수)
```tsx
<View style={[styles.card, { backgroundColor: palette.mascotBg, borderColor: palette.mascotBorder }]}>
  <Image source={Mascots[risk.mascot]} style={{ width: 96, height: 96 }} resizeMode="contain" />
  <Text style={{ color: risk.color }}>{risk.label}</Text>
</View>
```

### 치즈 배지
```tsx
{grade === 'GOLDEN' && <Image source={Cheese.gold} style={styles.cheeseImage} />}
```

### Orange 검색바 (Hero)
```tsx
<TouchableOpacity style={{
  backgroundColor: palette.accentLight,
  borderColor: palette.accent,
  borderWidth: 1.5,
  borderRadius: 16,
  padding: 16,
}}>
  <Text>🔍 식당을 검색해보세요</Text>
</TouchableOpacity>
```

## 📏 Spacing
- xs: 4 / sm: 8 / md: 16 / lg: 24 / xl: 32

## 🔄 Border Radius
- sm: 4 / md: 8 / lg: 12 / xl: 16 / pill: 9999