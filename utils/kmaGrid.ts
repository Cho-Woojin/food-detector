// 기상청 격자 좌표 변환 + 자치구별 행정구역코드(areaNo).
// poisonmap 비공식 API가 죽을 때 기상청·에어코리아 공식 API로 fallback할 때만 사용.

import { GuKey } from '@/constants/Restaurant';

/**
 * 위경도 → 기상청 단기예보 격자 X,Y 변환 (Lambert Conformal Conic).
 * VilageFcstInfoService_2.0 가 요구하는 nx, ny 값.
 */
export function latLngToKmaGrid(lat: number, lng: number): { nx: number; ny: number } {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;

  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx, ny };
}

/**
 * 자치구 → 기상청 areaNo (행정구역코드 10자리).
 * 생활기상지수(자외선·대기정체) API 의 areaNo 파라미터.
 * 통계청 행정구역코드 시·군·구 7자리 + "000".
 */
export const GU_AREA_NO: Record<GuKey, string> = {
  '종로구':   '1111000000',
  '중구':     '1114000000',
  '용산구':   '1117000000',
  '성동구':   '1120000000',
  '광진구':   '1121500000',
  '동대문구': '1123000000',
  '중랑구':   '1126000000',
  '성북구':   '1129000000',
  '강북구':   '1130500000',
  '도봉구':   '1132000000',
  '노원구':   '1135000000',
  '은평구':   '1138000000',
  '서대문구': '1141000000',
  '마포구':   '1144000000',
  '양천구':   '1147000000',
  '강서구':   '1150000000',
  '구로구':   '1153000000',
  '금천구':   '1154500000',
  '영등포구': '1156000000',
  '동작구':   '1159000000',
  '관악구':   '1162000000',
  '서초구':   '1165000000',
  '강남구':   '1168000000',
  '송파구':   '1171000000',
  '강동구':   '1174000000',
};

/**
 * 자치구 → 에어코리아 sidoName (B3 fallback).
 * 측정소 코드 매핑 없이 시·도 단위 평균으로 호출 → 자치구 25개 모두 '서울'.
 */
export const GU_AIR_SIDO: Record<GuKey, string> = Object.fromEntries(
  (Object.keys(GU_AREA_NO) as GuKey[]).map((g) => [g, '서울']),
) as Record<GuKey, string>;
