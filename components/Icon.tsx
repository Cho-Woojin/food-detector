import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps } from 'react';

/**
 * 식탐정 전역 아이콘. Ionicons 래퍼로, 의미별 별칭을 한 곳에서 관리한다.
 *
 * 사용: <Icon name="search" size={18} color={palette.text1} />
 */
type IoniconName = ComponentProps<typeof Ionicons>['name'];

const ALIASES = {
  // 공통
  search: 'search',
  searchOutline: 'search-outline',
  bell: 'notifications-outline',
  location: 'location',
  locationOutline: 'location-outline',
  locate: 'locate-outline', // 과녁(crosshair) — 카카오맵의 현위치 버튼 스타일
  close: 'close',
  back: 'chevron-back',
  forward: 'chevron-forward',
  arrowRight: 'arrow-forward',
  bulb: 'bulb-outline',
  heart: 'heart',
  heartOutline: 'heart-outline',
  star: 'star',
  sparkles: 'sparkles',
  share: 'share-outline',
  // 메뉴
  user: 'person-outline',
  map: 'map-outline',
  pencil: 'create-outline',
  camera: 'camera-outline',
  chat: 'chatbubble-ellipses-outline',
  moon: 'moon-outline',
  doc: 'document-text-outline',
  time: 'time-outline',
  phone: 'call-outline',
  storefront: 'storefront-outline',
  // 환경
  thermometer: 'thermometer-outline',
  bug: 'bug-outline',
  // 5축
  water: 'water-outline',
  leaf: 'leaf-outline',
  flame: 'flame-outline',
  pen: 'pencil-outline',
  // 위험
  dot: 'ellipse',
  alert: 'alert-circle',
  warning: 'warning-outline',
  // breakdown
  check: 'checkmark-circle',
  minus: 'remove-circle',
  // 로고용
  logo: 'shield-checkmark',
} as const;

export type IconName = keyof typeof ALIASES;

export function Icon({
  name,
  size = 18,
  color,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: ComponentProps<typeof Ionicons>['style'];
}) {
  return <Ionicons name={ALIASES[name] as IoniconName} size={size} color={color} style={style} />;
}
