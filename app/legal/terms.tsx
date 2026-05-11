// 서비스 약관 — 식탐정 (베타) 이용 약관.
// 외부 변호사 검토 전 초안. 정식 출시 전 법무 검토 필수.

import { LegalScreen, LegalSection, LegalParagraph, LegalBullet } from '@/components/ui';

export default function TermsScreen() {
  return (
    <LegalScreen title="서비스 약관" subtitle="시행일: 2026년 5월 11일 (베타)">
      <LegalSection heading="제1조 (목적)">
        <LegalParagraph>
          본 약관은 식탐정(이하 "서비스")이 제공하는 식당 위생 정보 조회·리뷰 작성·즐겨찾기 기능 등 모바일·웹
          서비스의 이용 조건 및 절차, 이용자와 운영자의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="제2조 (정의)">
        <LegalBullet>"이용자"는 본 약관에 동의하고 서비스를 이용하는 카카오 계정 보유자를 의미합니다.</LegalBullet>
        <LegalBullet>"리뷰"는 이용자가 직접 작성한 위생 별점·메모·사진 등 게시물을 의미합니다.</LegalBullet>
        <LegalBullet>"사장님 인증"은 가게 사업자등록증·신분증을 통해 권한을 부여받은 계정을 의미합니다.</LegalBullet>
      </LegalSection>

      <LegalSection heading="제3조 (서비스 내용)">
        <LegalBullet>식약처·행안부·농식품부 등 공공데이터 기반 식당 위생 정보 제공</LegalBullet>
        <LegalBullet>위생 리뷰 작성 및 조회</LegalBullet>
        <LegalBullet>좋아요한 식당 저장·관리</LegalBullet>
        <LegalBullet>사장님 인증 가게의 운영·위생 인증 게시</LegalBullet>
      </LegalSection>

      <LegalSection heading="제4조 (이용자의 의무)">
        <LegalParagraph>이용자는 다음 행위를 해서는 안 됩니다.</LegalParagraph>
        <LegalBullet>허위 사실 또는 검증되지 않은 정보를 리뷰로 게시하는 행위</LegalBullet>
        <LegalBullet>특정 식당에 대한 명예훼손·모욕·혐오 표현</LegalBullet>
        <LegalBullet>타인의 개인정보·저작권을 침해하는 콘텐츠 게시</LegalBullet>
        <LegalBullet>자동화 도구를 이용한 리뷰 도배·여론 조작</LegalBullet>
        <LegalBullet>본인 또는 가까운 관계의 가게 평점 조작</LegalBullet>
      </LegalSection>

      <LegalSection heading="제5조 (게시물의 관리)">
        <LegalParagraph>
          운영자는 제4조 위반 또는 법령 위반이 명백한 게시물을 사전 통지 없이 비공개 처리할 수 있습니다.
          가게 측 이의제기가 있을 경우 운영자가 사실관계 확인 후 게시 여부를 결정합니다.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="제6조 (위생 등급 표시의 한계)">
        <LegalParagraph>
          서비스가 제공하는 등급(골드/실버/브론즈/트랩 치즈)은 공공데이터 기반 정량 시그널의 합산 결과입니다.
          개별 식당의 현재 위생 상태를 보장하지 않으며, 식약처 공식 평가가 아닙니다.
          서비스는 본 등급으로 인한 영업 손실에 대해 책임을 지지 않습니다.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="제7조 (책임의 한계)">
        <LegalParagraph>
          서비스는 정보 제공 플랫폼이며, 이용자가 서비스 정보를 바탕으로 한 의사 결정에 대해
          직접적인 책임을 지지 않습니다. 천재지변·공공데이터 제공 기관의 장애 등 운영자의 통제를
          벗어난 사유로 인한 서비스 중단에 대해서도 동일합니다.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="제8조 (약관의 변경)">
        <LegalParagraph>
          본 약관은 관련 법령에 따라 사전 공지 후 변경될 수 있습니다. 변경 사항은 서비스 내 공지로 안내합니다.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="제9조 (문의)">
        <LegalParagraph>
          본 약관에 대한 문의는 choworkin@gmail.com 으로 보내주세요.
        </LegalParagraph>
      </LegalSection>
    </LegalScreen>
  );
}
