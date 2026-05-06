// Food Detector - Design Tokens
// Brand: Green + Yellow color system (food safety domain)

const tintColorLight = '#2ECC71';
const tintColorDark = '#27AE60';

export const palette = {
  // ===== Brand Colors =====
  primaryGreen: '#2ECC71',
  subGreen: '#27AE60',
  lightGreen: '#D5F5E3',
  
  primaryYellow: '#F1C40F',
  subYellow: '#FFD662',
  lightYellow: '#FFF4CC',
  
  // ===== Status Colors =====
  alertRed: '#E74C3C',
  alertRedLight: '#FADBD8',
  
  infoBlue: '#3498DB',
  infoBlueLight: '#D6EAF8',
  
  // ===== Surface =====
  white: '#FFFFFF',
  bg: '#FFFDF8',
  bgCard: '#FAFAF7',
  surface: '#FFFFFF',
  
  // ===== Text =====
  text1: '#222222',
  text2: '#666666',
  text3: '#999999',
  textPrimary: '#222222',
  textSecondary: '#666666',
  
  // ===== Border =====
  border: '#E5E5E5',
  borderDark: '#CCCCCC',
  
  // ===== Cheese Grades =====
  // Gold = Primary Yellow (브랜드와 일관)
  gold: '#F1C40F',
  goldLight: '#FFF4CC',
  silver: '#94A3B8',
  silverLight: '#E2E8F0',
  bronze: '#CD7F32',
  bronzeLight: '#F5DEB3',
  
  // ===== Risk Levels (5 stages) =====
  riskGreen: '#2ECC71',          // 1, 2 평온/양호
  riskGreenLight: '#D5F5E3',
  riskYellow: '#F1C40F',         // 3 주의
  riskYellowLight: '#FFF4CC',
  riskOrange: '#FFD662',         // 4 경계 (Sub Yellow)
  riskOrangeLight: '#FFF8E1',
  riskRed: '#E74C3C',            // 5 위험
  riskRedLight: '#FADBD8',
  
  // ===== Legacy compatibility (기존 코드 호환) =====
  accent: '#2ECC71',             // ⭐ Orange → Green으로 변경
  accentLight: '#D5F5E3',
  accentDark: '#27AE60',
  
  warn: '#F1C40F',
  warnLight: '#FFF4CC',
  ok: '#2ECC71',
  okLight: '#D5F5E3',
  danger: '#E74C3C',
  dangerLight: '#FADBD8',
  info: '#3498DB',
  infoLight: '#D6EAF8',
  
  // ===== Owner Mode =====
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  
  // ===== Mascot =====
  mascotBg: '#FFFDF8',           // 배경과 동일하게 자연스럽게
  mascotBorder: '#FFD662',       // Sub Yellow로 부드럽게
} as const;

// ===== Risk Level System (5 stages) =====
// 단계별 마스코트 표정/포즈 차등 + 메시지 다양화 (시간대/상황별)
export const riskLevels = {
  1: {
    label: 'Calm',
    labelKr: '평온',
    emoji: '🟢',
    color: palette.riskGreen,
    bgColor: palette.riskGreenLight,
    mascot: 'weather' as const, // 화창
    message: '특별한 주의 사항 없습니다',
    messages: [
      '오늘은 마음껏 외식 즐기세요!',
      '식중독 걱정 없는 좋은 날이에요',
      '평소처럼 회식·모임 OK!',
    ],
  },
  2: {
    label: 'Good',
    labelKr: '양호',
    emoji: '🟢',
    color: palette.riskGreen,
    bgColor: palette.riskGreenLight,
    mascot: 'weather' as const,
    message: '평소처럼 즐기세요',
    messages: [
      '평소처럼 즐기세요',
      '특별히 가릴 메뉴 없어요',
      '오늘은 무난한 컨디션이에요',
    ],
  },
  3: {
    label: 'Caution',
    labelKr: '주의',
    emoji: '🟡',
    color: palette.riskYellow,
    bgColor: palette.riskYellowLight,
    mascot: 'warning' as const, // 주의 표정
    message: '가열 메뉴 위주로 추천드려요',
    messages: [
      '가열 메뉴 위주로 추천드려요',
      '오늘 회식이라면 조리 메뉴로!',
      '여름철 회·날 음식은 잠시 미루세요',
      '점심엔 따뜻한 국물 어떠세요?',
    ],
  },
  4: {
    label: 'Alert',
    labelKr: '경계',
    emoji: '🟠',
    color: palette.riskOrange,
    bgColor: palette.riskOrangeLight,
    mascot: 'warning' as const,
    message: '날 음식과 해산물은 피하세요',
    messages: [
      '날 음식과 해산물은 피하세요',
      '오늘은 충분히 익힌 음식 위주로!',
      '뷔페·샐러드바 권장하지 않아요',
      '실온 보관 음식 주의하세요',
    ],
  },
  5: {
    label: 'Danger',
    labelKr: '위험',
    emoji: '🔴',
    color: palette.riskRed,
    bgColor: palette.riskRedLight,
    mascot: 'empty' as const, // 위험 단계는 더 어두운 표정
    message: '오늘은 외식 자제 권장',
    messages: [
      '오늘은 외식 자제 권장',
      '집에서 직접 조리하는 게 안전해요',
      '회식·모임은 다음으로 미루세요',
    ],
  },
} as const;

