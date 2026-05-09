"""
내 v5 데이터(restaurants_final_v2.json)를 친구 split-restaurants.js가 읽는
restaurants_with_scores.csv 형식으로 변환.

- 친구 csv 컬럼: mgtno, name, gu, category, addr, road_addr, phone, x, y,
  base_score, hygiene_designated, hygiene_designated_delta, hg_asgn_to,
  hg_asgn_no, eval_grade, eval_delta, punish_count, punish_types, punish_delta,
  model_delta, has_model, score, grade
- 추가 컬럼: lat, lng, source, kakao_id, kakao_url, kakao_category

내 v5는 좌표가 EPSG 4326 (lat,lng)이므로 친구 스크립트가 활용하도록 두 컬럼 모두 출력.
친구 스크립트 측에서 x,y 비어있으면 lat,lng 직접 사용하도록 패치.

카카오 신규 식당(source=KAKAO)은 mgtno가 없으므로 'KAKAO_{kakao_id}' 형식 부여.
"""
import json, csv, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'backup_v5' / 'restaurants_final_v2.json'
DST = ROOT / '_archive' / 'restaurants_with_scores.csv'
DST.parent.mkdir(parents=True, exist_ok=True)

# 친구 csv 컬럼 순서 그대로 + 신규 컬럼 추가
COLUMNS = [
    'mgtno', 'name', 'gu', 'category', 'addr', 'road_addr', 'phone',
    'x', 'y', 'lat', 'lng',  # 좌표 (x,y는 비울 수 있음 — 친구 스크립트가 lat,lng로 fallback)
    'base_score', 'hygiene_designated', 'hygiene_designated_delta',
    'hg_asgn_to', 'hg_asgn_no', 'eval_grade', 'eval_delta',
    'punish_count', 'punish_types', 'punish_delta', 'model_delta', 'has_model',
    'score', 'grade',
    # 친구 스크립트가 무시하지만 향후 활용 가능한 부가 정보
    'source', 'kakao_id', 'kakao_url', 'kakao_category',
]


def to_str(v):
    if v is None or v is False:
        return 'False' if v is False else ''
    if v is True:
        return 'True'
    return str(v)


def main():
    print(f'읽기: {SRC}')
    data = json.load(open(SRC, encoding='utf-8'))
    print(f'  {len(data):,} rows')

    src_count = {}
    skipped_no_gu = 0
    no_coord = 0

    with open(DST, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        for r in data:
            gu = (r.get('gu') or '').strip()
            if not gu:
                skipped_no_gu += 1
                continue

            src = r.get('source', '')
            src_count[src] = src_count.get(src, 0) + 1

            mgtno = (r.get('mgtno') or '').strip()
            if not mgtno:
                # 카카오 신규 식당 — kakao_id로 합성
                kid = r.get('kakao_id', '')
                mgtno = f'KAKAO_{kid}' if kid else f'KAKAO_NO_ID'

            # 좌표 (LOCALDATA는 보통 lat/lng 있음 — Phase 4에서 EPSG5174→4326 변환했음)
            lat = r.get('lat')
            lng = r.get('lng')
            if lat is None or lng is None:
                no_coord += 1

            row = {
                'mgtno': mgtno,
                'name': r.get('name', ''),
                'gu': gu,
                'category': r.get('category', ''),
                'addr': r.get('addr', ''),
                'road_addr': r.get('road_addr', ''),
                'phone': r.get('phone', ''),
                'x': '',  # 의도적 비움 → split 스크립트가 lat,lng로 fallback
                'y': '',
                'lat': to_str(lat),
                'lng': to_str(lng),
                'base_score': to_str(r.get('base_score', 50)),
                'hygiene_designated': to_str(r.get('hygiene_designated', False)),
                'hygiene_designated_delta': to_str(r.get('hygiene_designated_delta', 0)),
                'hg_asgn_to': r.get('hg_asgn_to', '') or '',
                'hg_asgn_no': r.get('hg_asgn_no', '') or '',
                'eval_grade': r.get('eval_grade', '') or '',
                'eval_delta': to_str(r.get('eval_delta', 0)),
                'punish_count': to_str(r.get('punish_count', 0)),
                'punish_types': r.get('punish_types', '') or '',
                'punish_delta': to_str(r.get('punish_delta', 0)),
                'model_delta': to_str(r.get('model_delta', 0)),
                'has_model': to_str(r.get('has_model', False)),
                'score': to_str(r.get('score', 50)),
                'grade': r.get('grade', 'C'),
                'source': src,
                'kakao_id': r.get('kakao_id', '') or '',
                'kakao_url': r.get('kakao_url', '') or '',
                'kakao_category': r.get('kakao_category', '') or '',
            }
            w.writerow(row)

    print(f'\n저장: {DST}')
    print(f'  소스: {src_count}')
    print(f'  자치구 없어 건너뜀: {skipped_no_gu:,}')
    print(f'  좌표 없는 행: {no_coord:,}')
    print(f'  파일 크기: {DST.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
