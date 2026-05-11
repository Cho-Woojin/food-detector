// 개인정보 처리방침 — 카카오 로그인·Supabase 사용 기반 초안.
// 정식 출시 전 법무 검토 필수.

import { LegalScreen, LegalSection, LegalParagraph, LegalBullet } from '@/components/ui';

export default function PrivacyScreen() {
  return (
    <LegalScreen title="개인정보 처리방침" subtitle="시행일: 2026년 5월 11일 (베타)">
      <LegalSection heading="1. 수집하는 개인정보 항목">
        <LegalParagraph>식탐정은 다음 항목을 수집합니다.</LegalParagraph>
        <LegalBullet>카카오 로그인: 닉네임, 프로필 이미지 URL, 카카오 회원 고유 ID (이메일 X)</LegalBullet>
        <LegalBullet>리뷰: 별점·메모·방문 시점·사진 (사용자가 직접 입력)</LegalBullet>
        <LegalBullet>좋아요: 식당 ID 목록</LegalBullet>
        <LegalBullet>사장님 인증 시: 사업자등록증·신분증·가게 외관 사진 (이메일 첨부 형태로 수신)</LegalBullet>
        <LegalBullet>위치 정보: 현위치 지도 표시용 (브라우저 권한 허용 시, 서버에 저장하지 않음)</LegalBullet>
      </LegalSection>

      <LegalSection heading="2. 수집 및 이용 목적">
        <LegalBullet>로그인 식별 및 본인의 리뷰·좋아요 보존</LegalBullet>
        <LegalBullet>가게 위생 리뷰 게시·조회</LegalBullet>
        <LegalBullet>사장님 인증 심사 (수기 처리)</LegalBullet>
        <LegalBullet>주변 식당 추천을 위한 위치 기반 표시</LegalBullet>
      </LegalSection>

      <LegalSection heading="3. 보유 및 이용 기간">
        <LegalBullet>회원 정보: 카카오 로그아웃 시 즉시 세션 종료. 계정 삭제 시 30일 내 영구 삭제</LegalBullet>
        <LegalBullet>리뷰: 작성자가 직접 삭제하거나 운영자가 약관 위반으로 비공개 처리할 때까지 보관</LegalBullet>
        <LegalBullet>사장님 인증 서류: 인증 처리 완료 후 30일 내 폐기</LegalBullet>
      </LegalSection>

      <LegalSection heading="4. 제3자 제공">
        <LegalParagraph>
          식탐정은 이용자의 개인정보를 외부에 판매하거나 광고 목적으로 제공하지 않습니다.
          공공기관의 정당한 요청(예: 영장)이 있는 경우에 한해 법령에 따라 제공할 수 있습니다.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="5. 위탁 처리">
        <LegalBullet>인증: 카카오 (Kakao Login)</LegalBullet>
        <LegalBullet>데이터 저장: Supabase (PostgreSQL + Object Storage)</LegalBullet>
        <LegalBullet>지도: 카카오 (Kakao Maps API)</LegalBullet>
      </LegalSection>

      <LegalSection heading="6. 이용자의 권리">
        <LegalParagraph>
          이용자는 언제든지 본인의 리뷰·좋아요를 조회·수정·삭제할 수 있으며, 카카오 로그아웃을 통해
          세션을 즉시 종료할 수 있습니다. 계정 삭제 요청은 choworkin@gmail.com 으로 보내주세요.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading="7. 안전성 확보 조치">
        <LegalBullet>HTTPS 전송 구간 암호화</LegalBullet>
        <LegalBullet>Supabase RLS(Row Level Security) 기반 사용자별 데이터 접근 제어</LegalBullet>
        <LegalBullet>로컬 캐시는 사용자 기기에만 저장</LegalBullet>
      </LegalSection>

      <LegalSection heading="8. 개인정보 보호 책임자">
        <LegalBullet>책임자: 식탐정 운영팀</LegalBullet>
        <LegalBullet>연락처: choworkin@gmail.com</LegalBullet>
      </LegalSection>
    </LegalScreen>
  );
}
