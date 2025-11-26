#!/usr/bin/env python3
"""
USGS 지진 데이터 수집 스크립트
전 세계 대규모 지진 데이터를 수집합니다.
"""

import json
import requests
from typing import List, Dict, Optional
from tqdm import tqdm
import os
from datetime import datetime, timedelta

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'sources')
USGS_API = "https://earthquake.usgs.gov/fdsnws/event/1/query"


def fetch_earthquakes(start_date: str, end_date: str, min_magnitude: float = 5.5) -> List[Dict]:
    """USGS API에서 지진 데이터를 가져옵니다."""
    params = {
        'format': 'geojson',
        'starttime': start_date,
        'endtime': end_date,
        'minmagnitude': min_magnitude,
        'orderby': 'magnitude',
        'limit': 20000,
    }

    try:
        response = requests.get(USGS_API, params=params, timeout=60)
        response.raise_for_status()
        data = response.json()
        return data.get('features', [])
    except Exception as e:
        print(f"Error fetching earthquakes ({start_date} ~ {end_date}): {e}")
        return []


def timestamp_to_date(ts: Optional[int]) -> str:
    """Unix timestamp를 YYYY-MM-DD 형식으로 변환합니다."""
    if not ts:
        return ""
    try:
        dt = datetime.fromtimestamp(ts / 1000)
        return dt.strftime('%Y-%m-%d')
    except:
        return ""


def timestamp_to_datetime(ts: Optional[int]) -> str:
    """Unix timestamp를 ISO 형식으로 변환합니다."""
    if not ts:
        return ""
    try:
        dt = datetime.fromtimestamp(ts / 1000)
        return dt.strftime('%Y-%m-%d %H:%M:%S')
    except:
        return ""


def get_severity(magnitude: float) -> str:
    """지진 규모에 따른 심각도를 반환합니다."""
    if magnitude >= 8.0:
        return "대지진 (Great)"
    elif magnitude >= 7.0:
        return "주요지진 (Major)"
    elif magnitude >= 6.0:
        return "강진 (Strong)"
    elif magnitude >= 5.0:
        return "중규모 (Moderate)"
    else:
        return "경미 (Light)"


def transform_to_incident(feature: Dict, incident_id: int) -> Dict:
    """USGS 데이터를 MHive Incident 형식으로 변환합니다."""
    props = feature.get('properties', {})
    geometry = feature.get('geometry', {})
    coords = geometry.get('coordinates', [0, 0, 0])

    magnitude = props.get('mag', 0)
    place = props.get('place', 'Unknown location')
    time_ts = props.get('time')
    date = timestamp_to_date(time_ts)
    datetime_str = timestamp_to_datetime(time_ts)

    # 제목 생성
    title = f"M{magnitude:.1f} 지진 - {place}"

    # 피해 정보
    deaths = props.get('deaths')
    injuries = props.get('injuries')
    felt = props.get('felt')  # 체감 보고 수
    tsunami = props.get('tsunami', 0)
    alert = props.get('alert')  # green, yellow, orange, red

    # 요약
    severity = get_severity(magnitude)
    summary = f"{date}에 {place}에서 발생한 규모 {magnitude:.1f}의 {severity}. "
    if tsunami:
        summary += "쓰나미 경보가 발령되었습니다. "
    if felt:
        summary += f"{felt}명이 지진을 체감했습니다."

    # 상세 설명
    description = f"## 지진 정보\n\n"
    description += f"**규모**: M{magnitude:.1f} ({severity})\n"
    description += f"**발생 시각**: {datetime_str} UTC\n"
    description += f"**위치**: {place}\n"
    description += f"**깊이**: {coords[2]:.1f} km\n"
    description += f"**좌표**: {coords[1]:.4f}°N, {coords[0]:.4f}°E\n\n"

    if alert:
        alert_ko = {'green': '녹색(경미)', 'yellow': '황색(주의)', 'orange': '주황색(경계)', 'red': '적색(심각)'}
        description += f"## 경보 수준\n\n**PAGER 경보**: {alert_ko.get(alert, alert)}\n\n"

    if tsunami:
        description += f"## 쓰나미\n\n이 지진으로 인해 쓰나미 경보가 발령되었습니다.\n\n"

    if felt:
        description += f"## 체감 보고\n\n총 {felt}건의 체감 보고가 접수되었습니다.\n"

    # 사상자 정보
    casualties = {}
    if deaths:
        casualties['deaths'] = deaths
    if injuries:
        casualties['injuries'] = injuries

    # 태그
    tags = ['재난', '자연재해', '지진']
    if magnitude >= 7.0:
        tags.append('대규모')
    if tsunami:
        tags.append('쓰나미')
    if alert in ['orange', 'red']:
        tags.append('긴급')

    # 상태
    status = 'resolved'
    if props.get('status') == 'automatic':
        status = 'ongoing'

    return {
        'id': incident_id,
        'title': title,
        'category': 'disaster',
        'era': 'contemporary',
        'date': date,
        'location': place,
        'summary': summary[:400],
        'description': description[:3000],
        'timeline': [],
        'theories': [],
        'tags': list(set(tags)),
        'sources': [{
            'name': 'USGS',
            'url': props.get('url', f"https://earthquake.usgs.gov/earthquakes/eventpage/{feature.get('id')}")
        }],
        'relatedIncidents': [],
        'images': [],
        'casualties': casualties if casualties else None,
        'coordinates': {
            'lat': coords[1],
            'lng': coords[0]
        } if coords[0] and coords[1] else None,
        'status': status,
        'originalId': feature.get('id'),
        'magnitude': magnitude,
        'depth': coords[2] if len(coords) > 2 else None,
    }


