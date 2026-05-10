// 바텀시트 중간 영역의 5심볼. 점수보다 등급(상태)을 강조.
// 매핑 룰은 data/SCORING_AND_SCHEMA.md 참고.

import { StyleSheet, Text, View } from 'react-native';
import { Icon, IconName } from '@/components/Icon';
import { color, spacing, typography } from '@/constants/tokens';

type SymbolStatus = 'good' | 'ok' | 'warn' | 'none';

export type SymbolInput = {
  hygieneDesignated: boolean;        // 위생등급 지정
  hygieneViolation: boolean;          // AI 분류 위생 직결 위반
  punishCount: number;                // 행정처분 건수
  punishTypes?: string;               // pipe-sep, 예: "영업정지|과태료"
  hasModel: boolean;                  // 모범음식점
  evalGrade?: string;                 // 자율/일반/중점/평가불능/''
  ownerDelta: number;                 // 사장님 점수 0~25
  ownerPostCount: number;             // 최근 30일 인증 건수
  reviewCount: number;
  reviewAvg: number;                  // 0~5
  foreignTotal: number;               // 이물질 신고 건수
};

type SymbolItem = {
  key: string;
  label: string;        // "위생등급" 등 카테고리
  icon: IconName;
  status: SymbolStatus;
  badge: string;        // "보유" / "이력없음" / "—" 등 짧은 상태
};

export function BottomSheetSymbols({ input }: { input: SymbolInput }) {
  const symbols = buildSymbols(input);
  return (
    <View style={styles.row}>
      {symbols.map((s) => (
        <SymbolCell key={s.key} sym={s} />
      ))}
    </View>
  );
}

function SymbolCell({ sym }: { sym: SymbolItem }) {
  const { fg, bg, border } = STATUS_STYLE[sym.status];
  return (
    <View style={styles.cell}>
      <View style={[styles.iconBox, { backgroundColor: bg, borderColor: border }]}>
        <Icon name={sym.icon} size={18} color={fg} />
      </View>
      <Text style={[styles.badge, { color: fg }]} numberOfLines={1}>
        {sym.badge}
      </Text>
      <Text style={styles.label} numberOfLines={1}>{sym.label}</Text>
    </View>
  );
}

function buildSymbols(i: SymbolInput): SymbolItem[] {
  // 1) 위생등급 (식약처) — 정제 데이터엔 bool만 있음. 세부 등급(매우우수/우수/좋음)은
  //    원본 C004 GRD_CD_NM이 raw에 빠져있어 노출 불가. 데이터 파이프라인 보강 시 교체.
  const hygiene: SymbolItem = i.hygieneDesignated
    ? { key: 'hyg', label: '위생등급', icon: 'logo', status: 'good', badge: '지정업소' }
    : { key: 'hyg', label: '위생등급', icon: 'logo', status: 'none', badge: '미지정' };

  // 2) 행정처분 — AI 위생위반이 가장 강한 시그널, 그 외엔 처분 종류 그대로 노출
  const firstPunish = (i.punishTypes ?? '').split('|').filter(Boolean)[0] ?? '';
  let admin: SymbolItem;
  if (i.hygieneViolation) {
    admin = { key: 'adm', label: '행정처분', icon: 'warning', status: 'warn', badge: '위생 위반' };
  } else if (i.punishCount > 0) {
    // 다중 처분이면 종류 + 건수 (예: "시정명령 외 1건"), 단일이면 종류만
    const badge = i.punishCount > 1 && firstPunish
      ? `${firstPunish} 외 ${i.punishCount - 1}`
      : firstPunish || `${i.punishCount}건`;
    admin = { key: 'adm', label: '행정처분', icon: 'warning', status: 'ok', badge };
  } else {
    admin = { key: 'adm', label: '행정처분', icon: 'check', status: 'good', badge: '이력없음' };
  }

  // 3) 공공 인증 — 모범음식점 / 자율관리업소 / 일반관리 / 중점관리 / 평가불능
  let cert: SymbolItem;
  if (i.evalGrade === '중점관리업소') {
    cert = { key: 'crt', label: '공공 인증', icon: 'star', status: 'warn', badge: '중점관리' };
  } else if (i.evalGrade === '평가불능업소') {
    cert = { key: 'crt', label: '공공 인증', icon: 'star', status: 'ok',   badge: '평가불능' };
  } else if (i.hasModel && i.evalGrade === '자율관리업소') {
    cert = { key: 'crt', label: '공공 인증', icon: 'star', status: 'good', badge: '모범+자율' };
  } else if (i.hasModel) {
    cert = { key: 'crt', label: '공공 인증', icon: 'star', status: 'good', badge: '모범음식점' };
  } else if (i.evalGrade === '자율관리업소') {
    cert = { key: 'crt', label: '공공 인증', icon: 'star', status: 'good', badge: '자율관리' };
  } else if (i.evalGrade === '일반관리업소') {
    cert = { key: 'crt', label: '공공 인증', icon: 'star', status: 'ok',   badge: '일반관리' };
  } else {
    cert = { key: 'crt', label: '공공 인증', icon: 'star', status: 'none', badge: '미인증' };
  }

  // 4) 사장님 인증 — 최근 30일 인증 건수 그대로 노출 (0/25점 분포는 색상만)
  let owner: SymbolItem;
  if (i.ownerPostCount === 0) {
    owner = { key: 'own', label: '사장님', icon: 'storefront', status: 'none', badge: '대기중' };
  } else {
    const status: SymbolStatus = i.ownerDelta >= 15 ? 'good' : 'ok';
    owner = { key: 'own', label: '사장님', icon: 'storefront', status, badge: `${i.ownerPostCount}건/30일` };
  }

  // 5) 위생 리뷰 — 별점 평균 + 이물질 신고
  let review: SymbolItem;
  if (i.reviewCount === 0) {
    review = { key: 'rev', label: '위생 리뷰', icon: 'chat', status: 'none', badge: '리뷰 없음' };
  } else {
    const avgBadge = `★${i.reviewAvg.toFixed(1)}`;
    let status: SymbolStatus;
    if (i.foreignTotal > 0 && i.reviewAvg < 3) status = 'warn';
    else if (i.reviewAvg >= 4) status = 'good';
    else if (i.reviewAvg >= 3) status = 'ok';
    else status = 'warn';
    review = { key: 'rev', label: '위생 리뷰', icon: 'chat', status, badge: avgBadge };
  }

  return [hygiene, admin, cert, owner, review];
}

const STATUS_STYLE: Record<SymbolStatus, { fg: string; bg: string; border: string }> = {
  good: {
    fg: color.status.success,
    bg: color.status.successSoft,
    border: color.status.success,
  },
  ok: {
    fg: color.status.warning,
    bg: color.status.warningSoft,
    border: color.status.warning,
  },
  warn: {
    fg: color.status.danger,
    bg: color.status.dangerSoft,
    border: color.status.danger,
  },
  none: {
    fg: color.text.tertiary,
    bg: color.fill.quaternary,
    border: color.border.default,
  },
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    ...typography.captionEmphasized,
  },
  label: {
    ...typography.caption,
    color: color.text.secondary,
  },
});
