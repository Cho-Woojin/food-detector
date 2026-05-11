// 문의하기 — 단일 채널 (choworkin@gmail.com) mailto 안내.

import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Button, Card, LegalScreen, LegalSection, LegalParagraph, LegalBullet } from '@/components/ui';
import { color, radius, spacing, typography } from '@/constants/tokens';

const SUPPORT_EMAIL = 'choworkin@gmail.com';

const SUBJECTS = [
  '버그 신고',
  '식당 정보 정정 요청',
  '리뷰·등급 이의제기',
  '사장님 인증 문의',
  '서비스 제안',
  '기타',
] as const;

export default function ContactScreen() {
  const mailto = (subject: string) =>
    `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('[식탐정] ' + subject)}`;

  return (
    <LegalScreen title="문의하기" subtitle="운영팀이 직접 확인해서 답변드려요">
      <LegalSection heading="이메일 문의">
        <LegalParagraph>
          식탐정의 모든 문의는 아래 이메일로 받습니다. 답변까지 영업일 기준 2~3일이 걸릴 수 있어요.
        </LegalParagraph>

        <Pressable
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          accessibilityRole="link"
          accessibilityLabel={`${SUPPORT_EMAIL} 메일 보내기`}
          style={({ pressed }) => [styles.emailBox, pressed && { opacity: 0.8 }]}>
          <Icon name="chat" size={18} color={color.brand.primary} />
          <Text style={styles.emailText}>{SUPPORT_EMAIL}</Text>
          <Icon name="forward" size={14} color={color.text.tertiary} />
        </Pressable>
      </LegalSection>

      <LegalSection heading="문의 종류별 바로 보내기">
        <View style={styles.subjectGrid}>
          {SUBJECTS.map((s) => (
            <Pressable
              key={s}
              onPress={() => Linking.openURL(mailto(s))}
              accessibilityRole="button"
              accessibilityLabel={`${s} 문의 메일 작성`}
              style={({ pressed }) => [styles.subjectChip, pressed && { opacity: 0.8 }]}>
              <Text style={styles.subjectText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </LegalSection>

      <LegalSection heading="자주 묻는 질문">
        <LegalBullet>등급은 왜 이렇게 나오나요? — 식약처 위생등급·행정처분 등 공공데이터 기반 합산 시그널입니다.</LegalBullet>
        <LegalBullet>가게 정보가 잘못됐어요. — "식당 정보 정정 요청"으로 가게명·주소·운영시간 등을 알려주세요.</LegalBullet>
        <LegalBullet>사장님 인증을 받고 싶어요. — 가게 상세 페이지 하단 "인증 신청" 또는 "사장님 인증 문의"로 메일 주세요.</LegalBullet>
        <LegalBullet>리뷰가 부당해요. — "리뷰·등급 이의제기"로 리뷰 ID와 함께 보내주시면 운영팀이 검토합니다.</LegalBullet>
      </LegalSection>
    </LegalScreen>
  );
}

const styles = StyleSheet.create({
  emailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    backgroundColor: color.fill.tertiary,
    borderRadius: radius.m,
    marginTop: spacing.s,
  },
  emailText: { flex: 1, ...typography.subheadlineEmphasized, color: color.text.primary },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.s,
  },
  subjectChip: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.subtle,
  },
  subjectText: { ...typography.caption, color: color.text.secondary },
});
