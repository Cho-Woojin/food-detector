// Dark-mode color overrides. Status/risk/cheese reuse light values (system colors auto-adapt).
// v1.0: tokens prepared but not exposed (Profile toggle is disabled).

export const darkColor = {
  brand: {
    primary:        '#30D158',
    primaryHover:   '#34C759',
    primaryPressed: '#248A3D',
    primarySoft:    'rgba(48,209,88,0.16)',
    primarySoftStrong: 'rgba(48,209,88,0.24)',
    secondary:      '#FFD60A',
    secondarySoft:  'rgba(255,214,10,0.16)',
  },
  surface: {
    canvas:    '#000000',
    subtle:    '#1C1C1E',
    elevated:  '#2C2C2E',
    overlay:   'rgba(0,0,0,0.60)',
    disabled:  '#1C1C1E',
    mascotBg:  '#1C1C1E',
    ownerBg:   '#1C1C2E',
  },
  text: {
    primary:    '#FFFFFF',
    secondary:  'rgba(235,235,245,0.60)',
    tertiary:   'rgba(235,235,245,0.30)',
    quaternary: 'rgba(235,235,245,0.18)',
    onBrand:    '#FFFFFF',
    onDanger:   '#FFFFFF',
    link:       '#30D158',
  },
  border: {
    default: 'rgba(84,84,88,0.65)',
    strong:  '#3A3A3C',
    focus:   '#30D158',
    // 다크모드에선 라이트모드 코랄에 비해 한 톤 밝게 (가독성)
    danger:  '#FF7060',
  },
  fill: {
    primary:    'rgba(120,120,128,0.36)',
    secondary:  'rgba(120,120,128,0.32)',
    tertiary:   'rgba(118,118,128,0.24)',
    quaternary: 'rgba(118,118,128,0.18)',
  },
  // 위험·경고는 따뜻한 코랄/테라코타 톤 — 라이트모드와 동기화하되 한 단계 밝게.
  status: {
    success:     '#30D158',
    successSoft: 'rgba(48,209,88,0.16)',
    warning:     '#FF9F5C',                 // 따뜻한 호박색 오렌지
    warningSoft: 'rgba(255,159,92,0.18)',
    danger:      '#FF7060',                 // 따뜻한 코랄
    dangerSoft:  'rgba(255,112,96,0.18)',
    info:        '#0A84FF',
    infoSoft:    'rgba(10,132,255,0.16)',
    neutral:     '#98989D',
    neutralSoft: 'rgba(120,120,128,0.32)',
  },
} as const;
