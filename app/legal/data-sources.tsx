// 데이터 출처 — 식탐정에서 사용하는 공공·민간 데이터의 공식 출처.
// 자세한 명세는 repo의 data/DATA_SOURCES.md 참조.

import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { LegalScreen, LegalSection, LegalParagraph, LegalBullet } from '@/components/ui';
import { color, radius, spacing, typography } from '@/constants/tokens';

type Source = {
  name: string;
  detail: string;
  url?: string;
};

const SECTIONS: { heading: string; sources: Source[] }[] = [
  {
    heading: '서울 열린데이터광장 (data.seoul.go.kr)',
    sources: [
      { name: '서울시 일반음식점 인허가 정보', detail: '식당 마스터 (OA-16094, 약 12만 건)', url: 'https://data.seoul.go.kr/dataList/OA-16094/S/1/datasetView.do' },
      { name: '서울시 휴게음식점 인허가 정보', detail: '커피숍·분식·디저트 등 (OA-16095, 약 3만 건)', url: 'https://data.seoul.go.kr/dataList/OA-16095/S/1/datasetView.do' },
    ],
  },
  {
    heading: '공공데이터포털 (data.go.kr)',
    sources: [
      { name: '전국모범음식점표준데이터', detail: '모범음식점 지정 (식약처 식중독예방과)', url: 'https://www.data.go.kr/data/15096282/standard.do' },
      { name: '농식품부 안심식당', detail: 'MAFRA 안심식당 지정', url: 'https://www.data.go.kr/data/15140017/fileData.do' },
      { name: '행안부 착한가격업소', detail: '착한가격업소 + 대표 메뉴/가격', url: 'https://www.data.go.kr/data/15083033/fileData.do' },
    ],
  },
  {
    heading: '식품안전나라 (식약처)',
    sources: [
      { name: '식약처 행정처분 I2630', detail: 'OpenAPI — 식품위생법 위반 처분 이력', url: 'https://www.foodsafetykorea.go.kr/api/openApiInfo.do?menu_grp=MENU_GRP31&menu_no=841' },
      { name: '식품안심업소 (구 위생등급)', detail: '2026-03 단일등급 통합', url: 'https://www.foodsafetykorea.go.kr/portal/board/board.do?menu_no=2647' },
    ],
  },
  {
    heading: '새올전자민원창구',
    sources: [
      { name: '서울 25개 자치구 행정처분', detail: '자치구별 위생 직결 위반 보강 (AI 분류 + 룰 매칭)' },
    ],
  },
  {
    heading: '카카오 (developers.kakao.com)',
    sources: [
      { name: 'Kakao Maps API', detail: '지도 표시·좌표 보강', url: 'https://apis.map.kakao.com/' },
      { name: 'Kakao Login', detail: '사용자 인증', url: 'https://developers.kakao.com/docs/latest/ko/kakaologin/common' },
      { name: 'Kakao Local API', detail: '주소→좌표 변환 (geocoding)', url: 'https://developers.kakao.com/docs/latest/ko/local/dev-guide' },
    ],
  },
  {
    heading: '기상·환경',
    sources: [
      { name: '식약처 식중독지수', detail: '4단계 위험 등급 (관심/주의/경고/위험)' },
      { name: 'OpenAPI 기상정보', detail: '실시간 기온·습도·미세먼지' },
    ],
  },
];

export default function DataSourcesScreen() {
  return (
    <LegalScreen title="데이터 출처" subtitle="식탐정은 공공데이터를 가공해 위생·안전 시그널을 제공합니다">
      <LegalSection heading="데이터 처리 원칙">
        <LegalBullet>식약처·행안부·MAFRA 등 정부 공공데이터를 1차 출처로 사용합니다.</LegalBullet>
        <LegalBullet>같은 데이터가 여러 사이트에서 제공될 경우 공공데이터포털을 우선 출처로 표기합니다.</LegalBullet>
        <LegalBullet>행정처분 텍스트는 AI 분류 + 키워드 룰 매칭으로 위생 직결 여부를 판단합니다.</LegalBullet>
        <LegalBullet>등급은 원본 데이터를 가공한 결과이며, 정부 공식 평가가 아닙니다.</LegalBullet>
      </LegalSection>

      {SECTIONS.map((section) => (
        <LegalSection key={section.heading} heading={section.heading}>
          <View style={styles.sourceList}>
            {section.sources.map((s) => (
              <SourceRow key={s.name} source={s} />
            ))}
          </View>
        </LegalSection>
      ))}

      <LegalSection heading="데이터 갱신 주기">
        <LegalBullet>식당 마스터: 분기별 (공공데이터포털 카탈로그 기준)</LegalBullet>
        <LegalBullet>행정처분: 1~2주마다 OpenAPI 폴링</LegalBullet>
        <LegalBullet>식중독지수·기상: 매시간</LegalBullet>
        <LegalBullet>리뷰·좋아요: 사용자가 작성하는 즉시 반영</LegalBullet>
      </LegalSection>

      <LegalSection heading="데이터 정정 요청">
        <LegalParagraph>
          가게 정보가 사실과 다르거나 갱신이 필요하다면 choworkin@gmail.com 으로 알려주세요.
          공공데이터 원본도 함께 확인하여 다음 갱신 주기에 반영합니다.
        </LegalParagraph>
      </LegalSection>
    </LegalScreen>
  );
}

function SourceRow({ source }: { source: Source }) {
  const clickable = !!source.url;
  return (
    <Pressable
      onPress={clickable ? () => Linking.openURL(source.url!) : undefined}
      accessibilityRole={clickable ? 'link' : undefined}
      accessibilityLabel={clickable ? `${source.name} 원본 열기` : source.name}
      style={({ pressed }) => [
        styles.row,
        clickable && pressed && { opacity: 0.7 },
      ]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{source.name}</Text>
        <Text style={styles.rowDetail}>{source.detail}</Text>
      </View>
      {clickable ? <Icon name="forward" size={14} color={color.text.tertiary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sourceList: {
    backgroundColor: color.surface.subtle,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: color.border.default,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s + 2,
    borderBottomWidth: 1,
    borderBottomColor: color.border.default,
  },
  rowName: { ...typography.subheadlineEmphasized, color: color.text.primary },
  rowDetail: { ...typography.caption, color: color.text.secondary, marginTop: 2 },
});
