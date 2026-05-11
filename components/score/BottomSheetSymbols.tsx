// 바텀시트 중간 영역의 5심볼. 점수보다 등급(상태)을 강조.
// 매핑 룰은 data/SCORING_AND_SCHEMA.md 참고.

import { StyleSheet, Text, View } from 'react-native';
import { Icon, IconName } from '@/components/Icon';
import { color, spacing, typography } from '@/constants/tokens';
// 심볼 cell — 아이콘 + 카테고리 라벨만. 카테고리별 상태/수치는 카드 본문(평가 카드 등)에서 노출.

type SymbolStatus = 'good' | 'ok' | 'warn' | 'none';

export type SymbolInput = {
  hygieneDesignated: boolean;        // 식품안심업소 (구 위생등급제) 지정
  hygieneViolation: boolean;          // AI 분류 + 룰 매칭 위생 직결 위반
  punishCount: number;                // 행정처분 건수
  punishTypes?: string;               // pipe-sep, 예: "영업정지|과태료"
  hasModel: boolean;                  // 모범음식점 (행안부)
  safeRestaurant?: boolean;           // 안심식당 (MAFRA)
  goodPrice?: boolean;                // 착한가격업소 (행안부)
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
      <Text style={styles.label} numberOfLines={1}>{sym.label}</Text>
    </View>
  );
}

function buildSymbols(i: SymbolInput): SymbolItem[] {
  // 1) 식품안심업소
  const hygiene: SymbolItem = i.hygieneDesignated
    ? { key: 'hyg', label: '식품안심업소', icon: 'logo', status: 'good' }
    : { key: 'hyg', label: '식품안심업소', icon: 'logo', status: 'none' };

  // 2) 행정처분 — hygieneViolation/처분건수 여부로 status만 차등
  let admin: SymbolItem;
  if (i.hygieneViolation) {
    admin = { key: 'adm', label: '행정처분', icon: 'warning', status: 'warn' };
  } else if (i.punishCount > 0) {
    admin = { key: 'adm', label: '행정처분', icon: 'warning', status: 'ok' };
  } else {
    admin = { key: 'adm', label: '행정처분', icon: 'check', status: 'good' };
  }

  // 3) 공공 인증 — 모범/안심식당/착한가격 중 하나라도 있으면 good
  const hasAnyCert = i.hasModel || !!i.safeRestaurant || !!i.goodPrice;
  const cert: SymbolItem = hasAnyCert
    ? { key: 'crt', label: '공공 인증', icon: 'star', status: 'good' }
    : { key: 'crt', label: '공공 인증', icon: 'star', status: 'none' };

  // 4) 사장님 인증
  const owner: SymbolItem =
    i.ownerPostCount === 0
      ? { key: 'own', label: '사장님', icon: 'storefront', status: 'none' }
      : {
          key: 'own',
          label: '사장님',
          icon: 'storefront',
          status: i.ownerDelta >= 15 ? 'good' : 'ok',
        };

  // 5) 위생 리뷰 — 평균 별점·이물질로 status 결정
  let review: SymbolItem;
  if (i.reviewCount === 0) {
    review = { key: 'rev', label: '위생 리뷰', icon: 'chat', status: 'none' };
  } else {
    let status: SymbolStatus;
    if (i.foreignTotal > 0 && i.reviewAvg < 3) status = 'warn';
    else if (i.reviewAvg >= 4) status = 'good';
    else if (i.reviewAvg >= 3) status = 'ok';
    else status = 'warn';
    review = { key: 'rev', label: '위생 리뷰', icon: 'chat', status };
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
  label: {
    ...typography.caption,
    color: color.text.secondary,
  },
});