// 시간/날짜 기반으로 동일 단계 내에서 메시지 선택 (안정적 회전)
export function pickRiskMessage(level: 1 | 2 | 3 | 4 | 5): string {
  const stage = riskLevels[level];
  const list = stage.messages as readonly string[];
  if (list.length === 0) return stage.message;
  const now = new Date();
  const seed = now.getFullYear() * 1000 + now.getMonth() * 50 + now.getDate() + now.getHours();
  return list[seed % list.length];
}

// ===== 환경 컨텍스트 기반 마스코트 메시지 빌더 =====
// "오늘 {district}는 {env}하니, {avoid}는 피하고 {recommend}를 추천합니다" 형태
export type EnvContext = {
  temp: number;
  humidity: number;
  foodPoisoning?: string;
};

const envSummary = (e: EnvContext) => `기온 ${e.temp}°C·습도 ${e.humidity}%`;

type Builder = (district: string, env: EnvContext) => string;

const RISK_TEMPLATES: Record<1 | 2 | 3 | 4 | 5, Builder[]> = {
  1: [
    (d) => `오늘 ${d}는 식중독 위험이 낮아요. 평소처럼 외식 즐기세요!`,
    (d, e) => `${d} 환경은 ${envSummary(e)}로 안정적이에요. 회·해산물도 OK.`,
    (d) => `${d} 오늘은 마음껏 회식·모임 다녀오셔도 좋아요.`,
  ],
  2: [
    (d) => `오늘 ${d}는 양호한 컨디션이에요. 가리지 말고 즐기세요.`,
    (d, e) => `${d}는 ${envSummary(e)}로 무난해요. 평소처럼 외식 OK.`,
  ],
  3: [
    (d, e) => `오늘 ${d}는 ${envSummary(e)}로 세균 번식 좋은 조건이에요. 회무침·날 음식은 피하고, 따뜻한 가열 메뉴를 추천해요.`,
    (d) => `${d} 오늘 환경상 실온 보관 음식이 위험해요. 비빔국수·냉채는 피하고 칼국수·국밥을 추천드려요.`,
    (d, e) => `오늘 ${d}는 ${e.temp}°C로 무덥습니다. 차가운 비빔류는 피하고 가열 메뉴 위주로!`,
    (d) => `${d} 회식이라면 회보다 구이·전골 추천이에요.`,
  ],
  4: [
    (d, e) => `오늘 ${d}는 ${envSummary(e)}로 식중독 위험이 높아요. 회·해산물·뷔페는 피하고, 충분히 가열한 국물 메뉴를 추천해요.`,
    (d) => `${d} 오늘 환경상 날 음식 위험이 큽니다. 사시미·육회·생굴은 피하고 찌개·전골을 추천드려요.`,
    (d, e) => `${d}는 ${envSummary(e)}로 경계 단계예요. 샐러드바·뷔페 회 코너는 오늘 자제해주세요.`,
  ],
  5: [
    (d) => `오늘 ${d}는 식중독 위험이 매우 높아요. 회·날계란·실온 음식 모두 피하고 즉석 조리한 가열 메뉴만 드세요.`,
    (d) => `${d} 외식 자제 권장. 집에서 직접 조리하시는 게 가장 안전해요.`,
    (d, e) => `${d}는 ${envSummary(e)}로 위험 단계입니다. 오늘은 모임을 다음으로 미루세요.`,
  ],
};

export function buildRiskMessage(
  level: 1 | 2 | 3 | 4 | 5,
  district: string,
  env: EnvContext
): string {
  const list = RISK_TEMPLATES[level];
  const now = new Date();
  const seed = now.getFullYear() * 1000 + now.getMonth() * 50 + now.getDate() + now.getHours();
  return list[seed % list.length](district, env);
}

// ===== Cheese Grade System =====
export const cheeseGrades = {
  GOLDEN: {
    label: 'Golden Cheese',
    labelKr: '골든 치즈',
    description: '식탐정이 극찬한 식당',
    color: palette.gold,
    bgColor: palette.goldLight,
    image: 'gold' as const,
    minScore: 90,
  },
  SILVER: {
    label: 'Silver Cheese',
    labelKr: '실버 치즈',
    description: '식탐정이 인정한 식당',
    color: palette.silver,
    bgColor: palette.silverLight,
    image: 'silver' as const,
    minScore: 80,
  },
  BRONZE: {
    label: 'Bronze Cheese',
    labelKr: '브론즈 치즈',
    description: '식탐정이 주목한 식당',
    color: palette.bronze,
    bgColor: palette.bronzeLight,
    image: 'bronze' as const,
    minScore: 70,
  },
  INVESTIGATING: {
    label: 'Investigating',
    labelKr: '수사 중',
    description: '식탐정이 지켜보는 식당',
    color: palette.text2,
    bgColor: palette.bgCard,
    image: null,
    minScore: 60,
  },
  WARNING: {
    label: 'Warning',
    labelKr: '요주의',
    description: '식탐정이 경고한 식당',
    color: palette.alertRed,
    bgColor: palette.alertRedLight,
    image: null,
    minScore: 0,
  },
} as const;

// ===== Expo Template Compatibility =====
export default {
  light: {
    text: palette.text1,
    background: palette.bg,
    tint: tintColorLight,
    tabIconDefault: palette.text3,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: palette.white,
    background: '#000000',
    tint: tintColorDark,
    tabIconDefault: palette.text3,
    tabIconSelected: tintColorDark,
  },
};