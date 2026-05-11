// Color tokens — semantic categories.
// Single source of truth: brand · surface · text · border · status · risk · cheese · owner.

export const color = {
  // ===== Brand =====
  brand: {
    primary:        '#22C55E',
    primaryHover:   '#16A34A',
    primaryPressed: '#15803D',
    primarySoft:    'rgba(34,197,94,0.12)',
    primarySoftStrong: 'rgba(34,197,94,0.18)',
    secondary:      '#F1C40F',
    secondarySoft:  '#FFF4CC',
  },

  // ===== Surface (background hierarchy) =====
  // 토스 영향 — canvas는 살짝 톤 다운된 회색, 카드는 흰색으로 떠보이는 구조
  surface: {
    canvas:    '#F7F8FA',  // 살짝 차가운 회색
    subtle:    '#FFFFFF',  // 카드/시트
    elevated:  '#FFFFFF',
    overlay:   'rgba(0,0,0,0.40)',
    disabled:  '#F2F2F7',
    mascotBg:  '#FFFFFF',
    ownerBg:   '#F5F3FF',
    tintBlue:  '#EFF4FB',  // 히어로 카드 배경
    tintGreen: 'rgba(34,197,94,0.06)', // 부드러운 그린 면
  },

  // ===== Text =====
  text: {
    primary:    '#000000',
    secondary:  'rgba(60,60,67,0.60)',
    tertiary:   'rgba(60,60,67,0.30)',
    quaternary: 'rgba(60,60,67,0.18)',
    onBrand:    '#FFFFFF',
    onDanger:   '#FFFFFF',
    link:       '#22C55E',
  },

  // ===== Border =====
  border: {
    default:  'rgba(60,60,67,0.18)',
    strong:   '#C6C6C8',
    focus:    '#22C55E',
    // 따뜻한 코랄 레드 — Apple system red(#FF3B30)보다 톤이 부드럽고 음식 앱 분위기에 맞음
    danger:   '#EF5B4C',
  },

  // ===== Fill (HIG system fills) =====
  fill: {
    primary:    'rgba(120,120,128,0.20)',
    secondary:  'rgba(120,120,128,0.16)',
    tertiary:   'rgba(118,118,128,0.12)',
    quaternary: 'rgba(116,116,128,0.08)',
  },

  // ===== Status (HIG system) =====
  // 위험·경고 색은 따뜻한 코랄·테라코타 톤 — 음식 앱 분위기에 부합하고 차가운 system red 대비 덜 자극적.
  status: {
    success:      '#34C759',
    successSoft:  'rgba(52,199,89,0.12)',
    warning:      '#F08A4B',                 // 따뜻한 테라코타 오렌지 (구 #FF9500)
    warningSoft:  'rgba(240,138,75,0.14)',
    danger:       '#EF5B4C',                 // 따뜻한 코랄 레드 (구 #FF3B30)
    dangerSoft:   'rgba(239,91,76,0.14)',
    info:         '#007AFF',
    infoSoft:     'rgba(0,122,255,0.12)',
    neutral:      '#8E8E93',
    neutralSoft:  'rgba(120,120,128,0.16)',
  },

  // ===== Risk levels (4 stages) =====
  // 식약처 식중독 예측지수 단계와 동기화 — 관심(<55)/주의(55~70)/경고(71~85)/위험(≥86)
  // 경고·위험은 위 status.warning/danger와 동일 색상 (단일 원본)
  risk: {
    1: { fg: '#34C759', bg: 'rgba(52,199,89,0.12)' },   // 관심
    2: { fg: '#F5C037', bg: 'rgba(245,192,55,0.16)' },  // 주의 — 따뜻한 골든 옐로
    3: { fg: '#F08A4B', bg: 'rgba(240,138,75,0.14)' },  // 경고 — 테라코타 오렌지
    4: { fg: '#EF5B4C', bg: 'rgba(239,91,76,0.14)' },   // 위험 — 코랄 레드
  },

  // ===== Cheese grades =====
  // ROTTEN은 status.danger와 같은 톤 — 위험 시그널 단일 원본 유지
  cheese: {
    GOLDEN: { fg: '#F1C40F', bg: '#FFF4CC' },
    SILVER: { fg: '#94A3B8', bg: '#E2E8F0' },
    BRONZE: { fg: '#CD7F32', bg: '#F5DEB3' },
    ROTTEN: { fg: '#EF5B4C', bg: 'rgba(239,91,76,0.14)' },
  },

  // ===== Owner mode =====
  owner: {
    primary:     '#8B5CF6',
    primaryHover:'#7C3AED',
    primarySoft: '#EDE9FE',
  },
} as const;

export type Color = typeof color;
export type RiskLevel = 1 | 2 | 3 | 4;
export type CheeseGradeKey = keyof typeof color.cheese;
