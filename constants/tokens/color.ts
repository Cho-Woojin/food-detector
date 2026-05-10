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
    danger:   '#FF3B30',
  },

  // ===== Fill (HIG system fills) =====
  fill: {
    primary:    'rgba(120,120,128,0.20)',
    secondary:  'rgba(120,120,128,0.16)',
    tertiary:   'rgba(118,118,128,0.12)',
    quaternary: 'rgba(116,116,128,0.08)',
  },

  // ===== Status (HIG system) =====
  status: {
    success:      '#34C759',
    successSoft:  'rgba(52,199,89,0.12)',
    warning:      '#FF9500',
    warningSoft:  'rgba(255,149,0,0.12)',
    danger:       '#FF3B30',
    dangerSoft:   'rgba(255,59,48,0.12)',
    info:         '#007AFF',
    infoSoft:     'rgba(0,122,255,0.12)',
    neutral:      '#8E8E93',
    neutralSoft:  'rgba(120,120,128,0.16)',
  },

  // ===== Risk levels (5 stages) =====
  risk: {
    1: { fg: '#34C759', bg: 'rgba(52,199,89,0.12)' },
    2: { fg: '#34C759', bg: 'rgba(52,199,89,0.12)' },
    3: { fg: '#FFCC00', bg: 'rgba(255,204,0,0.16)' },
    4: { fg: '#FF9500', bg: 'rgba(255,149,0,0.12)' },
    5: { fg: '#FF3B30', bg: 'rgba(255,59,48,0.12)' },
  },

  // ===== Cheese grades =====
  cheese: {
    GOLDEN: { fg: '#F1C40F', bg: '#FFF4CC' },
    SILVER: { fg: '#94A3B8', bg: '#E2E8F0' },
    BRONZE: { fg: '#CD7F32', bg: '#F5DEB3' },
    ROTTEN: { fg: '#FF3B30', bg: 'rgba(255,59,48,0.12)' },
  },

  // ===== Owner mode =====
  owner: {
    primary:     '#8B5CF6',
    primaryHover:'#7C3AED',
    primarySoft: '#EDE9FE',
  },
} as const;

export type Color = typeof color;
export type RiskLevel = 1 | 2 | 3 | 4 | 5;
export type CheeseGradeKey = keyof typeof color.cheese;