def main():
    """메인 함수"""
    print("🌍 USGS 지진 데이터 수집 시작...")

    all_features = []

    # 연도별로 데이터 수집 (1990년부터 현재까지)
    current_year = datetime.now().year
    years = list(range(1990, current_year + 1))

    for year in tqdm(years, desc="연도별 수집"):
        start_date = f"{year}-01-01"
        end_date = f"{year}-12-31"
        features = fetch_earthquakes(start_date, end_date, min_magnitude=5.5)
        all_features.extend(features)

    print(f"\n📊 총 {len(all_features)}개 지진 데이터 수집")

    # 중복 제거
    seen = set()
    unique_features = []
    for f in all_features:
        fid = f.get('id')
        if fid and fid not in seen:
            seen.add(fid)
            unique_features.append(f)

    print(f"   중복 제거 후: {len(unique_features)}개")

    # 규모 6.0 이상만 필터링 (더 중요한 지진만)
    significant = [f for f in unique_features if f.get('properties', {}).get('mag', 0) >= 6.0]
    print(f"   규모 6.0 이상: {len(significant)}개")

    # MHive 형식으로 변환
    incidents = []
    for i, feature in enumerate(tqdm(significant, desc="데이터 변환")):
        incident = transform_to_incident(feature, i + 1)
        incidents.append(incident)

    # 규모 순으로 정렬
    incidents.sort(key=lambda x: x.get('magnitude', 0), reverse=True)

    # ID 재할당
    for i, inc in enumerate(incidents):
        inc['id'] = i + 1

    # 결과 저장
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_file = os.path.join(OUTPUT_DIR, "usgs_earthquakes.json")

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            'source': 'USGS Earthquake Catalog',
            'collected_at': datetime.now().isoformat(),
            'total_count': len(incidents),
            'incidents': incidents
        }, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 완료! {len(incidents)}개 사건 저장됨")
    print(f"   출력 파일: {output_file}")

    # 규모별 통계
    mag_stats = {'6.0-6.9': 0, '7.0-7.9': 0, '8.0-8.9': 0, '9.0+': 0}
    for inc in incidents:
        mag = inc.get('magnitude', 0)
        if mag >= 9.0:
            mag_stats['9.0+'] += 1
        elif mag >= 8.0:
            mag_stats['8.0-8.9'] += 1
        elif mag >= 7.0:
            mag_stats['7.0-7.9'] += 1
        else:
            mag_stats['6.0-6.9'] += 1

    print("\n📈 규모별 분포:")
    for mag, count in mag_stats.items():
        print(f"   - M{mag}: {count}개")


if __name__ == "__main__":
    main()
